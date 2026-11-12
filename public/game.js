import * as THREE from '/three.module.js';

// =====================================================================
//  ROOM SETTINGS  (add a new language by adding an entry here)
// =====================================================================
const ROOMS = {
  lobby:   { label: 'Lobby',   code: 'Autodetect', color: '#ffb347', floor: '#a8e6a3', wall: '#fff4d6',
             greeting: 'Welcome to Lingo Lobby!', sub: 'Walk into a portal to pick a language' },
  french:  { label: 'French',  native: 'Français', code: 'fr', color: '#4a7bd8', floor: '#cfdcff', wall: '#eef3ff',
             greeting: 'Bienvenue !', sub: 'Ici, on parle français', flag: { dir: 'v', colors: ['#0055A4', '#FFFFFF', '#EF4135'] } },
  english: { label: 'English', native: 'English',  code: 'en', color: '#d84a5a', floor: '#ffd3d8', wall: '#fff0f2',
             greeting: 'Welcome!', sub: 'We speak English here', flag: { uk: true } },
  italian: { label: 'Italian', native: 'Italiano', code: 'it', color: '#2fa35a', floor: '#cdf0d8', wall: '#effbf2',
             greeting: 'Benvenuti!', sub: 'Qui si parla italiano', flag: { dir: 'v', colors: ['#009246', '#FFFFFF', '#CE2B37'] } },
  german:  { label: 'German',  native: 'Deutsch',  code: 'de', color: '#e0a800', floor: '#fff0b8', wall: '#fffaea',
             greeting: 'Willkommen!', sub: 'Hier sprechen wir Deutsch', flag: { dir: 'h', colors: ['#000000', '#DD0000', '#FFCE00'] } },
  spanish: { label: 'Spanish', native: 'Español',  code: 'es', color: '#e2571e', floor: '#ffdcc8', wall: '#fff2ea',
             greeting: '¡Bienvenidos!', sub: 'Aquí hablamos español', flag: { dir: 'h', colors: ['#AA151B', '#F1BF00', '#F1BF00', '#AA151B'] } },
};
const PORTAL_ORDER = ['french', 'english', 'italian', 'german', 'spanish'];
const HALF = 19;            // half the width of a room
const EYE = 1.6;            // eye height
const SPEED = 5.5;          // walking speed
const COLORS = ['#ff6b6b', '#ff9f43', '#feca57', '#1dd1a1', '#48dbfb', '#4a7bd8', '#a55eea', '#ff7eb6', '#8d6e63', '#576574'];

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
scene.fog = new THREE.Fog('#bfe6ff', 35, 80);
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
//  LITTLE HELPERS FOR BUILDING BLOCKY THINGS
// =====================================================================
function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
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
  if (flag.uk) {
    g.fillStyle = '#012169'; g.fillRect(x, y, w, h);
    g.strokeStyle = '#fff'; g.lineWidth = h * 0.2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y + h); g.moveTo(x + w, y); g.lineTo(x, y + h); g.stroke();
    g.strokeStyle = '#C8102E'; g.lineWidth = h * 0.07;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y + h); g.moveTo(x + w, y); g.lineTo(x, y + h); g.stroke();
    g.fillStyle = '#fff';
    g.fillRect(x + w / 2 - h * 0.17, y, h * 0.34, h); g.fillRect(x, y + h / 2 - h * 0.17, w, h * 0.34);
    g.fillStyle = '#C8102E';
    g.fillRect(x + w / 2 - h * 0.1, y, h * 0.2, h); g.fillRect(x, y + h / 2 - h * 0.1, w, h * 0.2);
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

// A flat sign (plane with text drawn on it)
function makeSign(width, height, draw) {
  const ppu = 128; // pixels per world unit
  const ct = canvasTexture(width * ppu, height * ppu, draw);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: ct.tex, transparent: true }));
  mesh.userData.ct = ct;
  return mesh;
}

// Name tags and speech bubbles always face the camera (sprites)
function makeNameTag(name, color) {
  const ct = canvasTexture(512, 128, (g, w, h) => {
    g.font = `900 64px ${FONT}`;
    const tw = Math.min(g.measureText(name).width + 60, w - 8);
    g.fillStyle = 'rgba(255,255,255,0.92)';
    roundRect(g, (w - tw) / 2, 20, tw, 88, 44); g.fill();
    g.fillStyle = color; g.fillRect((w - tw) / 2 + 26, 54, 14, 14);
    g.fillStyle = '#2b2d42'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(name, w / 2 + 10, 66, w - 80);
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
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (measure.measureText(test).width > W - pad * 2 && line) { lines.push(line); line = word; } else line = test;
    if (lines.length >= 4) break;
  }
  if (line && lines.length < 4) lines.push(line);
  const textW = Math.max(...lines.map((l) => measure.measureText(l).width));
  const bw = Math.min(W, textW + pad * 2);
  const H = lines.length * lineH + pad * 2 + 24;
  const ct = canvasTexture(W, H, (g, w, h) => {
    const x = (w - bw) / 2;
    g.fillStyle = '#ffffff';
    roundRect(g, x, 0, bw, h - 24, 32); g.fill();
    g.beginPath(); g.moveTo(w / 2 - 18, h - 25); g.lineTo(w / 2 + 18, h - 25); g.lineTo(w / 2, h); g.fill();
    g.fillStyle = '#2b2d42'; g.font = `700 42px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'top';
    lines.forEach((l, i) => g.fillText(l, w / 2, pad + i * lineH));
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ct.tex, depthTest: false }));
  const sw = 2.6;
  s.scale.set(sw, sw * (H / W), 1);
  s.renderOrder = 11;
  return s;
}

// =====================================================================
//  BLOCKY CHARACTER
// =====================================================================
function makeAvatar(name, color) {
  const g = new THREE.Group();
  const skin = '#ffd9b8';
  const pants = '#3d4466';
  const legL = new THREE.Group(), legR = new THREE.Group();
  legL.add(box(0.26, 0.7, 0.28, pants, 0, -0.35, 0)); legL.position.set(-0.17, 0.7, 0);
  legR.add(box(0.26, 0.7, 0.28, pants, 0, -0.35, 0)); legR.position.set(0.17, 0.7, 0);
  const body = box(0.72, 0.72, 0.4, color, 0, 1.06, 0);
  const armL = new THREE.Group(), armR = new THREE.Group();
  armL.add(box(0.2, 0.62, 0.22, color, 0, -0.28, 0), box(0.2, 0.14, 0.22, skin, 0, -0.62, 0)); armL.position.set(-0.48, 1.38, 0);
  armR.add(box(0.2, 0.62, 0.22, color, 0, -0.28, 0), box(0.2, 0.14, 0.22, skin, 0, -0.62, 0)); armR.position.set(0.48, 1.38, 0);
  const head = new THREE.Group();
  head.add(box(0.56, 0.56, 0.52, skin, 0, 0, 0));
  head.add(box(0.08, 0.13, 0.02, '#2b2d42', -0.12, 0.04, 0.265), box(0.08, 0.13, 0.02, '#2b2d42', 0.12, 0.04, 0.265)); // eyes
  head.add(box(0.18, 0.04, 0.02, '#c0504d', 0, -0.13, 0.265)); // smile
  head.add(box(0.6, 0.14, 0.56, color, 0, 0.28, 0)); // little hat brim of their color
  head.position.set(0, 1.72, 0);
  g.add(legL, legR, body, armL, armR, head);
  const tag = makeNameTag(name, color);
  tag.position.y = 2.3;
  g.add(tag);
  g.userData = { legL, legR, armL, armR, head, phase: 0 };
  return g;
}

// =====================================================================
//  BUILDING ROOMS
// =====================================================================
let world = null;        // the group holding the current room
let portals = [];        // { roomId, x, z, group, inner }
let colliders = [];      // { x, z, r }
let currentRoom = 'lobby';
let roomCounts = {};

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
  g.fillStyle = '#ffffff';
  roundRect(g, 6, 6, w - 12, h - 12, 40); g.fill();
  g.strokeStyle = r.color; g.lineWidth = 12; roundRect(g, 6, 6, w - 12, h - 12, 40); g.stroke();
  drawFlag(g, r.flag, 34, 46, 120, 80);
  g.fillStyle = '#2b2d42'; g.textBaseline = 'middle'; g.textAlign = 'left';
  g.font = `900 64px ${FONT}`; g.fillText(r.label, 176, 70, w - 200);
  g.font = `700 40px ${FONT}`; g.fillStyle = '#6b6f80'; g.fillText(r.native, 178, 122, w - 200);
  const n = roomCounts[roomId] || 0;
  g.textAlign = 'center'; g.font = `800 36px ${FONT}`; g.fillStyle = n ? r.color : '#9aa0b4';
  g.fillText(n === 1 ? '1 person here' : `${n} people here`, w / 2, 182);
  tex.needsUpdate = true;
}

function makePortal(roomId, label) {
  const r = ROOMS[roomId];
  const grp = new THREE.Group();
  grp.add(box(0.4, 4.2, 0.5, r.color, -1.55, 2.1, 0), box(0.4, 4.2, 0.5, r.color, 1.55, 2.1, 0), box(3.5, 0.45, 0.5, r.color, 0, 4.2, 0));
  grp.add(box(3.9, 0.2, 1.4, '#ffffff', 0, 0.1, 0)); // little platform
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
      g.fillStyle = '#fff'; roundRect(g, 6, 6, w - 12, h - 12, 40); g.fill();
      g.strokeStyle = r.color; g.lineWidth = 12; roundRect(g, 6, 6, w - 12, h - 12, 40); g.stroke();
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
  t.add(box(0.5, 1.6, 0.5, '#8d6e63', 0, 0.8, 0), box(1.8, 1.6, 1.8, '#5cc46b', 0, 2.3, 0), box(1.1, 0.8, 1.1, '#74d683', 0, 3.4, 0));
  t.position.set(x, 0, z);
  colliders.push({ x, z, r: 0.7 });
  return t;
}
function makeTable(x, z, color) {
  const t = new THREE.Group();
  t.add(box(1.6, 0.14, 1.6, '#ffffff', 0, 0.85, 0), box(0.2, 0.85, 0.2, '#9aa0b4', 0, 0.42, 0), box(0.9, 0.08, 0.9, '#9aa0b4', 0, 0.04, 0));
  for (const [dx, dz] of [[1.25, 0], [-1.25, 0], [0, 1.25], [0, -1.25]]) {
    const chair = new THREE.Group();
    chair.add(box(0.6, 0.12, 0.6, color, 0, 0.5, 0), box(0.1, 0.5, 0.1, '#9aa0b4', 0, 0.25, 0));
    chair.position.set(dx, 0, dz);
    t.add(chair);
  }
  t.position.set(x, 0, z);
  colliders.push({ x, z, r: 1.0 });
  return t;
}

function buildRoom(roomId) {
  if (world) {
    scene.remove(world);
    world.traverse((o) => { o.geometry?.dispose(); o.material?.map?.dispose(); o.material?.dispose(); });
  }
  world = new THREE.Group();
  portals = [];
  colliders = [];
  const r = ROOMS[roomId];

  // floor + walls
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2 + 2, HALF * 2 + 2),
    new THREE.MeshLambertMaterial({ map: floorTexture(r.floor) }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  world.add(floor);
  const W = HALF * 2 + 2, wallH = 3;
  world.add(box(W, wallH, 1, r.wall, 0, wallH / 2, -HALF - 1), box(W, wallH, 1, r.wall, 0, wallH / 2, HALF + 1),
            box(1, wallH, W, r.wall, -HALF - 1, wallH / 2, 0), box(1, wallH, W, r.wall, HALF + 1, wallH / 2, 0));
  // colored trim on top of walls
  world.add(box(W + 1, 0.3, 1.2, r.color, 0, wallH, -HALF - 1), box(W + 1, 0.3, 1.2, r.color, 0, wallH, HALF + 1),
            box(1.2, 0.3, W, r.color, -HALF - 1, wallH, 0), box(1.2, 0.3, W, r.color, HALF + 1, wallH, 0));

  if (roomId === 'lobby') {
    // big welcome sign
    const welcome = makeSign(14, 3.2, (g, w, h) => {
      g.fillStyle = '#fff'; roundRect(g, 8, 8, w - 16, h - 16, 60); g.fill();
      g.strokeStyle = r.color; g.lineWidth = 16; roundRect(g, 8, 8, w - 16, h - 16, 60); g.stroke();
      g.fillStyle = '#2b2d42'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `900 150px ${FONT}`; g.fillText(r.greeting, w / 2, h * 0.4, w - 80);
      g.font = `700 80px ${FONT}`; g.fillStyle = '#6b6f80'; g.fillText(r.sub, w / 2, h * 0.75, w - 80);
    });
    welcome.position.set(0, 8.5, -HALF);
    world.add(welcome);

    // portals in a half circle
    PORTAL_ORDER.forEach((id, i) => {
      const a = THREE.MathUtils.degToRad(-64 + (128 / (PORTAL_ORDER.length - 1)) * i);
      const x = Math.sin(a) * 14, z = -Math.cos(a) * 14;
      const p = makePortal(id);
      p.position.set(x, 0, z);
      p.lookAt(0, 0, 0);
      world.add(p);
      portals.push({ roomId: id, x, z, group: p });
    });

    // centre fountain-ish block
    world.add(box(3, 0.6, 3, '#ffffff', 0, 0.3, 4), box(2.4, 0.2, 2.4, '#7fd3ff', 0, 0.62, 4), box(0.6, 1.6, 0.6, '#ffffff', 0, 1.2, 4));
    colliders.push({ x: 0, z: 4, r: 1.9 });
    for (const [x, z] of [[-15, 15], [15, 15], [-15, 8], [15, 8]]) world.add(makeTree(x, z));
  } else {
    // welcome sign on the far wall with the flag
    const sign = makeSign(12, 4, (g, w, h) => {
      g.fillStyle = '#fff'; roundRect(g, 8, 8, w - 16, h - 16, 60); g.fill();
      g.strokeStyle = r.color; g.lineWidth = 16; roundRect(g, 8, 8, w - 16, h - 16, 60); g.stroke();
      drawFlag(g, r.flag, 70, h / 2 - 110, 330, 220);
      g.fillStyle = '#2b2d42'; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.font = `900 150px ${FONT}`; g.fillText(r.greeting, 450, h * 0.3, w - 500);
      g.font = `700 76px ${FONT}`; g.fillStyle = '#6b6f80'; g.fillText(r.sub, 455, h * 0.55, w - 500);
      g.font = `700 52px ${FONT}`; g.fillStyle = r.color; g.fillText('Press Enter to chat. Free your mouse (Esc) to translate.', 455, h * 0.78, w - 500);
    });
    sign.position.set(0, 6, -HALF);
    world.add(sign);

    // portal back to the lobby
    const back = makePortal('lobby', '← Lobby');
    back.position.set(0, 0, HALF - 1.5);
    back.lookAt(0, 0, 0);
    world.add(back);
    portals.push({ roomId: 'lobby', x: 0, z: HALF - 1.5, group: back });

    // café tables and trees
    for (const [x, z] of [[-7, -6], [7, -6], [-7, 4], [7, 4], [0, -1]]) world.add(makeTable(x, z, r.color));
    for (const [x, z] of [[-16, -16], [16, -16], [-16, 12], [16, 12]]) world.add(makeTree(x, z));
  }

  scene.add(world);
}

// =====================================================================
//  PLAYER (first person)
// =====================================================================
const me = { x: 0, y: 0, z: 8, vy: 0, yaw: 0, pitch: 0, lang: 'en', name: '', color: COLORS[4] };
const keys = {};
let portalLock = true;   // stops you bouncing straight back through a portal

function spawnIn(roomId, fromRoom) {
  if (roomId === 'lobby') {
    const p = portals.find((q) => q.roomId === fromRoom);
    if (p) {
      // stand just in front of the portal you came out of, facing the centre
      const len = Math.hypot(p.x, p.z);
      me.x = p.x - (p.x / len) * 3; me.z = p.z - (p.z / len) * 3;
      me.yaw = Math.atan2(p.x, p.z);
    } else { me.x = 0; me.z = 10; me.yaw = 0; }
  } else { me.x = 0; me.z = HALF - 5; me.yaw = 0; }
  me.y = 0; me.vy = 0; me.pitch = 0;
  portalLock = true;
}

function updatePlayer(dt) {
  const fwd = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
  const side = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  let dx = -Math.sin(me.yaw) * fwd + Math.cos(me.yaw) * side;
  let dz = -Math.cos(me.yaw) * fwd - Math.sin(me.yaw) * side;
  const len = Math.hypot(dx, dz);
  if (len > 0) { dx /= len; dz /= len; }
  const speed = SPEED * (keys.ShiftLeft ? 1.6 : 1);
  me.x += dx * speed * dt;
  me.z += dz * speed * dt;

  // gravity + jump
  me.vy -= 22 * dt;
  me.y += me.vy * dt;
  if (me.y <= 0) { me.y = 0; me.vy = 0; }

  // bump into things
  for (const c of colliders) {
    const ox = me.x - c.x, oz = me.z - c.z, d = Math.hypot(ox, oz), min = c.r + 0.35;
    if (d < min && d > 0.0001) { me.x = c.x + (ox / d) * min; me.z = c.z + (oz / d) * min; }
  }
  me.x = THREE.MathUtils.clamp(me.x, -HALF + 0.4, HALF - 0.4);
  me.z = THREE.MathUtils.clamp(me.z, -HALF + 0.4, HALF - 0.4);

  camera.position.set(me.x, me.y + EYE, me.z);
  camera.rotation.set(me.pitch, me.yaw, 0);

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
const others = new Map(); // id -> { avatar, target, bubble, bubbleUntil }

function addOther(p) {
  if (others.has(p.id)) return;
  const avatar = makeAvatar(p.name, p.color);
  avatar.position.set(p.x, p.y, p.z);
  avatar.rotation.y = p.ry + Math.PI;
  scene.add(avatar);
  others.set(p.id, { avatar, name: p.name, target: { x: p.x, y: p.y, z: p.z, ry: p.ry }, bubble: null, bubbleUntil: 0 });
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
  o.bubble.position.y = 2.55 + o.bubble.scale.y / 2;
  o.avatar.add(o.bubble);
  o.bubbleUntil = performance.now() + 7000;
}

function updateOthers(dt, now) {
  for (const o of others.values()) {
    const a = o.avatar, t = o.target, u = a.userData;
    const k = 1 - Math.pow(0.0001, dt);
    const before = a.position.clone();
    a.position.x += (t.x - a.position.x) * k;
    a.position.y += (t.y - a.position.y) * k;
    a.position.z += (t.z - a.position.z) * k;
    let diff = (t.ry + Math.PI) - a.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    a.rotation.y += diff * k;
    const moved = Math.hypot(a.position.x - before.x, a.position.z - before.z) / Math.max(dt, 0.001);
    const swing = Math.min(moved / SPEED, 1);
    u.phase += dt * 10 * swing;
    const s = Math.sin(u.phase) * 0.7 * swing;
    u.legL.rotation.x = s; u.legR.rotation.x = -s;
    u.armL.rotation.x = -s; u.armR.rotation.x = s;
    u.head.position.y = 1.72 + Math.abs(Math.sin(now / 600)) * 0.02;
    if (o.bubble && now > o.bubbleUntil) { a.remove(o.bubble); o.bubble = null; }
  }
}

// =====================================================================
//  NETWORK
// =====================================================================
let ws = null;
let myId = null;
function net(msg) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg)); }

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
        if (currentRoom === 'lobby') portals.forEach((p) => drawPortalSign(p.group.userData.sign, p.roomId));
        break;
      case 'playerJoined': addOther(m.player); break;
      case 'playerLeft': removeOther(m.id); break;
      case 'move': {
        const o = others.get(m.id);
        if (o) Object.assign(o.target, { x: m.x, y: m.y, z: m.z, ry: m.ry });
        break;
      }
      case 'chat':
        chatMsg(m.name, m.color, m.text);
        if (m.id !== myId) showBubble(m.id, m.text);
        break;
      case 'counts':
        roomCounts = m.counts;
        if (currentRoom === 'lobby') portals.forEach((p) => drawPortalSign(p.group.userData.sign, p.roomId));
        break;
    }
  };
}

let lastSent = 0, lastKey = '';
function sendMove(now) {
  if (now - lastSent < 100) return;
  const key = [me.x.toFixed(2), me.y.toFixed(2), me.z.toFixed(2), me.yaw.toFixed(2)].join();
  if (key === lastKey) return;
  lastSent = now; lastKey = key;
  net({ type: 'move', x: me.x, y: me.y, z: me.z, ry: me.yaw });
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
  systemMsg(roomId === 'lobby' ? 'You are in the Lobby. Walk into a portal to join a language room.'
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
    const res = await fetch(url);
    const data = await res.json();
    const t = data?.responseData?.translatedText;
    if (!t || data.responseStatus !== 200) throw new Error(data?.responseDetails || 'no result');
    return t;
  } catch (err) {
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
  chatOpen = false;
  chatInput.value = '';
  chatInput.blur();
  $('chat').classList.remove('open');
  lockMouse();
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
function lockMouse() {
  try { const p = canvas.requestPointerLock(); p?.catch?.(() => {}); } catch {}
}
function isLocked() { return document.pointerLockElement === canvas; }
document.addEventListener('pointerlockchange', () => {
  $('pause').hidden = !started || isLocked() || chatOpen;
});
canvas.addEventListener('click', () => { if (started && !chatOpen) lockMouse(); });
$('pause').addEventListener('click', () => lockMouse());

document.addEventListener('mousemove', (e) => {
  if (!isLocked()) return;
  me.yaw -= e.movementX * 0.0022;
  me.pitch -= e.movementY * 0.0022;
  me.pitch = THREE.MathUtils.clamp(me.pitch, -1.4, 1.4);
});
document.addEventListener('keydown', (e) => {
  if (!started || chatOpen) return;
  if (e.key === 'Enter' || e.code === 'KeyT') { e.preventDefault(); openChat(); return; }
  keys[e.code] = true;
  if (e.code === 'Space' && me.y === 0) me.vy = 8;
});
document.addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

// =====================================================================
//  START SCREEN
// =====================================================================
const sw = $('swatches');
COLORS.forEach((c) => {
  const b = document.createElement('div');
  b.className = 'swatch' + (c === me.color ? ' sel' : '');
  b.style.background = c;
  b.onclick = () => { me.color = c; [...sw.children].forEach((x) => x.classList.toggle('sel', x === b)); };
  sw.appendChild(b);
});
const browserLang = (navigator.language || 'en').slice(0, 2);
if ([...$('langSelect').options].some((o) => o.value === browserLang)) $('langSelect').value = browserLang;
$('nameInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('playBtn').click(); });

$('playBtn').onclick = () => {
  me.name = $('nameInput').value.trim() || 'Guest' + Math.floor(Math.random() * 900 + 100);
  me.lang = $('langSelect').value;
  $('start').remove();
  $('hud').hidden = false;
  $('chat').hidden = false;
  started = true;
  spawnIn('lobby');
  me.z = 10;
  systemMsg(`Hi ${me.name}! Walk into a portal to join a language room.`);
  connect();
  lockMouse();
  $('pause').hidden = isLocked();
};

// =====================================================================
//  GAME LOOP
// =====================================================================
buildRoom('lobby');
spawnIn('lobby');
me.z = 10;
camera.position.set(me.x, EYE, me.z);
$('roomName').style.color = ROOMS.lobby.color;

const clock = new THREE.Clock();
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const now = performance.now();
  if (started) { updatePlayer(dt); sendMove(now); }
  else { // slow spin on the title screen
    me.yaw += dt * 0.1;
    camera.position.set(0, EYE + 1, 6);
    camera.rotation.set(-0.05, me.yaw, 0);
  }
  updateOthers(dt, now);
  for (const p of portals) {
    const inner = p.group.userData.inner;
    inner.material.opacity = 0.6 + Math.sin(now / 400 + p.x) * 0.15;
    inner.material.map.rotation = now / 1500;
    inner.material.map.center.set(0.5, 0.5);
  }
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
loop();

// handy for testing in the browser console
window.__game = { me, others, goToRoom, get room() { return currentRoom; } };
