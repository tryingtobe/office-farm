// Time of day, season and weather, all on Bishkek time (UTC+6).
// For demos, the address can override them: ?time=21&day=sat&season=winter&weather=snow
import { hash } from './logic.js';

const params = new URLSearchParams(location.search);
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
export const SEASON_NAME = { winter: 'Winter', spring: 'Spring', summer: 'Summer', fall: 'Fall' };

function seasonOf(month) {
  if (month === 11 || month <= 1) return 'winter';
  if (month <= 4) return 'spring';
  if (month <= 7) return 'summer';
  return 'fall';
}

// Same weather for everyone on the same day: sunny most days, sometimes fog, sometimes rain (snow in winter).
function weatherOf(dateKey, season) {
  const roll = hash('weather' + dateKey) % 100;
  if (roll < 55) return 'sunny';
  if (roll < 75) return 'fog';
  return season === 'winter' ? 'snow' : 'rain';
}

export function readEnvironment(now = new Date()) {
  const bishkek = new Date(now.getTime() + 6 * 3600e3);
  const dateKey = bishkek.toISOString().slice(0, 10);
  let hour = bishkek.getUTCHours() + bishkek.getUTCMinutes() / 60;
  let weekday = bishkek.getUTCDay();
  if (params.has('time')) hour = Number(params.get('time'));
  if (params.has('day')) weekday = Math.max(0, DAYS.indexOf(params.get('day')));
  const season = params.get('season') || seasonOf(bishkek.getUTCMonth());
  const weather = params.get('weather') || weatherOf(dateKey, season);
  return {
    hour,
    season,
    weather,
    weekend: weekday === 0 || weekday === 6,
    night: hour < 6.5 || hour >= 20.5,
    // 0 at night, 1 in full daylight, smooth around sunrise (6-8) and sunset (18-20)
    daylight: Math.max(0, Math.min(1, Math.min((hour - 6) / 2, (20 - hour) / 2))),
  };
}
