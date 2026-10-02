// Ground, paths, fields, orchard, forest and falling leaves.
import * as THREE from 'three';
import { piece, FACE } from './kit.js';
import { hash } from './logic.js';

const rand = seed => (hash(String(seed)) % 10000) / 10000;

// The kit's fall leaves are one pale orange; give each tree its own autumn colour.
const FALL = ['#d9541e', '#e8892a', '#b8321a', '#efae2c', '#c9661f'];
const PINE = '#2f6b4a';
const recolored = new Map();
function recolor(obj, seed) {
  obj.traverse(o => {
    if (!o.isMesh) return;
    const name = o.material.name;
    const color = name === 'leafsFall' ? FALL[hash(String(seed)) % FALL.length] : name === 'leafsDark' ? PINE : null;
    if (!color) return;
    const key = name + color;
    if (!recolored.has(key)) {
      const m = o.material.clone();
      m.color.set(color);
      recolored.set(key, m);
    }
    o.material = recolored.get(key);
  });
  return obj;
}

// Two rows of five plots south of the square. Each plot opens to a path on its -z side.
export const PLOT_SPOTS = [7.5, 12].flatMap(z => [-8, -4, 0, 4, 8].map(x => ({ x, z })));

export function ground(scene) {
  const geo = new THREE.PlaneGeometry(90, 90, 60, 60);
  const colors = [];
  const c = new THREE.Color();
  for (let i = 0; i < geo.attributes.position.count; i++) {
    const n = rand('ground' + i);
    c.set(n > 0.85 ? '#a7a948' : n > 0.4 ? '#8fa543' : '#82993c');
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = true;
  scene.add(mesh);

  // village square
  const square = new THREE.Mesh(new THREE.CircleGeometry(4.2, 40),
    new THREE.MeshLambertMaterial({ color: '#cdb28a' }));
  square.rotation.x = -Math.PI / 2;
  square.position.y = 0.01;
  square.receiveShadow = true;
  scene.add(square);
}

export function path(scene, from, to, width = 1.1) {
  const dx = to.x - from.x, dz = to.z - from.z;
  const len = Math.hypot(dx, dz);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, len),
    new THREE.MeshLambertMaterial({ color: '#c9a978' }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = -Math.atan2(dx, dz) + Math.PI;
  mesh.position.set((from.x + to.x) / 2, 0.008, (from.z + to.z) / 2);
  mesh.receiveShadow = true;
  scene.add(mesh);
}

const CROPS = {
  corn:    [null, 'crops_cornStageA', 'crops_cornStageB', 'crops_cornStageD'],
  wheat:   [null, 'crops_leafsStageA', 'crops_wheatStageA', 'crops_wheatStageB'],
  pumpkin: [null, 'crops_leafsStageA', 'crops_leafsStageB', 'crop_pumpkin'],
  carrot:  [null, 'crops_leafsStageA', 'crops_leafsStageB', 'crop_carrot'],
  turnip:  [null, 'crops_leafsStageA', 'crops_leafsStageB', 'crop_turnip'],
  melon:   [null, 'crops_leafsStageA', 'crops_leafsStageB', 'crop_melon'],
  sunflower: [null, 'plant_flatShort', 'plant_bushSmall', 'flower_yellowA'],
  rose:      [null, 'plant_flatShort', 'plant_bushSmall', 'flower_redA'],
  aster:     [null, 'plant_flatShort', 'plant_bushSmall', 'flower_purpleA'],
};
const FARM_CROPS = ['pumpkin', 'corn', 'wheat', 'carrot', 'turnip', 'melon'];
const GARDEN_CROPS = ['sunflower', 'rose', 'aster'];

// A small hand-made prop for shop items that the kits don't have.
function simpleProp(id) {
  const g = new THREE.Group();
  const mat = color => new THREE.MeshLambertMaterial({ color });
  const box = (w, h, d, color, y = h / 2) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    m.position.y = y; m.castShadow = true; g.add(m); return m;
  };
  if (id === 'hay-bale') { box(0.6, 0.35, 0.4, '#e3c45a'); }
  if (id === 'scarecrow') {
    box(0.06, 1.1, 0.06, '#8b5a2b');
    box(0.7, 0.06, 0.06, '#8b5a2b', 0.8);
    box(0.32, 0.4, 0.18, '#7a3b69', 0.75);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), mat('#f07b1f'));
    head.position.y = 1.15; g.add(head);
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.18, 10), mat('#c9a14a'));
    hat.position.y = 1.32; g.add(hat);
  }
  if (id === 'beehive') {
    box(0.08, 0.4, 0.08, '#8b5a2b');
    [0.5, 0.62, 0.72].forEach((y, i) => {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.2 - i * 0.04, 0.22 - i * 0.04, 0.13, 12), mat('#f5b82e'));
      ring.position.y = y; ring.castShadow = true; g.add(ring);
    });
    const bee = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), mat('#2b1d14'));
    bee.userData.bee = true; g.add(bee);
  }
  return g;
}

async function decorPiece(id) {
  if (id === 'lantern') return piece('town/lantern', { scale: 0.8 });
  if (id === 'pumpkin-cart') {
    const g = new THREE.Group();
    g.add(await piece('town/cart'));
    for (const z of [-0.2, 0.2]) g.add(await piece('nature/crop_pumpkin', { y: 0.35, z }));
    return g;
  }
  return simpleProp(id);
}

export async function plot(person, spot) {
  const g = new THREE.Group();
  g.position.set(spot.x, 0, spot.z);
  const soil = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.06, 3), new THREE.MeshLambertMaterial({ color: '#6e4a2c' }));
  soil.position.y = 0.03;
  soil.receiveShadow = true;
  g.add(soil);

  const kinds = person.role === 'gardener' ? GARDEN_CROPS : FARM_CROPS;
  const kind = kinds[person.index % kinds.length];
  const planted = Math.min(9, 1 + (person.role === 'gardener' ? person.counts.tickets : person.counts.prs));
  const jobs = [];
  for (let row = 0; row < 3; row++) {
    jobs.push(piece('nature/crops_dirtRow', { x: 0, z: -1 + row, scale: 2.8 }).then(o => { o.scale.y = 1; o.scale.z = 1.4; return o; }));
    for (let col = 0; col < 3; col++) {
      const i = row * 3 + col;
      if (i >= planted) continue;
      const stage = Math.max(1, Math.min(3, Math.floor((person.counts.standups - i + 2) / 3)));
      const model = CROPS[kind][stage];
      jobs.push(piece(`nature/${model}`, { x: -1 + col, z: -1 + row, scale: person.role === 'gardener' ? 2.8 : 2, rot: rand(person.id + i) * 6 }));
    }
  }
  // fence on three sides, open towards the path (-z); the fence model sits on its cell's -z edge
  for (let i = -1; i <= 1; i++) {
    jobs.push(piece('nature/fence_simple', { x: i, z: 1, rot: Math.PI }));
    jobs.push(piece('nature/fence_simple', { x: 1.1, z: i, rot: -Math.PI / 2 }));
    jobs.push(piece('nature/fence_simple', { x: -1.1, z: i, rot: Math.PI / 2 }));
  }
  (await Promise.all(jobs)).forEach(o => g.add(o));

  // shop decorations stand around the outside corners
  const corners = [[1.9, -1.2], [-1.9, -1.2], [2.1, 0.4], [-2.1, 0.4], [2.1, 1.6]];
  for (const [i, item] of person.decor.entries()) {
    const d = await decorPiece(item.id);
    const [x, z] = corners[i % corners.length];
    d.position.set(x, 0, z);
    g.add(d);
  }
  g.userData.pick = { type: 'person', id: person.id };
  g.userData.work = new THREE.Vector3(spot.x + (rand(person.id) - 0.5) * 2, 0, spot.z - 1.9);
  return g;
}

export async function orchard(scene, releases, tickets) {
  const count = Math.min(10, 2 + releases);
  const fruitColors = ['#c0211f', '#d9c13a', '#ff8c1a'];
  const fruitPerTree = Math.min(10, Math.ceil(tickets / count));
  for (let i = 0; i < count; i++) {
    const x = 14 + (i % 2) * 2.6 + (Math.floor(i / 2) % 2) * 1.3;
    const z = 6 + Math.floor(i / 2) * 2.6;
    const tree = recolor(await piece(i % 2 ? 'nature/tree_oak_fall' : 'nature/tree_default_fall', { x, z, scale: 2.3 }), 'orchard' + i);
    scene.add(tree);
    const mat = new THREE.MeshLambertMaterial({ color: fruitColors[i % 3] });
    for (let f = 0; f < fruitPerTree; f++) {
      const a = rand(`f${i}-${f}`) * Math.PI * 2;
      const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), mat);
      fruit.position.set(x + Math.cos(a) * 0.62, 1.7 + rand(`h${i}-${f}`) * 1.1, z + Math.sin(a) * 0.62);
      scene.add(fruit);
    }
  }
  return count;
}

export async function scenery(scene) {
  const jobs = [];
  // forest ring
  for (let i = 0; i < 150; i++) {
    const a = rand('a' + i) * Math.PI * 2;
    const r = 23 + rand('r' + i) * 16;
    const x = Math.cos(a) * r, z = Math.sin(a) * r * 0.9;
    const kinds = ['tree_pineTallA', 'tree_pineRoundB', 'tree_default_fall', 'tree_fat_fall', 'tree_pineTallC', 'tree_blocks_fall', 'tree_tall_fall'];
    const kind = kinds[hash('k' + i) % kinds.length];
    jobs.push(piece(`nature/${kind}`, { x, z, scale: 2.4 + rand('s' + i) * 1.2, rot: rand('t' + i) * 6 }).then(o => recolor(o, i)));
  }
  // rocks, bushes, mushrooms and flowers scattered over the meadow
  const small = ['stone_smallA', 'stone_largeB', 'plant_bushLarge', 'plant_bush', 'mushroom_redGroup', 'flower_redA', 'flower_yellowB', 'flower_purpleC', 'log', 'mushroom_tanGroup'];
  for (let i = 0; i < 110; i++) {
    const x = (rand('x' + i) - 0.5) * 44, z = (rand('z' + i) - 0.5) * 40;
    if (Math.abs(x) < 19 && z > -19 && z < 16) continue; // keep the village clear
    jobs.push(piece(`nature/${small[i % small.length]}`, { x, z, scale: 1.8, rot: rand('q' + i) * 6 }));
  }
  (await Promise.all(jobs)).forEach(o => scene.add(o));
}

export function leaves(scene) {
  const count = 180;
  const geo = new THREE.PlaneGeometry(0.12, 0.09);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), count);
  const palette = ['#c8371d', '#f07b1f', '#f5b82e', '#a0522d'].map(c => new THREE.Color(c));
  const state = [];
  for (let i = 0; i < count; i++) {
    mesh.setColorAt(i, palette[i % 4]);
    state.push({ x: (Math.random() - 0.5) * 40, y: Math.random() * 9, z: (Math.random() - 0.5) * 36, s: 0.3 + Math.random() * 0.5, p: Math.random() * 6 });
  }
  scene.add(mesh);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  return dt => {
    state.forEach((l, i) => {
      l.y -= l.s * dt;
      l.p += dt * 2;
      if (l.y < 0) { l.y = 9; l.x = (Math.random() - 0.5) * 40; l.z = (Math.random() - 0.5) * 36; }
      v.set(l.x + Math.sin(l.p) * 0.4, l.y, l.z + Math.cos(l.p * 0.7) * 0.3);
      q.setFromEuler(e.set(l.p, l.p * 0.6, 0));
      mesh.setMatrixAt(i, m.compose(v, q, one));
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
}
