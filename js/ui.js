// The side panel: leaderboard, town, shop, activity feed.
import { COINS, SHOP, ROLE_ICON } from './logic.js';

const $ = id => document.getElementById(id);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function shortDate(iso) {
  const [, m, d] = iso.slice(0, 10).split('-');
  return `${MONTHS[+m - 1]} ${+d}`;
}

export function openTab(name) {
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === `panel-${name}`));
  $('sidebar').classList.remove('closed');
}

export function setupUI() {
  document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => openTab(b.dataset.tab)));
  $('toggle').addEventListener('click', () => $('sidebar').classList.toggle('closed'));
}

function eventText(e, people) {
  const p = people.find(x => x.id === e.who);
  const name = p ? p.name : 'Someone';
  if (e.type === 'release') return `🎉 Production release! A new fruit tree is planted. Everyone +${COINS.release}`;
  if (e.type === 'standup') return `💧 ${name} posted a standup and watered the crops +${COINS.standups}`;
  if (e.type === 'pr') return `🌱 ${name} merged a pull request and planted a crop +${COINS.prs}`;
  if (e.type === 'ticket') return `🧺 ${name} finished a ticket and sent a harvest to the Fridge +${COINS.tickets}`;
  return `${name} did something`;
}

export function showPerson(p, releases) {
  const items = p.owned.map(it => `${it.icon} ${it.name}`).join(', ') || 'Nothing yet';
  const saving = p.savingFor
    ? `${p.savingFor.icon} ${p.savingFor.name} (${p.savingFor.cost - p.balance} more 🪙)`
    : 'Bought everything! 🎉';
  $('selected').innerHTML = `
    <h3>${ROLE_ICON[p.role]} ${p.name} <small>(${p.role})</small></h3>
    <div class="grid">
      <span>💧 Standups: ${p.counts.standups}</span><span>🌱 PRs: ${p.counts.prs}</span>
      <span>🧺 Tickets: ${p.counts.tickets}</span><span>🎉 Releases: ${releases}</span>
      <span>🪙 Earned: ${p.earned}</span><span>👛 Left: ${p.balance}</span>
    </div>
    <p><b>Owns:</b> ${items}</p>
    <p><b>Saving for:</b> ${saving}</p>`;
  $('selected').classList.remove('hidden');
  openTab('board');
}

function levelBar(b) {
  if (b.next === null) return '<div class="bar"><span style="width:100%"></span></div>';
  const prev = b.level === 0 ? 0 : b.steps[b.level - 1];
  const pct = Math.round(((b.value - prev) / (b.next - prev)) * 100);
  return `<div class="bar"><span style="width:${pct}%"></span></div>`;
}

export function showBuilding(b) {
  $('selected').innerHTML = `
    <h3>${b.icon} ${b.name} <small>level ${b.level} of 4</small></h3>
    <p>Grows from <b>${b.grows}</b>: ${b.value}${b.next !== null ? ` / ${b.next} for the next level` : ' (max level!)'}</p>
    ${levelBar(b)}`;
  $('selected').classList.remove('hidden');
  openTab('board');
}

export function renderSidebar(farm, people, buildings, onPick) {
  const ranked = [...people].sort((a, b) => b.earned - a.earned);
  $('leaderboard').innerHTML = ranked.map((p, i) => `
    <li data-id="${p.id}">
      <span class="rank">${['🥇', '🥈', '🥉'][i] || i + 1}</span>
      <span class="who">${p.name}<small>${ROLE_ICON[p.role]} ${p.role} · ${p.owned.map(it => it.icon).join('')}</small></span>
      <span class="coins">🪙 ${p.earned}</span>
    </li>`).join('');
  document.querySelectorAll('#leaderboard li').forEach(li =>
    li.addEventListener('click', () => onPick({ type: 'person', id: li.dataset.id })));

  $('buildings').innerHTML = buildings.map(b => `
    <div class="building" data-id="${b.id}">
      <b>${b.icon} ${b.name}</b> · level ${b.level}/4
      <small>Grows from ${b.grows}: ${b.value}${b.next !== null ? ` / ${b.next}` : ' (max)'}</small>
      ${levelBar(b)}
    </div>`).join('');
  document.querySelectorAll('.building').forEach(el =>
    el.addEventListener('click', () => onPick({ type: 'building', id: el.dataset.id })));

  const groups = { hat: '🎩 Hats', tool: '🛠️ Tools', decor: '🌼 Decorations' };
  $('shop-items').innerHTML = Object.entries(groups).map(([kind, title]) => `
    <h4>${title}</h4>
    ${SHOP.filter(it => it.kind === kind).map(it => {
      const owners = people.filter(p => p.owned.includes(it)).map(p => p.name);
      return `<div class="item">
        <span class="icon">${it.icon}</span>
        <span class="name">${it.name}<br><small>${owners.length ? 'Owned by ' + owners.join(', ') : 'Nobody yet'}</small></span>
        <span class="coins">🪙 ${it.cost}</span>
      </div>`;
    }).join('')}`).join('');

  $('feed').innerHTML = farm.events.slice(0, 40).map(e =>
    `<li><time>${shortDate(e.at ?? e.date)}</time>${eventText(e, people)}</li>`).join('');

  const total = people.reduce((s, p) => s + p.earned, 0);
  $('team-coins').textContent = `🪙 ${total} team coins`;
  $('updated').textContent = `Updated: ${shortDate(farm.updated)}`;
  $('sample').classList.toggle('hidden', !farm.sample);
}
