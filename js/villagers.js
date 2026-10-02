// Team members walk around the village: to their plot to work, to buildings, and to the square.
import * as THREE from 'three';
import { piece } from './kit.js';
import { hash } from './logic.js';

const MODELS = ['female-a', 'male-a', 'female-b', 'male-b', 'female-c', 'male-c',
  'female-d', 'male-d', 'female-e', 'male-e', 'female-f', 'male-f'];
const SPEED = 1.4;
const mat = color => new THREE.MeshLambertMaterial({ color });

function hatMesh(id) {
  const g = new THREE.Group();
  const add = (geo, color, y) => { const m = new THREE.Mesh(geo, mat(color)); m.position.y = y; m.castShadow = true; g.add(m); };
  if (id === 'straw-hat') { add(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 16), '#e8c662', 0); add(new THREE.CylinderGeometry(0.14, 0.17, 0.12, 12), '#e8c662', 0.07); }
  if (id === 'red-beanie') { add(new THREE.SphereGeometry(0.17, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#c8371d', -0.02); add(new THREE.SphereGeometry(0.05, 8, 6), '#ffffff', 0.17); }
  if (id === 'cowboy-hat') { add(new THREE.CylinderGeometry(0.32, 0.32, 0.03, 16), '#8b5a2b', 0); add(new THREE.CylinderGeometry(0.13, 0.16, 0.16, 12), '#8b5a2b', 0.09); }
  if (id === 'gold-crown') {
    add(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 12, 1, true), '#f5c518', 0.05);
    for (let i = 0; i < 5; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 4), mat('#f5c518'));
      spike.position.set(Math.cos(i * 1.256) * 0.14, 0.13, Math.sin(i * 1.256) * 0.14);
      g.add(spike);
    }
  }
  if (id === 'hard-hat') { add(new THREE.SphereGeometry(0.18, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#f5b82e', -0.02); add(new THREE.CylinderGeometry(0.21, 0.21, 0.02, 14), '#e09b14', 0); }
  return g;
}

function toolMesh(id) {
  const g = new THREE.Group();
  const box = (w, h, d, color, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color)); m.position.set(x, y, z); g.add(m); };
  if (id === 'watering-can') { box(0.14, 0.12, 0.1, '#2f7dd1', 0, -0.06, 0); box(0.12, 0.03, 0.03, '#2f7dd1', 0.11, -0.02, 0); }
  if (id === 'pitchfork') { box(0.03, 0.7, 0.03, '#8b5a2b', 0, 0.1, 0); box(0.14, 0.03, 0.03, '#9e9e9e', 0, 0.45, 0); for (const x of [-0.06, 0, 0.06]) box(0.02, 0.12, 0.02, '#9e9e9e', x, 0.52, 0); }
  if (id === 'golden-hoe') { box(0.03, 0.7, 0.03, '#8b5a2b', 0, 0.1, 0); box(0.14, 0.05, 0.04, '#f5c518', 0.05, 0.45, 0); }
  return g;
}

export class Villager {
  constructor(person, model, home, places) {
    this.person = person;
    this.model = model;
    this.home = home;
    this.places = places;
    this.route = [];
    this.wait = 1 + (hash(person.id) % 30) / 10;
    this.mixer = new THREE.AnimationMixer(model);
    this.actions = {};
    for (const clip of model.userData.animations) this.actions[clip.name] = this.mixer.clipAction(clip);
    this.current = null;
    this.play('idle');
    model.position.copy(home).add(new THREE.Vector3((hash(person.id + 'x') % 10) / 10, 0, 0));
  }

  play(name) {
    const next = this.actions[name] || this.actions.idle;
    if (next === this.current) return;
    next.reset().fadeIn(0.25).play();
    if (this.current) this.current.fadeOut(0.25);
    this.current = next;
  }

  pickTarget() {
    const r = Math.random();
    if (r < 0.55) return { at: this.home, then: 'interact-right', time: 4 + Math.random() * 4 };
    if (r < 0.85) {
      const p = this.places[Math.floor(Math.random() * this.places.length)];
      return { at: p, then: 'idle', time: 2 + Math.random() * 3 };
    }
    const a = Math.random() * Math.PI * 2;
    return { at: new THREE.Vector3(Math.cos(a) * 2.6, 0, Math.sin(a) * 2.6), then: 'emote-yes', time: 2.5 };
  }

  update(dt) {
    this.mixer.update(dt);
    const pos = this.model.position;
    if (this.route.length) {
      const goal = this.route[0];
      const dx = goal.x - pos.x, dz = goal.z - pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.08) {
        this.route.shift();
        if (!this.route.length) { this.play(this.task.then); this.wait = this.task.time; }
        return;
      }
      const step = Math.min(dist, SPEED * dt);
      pos.x += (dx / dist) * step;
      pos.z += (dz / dist) * step;
      const face = Math.atan2(dx, dz);
      let turn = face - this.model.rotation.y;
      turn = Math.atan2(Math.sin(turn), Math.cos(turn));
      this.model.rotation.y += turn * Math.min(1, dt * 10);
      return;
    }
    this.wait -= dt;
    if (this.wait > 0) return;
    this.task = this.pickTarget();
    const jitter = () => new THREE.Vector3((Math.random() - 0.5) * 0.8, 0, (Math.random() - 0.5) * 0.6);
    const goal = this.task.at.clone().add(jitter());
    // walk through the square unless the goal is close, so people use the paths between buildings
    const viaSquare = pos.distanceTo(goal) > 6 ? [new THREE.Vector3(0, 0, 4.6).add(jitter())] : [];
    this.route = [...viaSquare, goal];
    this.play('walk');
  }
}

export async function makeVillager(person, home, places) {
  const model = await piece(`people/character-${MODELS[person.index % MODELS.length]}`, { scale: 1.4 });
  model.updateMatrixWorld(true);
  const head = model.getObjectByName('head');
  const headMesh = model.getObjectByName('head-mesh');
  const hatId = person.hat?.id ?? (person.role === 'builder' ? 'hard-hat' : null);
  if (head && hatId) {
    const top = new THREE.Box3().setFromObject(headMesh || head).max;
    const centre = new THREE.Box3().setFromObject(headMesh || head).getCenter(new THREE.Vector3());
    const hat = hatMesh(hatId);
    hat.position.copy(head.worldToLocal(new THREE.Vector3(centre.x, top.y - 0.04, centre.z)));
    hat.scale.setScalar(1 / 1.4);
    head.add(hat);
  }
  const arm = model.getObjectByName('arm-right');
  if (arm && person.tool) {
    const tool = toolMesh(person.tool.id);
    tool.position.set(0, -0.25, 0.05);
    tool.scale.setScalar(1 / 1.4);
    arm.add(tool);
  }
  model.traverse(o => { o.userData.pick = { type: 'person', id: person.id }; });
  return new Villager(person, model, home, places);
}
