// Release fireworks over the village square.
import * as THREE from 'three';

const COLORS = ['#ff4d4d', '#ffd23f', '#3fc1ff', '#b45cff', '#5cff8a', '#ff9a3f'];
const bursts = [];

function burst(scene, at) {
  const count = 90;
  const pos = new Float32Array(count * 3);
  const vel = [];
  for (let i = 0; i < count; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(3 + Math.random() * 2);
    vel.push(v);
    pos.set([at.x, at.y, at.z], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({
    color: COLORS[Math.floor(Math.random() * COLORS.length)], size: 0.35, transparent: true, depthWrite: false,
  }));
  scene.add(points);
  bursts.push({ points, vel, age: 0 });
}

// Fire a show of `seconds` length around (0, 0).
export function fireworks(scene, seconds = 8) {
  for (let t = 0; t < seconds; t += 0.45) {
    setTimeout(() => burst(scene, new THREE.Vector3((Math.random() - 0.5) * 10, 7 + Math.random() * 4, (Math.random() - 0.5) * 8 - 2)), t * 1000);
  }
}

export function updateFireworks(scene, dt) {
  for (let i = bursts.length - 1; i >= 0; i--) {
    const b = bursts[i];
    b.age += dt;
    const arr = b.points.geometry.attributes.position.array;
    b.vel.forEach((v, j) => {
      v.y -= 2.5 * dt;
      v.multiplyScalar(1 - dt * 0.8);
      arr[j * 3] += v.x * dt; arr[j * 3 + 1] += v.y * dt; arr[j * 3 + 2] += v.z * dt;
    });
    b.points.geometry.attributes.position.needsUpdate = true;
    b.points.material.opacity = Math.max(0, 1 - b.age / 1.8);
    if (b.age > 1.8) {
      scene.remove(b.points);
      b.points.geometry.dispose();
      b.points.material.dispose();
      bursts.splice(i, 1);
    }
  }
}
