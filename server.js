// Polyglotter game server
// - Serves the game files to the browser
// - Keeps track of who is in which language room
// - Relays movement and chat messages between players in the same room

const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const ROOMS = ['lobby', 'french', 'english', 'italian', 'german', 'spanish', 'portuguese'];
const BOARDS = { lobby: ['left', 'right'] };
const MAX_STROKES = 6000;
// saved whiteboard drawings: boards[room][board] = [[x1,y1,x2,y2,color], ...]
const boards = {};
for (const [room, names] of Object.entries(BOARDS)) boards[room] = Object.fromEntries(names.map((n) => [n, []]));
const PUBLIC_DIR = path.join(__dirname, 'public');
const ADDONS_DIR = path.join(__dirname, 'node_modules', 'three', 'examples', 'jsm');
const THREE_FILE = path.join(__dirname, 'node_modules', 'three', 'build', 'three.module.js');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

// ---------- Web server (sends the game files) ----------
const server = http.createServer((req, res) => {
  let url;
  try { url = decodeURIComponent(req.url.split('?')[0]); } catch { url = '/'; }
  let file;
  if (url === '/three.module.js') {
    file = THREE_FILE;
  } else if (url.startsWith('/addons/')) {
    file = path.join(ADDONS_DIR, path.normalize(url.slice(8)));
    if (!file.startsWith(ADDONS_DIR)) { res.writeHead(403); return res.end(); }
  } else {
    if (url === '/') url = '/index.html';
    file = path.join(PUBLIC_DIR, path.normalize(url));
    if (!file.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end(); }
  }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});

// ---------- Multiplayer ----------
const wss = new WebSocketServer({ server });
const players = new Map();
let nextId = 1;

const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, max);
const num = (v) => (Number.isFinite(v) ? Math.max(-100, Math.min(100, v)) : 0);
const pub = (p) => ({ id: p.id, name: p.name, color: p.color, x: p.x, y: p.y, z: p.z, ry: p.ry, s: p.s });
const unit = (v) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0);

function send(ws, msg) {
  if (ws.readyState === 1) ws.send(JSON.stringify(msg));
}
function broadcastRoom(room, msg, exceptId) {
  const data = JSON.stringify(msg);
  for (const p of players.values()) {
    if (p.joined && p.room === room && p.id !== exceptId && p.ws.readyState === 1) p.ws.send(data);
  }
}
function roomPlayers(room, exceptId) {
  return [...players.values()].filter((p) => p.joined && p.room === room && p.id !== exceptId).map(pub);
}
function roomCounts() {
  const counts = Object.fromEntries(ROOMS.map((r) => [r, 0]));
  for (const p of players.values()) if (p.joined) counts[p.room]++;
  return counts;
}

wss.on('connection', (ws) => {
  const p = { id: nextId++, ws, name: 'Guest', color: '#4aa3ff', room: 'lobby', x: 0, y: 0, z: 0, ry: 0, s: 0, joined: false };
  players.set(p.id, p);

  ws.on('message', (raw) => {
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    switch (m.type) {
      case 'join': {
        if (p.joined) return;
        p.name = clean(m.name, 16) || 'Guest';
        p.color = /^#[0-9a-f]{6}$/i.test(m.color) ? m.color : '#4aa3ff';
        p.joined = true;
        send(ws, { type: 'roomState', you: p.id, room: p.room, players: roomPlayers(p.room, p.id), counts: roomCounts(), boards: boards[p.room] || {} });
        broadcastRoom(p.room, { type: 'playerJoined', player: pub(p) }, p.id);
        break;
      }
      case 'move': {
        if (!p.joined) return;
        p.x = num(m.x); p.y = num(m.y); p.z = num(m.z); p.ry = num(m.ry); p.s = m.s ? 1 : 0;
        broadcastRoom(p.room, { type: 'move', id: p.id, x: p.x, y: p.y, z: p.z, ry: p.ry, s: p.s }, p.id);
        break;
      }
      case 'switch': {
        if (!p.joined || !ROOMS.includes(m.room) || m.room === p.room) return;
        broadcastRoom(p.room, { type: 'playerLeft', id: p.id }, p.id);
        p.room = m.room;
        p.x = num(m.x); p.y = 0; p.z = num(m.z); p.ry = num(m.ry); p.s = 0;
        send(ws, { type: 'roomState', you: p.id, room: p.room, players: roomPlayers(p.room, p.id), counts: roomCounts(), boards: boards[p.room] || {} });
        broadcastRoom(p.room, { type: 'playerJoined', player: pub(p) }, p.id);
        break;
      }
      case 'chat': {
        if (!p.joined) return;
        const text = clean(m.text, 200);
        if (!text) return;
        broadcastRoom(p.room, { type: 'chat', id: p.id, name: p.name, color: p.color, text });
        break;
      }
      case 'draw': {
        const list = p.joined && boards[p.room]?.[m.board];
        if (!list || !Array.isArray(m.seg)) return;
        const color = /^#[0-9a-f]{6}$/i.test(m.c) ? m.c : '#2b2d42';
        const seg = [unit(m.seg[0]), unit(m.seg[1]), unit(m.seg[2]), unit(m.seg[3]), color];
        list.push(seg);
        if (list.length > MAX_STROKES) list.splice(0, list.length - MAX_STROKES);
        broadcastRoom(p.room, { type: 'draw', board: m.board, seg }, p.id);
        break;
      }
      case 'clear': {
        const list = p.joined && boards[p.room]?.[m.board];
        if (!list) return;
        list.length = 0;
        broadcastRoom(p.room, { type: 'clear', board: m.board });
        break;
      }
    }
  });

  ws.on('close', () => {
    players.delete(p.id);
    if (p.joined) broadcastRoom(p.room, { type: 'playerLeft', id: p.id });
  });
});

// Tell everyone how many people are in each room (shown on the lobby portals)
setInterval(() => {
  const msg = JSON.stringify({ type: 'counts', counts: roomCounts() });
  for (const p of players.values()) if (p.joined && p.ws.readyState === 1) p.ws.send(msg);
}, 2000);

server.listen(PORT, () => console.log(`Polyglotter running at http://localhost:${PORT}`));
