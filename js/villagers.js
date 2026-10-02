// Team members never stand still: each real action (standup, PR, ticket, release) becomes a trip
// around the village. New actions jump the queue and are celebrated; otherwise people replay their week.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { piece } from './kit.js';
import { hash, COINS } from './logic.js';

const MODELS = ['female-a', 'male-a', 'female-b', 'male-b', 'female-c', 'male-c',
  'female-d', 'male-d', 'female-e', 'male-e', 'female-f', 'male-f'];
const WALK = 1.4;
const RUN = 2.8;
const SCALE = 1.4;
const BUBBLE = { standup: '💧', pr: '🌱', ticket: '🧺', release: '🎉', errand: '☕' };
const COIN_OF = { standup: COINS.standups, pr: COINS.prs, ticket: COINS.tickets, release: COINS.release };
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

function tag(cls, html, height) {
  const div = document.createElement('div');
  div.className = cls;
  div.innerHTML = html;
  const obj = new CSS2DObject(div);
  obj.position.y = height;
  return obj;
}

export class Villager {
  // places: { home, conference, store, fridge, office, square, buildings: [...] }
  constructor(person, model, places, week) {
    this.person = person;
    this.model = model;
    this.places = places;
    this.week = week; // this person's events from the last 7 days, oldest first
    this.replayAt = hash(person.id) % Math.max(1, week.length);
    this.urgent = [];
    this.steps = [];
    this.wait = (hash(person.id) % 20) / 10;
    this.mixer = new THREE.AnimationMixer(model);
    this.actions = {};
    for (const clip of model.userData.animations) this.actions[clip.name] = this.mixer.clipAction(clip);
    this.current = null;
    this.play('idle');
    model.position.copy(places.home).add(new THREE.Vector3((hash(person.id + 'x') % 10) / 10 - 0.5, 0, 0));

    this.bubble = tag('bubble', '', 1.25 / SCALE);
    model.add(this.bubble);
  }

  play(name) {
    const next = this.actions[name] || this.actions.idle;
    if (next === this.current) return;
    next.reset().fadeIn(0.2).play();
    if (this.current) this.current.fadeOut(0.2);
    this.current = next;
  }

  // Someone just did something new: do it now, running, with a coin pop.
  celebrate(event) {
    this.urgent.push({ ...event, fresh: true });
    if (this.task && !this.task.fresh) { this.steps = []; this.route = []; } // drop the replay trip in progress
    this.wait = 0;
  }

  say(text) {
    this.bubble.element.textContent = text;
    this.bubble.element.classList.toggle('hidden', !text);
  }

  popCoins(amount) {
    // the renderer moves the outer div with a transform, so the animation runs on an inner span
    const pop = tag('', `<span class="coin-pop">+${amount} 🪙</span>`, 1.4 / SCALE);
    this.model.add(pop);
    pop.element.firstChild.addEventListener('animationend', () => { this.model.remove(pop); pop.element.remove(); });
  }

  // Turn one event into a short list of trips. `to` is a place, `anim` plays on arrival for `time` seconds.
  stepsFor(type) {
    const p = this.places;
    const square = new THREE.Vector3(Math.cos(Math.random() * 6.3) * 2.6, 0, Math.sin(Math.random() * 6.3) * 2.6 + 0.2);
    const builder = this.person.role === 'builder';
    if (type === 'release') return [{ to: square, anim: 'jump', time: 6 }];
    if (builder) {
      const first = type === 'standup' ? { to: p.conference, anim: 'emote-yes', time: 2 } : { to: p.store, anim: 'pick-up', time: 1.2 };
      return [first, { to: p.office, anim: 'interact-right', time: 4 }];
    }
    if (type === 'standup') return [{ to: p.conference, anim: 'emote-yes', time: 2 }, { to: p.home, anim: 'interact-right', time: 3 }];
    if (type === 'pr') return [{ to: p.store, anim: 'pick-up', time: 1.2 }, { to: p.home, anim: 'interact-right', time: 3.5 }];
    if (type === 'ticket') return [{ to: p.home, anim: 'pick-up', time: 2 }, { to: p.fridge, anim: 'interact-right', time: 1.5 }];
    // errand: nothing to replay, so stroll to a building and back
    const b = p.buildings[Math.floor(Math.random() * p.buildings.length)];
    return [{ to: b, anim: 'idle', time: 1.5 }, { to: p.home, anim: 'interact-right', time: 2 }];
  }

  nextTask() {
    if (this.urgent.length) return this.urgent.shift();
    if (!this.week.length) return { type: 'errand' };
    const e = this.week[this.replayAt % this.week.length];
    this.replayAt++;
    return e;
  }

  update(dt) {
    this.mixer.update(dt);
    const pos = this.model.position;
    if (this.route?.length) {
      const goal = this.route[0];
      const dx = goal.x - pos.x, dz = goal.z - pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.08) {
        this.route.shift();
        if (!this.route.length) { this.play(this.step.anim); this.wait = this.step.time; }
        return;
      }
      const step = Math.min(dist, (this.task.fresh ? RUN : WALK) * dt);
      pos.x += (dx / dist) * step;
      pos.z += (dz / dist) * step;
      let turn = Math.atan2(dx, dz) - this.model.rotation.y;
      turn = Math.atan2(Math.sin(turn), Math.cos(turn));
      this.model.rotation.y += turn * Math.min(1, dt * 10);
      return;
    }
    this.wait -= dt;
    if (this.wait > 0) return;

    if (!this.steps.length) {
      this.task = this.nextTask();
      this.steps = this.stepsFor(this.task.type);
      this.say(BUBBLE[this.task.type] ?? '');
      if (this.task.fresh) {
        this.popCoins(COIN_OF[this.task.type] ?? 0);
        this.play('jump');
        this.wait = 0.8;
        return;
      }
    }
    this.step = this.steps.shift();
    const jitter = () => new THREE.Vector3((Math.random() - 0.5) * 0.8, 0, (Math.random() - 0.5) * 0.6);
    const goal = this.step.to.clone().add(jitter());
    // long trips go through the square, so people use the paths between buildings
    const via = pos.distanceTo(goal) > 6 ? [new THREE.Vector3(0, 0, 4.6).add(jitter())] : [];
    this.route = [...via, goal];
    this.play(this.task.fresh ? 'sprint' : 'walk');
  }
}

export async function makeVillager(person, places, week) {
  const model = await piece(`people/character-${MODELS[person.index % MODELS.length]}`, { scale: SCALE });
  model.updateMatrixWorld(true);
  const head = model.getObjectByName('head');
  const headMesh = model.getObjectByName('head-mesh');
  const hatId = person.hat?.id ?? (person.role === 'builder' ? 'hard-hat' : null);
  if (head && hatId) {
    const box = new THREE.Box3().setFromObject(headMesh || head);
    const centre = box.getCenter(new THREE.Vector3());
    const hat = hatMesh(hatId);
    hat.position.copy(head.worldToLocal(new THREE.Vector3(centre.x, box.max.y - 0.04, centre.z)));
    hat.scale.setScalar(1 / SCALE);
    head.add(hat);
  }
  const arm = model.getObjectByName('arm-right');
  if (arm && person.tool) {
    const tool = toolMesh(person.tool.id);
    tool.position.set(0, -0.25, 0.05);
    tool.scale.setScalar(1 / SCALE);
    arm.add(tool);
  }
  model.traverse(o => { o.userData.pick = { type: 'person', id: person.id }; });
  return new Villager(person, model, places, week);
}
