// Team members never stand still: each real action (standup, PR, ticket, release) becomes a trip
// around the village. New actions jump the queue and are celebrated; otherwise people replay their week.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { piece } from './kit.js';
import { hash, COINS } from './logic.js';
import { sound } from './audio.js';
import { dress } from './attire.js';

// Each team member in data/farm.json has "look": "female" or "male"; people with the same look get different characters.
const MODELS = { female: ['a', 'b', 'c', 'd', 'e', 'f'], male: ['a', 'b', 'c', 'd', 'e', 'f'] };
// A specific character for someone (black straight hair and an East Asian look for Aisulu)
const MODEL_FOR = { aisulu: 'female-e' };
// A different skin tone for someone: a column of the character colour map (15 = light tan, like Aisulu)
const SKIN_FOR = { aman: 15, urmat: 15 };

// The characters share one colour map made of 16 colour columns; skin is a column in the bottom row.
// Recolour the skin by moving its UVs to another column, on this model only.
export function setSkin(model, column) {
  const col = (u, v) => (Math.floor(v * 4) === 3 ? Math.floor(u * 16) : -1);
  const head = model.getObjectByName('head-mesh');
  if (!head) return;
  // the skin is the most used bottom-row colour of the head
  const uv = head.geometry.attributes.uv;
  const counts = {};
  for (let i = 0; i < uv.count; i++) { const c = col(uv.getX(i), uv.getY(i)); if (c >= 0) counts[c] = (counts[c] ?? 0) + 1; }
  const skin = +Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  if (skin === column) return;
  model.traverse(o => {
    if (!o.isMesh || !o.geometry.attributes.uv) return;
    o.geometry = o.geometry.clone();
    const a = o.geometry.attributes.uv;
    for (let i = 0; i < a.count; i++) if (col(a.getX(i), a.getY(i)) === skin) a.setX(i, a.getX(i) + (column - skin) / 16);
    a.needsUpdate = true;
  });
}
const WALK = 1.4;
const RUN = 2.8;
const SCALE = 1.4;
const BUBBLE = { standup: '💧', pr: '🌱', ticket: '🧺', release: '🎉', errand: '☕', night: '💤', weekend: '🎮', visit: '👋' };

// Fun things people say. Never about real work, because the site is public.
const LINES = {
  any: ['My pumpkins are huge! 🎃', 'Coffee time ☕', 'What a nice day!', 'Has anyone seen my hoe?', 'These apples smell amazing 🍎',
    'Boorsok at the Fridge! 😋', "Let's go, team! 💪", 'I love this village 🏡', 'Who left the gate open? 🐔', 'Time for chai 🍵',
    'The horses look happy today 🐴', 'Race you to the yurt!'],
  night: ['So sleepy 💤', 'Look at the stars ✨', 'The fire is so warm 🔥', 'Good night, village 🌙'],
  weekend: ['Weekend! 🎉', 'Ping-pong, anyone? 🏓', 'No meetings today 😌'],
  rain: ['Nice rain for the crops ☔', 'My boots are wet!'],
  snow: ['Snowball fight! ❄️', "Brr, it's cold ⛄"],
  fog: ["I can't see my field! 🌫️"],
  spring: ['The apple trees are blooming 🌸'],
  summer: ['So hot today ☀️'],
  fall: ['Look at the leaves 🍁', 'Harvest time! 🧺'],
  winter: ['Hot tea in the yurt? 🫖'],
  elder: ['What lovely crops, children! 🌾', 'Have you eaten? Take some boorsok 😊', 'Well done, everyone 👏',
    'Wear a hat, the sun is strong!', 'I remember when this was all fields 🏡'],
};
const COIN_OF = { standup: COINS.standups, pr: COINS.prs, ticket: COINS.tickets, release: COINS.release };
const mat = color => new THREE.MeshLambertMaterial({ color });

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
  // places: { home, conference, store, fridge, office, gameroom, campfire, buildings: [...], fields: [...] }
  // env() returns the current time of day, season and weather (see env.js)
  constructor(person, model, places, week, env) {
    this.env = env;
    this.chatIn = 6 + (hash(person.id + 'chat') % 250) / 10;
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

    this.bubble = tag('bubble', '', 1.7 / SCALE);
    model.add(this.bubble);
    this.speech = tag('speech hidden', '', 2.1 / SCALE);
    model.add(this.speech);
  }

  chat(dt) {
    this.chatIn -= dt;
    if (this.chatIn > 0) return;
    const now = this.env();
    if (this.speech.element.classList.contains('hidden')) {
      const pool = [...LINES.any, ...LINES[now.season], ...(LINES[now.weather] ?? []),
        ...(now.night ? LINES.night.concat(LINES.night) : []), ...(now.weekend ? LINES.weekend : []),
        ...(this.person.role === 'elder' ? LINES.elder.concat(LINES.elder) : [])];
      this.speech.element.textContent = pool[Math.floor(Math.random() * pool.length)];
      this.speech.element.classList.remove('hidden');
      this.chatIn = 3.5;
    } else {
      this.speech.element.classList.add('hidden');
      this.chatIn = 18 + Math.random() * 30;
    }
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
    const pop = tag('', `<span class="coin-pop">+${amount} 🪙</span>`, 1.85 / SCALE);
    this.model.add(pop);
    sound.coin();
    pop.element.firstChild.addEventListener('animationend', () => { this.model.remove(pop); pop.element.remove(); });
  }

  // Turn one event into a short list of trips. `to` is a place, `anim` plays on arrival for `time` seconds.
  stepsFor(type) {
    const p = this.places;
    const square = new THREE.Vector3(Math.cos(Math.random() * 6.3) * 2.6, 0, Math.sin(Math.random() * 6.3) * 2.6 + 0.2);
    const builder = this.person.role === 'builder';
    if (type === 'release') return [{ to: square, anim: 'jump', time: 6 }];
    if (type === 'night') {
      const a = (this.person.index / 12) * Math.PI * 2 + Math.random() * 0.4;
      const seat = p.campfire.clone().add(new THREE.Vector3(Math.cos(a) * 1.5, 0, Math.sin(a) * 1.5));
      return [{ to: seat, anim: 'sit', time: 15 + Math.random() * 15 }];
    }
    if (type === 'weekend') {
      const spot = p.gameroom.clone().add(new THREE.Vector3((Math.random() - 0.5) * 4, 0, (Math.random() - 0.5) * 3));
      return [{ to: spot, anim: ['emote-yes', 'sit', 'idle'][Math.floor(Math.random() * 3)], time: 6 + Math.random() * 6 }];
    }
    if (type === 'visit') {
      // the elder checks on a field or a building, then on another one
      const spots = [...p.fields, ...p.fields, ...p.buildings];
      const pick = () => spots[Math.floor(Math.random() * spots.length)].clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.2, 0, -0.4));
      return [{ to: pick(), anim: 'emote-yes', time: 3 }, { to: pick(), anim: 'idle', time: 2.5 }];
    }
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
    const now = this.env();
    if (now.night) return { type: 'night' };
    if (now.weekend) return { type: 'weekend' };
    if (this.person.role === 'elder') return { type: 'visit' };
    if (!this.week.length) return { type: 'errand' };
    const e = this.week[this.replayAt % this.week.length];
    this.replayAt++;
    return e;
  }

  update(dt) {
    this.mixer.update(dt);
    this.chat(dt);
    const pos = this.model.position;
    if (this.route?.length) {
      const goal = this.route[0];
      const dx = goal.x - pos.x, dz = goal.z - pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.08) {
        this.route.shift();
        if (!this.route.length) {
          this.play(this.step.anim);
          this.wait = this.step.time;
          if (this.task.type === 'night') this.model.rotation.y = Math.atan2(this.places.campfire.x - pos.x, this.places.campfire.z - pos.z);
        }
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

export async function makeVillager(person, places, week, env) {
  const look = person.look === 'female' ? 'female' : 'male';
  const variants = MODELS[look];
  const model = await piece(`people/character-${MODEL_FOR[person.id] ?? `${look}-${variants[person.lookIndex % variants.length]}`}`, { scale: SCALE });
  model.updateMatrixWorld(true);
  if (SKIN_FOR[person.id]) setSkin(model, SKIN_FOR[person.id]);
  // Kyrgyz traditional clothes; hats bought in the shop show as richer embroidery
  dress(model, { look, id: person.id, role: person.role, hatTier: person.owned.filter(it => it.kind === 'hat').length, style: person.shop?.style });
  const arm = model.getObjectByName('arm-right');
  if (arm && person.tool) {
    const tool = toolMesh(person.tool.id);
    tool.position.set(0, -0.25, 0.05);
    tool.scale.setScalar(1 / SCALE);
    arm.add(tool);
  }
  model.traverse(o => { o.userData.pick = { type: 'person', id: person.id }; });
  return new Villager(person, model, places, week, env);
}
