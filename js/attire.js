// Kyrgyz traditional clothes for the villagers, attached to the character bones.
// Men: ak-kalpak (white felt hat) and a chapan (long open robe) with a belt.
// Women: a long dress, a velvet vest (chyptama) and a round cap with an owl feather (uki).
// The village elder wears an elechek (white headdress). Sizes are in character units, before SCALE.
import * as THREE from 'three';
import { hash } from './logic.js';

const mats = new Map();
const mat = (color, side = THREE.FrontSide) => {
  const key = color + side;
  if (!mats.has(key)) mats.set(key, new THREE.MeshLambertMaterial({ color, side }));
  return mats.get(key);
};
const VELVET = ['#7a1f3d', '#1f3f7a', '#2f6b4a', '#5a2d82', '#8a3b1f', '#14535e'];
const DRESS = ['#c8371d', '#2a7f62', '#6a3d9a', '#1f5fa8', '#d9822b', '#b02a5b'];
const GOLD = '#e8b923';
// More hats bought in the shop = richer embroidery on the traditional hat
const TRIM = ['#2b1d14', '#c8371d', '#2f5fb3', '#3a8a3a', GOLD];

function mesh(geo, material, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

// An open ring (gap at the front, +z) for robes and vests.
function openTube(rTop, rBottom, height, gap, segments = 24) {
  return new THREE.CylinderGeometry(rTop, rBottom, height, segments, 1, true, gap / 2, Math.PI * 2 - gap);
}

function chapan(torso, colour) {
  const robe = mat(colour, THREE.DoubleSide);
  const gold = mat(GOLD, THREE.DoubleSide);
  // from the shoulders down to the shins; flatter front to back like the body
  const g = new THREE.Group();
  g.scale.z = 0.85;
  torso.add(g);
  mesh(openTube(0.152, 0.2, 0.28, 0.55), robe, g, 0, 0.02, 0);
  mesh(openTube(0.203, 0.204, 0.025, 0.55), gold, g, 0, -0.11, 0); // hem
  mesh(new THREE.CylinderGeometry(0.157, 0.157, 0.03, 24), mat('#3b2414'), g, 0, 0.03, 0); // belt (kur)
  mesh(new THREE.BoxGeometry(0.04, 0.035, 0.02), gold, g, 0, 0.03, 0.155); // buckle
}

function longDress(torso, colour, vestColour) {
  const g = new THREE.Group();
  g.scale.z = 0.85;
  torso.add(g);
  mesh(new THREE.CylinderGeometry(0.14, 0.215, 0.2, 24), mat(colour), g, 0, -0.075, 0);
  mesh(new THREE.CylinderGeometry(0.218, 0.218, 0.02, 24), mat(GOLD), g, 0, -0.17, 0); // hem
  // chyptama: a short velvet vest, open at the front, with gold edges
  mesh(openTube(0.148, 0.152, 0.15, 0.7), mat(vestColour, THREE.DoubleSide), g, 0, 0.085, 0);
  mesh(openTube(0.154, 0.156, 0.015, 0.7), mat(GOLD, THREE.DoubleSide), g, 0, 0.012, 0);
}

function akKalpak(head, trim) {
  // white felt, tall with a rounded peak, a black upturned brim and dark embroidery on four sides
  const g = new THREE.Group();
  g.position.y = 0.29;
  g.scale.z = 0.82;
  head.add(g);
  const profile = [[0.245, 0], [0.228, 0.08], [0.19, 0.17], [0.135, 0.28], [0.07, 0.37], [0.025, 0.41], [0, 0.415]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  mesh(new THREE.LatheGeometry(profile, 28), mat("#f4efe4", THREE.DoubleSide), g);
  mesh(new THREE.CylinderGeometry(0.25, 0.262, 0.07, 28, 1, true), mat("#1b1b1b", THREE.DoubleSide), g, 0, 0.03, 0);
  for (let i = 0; i < 4; i++) {
    const side = new THREE.Group();
    side.rotation.y = Math.PI / 4 + (i * Math.PI) / 2;
    g.add(side);
    const line = mesh(new THREE.BoxGeometry(0.022, 0.25, 0.01), mat(trim), side, 0, 0.2, 0.165);
    line.rotation.x = -0.48; // lean in with the slope of the hat
  }
  mesh(new THREE.SphereGeometry(0.028, 10, 8), mat(trim), g, 0, 0.415, 0); // tassel
}

function ukiCap(head, colour, trim) {
  // round velvet cap with a gold band and a white owl-feather plume
  const g = new THREE.Group();
  g.position.y = 0.3;
  head.add(g);
  mesh(new THREE.SphereGeometry(0.24, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(colour), g, 0, 0.02, 0).scale.y = 0.55;
  mesh(new THREE.CylinderGeometry(0.248, 0.25, 0.05, 28), mat(trim === TRIM[0] ? GOLD : trim), g, 0, 0.02, 0);
  const plume = new THREE.Group();
  plume.position.set(0, 0.13, -0.02);
  g.add(plume);
  // a soft fan of feathers
  for (const tilt of [-0.5, -0.25, 0, 0.25, 0.5]) {
    const f = mesh(new THREE.SphereGeometry(1, 12, 10), mat(tilt ? '#f1ece2' : '#fbfaf5'), plume, Math.sin(tilt) * 0.08, Math.cos(tilt) * 0.08, 0);
    f.scale.set(0.035, 0.1, 0.018);
    f.rotation.z = -tilt;
  }
}

function elechek(head) {
  // the elder's tall white headdress: wrapped layers and a cloth down the back
  const white = mat('#fbf8f0', THREE.DoubleSide);
  const g = new THREE.Group();
  g.position.y = 0.28;
  head.add(g);
  mesh(new THREE.CylinderGeometry(0.245, 0.255, 0.2, 28), white, g, 0, 0.1, 0);
  for (const y of [0.04, 0.11, 0.18]) mesh(new THREE.TorusGeometry(0.25, 0.022, 8, 28), white, g, 0, y, 0).rotation.x = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.2, 0.245, 0.06, 28), white, g, 0, 0.23, 0);
  // the cloth frames the face and falls behind the head
  mesh(new THREE.CylinderGeometry(0.255, 0.27, 0.36, 24, 1, true, Math.PI * 0.62, Math.PI * 0.76), white, g, 0, -0.15, 0);
}

/**
 * Dress a character model. person: { look: 'female'|'male', id, role, hatTier }
 * Returns nothing; the clothes are children of the model's bones, so they move with the animations.
 */
export function dress(model, person) {
  const torso = model.getObjectByName('torso');
  const head = model.getObjectByName('head');
  if (!torso || !head) return;
  const h = hash(person.id + 'attire');
  const trim = TRIM[Math.min(TRIM.length - 1, person.hatTier ?? 0)];
  if (person.look === 'female') {
    longDress(torso, DRESS[h % DRESS.length], VELVET[(h >> 3) % VELVET.length]);
    if (person.role === 'elder') elechek(head);
    else ukiCap(head, VELVET[(h >> 5) % VELVET.length], trim);
  } else {
    chapan(torso, VELVET[h % VELVET.length]);
    akKalpak(head, trim);
  }
}
