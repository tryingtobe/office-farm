// Loads Kenney models once and hands out clones.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// Nature models look softer with smooth shading. Fences and blocky kit parts keep their crisp edges.
const SMOOTH = /^nature\/(?!fence|cliff|bridge|tree_blocks)/;

const loader = new GLTFLoader();
const cache = new Map();

export function load(path) {
  if (!cache.has(path)) {
    cache.set(path, loader.loadAsync(`${new URL('../assets/', import.meta.url)}${path}.glb`).then(gltf => {
      gltf.scene.traverse(o => {
        if (!o.isMesh) return;
        o.castShadow = true;
        o.receiveShadow = true;
        // some kit materials are fully metallic, which renders black without an environment map
        for (const m of [].concat(o.material)) { m.metalness = 0; m.roughness = 1; }
        if (SMOOTH.test(path)) {
          const geo = o.geometry.clone();
          geo.deleteAttribute('normal');
          o.geometry = mergeVertices(geo, 1e-3);
          o.geometry.computeVertexNormals();
        }
      });
      return gltf;
    }));
  }
  return cache.get(path);
}

export async function preload(paths) {
  await Promise.all(paths.map(load));
}


export async function piece(path, { x = 0, y = 0, z = 0, rot = 0, scale = 1 } = {}) {
  const gltf = await load(path);
  const obj = gltf.animations.length ? cloneSkinned(gltf.scene) : gltf.scene.clone();
  obj.name = path.split('/').pop();
  obj.position.set(x, y, z);
  obj.rotation.y = rot;
  obj.scale.setScalar(scale);
  obj.userData.animations = gltf.animations;
  return obj;
}

// Rotation that turns a piece whose face points +x toward the given side.
export const FACE = { px: 0, nx: Math.PI, pz: -Math.PI / 2, nz: Math.PI / 2 };

/**
 * Build a simple house: w x d cells, `floors` storeys, gable roof with the ridge along z.
 * Returns a Group whose origin is the centre of the footprint at ground level.
 */
export async function house({ w = 2, d = 2, floors = 1, wall = 'wall', door = 'wall-door',
  window = 'wall-window-shutters', roof = 'roof', roofHigh = false } = {}) {
  const g = new THREE.Group();
  const ox = -(w - 1) / 2, oz = -(d - 1) / 2;
  const jobs = [];
  for (let f = 0; f < floors; f++) {
    for (let i = 0; i < w; i++) {
      for (let k = 0; k < d; k++) {
        const x = ox + i, z = oz + k, y = f;
        const sides = [];
        if (i === w - 1) sides.push('px');
        if (i === 0) sides.push('nx');
        if (k === d - 1) sides.push('pz');
        if (k === 0) sides.push('nz');
        for (const s of sides) {
          let kind = wall;
          if (f === 0 && s === 'pz' && i === Math.floor((w - 1) / 2)) kind = door;
          else if ((i + k + f) % 2 === 1) kind = window;
          jobs.push(piece(`town/${kind}`, { x, y, z, rot: FACE[s] }));
        }
      }
    }
  }
  // roof: left half slopes up toward +x, right half toward -x
  const rp = `town/${roof}${roofHigh ? '-high' : ''}`;
  for (let i = 0; i < w; i++) {
    for (let k = 0; k < d; k++) {
      const left = i < w / 2;
      jobs.push(piece(rp, { x: ox + i, y: floors, z: oz + k, rot: left ? 0 : Math.PI }));
    }
  }
  (await Promise.all(jobs)).forEach(o => g.add(o));
  return g;
}
