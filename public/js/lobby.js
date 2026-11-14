// The Polyglotter plaza: fountain, gazebo, glowing portals, cozy houses, hydrangeas and lanterns
import * as THREE from 'three';
import { rbox, box, ball, shade, mat, glow, canvasTexture, roundRect, makeSign, roofPrism, freezeStatic, DISPLAY, FONT } from './helpers.js';
import { newLevel, makePortal, animatePortals, PORTAL_ORDER } from './rooms.js';

const PLAZA_R = 19;      // stone plaza radius
const WALK_R = 17.3;     // how far players can walk
const PORTAL_R = 15.6;   // portals sit on this circle
const PORTAL_ANGLES = [-88, -64, -40, 40, 64, 88];   // degrees, 0 = straight ahead (behind the fountain)
const STONE = '#c9b89f';
const WOOD = '#8a5a32';
const HYDRANGEA = ['#9b8cf0', '#b49af5', '#7f9df5', '#c7a6ff', '#8fb0ff', '#d3b8ff'];

const polar = (deg, r) => { const a = (deg * Math.PI) / 180; return [Math.sin(a) * r, -Math.cos(a) * r]; };

// ---------------------------------------------------------------- textures
function cobbleTexture() {
  const ct = canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = '#5d5872'; g.fillRect(0, 0, w, h);
    const rows = 10, size = h / rows;
    for (let r = 0; r < rows; r++) {
      let x = (r % 2) * -size * 0.5;
      while (x < w) {
        const sw = size * (0.8 + ((r * 7 + Math.floor(x)) % 5) * 0.12);
        const shadeN = (r * 13 + Math.floor(x * 7)) % 4;
        g.fillStyle = ['#8a84a3', '#958fae', '#7f7998', '#9c95b2'][shadeN];
        roundRect(g, x + 3, r * size + 3, sw - 6, size - 6, 10); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.08)'; roundRect(g, x + 6, r * size + 5, sw - 14, size * 0.35, 8); g.fill();
        x += sw;
      }
    }
  });
  ct.tex.wrapS = ct.tex.wrapT = THREE.RepeatWrapping;
  ct.tex.repeat.set(9, 9);
  return ct.tex;
}

function skyTexture() {
  return canvasTexture(64, 1024, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0e123a'); grad.addColorStop(0.28, '#262b6e'); grad.addColorStop(0.42, '#4b3f95');
    grad.addColorStop(0.48, '#9a6ab8'); grad.addColorStop(0.52, '#f0a3a8'); grad.addColorStop(0.56, '#3a3470'); grad.addColorStop(1, '#1a1840');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
  }).tex;
}

// ---------------------------------------------------------------- batches (many small things drawn in one go = fast)
class Batch {
  constructor(geo, material, colored = false) { this.geo = geo; this.mat = material; this.items = []; this.colored = colored; }
  add(x, y, z, s = 1, color = null, rotY = 0) { this.items.push({ x, y, z, s, color, rotY }); }
  build(cast = false) {
    const m = new THREE.InstancedMesh(this.geo, this.mat, this.items.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
    this.items.forEach((it, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), it.rotY);
      m4.compose(new THREE.Vector3(it.x, it.y, it.z), q, new THREE.Vector3(it.s, it.s, it.s));
      m.setMatrixAt(i, m4);
      if (this.colored) m.setColorAt(i, c.set(it.color));
    });
    m.castShadow = cast; m.receiveShadow = true;
    return m;
  }
}

// ---------------------------------------------------------------- pieces
function hydrangea(flowers, leaves, x, y, z, size = 1, seed = 0) {
  leaves.add(x, y + 0.2 * size, z, 0.55 * size);
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + seed;
    const rr = (i % 2 ? 0.35 : 0.22) * size;
    flowers.add(x + Math.cos(a) * rr, y + (0.42 + (i % 3) * 0.1) * size, z + Math.sin(a) * rr, (0.22 + (i % 2) * 0.05) * size, HYDRANGEA[(i + Math.floor(seed * 10)) % HYDRANGEA.length]);
  }
  flowers.add(x, y + 0.62 * size, z, 0.26 * size, HYDRANGEA[Math.floor(seed * 7) % HYDRANGEA.length]);
}

function lampPost(L, x, z, withLight) {
  const g = new THREE.Group();
  g.add(shade(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 3.0, 8), mat('#2a2346'))));
  g.children[0].position.y = 1.5;
  g.add(rbox(0.5, 0.14, 0.5, '#2a2346', 0, 3.05, 0, 0.04));
  const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.44, 0.34), glow('#ffd27a'));
  lantern.position.y = 3.35;
  g.add(lantern);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.3, 4), mat('#2a2346'));
  cap.position.y = 3.72; cap.rotation.y = Math.PI / 4;
  g.add(cap);
  if (withLight) {
    const l = new THREE.PointLight('#ffb85c', 9, 10, 2);
    l.position.y = 3.2;
    g.add(l);
  }
  g.position.set(x, 0, z);
  L.colliders.push({ x, z, r: 0.3 });
  return g;
}

function bench(L, x, z) {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) g.add(rbox(2.2, 0.08, 0.18, WOOD, 0, 0.56, -0.2 + i * 0.2, 0.03));
  for (let i = 0; i < 2; i++) g.add(rbox(2.2, 0.16, 0.06, WOOD, 0, 0.82 + i * 0.22, -0.34, 0.03));
  for (const sx of [-1, 1]) {
    g.add(rbox(0.1, 0.56, 0.1, '#2a2346', sx * 0.95, 0.28, 0.15, 0.03), rbox(0.1, 1.15, 0.1, '#2a2346', sx * 0.95, 0.57, -0.32, 0.03));
    g.add(rbox(0.1, 0.06, 0.6, '#2a2346', sx * 1.05, 0.78, -0.05, 0.02));
  }
  g.position.set(x, 0, z);
  g.lookAt(0, 0, 0);
  // two seats per bench
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(g.quaternion);
  for (const o of [-0.55, 0.55]) {
    const sx = x + right.x * o, sz = z + right.z * o;
    L.seats.push({ x: sx, z: sz, yaw: Math.atan2(sx, sz) });
    L.colliders.push({ x: sx, z: sz, r: 0.5 });
  }
  return g;
}

function house(w, h, d, wall, roof, windowsPerRow) {
  const g = new THREE.Group();
  g.add(rbox(w, h, d, wall, 0, h / 2, 0, 0.12));
  const r = roofPrism(w + 0.6, d + 0.8, Math.min(w, d) * 0.55, roof);
  r.position.y = h;
  g.add(r);
  g.add(rbox(0.6, 1.4, 0.6, '#8a6a5a', w * 0.28, h + 0.9, -d * 0.15, 0.06));
  const floors = Math.max(1, Math.floor(h / 2.2));
  for (let f = 0; f < floors; f++) {
    for (let i = 0; i < windowsPerRow; i++) {
      const x = -w / 2 + (w / windowsPerRow) * (i + 0.5);
      const y = 1.3 + f * 2.2;
      const lit = (f + i) % 3 !== 1;
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.85), lit ? glow('#ffcf7a') : mat('#3a3a66'));
      win.position.set(x, y, d / 2 + 0.02);
      g.add(win);
      g.add(rbox(0.2, 0.9, 0.06, '#3e5a9a', x - 0.45, y, d / 2 + 0.04, 0.02), rbox(0.2, 0.9, 0.06, '#3e5a9a', x + 0.45, y, d / 2 + 0.04, 0.02));
      if (f === 0) g.add(rbox(0.8, 0.2, 0.3, WOOD, x, y - 0.55, d / 2 + 0.12, 0.03));
      g.userData.boxes = g.userData.boxes || [];
      g.userData.boxes.push([x, y - 0.4, d / 2 + 0.15]);
    }
  }
  return g;
}

function stringLights(L, from, to, sag, colors) {
  const n = Math.round(from.distanceTo(to) * 2.2);
  const geo = new THREE.SphereGeometry(0.07, 6, 6);
  const wirePts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = from.clone().lerp(to, t);
    p.y -= Math.sin(t * Math.PI) * sag;
    wirePts.push(p);
    if (i > 0 && i < n) {
      const b = new THREE.Mesh(geo, glow(colors[i % colors.length]));
      b.position.copy(p).y -= 0.08;
      L.group.add(b);
    }
  }
  L.group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(wirePts), new THREE.LineBasicMaterial({ color: '#2a2346' })));
}

function lifeRing() {
  const g = new THREE.Group();
  g.add(shade(new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.13, 10, 24), mat('#ffffff'))));
  for (let i = 0; i < 4; i++) {
    const seg = shade(new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.14, 10, 6, Math.PI / 4), mat('#e04848')));
    seg.rotation.z = (i * Math.PI) / 2 + Math.PI / 8;
    g.add(seg);
  }
  return g;
}

// ---------------------------------------------------------------- the gazebo with the Polyglotter sign
function logoSign() {
  return makeSign(6.4, 2.6, (g, w, h) => {
    // globe
    const cx = w / 2, cy = h * 0.36, R = h * 0.3;
    g.fillStyle = '#c99a3c'; g.beginPath(); g.arc(cx, cy, R + 14, Math.PI, 0); g.fill();
    const grad = g.createRadialGradient(cx - R * 0.3, cy - R * 0.3, 10, cx, cy, R);
    grad.addColorStop(0, '#7fe3f0'); grad.addColorStop(1, '#1f8fb5');
    g.fillStyle = grad; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#6fcf6a';
    for (const [x, y, rx, ry] of [[-0.35, -0.2, 0.28, 0.2], [0.25, -0.35, 0.3, 0.16], [0.35, 0.15, 0.2, 0.25], [-0.25, 0.3, 0.18, 0.14]]) {
      g.beginPath(); g.ellipse(cx + x * R, cy + y * R, rx * R, ry * R, 0.4, 0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 4;
    g.beginPath(); g.ellipse(cx, cy, R * 0.45, R, 0, 0, Math.PI * 2); g.moveTo(cx - R, cy); g.lineTo(cx + R, cy); g.stroke();
    // banner with the name
    const by = h * 0.5, bh = h * 0.4;
    g.fillStyle = '#1f2a6b'; roundRect(g, w * 0.04, by, w * 0.92, bh, bh / 2); g.fill();
    g.strokeStyle = '#f2c46d'; g.lineWidth = 12; roundRect(g, w * 0.04 + 10, by + 10, w * 0.92 - 20, bh - 20, bh / 2 - 10); g.stroke();
    g.font = `400 ${Math.round(bh * 0.72)}px ${DISPLAY}`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineJoin = 'round'; g.lineWidth = 22; g.strokeStyle = '#5a3418'; g.strokeText('Polyglotter', w / 2, by + bh / 2 + 6);
    g.fillStyle = '#fff3d6'; g.fillText('Polyglotter', w / 2, by + bh / 2 + 6);
    // open book
    g.fillStyle = '#fff3d6';
    g.beginPath(); g.moveTo(cx, h * 0.93); g.quadraticCurveTo(cx - 90, h * 0.86, cx - 170, h * 0.92); g.lineTo(cx - 170, h * 0.99); g.quadraticCurveTo(cx - 90, h * 0.94, cx, h * 0.99); g.fill();
    g.beginPath(); g.moveTo(cx, h * 0.93); g.quadraticCurveTo(cx + 90, h * 0.86, cx + 170, h * 0.92); g.lineTo(cx + 170, h * 0.99); g.quadraticCurveTo(cx + 90, h * 0.94, cx, h * 0.99); g.fill();
  }, 140);
}

// parchment world map that people can draw on
function drawMapBase(g, w, h) {
  g.fillStyle = '#f1e2c0'; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(160,120,70,0.25)';
  for (const [x, y, rx, ry] of [[0.2, 0.35, 0.12, 0.16], [0.27, 0.68, 0.06, 0.15], [0.5, 0.3, 0.07, 0.1], [0.53, 0.6, 0.08, 0.17], [0.72, 0.35, 0.16, 0.14], [0.83, 0.72, 0.07, 0.06]]) {
    g.beginPath(); g.ellipse(x * w, y * h, rx * w, ry * h, 0.3, 0, Math.PI * 2); g.fill();
  }
  g.strokeStyle = 'rgba(120,90,50,0.25)'; g.lineWidth = 2;
  for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(0, (h * i) / 6); g.lineTo(w, (h * i) / 6); g.stroke(); }
  g.fillStyle = 'rgba(90,60,30,0.45)'; g.font = `400 34px ${DISPLAY}`; g.textAlign = 'right';
  g.fillText('Draw here! (C to clear)', w - 24, h - 24);
}

function gazebo(L, cx, cz) {
  const g = new THREE.Group();
  const R = 3.3;
  const base = shade(new THREE.Mesh(new THREE.CylinderGeometry(R + 0.5, R + 0.7, 0.2, 6), mat(STONE)));
  base.position.y = 0.1; base.rotation.y = Math.PI / 6;
  g.add(base);
  const corners = [];
  for (let k = 0; k < 6; k++) {
    const a = ((k * 60 + 30) * Math.PI) / 180;
    const x = Math.sin(a) * R, z = Math.cos(a) * R;
    corners.push([x, z]);
    g.add(rbox(0.36, 3.6, 0.36, '#efe4d0', x, 1.9, z, 0.08));
    g.add(rbox(0.5, 0.25, 0.5, STONE, x, 0.32, z, 0.05));
    L.colliders.push({ x: cx + x, z: cz + z, r: 0.35 });
  }
  const trim = shade(new THREE.Mesh(new THREE.CylinderGeometry(R + 0.6, R + 0.6, 0.35, 6), mat(WOOD)));
  trim.position.y = 3.85; trim.rotation.y = Math.PI / 6;
  g.add(trim);
  const roof = shade(new THREE.Mesh(new THREE.ConeGeometry(R + 1.3, 2.3, 6), mat('#3b4a8a')));
  roof.position.y = 3.85 + 0.17 + 1.15; roof.rotation.y = Math.PI / 6;
  g.add(roof);
  const cupola = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.9, 6), mat('#efe4d0')));
  cupola.position.y = 6.2;
  g.add(cupola);
  const cupGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.4, 6, 1, true), glow('#ffd27a'));
  cupGlow.position.y = 6.2;
  g.add(cupGlow);
  const cap = shade(new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.9, 6), mat('#3b4a8a')));
  cap.position.y = 7.1;
  g.add(cap);
  g.add(ball(0.12, '#f2c46d', 0, 7.65, 0, 1));
  // hanging lanterns inside
  const hang = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.3), glow('#ffd27a'));
  hang.position.y = 3.2;
  g.add(hang);
  const inner = new THREE.PointLight('#ffc36b', 10, 9, 2);
  inner.position.y = 3.0;
  g.add(inner);
  // banners on the front pillars
  for (const [x, z] of [corners[0], corners[5]]) {
    const b = makeSign(0.55, 1.0, (c, w, h) => {
      c.fillStyle = '#1f2a6b'; c.beginPath(); c.moveTo(0, 0); c.lineTo(w, 0); c.lineTo(w, h); c.lineTo(w / 2, h * 0.82); c.lineTo(0, h); c.fill();
      c.strokeStyle = '#f2c46d'; c.lineWidth = 6; c.strokeRect(8, 8, w - 16, h * 0.7);
      c.fillStyle = '#f2c46d'; c.font = `400 52px ${DISPLAY}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Aa', w / 2, h * 0.4);
    });
    b.position.set(x, 2.7, z + 0.2);
    g.add(b);
  }
  // logo sign on the front of the roof
  const logo = logoSign();
  logo.position.set(0, 5.0, R + 0.65);
  logo.rotation.x = -0.18;
  g.add(logo);
  // drawable map board at the back
  const bz = -R * Math.cos(Math.PI / 6) + 0.25;
  g.add(rbox(3.6, 2.4, 0.16, WOOD, 0, 1.95, bz - 0.06, 0.06));
  const ct = canvasTexture(1024, 640, drawMapBase);
  const surf = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 2.1), new THREE.MeshBasicMaterial({ map: ct.tex }));
  surf.position.set(0, 1.95, bz + 0.03);
  surf.userData.board = 'map';
  g.add(surf);
  L.boards.map = { mesh: surf, ct, base: drawMapBase };
  for (const x of [-1.2, 0, 1.2]) L.colliders.push({ x: cx + x, z: cz + bz - 0.2, r: 0.45 });
  // table with a globe and books
  const tx = 2.0, tz = -0.9;
  g.add(rbox(1.2, 0.1, 0.8, WOOD, tx, 0.9, tz, 0.03), rbox(0.12, 0.85, 0.12, WOOD, tx, 0.45, tz, 0.03));
  const globeTex = canvasTexture(256, 128, (c, w, h) => {
    c.fillStyle = '#2f9fd0'; c.fillRect(0, 0, w, h); c.fillStyle = '#6fcf6a';
    for (const [x, y, rx, ry] of [[0.2, 0.35, 0.1, 0.18], [0.27, 0.7, 0.05, 0.15], [0.5, 0.3, 0.06, 0.12], [0.53, 0.62, 0.07, 0.18], [0.72, 0.35, 0.14, 0.15], [0.84, 0.72, 0.06, 0.07]]) {
      c.beginPath(); c.ellipse(x * w, y * h, rx * w, ry * h, 0, 0, Math.PI * 2); c.fill();
    }
  }).tex;
  const globe = shade(new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 14), new THREE.MeshLambertMaterial({ map: globeTex })));
  globe.position.set(tx + 0.25, 1.38, tz);
  globe.rotation.z = 0.4;
  globe.userData.dynamic = true;
  g.add(globe, rbox(0.06, 0.4, 0.06, '#c99a3c', tx + 0.25, 1.1, tz, 0.02));
  ['#c94a4a', '#3e5a9a', '#3fae6a'].forEach((c, i) => g.add(rbox(0.42, 0.09, 0.3, c, tx - 0.3, 1.0 + i * 0.09, tz, 0.02)));
  L.colliders.push({ x: cx + tx, z: cz + tz, r: 0.7 });
  L.updaters.push((now, dt) => { globe.rotation.y += dt * 0.4; });

  g.position.set(cx, 0, cz);
  return g;
}

// ---------------------------------------------------------------- fountain
function fountain(L) {
  const g = new THREE.Group();
  const basin = shade(new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.9, 0.7, 24), mat(STONE)));
  basin.position.y = 0.35;
  g.add(basin);
  const rim = shade(new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.16, 8, 32), mat('#d8c9b0')));
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.72;
  g.add(rim);
  const water = new THREE.Mesh(new THREE.CircleGeometry(2.55, 32), glow('#58d8f5', 0.9));
  water.rotation.x = -Math.PI / 2; water.position.y = 0.62;
  g.add(water);
  const pillar = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 1.5, 12), mat(STONE)));
  pillar.position.y = 1.2;
  g.add(pillar);
  const bowl = shade(new THREE.Mesh(new THREE.CylinderGeometry(1.15, 0.5, 0.35, 20), mat('#d8c9b0')));
  bowl.position.y = 1.95;
  g.add(bowl);
  const water2 = new THREE.Mesh(new THREE.CircleGeometry(1.0, 24), glow('#7fe8ff', 0.95));
  water2.rotation.x = -Math.PI / 2; water2.position.y = 2.1;
  g.add(water2);
  const top = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.7, 10), mat(STONE)));
  top.position.y = 2.45;
  g.add(top);
  g.add(ball(0.18, '#d8c9b0', 0, 2.85, 0, 1));
  const light = new THREE.PointLight('#5fd8ff', 12, 9, 2);
  light.position.y = 1.4;
  g.add(light);
  // water droplets
  const drops = [];
  const dGeo = new THREE.SphereGeometry(0.06, 6, 6), dMat = glow('#bff4ff', 0.9);
  for (let i = 0; i < 40; i++) {
    const d = new THREE.Mesh(dGeo, dMat);
    d.userData = { t: Math.random(), a: (i / 40) * Math.PI * 2, big: i % 2 };
    g.add(d);
    drops.push(d);
  }
  L.updaters.push((now, dt) => {
    for (const d of drops) {
      const u = d.userData;
      u.t += dt * 0.8;
      if (u.t > 1) u.t -= 1;
      const reach = u.big ? 1.9 : 0.85, height = u.big ? 1.0 : 0.6, startY = u.big ? 2.15 : 2.9;
      const r = (u.big ? 0.9 : 0.1) + u.t * (reach - (u.big ? 0.9 : 0.1));
      d.position.set(Math.cos(u.a) * r, startY + Math.sin(u.t * Math.PI) * height - u.t * (u.big ? 1.5 : 0.8), Math.sin(u.a) * r);
    }
    water.material.opacity = 0.85 + Math.sin(now / 300) * 0.05;
  });
  L.colliders.push({ x: 0, z: 0, r: 3.0 });
  return g;
}

// ---------------------------------------------------------------- distant scenery
function floatingIsland(x, y, z, s) {
  const g = new THREE.Group();
  const rock = shade(new THREE.Mesh(new THREE.ConeGeometry(6, 9, 7), mat('#6b5f8a')), false);
  rock.rotation.x = Math.PI; rock.position.y = -4.5;
  g.add(rock);
  const grass = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 6, 1, 7), mat('#4f8f5a'));
  g.add(grass);
  for (const [hx, hz, hh, c] of [[-2, 0, 3, '#efe2c8'], [1.5, -1, 4.5, '#f3d9b8'], [2.5, 2, 2.5, '#e9cfc0']]) {
    g.add(box(2, hh, 2, c, hx, hh / 2 + 0.5, hz));
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.7, 1.6, 4), mat('#b5483c'));
    roof.position.set(hx, hh + 1.3, hz); roof.rotation.y = Math.PI / 4;
    g.add(roof);
    const w = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.8), glow('#ffcf7a'));
    w.position.set(hx, hh / 2 + 0.6, hz + 1.01);
    g.add(w);
  }
  const fall = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 26), glow('#9fe9ff', 0.55));
  fall.position.set(3.5, -13, 4.5);
  g.add(fall);
  g.position.set(x, y, z);
  g.scale.setScalar(s);
  g.lookAt(0, y, 0);
  return g;
}

// ---------------------------------------------------------------- build it all
export function buildLobby() {
  const L = newLevel();
  const G = L.group;
  L.bounds = { type: 'circle', r: WALK_R };
  L.spawn = { x: 0, z: 13.5, yaw: 0 };
  L.env = { background: '#1a1840', fog: ['#2a2560', 70, 260], hemi: ['#a9b4ff', '#4a3a6a', 1.25], sun: ['#c9d4ff', 1.15, [-14, 30, 12]], night: true };

  const flowers = new Batch(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshLambertMaterial({ emissive: '#3a2a6a', emissiveIntensity: 0.35 }), true);
  const leaves = new Batch(new THREE.IcosahedronGeometry(1, 1), mat('#3f7a4c'));

  // sky dome, moon and stars
  const skyMesh = new THREE.Mesh(new THREE.SphereGeometry(420, 24, 16), new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false }));
  G.add(skyMesh);
  const starGeo = new THREE.BufferGeometry();
  const sp = [];
  for (let i = 0; i < 500; i++) {
    const a = Math.random() * Math.PI * 2, el = 0.12 + Math.random() * 1.3;
    sp.push(Math.cos(a) * Math.cos(el) * 400, Math.sin(el) * 400, Math.sin(a) * Math.cos(el) * 400);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  G.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, fog: false })));
  const moon = new THREE.Mesh(new THREE.CircleGeometry(9, 32), new THREE.MeshBasicMaterial({ color: '#fff6dc', fog: false }));
  moon.position.set(-120, 150, -260); moon.lookAt(0, 0, 0);
  G.add(moon);
  for (const [x, y, z, s] of [[-95, 42, -150, 1.4], [110, 55, -170, 1.7], [30, 70, -230, 1.1]]) G.add(floatingIsland(x, y, z, s));
  // soft purple clouds
  const cloudMat = new THREE.MeshLambertMaterial({ color: '#8f7fd0', emissive: '#4a3a8a', emissiveIntensity: 0.6, transparent: true, opacity: 0.85 });
  for (const [x, y, z] of [[-150, 60, -200], [160, 75, -210], [60, 50, -280], [-40, 85, -300]]) {
    for (let i = 0; i < 5; i++) {
      const c = new THREE.Mesh(new THREE.IcosahedronGeometry(10 + (i % 3) * 4, 1), cloudMat);
      c.position.set(x + i * 12 - 24, y + (i % 2) * 5, z);
      c.scale.y = 0.55;
      G.add(c);
    }
  }

  // land and sea
  const sea = new THREE.Mesh(new THREE.CircleGeometry(420, 48), new THREE.MeshLambertMaterial({ color: '#23356f', emissive: '#18245a', emissiveIntensity: 0.6 }));
  sea.rotation.x = -Math.PI / 2; sea.position.y = -2.2;
  G.add(sea);
  const cliff = shade(new THREE.Mesh(new THREE.CylinderGeometry(42, 46, 2.3, 40), mat('#5d5470')), false);
  cliff.position.y = -1.15;
  G.add(cliff);
  const land = new THREE.Mesh(new THREE.CircleGeometry(42, 40), mat('#2f5a3f'));
  land.rotation.x = -Math.PI / 2; land.position.y = 0.0;
  land.receiveShadow = true;
  G.add(land);
  // lighthouse on the coast
  const lh = new THREE.Group();
  for (let i = 0; i < 4; i++) lh.add(shade(new THREE.Mesh(new THREE.CylinderGeometry(1.1 - i * 0.12, 1.2 - i * 0.12, 2.4, 14), mat(i % 2 ? '#e04848' : '#f5f0ea'))));
  lh.children.forEach((c, i) => { c.position.y = 1.2 + i * 2.4; });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.2, 10), glow('#fff2b0'));
  beacon.position.y = 10.4;
  lh.add(beacon);
  const lhRoof = new THREE.Mesh(new THREE.ConeGeometry(1.0, 1.2, 10), mat('#e04848'));
  lhRoof.position.y = 11.6;
  lh.add(lhRoof);
  lh.position.set(36, 0, -16);
  G.add(lh);
  const beam = new THREE.Mesh(new THREE.ConeGeometry(2.2, 22, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#fff2b0', transparent: true, opacity: 0.045, side: THREE.DoubleSide, depthWrite: false }));
  beam.geometry.translate(0, -11, 0);
  beam.rotation.z = Math.PI / 2;
  const beamPivot = new THREE.Group();
  beamPivot.position.set(36, 10.4, -16);
  beamPivot.add(beam);
  G.add(beamPivot);
  L.updaters.push((now) => { beamPivot.rotation.y = now / 2500; });

  // stone plaza with decorative rings
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(PLAZA_R, 64), new THREE.MeshLambertMaterial({ map: cobbleTexture() }));
  plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.02;
  plaza.receiveShadow = true;
  G.add(plaza);
  for (const [r0, r1, c] of [[5.6, 6.1, '#b5adc9'], [10.2, 10.7, '#b5adc9'], [PLAZA_R - 0.6, PLAZA_R + 0.2, '#a89fbd']]) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 64), mat(c));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03;
    ring.receiveShadow = true;
    G.add(ring);
  }
  // glowing path lights around the inner ring
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 8), glow('#ffd27a'));
    d.position.set(Math.cos(a) * 10.45, 0.05, Math.sin(a) * 10.45);
    G.add(d);
  }

  G.add(fountain(L));
  // flower beds around the fountain
  for (const deg of [45, 135, 225, 315]) {
    const [x, z] = polar(deg, 4.6);
    const bed = rbox(2.2, 0.45, 1.0, STONE, x, 0.22, z, 0.1);
    bed.rotation.y = -(deg * Math.PI) / 180;
    G.add(bed);
    const along = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), -(deg * Math.PI) / 180);
    for (const o of [-0.6, 0, 0.6]) hydrangea(flowers, leaves, x + along.x * o, 0.3, z + along.z * o, 0.85, deg + o);
    L.colliders.push({ x, z, r: 1.0 });
  }

  // gazebo with the big sign, behind the fountain
  G.add(gazebo(L, 0, -9.6));

  // portals in a half circle
  PORTAL_ORDER.forEach((id, i) => {
    const [x, z] = polar(PORTAL_ANGLES[i], PORTAL_R);
    const p = makePortal(id, { stone: STONE });
    p.position.set(x, 0, z);
    p.lookAt(0, 0, 0);
    G.add(p);
    L.portals.push({ roomId: id, x, z, group: p });
    // flowers at the foot of each portal
    const side = new THREE.Vector3(1, 0, 0).applyQuaternion(p.quaternion);
    for (const s of [-1, 1]) hydrangea(flowers, leaves, x + side.x * s * 2.9, 0, z + side.z * s * 2.9, 0.9, i + s);
  });

  // low flowery wall behind the portals
  for (let deg = -112; deg <= 112; deg += 7) {
    const [x, z] = polar(deg, 18.6);
    const seg = rbox(2.4, 1.6, 0.8, '#b8a78f', x, 0.8, z, 0.08);
    seg.rotation.y = -(deg * Math.PI) / 180;
    G.add(seg);
    hydrangea(flowers, leaves, x, 1.4, z, 1.0, deg);
  }

  // houses around the plaza
  const walls = ['#efe2c8', '#f3d9b8', '#e9cfc0', '#f1e6d6', '#e8d4b4'];
  const roofs = ['#b5483c', '#a8452f', '#c05a3c', '#9e3f34'];
  let hi = 0;
  for (let deg = -118; deg <= 118; deg += 15.5) {
    if (Math.abs(deg) < 9) continue;
    const r = 23 + (hi % 3) * 1.6;
    const [x, z] = polar(deg, r);
    const w = 4.6 + (hi % 2) * 1.2, h = 4.6 + (hi % 3) * 1.8, d = 4.2;
    const hs = house(w, h, d, walls[hi % walls.length], roofs[hi % roofs.length], hi % 2 ? 3 : 2);
    hs.position.set(x, 0, z);
    hs.lookAt(0, 0, 0);
    G.add(hs);
    for (const [bx, by, bz] of hs.userData.boxes.filter((_, k) => k < 3)) {
      const wp = new THREE.Vector3(bx, by, bz).applyMatrix4(hs.matrix.compose(hs.position, hs.quaternion, hs.scale));
      hydrangea(flowers, leaves, wp.x, wp.y - 0.15, wp.z, 0.45, hi + bx);
    }
    hi++;
  }
  // clock tower behind the gazebo
  const tower = new THREE.Group();
  tower.add(rbox(3.2, 11, 3.2, '#e6d8bf', 0, 5.5, 0, 0.12));
  const tRoof = new THREE.Mesh(new THREE.ConeGeometry(2.8, 3.4, 4), mat('#a8452f'));
  tRoof.position.y = 12.7; tRoof.rotation.y = Math.PI / 4; tRoof.castShadow = true;
  tower.add(tRoof);
  const clock = makeSign(1.8, 1.8, (c, w, h) => {
    c.fillStyle = '#fff3d6'; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 6, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#2a2346'; c.lineWidth = 10; c.stroke();
    c.lineWidth = 12; c.lineCap = 'round'; c.beginPath(); c.moveTo(w / 2, h / 2); c.lineTo(w / 2, h * 0.2); c.moveTo(w / 2, h / 2); c.lineTo(w * 0.72, h / 2); c.stroke();
  });
  clock.position.set(0, 9.2, 1.62);
  tower.add(clock);
  const belfry = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 0.1), glow('#ffcf7a'));
  belfry.position.set(0, 7, 1.62);
  tower.add(belfry);
  tower.position.set(-6, 0, -26);
  tower.lookAt(0, 0, 0);
  G.add(tower);

  // benches facing the fountain
  for (const deg of [-110, 110, -152, 152]) { const [x, z] = polar(deg, 8.2); G.add(bench(L, x, z)); }

  // lamp posts
  for (const [deg, light] of [[-25, true], [25, true], [-128, true], [128, true], [-76, false], [76, false]]) {
    const [x, z] = polar(deg, 11.8);
    G.add(lampPost(L, x, z, light));
  }

  // string lights from the gazebo roof to the lamps
  const warm = ['#ffd27a', '#ffb3c7', '#b9e6ff', '#fff1b0'];
  for (const deg of [-25, 25]) {
    const [x, z] = polar(deg, 11.8);
    const sx = Math.sign(deg) * 3.4;
    stringLights(L, new THREE.Vector3(sx, 4.1, -8.2), new THREE.Vector3(x, 3.6, z), 0.8, warm);
  }
  for (const [a, b] of [[-128, -76], [76, 128]]) {
    const [x1, z1] = polar(a, 11.8), [x2, z2] = polar(b, 11.8);
    stringLights(L, new THREE.Vector3(x1, 3.6, z1), new THREE.Vector3(x2, 3.6, z2), 1.0, warm);
  }

  // front steps with wooden railings, lanterns and a life ring
  for (let i = 0; i < 4; i++) {
    G.add(rbox(5.4, 0.3, 1.1, '#9c94b0', 0, -0.15 - i * 0.3, PLAZA_R + 0.3 + i * 1.0, 0.04));
  }
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const z = PLAZA_R - 1.6 + i * 1.6, y = i < 2 ? 0 : -(i - 1) * 0.5;
      G.add(rbox(0.3, 1.3, 0.3, WOOD, sx * 3.0, y + 0.65, z, 0.05));
      if (i === 0) {
        const l = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.3, 0.24), glow('#ffd27a'));
        l.position.set(sx * 3.0, 1.55, z);
        G.add(l, rbox(0.34, 0.08, 0.34, '#2a2346', sx * 3.0, 1.74, z, 0.02));
      }
    }
    const rail = rbox(0.16, 0.16, 5.2, WOOD, sx * 3.0, 0.95, PLAZA_R + 0.8, 0.04);
    rail.rotation.x = 0.22;
    G.add(rail);
    hydrangea(flowers, leaves, sx * 4.4, 0, PLAZA_R - 1.6, 1.1, sx);
  }
  const ring = lifeRing();
  ring.position.set(3.18, 0.85, PLAZA_R - 0.2);
  ring.rotation.y = Math.PI / 2;
  G.add(ring);
  // wooden fence around the front edge
  for (let deg = 125; deg <= 235; deg += 6) {
    if (Math.abs(deg - 180) < 11) continue;
    const [x, z] = polar(deg, PLAZA_R + 0.4);
    G.add(rbox(0.22, 1.1, 0.22, WOOD, x, 0.55, z, 0.04));
    const [x2, z2] = polar(deg + 3, PLAZA_R + 0.4);
    if (Math.abs(deg + 3 - 180) >= 11 && deg + 3 <= 235) {
      const rail = rbox(1.9, 0.12, 0.14, WOOD, x2, 0.9, z2, 0.03);
      rail.rotation.y = -((deg + 3) * Math.PI) / 180;
      G.add(rail);
    }
  }
  for (const deg of [140, 160, 200, 220]) { const [x, z] = polar(deg, PLAZA_R - 1.2); hydrangea(flowers, leaves, x, 0, z, 1.1, deg); }

  G.add(flowers.build(false), leaves.build(false));
  freezeStatic(G);
  L.updaters.push((now) => animatePortals(L, now));
  return L;
}
