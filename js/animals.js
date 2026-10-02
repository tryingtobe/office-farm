// Farm animals: chickens by the fields, a cow in the paddock, bees in the orchard, a cat, and a dog
// that follows one of the team around.
import * as THREE from 'three';
import { piece } from './kit.js';
import { PADDOCK } from './kyrgyz.js';

class Animal {
  constructor(model, { speed = 1, area = null, idleAnim = 'eat' } = {}) {
    this.model = model;
    this.speed = speed;
    this.area = area; // { x, z, w, d } box to wander in
    this.idleAnim = idleAnim;
    this.mixer = new THREE.AnimationMixer(model);
    this.actions = Object.fromEntries(model.userData.animations.map(c => [c.name, this.mixer.clipAction(c)]));
    this.target = null;
    this.wait = Math.random() * 3;
    this.play('idle');
  }

  play(name) {
    const next = this.actions[name] || this.actions.idle;
    if (next === this.current) return;
    next.reset().fadeIn(0.2).play();
    this.current?.fadeOut(0.2);
    this.current = next;
  }

  moveTowards(goal, dt, speed = this.speed) {
    const pos = this.model.position;
    const dx = goal.x - pos.x, dz = goal.z - pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.05) return true;
    pos.x += (dx / dist) * Math.min(dist, speed * dt);
    pos.z += (dz / dist) * Math.min(dist, speed * dt);
    this.model.rotation.y = Math.atan2(dx, dz);
    return false;
  }

  update(dt) {
    this.mixer.update(dt);
    if (this.target) {
      if (this.moveTowards(this.target, dt)) {
        this.target = null;
        this.play(Math.random() < 0.7 ? this.idleAnim : 'idle');
        this.wait = 2 + Math.random() * 5;
      }
      return;
    }
    this.wait -= dt;
    if (this.wait > 0 || !this.area) return;
    const a = this.area;
    this.target = new THREE.Vector3(a.x + (Math.random() - 0.5) * a.w, 0, a.z + (Math.random() - 0.5) * a.d);
    this.play('walk');
  }
}

// Follows a villager at a short distance, and runs to catch up.
class Dog extends Animal {
  constructor(model, villagers) {
    super(model, { speed: 2.2 });
    this.villagers = villagers;
    this.owner = villagers[0];
    this.switchIn = 40;
  }

  update(dt) {
    this.mixer.update(dt);
    this.switchIn -= dt;
    if (this.switchIn < 0) {
      this.owner = this.villagers[Math.floor(Math.random() * this.villagers.length)];
      this.switchIn = 40 + Math.random() * 40;
    }
    const owner = this.owner.model.position;
    const behind = new THREE.Vector3(Math.sin(this.owner.model.rotation.y), 0, Math.cos(this.owner.model.rotation.y)).multiplyScalar(-0.9).add(owner);
    const far = this.model.position.distanceTo(behind);
    if (far > 0.4) {
      this.play(far > 3 ? 'run' : 'walk');
      this.moveTowards(behind, dt, far > 3 ? 4 : 2.2);
    } else {
      this.play('idle');
    }
  }

  follow(villager) {
    this.owner = villager;
    this.switchIn = 90;
  }
}

export async function animals(scene, villagers) {
  const list = [];
  const add = async (kind, scale, x, z, opts) => {
    const model = await piece(`animals/animal-${kind}`, { x, z, scale, rot: Math.random() * 6 });
    model.position.y = 0.3 * scale; // the cube pets' feet sit below their origin
    scene.add(model);
    const a = new Animal(model, opts);
    list.push(a);
    return a;
  };
  // chickens peck around between the fields
  for (let i = 0; i < 6; i++) {
    await add('chick', 0.28, -10 + i * 4, 9.8, { speed: 0.8, area: { x: 0, z: 9.8, w: 22, d: 1.2 } });
  }
  await add('cow', 0.55, PADDOCK.x + 1, PADDOCK.z + 1, { speed: 0.5, area: { x: PADDOCK.x, z: PADDOCK.z, w: 4, d: 4 } });
  await add('pig', 0.4, PADDOCK.x - 1.5, PADDOCK.z + 1.5, { speed: 0.6, area: { x: PADDOCK.x, z: PADDOCK.z, w: 4, d: 4 } });
  for (let i = 0; i < 3; i++) {
    await add('bee', 0.16, 15 + i, 8 + i * 2, { speed: 1.5, area: { x: 15.5, z: 10, w: 5, d: 8 }, idleAnim: 'dance' });
  }
  for (const a of list.slice(-3)) a.model.position.y = 1.4 + Math.random(); // bees fly
  await add('cat', 0.3, 2.6, -6.5, { idleAnim: 'idle' });

  const dogModel = await piece('animals/animal-dog', { scale: 0.36 });
  dogModel.position.copy(villagers[0].model.position);
  dogModel.position.y = 0.3 * 0.36;
  scene.add(dogModel);
  const dog = new Dog(dogModel, villagers);
  list.push(dog);
  return { update: dt => list.forEach(a => a.update(dt)), dog };
}
