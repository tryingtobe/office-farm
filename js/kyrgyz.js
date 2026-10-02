// Kyrgyz touches: Ala-Too mountains, a boz üy (yurt) with a campfire, horses, and boorsok by the Fridge.
import * as THREE from 'three';
import { piece } from './kit.js';
import { hash } from './logic.js';

const rand = seed => (hash(String(seed)) % 10000) / 10000;
const lambert = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });

export const YURT = new THREE.Vector3(18, 0, -11);
export const CAMPFIRE = new THREE.Vector3(14.5, 0, -7.5);
export const PADDOCK = new THREE.Vector3(-19, 0, -5);

function mesh(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function mountains(scene, season, weather) {
  // far away and hazy blue; they ignore the fog except on foggy days, so the range is always on the horizon
  const fog = weather === 'fog';
  const rock = lambert(season === 'winter' ? '#a9b8d6' : '#6f82b0', { flatShading: true, fog, emissive: '#2c3c6e', emissiveIntensity: 0.6 });
  const snow = lambert('#f7fbff', { flatShading: true, fog, emissive: '#8090b0', emissiveIntensity: 0.3 });
  for (let i = 0; i < 26; i++) {
    const a = Math.PI * (1.04 + (i / 26) * 0.92 + rand('ma' + i) * 0.03); // an arc behind the village (north, -z)
    const r = 120 + rand('mr' + i) * 35;
    const height = 26 + rand('mh' + i) * 26;
    const radius = 15 + rand('mw' + i) * 9;
    const g = new THREE.Group();
    g.add(mesh(new THREE.ConeGeometry(radius, height, 6), rock, 0, height / 2, 0));
    const cap = season === 'winter' ? 0.65 : 0.5;
    g.add(mesh(new THREE.ConeGeometry(radius * cap * 1.02, height * cap, 6), snow, 0, height - (height * cap) / 2 + 0.05, 0));
    g.position.set(Math.cos(a) * r, -1, Math.sin(a) * r * 0.85);
    g.rotation.y = rand('mt' + i) * Math.PI;
    scene.add(g);
  }
  // rolling foothills between the forest and the mountains
  const hillColor = { fall: '#9a9a45', summer: '#6f9e3e', spring: '#83b74b', winter: '#e9eff4' }[season];
  const hill = lambert(hillColor, { flatShading: true });
  for (let i = 0; i < 22; i++) {
    const a = rand('ha' + i) * Math.PI * 2;
    const r = 55 + rand('hr' + i) * 35;
    const h = mesh(new THREE.SphereGeometry(1, 9, 6), hill, Math.cos(a) * r, -2, Math.sin(a) * r);
    h.scale.set(14 + rand('hw' + i) * 14, 5 + rand('hh' + i) * 6, 12 + rand('hd' + i) * 12);
    h.castShadow = false;
    scene.add(h);
  }
}

export function yurt(scene) {
  const g = new THREE.Group();
  const felt = lambert('#f3ead8');
  g.add(mesh(new THREE.CylinderGeometry(1.6, 1.6, 1.05, 20), felt, 0, 0.525, 0));
  g.add(mesh(new THREE.CylinderGeometry(1.63, 1.63, 0.16, 20), lambert('#b3261e'), 0, 0.88, 0));
  g.add(mesh(new THREE.CylinderGeometry(1.63, 1.63, 0.1, 20), lambert('#1f4e8c'), 0, 0.25, 0));
  g.add(mesh(new THREE.ConeGeometry(1.78, 0.95, 20), felt, 0, 1.05 + 0.47, 0));
  // tunduk, the crown at the top of the roof
  g.add(mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.14, 12), lambert('#7a4a22'), 0, 1.98, 0));
  for (const r of [0, Math.PI / 2]) {
    const bar = mesh(new THREE.BoxGeometry(0.62, 0.04, 0.05), lambert('#b3261e'), 0, 2.06, 0);
    bar.rotation.y = r;
    g.add(bar);
  }
  // carved door with a gold pattern
  g.add(mesh(new THREE.BoxGeometry(0.62, 0.86, 0.08), lambert('#c8371d'), 0, 0.43, 1.6));
  g.add(mesh(new THREE.BoxGeometry(0.42, 0.06, 0.09), lambert('#f5c518'), 0, 0.62, 1.61));
  g.add(mesh(new THREE.BoxGeometry(0.06, 0.42, 0.09), lambert('#f5c518'), 0, 0.43, 1.61));
  g.scale.setScalar(1.5);
  g.position.copy(YURT);
  g.rotation.y = Math.atan2(CAMPFIRE.x - YURT.x, CAMPFIRE.z - YURT.z);
  g.userData.pick = { type: 'place', id: 'yurt' };
  scene.add(g);
  return g;
}

// Returns an update function that makes the flames flicker. `light` is shown at night by sky.js.
export async function campfire(scene) {
  const g = new THREE.Group();
  g.position.copy(CAMPFIRE);
  g.scale.setScalar(1.6);
  g.add(await piece('nature/campfire_stones', { scale: 2 }));
  const flames = [];
  const flameMat = new THREE.MeshBasicMaterial({ color: '#ffb03a' });
  const coreMat = new THREE.MeshBasicMaterial({ color: '#ff5a1f' });
  for (let i = 0; i < 3; i++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.16 - i * 0.03, 0.55 - i * 0.1, 6), i ? flameMat : coreMat);
    f.position.set((i - 1) * 0.1, 0.35, (i % 2) * 0.08);
    flames.push(f);
    g.add(f);
  }
  // log seats around the fire
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    g.add(await piece('nature/log', { x: Math.cos(a) * 1.8, z: Math.sin(a) * 1.8, rot: -a, scale: 1.8 }));
  }
  const light = new THREE.PointLight('#ff9a3c', 0, 12, 1.6);
  light.position.set(0, 1, 0);
  g.add(light);
  scene.add(g);
  return {
    light,
    update(t) {
      flames.forEach((f, i) => { f.scale.y = 0.8 + Math.sin(t * 9 + i * 2) * 0.25 + Math.random() * 0.1; });
    },
  };
}

function horseMesh(coat) {
  const g = new THREE.Group();
  const body = lambert(coat);
  const dark = lambert('#2b1d14');
  g.add(mesh(new THREE.BoxGeometry(0.42, 0.42, 1.0), body, 0, 0.78, 0));
  const neck = new THREE.Group();
  neck.position.set(0, 0.95, 0.42);
  const neckMesh = mesh(new THREE.BoxGeometry(0.24, 0.55, 0.26), body, 0, 0.22, 0.08);
  neckMesh.rotation.x = 0.5;
  neck.add(neckMesh);
  neck.add(mesh(new THREE.BoxGeometry(0.22, 0.24, 0.48), body, 0, 0.48, 0.3));
  neck.add(mesh(new THREE.BoxGeometry(0.06, 0.4, 0.3), dark, 0, 0.3, -0.04)); // mane
  for (const x of [-0.07, 0.07]) neck.add(mesh(new THREE.BoxGeometry(0.05, 0.1, 0.05), body, x, 0.64, 0.12));
  g.add(neck);
  const tail = mesh(new THREE.BoxGeometry(0.08, 0.45, 0.08), dark, 0, 0.72, -0.56);
  tail.rotation.x = -0.4;
  g.add(tail);
  const legs = [];
  for (const [x, z] of [[-0.14, 0.38], [0.14, 0.38], [-0.14, -0.38], [0.14, -0.38]]) {
    const leg = new THREE.Group();
    leg.position.set(x, 0.6, z);
    leg.add(mesh(new THREE.BoxGeometry(0.11, 0.6, 0.11), body, 0, -0.3, 0));
    leg.add(mesh(new THREE.BoxGeometry(0.12, 0.08, 0.12), dark, 0, -0.58, 0));
    g.add(leg);
    legs.push(leg);
  }
  return { g, legs, neck };
}

// Horses (and a cow, added by animals.js) live in a fenced paddock.
export async function paddock(scene) {
  const size = 3; // half width
  const jobs = [];
  for (let i = -size + 0.5; i < size; i++) {
    jobs.push(piece('nature/fence_simple', { x: PADDOCK.x + i, z: PADDOCK.z - size + 0.5 }));
    jobs.push(piece('nature/fence_simple', { x: PADDOCK.x + i, z: PADDOCK.z + size - 0.5, rot: Math.PI }));
    jobs.push(piece('nature/fence_simple', { x: PADDOCK.x + size - 0.5, z: PADDOCK.z + i, rot: -Math.PI / 2 }));
    jobs.push(piece('nature/fence_simple', { x: PADDOCK.x - size + 0.5, z: PADDOCK.z + i, rot: Math.PI / 2 }));
  }
  (await Promise.all(jobs)).forEach(o => { o.scale.y = 2; scene.add(o); });

  const horses = ['#7a4a2a', '#a0522d', '#d9d4cc'].map((coat, i) => {
    const h = horseMesh(coat);
    h.g.position.set(PADDOCK.x + (i - 1) * 1.5, 0, PADDOCK.z + (i % 2) - 0.5);
    h.g.scale.setScalar(1.25);
    scene.add(h.g);
    return { ...h, target: h.g.position.clone(), wait: i * 2 };
  });
  return (dt, t) => horses.forEach((h, i) => {
    const pos = h.g.position;
    const dx = h.target.x - pos.x, dz = h.target.z - pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.05) {
      pos.x += (dx / dist) * Math.min(dist, 0.9 * dt);
      pos.z += (dz / dist) * Math.min(dist, 0.9 * dt);
      h.g.rotation.y = Math.atan2(dx, dz);
      h.legs.forEach((leg, j) => { leg.rotation.x = Math.sin(t * 8 + (j % 3 ? Math.PI : 0)) * 0.5; });
      h.neck.rotation.x = 0;
    } else {
      h.legs.forEach(leg => { leg.rotation.x = 0; });
      h.neck.rotation.x = 0.9 + Math.sin(t * 2 + i) * 0.1; // grazing
      h.wait -= dt;
      if (h.wait < 0) {
        h.target.set(PADDOCK.x + (Math.random() - 0.5) * 4, 0, PADDOCK.z + (Math.random() - 0.5) * 4);
        h.wait = 3 + Math.random() * 5;
      }
    }
  });
}

// A low table with a plate of boorsok and a teapot, next to the Fridge.
export function boorsokTable(scene, at) {
  const g = new THREE.Group();
  const wood = lambert('#8b5a2b');
  g.add(mesh(new THREE.BoxGeometry(1.2, 0.08, 0.7), wood, 0, 0.45, 0));
  for (const [x, z] of [[-0.5, -0.27], [0.5, -0.27], [-0.5, 0.27], [0.5, 0.27]]) g.add(mesh(new THREE.BoxGeometry(0.07, 0.45, 0.07), wood, x, 0.22, z));
  g.add(mesh(new THREE.CylinderGeometry(0.3, 0.26, 0.04, 16), lambert('#ffffff'), -0.15, 0.51, 0));
  const dough = lambert('#d9a04a');
  for (let i = 0; i < 9; i++) {
    const b = mesh(new THREE.BoxGeometry(0.11, 0.07, 0.11), dough, -0.15 + (rand('b' + i) - 0.5) * 0.36, 0.56 + (i > 5 ? 0.06 : 0), (rand('c' + i) - 0.5) * 0.36);
    b.rotation.set(rand('r' + i), rand('s' + i) * 3, 0);
    g.add(b);
  }
  g.add(mesh(new THREE.SphereGeometry(0.11, 12, 10), lambert('#1f4e8c'), 0.35, 0.58, 0.05));
  g.add(mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.12, 6), lambert('#1f4e8c'), 0.47, 0.6, 0.05));
  for (const z of [-0.2, 0.22]) g.add(mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.06, 10), lambert('#f3ead8'), 0.3, 0.52, z));
  g.position.copy(at);
  g.scale.setScalar(1.3);
  g.userData.pick = { type: 'place', id: 'boorsok' };
  scene.add(g);
  return g;
}
