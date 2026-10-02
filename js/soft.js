// Soft, rounded shapes: puffy trees, rounded slabs and bell-shaped mountains.
import * as THREE from 'three';

const mats = new Map();
export function softMat(color) {
  if (!mats.has(color)) mats.set(color, new THREE.MeshLambertMaterial({ color }));
  return mats.get(color);
}

const BLOB = new THREE.SphereGeometry(1, 20, 14);
const TRUNK = new THREE.CylinderGeometry(0.1, 0.16, 1, 10);
const CONE = new THREE.ConeGeometry(1, 1, 18);
const TRUNK_COLOR = '#8a5a3b';

function add(g, geo, mat, x, y, z, sx, sy = sx, sz = sx) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

/**
 * A rounded cartoon tree, about `size` units tall.
 * kind: 'round' (puffy crown), 'tall' (poplar) or 'pine' (soft stacked cones).
 * Returns the group; group.userData.crown = { y, r } for placing fruit.
 */
export function softTree(kind, leafColor, size = 3, seed = 0) {
  const g = new THREE.Group();
  const leaf = softMat(leafColor);
  const r = n => ((Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  if (kind === 'pine') {
    add(g, TRUNK, softMat(TRUNK_COLOR), 0, size * 0.12, 0, size * 0.9, size * 0.25, size * 0.9);
    [[0.3, 0.32, 0.42], [0.55, 0.25, 0.36], [0.78, 0.17, 0.3]].forEach(([y, w, h]) =>
      add(g, CONE, leaf, 0, size * y, 0, size * w, size * h, size * w));
    g.userData.crown = { y: size * 0.5, r: size * 0.25 };
    return g;
  }
  if (kind === 'tall') {
    add(g, TRUNK, softMat(TRUNK_COLOR), 0, size * 0.15, 0, size * 0.8, size * 0.3, size * 0.8);
    add(g, BLOB, leaf, 0, size * 0.58, 0, size * 0.2, size * 0.42, size * 0.2);
    g.userData.crown = { y: size * 0.58, r: size * 0.2 };
    return g;
  }
  // round: a big blob with a few smaller puffs around it
  const cy = size * 0.62, cr = size * 0.3;
  add(g, TRUNK, softMat(TRUNK_COLOR), 0, size * 0.22, 0, size * 0.9, size * 0.44, size * 0.9);
  add(g, BLOB, leaf, 0, cy, 0, cr);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + r(i) * 1.5;
    add(g, BLOB, leaf, Math.cos(a) * cr * 0.65, cy - cr * 0.25 + r(i + 5) * cr * 0.4, Math.sin(a) * cr * 0.65, cr * (0.6 + r(i + 9) * 0.15));
  }
  add(g, BLOB, leaf, 0, cy + cr * 0.6, 0, cr * 0.6);
  g.userData.crown = { y: cy, r: cr };
  return g;
}

/** A flat slab w (x) by d (z), h thick, with rounded corners and soft edges. */
export function roundedSlab(w, d, h, radius, color) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -d / 2;
  s.moveTo(x + radius, y);
  s.lineTo(x + w - radius, y);
  s.quadraticCurveTo(x + w, y, x + w, y + radius);
  s.lineTo(x + w, y + d - radius);
  s.quadraticCurveTo(x + w, y + d, x + w - radius, y + d);
  s.lineTo(x + radius, y + d);
  s.quadraticCurveTo(x, y + d, x, y + d - radius);
  s.lineTo(x, y + radius);
  s.quadraticCurveTo(x, y, x + radius, y);
  const bevel = Math.min(h * 0.6, radius * 0.5);
  const geo = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, h - bevel * 2), bevelEnabled: true,
    bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 8 });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, bevel, 0);
  const m = new THREE.Mesh(geo, softMat(color));
  m.receiveShadow = true;
  return m;
}

/**
 * A smooth bell-shaped mountain: a soft rounded peak and a gentle foot.
 * `until` < 1 makes only the top part (for a snow cap); `grow` pushes it slightly outward.
 */
export function bellGeometry(radius, height, until = 1, grow = 0) {
  const pts = [];
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const s = until * (1 - i / steps); // s: distance from the middle, 1 at the foot, 0 at the peak
    const y = height * (Math.exp(-4 * s * s) - Math.exp(-4)) / (1 - Math.exp(-4)); // rounded peak, gently curved slopes
    pts.push(new THREE.Vector2(s * radius * (1 + grow), y + grow * height * 0.02));
  }
  return new THREE.LatheGeometry(pts, 32);
}
