// Ground, paths, fields, orchard, forest and falling leaves.
import * as THREE from 'three';
import { piece, FACE } from './kit.js';
import { hash } from './logic.js';
import { softTree, roundedSlab } from './soft.js';

const rand = seed => (hash(String(seed)) % 10000) / 10000;

// Leaf colours for each season; each tree picks one.
const LEAVES = {
  fall: ['#d9541e', '#e8892a', '#b8321a', '#efae2c', '#c9661f'],
  summer: ['#4f8f3a', '#5fa344', '#3f7d36', '#6aa84f'],
  spring: ['#f4a6c8', '#7cc35a', '#9fd36b', '#f7c1d9', '#8cc95e'],
  winter: ['#eef3f6', '#dfe8ee', '#e8eef2'],
};
const GROUND = {
  fall: ['#a7a948', '#8fa543', '#82993c'],
  summer: ['#7fb84a', '#6fa83e', '#649c38'],
  spring: ['#9ccc5a', '#86bd4c', '#78b044'],
  winter: ['#f4f7fa', '#e6edf2', '#dde6ec'],
};
const PINE = '#2f6b4a';
let season = 'fall';
export function setSeason(s) { season = s; }
// Two rows of five plots south of the square. Each plot opens to a path on its -z side.
export const PLOT_SPOTS = [7.5, 12].flatMap(z => [-8, -4, 0, 4, 8].map(x => ({ x, z })));

// Gentle rolling hills outside the village; the village itself stays flat.
export function heightAt(x, z) {
  const d = Math.hypot(x / 25, z / 23);
  const ramp = Math.min(1, Math.max(0, (d - 1.1) / 0.6));
  if (!ramp) return 0;
  const bumps = Math.sin(x * 0.11 + 1.3) * Math.cos(z * 0.09 - 0.7) + 0.5 * Math.sin(x * 0.05 - z * 0.07);
  return ramp * (0.9 + bumps * 0.9);
}

export function ground(scene) {
  const geo = new THREE.PlaneGeometry(260, 260, 130, 130);
  const pos = geo.attributes.position;
  const colors = [];
  const c = new THREE.Color(), c2 = new THREE.Color();
  const [light, mid, dark] = GROUND[season];
  for (let i = 0; i < pos.count; i++) {
    // the plane is rotated flat later, so its local y is world -z
    const x = pos.getX(i), z = -pos.getY(i);
    pos.setZ(i, heightAt(x, z));
    const n = 0.5 + 0.5 * Math.sin(x * 0.17 + Math.cos(z * 0.13) * 2) * Math.cos(z * 0.15 - x * 0.04);
    c.set(dark).lerp(c2.set(mid), Math.min(1, n * 1.6));
    if (n > 0.75) c.lerp(c2.set(light), (n - 0.75) * 3);
    colors.push(c.r, c.g, c.b);
  }
  geo.computeVertexNormals();
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

const PATH_MAT = new THREE.MeshLambertMaterial({ color: '#c9a978' });
export function path(scene, from, to, width = 1.1) {
  const dx = to.x - from.x, dz = to.z - from.z;
  const len = Math.hypot(dx, dz);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, len), PATH_MAT);
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = -Math.atan2(dx, dz) + Math.PI;
  mesh.position.set((from.x + to.x) / 2, 0.008, (from.z + to.z) / 2);
  mesh.receiveShadow = true;
  scene.add(mesh);
  for (const end of [from, to]) {
    const cap = new THREE.Mesh(new THREE.CircleGeometry(width / 2, 24), PATH_MAT);
    cap.rotation.x = -Math.PI / 2;
    cap.position.set(end.x, 0.008, end.z);
    cap.receiveShadow = true;
    scene.add(cap);
  }
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
  if (id === 'hay-bale') {
    const bale = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.5, 20), mat('#e3c45a'));
    bale.rotation.z = Math.PI / 2; bale.position.y = 0.24; bale.castShadow = true; g.add(bale);
  }
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
  g.add(roundedSlab(3.2, 3, 0.07, 0.55, '#6e4a2c'));

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
  // Issyk-Kul apples: blossom in spring, red apples in summer and fall, bare in winter
  const fruitColors = { spring: ['#ffffff', '#f7b6d2'], summer: ['#c0211f', '#7cbf3a'], fall: ['#c0211f', '#d92b1f'], winter: [] }[season];
  const fruitPerTree = fruitColors.length ? Math.min(10, Math.ceil(tickets / count)) : 0;
  for (let i = 0; i < count; i++) {
    const x = 14 + (i % 2) * 2.6 + (Math.floor(i / 2) % 2) * 1.3;
    const z = 6 + Math.floor(i / 2) * 2.6;
    const palette = LEAVES[season];
    const tree = softTree('round', palette[hash('orchard' + i) % palette.length], 3.1, i);
    const y0 = heightAt(x, z);
    tree.position.set(x, y0, z);
    scene.add(tree);
    const { y: cy, r: cr } = tree.userData.crown;
    const mat = fruitPerTree && new THREE.MeshLambertMaterial({ color: fruitColors[i % fruitColors.length] });
    for (let f = 0; f < fruitPerTree; f++) {
      const a = rand(`f${i}-${f}`) * Math.PI * 2;
      const up = (rand(`h${i}-${f}`) - 0.35) * 1.2; // mostly on the sides and top of the crown
      const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), mat);
      fruit.position.set(x + Math.cos(a) * Math.cos(up) * cr * 1.05, y0 + cy + Math.sin(up) * cr * 1.05, z + Math.sin(a) * Math.cos(up) * cr * 1.05);
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
    const kinds = ['pine', 'round', 'round', 'pine', 'tall', 'round'];
    const kind = kinds[hash('k' + i) % kinds.length];
    const palette = kind === 'pine' ? [season === 'winter' ? '#5f8f78' : PINE] : LEAVES[season];
    const tree = softTree(kind, palette[hash(String(i)) % palette.length], 3.4 + rand('s' + i) * 1.8, i);
    tree.position.set(x, heightAt(x, z), z);
    tree.rotation.y = rand('t' + i) * 6;
    scene.add(tree);
  }
  // rocks, bushes, mushrooms and flowers scattered over the meadow
  const small = ['stone_smallA', 'stone_largeB', 'plant_bushLarge', 'plant_bush', 'mushroom_redGroup', 'flower_redA', 'flower_yellowB', 'flower_purpleC', 'log', 'mushroom_tanGroup'];
  for (let i = 0; i < 110; i++) {
    const x = (rand('x' + i) - 0.5) * 44, z = (rand('z' + i) - 0.5) * 40;
    if (Math.abs(x) < 19 && z > -19 && z < 16) continue; // keep the village clear
    jobs.push(piece(`nature/${small[i % small.length]}`, { x, y: heightAt(x, z), z, scale: 1.8, rot: rand('q' + i) * 6 }));
  }
  (await Promise.all(jobs)).forEach(o => scene.add(o));
}

