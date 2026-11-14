// Small building blocks shared by the characters and the maps
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const FONT = "'Nunito', system-ui, sans-serif";
export const DISPLAY = "'Lilita One', 'Nunito', system-ui, sans-serif";

export function shade(mesh, cast = true) { mesh.castShadow = cast; mesh.receiveShadow = true; return mesh; }

export function mat(color, extra = {}) { return new THREE.MeshLambertMaterial({ color, ...extra }); }

export function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const m = shade(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color)));
  m.position.set(x, y, z);
  return m;
}

// soft, rounded box: the friendly "toy" look
export function rbox(w, h, d, color, x = 0, y = 0, z = 0, r = 0.08) {
  const rad = Math.max(0.001, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
  const m = shade(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, rad), mat(color)));
  m.position.set(x, y, z);
  return m;
}

export function ball(r, color, x = 0, y = 0, z = 0, detail = 1) {
  const m = shade(new THREE.Mesh(new THREE.IcosahedronGeometry(r, detail), mat(color)));
  m.position.set(x, y, z);
  return m;
}

export function glow(color, opacity = 1) {
  return new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity });
}

export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  draw(g, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { canvas: c, ctx: g, tex };
}

export function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// a flat picture stuck onto something (shirt graphics, paint splatter, signs)
export function decal(w, h, draw, x = 0, y = 0, z = 0, ppu = 256) {
  const ct = canvasTexture(Math.round(w * ppu), Math.round(h * ppu), draw);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: ct.tex, transparent: true }));
  m.position.set(x, y, z);
  m.userData.ct = ct;
  return m;
}

// a sign that ignores lighting, so it is always easy to read
export function makeSign(width, height, draw, ppu = 128) {
  const ct = canvasTexture(Math.round(width * ppu), Math.round(height * ppu), draw);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: ct.tex, transparent: true }));
  mesh.userData.ct = ct;
  return mesh;
}

export function drawFlag(g, flag, x, y, w, h) {
  g.save();
  roundRect(g, x, y, w, h, h * 0.14);
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
}

// a triangular roof shape (prism) pointing up, running along the x axis
export function roofPrism(width, depth, height, color) {
  const shape = new THREE.Shape();
  shape.moveTo(-depth / 2, 0); shape.lineTo(depth / 2, 0); shape.lineTo(0, height); shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false });
  geo.translate(0, 0, -width / 2);
  geo.rotateY(Math.PI / 2);
  return shade(new THREE.Mesh(geo, mat(color)));
}

// ---------------------------------------------------------------- speed-up
// Combines every non-moving, single-colored part inside `root` into one mesh per color.
// Fewer meshes = far less work for the graphics card each frame.
// Anything marked userData.dynamic (and everything inside it) is left alone.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
export function freezeStatic(root) {
  root.updateMatrixWorld(true);
  const toRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const victims = [];
  const rel = new THREE.Matrix4();
  (function walk(o, isRoot) {
    if (!isRoot && o.userData.dynamic) return;
    for (const c of o.children) walk(c, false);
    if (!o.isMesh || o.isInstancedMesh) return;
    const m = o.material;
    if (Array.isArray(m) || m.map || m.transparent || !(m.isMeshLambertMaterial || m.isMeshBasicMaterial)) return;
    rel.multiplyMatrices(toRoot, o.matrixWorld);
    if (rel.determinant() < 0) return;
    let geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    if (!geo.attributes.normal || !geo.attributes.uv) return;
    for (const name of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(name)) geo.deleteAttribute(name);
    geo.clearGroups();
    geo.applyMatrix4(rel);
    const key = [m.type, m.color.getHexString(), m.emissive ? m.emissive.getHexString() + m.emissiveIntensity : '', m.side, o.castShadow, o.receiveShadow].join('|');
    if (!buckets.has(key)) buckets.set(key, { mat: m, cast: o.castShadow, recv: o.receiveShadow, geos: [] });
    buckets.get(key).geos.push(geo);
    victims.push(o);
  })(root, true);
  for (const v of victims) v.parent.remove(v);
  for (const b of buckets.values()) {
    const merged = new THREE.Mesh(mergeGeometries(b.geos, false), b.mat);
    merged.castShadow = b.cast; merged.receiveShadow = b.recv;
    root.add(merged);
  }
  return root;
}
