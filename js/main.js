// Office Farm: a village that grows from real team work.
// The update robot writes data/farm.json. Everything here only reads it.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { buildPeople, buildingProgress, badgesFor } from './logic.js';
import { buildBuilding } from './buildings.js';
import { ground, path, plot, orchard, scenery, setSeason, PLOT_SPOTS } from './world.js';
import { makeVillager } from './villagers.js';
import { setupUI, renderSidebar, showPerson, showBuilding, showPlace, showConditions } from './ui.js';
import { piece } from './kit.js';
import { fireworks, updateFireworks } from './fireworks.js';
import { readEnvironment } from './env.js';
import { atmosphere } from './atmosphere.js';
import { mountains, yurt, campfire, paddock, boorsokTable, CAMPFIRE } from './kyrgyz.js';
import { animals } from './animals.js';
import { setupSound } from './audio.js';

const container = document.getElementById('world');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap; // blurred, soft-edged shadows
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
container.appendChild(renderer.domElement);

const labels = new CSS2DRenderer();
labels.setSize(innerWidth, innerHeight);
labels.domElement.style.position = 'fixed';
labels.domElement.style.inset = '0';
labels.domElement.style.pointerEvents = 'none';
container.appendChild(labels.domElement);

// Bishkek time of day, season and weather; refreshed every 30 seconds
let now = readEnvironment();
setInterval(() => { now = readEnvironment(); showConditions(now); }, 30000);
const getEnv = () => now;
setSeason(now.season);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#f6c88f');
scene.fog = new THREE.Fog('#f6c88f', 45, 150);

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 400);
camera.position.set(16, 19, 26);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(3, 0, -3);
controls.enableDamping = true;
controls.maxPolarAngle = 1.25;
controls.minDistance = 8;
controls.maxDistance = 55;
controls.update();

const hemi = new THREE.HemisphereLight('#ffe7c4', '#a8905e', 1.4);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#ffd49a', 2.6);
sun.position.set(-18, 26, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -28, right: 28, top: 28, bottom: -28, near: 1, far: 80 });
sun.shadow.bias = -0.0005;
sun.shadow.radius = 10;
sun.shadow.blurSamples = 16;
scene.add(sun);
const sky = atmosphere(scene, { sun, hemi }, now);

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
const bees = [];
let people = [];
let buildings = [];
let farm = null;
let selectedLabel = null;
let focus = null; // object the camera glides towards after a pick
let pets = null;
let fire = null;
let horses = null;
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
      pets?.dog.follow(v);
    }
  } else if (target.type === 'place') {
    showPlace(target.id);
    focus = scene.children.find(o => o.userData.pick?.id === target.id) ?? null;
  } else {
    showBuilding(buildings.find(b => b.id === target.id));
    focus = scene.children.find(o => o.userData.pick?.id === target.id) ?? null;
  }
}

async function build(data) {
  farm = data;
  people = buildPeople(data);
  for (const p of people) p.badges = badgesFor(p, data.events, data.updated);
  buildings = buildingProgress(people, data.releases);

  ground(scene);
  mountains(scene, now.season, now.weather);
  scene.add(await piece('town/fountain-round-detail', { scale: 1.2 }));

  const doors = {};
  for (const b of buildings) {
    const g = await buildBuilding(b);
    scene.add(g);
    pickables.push(g);
    doors[b.id] = g.userData.door;
    path(scene, { x: 0, z: 0 }, g.userData.door);
    label(`${b.icon} ${b.name}<small>level ${b.level}/4</small>`, 'building-label', g, g.userData.labelHeight);
  }
  // paths to the fields, the campfire and the paddock
  path(scene, { x: 0, z: 0 }, { x: 0, z: 5.6 });
  path(scene, { x: -10.5, z: 5.6 }, { x: 10.5, z: 5.6 });
  path(scene, { x: -10.5, z: 9.8 }, { x: 10.5, z: 9.8 });
  path(scene, { x: -10.5, z: 5.6 }, { x: -10.5, z: 9.8 });
  path(scene, { x: 10.5, z: 5.6 }, { x: 10.5, z: 9.8 });
  path(scene, doors.gameroom, CAMPFIRE);

  const growers = people.filter(p => p.role !== 'builder');
  const homes = {};
  for (const [i, p] of growers.entries()) {
    const g = await plot(p, PLOT_SPOTS[i]);
    scene.add(g);
    pickables.push(g);
    homes[p.id] = g.userData.work;
    g.traverse(o => { if (o.userData.bee) bees.push(o); });
    const sign = new THREE.Object3D();
    sign.position.set(0, 0, -1.6);
    g.add(sign);
    label(`${p.name} · 🪙 ${p.earned}`, '', sign, 0.5);
  }
  for (const p of people.filter(p => p.role === 'builder')) homes[p.id] = doors.office;

  const totalTickets = people.reduce((s, p) => s + p.counts.tickets, 0);
  await orchard(scene, data.releases, totalTickets);
  const orchardSign = new THREE.Object3D();
  orchardSign.position.set(15.3, 3.6, 5);
  scene.add(orchardSign);
  label('🍎 Issyk-Kul apple orchard', 'building-label', orchardSign, 0);
  await scenery(scene);

  // Kyrgyz corner: yurt and campfire, horses, boorsok next to the Fridge
  const y = yurt(scene);
  pickables.push(y);
  label('🏕️ Boz üy', 'building-label', y, 2.6);
  fire = await campfire(scene);
  horses = await paddock(scene);
  const fridgeDoor = doors.fridge;
  pickables.push(boorsokTable(scene, new THREE.Vector3(fridgeDoor.x - 1.6, 0, fridgeDoor.z - 1.4)));

  const weekAgo = new Date(Date.parse(data.updated) - 7 * 864e5).toISOString();
  for (const p of people) {
    const week = data.events.filter(e => e.who === p.id && eventTime(e) >= weekAgo).reverse();
    const places = { ...doors, home: homes[p.id], campfire: CAMPFIRE, buildings: Object.values(doors) };
    const v = await makeVillager(p, places, week, getEnv);
    const badgeIcons = p.badges.map(b => b.icon).join('');
    v.label = label(`${p.name} ${badgeIcons}`, 'person-label hidden', v.model, 1.2);
    scene.add(v.model);
    pickables.push(v.model);
    villagers.push(v);
  }
  pets = await animals(scene, villagers);

  // night lights: every lantern glows, and each building door gets a warm light
  const lanterns = [];
  scene.traverse(o => { if (o.name === 'lantern') lanterns.push(o); });
  scene.updateMatrixWorld(true);
  sky.lightUp(lanterns, Object.values(doors));

  renderSidebar(farm, people, buildings, pick);
  showConditions(now);
}

const eventTime = e => e.at ?? e.date;
const SEEN_KEY = 'officeFarm.seenUntil';

// Celebrate what happened since this browser last looked. First visit: the 5 newest actions.
function celebrateNew(data) {
  const seen = localStorage.getItem(SEEN_KEY);
  const fresh = data.events.filter(e => !seen || eventTime(e) > seen).slice(0, seen ? 15 : 5).reverse();
  fresh.forEach((e, i) => setTimeout(() => {
    if (e.type === 'release') {
      fireworks(scene);
      villagers.forEach(v => v.celebrate(e));
    } else {
      villagers.find(v => v.person.id === e.who)?.celebrate(e);
    }
  }, 1500 + i * 1200));
  if (data.events.length) localStorage.setItem(SEEN_KEY, eventTime(data.events[0]));
  // ?party in the address replays a release celebration, for demos
  if (new URLSearchParams(location.search).has('party')) {
    setTimeout(() => { fireworks(scene, 12); villagers.forEach(v => v.celebrate({ type: 'release', who: 'team' })); }, 1000);
  }
}

// The robot updates farm.json about once an hour; reload when it changes so the village regrows.
function watchForUpdates() {
  setInterval(async () => {
    try {
      const next = await (await fetch(`data/farm.json?v=${Date.now()}`)).json();
      if (next.updated !== farm.updated) location.reload();
    } catch { /* offline for a moment; try again next time */ }
  }, 5 * 60 * 1000);
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
setupSound(document.getElementById('sound'), getEnv);
const clock = new THREE.Clock();

function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  villagers.forEach(v => v.update(dt));
  pets?.update(dt);
  horses?.(dt, t);
  fire?.update(t);
  bees.forEach(b => b.position.set(Math.cos(t * 3) * 0.35, 0.8 + Math.sin(t * 5) * 0.12, Math.sin(t * 3) * 0.35));
  sky.update(dt, t, now, controls.target);
  if (fire) fire.light.intensity = (1 - now.daylight) * 8;
  updateFireworks(scene, dt);
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
  .then(async data => {
    await build(data);
    document.getElementById('loading').classList.add('done');
    window.farmReady = true;
    window.farmCamera = { camera, controls }; // used by screenshot tooling
    celebrateNew(data);
    watchForUpdates();
  })
  .catch(err => {
    document.getElementById('loading').textContent = `Could not load the farm: ${err.message}`;
    console.error(err);
  });
frame();
