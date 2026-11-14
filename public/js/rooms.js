// Language rooms, portals and the shared "level" structure
import * as THREE from 'three';
import { rbox, box, glow, canvasTexture, roundRect, makeSign, drawFlag, mat, freezeStatic, DISPLAY, FONT } from './helpers.js';

export const ROOMS = {
  lobby:      { label: 'Lobby', native: 'Lobby', code: 'Autodetect', color: '#f3a23d' },
  english:    { label: 'English', native: 'English', code: 'en', color: '#e2525e', floor: '#ffd3d8', wall: '#fff0f2',
                greeting: 'Welcome!', sub: 'We speak English here', flag: { us: true } },
  french:     { label: 'French', native: 'Français', code: 'fr', color: '#5b7fe0', floor: '#cfdcff', wall: '#eef3ff',
                greeting: 'Bienvenue !', sub: 'Ici, on parle français', flag: { dir: 'v', colors: ['#0055A4', '#FFFFFF', '#EF4135'] } },
  spanish:    { label: 'Spanish', native: 'Español', code: 'es', color: '#f08a2c', floor: '#ffdcc8', wall: '#fff2ea',
                greeting: '¡Bienvenidos!', sub: 'Aquí hablamos español', flag: { dir: 'h', colors: ['#AA151B', '#F1BF00', '#F1BF00', '#AA151B'] } },
  italian:    { label: 'Italian', native: 'Italiano', code: 'it', color: '#2ec4c4', floor: '#cdf0e8', wall: '#effbf8',
                greeting: 'Benvenuti!', sub: 'Qui si parla italiano', flag: { dir: 'v', colors: ['#009246', '#FFFFFF', '#CE2B37'] } },
  german:     { label: 'German', native: 'Deutsch', code: 'de', color: '#f2c230', floor: '#fff0b8', wall: '#fffaea',
                greeting: 'Willkommen!', sub: 'Hier sprechen wir Deutsch', flag: { dir: 'h', colors: ['#000000', '#DD0000', '#FFCE00'] } },
  portuguese: { label: 'Portuguese', native: 'Português', code: 'pt', color: '#ec6fb0', floor: '#ffd9ea', wall: '#fff0f6',
                greeting: 'Bem-vindos!', sub: 'Aqui falamos português', flag: { dir: 'v', colors: ['#006600', '#006600', '#FF0000', '#FF0000', '#FF0000'] } },
};
export const PORTAL_ORDER = ['english', 'french', 'spanish', 'italian', 'german', 'portuguese'];

// Everything a map needs to tell the game about itself
export function newLevel() {
  return {
    group: new THREE.Group(),
    portals: [],      // { roomId, x, z, group }
    colliders: [],    // circles { x, z, r }
    seats: [],        // { x, z, yaw, height }
    boards: {},       // name -> { mesh, ct, base }
    updaters: [],     // functions called every frame (now, dt)
    bounds: { type: 'square', half: 19 },
    spawn: { x: 0, z: 14, yaw: 0 },
    env: { background: '#bfe6ff', fog: ['#bfe6ff', 40, 90], hemi: ['#ffffff', '#b9c4d6', 1.4], sun: ['#fff6e5', 1.8, [12, 25, 10]] },
  };
}

// ---------------------------------------------------------------- painted portal scenes
function sky(g, w, h, stops) {
  const grad = g.createLinearGradient(0, 0, 0, h);
  stops.forEach((c, i) => grad.addColorStop(i / (stops.length - 1), c));
  g.fillStyle = grad; g.fillRect(0, 0, w, h);
}
function stars(g, w, h, n = 40) {
  g.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < n; i++) { const x = (i * 97) % w, y = ((i * 61) % (h * 0.5)); g.fillRect(x, y, 2, 2); }
}
const SCENES = {
  french(g, w, h) {
    sky(g, w, h, ['#2b1f6b', '#6a49b8', '#c48ad8', '#f6b3c9']); stars(g, w, h);
    g.fillStyle = '#2a1d4f';
    g.beginPath();
    g.moveTo(w * 0.28, h * 0.92); g.quadraticCurveTo(w * 0.45, h * 0.6, w * 0.48, h * 0.18);
    g.lineTo(w * 0.52, h * 0.18); g.quadraticCurveTo(w * 0.55, h * 0.6, w * 0.72, h * 0.92);
    g.lineTo(w * 0.6, h * 0.92); g.quadraticCurveTo(w * 0.5, h * 0.78, w * 0.4, h * 0.92); g.closePath(); g.fill();
    g.fillRect(w * 0.36, h * 0.66, w * 0.28, h * 0.02); g.fillRect(w * 0.42, h * 0.45, w * 0.16, h * 0.015);
    g.fillRect(w * 0.495, h * 0.12, w * 0.01, h * 0.07);
    g.fillStyle = '#ffd77a';
    for (let i = 0; i < 26; i++) { const t = i / 26; g.fillRect(w * (0.3 + t * 0.4), h * (0.9 - Math.abs(t - 0.5) * 1.4), 3, 3); }
    g.fillStyle = '#3a2a66';
    for (let i = 0; i < 8; i++) g.fillRect(i * w / 8, h * (0.86 + (i % 3) * 0.02), w / 8 - 4, h);
  },
  english(g, w, h) {
    sky(g, w, h, ['#16306e', '#3d6bc0', '#8fb5e8', '#ffd59e']); stars(g, w, h, 20);
    g.fillStyle = '#1d2d5a';
    for (const [x, bw, bh] of [[0, 0.16, 0.25], [0.14, 0.12, 0.35], [0.62, 0.14, 0.3], [0.75, 0.12, 0.42], [0.86, 0.14, 0.28]]) g.fillRect(w * x, h * (1 - bh), w * bw, h * bh);
    g.fillRect(w * 0.36, h * 0.3, w * 0.2, h * 0.7);
    g.beginPath(); g.moveTo(w * 0.34, h * 0.3); g.lineTo(w * 0.46, h * 0.12); g.lineTo(w * 0.58, h * 0.3); g.fill();
    g.fillStyle = '#ffe9a8'; g.beginPath(); g.arc(w * 0.46, h * 0.38, w * 0.07, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#1d2d5a'; g.lineWidth = 3; g.beginPath(); g.moveTo(w * 0.46, h * 0.38); g.lineTo(w * 0.46, h * 0.34); g.moveTo(w * 0.46, h * 0.38); g.lineTo(w * 0.49, h * 0.38); g.stroke();
    g.fillStyle = '#ffd77a';
    for (let i = 0; i < 30; i++) g.fillRect(w * ((i * 37) % 100) / 100, h * (0.75 + ((i * 13) % 20) / 100), 4, 5);
  },
  spanish(g, w, h) {
    sky(g, w, h, ['#e85d3a', '#f39a4a', '#f9c74f', '#ffe8a8']);
    g.fillStyle = '#fff1b8'; g.beginPath(); g.arc(w * 0.62, h * 0.42, w * 0.18, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2f7fb5'; g.fillRect(0, h * 0.62, w, h * 0.1);
    g.fillStyle = '#d98a4e'; g.beginPath(); g.moveTo(0, h * 0.7); g.quadraticCurveTo(w * 0.5, h * 0.55, w, h * 0.72); g.lineTo(w, h); g.lineTo(0, h); g.fill();
    for (const [x, y, bw] of [[0.1, 0.68, 0.16], [0.3, 0.64, 0.18], [0.52, 0.65, 0.15], [0.7, 0.68, 0.18], [0.2, 0.8, 0.2], [0.5, 0.79, 0.22]]) {
      g.fillStyle = '#fffaf0'; g.fillRect(w * x, h * y, w * bw, h * 0.1);
      g.fillStyle = '#c4532e'; g.fillRect(w * x - 3, h * y - 6, w * bw + 6, 8);
      g.fillStyle = '#3a6fb0'; g.fillRect(w * (x + bw / 2) - 5, h * (y + 0.03), 10, 12);
    }
  },
  italian(g, w, h) {
    sky(g, w, h, ['#1f8fb5', '#4ec3d9', '#a8e6ef', '#e5fbff']);
    g.fillStyle = '#1b6f8f'; g.fillRect(0, h * 0.66, w, h * 0.34);
    g.fillStyle = '#7a6a58'; g.beginPath(); g.moveTo(0, h * 0.4); g.lineTo(w * 0.55, h * 0.5); g.lineTo(w * 0.6, h * 0.72); g.lineTo(0, h * 0.76); g.fill();
    const cols = ['#f28ca0', '#f5c84c', '#f08a3c', '#7fd1c7', '#e86a5c', '#fff1c9'];
    let k = 0;
    for (let row = 0; row < 4; row++) for (let i = 0; i < 4 - row * 0.5; i++) {
      const x = w * (0.02 + i * 0.13 + row * 0.03), y = h * (0.62 - row * 0.06);
      g.fillStyle = cols[k++ % cols.length]; g.fillRect(x, y, w * 0.12, h * 0.07);
      g.fillStyle = '#2b4a6b'; g.fillRect(x + w * 0.04, y + h * 0.02, 6, 8);
    }
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(w * 0.72, h * 0.74); g.lineTo(w * 0.72, h * 0.6); g.lineTo(w * 0.82, h * 0.74); g.fill();
    g.fillStyle = '#c94a3a'; g.fillRect(w * 0.66, h * 0.74, w * 0.2, h * 0.02);
  },
  german(g, w, h) {
    sky(g, w, h, ['#0f1f4f', '#243f86', '#4f7fc4', '#9cc6ef']); stars(g, w, h, 50);
    g.fillStyle = '#f6f1d0'; g.beginPath(); g.arc(w * 0.78, h * 0.18, w * 0.08, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2b3f6e'; g.beginPath(); g.moveTo(0, h * 0.7); g.lineTo(w * 0.3, h * 0.45); g.lineTo(w * 0.55, h * 0.68); g.lineTo(w * 0.8, h * 0.5); g.lineTo(w, h * 0.66); g.lineTo(w, h); g.lineTo(0, h); g.fill();
    g.fillStyle = '#1d4a3a'; g.fillRect(0, h * 0.82, w, h * 0.18);
    g.fillStyle = '#eef0f8';
    for (const [x, y, tw, th] of [[0.3, 0.42, 0.4, 0.3], [0.26, 0.32, 0.1, 0.4], [0.62, 0.36, 0.1, 0.36], [0.44, 0.26, 0.1, 0.2]]) g.fillRect(w * x, h * y, w * tw, h * th);
    g.fillStyle = '#3a5ea8';
    for (const [x, y] of [[0.31, 0.32], [0.67, 0.36], [0.49, 0.26]]) { g.beginPath(); g.moveTo(w * (x - 0.07), h * y); g.lineTo(w * x, h * (y - 0.1)); g.lineTo(w * (x + 0.07), h * y); g.fill(); }
    g.fillStyle = '#ffd77a';
    for (const [x, y] of [[0.36, 0.5], [0.46, 0.5], [0.56, 0.5], [0.3, 0.42], [0.66, 0.46], [0.49, 0.34]]) g.fillRect(w * x, h * y, 6, 9);
  },
  portuguese(g, w, h) {
    sky(g, w, h, ['#e86aa6', '#f78fb3', '#ffc3a8', '#ffe6c7']);
    const bcol = ['#f5d36c', '#7fb8e6', '#f29e7e', '#fff3e0'];
    for (let i = 0; i < 5; i++) {
      const x = w * i * 0.21, bh = h * (0.35 + (i % 2) * 0.1);
      g.fillStyle = bcol[i % 4]; g.fillRect(x, h - bh, w * 0.2, bh);
      g.fillStyle = '#2f5aa8';
      for (let r = 0; r < 4; r++) g.fillRect(x + w * 0.06, h - bh + 14 + r * 26, 10, 14);
    }
    g.fillStyle = '#f4c22b'; roundRect(g, w * 0.14, h * 0.7, w * 0.62, h * 0.14, 14); g.fill();
    g.fillStyle = '#ffffff'; g.fillRect(w * 0.14, h * 0.775, w * 0.62, h * 0.012);
    g.fillStyle = '#5c87c2'; for (let i = 0; i < 4; i++) g.fillRect(w * (0.18 + i * 0.14), h * 0.72, w * 0.09, h * 0.045);
    g.strokeStyle = '#3a3a4a'; g.lineWidth = 3; g.beginPath(); g.moveTo(w * 0.45, h * 0.7); g.lineTo(w * 0.52, h * 0.55); g.stroke();
    g.fillStyle = '#5a4a5a'; g.fillRect(0, h * 0.86, w, h * 0.14);
  },
  lobby(g, w, h) {
    sky(g, w, h, ['#161a4a', '#3d3a8c', '#8a5fb0', '#f0a3a8']); stars(g, w, h, 40);
    g.fillStyle = '#3a4a8a'; g.beginPath(); g.moveTo(w * 0.2, h * 0.62); g.lineTo(w * 0.5, h * 0.45); g.lineTo(w * 0.8, h * 0.62); g.fill();
    g.fillStyle = '#f2e6cf'; g.fillRect(w * 0.27, h * 0.62, w * 0.46, h * 0.18);
    g.fillStyle = '#5fe0ff'; g.beginPath(); g.ellipse(w * 0.5, h * 0.9, w * 0.3, h * 0.05, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#b49af5'; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(w * (i / 8), h * 0.86, 16, 0, Math.PI * 2); g.fill(); }
  },
};

// ---------------------------------------------------------------- portal (stone arch with a painted scene)
const P_W = 1.42, P_H = 3.0; // inner half-width and height of the straight part
function archShape(hw, hh) {
  const s = new THREE.Shape();
  s.moveTo(-hw, 0); s.lineTo(hw, 0); s.lineTo(hw, hh); s.absarc(0, hh, hw, 0, Math.PI, false); s.lineTo(-hw, 0);
  const geo = new THREE.ShapeGeometry(s, 24);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + hw) / (hw * 2), pos.getY(i) / (hh + hw));
  return geo;
}
let swirlTex = null;
function swirlTexture() {
  if (swirlTex) return swirlTex;
  swirlTex = canvasTexture(256, 256, (g, w, h) => {
    g.translate(w / 2, h / 2);
    for (let arm = 0; arm < 3; arm++) {
      g.rotate((Math.PI * 2) / 3);
      for (let t = 0; t < 1; t += 0.01) {
        const r = t * w * 0.5, a = t * 5;
        g.fillStyle = `rgba(255,255,255,${0.35 * (1 - t)})`;
        g.beginPath(); g.arc(Math.cos(a) * r, Math.sin(a) * r, 3 + t * 10, 0, Math.PI * 2); g.fill();
      }
    }
  }).tex;
  return swirlTex;
}

export function drawPortalPlaque(sign, roomId, count) {
  const r = ROOMS[roomId];
  const { ctx: g, canvas, tex } = sign.userData.ct;
  const w = canvas.width, h = canvas.height;
  g.clearRect(0, 0, w, h);
  // banner shape
  g.fillStyle = '#2a2346';
  roundRect(g, 10, 10, w - 20, h - 20, 46); g.fill();
  g.strokeStyle = '#f2c46d'; g.lineWidth = 10; roundRect(g, 18, 18, w - 36, h - 36, 40); g.stroke();
  g.fillStyle = r.color; roundRect(g, 30, 30, w - 60, 14, 7); g.fill();
  if (r.flag) drawFlag(g, r.flag, 46, h / 2 - 34, 100, 66);
  g.fillStyle = '#fff6e6'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `400 84px ${DISPLAY}`;
  const textX = r.flag ? (w + 150) / 2 : w / 2;
  g.fillText(r.native, textX, h / 2 - 8, w - 190);
  if (count !== undefined) {
    g.font = `800 30px ${FONT}`; g.fillStyle = count ? '#f2c46d' : '#a39cc0';
    g.fillText(count === 1 ? '1 person inside' : `${count} people inside`, textX, h / 2 + 50);
  }
  tex.needsUpdate = true;
}

export function makePortal(roomId, { stone = '#c9b89f', showCount = true } = {}) {
  const r = ROOMS[roomId];
  const grp = new THREE.Group();
  const outer = P_W + 0.42;
  grp.add(rbox(0.62, P_H, 0.8, stone, -outer, P_H / 2, 0, 0.1), rbox(0.62, P_H, 0.8, stone, outer, P_H / 2, 0, 0.1));
  const arch = new THREE.Mesh(new THREE.TorusGeometry(outer, 0.34, 10, 28, Math.PI), mat(stone));
  arch.scale.z = 1.15;
  arch.position.y = P_H;
  arch.castShadow = true;
  grp.add(arch);
  grp.add(rbox(outer * 2 + 1.0, 0.22, 1.6, stone, 0, 0.11, 0.2, 0.06));
  // glowing rim
  const rim = glow(r.color);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(P_W + 0.05, 0.09, 8, 32, Math.PI), rim);
  ring.position.set(0, P_H, 0.22);
  grp.add(ring);
  for (const sx of [-1, 1]) { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.16, P_H - 0.2, 0.16), rim); bar.position.set(sx * (P_W + 0.05), P_H / 2 + 0.1, 0.22); grp.add(bar); }
  // painted scene + swirl
  const scene = canvasTexture(256, 420, (g, w, h) => SCENES[roomId](g, w, h)).tex;
  const geo = archShape(P_W, P_H);
  const inner = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: scene }));
  inner.position.set(0, 0.22, 0.05);
  grp.add(inner);
  const swirl = swirlTexture().clone();
  swirl.center.set(0.5, 0.5);
  const sw = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: swirl, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, color: r.color }));
  sw.position.set(0, 0.22, 0.08);
  grp.add(sw);
  // wall lanterns
  for (const sx of [-1, 1]) {
    grp.add(rbox(0.26, 0.36, 0.26, '#2a2346', sx * (outer + 0.62), 2.4, 0.25, 0.05));
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.26, 0.18), glow('#ffd27a'));
    l.position.set(sx * (outer + 0.62), 2.4, 0.25);
    grp.add(l);
  }
  // name plaque
  const plaque = makeSign(3.6, 1.15, () => {}, 160);
  plaque.position.set(0, P_H + outer + 0.95, 0.1);
  grp.add(plaque);
  drawPortalPlaque(plaque, roomId, showCount ? 0 : undefined);
  const light = new THREE.PointLight(r.color, 6, 7, 2);
  light.position.set(0, 1.6, 1.2);
  grp.add(light);
  grp.userData = { roomId, swirl, plaque, sw };
  return grp;
}

export function animatePortals(level, now) {
  for (const p of level.portals) {
    const u = p.group.userData;
    u.swirl.rotation = -now / 900;
    u.sw.material.opacity = 0.75 + Math.sin(now / 350 + p.x) * 0.2;
  }
}

// ---------------------------------------------------------------- simple language rooms (until their own maps are designed)
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
function makeTree(level, x, z) {
  const t = new THREE.Group();
  t.add(rbox(0.5, 1.6, 0.5, '#8d6e63', 0, 0.8, 0), rbox(1.8, 1.6, 1.8, '#5cc46b', 0, 2.3, 0, 0.3), rbox(1.1, 0.8, 1.1, '#74d683', 0, 3.4, 0, 0.25));
  t.position.set(x, 0, z);
  level.colliders.push({ x, z, r: 0.7 });
  return t;
}
function makeTable(level, x, z, color) {
  const t = new THREE.Group();
  t.add(rbox(1.6, 0.14, 1.6, '#ffffff', 0, 0.85, 0, 0.05), box(0.2, 0.85, 0.2, '#9aa0b4', 0, 0.42, 0), rbox(0.9, 0.08, 0.9, '#9aa0b4', 0, 0.04, 0, 0.03));
  for (const [dx, dz] of [[1.25, 0], [-1.25, 0], [0, 1.25], [0, -1.25]]) {
    const chair = new THREE.Group();
    chair.add(rbox(0.6, 0.12, 0.6, color, 0, 0.5, 0, 0.05), box(0.1, 0.5, 0.1, '#9aa0b4', 0, 0.25, 0));
    chair.position.set(dx, 0, dz);
    t.add(chair);
  }
  t.position.set(x, 0, z);
  level.colliders.push({ x, z, r: 1.0 });
  return t;
}

export function buildLanguageRoom(roomId) {
  const r = ROOMS[roomId];
  const L = newLevel();
  const HALF = 19;
  L.bounds = { type: 'square', half: HALF };
  L.spawn = { x: 0, z: HALF - 5, yaw: 0 };
  const W = HALF * 2 + 2, wallH = 3;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, W), new THREE.MeshLambertMaterial({ map: floorTexture(r.floor) }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  L.group.add(floor);
  L.group.add(box(W, wallH, 1, r.wall, 0, wallH / 2, -HALF - 1), box(W, wallH, 1, r.wall, 0, wallH / 2, HALF + 1),
              box(1, wallH, W, r.wall, -HALF - 1, wallH / 2, 0), box(1, wallH, W, r.wall, HALF + 1, wallH / 2, 0));
  L.group.add(box(W + 1, 0.3, 1.2, r.color, 0, wallH, -HALF - 1), box(W + 1, 0.3, 1.2, r.color, 0, wallH, HALF + 1),
              box(1.2, 0.3, W, r.color, -HALF - 1, wallH, 0), box(1.2, 0.3, W, r.color, HALF + 1, wallH, 0));

  const sign = makeSign(12, 4, (g, w, h) => {
    g.fillStyle = '#2a2346'; roundRect(g, 8, 8, w - 16, h - 16, 60); g.fill();
    g.strokeStyle = '#f2c46d'; g.lineWidth = 14; roundRect(g, 20, 20, w - 40, h - 40, 50); g.stroke();
    drawFlag(g, r.flag, 80, h / 2 - 110, 320, 220);
    g.fillStyle = '#fff6e6'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.font = `400 160px ${DISPLAY}`; g.fillText(r.greeting, 450, h * 0.32, w - 500);
    g.font = `800 76px ${FONT}`; g.fillStyle = '#d9d2f0'; g.fillText(r.sub, 455, h * 0.58, w - 500);
    g.font = `800 50px ${FONT}`; g.fillStyle = r.color; g.fillText('Press Enter to chat. Free your mouse (Esc) to translate.', 455, h * 0.78, w - 500);
  });
  sign.position.set(0, 6, -HALF);
  L.group.add(sign);

  const back = makePortal('lobby', { showCount: false });
  back.position.set(0, 0, HALF - 1.5);
  back.lookAt(0, 0, 0);
  L.group.add(back);
  L.portals.push({ roomId: 'lobby', x: 0, z: HALF - 1.5, group: back });

  for (const [x, z] of [[-7, -6], [7, -6], [-7, 4], [7, 4], [0, -1]]) L.group.add(makeTable(L, x, z, r.color));
  for (const [x, z] of [[-16, -16], [16, -16], [-16, 12], [16, 12]]) L.group.add(makeTree(L, x, z));
  freezeStatic(L.group);
  L.updaters.push((now) => animatePortals(L, now));
  return L;
}
