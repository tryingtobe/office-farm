// Game rules: coins, the auto-shop and building levels. No drawing code here.

export const COINS = { prs: 15, standups: 30, tickets: 50, release: 20, elderDay: 20 };

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

export const ROLE_ICON = { farmer: '🧑‍🌾', gardener: '🌻', builder: '🔨', elder: '👵' };

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

export function earnedCoins(counts, releases, elderDays = 0) {
  return counts.prs * COINS.prs + counts.standups * COINS.standups +
    counts.tickets * COINS.tickets + releases * COINS.release + elderDays * COINS.elderDay;
}

// Working days (Mon-Fri, Bishkek dates) from `since` up to and including the day of `updated`.
// The village elder doesn't use Slack or Jira, so she earns a daily allowance instead.
export function workingDays(since, updated) {
  if (!since || !updated) return 0;
  const last = new Date(Date.parse(updated) + 6 * 3600e3).toISOString().slice(0, 10);
  let n = 0;
  for (const d = new Date(since + 'T00:00:00Z'); d.toISOString().slice(0, 10) <= last; d.setUTCDate(d.getUTCDate() + 1)) {
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) n++;
  }
  return n;
}

// Colours someone can pick for their clothes (see the "farm" Slack commands in the README).
export const COLOURS = {
  red: '#c8371d', blue: '#1f5fa8', green: '#2a7f62', purple: '#6a3d9a', orange: '#d9822b', pink: '#d0507a',
  teal: '#14535e', maroon: '#7a1f3d', navy: '#1f3f7a', gold: '#e8b923', white: '#f4efe4', black: '#2b2b2b',
};

// Own choices: buy the listed items in order. Anything unknown, already owned or not affordable is skipped,
// so a wrong entry in farm.json can never give free items.
export function chosenShop(buys, earned) {
  let balance = earned;
  const owned = [];
  for (const id of buys) {
    const item = SHOP.find(it => it.id === id);
    if (!item || owned.includes(item) || balance < item.cost) continue;
    balance -= item.cost;
    owned.push(item);
  }
  return { owned, balance, savingFor: null };
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
  const looks = {};
  const elderDays = workingDays(data.since, data.updated);
  return data.team.map((p, i) => {
    const earned = earnedCoins(p.counts, data.releases, p.role === 'elder' ? elderDays : 0);
    // people with their own shop list choose for themselves; everyone else uses the auto-shop
    const shop = Array.isArray(p.shop?.buys) ? chosenShop(p.shop.buys, earned) : autoShop(p, earned);
    const latest = kind => [...shop.owned].reverse().find(it => it.kind === kind);
    return {
      ...p,
      index: i,
      lookIndex: (looks[p.look] = (looks[p.look] ?? -1) + 1),
      elderDays: p.role === 'elder' ? elderDays : 0,
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

// Badges only reward; nobody loses anything. All counted over the 7 days before `updated`.
export const BADGES = {
  earlyBird: { icon: '🐦', name: 'Early bird', about: 'First standup of the day' },
  streak: { icon: '🔥', name: 'Streak', about: '5 or more working days in a row with a standup' },
  bugHunter: { icon: '🐞', name: 'Bug hunter', about: '5 or more Done tickets this week' },
  greenThumb: { icon: '🌱', name: 'Green thumb', about: '5 or more merged PRs this week' },
};

export function badgesFor(person, events, updated) {
  const at = e => e.at ?? e.date;
  const weekAgo = new Date(Date.parse(updated) - 7 * 864e5).toISOString();
  const week = events.filter(e => at(e) >= weekAgo);
  const mine = week.filter(e => e.who === person.id);
  const out = [];

  // early bird: days where this person's standup came first
  const firstByDay = {};
  for (const e of week.filter(e => e.type === 'standup')) {
    const day = at(e).slice(0, 10);
    if (!firstByDay[day] || at(e) < at(firstByDay[day])) firstByDay[day] = e;
  }
  const early = Object.values(firstByDay).filter(e => e.who === person.id).length;
  if (early) out.push({ ...BADGES.earlyBird, count: early });

  // streak: count back over working days (Mon-Fri) from the last update; today may still be missing
  const days = new Set(events.filter(e => e.who === person.id && e.type === 'standup').map(e => at(e).slice(0, 10)));
  let streak = 0;
  const d = new Date(updated.slice(0, 10) + 'T00:00:00Z');
  if (!days.has(d.toISOString().slice(0, 10))) d.setUTCDate(d.getUTCDate() - 1);
  for (let i = 0; i < 60; i++, d.setUTCDate(d.getUTCDate() - 1)) {
    const wd = d.getUTCDay();
    if (wd === 0 || wd === 6) continue;
    if (!days.has(d.toISOString().slice(0, 10))) break;
    streak++;
  }
  if (streak >= 5) out.push({ ...BADGES.streak, count: streak });

  const tickets = mine.filter(e => e.type === 'ticket').length;
  if (tickets >= 5) out.push({ ...BADGES.bugHunter, count: tickets });
  const prs = mine.filter(e => e.type === 'pr').length;
  if (prs >= 5) out.push({ ...BADGES.greenThumb, count: prs });
  return out;
}
