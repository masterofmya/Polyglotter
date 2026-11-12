import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// =====================================================================
//  ROOM SETTINGS  (add a new language by adding an entry here)
// =====================================================================
const ROOMS = {
  lobby:      { label: 'Lobby', code: 'Autodetect', color: '#e8792b', wall: '#f3e6cf' },
  english:    { label: 'English', native: 'English', code: 'en', color: '#d84a5a', floor: '#ffd3d8', wall: '#fff0f2',
                greeting: 'Welcome!', sub: 'We speak English here', flag: { us: true } },
  french:     { label: 'French', native: 'Français', code: 'fr', color: '#4a7bd8', floor: '#cfdcff', wall: '#eef3ff',
                greeting: 'Bienvenue !', sub: 'Ici, on parle français', flag: { dir: 'v', colors: ['#0055A4', '#FFFFFF', '#EF4135'] } },
  italian:    { label: 'Italian', native: 'Italiano', code: 'it', color: '#2fa35a', floor: '#cdf0d8', wall: '#effbf2',
                greeting: 'Benvenuti!', sub: 'Qui si parla italiano', flag: { dir: 'v', colors: ['#009246', '#FFFFFF', '#CE2B37'] } },
  spanish:    { label: 'Spanish', native: 'Español', code: 'es', color: '#e2571e', floor: '#ffdcc8', wall: '#fff2ea',
                greeting: '¡Bienvenidos!', sub: 'Aquí hablamos español', flag: { dir: 'h', colors: ['#AA151B', '#F1BF00', '#F1BF00', '#AA151B'] } },
  german:     { label: 'German', native: 'Deutsch', code: 'de', color: '#e0a800', floor: '#fff0b8', wall: '#fffaea',
                greeting: 'Willkommen!', sub: 'Hier sprechen wir Deutsch', flag: { dir: 'h', colors: ['#000000', '#DD0000', '#FFCE00'] } },
  portuguese: { label: 'Portuguese', native: 'Português', code: 'pt', color: '#1c8a4a', floor: '#d6f2df', wall: '#f0fbf3',
                greeting: 'Bem-vindos!', sub: 'Aqui falamos português', flag: { dir: 'v', colors: ['#006600', '#006600', '#FF0000', '#FF0000', '#FF0000'] } },
};
// portals on the back-left wall and back-right wall of the lobby (left to right)
const PORTALS_LEFT = ['english', 'french', 'italian'];
const PORTALS_RIGHT = ['spanish', 'german', 'portuguese'];

const HEX_R = 18;                          // lobby size (centre to corner)
const HEX_AP = HEX_R * Math.sqrt(3) / 2;   // centre to middle of a wall
const WALL_H = 6.5;
const HALF = 19;                           // half width of the square language rooms
const EYE = 1.6, EYE_SIT = 1.45;
const SPEED = 5.5;
const COLORS = ['#e8792b', '#e04848', '#f2b632', '#3fae6a', '#3a9ad9', '#4a5bd8', '#9b59d0', '#e86aa6', '#2b2d42', '#f5f5f5'];

// =====================================================================
//  SETUP
// =====================================================================
const $ = (id) => document.getElementById(id);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#bfe6ff');
scene.fog = new THREE.Fog('#bfe6ff', 40, 90);
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.05, 200);
camera.rotation.order = 'YXZ';
scene.add(camera);

scene.add(new THREE.HemisphereLight('#ffffff', '#b9c4d6', 1.4));
const sun = new THREE.DirectionalLight('#fff6e5', 1.8);
sun.position.set(12, 25, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, near: 1, far: 70 });
scene.add(sun);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// =====================================================================
//  HELPERS FOR BUILDING THINGS
// =====================================================================
function shade(mesh) { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; }
function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const m = shade(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color })));
  m.position.set(x, y, z);
  return m;
}
// soft, rounded box (gives the friendly "toy" look from the sketch)
function rbox(w, h, d, color, x = 0, y = 0, z = 0, r = 0.08) {
  const rad = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
  const m = shade(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, rad), new THREE.MeshLambertMaterial({ color })));
  m.position.set(x, y, z);
  return m;
}
function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { canvas: c, ctx: g, tex };
}
function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
const FONT = "'Nunito', system-ui, sans-serif";

function drawFlag(g, flag, x, y, w, h) {
  g.save();
  roundRect(g, x, y, w, h, h * 0.12);
  g.clip();
  if (flag.us) {
    for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? '#FFFFFF' : '#B22234'; g.fillRect(x, y + (h / 13) * i, w, h / 13 + 1); }
    const cw = w * 0.42, ch = (h / 13) * 7;
    g.fillStyle = '#3C3B6E'; g.fillRect(x, y, cw, ch);
    g.fillStyle = '#fff';
    for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
      g.beginPath(); g.arc(x + cw * (c + 0.5) / 5, y + ch * (r + 0.5) / 4, h * 0.025, 0, Math.PI * 2); g.fill();
    }
  } else {
    const n = flag.colors.length;
    flag.colors.forEach((c, i) => {
      g.fillStyle = c;
      if (flag.dir === 'v') g.fillRect(x + (w / n) * i, y, w / n + 1, h);
      else g.fillRect(x, y + (h / n) * i, w, h / n + 1);
    });
  }
  g.restore();
  g.strokeStyle = 'rgba(0,0,0,.15)'; g.lineWidth = 4;
  roundRect(g, x, y, w, h, h * 0.12); g.stroke();
}

function makeSign(width, height, draw) {
  const ppu = 128;
  const ct = canvasTexture(width * ppu, height * ppu, draw);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: ct.tex, transparent: true }));
  mesh.userData.ct = ct;
  return mesh;
}
function signCard(g, w, h, color) {
  g.fillStyle = '#fff'; roundRect(g, 8, 8, w - 16, h - 16, 50); g.fill();
  g.strokeStyle = color; g.lineWidth = 14; roundRect(g, 8, 8, w - 16, h - 16, 50); g.stroke();
}

function makeNameTag(name, color) {
  const ct = canvasTexture(512, 128, (g, w) => {
    g.font = `900 64px ${FONT}`;
    const tw = Math.min(g.measureText(name).width + 70, w - 8);
    g.fillStyle = 'rgba(255,255,255,0.92)';
    roundRect(g, (w - tw) / 2, 20, tw, 88, 44); g.fill();
    g.fillStyle = color; g.beginPath(); g.arc((w - tw) / 2 + 34, 64, 10, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2b2d42'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(name, w / 2 + 12, 66, w - 90);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ct.tex, depthTest: false }));
  s.scale.set(1.6, 0.4, 1);
  s.renderOrder = 10;
  return s;
}
function makeBubble(text) {
  const W = 640, pad = 34, lineH = 52;
  const measure = document.createElement('canvas').getContext('2d');
  measure.font = `700 42px ${FONT}`;
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
    g.fillStyle = '#ffffff';
    roundRect(g, (w - bw) / 2, 0, bw, h - 24, 32); g.fill();
    g.beginPath(); g.moveTo(w / 2 - 18, h - 25); g.lineTo(w / 2 + 18, h - 25); g.lineTo(w / 2, h); g.fill();
    g.fillStyle = '#2b2d42'; g.font = `700 42px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'top';
    lines.forEach((l, i) => g.fillText(l, w / 2, pad + i * lineH));
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ct.tex, depthTest: false }));
  s.scale.set(2.6, 2.6 * (H / W), 1);
  s.renderOrder = 11;
  return s;
}

// =====================================================================
//  THE TRAVELER  (character #1, from the sketch)
//  scarf color = the color the player picks
// =====================================================================
const T = {
  skin: '#b07a52', hair: '#6b4226', hairDark: '#583420', coat: '#ecdcbc', coatShade: '#dcc59e',
  sweater: '#8a5a3c', jeans: '#3d4f8f', boot: '#7a4a2a', mitten: '#7a4a2a', goggle: '#f3e9d2', lens: '#b9b6e8',
};

function makeMitten() {
  const m = new THREE.Group();
  m.add(rbox(0.2, 0.24, 0.2, T.mitten, 0, 0, 0, 0.09), rbox(0.08, 0.11, 0.09, T.mitten, 0.1, 0.03, 0.04, 0.04));
  return m;
}

function makeAvatar(name, color) {
  const g = new THREE.Group();
  const body = new THREE.Group();   // everything except the name tag (moves when sitting)
  g.add(body);

  // legs: jeans + boots
  const legs = [-0.14, 0.14].map((x) => {
    const leg = new THREE.Group();
    leg.add(rbox(0.22, 0.32, 0.24, T.jeans, 0, -0.13, 0, 0.06), rbox(0.26, 0.15, 0.32, T.boot, 0, -0.34, 0.03, 0.06));
    leg.position.set(x, 0.42, 0);
    body.add(leg);
    return leg;
  });

  // long coat, sweater, scarf
  body.add(rbox(0.7, 0.72, 0.46, T.coat, 0, 0.8, 0, 0.12));
  body.add(rbox(0.76, 0.22, 0.5, T.coatShade, 0, 0.5, 0, 0.08));
  body.add(rbox(0.26, 0.62, 0.05, T.sweater, 0.03, 0.84, 0.225, 0.03));
  body.add(rbox(0.04, 0.6, 0.05, T.coatShade, -0.12, 0.82, 0.235, 0.02));
  body.add(rbox(0.62, 0.17, 0.52, color, 0, 1.15, 0, 0.08));
  const tail = rbox(0.15, 0.44, 0.06, color, 0.17, 0.93, 0.27, 0.04);
  tail.rotation.z = 0.12;
  body.add(tail);

  // head
  const head = new THREE.Group();
  head.position.set(0, 1.52, 0);
  head.add(rbox(0.72, 0.68, 0.62, T.skin, 0, 0, 0, 0.22));
  head.add(rbox(0.07, 0.13, 0.03, '#2a1a12', -0.13, 0.0, 0.31, 0.03), rbox(0.07, 0.13, 0.03, '#2a1a12', 0.13, 0.0, 0.31, 0.03));
  for (const x of [-0.22, 0.22]) {
    const blush = new THREE.Mesh(new THREE.CircleGeometry(0.055, 16), new THREE.MeshBasicMaterial({ color: '#e58a84' }));
    blush.position.set(x, -0.1, 0.313);
    head.add(blush);
  }
  // curly hair
  head.add(rbox(0.82, 0.24, 0.68, T.hair, 0, 0.3, -0.01, 0.1));
  head.add(rbox(0.82, 0.7, 0.36, T.hair, 0, 0.04, -0.18, 0.14));
  head.add(rbox(0.17, 0.82, 0.5, T.hair, -0.4, -0.16, -0.04, 0.08), rbox(0.17, 0.82, 0.5, T.hair, 0.4, -0.16, -0.04, 0.08));
  head.add(rbox(0.9, 0.78, 0.26, T.hair, 0, -0.5, -0.24, 0.12));
  for (const [x, y, z] of [[-0.38, -0.55, 0.12], [0.38, -0.55, 0.12], [-0.3, -0.85, -0.2], [0.3, -0.85, -0.2], [0, -0.88, -0.26], [-0.42, 0.15, 0.1], [0.42, 0.15, 0.1]]) {
    head.add(rbox(0.2, 0.2, 0.2, T.hairDark, x, y, z, 0.09));
  }
  // aviator goggles pushed up on the head
  head.add(rbox(0.86, 0.07, 0.72, T.goggle, 0, 0.3, 0, 0.03));
  for (const x of [-0.16, 0.16]) {
    const gog = new THREE.Group();
    gog.add(rbox(0.26, 0.18, 0.09, T.goggle, 0, 0, 0, 0.06), rbox(0.19, 0.12, 0.04, T.lens, 0, 0, 0.04, 0.04));
    gog.position.set(x, 0.43, 0.2);
    gog.rotation.x = -0.6;
    head.add(gog);
  }
  body.add(head);

  // floating mittens
  const hands = [-0.52, 0.52].map((x) => {
    const m = makeMitten();
    m.position.set(x, 0.78, 0.06);
    body.add(m);
    return m;
  });

  const tag = makeNameTag(name, color);
  tag.position.y = 2.35;
  g.add(tag);
  g.userData = { body, legs, hands, head, phase: 0 };
  return g;
}

// =====================================================================
//  WORLD STATE
// =====================================================================
let world = null;
let portals = [];      // { roomId, x, z, group }
let colliders = [];    // circles { x, z, r }
let seats = [];        // { x, z, yaw }
let boards = {};       // name -> { mesh, ct }
let fire = null;
let bounds = 'square';
let currentRoom = 'lobby';
let roomCounts = {};

function hexCorner(k) { const a = k * Math.PI / 3; return new THREE.Vector2(HEX_R * Math.sin(a), HEX_R * Math.cos(a)); }

function grassTexture() {
  const ct = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#7cc46a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) {
      const x = Math.random() * w, y = Math.random() * h;
      g.strokeStyle = ['#6ab359', '#8fd47b', '#5fa84f', '#9ade88'][i % 4];
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 6, y - 6 - Math.random() * 6); g.stroke();
    }
  });
  ct.tex.wrapS = ct.tex.wrapT = THREE.RepeatWrapping;
  ct.tex.repeat.set(7, 7);
  return ct.tex;
}
function floorTexture(color) {
  const ct = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.25)';
    g.fillRect(0, 0, w / 2, h / 2); g.fillRect(w / 2, h / 2, w / 2, h / 2);
  });
  ct.tex.wrapS = ct.tex.wrapT = THREE.RepeatWrapping;
  ct.tex.repeat.set(10, 10);
  return ct.tex;
}

function drawPortalSign(sign, roomId) {
  const r = ROOMS[roomId];
  const { ctx: g, canvas, tex } = sign.userData.ct;
  const w = canvas.width, h = canvas.height;
  g.clearRect(0, 0, w, h);
  signCard(g, w, h, r.color);
  drawFlag(g, r.flag, 34, 46, 120, 80);
  g.fillStyle = '#2b2d42'; g.textBaseline = 'middle'; g.textAlign = 'left';
  g.font = `900 60px ${FONT}`; g.fillText(r.label, 176, 70, w - 200);
  g.font = `700 40px ${FONT}`; g.fillStyle = '#6b6f80'; g.fillText(r.native, 178, 122, w - 200);
  const n = roomCounts[roomId] || 0;
  g.textAlign = 'center'; g.font = `800 36px ${FONT}`; g.fillStyle = n ? r.color : '#9aa0b4';
  g.fillText(n === 1 ? '1 person here' : `${n} people here`, w / 2, 182);
  tex.needsUpdate = true;
}

function makePortal(roomId, label) {
  const r = ROOMS[roomId];
  const grp = new THREE.Group();
  grp.add(rbox(0.45, 4.2, 0.55, r.color, -1.55, 2.1, 0, 0.12), rbox(0.45, 4.2, 0.55, r.color, 1.55, 2.1, 0, 0.12), rbox(3.6, 0.5, 0.55, r.color, 0, 4.2, 0, 0.12));
  grp.add(rbox(3.9, 0.18, 1.4, '#ffffff', 0, 0.09, 0, 0.06));
  const glow = canvasTexture(128, 128, (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
    grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.5, r.color); grad.addColorStop(1, r.color);
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
  });
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 3.8),
    new THREE.MeshBasicMaterial({ map: glow.tex, transparent: true, opacity: 0.75, side: THREE.DoubleSide }));
  inner.position.y = 2.1;
  grp.add(inner);
  let sign;
  if (label) {
    sign = makeSign(3.6, 1.6, (g, w, h) => {
      signCard(g, w, h, r.color);
      g.fillStyle = '#2b2d42'; g.font = `900 70px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(label, w / 2, h / 2, w - 40);
    });
  } else {
    sign = makeSign(3.6, 1.6, () => {});
    drawPortalSign(sign, roomId);
  }
  sign.position.y = 5.4;
  grp.add(sign);
  grp.userData = { roomId, inner, sign };
  return grp;
}

function makeTree(x, z) {
  const t = new THREE.Group();
  t.add(rbox(0.5, 1.6, 0.5, '#8d6e63', 0, 0.8, 0), rbox(1.8, 1.6, 1.8, '#5cc46b', 0, 2.3, 0, 0.3), rbox(1.1, 0.8, 1.1, '#74d683', 0, 3.4, 0, 0.25));
  t.position.set(x, 0, z);
  colliders.push({ x, z, r: 0.7 });
  return t;
}
function makeTable(x, z, color) {
  const t = new THREE.Group();
  t.add(rbox(1.6, 0.14, 1.6, '#ffffff', 0, 0.85, 0, 0.05), box(0.2, 0.85, 0.2, '#9aa0b4', 0, 0.42, 0), rbox(0.9, 0.08, 0.9, '#9aa0b4', 0, 0.04, 0, 0.03));
  for (const [dx, dz] of [[1.25, 0], [-1.25, 0], [0, 1.25], [0, -1.25]]) {
    const chair = new THREE.Group();
    chair.add(rbox(0.6, 0.12, 0.6, color, 0, 0.5, 0, 0.05), box(0.1, 0.5, 0.1, '#9aa0b4', 0, 0.25, 0));
    chair.position.set(dx, 0, dz);
    t.add(chair);
  }
  t.position.set(x, 0, z);
  colliders.push({ x, z, r: 1.0 });
  return t;
}

// a horizontal sitting log, with two seats on it, facing the fire
function makeLog(x, z, alongX) {
  const g = new THREE.Group();
  const bark = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 3, 10), new THREE.MeshLambertMaterial({ color: '#7a4f30' })));
  bark.rotation[alongX ? 'z' : 'x'] = Math.PI / 2;
  bark.position.y = 0.34;
  g.add(bark);
  for (const s of [-1.5, 1.5]) {
    const ring = new THREE.Mesh(new THREE.CircleGeometry(0.3, 10), new THREE.MeshLambertMaterial({ color: '#d8a46e' }));
    ring.position.set(alongX ? s + Math.sign(s) * 0.01 : 0, 0.34, alongX ? 0 : s + Math.sign(s) * 0.01);
    ring.rotation.y = alongX ? Math.sign(s) * Math.PI / 2 : (s > 0 ? 0 : Math.PI);
    g.add(ring);
  }
  g.position.set(x, 0, z);
  for (const o of [-0.75, 0.75]) {
    const sx = x + (alongX ? o : 0), sz = z + (alongX ? 0 : o);
    seats.push({ x: sx, z: sz, yaw: Math.atan2(sx, sz) });
    colliders.push({ x: sx, z: sz, r: 0.55 });
  }
  return g;
}

function makeCampfire() {
  const g = new THREE.Group();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const s = rbox(0.42, 0.3, 0.36, i % 2 ? '#9aa0a8' : '#868c96', Math.sin(a) * 1.05, 0.15, Math.cos(a) * 1.05, 0.1);
    s.rotation.y = a;
    g.add(s);
  }
  for (const r of [0.5, -0.5]) {
    const log = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.5, 8), new THREE.MeshLambertMaterial({ color: '#5a3a22' })));
    log.rotation.set(Math.PI / 2, 0, r * 1.8);
    log.position.y = 0.15;
    g.add(log);
  }
  const flames = [['#ffd23f', 0.42, 1.3, 0], ['#ff8a3d', 0.55, 1.0, 1], ['#ff5a36', 0.66, 0.75, 2]].map(([c, rad, h, i]) => {
    const f = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 5), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9 }));
    f.position.y = 0.2 + h / 2;
    f.userData = { h, i };
    g.add(f);
    return f;
  });
  const embers = [];
  for (let i = 0; i < 14; i++) {
    const e = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: '#ffb347' }));
    e.userData = { t: Math.random() * 3, a: Math.random() * Math.PI * 2, r: Math.random() * 0.4 };
    g.add(e);
    embers.push(e);
  }
  const light = new THREE.PointLight('#ff8a3d', 30, 16, 2);
  light.position.y = 1.3;
  g.add(light);
  colliders.push({ x: 0, z: 0, r: 1.4 });
  return { group: g, flames, embers, light };
}

function animateFire(now, dt) {
  if (!fire) return;
  for (const f of fire.flames) {
    const s = 1 + Math.sin(now / 90 + f.userData.i * 2) * 0.12 + Math.sin(now / 37 + f.userData.i) * 0.06;
    f.scale.set(1, s, 1);
    f.position.y = 0.2 + (f.userData.h * s) / 2;
    f.rotation.y += dt * (0.8 + f.userData.i * 0.4);
  }
  for (const e of fire.embers) {
    const u = e.userData;
    u.t += dt;
    if (u.t > 2.5) { u.t = 0; u.a = Math.random() * Math.PI * 2; u.r = Math.random() * 0.4; }
    e.position.set(Math.sin(u.a + u.t) * u.r, 0.6 + u.t * 1.2, Math.cos(u.a + u.t) * u.r);
    e.material.opacity = 1 - u.t / 2.5;
    e.material.transparent = true;
  }
  fire.light.intensity = 28 + Math.sin(now / 70) * 4 + Math.sin(now / 23) * 2;
}

// ---------- whiteboards ----------
const BOARD_W = 1024, BOARD_H = 470;
function makeWhiteboard(name, color) {
  const g = new THREE.Group();
  g.add(rbox(8.4, 4.0, 0.25, '#d9dde6', 0, 2.75, -0.1, 0.08));          // frame
  g.add(rbox(8.0, 0.14, 0.4, '#b9bfcc', 0, 0.8, 0.15, 0.04));           // marker tray
  const ct = canvasTexture(BOARD_W, BOARD_H, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); });
  const surf = new THREE.Mesh(new THREE.PlaneGeometry(7.8, 3.58), new THREE.MeshBasicMaterial({ map: ct.tex }));
  surf.position.set(0, 2.75, 0.04);
  surf.userData.board = name;
  g.add(surf);
  const label = makeSign(4.6, 0.6, (c, w, h) => {
    c.fillStyle = color; roundRect(c, 0, 0, w, h, h / 2); c.fill();
    c.fillStyle = '#fff'; c.font = `900 44px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('Whiteboard · hold click to draw · C to clear', w / 2, h / 2 + 2, w - 30);
  });
  label.position.set(0, 5.15, 0.02);
  g.add(label);
  boards[name] = { mesh: surf, ct };
  return g;
}
function clearBoardCanvas(name) {
  const b = boards[name];
  if (!b) return;
  b.ct.ctx.fillStyle = '#ffffff'; b.ct.ctx.fillRect(0, 0, BOARD_W, BOARD_H);
  b.ct.tex.needsUpdate = true;
}
function drawSegment(name, seg) {
  const b = boards[name];
  if (!b) return;
  const g = b.ct.ctx;
  g.strokeStyle = seg[4] === '#f5f5f5' ? '#c9ccd6' : seg[4];
  g.lineWidth = 7; g.lineCap = 'round';
  g.beginPath(); g.moveTo(seg[0] * BOARD_W, seg[1] * BOARD_H); g.lineTo(seg[2] * BOARD_W, seg[3] * BOARD_H); g.stroke();
  b.ct.tex.needsUpdate = true;
}

// ---------- build a room ----------
function placeOnWall(obj, a, b, t, inset) {
  const p = a.clone().lerp(b, t);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const inward = mid.clone().multiplyScalar(-1).normalize();
  obj.position.set(p.x + inward.x * inset, 0, p.y + inward.y * inset);
  obj.lookAt(obj.position.x + inward.x, 0, obj.position.z + inward.y);
  return obj;
}

function buildLobby() {
  const r = ROOMS.lobby;
  bounds = 'hex';

  // grass floor (hexagon)
  const floor = new THREE.Mesh(new THREE.CircleGeometry(HEX_R + 0.5, 6, -Math.PI / 2), new THREE.MeshLambertMaterial({ map: grassTexture() }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  world.add(floor);

  // little 3D grass tufts
  const tuftGeo = new THREE.BoxGeometry(0.06, 0.28, 0.06);
  const tufts = new THREE.InstancedMesh(tuftGeo, new THREE.MeshLambertMaterial({ color: '#5fae4e' }), 500);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < 500; i++) {
    let x, z;
    do { x = (Math.random() - 0.5) * 2 * HEX_AP; z = (Math.random() - 0.5) * 2 * HEX_R; } while (!insideHex(x, z, 1.5) || Math.hypot(x, z) < 5);
    e.set((Math.random() - 0.5) * 0.5, Math.random() * 3, (Math.random() - 0.5) * 0.5);
    m4.compose(new THREE.Vector3(x, 0.12, z), q.setFromEuler(e), new THREE.Vector3(1, 0.6 + Math.random(), 1));
    tufts.setMatrixAt(i, m4);
  }
  world.add(tufts);

  // six walls with wooden trim
  for (let k = 0; k < 6; k++) {
    const a = hexCorner(k), b = hexCorner(k + 1);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const out = mid.clone().normalize();
    const ang = Math.atan2(-(b.y - a.y), b.x - a.x);
    for (const [h, y, th, col] of [[WALL_H, WALL_H / 2, 0.6, r.wall], [0.35, WALL_H, 0.9, '#c98b52'], [0.6, 0.3, 0.8, '#c98b52']]) {
      const w = box(HEX_R + 0.5, h, th, col, mid.x + out.x * 0.3, y, mid.y + out.y * 0.3);
      w.rotation.y = ang;
      world.add(w);
    }
  }

  // glass dome roof
  const domeGeo = new THREE.SphereGeometry(HEX_R + 0.4, 6, 5, Math.PI / 2, Math.PI * 2, 0, Math.PI / 2);
  const dome = new THREE.Mesh(domeGeo, new THREE.MeshPhongMaterial({ color: '#cfeeff', transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false, shininess: 90 }));
  dome.scale.y = 0.55;
  dome.position.y = WALL_H;
  world.add(dome);
  const ribs = new THREE.LineSegments(new THREE.EdgesGeometry(domeGeo, 1), new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8 }));
  ribs.scale.y = 0.55;
  ribs.position.y = WALL_H;
  world.add(ribs);

  // portals: back-left wall (corners 4 -> 3) and back-right wall (corners 3 -> 2)
  const addPortals = (ids, a, b) => ids.forEach((id, i) => {
    const p = placeOnWall(makePortal(id), a, b, 0.2 + i * 0.3, 0.9);
    world.add(p);
    portals.push({ roomId: id, x: p.position.x, z: p.position.z, group: p });
  });
  addPortals(PORTALS_LEFT, hexCorner(4), hexCorner(3));
  addPortals(PORTALS_RIGHT, hexCorner(3), hexCorner(2));

  // whiteboards on the left and right walls
  world.add(placeOnWall(makeWhiteboard('left', '#4a7bd8'), hexCorner(4), hexCorner(5), 0.5, 0.35));
  world.add(placeOnWall(makeWhiteboard('right', '#3fae6a'), hexCorner(1), hexCorner(2), 0.5, 0.35));

  // campfire with sitting logs
  fire = makeCampfire();
  world.add(fire.group);
  world.add(makeLog(-3.4, 0, false), makeLog(3.4, 0, false), makeLog(0, -3.4, true));

  // spawn pad with a star
  const starTex = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2); g.fill();
    g.strokeStyle = r.color; g.lineWidth = 10; g.stroke();
    g.fillStyle = r.color; g.beginPath();
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 ? 40 : 95, a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      g.lineTo(w / 2 + Math.cos(a) * rad, h / 2 + Math.sin(a) * rad);
    }
    g.fill();
  });
  const pad = new THREE.Mesh(new THREE.CircleGeometry(1.4, 32), new THREE.MeshLambertMaterial({ map: starTex.tex }));
  pad.rotation.x = -Math.PI / 2;
  pad.position.set(0, 0.02, 12);
  pad.receiveShadow = true;
  world.add(pad);

  // welcome banner floating above the back corner
  const welcome = makeSign(10, 2.4, (g, w, h) => {
    signCard(g, w, h, r.color);
    g.fillStyle = '#2b2d42'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `900 120px ${FONT}`; g.fillText('Welcome to Polyglotter!', w / 2, h * 0.4, w - 80);
    g.font = `700 64px ${FONT}`; g.fillStyle = '#6b6f80'; g.fillText('Sit by the fire, or step through a portal to practice', w / 2, h * 0.75, w - 80);
  });
  welcome.position.set(0, 8.4, -12.5);
  world.add(welcome);
}

function buildLanguageRoom(roomId) {
  const r = ROOMS[roomId];
  bounds = 'square';
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2 + 2, HALF * 2 + 2), new THREE.MeshLambertMaterial({ map: floorTexture(r.floor) }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  world.add(floor);
  const W = HALF * 2 + 2, wallH = 3;
  world.add(box(W, wallH, 1, r.wall, 0, wallH / 2, -HALF - 1), box(W, wallH, 1, r.wall, 0, wallH / 2, HALF + 1),
            box(1, wallH, W, r.wall, -HALF - 1, wallH / 2, 0), box(1, wallH, W, r.wall, HALF + 1, wallH / 2, 0));
  world.add(box(W + 1, 0.3, 1.2, r.color, 0, wallH, -HALF - 1), box(W + 1, 0.3, 1.2, r.color, 0, wallH, HALF + 1),
            box(1.2, 0.3, W, r.color, -HALF - 1, wallH, 0), box(1.2, 0.3, W, r.color, HALF + 1, wallH, 0));

  const sign = makeSign(12, 4, (g, w, h) => {
    signCard(g, w, h, r.color);
    drawFlag(g, r.flag, 70, h / 2 - 110, 330, 220);
    g.fillStyle = '#2b2d42'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.font = `900 150px ${FONT}`; g.fillText(r.greeting, 450, h * 0.3, w - 500);
    g.font = `700 76px ${FONT}`; g.fillStyle = '#6b6f80'; g.fillText(r.sub, 455, h * 0.55, w - 500);
    g.font = `700 52px ${FONT}`; g.fillStyle = r.color; g.fillText('Press Enter to chat. Free your mouse (Esc) to translate.', 455, h * 0.78, w - 500);
  });
  sign.position.set(0, 6, -HALF);
  world.add(sign);

  const back = makePortal('lobby', '← Lobby');
  back.position.set(0, 0, HALF - 1.5);
  back.lookAt(0, 0, 0);
  world.add(back);
  portals.push({ roomId: 'lobby', x: 0, z: HALF - 1.5, group: back });

  for (const [x, z] of [[-7, -6], [7, -6], [-7, 4], [7, 4], [0, -1]]) world.add(makeTable(x, z, r.color));
  for (const [x, z] of [[-16, -16], [16, -16], [-16, 12], [16, 12]]) world.add(makeTree(x, z));
}

function buildRoom(roomId) {
  if (world) {
    scene.remove(world);
    world.traverse((o) => {
      o.geometry?.dispose();
      for (const m of [].concat(o.material || [])) { m.map?.dispose(); m.dispose(); }
    });
  }
  world = new THREE.Group();
  portals = []; colliders = []; seats = []; boards = {}; fire = null;
  if (roomId === 'lobby') buildLobby(); else buildLanguageRoom(roomId);
  scene.add(world);
}

function insideHex(x, z, margin = 0) {
  for (let k = 0; k < 6; k++) {
    const a = (k * 60 + 30) * Math.PI / 180;
    if (x * Math.sin(a) + z * Math.cos(a) > HEX_AP - margin) return false;
  }
  return true;
}

// =====================================================================
//  PLAYER (first person)
// =====================================================================
const me = { x: 0, y: 0, z: 12, vy: 0, yaw: 0, pitch: 0, lang: 'en', name: '', color: COLORS[0] };
const keys = {};
let portalLock = true;
let sitting = null;

// your own mittens, visible in first person
const myHands = [-1, 1].map((side) => {
  const m = makeMitten();
  m.scale.setScalar(0.8);
  if (side > 0) m.scale.x *= -1;
  camera.add(m);
  return m;
});
myHands.forEach((m) => { m.visible = false; m.traverse((o) => { o.castShadow = false; }); });
let handPhase = 0;

function spawnIn(roomId, fromRoom) {
  const p = portals.find((q) => q.roomId === fromRoom);
  if (roomId === 'lobby' && p) {
    const len = Math.hypot(p.x, p.z);
    me.x = p.x - (p.x / len) * 3; me.z = p.z - (p.z / len) * 3;
    me.yaw = Math.atan2(p.x, p.z);
  } else if (roomId === 'lobby') { me.x = 0; me.z = 12; me.yaw = 0; }
  else { me.x = 0; me.z = HALF - 5; me.yaw = 0; }
  me.y = 0; me.vy = 0; me.pitch = 0;
  sitting = null;
  portalLock = true;
}

function nearestSeat() {
  let best = null, bd = 1.9;
  for (const s of seats) {
    const d = Math.hypot(me.x - s.x, me.z - s.z);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}
function sitDown() {
  const s = nearestSeat();
  if (!s) return;
  sitting = s;
  me.x = s.x; me.z = s.z; me.y = 0; me.vy = 0; me.yaw = s.yaw; me.pitch = -0.15;
}
function standUp() {
  if (!sitting) return;
  const s = sitting;
  sitting = null;
  me.x = s.x + Math.sin(s.yaw) * 1.0;
  me.z = s.z + Math.cos(s.yaw) * 1.0;
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
    const speed = SPEED * (keys.ShiftLeft ? 1.6 : 1);
    me.x += dx * speed * dt;
    me.z += dz * speed * dt;
    me.vy -= 22 * dt;
    me.y += me.vy * dt;
    if (me.y <= 0) { me.y = 0; me.vy = 0; }
    for (const c of colliders) {
      const ox = me.x - c.x, oz = me.z - c.z, d = Math.hypot(ox, oz), min = c.r + 0.35;
      if (d < min && d > 0.0001) { me.x = c.x + (ox / d) * min; me.z = c.z + (oz / d) * min; }
    }
    if (bounds === 'hex') {
      for (let k = 0; k < 6; k++) {
        const a = (k * 60 + 30) * Math.PI / 180, nx = Math.sin(a), nz = Math.cos(a);
        const over = me.x * nx + me.z * nz - (HEX_AP - 0.45);
        if (over > 0) { me.x -= over * nx; me.z -= over * nz; }
      }
    } else {
      me.x = THREE.MathUtils.clamp(me.x, -HALF + 0.4, HALF - 0.4);
      me.z = THREE.MathUtils.clamp(me.z, -HALF + 0.4, HALF - 0.4);
    }
  }

  camera.position.set(me.x, me.y + (sitting ? EYE_SIT : EYE), me.z);
  camera.rotation.set(me.pitch, me.yaw, 0);

  // first person mittens bob while walking
  handPhase += dt * (moving ? 9 : 1.5);
  const bob = moving ? 0.03 : 0.008;
  myHands[0].position.set(-0.36, -0.36 + Math.sin(handPhase) * bob, -0.6 + Math.cos(handPhase) * bob);
  myHands[1].position.set(0.36, -0.36 - Math.sin(handPhase) * bob, -0.6 - Math.cos(handPhase) * bob);

  // portals
  let nearAny = false;
  for (const p of portals) {
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

function addOther(p) {
  if (others.has(p.id)) return;
  const avatar = makeAvatar(p.name, p.color);
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
  o.bubble.position.y = 2.6 + o.bubble.scale.y / 2;
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
    const sit = t.s ? 1 : 0;
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
//  NETWORK
// =====================================================================
let ws = null;
let myId = null;
function net(msg) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg)); }
function refreshPortalSigns() { if (currentRoom === 'lobby') portals.forEach((p) => drawPortalSign(p.group.userData.sign, p.roomId)); }

function connect() {
  ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`);
  ws.onopen = () => net({ type: 'join', name: me.name, color: me.color });
  ws.onclose = () => systemMsg('Disconnected from the server. Refresh the page to rejoin.');
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    switch (m.type) {
      case 'roomState':
        myId = m.you;
        if (m.counts) roomCounts = m.counts;
        clearOthers();
        m.players.forEach(addOther);
        for (const [name, segs] of Object.entries(m.boards || {})) { clearBoardCanvas(name); segs.forEach((s) => drawSegment(name, s)); }
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
      case 'clear': clearBoardCanvas(m.board); break;
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

function goToRoom(roomId) {
  const from = currentRoom;
  currentRoom = roomId;
  buildRoom(roomId);
  spawnIn(roomId, from);
  clearOthers();
  net({ type: 'switch', room: roomId, x: me.x, z: me.z, ry: me.yaw });
  const r = ROOMS[roomId];
  $('roomName').textContent = roomId === 'lobby' ? 'Lobby' : `${r.label} Room · ${r.native}`;
  $('roomName').style.color = r.color;
  $('chatLog').innerHTML = '';
  systemMsg(roomId === 'lobby' ? 'You are back in the Lobby.'
    : `${r.greeting} You joined the ${r.label} room. Try to chat in ${r.label}!`);
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
  who.className = 'who'; who.style.color = color === '#f5f5f5' ? '#9aa0b4' : color; who.textContent = name + ':';
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
ray.far = 9;
let drawing = false, lastUV = null, lastBoard = null;

function lockMouse() {
  try { const p = canvas.requestPointerLock(); p?.catch?.(() => {}); } catch {}
}
function isLocked() { return document.pointerLockElement === canvas; }
function aimedBoard() {
  const meshes = Object.values(boards).map((b) => b.mesh);
  if (!meshes.length) return null;
  ray.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hit = ray.intersectObjects(meshes, false)[0];
  return hit ? { name: hit.object.userData.board, uv: hit.uv } : null;
}

document.addEventListener('pointerlockchange', () => {
  if (!isLocked() && sitting && !chatOpen) standUp();   // Esc gets you off the log
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
    if (a) { clearBoardCanvas(a.name); net({ type: 'clear', board: a.name }); }
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
    const seg = [lastUV.x, 1 - lastUV.y, a.uv.x, 1 - a.uv.y, me.color];
    drawSegment(a.name, seg);
    net({ type: 'draw', board: a.name, seg: seg.slice(0, 4), c: me.color });
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
//  START SCREEN
// =====================================================================
const sw = $('swatches');
COLORS.forEach((c) => {
  const b = document.createElement('div');
  b.className = 'swatch' + (c === me.color ? ' sel' : '');
  b.style.background = c;
  b.title = 'Scarf color';
  b.onclick = () => { me.color = c; [...sw.children].forEach((x) => x.classList.toggle('sel', x === b)); makeShowcase(); };
  sw.appendChild(b);
});
const browserLang = (navigator.language || 'en').slice(0, 2);
if ([...$('langSelect').options].some((o) => o.value === browserLang)) $('langSelect').value = browserLang;
$('nameInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('playBtn').click(); });

// a traveler standing by the fire on the title screen (updates when you pick a scarf color)
let showcase = null;
function makeShowcase() {
  if (showcase) scene.remove(showcase);
  showcase = makeAvatar('', me.color);
  showcase.children.find((c) => c.isSprite).visible = false;
  showcase.position.set(1.6, 0, 6.5);
  scene.add(showcase);
}
makeShowcase();

$('playBtn').onclick = () => {
  me.name = $('nameInput').value.trim() || 'Traveler' + Math.floor(Math.random() * 900 + 100);
  me.lang = $('langSelect').value;
  scene.remove(showcase);
  $('start').remove();
  $('hud').hidden = false;
  $('chat').hidden = false;
  myHands.forEach((m) => { m.visible = true; });
  started = true;
  spawnIn('lobby');
  systemMsg(`Hi ${me.name}! Sit by the fire (E), draw on the whiteboards, or walk through a portal to practice a language.`);
  connect();
  lockMouse();
  $('pause').hidden = isLocked();
};

// =====================================================================
//  GAME LOOP
// =====================================================================
buildRoom('lobby');
$('roomName').style.color = ROOMS.lobby.color;

const clock = new THREE.Clock();
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const now = performance.now();
  if (started) { updatePlayer(dt); updateDrawing(); updatePrompt(); sendMove(now); }
  else {
    camera.position.set(-0.6, 1.5, 9.5);
    camera.lookAt(0.6, 1.3, 5);
    showcase.rotation.y = -0.4 + Math.sin(now / 1500) * 0.3;
  }
  updateOthers(dt, now);
  animateFire(now, dt);
  for (const p of portals) {
    const inner = p.group.userData.inner;
    inner.material.opacity = 0.6 + Math.sin(now / 400 + p.x) * 0.15;
    inner.material.map.center.set(0.5, 0.5);
    inner.material.map.rotation = now / 1500;
  }
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
loop();

// handy for testing
window.__game = { me, others, goToRoom, sitDown, standUp, get room() { return currentRoom; } };
