// Office Farm: a fall-season farm that grows from real team work.
// The coin robot (GitHub Actions) writes data/farm.json. This file only reads it.

const COINS = { prs: 15, standups: 30, tickets: 50, release: 20 };

const SHOP = [
  { id: 'straw-hat',    kind: 'hat',   name: 'Straw hat',    icon: '👒', cost: 60 },
  { id: 'red-beanie',   kind: 'hat',   name: 'Red beanie',   icon: '🧶', cost: 90 },
  { id: 'cowboy-hat',   kind: 'hat',   name: 'Cowboy hat',   icon: '🤠', cost: 150 },
  { id: 'gold-crown',   kind: 'hat',   name: 'Golden crown', icon: '👑', cost: 400 },
  { id: 'watering-can', kind: 'tool',  name: 'Watering can', icon: '🪣', cost: 80 },
  { id: 'pitchfork',    kind: 'tool',  name: 'Pitchfork',    icon: '🔱', cost: 120 },
  { id: 'golden-hoe',   kind: 'tool',  name: 'Golden hoe',   icon: '✨', cost: 300 },
  { id: 'hay-bale',     kind: 'decor', name: 'Hay bale',     icon: '🌾', cost: 50 },
  { id: 'lantern',      kind: 'decor', name: 'Lantern',      icon: '🏮', cost: 70 },
  { id: 'scarecrow',    kind: 'decor', name: 'Scarecrow',    icon: '🎃', cost: 100 },
  { id: 'beehive',      kind: 'decor', name: 'Beehive',      icon: '🐝', cost: 150 },
  { id: 'pumpkin-cart', kind: 'decor', name: 'Pumpkin cart', icon: '🛞', cost: 250 },
];

const FARMER_CROPS = ['pumpkin', 'wheat', 'corn', 'carrot', 'cabbage'];
const GARDENER_CROPS = ['sunflower', 'mum', 'berry'];
const ROLE_ICON = { farmer: '🧑‍🌾', gardener: '🌻', builder: '🔨' };
const HOUSE_STEPS = [0, 2, 5, 9, 14, 20, 27];
const HOUSE_LABELS = ['Empty lot', 'Foundation', 'Frame', 'Walls', 'Roof', 'Door and windows', 'Finished office'];
const SKIN = ['#f1c27d', '#e0ac69', '#c68642', '#ffdbac', '#8d5524'];
const SHIRT = ['#c8371d', '#2f7dd1', '#6b8e23', '#7a3b69', '#f07b1f', '#1b9aaa', '#d6457a'];

const canvas = document.getElementById('farm');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

let farm = null;
let people = [];
let hitboxes = [];
let selectedId = null;
const leaves = Array.from({ length: 26 }, () => newLeaf(true));

// ---------- data ----------

function hash(text) {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

function earnedCoins(counts, releases) {
  return counts.prs * COINS.prs + counts.standups * COINS.standups +
    counts.tickets * COINS.tickets + releases * COINS.release;
}

// Auto-shop: buy wishlist items in order; stop at the first one you can't afford and save for it.
function autoShop(person, earned) {
  const wishlist = [...SHOP].sort((a, b) =>
    a.cost + hash(person.id + a.id) % 45 - (b.cost + hash(person.id + b.id) % 45));
  let balance = earned;
  const owned = [];
  for (const item of wishlist) {
    if (balance < item.cost) return { owned, balance, savingFor: item };
    balance -= item.cost;
    owned.push(item);
  }
  return { owned, balance, savingFor: null };
}

function buildPeople(data) {
  return data.team.map((p, i) => {
    const earned = earnedCoins(p.counts, data.releases);
    const shop = autoShop(p, earned);
    const latest = kind => [...shop.owned].reverse().find(it => it.kind === kind);
    return {
      ...p,
      index: i,
      earned,
      ...shop,
      hat: latest('hat'),
      tool: latest('tool'),
      decor: shop.owned.filter(it => it.kind === 'decor'),
      crop: p.role === 'gardener'
        ? GARDENER_CROPS[i % GARDENER_CROPS.length]
        : FARMER_CROPS[i % FARMER_CROPS.length],
      skin: SKIN[hash(p.id) % SKIN.length],
      shirt: SHIRT[hash(p.id + 'shirt') % SHIRT.length],
    };
  });
}

// ---------- drawing helpers ----------

function rect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function circle(x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function text(str, x, y, { size = 12, color = '#3b2414', align = 'left', bold = true } = {}) {
  ctx.font = `${bold ? 'bold ' : ''}${size}px "Trebuchet MS", sans-serif`;
  ctx.textAlign = align;
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

function newLeaf(anywhere) {
  return {
    x: Math.random() * W,
    y: anywhere ? Math.random() * H : -10,
    speed: 0.3 + Math.random() * 0.6,
    sway: Math.random() * Math.PI * 2,
    color: ['#c8371d', '#f07b1f', '#f5b82e', '#a0522d'][Math.floor(Math.random() * 4)],
  };
}

// ---------- scene ----------

function drawSky(t) {
  const sky = ctx.createLinearGradient(0, 0, 0, 240);
  sky.addColorStop(0, '#ffb26b');
  sky.addColorStop(1, '#ffe2b8');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, 240);
  circle(870, 60, 34, '#fff1c1');
  circle(870, 60, 26, '#ffd36b');
  // clouds drift slowly
  const drift = (t / 80) % (W + 200);
  for (const [cx, cy] of [[120, 50], [480, 35], [760, 90]]) {
    const x = ((cx + drift) % (W + 200)) - 100;
    circle(x, cy, 16, '#fff7ea');
    circle(x + 18, cy - 6, 20, '#fff7ea');
    circle(x + 40, cy, 15, '#fff7ea');
  }
  // hills
  ctx.fillStyle = '#c98b3d';
  ctx.beginPath();
  ctx.moveTo(0, 200);
  ctx.quadraticCurveTo(220, 130, 480, 190);
  ctx.quadraticCurveTo(720, 140, W, 185);
  ctx.lineTo(W, 260);
  ctx.lineTo(0, 260);
  ctx.fill();
  rect(0, 235, W, H - 235, '#9aaa3c');
  // grass speckles
  for (let i = 0; i < 160; i++) {
    const h = hash('g' + i);
    rect(h % W, 240 + (h >> 8) % (H - 240), 3, 3, i % 3 ? '#8a9a32' : '#b5b84a');
  }
}

function drawTrees() {
  const releases = farm.releases;
  const count = Math.min(8, 2 + releases);
  const totalTickets = people.reduce((sum, p) => sum + p.counts.tickets, 0);
  const fruitsPerTree = Math.min(9, Math.ceil(totalTickets / count / 2));
  const kinds = [
    { leaf: '#d9502b', fruit: '#b3121e' }, // apple
    { leaf: '#e8a33d', fruit: '#c6d43a' }, // pear
    { leaf: '#c75d2c', fruit: '#ff8c1a' }, // persimmon
  ];
  const startX = 370;
  const gap = (900 - startX) / Math.max(1, count - 1);
  for (let i = 0; i < count; i++) {
    const x = startX + i * gap;
    const y = 225;
    const kind = kinds[i % kinds.length];
    rect(x - 5, y - 40, 10, 42, '#6b3e1f');
    circle(x, y - 58, 30, kind.leaf);
    circle(x - 20, y - 46, 20, kind.leaf);
    circle(x + 20, y - 46, 20, kind.leaf);
    for (let f = 0; f < fruitsPerTree; f++) {
      const h = hash(`fruit${i}-${f}`);
      circle(x - 24 + h % 48, y - 78 + (h >> 6) % 40, 4, kind.fruit);
    }
  }
  text(`🍎 ${count} fruit trees · ${releases} release${releases === 1 ? '' : 's'}`, 900, 250,
    { size: 11, align: 'right', color: '#5a3a22' });
}

function drawHouse(t) {
  const builders = people.filter(p => p.role === 'builder');
  const points = builders.reduce((s, p) => s + p.counts.standups + p.counts.tickets + p.counts.prs, 0);
  let stage = 0;
  HOUSE_STEPS.forEach((need, i) => { if (points >= need) stage = i; });
  const x = 30, y = 95, w = 170, h = 120;
  rect(x - 6, y + h, w + 12, 10, '#7a5230'); // lot
  if (stage >= 1) rect(x, y + h - 10, w, 10, '#9e9e9e');
  if (stage >= 2) {
    ctx.strokeStyle = '#a86b32';
    ctx.lineWidth = 4;
    ctx.strokeRect(x + 6, y + 30, w - 12, h - 40);
    ctx.beginPath();
    ctx.moveTo(x + 6, y + h - 10); ctx.lineTo(x + w - 6, y + 30);
    ctx.stroke();
  }
  if (stage >= 3) rect(x + 6, y + 30, w - 12, h - 40, '#d9663a');
  if (stage >= 4) {
    ctx.fillStyle = '#7a3b69';
    ctx.beginPath();
    ctx.moveTo(x - 10, y + 34); ctx.lineTo(x + w / 2, y - 10); ctx.lineTo(x + w + 10, y + 34);
    ctx.fill();
  }
  if (stage >= 5) {
    rect(x + w / 2 - 14, y + h - 50, 28, 40, '#5a3a22');
    rect(x + 22, y + 48, 26, 22, '#ffe9a8');
    rect(x + w - 48, y + 48, 26, 22, '#ffe9a8');
  }
  if (stage >= 6) {
    rect(x + w - 50, y - 4, 16, 26, '#5a3a22');
    for (let i = 0; i < 3; i++) {
      circle(x + w - 42 + Math.sin(t / 400 + i) * 4, y - 14 - i * 12 - (t / 60 % 12), 6 + i * 2, 'rgba(255,255,255,.6)');
    }
    rect(x + w / 2 - 34, y + 32, 68, 14, '#f5b82e');
    text('ET OFFICE', x + w / 2, y + 43, { size: 10, align: 'center' });
  }
  // progress bar
  const pct = stage === 6 ? 1 : (points - HOUSE_STEPS[stage]) / (HOUSE_STEPS[stage + 1] - HOUSE_STEPS[stage]);
  rect(x, y + h + 16, w, 10, '#5a3a22');
  rect(x + 2, y + h + 18, (w - 4) * ((stage + pct) / 6), 6, '#f5b82e');
  text(`🏠 ${HOUSE_LABELS[stage]}`, x, y + h + 40, { size: 11, color: '#5a3a22' });

  builders.forEach((p, i) => {
    const bx = x + w + 36 + i * 64;
    const by = y + h + 2;
    drawPerson(p, bx, by, t);
    text(p.name, bx, by + 14, { size: 10, align: 'center' });
    hitboxes.push({ id: p.id, x: bx - 16, y: by - 50, w: 32, h: 66 });
  });
  hitboxes.push({ id: 'house', x, y, w, h });
}

function drawPerson(p, x, y, t) {
  const bob = Math.sin(t / 300 + p.index) * 1.5;
  const top = y - 40 + bob;
  rect(x - 6, y - 10, 5, 10, '#3b2f6b'); // legs
  rect(x + 1, y - 10, 5, 10, '#3b2f6b');
  rect(x - 8, top + 14, 16, 18, p.shirt); // body
  rect(x - 7, top, 14, 14, p.skin); // head
  rect(x - 4, top + 5, 2, 2, '#2b1d14');
  rect(x + 2, top + 5, 2, 2, '#2b1d14');
  if (p.role === 'builder') rect(x - 8, top + 14, 16, 4, '#f5b82e'); // hi-vis stripe
  const hat = p.hat ? p.hat.id : (p.role === 'builder' ? 'hard-hat' : 'hair');
  if (hat === 'hair') rect(x - 7, top - 2, 14, 4, '#3b2414');
  if (hat === 'hard-hat') { rect(x - 8, top - 4, 16, 6, '#f5b82e'); rect(x - 10, top + 1, 20, 2, '#e09b14'); }
  if (hat === 'straw-hat') { rect(x - 12, top - 1, 24, 3, '#e8c662'); rect(x - 6, top - 6, 12, 6, '#e8c662'); }
  if (hat === 'red-beanie') { rect(x - 8, top - 6, 16, 8, '#c8371d'); circle(x, top - 7, 3, '#fff'); }
  if (hat === 'cowboy-hat') { rect(x - 13, top - 1, 26, 3, '#8b5a2b'); rect(x - 6, top - 8, 12, 8, '#8b5a2b'); }
  if (hat === 'gold-crown') {
    rect(x - 7, top - 5, 14, 5, '#f5c518');
    for (const dx of [-7, -2, 3]) rect(x + dx, top - 9, 4, 4, '#f5c518');
  }
  if (p.tool) {
    const hx = x + 10;
    if (p.tool.id === 'watering-can') { rect(hx, top + 20, 12, 9, '#2f7dd1'); rect(hx + 12, top + 18, 5, 3, '#2f7dd1'); }
    if (p.tool.id === 'pitchfork') {
      rect(hx + 2, top - 4, 3, 36, '#8b5a2b');
      for (const dx of [-1, 3, 7]) rect(hx + dx - 1, top - 10, 2, 7, '#9e9e9e');
    }
    if (p.tool.id === 'golden-hoe') { rect(hx + 2, top - 2, 3, 34, '#8b5a2b'); rect(hx - 4, top - 4, 10, 4, '#f5c518'); }
  }
}

function drawCrop(kind, stage, x, y) {
  // (x, y) is the bottom center of a soil tile
  circle(x, y - 3, 5, '#5a3a22');
  if (stage === 0) return;
  const green = '#4f8a2b';
  if (kind === 'wheat' || kind === 'corn') {
    const hgt = 6 + stage * 6;
    for (const dx of [-5, 0, 5]) rect(x + dx - 1, y - hgt, 2, hgt, stage === 4 ? '#e3b23c' : green);
    if (stage === 4 && kind === 'corn') rect(x + 2, y - hgt + 4, 5, 9, '#f5d33d');
    if (stage === 4 && kind === 'wheat') for (const dx of [-5, 0, 5]) rect(x + dx - 2, y - hgt - 4, 4, 6, '#d9a531');
    return;
  }
  // leafy plants
  const size = 2 + stage * 2.5;
  circle(x - size / 2, y - 4 - size / 2, size / 1.4, green);
  circle(x + size / 2, y - 4 - size / 2, size / 1.4, '#5fa133');
  if (stage < 4) return;
  if (kind === 'pumpkin') { circle(x, y - 6, 7, '#f07b1f'); rect(x - 1, y - 15, 2, 4, '#4f3a1f'); }
  if (kind === 'carrot') { rect(x - 2, y - 8, 4, 8, '#f07b1f'); }
  if (kind === 'cabbage') { circle(x, y - 7, 7, '#9ccf5a'); }
  if (kind === 'sunflower') { rect(x - 1, y - 22, 2, 18, green); circle(x, y - 24, 6, '#f5c518'); circle(x, y - 24, 3, '#5a3a22'); }
  if (kind === 'mum') { for (const dx of [-4, 0, 4]) circle(x + dx, y - 12 + Math.abs(dx) / 2, 3.5, '#b5338a'); }
  if (kind === 'berry') { for (const dx of [-4, 0, 4]) circle(x + dx, y - 9, 2.5, '#3a3fa8'); }
}

function drawDecor(id, x, y, t) {
  if (id === 'hay-bale') { rect(x - 9, y - 10, 18, 10, '#e3c45a'); rect(x - 9, y - 6, 18, 1, '#b8952e'); }
  if (id === 'lantern') {
    circle(x, y - 10, 9 + Math.sin(t / 250) * 1.5, 'rgba(255,190,80,.35)');
    rect(x - 4, y - 14, 8, 9, '#ff8c1a');
    rect(x - 1, y - 18, 2, 4, '#3b2414');
  }
  if (id === 'scarecrow') {
    rect(x - 1, y - 24, 2, 24, '#8b5a2b');
    rect(x - 10, y - 18, 20, 2, '#8b5a2b');
    circle(x, y - 26, 5, '#e8c662');
    rect(x - 7, y - 32, 14, 3, '#8b5a2b');
  }
  if (id === 'beehive') {
    rect(x - 7, y - 6, 14, 6, '#e3a72f');
    rect(x - 6, y - 11, 12, 5, '#f5c518');
    rect(x - 4, y - 15, 8, 4, '#e3a72f');
    const bx = x + Math.cos(t / 300) * 12;
    const by = y - 18 + Math.sin(t / 200) * 5;
    rect(bx - 2, by - 1, 4, 3, '#2b1d14');
    rect(bx - 1, by - 1, 1, 3, '#f5c518');
  }
  if (id === 'pumpkin-cart') {
    rect(x - 12, y - 10, 24, 6, '#8b5a2b');
    circle(x - 7, y - 2, 3, '#3b2414');
    circle(x + 7, y - 2, 3, '#3b2414');
    for (const dx of [-6, 0, 6]) circle(x + dx, y - 13, 4, '#f07b1f');
  }
}

function drawBasket(x, y) {
  rect(x - 7, y - 7, 14, 8, '#a86b32');
  rect(x - 7, y - 5, 14, 1, '#7a4a22');
  circle(x - 3, y - 8, 3, '#c8371d');
  circle(x + 3, y - 8, 3, '#f07b1f');
}

function drawPlot(p, x, y, w, h, t) {
  const chosen = selectedId === p.id;
  rect(x, y, w, h, chosen ? '#fff1c1' : '#d6b37a');
  rect(x + 3, y + 3, w - 6, h - 6, chosen ? '#ffe39a' : '#c7a065');
  text(`${ROLE_ICON[p.role]} ${p.name}`, x + 8, y + 18, { size: 12 });
  text(`🪙 ${p.earned}`, x + w - 8, y + 18, { size: 11, align: 'right', color: '#8a4a00' });

  // soil: 4 x 2 tiles
  const tiles = p.role === 'gardener' ? 1 + p.counts.tickets : 1 + p.counts.prs;
  const sx = x + 10, sy = y + 28, tile = 26;
  rect(sx - 2, sy - 2, tile * 4 + 4, tile * 2 + 4, '#6b4423');
  for (let i = 0; i < 8; i++) {
    const tx = sx + (i % 4) * tile;
    const ty = sy + Math.floor(i / 4) * tile;
    rect(tx + 1, ty + 1, tile - 2, tile - 2, '#7a4f2a');
    if (i < Math.min(8, tiles)) {
      const stage = Math.max(0, Math.min(4, Math.floor((p.counts.standups - i + 1) / 2)));
      drawCrop(p.crop, stage, tx + tile / 2, ty + tile - 2);
    }
  }
  if (tiles > 8) text(`+${tiles - 8}`, sx + tile * 4 - 2, sy + tile * 2 + 14, { size: 10, color: '#3b6b12' });

  // harvest baskets
  const baskets = Math.min(5, p.counts.tickets);
  for (let i = 0; i < baskets; i++) drawBasket(sx + 8 + i * 17, y + h - 10);
  if (p.counts.tickets > 5) text(`×${p.counts.tickets}`, sx + 8 + 5 * 17, y + h - 6, { size: 10 });

  // decorations stand along the right edge
  p.decor.slice(-3).forEach((d, i) => drawDecor(d.id, x + w - 14, y + 52 + i * 30, t));
  drawPerson(p, x + w - 40, y + h - 30, t);
  hitboxes.push({ id: p.id, x, y, w, h });
}

function drawLeaves() {
  for (const leaf of leaves) {
    leaf.y += leaf.speed;
    leaf.sway += 0.03;
    leaf.x += Math.sin(leaf.sway) * 0.6;
    if (leaf.y > H) Object.assign(leaf, newLeaf(false));
    rect(leaf.x, leaf.y, 5, 4, leaf.color);
  }
}

function render(t) {
  hitboxes = [];
  drawSky(t);
  drawTrees();
  drawHouse(t);
  const plots = people.filter(p => p.role !== 'builder');
  const cols = Math.ceil(plots.length / 2);
  const w = (W - 40 - (cols - 1) * 8) / cols;
  plots.forEach((p, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    drawPlot(p, 20 + col * (w + 8), 285 + row * 156, w, 148, t);
  });
  drawLeaves();
  if (farm.sample) {
    rect(W - 130, 8, 120, 22, 'rgba(122,59,105,.9)');
    text('SAMPLE DATA', W - 70, 23, { size: 11, color: '#fff', align: 'center' });
  }
  requestAnimationFrame(render);
}

// ---------- sidebar ----------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function shortDate(iso) {
  const [, m, d] = iso.slice(0, 10).split('-');
  return `${MONTHS[+m - 1]} ${+d}`;
}

function eventText(e) {
  const p = people.find(x => x.id === e.who);
  const name = p ? p.name : 'Someone';
  if (e.type === 'release') return `🎉 Production release! A new fruit tree is planted. Everyone +${COINS.release}`;
  if (e.type === 'standup') return `💧 ${name} posted a standup and watered the crops +${COINS.standups}`;
  if (e.type === 'pr') return `🌱 ${name} merged a pull request and planted a crop +${COINS.prs}`;
  if (e.type === 'ticket') return `🧺 ${name} finished a ticket and filled a basket +${COINS.tickets}`;
  return `${name} did something`;
}

function showPerson(id) {
  selectedId = id;
  const card = document.getElementById('selected');
  if (id === 'house') {
    const names = people.filter(p => p.role === 'builder').map(p => p.name).join(' and ');
    card.innerHTML = `<h3>🏠 The office house</h3><p>${names} are building it. Every standup, PR and ticket from a builder adds a step.</p>`;
  } else {
    const p = people.find(x => x.id === id);
    const items = p.owned.map(it => `${it.icon} ${it.name}`).join(', ') || 'Nothing yet';
    const saving = p.savingFor ? `${p.savingFor.icon} ${p.savingFor.name} (${p.savingFor.cost - p.balance} more 🪙)` : 'Bought everything! 🎉';
    card.innerHTML = `
      <h3>${ROLE_ICON[p.role]} ${p.name} <small>(${p.role})</small></h3>
      <div class="grid">
        <span>💧 Standups: ${p.counts.standups}</span><span>🌱 PRs: ${p.counts.prs}</span>
        <span>🧺 Tickets: ${p.counts.tickets}</span><span>🎉 Releases: ${farm.releases}</span>
        <span>🪙 Earned: ${p.earned}</span><span>👛 Left: ${p.balance}</span>
      </div>
      <p><b>Owns:</b> ${items}</p>
      <p><b>Saving for:</b> ${saving}</p>`;
  }
  card.classList.remove('hidden');
  openTab('board');
}

function renderSidebar() {
  const ranked = [...people].sort((a, b) => b.earned - a.earned);
  document.getElementById('leaderboard').innerHTML = ranked.map((p, i) => `
    <li data-id="${p.id}">
      <span class="rank">${['🥇', '🥈', '🥉'][i] || i + 1}</span>
      <span class="who">${p.name}<small>${ROLE_ICON[p.role]} ${p.role} · ${p.owned.map(it => it.icon).join('')}</small></span>
      <span class="coins">🪙 ${p.earned}</span>
    </li>`).join('');
  document.querySelectorAll('#leaderboard li').forEach(li =>
    li.addEventListener('click', () => showPerson(li.dataset.id)));

  const groups = { hat: '🎩 Hats', tool: '🛠️ Tools', decor: '🌼 Decorations' };
  document.getElementById('shop-items').innerHTML = Object.entries(groups).map(([kind, title]) => `
    <h4>${title}</h4>
    ${SHOP.filter(it => it.kind === kind).map(it => {
      const owners = people.filter(p => p.owned.includes(it)).map(p => p.name);
      return `<div class="item">
        <span class="icon">${it.icon}</span>
        <span class="name">${it.name}<br><small>${owners.length ? 'Owned by ' + owners.join(', ') : 'Nobody yet'}</small></span>
        <span class="coins">🪙 ${it.cost}</span>
      </div>`;
    }).join('')}`).join('');

  document.getElementById('feed').innerHTML = farm.events.map(e =>
    `<li><time>${shortDate(e.date)}</time>${eventText(e)}</li>`).join('');

  const total = people.reduce((s, p) => s + p.earned, 0);
  document.getElementById('team-coins').textContent = `🪙 ${total} team coins`;
  document.getElementById('updated').textContent = `Updated: ${shortDate(farm.updated)}`;
}

function openTab(name) {
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === `panel-${name}`));
}

document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => openTab(b.dataset.tab)));

canvas.addEventListener('click', ev => {
  const box = canvas.getBoundingClientRect();
  const x = (ev.clientX - box.left) * (W / box.width);
  const y = (ev.clientY - box.top) * (H / box.height);
  const hit = [...hitboxes].reverse().find(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
  if (hit) showPerson(hit.id);
});

// Cache-bust so a fresh robot update shows up without a hard refresh.
fetch(`data/farm.json?v=${Date.now()}`)
  .then(r => r.json())
  .then(data => {
    farm = data;
    people = buildPeople(data);
    renderSidebar();
    requestAnimationFrame(render);
  })
  .catch(err => {
    ctx.fillStyle = '#fff';
    ctx.fillText(`Could not load farm data: ${err.message}`, 20, 40);
  });
