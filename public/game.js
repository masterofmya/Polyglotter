import * as THREE from 'three';
import { CHARACTERS, charInfo, makeAvatar, makeHand } from './js/characters.js';
import { ROOMS, buildLanguageRoom, drawPortalPlaque } from './js/rooms.js';
import { buildLobby } from './js/lobby.js';
import { roundRect, canvasTexture, FONT, DISPLAY } from './js/helpers.js';

// make sure the fonts are ready before anything draws text onto signs
try {
  await Promise.all([
    document.fonts.load(`400 40px 'Lilita One'`), document.fonts.load(`600 20px Nunito`),
    document.fonts.load(`800 20px Nunito`), document.fonts.load(`900 20px Nunito`),
  ]);
} catch {}

const EYE = 1.6, EYE_SIT = 1.45;
const SPEED = 5.5;
const $ = (id) => document.getElementById(id);

// =====================================================================
//  RENDERER, CAMERA, LIGHTS
// =====================================================================
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog('#000', 40, 90);
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 900);
camera.rotation.order = 'YXZ';
scene.add(camera);

const hemi = new THREE.HemisphereLight('#ffffff', '#b9c4d6', 1.4);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff6e5', 1.8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0005;
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 90 });
scene.add(sun, sun.target);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// =====================================================================
//  LEVELS (the lobby and the language rooms)
// =====================================================================
let level = null;
let currentRoom = 'lobby';
let roomCounts = {};

function loadLevel(roomId) {
  if (level) {
    scene.remove(level.group);
    level.group.traverse((o) => {
      o.geometry?.dispose();
      for (const m of [].concat(o.material || [])) { m.map?.dispose(); m.dispose(); }
    });
  }
  level = roomId === 'lobby' ? buildLobby() : buildLanguageRoom(roomId);
  scene.add(level.group);
  const e = level.env;
  scene.background = new THREE.Color(e.background);
  scene.fog.color.set(e.fog[0]); scene.fog.near = e.fog[1]; scene.fog.far = e.fog[2];
  hemi.color.set(e.hemi[0]); hemi.groundColor.set(e.hemi[1]); hemi.intensity = e.hemi[2];
  sun.color.set(e.sun[0]); sun.intensity = e.sun[1]; sun.position.set(...e.sun[2]);
  refreshPortalSigns();
}

function refreshPortalSigns() {
  if (currentRoom !== 'lobby' || !level) return;
  for (const p of level.portals) drawPortalPlaque(p.group.userData.plaque, p.roomId, roomCounts[p.roomId] || 0);
}

// =====================================================================
//  PLAYER (first person)
// =====================================================================
const me = { x: 0, y: 0, z: 13.5, vy: 0, yaw: 0, pitch: 0, lang: 'en', name: '', char: 'travelerGirl' };
const keys = {};
let portalLock = true;
let sitting = null;
let myHands = [];
let handPhase = 0;

function setMyHands(charId) {
  myHands.forEach((h) => camera.remove(h));
  myHands = [-1, 1].map((side) => {
    const m = makeHand(charId);
    m.scale.setScalar(0.8);
    if (side > 0) m.scale.x *= -1;
    m.traverse((o) => { o.castShadow = false; });
    camera.add(m);
    return m;
  });
}

function spawnIn(roomId, fromRoom) {
  const p = level.portals.find((q) => q.roomId === fromRoom);
  if (roomId === 'lobby' && p) {
    const len = Math.hypot(p.x, p.z);
    me.x = p.x - (p.x / len) * 3; me.z = p.z - (p.z / len) * 3;
    me.yaw = Math.atan2(p.x, p.z);
  } else {
    me.x = level.spawn.x; me.z = level.spawn.z; me.yaw = level.spawn.yaw;
  }
  me.y = 0; me.vy = 0; me.pitch = 0;
  sitting = null;
  portalLock = true;
}

function nearestSeat() {
  let best = null, bd = 1.8;
  for (const s of level.seats) {
    const d = Math.hypot(me.x - s.x, me.z - s.z);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}
function sitDown() {
  const s = nearestSeat();
  if (!s) return;
  sitting = s;
  me.x = s.x; me.z = s.z; me.y = 0; me.vy = 0; me.yaw = s.yaw; me.pitch = -0.1;
}
function standUp() {
  if (!sitting) return;
  const s = sitting;
  sitting = null;
  me.x = s.x - Math.sin(s.yaw) * 1.0;
  me.z = s.z - Math.cos(s.yaw) * 1.0;
}

function updatePlayer(dt) {
  const fwd = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
  const side = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  if (sitting && (fwd || side)) standUp();

  let moving = false;
  if (!sitting) {
    let dx = -Math.sin(me.yaw) * fwd + Math.cos(me.yaw) * side;
    let dz = -Math.cos(me.yaw) * fwd - Math.sin(me.yaw) * side;
    const len = Math.hypot(dx, dz);
    if (len > 0) { dx /= len; dz /= len; moving = true; }
    const speed = SPEED * (keys.ShiftLeft || keys.ShiftRight ? 1.6 : 1);
    me.x += dx * speed * dt;
    me.z += dz * speed * dt;
    me.vy -= 22 * dt;
    me.y += me.vy * dt;
    if (me.y <= 0) { me.y = 0; me.vy = 0; }
    for (const c of level.colliders) {
      const ox = me.x - c.x, oz = me.z - c.z, d = Math.hypot(ox, oz), min = c.r + 0.35;
      if (d < min && d > 0.0001) { me.x = c.x + (ox / d) * min; me.z = c.z + (oz / d) * min; }
    }
    const b = level.bounds;
    if (b.type === 'circle') {
      const d = Math.hypot(me.x, me.z);
      if (d > b.r) { me.x *= b.r / d; me.z *= b.r / d; }
    } else {
      me.x = THREE.MathUtils.clamp(me.x, -b.half + 0.4, b.half - 0.4);
      me.z = THREE.MathUtils.clamp(me.z, -b.half + 0.4, b.half - 0.4);
    }
  }

  camera.position.set(me.x, me.y + (sitting ? EYE_SIT : EYE), me.z);
  camera.rotation.set(me.pitch, me.yaw, 0);

  handPhase += dt * (moving ? 9 : 1.5);
  const bob = moving ? 0.03 : 0.008;
  if (myHands.length) {
    myHands[0].position.set(-0.36, -0.36 + Math.sin(handPhase) * bob, -0.6 + Math.cos(handPhase) * bob);
    myHands[1].position.set(0.36, -0.36 - Math.sin(handPhase) * bob, -0.6 - Math.cos(handPhase) * bob);
  }

  let nearAny = false;
  for (const p of level.portals) {
    const d = Math.hypot(me.x - p.x, me.z - p.z);
    if (d < 2.6) nearAny = true;
    if (d < 1.3 && !portalLock) { goToRoom(p.roomId); return; }
  }
  if (!nearAny) portalLock = false;
}

// =====================================================================
//  OTHER PLAYERS
// =====================================================================
const others = new Map();

function makeBubble(text) {
  const W = 640, pad = 34, lineH = 52;
  const measure = document.createElement('canvas').getContext('2d');
  measure.font = `800 42px ${FONT}`;
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const test = line ? line + ' ' + word : word;
    if (measure.measureText(test).width > W - pad * 2 && line) { lines.push(line); line = word; } else line = test;
    if (lines.length >= 4) break;
  }
  if (line && lines.length < 4) lines.push(line);
  const bw = Math.min(W, Math.max(...lines.map((l) => measure.measureText(l).width)) + pad * 2);
  const H = lines.length * lineH + pad * 2 + 24;
  const ct = canvasTexture(W, H, (g, w, h) => {
    g.fillStyle = '#fffaf2';
    roundRect(g, (w - bw) / 2, 0, bw, h - 24, 32); g.fill();
    g.beginPath(); g.moveTo(w / 2 - 18, h - 25); g.lineTo(w / 2 + 18, h - 25); g.lineTo(w / 2, h); g.fill();
    g.fillStyle = '#2a2346'; g.font = `800 42px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'top';
    lines.forEach((l, i) => g.fillText(l, w / 2, pad + i * lineH));
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ct.tex, depthTest: false, fog: false }));
  s.scale.set(2.6, 2.6 * (H / W), 1);
  s.renderOrder = 11;
  return s;
}

function addOther(p) {
  if (others.has(p.id)) return;
  const avatar = makeAvatar(p.name, p.char);
  avatar.position.set(p.x, p.y, p.z);
  avatar.rotation.y = p.ry + Math.PI;
  scene.add(avatar);
  others.set(p.id, { avatar, target: { x: p.x, y: p.y, z: p.z, ry: p.ry, s: p.s }, bubble: null, bubbleUntil: 0 });
}
function removeOther(id) {
  const o = others.get(id);
  if (!o) return;
  scene.remove(o.avatar);
  others.delete(id);
}
function clearOthers() { for (const id of [...others.keys()]) removeOther(id); }

function showBubble(id, text) {
  const o = others.get(id);
  if (!o) return;
  if (o.bubble) o.avatar.remove(o.bubble);
  o.bubble = makeBubble(text);
  o.bubble.position.y = 2.65 + o.bubble.scale.y / 2;
  o.avatar.add(o.bubble);
  o.bubbleUntil = performance.now() + 7000;
}

function updateOthers(dt, now) {
  const k = 1 - Math.pow(0.0001, dt);
  for (const o of others.values()) {
    const a = o.avatar, t = o.target, u = a.userData;
    const bx = a.position.x, bz = a.position.z;
    a.position.x += (t.x - a.position.x) * k;
    a.position.y += (t.y - a.position.y) * k;
    a.position.z += (t.z - a.position.z) * k;
    let diff = (t.ry + Math.PI) - a.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    a.rotation.y += diff * k;
    const speed = Math.hypot(a.position.x - bx, a.position.z - bz) / Math.max(dt, 0.001);
    const swing = t.s ? 0 : Math.min(speed / SPEED, 1);
    u.phase += dt * 10 * swing;
    const s = Math.sin(u.phase) * 0.7 * swing;
    const sit = !!t.s;
    u.body.position.y += ((sit ? 0.22 : 0) - u.body.position.y) * k;
    u.legs[0].rotation.x = sit ? -1.35 : s;
    u.legs[1].rotation.x = sit ? -1.35 : -s;
    u.hands[0].position.set(-0.52, 0.78 + (sit ? -0.05 : Math.abs(s) * 0.04), 0.06 + (sit ? 0.25 : -s * 0.25));
    u.hands[1].position.set(0.52, 0.78 + (sit ? -0.05 : Math.abs(s) * 0.04), 0.06 + (sit ? 0.25 : s * 0.25));
    u.head.position.y = 1.52 + Math.sin(now / 500 + a.id) * 0.015;
    if (o.bubble && now > o.bubbleUntil) { a.remove(o.bubble); o.bubble = null; }
  }
}

// =====================================================================
//  WHITEBOARDS
// =====================================================================
function clearBoard(name) {
  const b = level?.boards[name];
  if (!b) return;
  b.base(b.ct.ctx, b.ct.canvas.width, b.ct.canvas.height);
  b.ct.tex.needsUpdate = true;
}
function drawSegment(name, seg) {
  const b = level?.boards[name];
  if (!b) return;
  const g = b.ct.ctx, W = b.ct.canvas.width, H = b.ct.canvas.height;
  g.strokeStyle = seg[4];
  g.lineWidth = 7; g.lineCap = 'round';
  g.beginPath(); g.moveTo(seg[0] * W, seg[1] * H); g.lineTo(seg[2] * W, seg[3] * H); g.stroke();
  b.ct.tex.needsUpdate = true;
}

// =====================================================================
//  NETWORK
// =====================================================================
let ws = null;
let myId = null;
function net(msg) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg)); }

function connect() {
  ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
  ws.onopen = () => net({ type: 'join', name: me.name, char: me.char, color: charInfo(me.char).accent });
  ws.onclose = () => systemMsg('Disconnected from the server. Refresh the page to rejoin.');
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    switch (m.type) {
      case 'roomState':
        myId = m.you;
        if (m.counts) roomCounts = m.counts;
        clearOthers();
        m.players.forEach(addOther);
        for (const [name, segs] of Object.entries(m.boards || {})) { clearBoard(name); segs.forEach((s) => drawSegment(name, s)); }
        refreshPortalSigns();
        break;
      case 'playerJoined': addOther(m.player); break;
      case 'playerLeft': removeOther(m.id); break;
      case 'move': {
        const o = others.get(m.id);
        if (o) Object.assign(o.target, { x: m.x, y: m.y, z: m.z, ry: m.ry, s: m.s });
        break;
      }
      case 'chat':
        chatMsg(m.name, m.color, m.text);
        if (m.id !== myId) showBubble(m.id, m.text);
        break;
      case 'counts': roomCounts = m.counts; refreshPortalSigns(); break;
      case 'draw': drawSegment(m.board, m.seg); break;
      case 'clear': clearBoard(m.board); break;
    }
  };
}

let lastSent = 0, lastKey = '';
function sendMove(now) {
  if (now - lastSent < 100) return;
  const key = [me.x.toFixed(2), me.y.toFixed(2), me.z.toFixed(2), me.yaw.toFixed(2), sitting ? 1 : 0].join();
  if (key === lastKey) return;
  lastSent = now; lastKey = key;
  net({ type: 'move', x: me.x, y: me.y, z: me.z, ry: me.yaw, s: sitting ? 1 : 0 });
}

function setRoomLabel() {
  const r = ROOMS[currentRoom];
  $('roomName').textContent = currentRoom === 'lobby' ? 'Polyglotter Plaza' : `${r.native} · ${r.label} Room`;
  $('roomName').style.color = currentRoom === 'lobby' ? '#2a2346' : r.color;
}

function goToRoom(roomId) {
  const from = currentRoom;
  currentRoom = roomId;
  loadLevel(roomId);
  spawnIn(roomId, from);
  clearOthers();
  net({ type: 'switch', room: roomId, x: me.x, z: me.z, ry: me.yaw });
  setRoomLabel();
  $('chatLog').innerHTML = '';
  const r = ROOMS[roomId];
  systemMsg(roomId === 'lobby' ? 'You are back in the plaza.' : `${r.greeting} You joined the ${r.label} room. Try to chat in ${r.label}!`);
}

// =====================================================================
//  CHAT + TRANSLATION
// =====================================================================
const chatLog = $('chatLog');
const chatInput = $('chatInput');
let chatOpen = false;

function addLine(el) {
  chatLog.appendChild(el);
  while (chatLog.children.length > 60) chatLog.firstChild.remove();
  chatLog.scrollTop = chatLog.scrollHeight;
}
function systemMsg(text) {
  const d = document.createElement('div');
  d.className = 'msg system';
  d.textContent = text;
  addLine(d);
}
function chatMsg(name, color, text) {
  const d = document.createElement('div');
  d.className = 'msg';
  const who = document.createElement('span');
  who.className = 'who'; who.style.color = color; who.textContent = name + ':';
  const body = document.createElement('span');
  body.textContent = text;
  const btn = document.createElement('button');
  btn.className = 'tr'; btn.textContent = 'Translate';
  btn.onclick = async () => {
    btn.disabled = true; btn.textContent = '...';
    const out = document.createElement('div');
    out.className = 'trans';
    out.textContent = await translate(text, ROOMS[currentRoom].code, me.lang);
    d.appendChild(out);
    btn.remove();
    chatLog.scrollTop = chatLog.scrollHeight;
  };
  d.append(who, body, btn);
  addLine(d);
}

async function translate(text, from, to) {
  if (from === to) return 'This is already in your language.';
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
    const data = await (await fetch(url)).json();
    const t = data?.responseData?.translatedText;
    if (!t || Number(data.responseStatus) !== 200) throw new Error(data?.responseDetails || 'no result');
    return t;
  } catch {
    return 'Sorry, translation is unavailable right now.';
  }
}

function openChat() {
  chatOpen = true;
  for (const k in keys) keys[k] = false;
  $('chat').classList.add('open');
  document.exitPointerLock?.();
  chatInput.focus();
}
function closeChat() {
  chatInput.value = '';
  chatInput.blur();
  $('chat').classList.remove('open');
  lockMouse();
  chatOpen = false;
}
chatInput.addEventListener('keydown', (e) => {
  e.stopPropagation();
  if (e.key === 'Enter') {
    const text = chatInput.value.trim();
    if (text) net({ type: 'chat', text });
    closeChat();
  } else if (e.key === 'Escape') closeChat();
});

// =====================================================================
//  INPUT
// =====================================================================
let started = false;
const canvas = renderer.domElement;
const ray = new THREE.Raycaster();
ray.far = 7;
let drawing = false, lastUV = null, lastBoard = null;

function lockMouse() {
  try { const p = canvas.requestPointerLock(); p?.catch?.(() => {}); } catch {}
}
function isLocked() { return document.pointerLockElement === canvas; }
function aimedBoard() {
  const meshes = Object.values(level?.boards || {}).map((b) => b.mesh);
  if (!meshes.length) return null;
  ray.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hit = ray.intersectObjects(meshes, false)[0];
  return hit ? { name: hit.object.userData.board, uv: hit.uv } : null;
}

document.addEventListener('pointerlockchange', () => {
  if (!isLocked() && sitting && !chatOpen) standUp();
  if (!isLocked()) drawing = false;
  $('pause').hidden = !started || isLocked() || chatOpen;
});
canvas.addEventListener('mousedown', (e) => {
  if (!started || chatOpen) return;
  if (!isLocked()) { lockMouse(); return; }
  if (e.button === 0) { drawing = true; lastUV = null; }
});
addEventListener('mouseup', () => { drawing = false; });
$('pause').addEventListener('click', () => lockMouse());

document.addEventListener('mousemove', (e) => {
  if (!isLocked()) return;
  me.yaw -= e.movementX * 0.0022;
  me.pitch = THREE.MathUtils.clamp(me.pitch - e.movementY * 0.0022, -1.4, 1.4);
});
document.addEventListener('keydown', (e) => {
  if (!started || chatOpen) return;
  if (e.key === 'Enter' || e.code === 'KeyT') { e.preventDefault(); openChat(); return; }
  if (e.code === 'KeyE') { sitting ? standUp() : sitDown(); return; }
  if (e.code === 'KeyC') {
    const a = aimedBoard();
    if (a) { clearBoard(a.name); net({ type: 'clear', board: a.name }); }
    return;
  }
  keys[e.code] = true;
  if (e.code === 'Space') {
    e.preventDefault();
    if (sitting) standUp();
    else if (me.y === 0) me.vy = 8;
  }
});
document.addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; drawing = false; });

function updateDrawing() {
  if (!drawing || !isLocked()) return;
  const a = aimedBoard();
  if (!a) { lastUV = null; return; }
  if (lastUV && lastBoard === a.name && lastUV.distanceTo(a.uv) > 0.002) {
    const color = charInfo(me.char).accent;
    const seg = [lastUV.x, 1 - lastUV.y, a.uv.x, 1 - a.uv.y, color];
    drawSegment(a.name, seg);
    net({ type: 'draw', board: a.name, seg: seg.slice(0, 4), c: color });
  }
  if (!lastUV || lastUV.distanceTo(a.uv) > 0.002 || lastBoard !== a.name) { lastUV = a.uv.clone(); lastBoard = a.name; }
}

let promptText = '';
function updatePrompt() {
  let t = '';
  if (started && !chatOpen) {
    if (sitting) t = 'Press Space or Esc to stand up';
    else if (nearestSeat()) t = 'Press E to sit';
    else if (aimedBoard()) t = 'Hold click to draw · C to clear';
  }
  if (t !== promptText) { promptText = t; $('prompt').textContent = t; $('prompt').hidden = !t; }
}

// =====================================================================
//  START SCREEN + CHARACTER PICKER
// =====================================================================
function characterThumbnails() {
  const size = 200;
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1);
  r.setSize(size, size);
  const s = new THREE.Scene();
  s.add(new THREE.HemisphereLight('#ffffff', '#a7a0c8', 1.7));
  const d = new THREE.DirectionalLight('#ffffff', 1.4);
  d.position.set(2, 4, 5);
  s.add(d);
  const cam = new THREE.PerspectiveCamera(24, 1, 0.1, 50);
  cam.position.set(0, 1.45, 5.6);
  cam.lookAt(0, 1.12, 0);
  const urls = {};
  for (const c of CHARACTERS) {
    const a = makeAvatar('', c.id);
    a.rotation.y = -0.35;
    s.add(a);
    r.render(s, cam);
    urls[c.id] = r.domElement.toDataURL('image/png');
    s.remove(a);
  }
  r.dispose();
  r.forceContextLoss?.();
  return urls;
}

let showcase = null;
const SHOW_POS = new THREE.Vector3(1.5, 0, 9.6);
function makeShowcase() {
  if (showcase) scene.remove(showcase);
  showcase = makeAvatar('', me.char);
  showcase.position.copy(SHOW_POS);
  scene.add(showcase);
}

const charsEl = $('chars');
const thumbs = characterThumbnails();
for (const c of CHARACTERS) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'char' + (c.id === me.char ? ' sel' : '');
  b.innerHTML = `<img alt=""><span></span>`;
  b.querySelector('img').src = thumbs[c.id];
  b.querySelector('span').textContent = c.name;
  b.onclick = () => {
    me.char = c.id;
    [...charsEl.children].forEach((x) => x.classList.toggle('sel', x === b));
    makeShowcase();
  };
  charsEl.appendChild(b);
}
const browserLang = (navigator.language || 'en').slice(0, 2);
if ([...$('langSelect').options].some((o) => o.value === browserLang)) $('langSelect').value = browserLang;
$('nameInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('playBtn').click(); });

$('playBtn').onclick = () => {
  me.name = $('nameInput').value.trim() || 'Traveler' + Math.floor(Math.random() * 900 + 100);
  me.lang = $('langSelect').value;
  scene.remove(showcase);
  $('start').remove();
  $('hud').hidden = false;
  $('chat').hidden = false;
  setMyHands(me.char);
  started = true;
  spawnIn('lobby');
  setRoomLabel();
  systemMsg(`Hi ${me.name}! Sit on a bench (E), draw on the map in the gazebo, or walk through a portal to practice a language.`);
  connect();
  lockMouse();
  $('pause').hidden = isLocked();
};

// =====================================================================
//  GAME LOOP
// =====================================================================
loadLevel('lobby');
makeShowcase();

const clock = new THREE.Clock();
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const now = performance.now();
  if (started) { updatePlayer(dt); updateDrawing(); updatePrompt(); sendMove(now); }
  else {
    // title screen: slowly drifting camera looking at your character in front of the fountain
    const t = now / 4000;
    camera.position.set(0.2 + Math.sin(t) * 0.4, 1.75, 13.6);
    camera.lookAt(SHOW_POS.x - 1.1, 1.85, SHOW_POS.z - 3);
    showcase.rotation.y = Math.atan2(camera.position.x - SHOW_POS.x, camera.position.z - SHOW_POS.z) + Math.sin(now / 1500) * 0.25;
  }
  updateOthers(dt, now);
  for (const fn of level.updaters) fn(now, dt);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
loop();

window.__game = { renderer, me, others, goToRoom, sitDown, standUp, get room() { return currentRoom; } };
