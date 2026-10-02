// Game rules: coins, the auto-shop and building levels. No drawing code here.

export const COINS = { prs: 15, standups: 30, tickets: 50, release: 20 };

export const SHOP = [
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

export const ROLE_ICON = { farmer: '🧑‍🌾', gardener: '🌻', builder: '🔨' };

// Each building grows from one kind of team activity. `steps` are the totals needed for levels 1-4.
export const BUILDINGS = [
  { id: 'office',     name: 'Office',          icon: '🏛️', x: 0,   z: -12, grows: 'builders’ work',   steps: [3, 6, 10, 15] },
  { id: 'conference', name: 'Conference room', icon: '🗣️', x: -9,  z: -9, grows: 'team standups',    steps: [10, 30, 60, 100] },
  { id: 'store',      name: 'Store',           icon: '🏪', x: 9,   z: -9, grows: 'coins spent',      steps: [300, 1200, 2500, 4000] },
  { id: 'fridge',     name: 'Fridge',          icon: '🧊', x: -14, z: 8,  grows: 'Done tickets',     steps: [5, 15, 30, 50] },
  { id: 'gameroom',   name: 'Game room',       icon: '🎮', x: 13,  z: -1, grows: 'releases',         steps: [1, 2, 4, 6] },
  { id: 'bathroom',   name: 'Bathroom',        icon: '🚻', x: -13, z: -1, grows: 'merged PRs',      steps: [5, 15, 30, 50] },
];

export function hash(text) {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function earnedCoins(counts, releases) {
  return counts.prs * COINS.prs + counts.standups * COINS.standups +
    counts.tickets * COINS.tickets + releases * COINS.release;
}

// Auto-shop: buy wishlist items in order; stop at the first one you can't afford and save for it.
export function autoShop(person, earned) {
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

export function buildPeople(data) {
  return data.team.map((p, i) => {
    const earned = earnedCoins(p.counts, data.releases);
    const shop = autoShop(p, earned);
    const latest = kind => [...shop.owned].reverse().find(it => it.kind === kind);
    return {
      ...p,
      index: i,
      earned,
      ...shop,
      spent: earned - shop.balance,
      hat: latest('hat'),
      tool: latest('tool'),
      decor: shop.owned.filter(it => it.kind === 'decor'),
    };
  });
}

export function buildingProgress(people, releases) {
  const sum = (list, f) => list.reduce((s, p) => s + f(p), 0);
  const builders = people.filter(p => p.role === 'builder');
  const totals = {
    office: sum(builders, p => p.counts.standups + p.counts.tickets + p.counts.prs),
    conference: sum(people, p => p.counts.standups),
    store: sum(people, p => p.spent),
    fridge: sum(people, p => p.counts.tickets),
    gameroom: releases,
    bathroom: sum(people, p => p.counts.prs),
  };
  return BUILDINGS.map(b => {
    const value = totals[b.id];
    const level = b.steps.filter(s => value >= s).length;
    return { ...b, value, level, next: b.steps[level] ?? null };
  });
}
