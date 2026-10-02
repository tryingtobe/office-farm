// The six village buildings. Each one has a construction site (level 0) and grows to level 4.
import * as THREE from 'three';
import { house, piece, FACE } from './kit.js';

// Buildings are drawn larger than the 1-unit kit grid so they tower over the villagers, like in a settlers game.
const SCALE = 1.5;
const STONE = { wall: 'wall', window: 'wall-window-shutters', door: 'wall-door' };
const WOOD = { wall: 'wall-wood', window: 'wall-wood-window-shutters', door: 'wall-wood-door' };

// d = depth in cells, f = floors, high = tall red roof. Width is always 2 cells (the roof pieces need that).
const DESIGNS = {
  office:     { walls: STONE, sizes: [{ d: 2, f: 1 }, { d: 3, f: 1 }, { d: 3, f: 2, high: true }, { d: 3, f: 2, high: true }] },
  conference: { walls: WOOD,  sizes: [{ d: 2, f: 1 }, { d: 3, f: 1 }, { d: 4, f: 1 }, { d: 4, f: 2 }] },
  store:      { walls: WOOD,  sizes: [{ d: 2, f: 1 }, { d: 2, f: 1 }, { d: 2, f: 2 }, { d: 3, f: 2 }] },
  fridge:     { walls: STONE, sizes: [{ d: 2, f: 1 }, { d: 2, f: 1 }, { d: 3, f: 1 }, { d: 3, f: 2 }], tint: '#cfeeff' },
  gameroom:   { walls: STONE, sizes: [{ d: 2, f: 1, high: true }, { d: 2, f: 2, high: true }, { d: 3, f: 2, high: true }, { d: 3, f: 2, high: true }] },
  bathroom:   { walls: WOOD,  sizes: [{ d: 2, f: 1 }, { d: 2, f: 1 }, { d: 2, f: 2 }, { d: 2, f: 2 }] },
};

async function tower(floors, x, z) {
  const g = new THREE.Group();
  const jobs = [];
  for (let f = 0; f < floors; f++) {
    for (const s of ['px', 'nx', 'pz', 'nz']) {
      jobs.push(piece(f % 2 ? 'town/wall-window-shutters' : 'town/wall', { y: f, rot: FACE[s] }));
    }
  }
  jobs.push(piece('town/roof-high-point', { y: floors }));
  (await Promise.all(jobs)).forEach(o => g.add(o));
  g.position.set(x, 0, z);
  return g;
}

async function constructionSite() {
  const g = new THREE.Group();
  const parts = await Promise.all([
    piece('town/planks', { x: -0.5, z: -0.5 }), piece('town/planks', { x: 0.5, z: -0.5 }),
    piece('town/planks', { x: -0.5, z: 0.5 }), piece('town/planks', { x: 0.5, z: 0.5 }),
    piece('town/poles', { x: 0.5, z: -0.5, rot: FACE.px }), piece('town/poles', { x: -0.5, z: -0.5, rot: FACE.nx }),
    piece('town/wall-broken', { x: -0.5, z: -0.5, rot: FACE.nz }),
    piece('nature/log_stack', { x: 1.6, z: 0.6, scale: 1.6 }),
    piece('town/cart', { x: -1.7, z: 0.8, rot: 0.6 }),
  ]);
  parts.forEach(o => g.add(o));
  return g;
}

// Props stand in front of the door (+z side) and grow with the level.
async function props(id, level, depth) {
  const front = depth / 2 + 0.9;
  const list = [];
  const add = (path, x, z, opts = {}) => list.push(piece(path, { x, z, ...opts }));
  if (level >= 2) add('town/lantern', -1.3, front - 0.4);
  if (level >= 3) add('town/lantern', 1.3, front - 0.4);
  if (id === 'office') {
    if (level >= 2) add('town/banner-red', 0, -depth / 2 + 0.4, { y: 1, rot: FACE.nz });
    if (level >= 4) add('town/fountain-round-detail', 0, front + 1.6);
  }
  if (id === 'store') {
    const stalls = ['town/stall-red', 'town/stall-green', 'town/stall', 'town/stall-red'];
    for (let i = 0; i < level; i++) add(stalls[i], -1.8 + i * 1.2, front + 0.6, { rot: Math.PI });
    if (level >= 4) add('town/cart', 2.4, front - 0.6, { rot: -0.5 });
  }
  if (id === 'fridge') {
    for (let i = 0; i < Math.min(level, 3); i++) add('nature/crop_pumpkin', -1 + i * 0.45, front, { scale: 1.6 });
    if (level >= 2) add('nature/log_stack', 1.4, front - 0.3, { scale: 1.5 });
    if (level >= 4) add('town/cart', 2.3, front, { rot: 0.4 });
  }
  if (id === 'gameroom') {
    if (level >= 2) add('town/banner-green', 0, -depth / 2 + 0.4, { y: 1, rot: FACE.nz });
    if (level >= 4) add('town/fountain-round', 0, front + 1.4);
  }
  if (id === 'conference') {
    if (level >= 2) add('town/stall-bench', 0, front + 0.3);
    if (level >= 4) add('town/banner-green', 0, -depth / 2 + 0.4, { y: 1, rot: FACE.nz });
  }
  if (id === 'bathroom') {
    if (level >= 2) add('town/fountain-corner', 1.6, front - 0.4, { scale: 0.7 });
    if (level >= 4) add('nature/plant_bushLarge', -1.6, front - 0.6, { scale: 2.5 });
  }
  return Promise.all(list);
}

function tintRoofs(group, color) {
  group.traverse(o => {
    if (o.isMesh && o.parent?.name?.startsWith('roof')) {
      o.material = o.material.clone();
      o.material.color.set(color);
    }
  });
}

export async function buildBuilding(b) {
  const g = new THREE.Group();
  const design = DESIGNS[b.id];
  let height = 1;
  let depth = 2;
  if (b.level === 0) {
    g.add(await constructionSite());
  } else {
    const size = design.sizes[b.level - 1];
    depth = size.d;
    height = size.f + (size.high ? 1.1 : 0.6);
    const main = await house({ w: 2, d: size.d, floors: size.f, roofHigh: !!size.high, ...design.walls });
    if (design.tint) tintRoofs(main, design.tint);
    g.add(main);
    if (b.id === 'office' && b.level >= 3) g.add(await tower(3, 1.5, -size.d / 2 + 0.5));
    if (b.id === 'office' && b.level >= 4) g.add(await tower(2, -1.5, -size.d / 2 + 0.5));
    if (b.id === 'office' && b.level >= 3) height = 4;
  }
  (await props(b.id, b.level, depth)).forEach(o => g.add(o));
  g.scale.setScalar(SCALE);
  g.position.set(b.x, 0, b.z);
  // turn the door (+z) to face the village square at (0, 0)
  g.rotation.y = Math.atan2(-b.x, -b.z);
  g.userData.pick = { type: 'building', id: b.id };
  g.userData.labelHeight = height + 0.6; // label is a child of g, so it is scaled with it
  g.userData.door = new THREE.Vector3(0, 0, (depth / 2 + 0.8) * SCALE).applyAxisAngle(new THREE.Vector3(0, 1, 0), g.rotation.y)
    .add(g.position);
  return g;
}
