// Office Farm: a fall village that grows from real team work.
// The update robot writes data/farm.json. Everything here only reads it.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { buildPeople, buildingProgress } from './logic.js';
import { buildBuilding } from './buildings.js';
import { ground, path, plot, orchard, scenery, leaves, PLOT_SPOTS } from './world.js';
import { makeVillager } from './villagers.js';
import { setupUI, renderSidebar, showPerson, showBuilding } from './ui.js';
import { piece } from './kit.js';

const container = document.getElementById('world');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
container.appendChild(renderer.domElement);

const labels = new CSS2DRenderer();
labels.setSize(innerWidth, innerHeight);
labels.domElement.style.position = 'fixed';
labels.domElement.style.inset = '0';
labels.domElement.style.pointerEvents = 'none';
container.appendChild(labels.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#f6c88f');
scene.fog = new THREE.Fog('#f6c88f', 38, 75);

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 200);
camera.position.set(16, 19, 26);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(3, 0, -3);
controls.enableDamping = true;
controls.maxPolarAngle = 1.25;
controls.minDistance = 8;
controls.maxDistance = 55;
controls.update();

scene.add(new THREE.HemisphereLight('#ffe7c4', '#6b5a2e', 1.4));
const sun = new THREE.DirectionalLight('#ffd49a', 2.6);
sun.position.set(-18, 26, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -28, right: 28, top: 28, bottom: -28, near: 1, far: 80 });
sun.shadow.bias = -0.0005;
scene.add(sun);

function label(html, cls, obj, height) {
  const div = document.createElement('div');
  div.className = `label ${cls}`;
  div.innerHTML = html;
  const l = new CSS2DObject(div);
  l.position.set(0, height, 0);
  obj.add(l);
  return l;
}

const villagers = [];
let people = [];
let buildings = [];
let farm = null;
let selectedLabel = null;
let focus = null; // object the camera glides towards after a pick
const pickables = [];

function pick(target) {
  if (selectedLabel) selectedLabel.element.classList.add('hidden');
  if (target.type === 'person') {
    const p = people.find(x => x.id === target.id);
    showPerson(p, farm.releases);
    const v = villagers.find(x => x.person.id === target.id);
    if (v) {
      selectedLabel = v.label;
      selectedLabel.element.classList.remove('hidden');
      focus = v.model;
    }
  } else {
    showBuilding(buildings.find(b => b.id === target.id));
    focus = scene.children.find(o => o.userData.pick?.id === target.id) ?? null;
  }
}

async function build(data) {
  farm = data;
  people = buildPeople(data);
  buildings = buildingProgress(people, data.releases);

  ground(scene);
  const square = await piece('town/fountain-round-detail', { scale: 1.2 });
  scene.add(square);

  const doors = [];
  for (const b of buildings) {
    const g = await buildBuilding(b);
    scene.add(g);
    pickables.push(g);
    doors.push(g.userData.door);
    path(scene, { x: 0, z: 0 }, g.userData.door);
    label(`${b.icon} ${b.name}<small>level ${b.level}/4</small>`, 'building-label', g, g.userData.labelHeight);
  }
  // paths to the fields
  path(scene, { x: 0, z: 0 }, { x: 0, z: 5.6 });
  path(scene, { x: -10.5, z: 5.6 }, { x: 10.5, z: 5.6 });
  path(scene, { x: -10.5, z: 9.8 }, { x: 10.5, z: 9.8 });
  path(scene, { x: -10.5, z: 5.6 }, { x: -10.5, z: 9.8 });
  path(scene, { x: 10.5, z: 5.6 }, { x: 10.5, z: 9.8 });

  const growers = people.filter(p => p.role !== 'builder');
  const homes = {};
  for (const [i, p] of growers.entries()) {
    const g = await plot(p, PLOT_SPOTS[i]);
    scene.add(g);
    pickables.push(g);
    homes[p.id] = g.userData.work;
    const sign = new THREE.Object3D();
    sign.position.set(0, 0, -1.6);
    g.add(sign);
    label(`${p.name} · 🪙 ${p.earned}`, '', sign, 0.5);
  }
  const office = scene.children.find(o => o.userData.pick?.id === 'office');
  for (const p of people.filter(p => p.role === 'builder')) homes[p.id] = office.userData.door;

  const totalTickets = people.reduce((s, p) => s + p.counts.tickets, 0);
  await orchard(scene, data.releases, totalTickets);
  await scenery(scene);

  for (const p of people) {
    const v = await makeVillager(p, homes[p.id], doors);
    v.label = label(p.name, 'person-label hidden', v.model, 1.2);
    scene.add(v.model);
    pickables.push(v.model);
    villagers.push(v);
  }

  renderSidebar(farm, people, buildings, pick);
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downAt = null;
renderer.domElement.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; focus = null; });
renderer.domElement.addEventListener('pointerup', e => {
  // ignore drags (camera moves)
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return;
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(pickables, true)[0];
  let o = hit?.object;
  while (o && !o.userData.pick) o = o.parent;
  if (o) pick(o.userData.pick);
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  labels.setSize(innerWidth, innerHeight);
});

setupUI();
const updateLeaves = leaves(scene);
const clock = new THREE.Clock();

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  villagers.forEach(v => v.update(dt));
  scene.traverse(o => {
    if (o.userData.bee) o.position.set(Math.cos(t * 3) * 0.35, 0.8 + Math.sin(t * 5) * 0.12, Math.sin(t * 3) * 0.35);
  });
  updateLeaves(dt);
  if (focus) {
    const step = focus.position.clone().setY(0).sub(controls.target).multiplyScalar(Math.min(1, dt * 3));
    controls.target.add(step);
    camera.position.add(step);
    if (step.lengthSq() < 1e-6) focus = null;
  }
  controls.update();
  renderer.render(scene, camera);
  labels.render(scene, camera);
  requestAnimationFrame(frame);
}

// Cache-bust so a fresh robot update shows up without a hard refresh.
fetch(`data/farm.json?v=${Date.now()}`)
  .then(r => r.json())
  .then(build)
  .then(() => {
    document.getElementById('loading').classList.add('done');
    window.farmReady = true;
  })
  .catch(err => {
    document.getElementById('loading').textContent = `Could not load the farm: ${err.message}`;
    console.error(err);
  });
frame();
