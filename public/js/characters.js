// The six playable characters, built from the character sheets.
// Every character shares the same body "skeleton" so animations work for all of them.
import * as THREE from 'three';
import { rbox, ball, shade, mat, decal, canvasTexture, roundRect, freezeStatic, FONT, DISPLAY } from './helpers.js';

export const CHARACTERS = [
  { id: 'travelerGirl', name: 'Traveler Girl', accent: '#e8792b' },
  { id: 'travelerBoy',  name: 'Traveler Boy',  accent: '#4f8a3a' },
  { id: 'artistGirl',   name: 'Artist Girl',   accent: '#d9465c' },
  { id: 'artistBoy',    name: 'Artist Boy',    accent: '#3fa34d' },
  { id: 'skaterGirl',   name: 'Skater Girl',   accent: '#e86aa6' },
  { id: 'skaterBoy',    name: 'Skater Boy',    accent: '#3a6fd1' },
];
export const charInfo = (id) => CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];

const SPECS = {
  travelerGirl: { skin: '#b07a52', eyes: 'dots', hair: ['longCurly', '#6b4226', '#583420'], hat: ['goggles'], top: 'coatGirl',
                  pants: '#3d4f8f', shoes: '#7a4a2a', hands: ['mitten', '#7a4a2a'] },
  travelerBoy:  { skin: '#a86e45', eyes: 'dots', hair: ['shortCurly', '#5a3620', '#47291a'], hat: ['wideBrim', '#a0703f', '#6b4426'], top: 'coatBoy',
                  pants: '#3d4f8f', shoes: '#7a4a2a', hands: ['mitten', '#7a4a2a'] },
  artistGirl:   { skin: '#f5cfb0', eyes: 'happy', hair: ['curlyBob', '#9a7be0', '#7d5fc9'], hat: ['beret', '#d9465c'], top: 'apronGirl',
                  pants: '#4a3a7a', shoes: '#3a2e5e', hands: ['hand', '#7b5cc8'] },
  artistBoy:    { skin: '#f2c9a5', eyes: 'happy', hair: ['shortSwoop', '#6f63d8', '#5a4ec0'], hat: ['beret', '#3fa34d'], top: 'apronBoy',
                  pants: '#4a3a7a', shoes: '#3a2e5e', hands: ['hand', '#6a4fb8'] },
  skaterGirl:   { skin: '#f7d2b6', eyes: 'dots', hair: ['longStraight', '#f2c75c', '#ddaa3c'], hat: ['backCap', '#f3a6b8', '#ffffff'], top: 'teeGirl',
                  pants: '#5b7fc4', shoes: '#f5f5f5', baggy: true, hands: ['hand', '#f08a3c'] },
  skaterBoy:    { skin: '#f3c9a8', eyes: 'dots', hair: ['messy', '#f2c75c', '#ddaa3c'], hat: ['backCap', '#3a6fd1', '#ffffff'], top: 'teeBoy',
                  pants: '#5b7fc4', shoes: '#f5f5f5', baggy: true, hands: ['hand', '#f08a3c'] },
};

// ---------------------------------------------------------------- hands
export function makeHand(charId) {
  const [kind, color] = (SPECS[charId] || SPECS.travelerGirl).hands;
  const spec = SPECS[charId] || SPECS.travelerGirl;
  const g = new THREE.Group();
  if (kind === 'mitten') {
    g.add(rbox(0.2, 0.24, 0.2, color, 0, 0, 0, 0.09), rbox(0.08, 0.11, 0.09, color, 0.1, 0.03, 0.04, 0.04));
  } else {
    g.add(rbox(0.18, 0.2, 0.18, spec.skin, 0, -0.02, 0, 0.08), rbox(0.07, 0.09, 0.08, spec.skin, 0.09, 0.0, 0.04, 0.035));
    g.add(rbox(0.21, 0.08, 0.21, color, 0, 0.11, 0, 0.04)); // sleeve cuff
  }
  return g;
}

// ---------------------------------------------------------------- face
function addFace(head, spec) {
  const dark = '#2a1a12';
  if (spec.eyes === 'happy') {
    for (const x of [-0.13, 0.13]) {
      const e = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.017, 6, 12, Math.PI), mat(dark));
      e.position.set(x, -0.01, 0.312);
      head.add(e);
    }
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.014, 6, 12, Math.PI), mat('#8a3b2e'));
    smile.rotation.z = Math.PI;
    smile.position.set(0, -0.11, 0.312);
    head.add(smile);
  } else {
    head.add(rbox(0.07, 0.13, 0.03, dark, -0.13, 0.0, 0.31, 0.03), rbox(0.07, 0.13, 0.03, dark, 0.13, 0.0, 0.31, 0.03));
  }
  for (const x of [-0.22, 0.22]) {
    const blush = new THREE.Mesh(new THREE.CircleGeometry(0.055, 16), new THREE.MeshBasicMaterial({ color: '#ec8f8a' }));
    blush.position.set(x, -0.1, 0.313);
    head.add(blush);
  }
}

// ---------------------------------------------------------------- hair
function addHair(head, [style, c, dk]) {
  const lumps = (list, r = 0.1, size = 0.2) => list.forEach(([x, y, z]) => head.add(rbox(size, size, size, dk, x, y, z, r)));
  if (style === 'longCurly') {
    head.add(rbox(0.82, 0.24, 0.68, c, 0, 0.3, -0.01, 0.1));
    head.add(rbox(0.82, 0.7, 0.36, c, 0, 0.04, -0.18, 0.14));
    head.add(rbox(0.17, 0.82, 0.5, c, -0.4, -0.16, -0.04, 0.08), rbox(0.17, 0.82, 0.5, c, 0.4, -0.16, -0.04, 0.08));
    head.add(rbox(0.9, 0.78, 0.26, c, 0, -0.5, -0.24, 0.12));
    lumps([[-0.38, -0.55, 0.12], [0.38, -0.55, 0.12], [-0.3, -0.85, -0.2], [0.3, -0.85, -0.2], [0, -0.88, -0.26], [-0.42, 0.15, 0.1], [0.42, 0.15, 0.1]], 0.09);
  } else if (style === 'shortCurly') {
    head.add(rbox(0.8, 0.2, 0.68, c, 0, 0.3, -0.01, 0.09));
    head.add(rbox(0.8, 0.58, 0.34, c, 0, 0.0, -0.17, 0.12));
    head.add(rbox(0.14, 0.45, 0.45, c, -0.39, 0.0, -0.06, 0.06), rbox(0.14, 0.45, 0.45, c, 0.39, 0.0, -0.06, 0.06));
    lumps([[-0.38, -0.22, 0.06], [0.38, -0.22, 0.06], [-0.26, -0.3, -0.26], [0.26, -0.3, -0.26], [0, -0.32, -0.3], [-0.4, 0.1, 0.16], [0.4, 0.1, 0.16]], 0.08, 0.18);
  } else if (style === 'curlyBob') {
    for (const [y, R] of [[0.3, 0.36], [0.12, 0.42], [-0.08, 0.43], [-0.27, 0.4]]) {
      for (let a = 60; a <= 300; a += 30) {
        const r = (a * Math.PI) / 180;
        head.add(ball(0.17, (a / 30 + Math.round(y * 10)) % 2 ? c : dk, Math.sin(r) * R, y, Math.cos(r) * R - 0.04));
      }
    }
    for (const [x, z] of [[-0.18, 0.1], [0.18, 0.1], [0, -0.15], [-0.2, -0.2], [0.2, -0.2]]) head.add(ball(0.18, c, x, 0.36, z));
    head.add(ball(0.13, dk, -0.22, 0.28, 0.26), ball(0.12, c, 0.0, 0.31, 0.28), ball(0.13, dk, 0.22, 0.28, 0.26));
  } else if (style === 'shortSwoop') {
    head.add(rbox(0.8, 0.22, 0.7, c, 0, 0.3, -0.01, 0.1));
    head.add(rbox(0.8, 0.52, 0.32, c, 0, 0.04, -0.17, 0.12));
    head.add(rbox(0.14, 0.4, 0.46, c, -0.39, 0.02, -0.05, 0.06), rbox(0.14, 0.4, 0.46, c, 0.39, 0.02, -0.05, 0.06));
    head.add(ball(0.14, dk, -0.4, -0.14, 0.06), ball(0.14, dk, 0.4, -0.14, 0.06));
    head.add(ball(0.13, c, -0.2, 0.27, 0.27), ball(0.14, dk, 0.04, 0.29, 0.28), ball(0.12, c, 0.24, 0.27, 0.26));
  } else if (style === 'longStraight') {
    head.add(rbox(0.82, 0.22, 0.7, c, 0, 0.3, -0.01, 0.1));
    head.add(rbox(0.86, 1.02, 0.3, c, 0, -0.25, -0.2, 0.12));
    head.add(rbox(0.16, 0.96, 0.5, c, -0.41, -0.22, -0.03, 0.07), rbox(0.16, 0.96, 0.5, c, 0.41, -0.22, -0.03, 0.07));
    for (const x of [-0.3, -0.1, 0.1, 0.3]) head.add(rbox(0.04, 0.8, 0.02, dk, x, -0.3, -0.36, 0.01)); // strands
    const b1 = rbox(0.3, 0.17, 0.08, c, -0.16, 0.24, 0.3, 0.05); b1.rotation.z = 0.35;
    const b2 = rbox(0.28, 0.15, 0.08, c, 0.14, 0.25, 0.3, 0.05); b2.rotation.z = -0.2;
    head.add(b1, b2);
  } else if (style === 'messy') {
    head.add(rbox(0.82, 0.22, 0.7, c, 0, 0.3, -0.01, 0.1));
    head.add(rbox(0.82, 0.56, 0.32, c, 0, 0.02, -0.17, 0.12));
    head.add(rbox(0.16, 0.5, 0.48, c, -0.4, -0.04, -0.03, 0.06), rbox(0.16, 0.5, 0.48, c, 0.4, -0.04, -0.03, 0.06));
    [-0.25, -0.08, 0.09, 0.25].forEach((x, i) => {
      const s = rbox(0.17, 0.24, 0.08, i % 2 ? dk : c, x, 0.2, 0.3, 0.05);
      s.rotation.z = i % 2 ? -0.35 : 0.3;
      head.add(s);
    });
    for (const sx of [-1, 1]) { const t = rbox(0.14, 0.2, 0.14, dk, sx * 0.45, -0.28, 0.02, 0.05); t.rotation.z = sx * 0.6; head.add(t); }
  }
}

// ---------------------------------------------------------------- hats
function addHat(head, [style, c, c2]) {
  if (style === 'goggles') {
    head.add(rbox(0.86, 0.07, 0.72, '#f3e9d2', 0, 0.3, 0, 0.03));
    for (const x of [-0.16, 0.16]) {
      const gog = new THREE.Group();
      gog.add(rbox(0.26, 0.18, 0.09, '#f3e9d2', 0, 0, 0, 0.06), rbox(0.19, 0.12, 0.04, '#b9b6e8', 0, 0, 0.04, 0.04));
      gog.position.set(x, 0.43, 0.2);
      gog.rotation.x = -0.6;
      head.add(gog);
    }
  } else if (style === 'wideBrim') {
    const hat = new THREE.Group();
    hat.add(shade(new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.68, 0.05, 28), mat(c))));
    hat.add(rbox(0.6, 0.32, 0.56, c, 0, 0.17, 0, 0.12));
    hat.add(rbox(0.62, 0.08, 0.58, c2, 0, 0.07, 0, 0.03));
    hat.position.set(0, 0.38, -0.02);
    hat.rotation.x = -0.08;
    head.add(hat);
  } else if (style === 'beret') {
    const b = shade(new THREE.Mesh(new THREE.SphereGeometry(0.47, 18, 10), mat(c)));
    b.scale.set(1, 0.36, 1);
    b.position.set(0.06, 0.4, -0.02);
    b.rotation.z = -0.18;
    head.add(b);
    head.add(rbox(0.06, 0.1, 0.06, c, 0.08, 0.58, -0.02, 0.025));
  } else if (style === 'backCap') {
    // baseball cap worn backwards: brim points behind the head
    const dome = shade(new THREE.Mesh(new THREE.SphereGeometry(0.43, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(c)));
    dome.scale.set(1.13, 0.8, 1.13);
    dome.position.y = 0.24;
    head.add(dome);
    head.add(rbox(0.9, 0.07, 0.82, c, 0, 0.25, 0, 0.03));                           // cap band
    const brim = rbox(0.56, 0.06, 0.34, c, 0, 0.27, -0.56, 0.03);
    brim.rotation.x = -0.1;
    head.add(brim);
    head.add(rbox(0.07, 0.05, 0.07, c2, 0, 0.56, 0, 0.02));                         // button on top
    head.add(rbox(0.26, 0.12, 0.03, c2, 0, 0.34, 0.43, 0.03));                       // snapback strap at the front
  }
}

// ---------------------------------------------------------------- clothes
function paintApron(g, w, h) {
  g.fillStyle = '#f6ecd8';
  roundRect(g, 0, 0, w, h, 22); g.fill();
  const splats = [['#e04848', 0.25, 0.25, 0.09], ['#f2b632', 0.7, 0.2, 0.08], ['#3a9ad9', 0.3, 0.6, 0.08], ['#3fae6a', 0.72, 0.5, 0.07],
                  ['#e04848', 0.55, 0.78, 0.06], ['#f2b632', 0.2, 0.85, 0.05], ['#9b59d0', 0.5, 0.38, 0.05]];
  for (const [col, x, y, r] of splats) {
    g.fillStyle = col;
    g.beginPath();
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2, rr = r * w * (i % 2 ? 0.7 : 1);
      g.lineTo(x * w + Math.cos(a) * rr, y * h + Math.sin(a) * rr);
    }
    g.fill();
    g.beginPath(); g.arc(x * w + r * w * 1.4, y * h - r * w * 0.6, r * w * 0.25, 0, Math.PI * 2); g.fill();
  }
  // pocket
  g.strokeStyle = '#d8c7a6'; g.lineWidth = 6;
  roundRect(g, w * 0.52, h * 0.55, w * 0.36, h * 0.3, 10); g.stroke();
}

function addBrushes(body, x, y, z) {
  [['#e04848', -0.05], ['#3a9ad9', 0.0], ['#f2b632', 0.05]].forEach(([tip, dx], i) => {
    const stick = shade(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.26, 6), mat('#c99a63')));
    stick.position.set(x + dx, y + 0.06 + i * 0.02, z);
    stick.rotation.z = dx * 3;
    const t = shade(new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.07, 6), mat(tip)));
    t.position.y = 0.16;
    stick.add(t);
    body.add(stick);
  });
}

function addTop(body, spec, kind) {
  if (kind === 'coatGirl' || kind === 'coatBoy') {
    const coat = '#ecdcbc', coatShade = '#dcc59e';
    body.add(rbox(0.7, 0.72, 0.46, coat, 0, 0.8, 0, 0.12));
    body.add(rbox(0.76, 0.22, 0.5, coatShade, 0, 0.5, 0, 0.08));
    const sweater = kind === 'coatGirl' ? '#8a5a3c' : '#4f7a3a';
    body.add(rbox(0.26, 0.62, 0.05, sweater, 0.03, 0.84, 0.225, 0.03));
    body.add(rbox(0.04, 0.6, 0.05, coatShade, -0.12, 0.82, 0.235, 0.02));
    // orange scarf
    body.add(rbox(0.62, 0.17, 0.52, '#e8792b', 0, 1.15, 0, 0.08));
    const tail = rbox(0.15, 0.44, 0.06, '#e8792b', 0.17, 0.93, 0.27, 0.04);
    tail.rotation.z = 0.12;
    body.add(tail);
    if (kind === 'coatBoy') {
      for (let i = 0; i < 4; i++) body.add(rbox(0.22, 0.025, 0.02, '#3f6a2e', 0.03, 0.62 + i * 0.12, 0.252, 0.01)); // knit lines
      const strap = rbox(0.07, 0.95, 0.04, '#6b4426', 0.02, 0.86, 0.27, 0.02);
      strap.rotation.z = -0.62;
      body.add(strap);
      body.add(rbox(0.32, 0.28, 0.14, '#8a5a32', -0.36, 0.6, 0.12, 0.05), rbox(0.33, 0.1, 0.15, '#6b4426', -0.36, 0.7, 0.12, 0.04));
    }
  } else if (kind === 'apronGirl' || kind === 'apronBoy') {
    const shirt = kind === 'apronGirl' ? '#7b5cc8' : '#6a4fb8';
    body.add(rbox(0.66, 0.66, 0.44, shirt, 0, 0.82, 0, 0.12));
    body.add(rbox(0.68, 0.14, 0.46, spec.pants, 0, 0.5, 0, 0.06));
    body.add(rbox(0.56, 0.64, 0.04, '#f6ecd8', 0, 0.76, 0.235, 0.03));
    body.add(decal(0.52, 0.6, paintApron, 0, 0.76, 0.258));
    body.add(rbox(0.05, 0.22, 0.03, '#f6ecd8', -0.2, 1.08, 0.235, 0.015), rbox(0.05, 0.22, 0.03, '#f6ecd8', 0.2, 1.08, 0.235, 0.015));
    addBrushes(body, 0.12, 0.62, 0.262);
    if (kind === 'apronBoy') body.add(rbox(0.6, 0.16, 0.5, '#7b5cc8', 0, 1.15, 0, 0.08));
    else body.add(rbox(0.56, 0.1, 0.46, shirt, 0, 1.15, 0, 0.05));
  } else if (kind === 'teeGirl' || kind === 'teeBoy') {
    const tee = '#f08a3c';
    body.add(rbox(0.68, 0.64, 0.44, tee, 0, 0.83, 0, 0.12));
    body.add(rbox(0.7, 0.14, 0.46, spec.pants, 0, 0.5, 0, 0.06));
    body.add(decal(0.4, 0.36, (g, w, h) => {
      g.strokeStyle = '#fff6ea'; g.fillStyle = '#fff6ea'; g.lineWidth = w * 0.05; g.lineCap = 'round';
      if (kind === 'teeGirl') {
        g.beginPath();
        for (let a = 0; a < Math.PI * 5; a += 0.15) {
          const r = (a / (Math.PI * 5)) * w * 0.42;
          g.lineTo(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r);
        }
        g.stroke();
      } else {
        g.beginPath(); g.arc(w / 2, h * 0.55, w * 0.34, 0, Math.PI * 2); g.stroke();
        g.beginPath(); g.arc(w * 0.38, h * 0.48, w * 0.04, 0, Math.PI * 2); g.arc(w * 0.62, h * 0.48, w * 0.04, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(w / 2, h * 0.58, w * 0.16, 0.2, Math.PI - 0.2); g.stroke();
        g.font = `${w * 0.28}px ${DISPLAY}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('★', w * 0.82, h * 0.16);
      }
    }, 0, 0.84, 0.226));
    // bandana around the neck
    body.add(rbox(0.56, 0.12, 0.48, '#e0702a', 0, 1.15, 0, 0.05));
    const tri = new THREE.Mesh(new THREE.CircleGeometry(0.16, 3), mat('#e0702a'));
    tri.rotation.z = -Math.PI / 2;
    tri.position.set(0, 1.05, 0.244);
    body.add(tri);
  }
}

// ---------------------------------------------------------------- name tag
export function makeNameTag(name, color) {
  const ct = canvasTexture(512, 128, (g, w) => {
    g.font = `400 64px ${DISPLAY}`;
    const tw = Math.min(g.measureText(name).width + 76, w - 8);
    g.fillStyle = 'rgba(255,250,242,0.94)';
    roundRect(g, (w - tw) / 2, 20, tw, 88, 44); g.fill();
    g.fillStyle = color; g.beginPath(); g.arc((w - tw) / 2 + 36, 64, 11, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2a2346'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(name, w / 2 + 12, 68, w - 96);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: ct.tex, depthTest: false }));
  s.scale.set(1.6, 0.4, 1);
  s.renderOrder = 10;
  return s;
}

// ---------------------------------------------------------------- whole avatar
export function makeAvatar(name, charId) {
  const spec = SPECS[charId] || SPECS.travelerGirl;
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);

  const legW = spec.baggy ? 0.26 : 0.22;
  const legs = [-0.14, 0.14].map((x) => {
    const leg = new THREE.Group();
    leg.add(rbox(legW, 0.32, legW + 0.02, spec.pants, 0, -0.13, 0, 0.06));
    if (spec.baggy) leg.add(rbox(legW + 0.02, 0.06, legW + 0.04, '#7d9bd6', 0, -0.25, 0, 0.02)); // rolled cuffs
    if (spec.shoes === '#f5f5f5') {
      leg.add(rbox(0.27, 0.13, 0.34, '#f5f5f5', 0, -0.33, 0.04, 0.06), rbox(0.28, 0.04, 0.35, '#c9ccd6', 0, -0.39, 0.04, 0.015));
    } else {
      leg.add(rbox(0.26, 0.15, 0.32, spec.shoes, 0, -0.34, 0.03, 0.06));
    }
    leg.position.set(x, 0.42, 0);
    body.add(leg);
    return leg;
  });

  addTop(body, spec, spec.top);

  const head = new THREE.Group();
  head.position.set(0, 1.52, 0);
  head.add(rbox(0.72, 0.68, 0.62, spec.skin, 0, 0, 0, 0.22));
  addFace(head, spec);
  addHair(head, spec.hair);
  addHat(head, spec.hat);
  body.add(head);

  const hands = [-0.52, 0.52].map((x) => {
    const m = makeHand(charId);
    if (x > 0) m.scale.x = -1;
    m.userData.dynamic = true;
    m.position.set(x, 0.78, 0.06);
    body.add(m);
    return m;
  });

  // combine each moving part into as few pieces as possible
  for (const part of [...legs, ...hands, head]) { part.userData.dynamic = true; freezeStatic(part); }
  freezeStatic(body);

  if (name) {
    const tag = makeNameTag(name, charInfo(charId).accent);
    tag.position.y = 2.4;
    g.add(tag);
  }
  g.userData = { body, legs, hands, head, phase: 0 };
  return g;
}
