// Sky colour, sun and moon, night lights, fireflies, rain or snow, and seasonal particles
// (falling leaves in fall, petals in spring, snowflakes in winter).
import * as THREE from 'three';

const DAY_SKY = { fall: '#f6c88f', summer: '#a9d8f2', spring: '#c6e6f5', winter: '#d6e2ee' };
const DUSK = new THREE.Color('#f0925a');
const NIGHT = new THREE.Color('#141a33');
const OVERCAST = new THREE.Color('#9ea3ad');
const FOG_RANGE = { sunny: [45, 150], fog: [14, 60], rain: [25, 95], snow: [20, 85] };

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,220,150,1)');
  grad.addColorStop(0.4, 'rgba(255,170,80,.45)');
  grad.addColorStop(1, 'rgba(255,150,60,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// A cloud of particles that falls and wraps around inside a box.
function falling(scene, { count, size, colors, speed, sway, box, spin = false, shape = 'square' }) {
  const geo = shape === 'line' ? new THREE.BoxGeometry(0.02, 0.45, 0.02) : new THREE.PlaneGeometry(size, size * 0.75);
  const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true, opacity: shape === 'line' ? 0.45 : 0.95 });
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  const palette = colors.map(c => new THREE.Color(c));
  const state = [];
  for (let i = 0; i < count; i++) {
    mesh.setColorAt(i, palette[i % palette.length]);
    state.push({ x: (Math.random() - 0.5) * box, y: Math.random() * 14, z: (Math.random() - 0.5) * box, s: speed * (0.6 + Math.random() * 0.8), p: Math.random() * 6 });
  }
  mesh.frustumCulled = false;
  scene.add(mesh);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  return {
    mesh,
    update(dt, centre) {
      state.forEach((l, i) => {
        l.y -= l.s * dt;
        l.p += dt * 2;
        if (l.y < 0) { l.y = 14; l.x = (Math.random() - 0.5) * box; l.z = (Math.random() - 0.5) * box; }
        v.set(centre.x + l.x + Math.sin(l.p) * sway, l.y, centre.z + l.z + Math.cos(l.p * 0.7) * sway);
        q.setFromEuler(e.set(spin ? l.p : 0, spin ? l.p * 0.6 : 0, 0));
        mesh.setMatrixAt(i, m.compose(v, q, one));
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

export function atmosphere(scene, { sun, hemi }, env) {
  const glowTex = glowTexture();
  const glows = [];
  const lamps = [];

  // warm glow on every lantern, plus one real light per building door (lights are expensive)
  function lightUp(lanternObjects, doors) {
    for (const o of lanternObjects) {
      const p = o.getWorldPosition(new THREE.Vector3());
      const s = o.getWorldScale(new THREE.Vector3()).y;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      sprite.position.set(p.x, p.y + 1.4 * s, p.z);
      sprite.scale.setScalar(1.6);
      scene.add(sprite);
      glows.push(sprite);
    }
    for (const d of doors) {
      const light = new THREE.PointLight('#ffb35c', 0, 9, 1.5);
      light.position.set(d.x, 1.8, d.z);
      scene.add(light);
      lamps.push(light);
    }
  }

  // fireflies over the fields at night
  const flyCount = 70;
  const flyGeo = new THREE.BufferGeometry();
  const flyPos = new Float32Array(flyCount * 3);
  const flySeed = [];
  for (let i = 0; i < flyCount; i++) {
    flySeed.push({ x: (Math.random() - 0.5) * 26, z: 5 + Math.random() * 11, y: 0.4 + Math.random() * 1.4, p: Math.random() * 6 });
  }
  flyGeo.setAttribute('position', new THREE.BufferAttribute(flyPos, 3));
  const flies = new THREE.Points(flyGeo, new THREE.PointsMaterial({ color: '#f6ff8a', size: 0.14, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  flies.frustumCulled = false;
  scene.add(flies);

  const seasonal = {
    fall: { count: 180, size: 0.12, colors: ['#c8371d', '#f07b1f', '#f5b82e', '#a0522d'], speed: 0.45, sway: 0.4, spin: true },
    spring: { count: 140, size: 0.1, colors: ['#f7b6d2', '#ffd6e7', '#ffffff'], speed: 0.35, sway: 0.6, spin: true },
    winter: { count: 120, size: 0.07, colors: ['#ffffff'], speed: 0.5, sway: 0.3 },
    summer: null,
  }[env.season];
  const drift = seasonal && falling(scene, { ...seasonal, box: 40 });
  const precip = env.weather === 'rain'
    ? falling(scene, { count: 900, colors: ['#c9d6e8'], speed: 14, sway: 0, box: 46, shape: 'line' })
    : env.weather === 'snow'
      ? falling(scene, { count: 900, size: 0.08, colors: ['#ffffff'], speed: 1.2, sway: 0.5, box: 46 })
      : null;

  const sky = new THREE.Color();
  const day = new THREE.Color(DAY_SKY[env.season]);
  const overcast = env.weather === 'sunny' ? 0 : env.weather === 'fog' ? 0.55 : 0.45;
  [scene.fog.near, scene.fog.far] = FOG_RANGE[env.weather];

  function update(dt, t, now, centre) {
    const d = now.daylight;
    if (d < 0.5) sky.lerpColors(NIGHT, DUSK, d * 2);
    else sky.lerpColors(DUSK, day, (d - 0.5) * 2);
    sky.lerp(OVERCAST, overcast * (0.3 + 0.7 * d));
    scene.background.copy(sky);
    scene.fog.color.copy(sky);

    // sun travels east to west during the day; at night the same light is a dim blue moon
    const a = ((now.hour - 6) / 14) * Math.PI;
    sun.position.set(-Math.cos(a) * 26, 6 + Math.max(0, Math.sin(a)) * 22, 12);
    sun.color.set(d > 0.05 ? '#ffd49a' : '#9fb4ff');
    sun.intensity = d > 0.05 ? 2.1 * d * (1 - overcast * 0.5) : 0.45;
    hemi.intensity = 0.45 + 1.35 * d; // more sky light and less sun keeps shadows gentle
    hemi.color.set(d > 0.3 ? '#ffe7c4' : '#6b7bb0');

    const dark = 1 - d;
    glows.forEach(g => { g.material.opacity = dark; g.visible = dark > 0.05; });
    lamps.forEach(l => { l.intensity = dark * 6; });

    flies.material.opacity = Math.max(0, dark - 0.3) * (env.weather === 'sunny' ? 1 : 0.4);
    flies.visible = flies.material.opacity > 0.01 && env.season !== 'winter';
    if (flies.visible) {
      flySeed.forEach((f, i) => {
        flyPos[i * 3] = f.x + Math.sin(t * 0.7 + f.p) * 0.8;
        flyPos[i * 3 + 1] = f.y + Math.sin(t * 1.3 + f.p) * 0.3;
        flyPos[i * 3 + 2] = f.z + Math.cos(t * 0.6 + f.p) * 0.8;
      });
      flyGeo.attributes.position.needsUpdate = true;
    }
    drift?.update(dt, centre);
    precip?.update(dt, centre);
  }

  return { update, lightUp };
}
