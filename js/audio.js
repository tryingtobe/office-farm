// Music and sounds made in the browser with Web Audio: no sound files to download.
// Browsers only allow sound after a click, so it starts muted until the player presses 🔊.

const KEY = 'officeFarm.sound';
let ctx = null;
let master = null;
let env = null;

// A pentatonic scale sounds calm whatever notes are picked (it is also the base of many Kyrgyz komuz tunes).
const SCALE = [220, 247.5, 277.2, 330, 370.8, 440, 495, 554.4, 660];

function tone(freq, { at = 0, dur = 0.6, type = 'triangle', vol = 0.12, slide = 0 } = {}) {
  const t = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function noise(dur, { vol = 0.1, filter = 1200, at = 0 } = {}) {
  const t = ctx.currentTime + at;
  const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = filter;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(gain).connect(master);
  src.start(t);
}

function every(ms, fn) {
  setInterval(() => { if (ctx && ctx.state === 'running') fn(); }, ms);
}

function startLoops() {
  // music: a soft plucked melody, slower at night
  every(700, () => {
    const now = env();
    if (Math.random() < (now.night ? 0.3 : 0.55)) {
      const n = SCALE[Math.floor(Math.random() * SCALE.length)];
      tone(n, { dur: 1.4, vol: 0.06 });
      if (Math.random() < 0.3) tone(n / 2, { dur: 2, vol: 0.04, type: 'sine' });
    }
  });
  // day: birds; night: crickets
  every(2600, () => {
    const now = env();
    if (now.night) {
      for (let i = 0; i < 6; i++) tone(4200, { at: i * 0.07, dur: 0.04, type: 'square', vol: 0.008 });
    } else if (Math.random() < 0.5 && now.weather !== 'rain') {
      const f = 2200 + Math.random() * 1200;
      tone(f, { dur: 0.12, type: 'sine', vol: 0.03, slide: 1.4 });
      tone(f * 1.1, { at: 0.16, dur: 0.1, type: 'sine', vol: 0.025, slide: 1.3 });
    }
  });
  // rain hiss
  every(1900, () => { if (env().weather === 'rain') noise(2.2, { vol: 0.035, filter: 900 }); });
  // a hen now and then
  every(9000, () => { if (!env().night && Math.random() < 0.4) [0, 0.12, 0.24].forEach(at => tone(520, { at, dur: 0.08, type: 'sawtooth', vol: 0.02, slide: 0.7 })); });
}

export const sound = {
  coin() { if (ctx?.state === 'running') { tone(988, { dur: 0.12, vol: 0.08, type: 'square' }); tone(1319, { at: 0.08, dur: 0.3, vol: 0.08, type: 'square' }); } },
  pop() { if (ctx?.state === 'running') { noise(0.5, { vol: 0.12, filter: 2500 }); tone(140, { dur: 0.3, type: 'sine', vol: 0.1, slide: 0.5 }); } },
};

export function setupSound(button, readEnv) {
  env = readEnv;
  const draw = on => { button.textContent = on ? '🔊' : '🔇'; button.title = on ? 'Mute' : 'Play music and sounds'; };
  draw(false);
  button.addEventListener('click', async () => {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.8;
      master.connect(ctx.destination);
      startLoops();
      localStorage.setItem(KEY, 'on');
      draw(true);
      return;
    }
    if (ctx.state === 'running') { await ctx.suspend(); localStorage.setItem(KEY, 'off'); draw(false); }
    else { await ctx.resume(); localStorage.setItem(KEY, 'on'); draw(true); }
  });
  // if sound was on last time, turn it on again at the first click anywhere
  if (localStorage.getItem(KEY) === 'on') {
    addEventListener('pointerdown', e => { if (!ctx && e.target !== button) button.click(); }, { once: true });
  }
}
