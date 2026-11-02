/* Chiptune sound effects and music, synthesized with the Web Audio API (no audio files).
   Browsers block audio until the first tap, so everything stays silent until unlock() runs from a
   user gesture. SFX and Music can be switched on/off separately; the choice is remembered on this device. */

const STORE = { sfx: "cq-sfx", music: "cq-music" };
const read = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : v === "1";
  } catch {
    return fallback;
  }
};
const write = (key, on) => {
  try { localStorage.setItem(key, on ? "1" : "0"); } catch { /* storage is optional */ }
};

let ac = null;
let master = null;
let sfxBus = null;
let musBus = null;
let noiseBuf = null;
let sfxOn = read(STORE.sfx, true);
let musicOn = read(STORE.music, true);
let wanted = null; // music track the app wants playing
let playing = null;
let seq = null;
const lastPlayed = new Map();
const listeners = new Set();

function ctx() {
  if (ac) return ac;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ac = new AC();
  master = ac.createGain();
  master.gain.value = 0.9;
  master.connect(ac.destination);
  sfxBus = ac.createGain();
  sfxBus.gain.value = 0.32;
  sfxBus.connect(master);
  musBus = ac.createGain();
  musBus.gain.value = 0.11;
  musBus.connect(master);
  noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;
  document.addEventListener("visibilitychange", () => {
    if (!ac) return;
    if (document.hidden) ac.suspend();
    else ac.resume();
  });
  return ac;
}

/* Call from a tap/click. Safe to call many times. */
export function unlock() {
  const a = ctx();
  if (!a) return;
  if (a.state === "suspended") a.resume();
  if (musicOn && wanted && playing !== wanted) startMusic(wanted);
  if (wantedWeather) {
    if (a.state === "running") startWeather();
    else a.resume().then(startWeather).catch(() => {});
  }
}

let armed = false;
/* Unlock audio on the first tap or key press anywhere on the page. */
export function armAudio() {
  if (armed) return;
  armed = true;
  const go = () => unlock();
  window.addEventListener("pointerdown", go, { passive: true });
  window.addEventListener("keydown", go);
}

export function soundState() {
  return { sfx: sfxOn, music: musicOn };
}
export function onSoundChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function changed() {
  listeners.forEach((fn) => { try { fn(soundState()); } catch { /* ignore */ } });
}
export function setSfx(on) {
  sfxOn = Boolean(on);
  write(STORE.sfx, sfxOn);
  if (sfxOn) { unlock(); play("tap"); }
  else stopWeather();
  changed();
}
export function setMusicOn(on) {
  musicOn = Boolean(on);
  write(STORE.music, musicOn);
  if (musicOn) unlock();
  else stopMusic();
  if (musicOn && wanted) startMusic(wanted);
  changed();
}

/* ---------- synth voices ---------- */
function tone({ type = "square", f = 440, f2 = null, dur = 0.1, vol = 0.3, at = 0, attack = 0.004, bus = sfxBus }) {
  const t = ac.currentTime + at;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(bus);
  o.start(t);
  o.stop(t + dur + 0.02);
}
function noise({ dur = 0.1, vol = 0.3, at = 0, lp = 8000, hp = 200, bus = sfxBus }) {
  const t = ac.currentTime + at;
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  const lo = ac.createBiquadFilter();
  lo.type = "lowpass";
  lo.frequency.value = lp;
  const hi = ac.createBiquadFilter();
  hi.type = "highpass";
  hi.frequency.value = hp;
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(lo).connect(hi).connect(g).connect(bus);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
}
const N = (name) => {
  const m = /^([A-G])(#?)(\d)$/.exec(name);
  if (!m) return 0;
  const idx = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0);
  return 440 * 2 ** ((idx + (Number(m[3]) - 4) * 12 - 9) / 12);
};
const arp = (notes, step, opts = {}) => notes.forEach((n, i) => tone({ f: N(n), dur: step * 1.6, at: i * step, ...opts }));

/* ---------- sound effects ---------- */
const SFX = {
  tap: () => tone({ f: 880, dur: 0.05, vol: 0.12 }),
  use: () => { arp(["G5", "B5", "D6", "G6"], 0.045, { type: "triangle", vol: 0.22 }); noise({ dur: 0.25, vol: 0.1, at: 0.05, lp: 9000, hp: 3000 }); },
  swing: () => noise({ dur: 0.14, vol: 0.22, lp: 5000, hp: 900 }),
  hit: () => { tone({ type: "square", f: 220, f2: 70, dur: 0.12, vol: 0.35 }); noise({ dur: 0.08, vol: 0.25, lp: 2500 }); },
  power: () => { tone({ type: "sawtooth", f: 330, f2: 60, dur: 0.25, vol: 0.4 }); noise({ dur: 0.2, vol: 0.35, lp: 1800 }); arp(["C5", "G5"], 0.05, { at: 0.05, vol: 0.18 }); },
  special: () => { arp(["C5", "E5", "G5", "C6", "E6"], 0.05, { vol: 0.2 }); noise({ dur: 0.35, vol: 0.18, at: 0.1, lp: 6000, hp: 1500 }); },
  poof: () => { noise({ dur: 0.35, vol: 0.3, lp: 3000, hp: 300 }); tone({ type: "triangle", f: 600, f2: 120, dur: 0.3, vol: 0.2 }); },
  coin: () => { tone({ f: N("B5"), dur: 0.06, vol: 0.18 }); tone({ f: N("E6"), dur: 0.14, vol: 0.18, at: 0.06 }); },
  victory: () => arp(["C5", "E5", "G5", "C6", "G5", "C6"], 0.08, { vol: 0.22 }),
  hurt: () => { tone({ type: "square", f: 300, f2: 90, dur: 0.22, vol: 0.32 }); noise({ dur: 0.12, vol: 0.2, lp: 1500 }); },
  block: () => { tone({ type: "triangle", f: 1400, f2: 900, dur: 0.18, vol: 0.28 }); tone({ type: "square", f: 2100, dur: 0.05, vol: 0.12 }); },
  heal: () => arp(["E5", "G5", "B5", "E6"], 0.07, { type: "triangle", vol: 0.25 }),
  enemy: () => tone({ type: "square", f: 520, f2: 260, dur: 0.12, vol: 0.14 }),
  knockdown: () => { tone({ type: "square", f: 400, f2: 60, dur: 0.5, vol: 0.3 }); noise({ dur: 0.2, vol: 0.25, lp: 1200 }); },
  flee: () => arp(["G4", "E4", "C4"], 0.11, { type: "triangle", vol: 0.22 }),
  right: () => arp(["E5", "A5"], 0.07, { vol: 0.2 }),
  wrong: () => { tone({ type: "square", f: 196, dur: 0.14, vol: 0.2 }); tone({ type: "square", f: 147, dur: 0.24, vol: 0.2, at: 0.13 }); },
  levelup: () => arp(["C5", "E5", "G5", "C6", "E6", "G6", "C7"], 0.065, { vol: 0.2 }),
  ko: () => arp(["G4", "F#4", "F4", "E4"], 0.16, { type: "square", vol: 0.2 }),
  cheer: () => { noise({ dur: 0.9, vol: 0.12, lp: 3500, hp: 600 }); noise({ dur: 0.5, vol: 0.08, at: 0.15, lp: 5000, hp: 1500 }); },
  chest: () => { tone({ type: "sawtooth", f: 90, f2: 140, dur: 0.25, vol: 0.18 }); arp(["G5", "C6", "E6", "G6"], 0.07, { at: 0.22, type: "triangle", vol: 0.22 }); },
  board: () => arp(["C5", "G5"], 0.09, { type: "triangle", vol: 0.2 }),
  gate: () => { noise({ dur: 0.8, vol: 0.2, lp: 900, hp: 80 }); tone({ type: "triangle", f: 110, f2: 55, dur: 0.8, vol: 0.25 }); },
  throw: () => tone({ type: "triangle", f: 400, f2: 900, dur: 0.18, vol: 0.18 }),
  catch: () => arp(["G5", "D6"], 0.06, { vol: 0.2 }),
  shop: () => arp(["E5", "C6"], 0.08, { type: "triangle", vol: 0.2 }),
  siren: () => { for (let i = 0; i < 4; i += 1) tone({ type: "square", f: i % 2 ? 660 : 880, dur: 0.24, at: i * 0.25, vol: 0.14 }); },
  cage: () => { tone({ type: "square", f: 120, f2: 60, dur: 0.3, vol: 0.35 }); noise({ dur: 0.25, vol: 0.3, lp: 2000 }); tone({ type: "triangle", f: 1800, dur: 0.12, vol: 0.12, at: 0.05 }); },
  unlock: () => { tone({ type: "square", f: 1500, dur: 0.04, vol: 0.15 }); arp(["C6", "G6"], 0.06, { at: 0.06, vol: 0.18 }); },
  grumble: () => { tone({ type: "sawtooth", f: 140, f2: 90, dur: 0.18, vol: 0.18 }); tone({ type: "sawtooth", f: 120, f2: 160, dur: 0.16, vol: 0.16, at: 0.16 }); },
  // Lightning: a sharp electric crack, then a rolling thunder rumble.
  lightning: () => {
    noise({ dur: 0.12, vol: 0.55, lp: 12000, hp: 2500 });
    noise({ dur: 0.35, vol: 0.4, at: 0.04, lp: 5000, hp: 600 });
    tone({ type: "square", f: 1800, f2: 200, dur: 0.1, vol: 0.12 });
  },
  // Parent spells, approvals and the hearts.
  spell: () => { arp(["C5", "E5", "G5", "B5", "D6"], 0.05, { type: "triangle", vol: 0.16 }); noise({ dur: 0.5, vol: 0.1, lp: 9000, hp: 3000 }); },
  powerup: () => { tone({ type: "square", f: 220, f2: 880, dur: 0.4, vol: 0.18 }); arp(["C6", "E6", "G6", "C7"], 0.06, { at: 0.3, vol: 0.18 }); },
  darkspell: () => { arp(["B4", "F5", "B4", "F4"], 0.07, { type: "sawtooth", vol: 0.12 }); noise({ dur: 0.5, vol: 0.12, lp: 3000, hp: 500 }); },
  heartbreak: () => { noise({ dur: 0.06, vol: 0.35, lp: 6000, hp: 1500 }); arp(["E5", "C5", "A4"], 0.12, { type: "square", vol: 0.16, at: 0.05 }); },
  decline: () => { tone({ type: "triangle", f: 520, f2: 260, dur: 0.14, vol: 0.3 }); arp(["E4", "C4"], 0.14, { type: "square", vol: 0.14, at: 0.12 }); },
  appear: () => { tone({ type: "square", f: 180, f2: 360, dur: 0.12, vol: 0.12 }); tone({ type: "square", f: 360, f2: 180, dur: 0.12, at: 0.12, vol: 0.12 }); },
  cart: () => { for (let i = 0; i < 6; i += 1) noise({ dur: 0.05, vol: 0.16, at: i * 0.1, lp: 900, hp: 100 }); tone({ type: "triangle", f: 1760, dur: 0.25, at: 0.6, vol: 0.14 }); tone({ type: "triangle", f: 2350, dur: 0.3, at: 0.72, vol: 0.12 }); },
  walk: () => noise({ dur: 0.04, vol: 0.1, lp: 1200, hp: 200 }),
  // Electric buzz while the cage is zapped.
  zap: () => {
    for (let i = 0; i < 14; i += 1) tone({ type: "sawtooth", f: i % 2 ? 95 : 190, dur: 0.07, at: i * 0.07, vol: 0.22 });
    for (let i = 0; i < 6; i += 1) noise({ dur: 0.05, vol: 0.3, at: i * 0.15 + Math.random() * 0.05, lp: 9000, hp: 2000 });
  },
  thunder: () => {
    noise({ dur: 2.2, vol: 0.7, lp: 260, hp: 25 });
    noise({ dur: 1.4, vol: 0.45, at: 0.35, lp: 160, hp: 20 });
    noise({ dur: 0.9, vol: 0.35, at: 0.9, lp: 220, hp: 30 });
    tone({ type: "sine", f: 70, f2: 32, dur: 1.6, vol: 0.5, attack: 0.03 });
  },
};

/* ---------- weapon and monster voices ----------
   play("swing:mop"), play("hit:mop"), play("special:mop") use each weapon's own sounds;
   play("voice:toaster"), play("attack:bus"), play("defeat:dust") use each monster's voice;
   play("lob:bubble") is a thrown projectile; play("pet:puppy") is a pet cheering.
   Unknown keys fall back to the plain sound, so old callers keep working. */
const rand = (a, b) => a + Math.random() * (b - a);

// Hit "materials": what it sounds like when a weapon connects.
const MAT = {
  thud: () => { tone({ type: "square", f: 200, f2: 70, dur: 0.12, vol: 0.32 }); noise({ dur: 0.08, vol: 0.22, lp: 2200 }); },
  heavy: () => { tone({ type: "square", f: 140, f2: 40, dur: 0.22, vol: 0.4 }); noise({ dur: 0.18, vol: 0.35, lp: 900 }); },
  clang: () => { tone({ type: "square", f: 1320, f2: 1100, dur: 0.18, vol: 0.16 }); tone({ type: "triangle", f: 1980, dur: 0.25, vol: 0.12 }); noise({ dur: 0.05, vol: 0.2, lp: 9000, hp: 2500 }); },
  ting: () => { tone({ type: "triangle", f: 2640, dur: 0.3, vol: 0.16 }); tone({ type: "triangle", f: 3520, dur: 0.18, vol: 0.08, at: 0.02 }); },
  splat: () => { noise({ dur: 0.16, vol: 0.35, lp: 1500, hp: 150 }); tone({ type: "sine", f: 300, f2: 90, dur: 0.12, vol: 0.25 }); },
  squish: () => { tone({ type: "sine", f: 180, f2: 420, dur: 0.12, vol: 0.3 }); noise({ dur: 0.1, vol: 0.18, lp: 1200 }); },
  squeak: () => { tone({ type: "square", f: 900, f2: 1600, dur: 0.09, vol: 0.18 }); tone({ type: "square", f: 1500, f2: 800, dur: 0.1, vol: 0.16, at: 0.09 }); },
  quack: () => { tone({ type: "sawtooth", f: 520, f2: 380, dur: 0.12, vol: 0.22 }); tone({ type: "sawtooth", f: 480, f2: 340, dur: 0.14, vol: 0.2, at: 0.14 }); },
  crack: () => { noise({ dur: 0.05, vol: 0.5, lp: 7000, hp: 1200 }); tone({ type: "square", f: 700, f2: 300, dur: 0.06, vol: 0.2 }); },
  poof: () => { noise({ dur: 0.2, vol: 0.22, lp: 900, hp: 100 }); },
  sparkle: () => { arp(["E6", "B6", "E7"], 0.04, { type: "triangle", vol: 0.14 }); noise({ dur: 0.12, vol: 0.1, lp: 12000, hp: 6000 }); },
  hiss: () => { noise({ dur: 0.3, vol: 0.28, lp: 9000, hp: 3000 }); },
  pop: () => { tone({ type: "sine", f: 500, f2: 1400, dur: 0.06, vol: 0.3 }); tone({ type: "sine", f: 900, f2: 2000, dur: 0.05, vol: 0.2, at: 0.08 }); },
  scratch: () => { for (let i = 0; i < 4; i += 1) noise({ dur: 0.04, vol: 0.2, at: i * 0.035, lp: 6000, hp: 1800 }); },
  rattle: () => { for (let i = 0; i < 6; i += 1) noise({ dur: 0.025, vol: 0.22, at: i * 0.03, lp: 8000, hp: 2500 }); },
  crunch: () => { for (let i = 0; i < 5; i += 1) noise({ dur: 0.03, vol: 0.28, at: i * 0.022, lp: 4000, hp: 600 }); },
  bonk: () => { tone({ type: "triangle", f: 520, f2: 260, dur: 0.14, vol: 0.32 }); tone({ type: "square", f: 260, dur: 0.05, vol: 0.12 }); },
  wet: () => { noise({ dur: 0.25, vol: 0.25, lp: 2500, hp: 300 }); tone({ type: "sine", f: 600, f2: 200, dur: 0.15, vol: 0.18 }); },
  boing: () => { tone({ type: "sine", f: 200, f2: 700, dur: 0.12, vol: 0.3 }); tone({ type: "sine", f: 700, f2: 300, dur: 0.18, vol: 0.22, at: 0.12 }); },
  suction: () => { tone({ type: "sine", f: 120, f2: 500, dur: 0.1, vol: 0.32 }); tone({ type: "sine", f: 900, f2: 300, dur: 0.06, vol: 0.2, at: 0.1 }); },
};
// Swing styles.
const SWING = {
  whoosh: () => noise({ dur: 0.14, vol: 0.22, lp: 5000, hp: 900 }),
  light: () => noise({ dur: 0.09, vol: 0.16, lp: 9000, hp: 2500 }),
  heavy: () => { noise({ dur: 0.24, vol: 0.28, lp: 1800, hp: 200 }); tone({ type: "triangle", f: 160, f2: 90, dur: 0.22, vol: 0.12 }); },
  blade: () => { noise({ dur: 0.1, vol: 0.2, lp: 9000, hp: 3500 }); tone({ type: "triangle", f: 2200, f2: 3000, dur: 0.08, vol: 0.06 }); },
  beam: () => { tone({ type: "sawtooth", f: 200, f2: 1200, dur: 0.35, vol: 0.18 }); noise({ dur: 0.35, vol: 0.12, lp: 4000, hp: 800 }); },
  spray: () => noise({ dur: 0.3, vol: 0.25, lp: 10000, hp: 2500 }),
  magic: () => { arp(["C6", "E6", "G6"], 0.03, { type: "triangle", vol: 0.12 }); noise({ dur: 0.14, vol: 0.14, lp: 8000, hp: 2000 }); },
  motor: () => { for (let i = 0; i < 6; i += 1) tone({ type: "sawtooth", f: 110 + i * 25, dur: 0.06, at: i * 0.05, vol: 0.14 }); },
};
// Finisher flourishes, played with the weapon's special effect.
const FLOURISH = {
  hero: () => SFX.special(),
  sparkle: () => { arp(["C6", "E6", "G6", "C7", "E7", "G7"], 0.04, { type: "triangle", vol: 0.16 }); noise({ dur: 0.4, vol: 0.12, at: 0.1, lp: 12000, hp: 5000 }); },
  boom: () => { noise({ dur: 0.6, vol: 0.45, lp: 700, hp: 40 }); tone({ type: "square", f: 110, f2: 35, dur: 0.5, vol: 0.35 }); },
  splash: () => { noise({ dur: 0.5, vol: 0.35, lp: 3500, hp: 300 }); for (let i = 0; i < 4; i += 1) tone({ type: "sine", f: rand(500, 1200), f2: 200, dur: 0.08, at: 0.1 + i * 0.07, vol: 0.15 }); },
  bubbles: () => { for (let i = 0; i < 7; i += 1) tone({ type: "sine", f: rand(500, 900), f2: rand(1200, 2200), dur: 0.06, at: i * 0.06, vol: 0.2 }); },
  squeaky: () => { for (let i = 0; i < 3; i += 1) MAT.squeak(); arp(["C6", "G6"], 0.08, { at: 0.2, vol: 0.14 }); },
  quacks: () => { MAT.quack(); setTimeout(() => ac && MAT.quack(), 280); },
  steam: () => { noise({ dur: 0.7, vol: 0.32, lp: 10000, hp: 2500 }); tone({ type: "triangle", f: 880, f2: 1760, dur: 0.4, vol: 0.08 }); },
  vroom: () => { tone({ type: "sawtooth", f: 90, f2: 400, dur: 0.6, vol: 0.22 }); noise({ dur: 0.6, vol: 0.2, lp: 2000, hp: 300 }); },
  crowd: () => { SFX.cheer(); arp(["G5", "C6", "E6", "G6"], 0.07, { vol: 0.16, at: 0.1 }); },
  clang: () => { MAT.clang(); tone({ type: "triangle", f: 1320, dur: 0.6, vol: 0.1, at: 0.05 }); },
  whistle: () => { tone({ type: "square", f: 2000, dur: 0.12, vol: 0.12 }); tone({ type: "square", f: 2000, dur: 0.3, at: 0.16, vol: 0.12 }); },
  lullaby: () => arp(["E6", "C6", "D6", "G5", "G5", "D6", "E6", "C6"], 0.09, { type: "triangle", vol: 0.14 }),
};

/* Weapon key -> [swing, hit material, finisher]. */
const WEAPON_SFX = {
  broom: ["whoosh", "thud", "hero"],
  duster: ["light", "poof", "sparkle"],
  mop: ["heavy", "splat", "splash"],
  squeegee: ["whoosh", "squeak", "hero"],
  vacuum: ["beam", "hiss", "vroom"],
  golden: ["magic", "sparkle", "sparkle"],
  toothbrush: ["light", "scratch", "bubbles"],
  spatula: ["whoosh", "clang", "clang"],
  rake: ["whoosh", "rattle", "hero"],
  pencil: ["blade", "scratch", "hero"],
  plunger: ["heavy", "suction", "boom"],
  dustpan: ["whoosh", "clang", "clang"],
  sponge: ["whoosh", "squish", "bubbles"],
  spray: ["spray", "wet", "splash"],
  diamond: ["magic", "ting", "sparkle"],
  bubble: ["magic", "pop", "bubbles"],
  lint: ["whoosh", "crunch", "hero"],
  watering: ["spray", "wet", "splash"],
  bookmark: ["blade", "crack", "hero"],
  bone: ["whoosh", "squeak", "squeaky"],
  shovel: ["heavy", "clang", "boom"],
  bat: ["heavy", "crack", "crowd"],
  mallet: ["heavy", "heavy", "boom"],
  duckhammer: ["whoosh", "quack", "quacks"],
  pillowmace: ["light", "poof", "hero"],
  rattle: ["whoosh", "rattle", "lullaby"],
  butterknife: ["blade", "ting", "hero"],
  whisk: ["motor", "rattle", "hero"],
  baguette: ["whoosh", "crunch", "hero"],
  hockey: ["heavy", "crack", "crowd"],
  crossing: ["heavy", "clang", "whistle"],
  wrench: ["heavy", "clang", "clang"],
  iron: ["beam", "hiss", "steam"],
  bottle: ["spray", "wet", "lullaby"],
  foamfinger: ["whoosh", "boing", "crowd"],
};

// Monster voices: a few synth "throats" with a pitch, used when they show up, fight back and get beaten.
const VOICE = {
  growl: (p) => { tone({ type: "sawtooth", f: 110 * p, f2: 70 * p, dur: 0.35, vol: 0.22 }); noise({ dur: 0.3, vol: 0.12, lp: 600 }); },
  squeak: (p) => { tone({ type: "square", f: 1200 * p, f2: 1800 * p, dur: 0.07, vol: 0.14 }); tone({ type: "square", f: 1500 * p, f2: 1000 * p, dur: 0.09, vol: 0.12, at: 0.08 }); },
  ghost: (p) => { for (let i = 0; i < 8; i += 1) tone({ type: "sine", f: 420 * p + (i % 2 ? 30 : -30), dur: 0.08, at: i * 0.07, vol: 0.18, attack: 0.03 }); },
  gurgle: (p) => { for (let i = 0; i < 5; i += 1) tone({ type: "sine", f: rand(140, 260) * p, f2: rand(300, 500) * p, dur: 0.06, at: i * 0.06, vol: 0.24 }); },
  mech: (p) => { arp(["C5", "G4", "E5"].map((n) => n), 0.07, { type: "square", vol: 0.12 }); tone({ type: "square", f: 220 * p, dur: 0.05, at: 0.22, vol: 0.12 }); },
  honk: () => { tone({ type: "sawtooth", f: 350, dur: 0.22, vol: 0.2 }); tone({ type: "sawtooth", f: 440, dur: 0.22, vol: 0.16 }); tone({ type: "sawtooth", f: 350, dur: 0.3, at: 0.3, vol: 0.2 }); tone({ type: "sawtooth", f: 440, dur: 0.3, at: 0.3, vol: 0.16 }); },
  ring: () => { for (let i = 0; i < 10; i += 1) tone({ type: "square", f: i % 2 ? 1800 : 2100, dur: 0.04, at: i * 0.045, vol: 0.1 }); },
  sizzle: () => { noise({ dur: 0.5, vol: 0.25, lp: 10000, hp: 3500 }); for (let i = 0; i < 5; i += 1) noise({ dur: 0.02, vol: 0.3, at: rand(0, 0.45), lp: 9000, hp: 4000 }); },
  rustle: () => { for (let i = 0; i < 6; i += 1) noise({ dur: 0.06, vol: 0.16, at: i * 0.05, lp: 5000, hp: 1200 }); },
  chomp: (p) => { for (let i = 0; i < 3; i += 1) { tone({ type: "square", f: 300 * p, f2: 120 * p, dur: 0.05, at: i * 0.12, vol: 0.22 }); noise({ dur: 0.03, vol: 0.2, at: i * 0.12, lp: 3000 }); } },
  buzz: (p) => { for (let i = 0; i < 12; i += 1) tone({ type: "sawtooth", f: (i % 2 ? 230 : 250) * p, dur: 0.04, at: i * 0.035, vol: 0.12 }); },
  snore: () => { noise({ dur: 0.5, vol: 0.2, lp: 400, hp: 60 }); tone({ type: "sine", f: 600, f2: 900, dur: 0.25, at: 0.55, vol: 0.1 }); },
  ding: () => { tone({ type: "triangle", f: 1760, dur: 0.5, vol: 0.18 }); tone({ type: "triangle", f: 2640, dur: 0.3, vol: 0.08 }); },
  flap: () => { for (let i = 0; i < 4; i += 1) noise({ dur: 0.05, vol: 0.2, at: i * 0.08, lp: 3000, hp: 400 }); },
  clank: () => { MAT.clang(); tone({ type: "square", f: 180, dur: 0.06, at: 0.1, vol: 0.15 }); MAT.rattle(); },
  brr: () => { for (let i = 0; i < 8; i += 1) tone({ type: "triangle", f: i % 2 ? 300 : 340, dur: 0.04, at: i * 0.04, vol: 0.16 }); tone({ type: "triangle", f: 1500, f2: 2200, dur: 0.15, at: 0.35, vol: 0.08 }); },
  grumble: (p) => { tone({ type: "sawtooth", f: 140 * p, f2: 90 * p, dur: 0.18, vol: 0.18 }); tone({ type: "sawtooth", f: 120 * p, f2: 160 * p, dur: 0.16, vol: 0.16, at: 0.16 }); },
  chime: () => arp(["E6", "C6", "G5"], 0.09, { type: "triangle", vol: 0.14 }),
  laugh: (p) => { for (let i = 0; i < 4; i += 1) tone({ type: "square", f: (520 - i * 30) * p, f2: (420 - i * 30) * p, dur: 0.07, at: i * 0.1, vol: 0.14 }); },
  boing: (p) => { tone({ type: "sine", f: 160 * p, f2: 600 * p, dur: 0.15, vol: 0.28 }); tone({ type: "sine", f: 600 * p, f2: 200 * p, dur: 0.2, at: 0.15, vol: 0.2 }); },
};
/* Monster key -> [voice, pitch]. Covers trail and arena monsters. */
const MONSTER_SFX = {
  dust: ["squeak", 1.1], sleep: ["snore", 1], dry: ["gurgle", 1.2], breakfast: ["ding", 1], dinner: ["sizzle", 1],
  lunchmade: ["chomp", 1.1], bath: ["gurgle", 1], bed: ["ghost", 1], shoes: ["chomp", 0.8], pack: ["growl", 1.2],
  dishes: ["gurgle", 0.8], teeth: ["squeak", 0.9], laundry: ["grumble", 1], toys: ["clank", 1], reading: ["flap", 1],
  pet: ["laugh", 1.2], plants: ["rustle", 1], table: ["clank", 1], trash: ["growl", 0.9], counters: ["chomp", 1.4],
  towels: ["ghost", 0.75], bookshelf: ["flap", 0.8], lunch: ["chomp", 0.9], coats: ["rustle", 0.8], groceries: ["grumble", 0.9],
  homework: ["laugh", 1.4], dressed: ["ghost", 1.2], petbrush: ["rustle", 1.2], leaves: ["rustle", 0.9], snow: ["brr", 1],
  outside: ["snore", 1], wood: ["grumble", 0.7], basketball: ["buzz", 1], bus: ["honk", 1], repair: ["clank", 1],
  helping: ["laugh", 0.9], babysit: ["chime", 1], shirts: ["grumble", 1.2],
  calc: ["mech", 1], mime: ["laugh", 0.7], flask: ["gurgle", 1.3], alarm: ["ring", 1], robber: ["laugh", 0.8],
};

function weaponParts(key) {
  return WEAPON_SFX[key] || WEAPON_SFX.broom;
}

function voiceOf(key) {
  const [v, p] = MONSTER_SFX[key] || ["grumble", 1];
  return () => VOICE[v](p);
}

// Thrown projectile kinds -> a short toss sound.
const LOB = {
  bubble: () => tone({ type: "sine", f: rand(400, 700), f2: rand(1100, 1600), dur: 0.08, vol: 0.18 }),
  pillow: () => noise({ dur: 0.12, vol: 0.14, lp: 1500, hp: 150 }),
  paste: () => { noise({ dur: 0.1, vol: 0.2, lp: 3000, hp: 400 }); tone({ type: "sine", f: 300, f2: 700, dur: 0.08, vol: 0.15 }); },
  cloud: () => noise({ dur: 0.35, vol: 0.18, lp: 700, hp: 80 }),
  letter: () => tone({ type: "triangle", f: rand(700, 1000), f2: 500, dur: 0.1, vol: 0.1 }),
  sock: () => noise({ dur: 0.1, vol: 0.16, lp: 2500, hp: 300 }),
  block: () => tone({ type: "square", f: 300, f2: 500, dur: 0.06, vol: 0.12 }),
  pencil: () => noise({ dur: 0.08, vol: 0.16, lp: 8000, hp: 2500 }),
  paper: () => noise({ dur: 0.08, vol: 0.14, lp: 6000, hp: 1500 }),
};

// Pets cheering: species-style chirps.
const PET_CRY = {
  bark: () => { tone({ type: "square", f: 520, f2: 300, dur: 0.07, vol: 0.18 }); tone({ type: "square", f: 560, f2: 320, dur: 0.07, at: 0.12, vol: 0.18 }); },
  meow: () => { tone({ type: "triangle", f: 700, f2: 1000, dur: 0.12, vol: 0.18 }); tone({ type: "triangle", f: 1000, f2: 600, dur: 0.2, at: 0.12, vol: 0.18 }); },
  squeak: () => VOICE.squeak(1.3),
  quack: () => MAT.quack(),
  ribbit: () => { tone({ type: "square", f: 200, f2: 160, dur: 0.06, vol: 0.2 }); tone({ type: "square", f: 260, f2: 180, dur: 0.1, at: 0.08, vol: 0.2 }); },
  hoot: () => { tone({ type: "sine", f: 440, dur: 0.15, vol: 0.2 }); tone({ type: "sine", f: 392, dur: 0.25, at: 0.2, vol: 0.2 }); },
  chirp: () => arp(["C6", "E6", "C7"], 0.05, { type: "triangle", vol: 0.14 }),
  beep: () => arp(["C6", "G6"], 0.07, { type: "square", vol: 0.12 }),
  blob: () => VOICE.gurgle(1.4),
  roar: () => { tone({ type: "sawtooth", f: 300, f2: 180, dur: 0.25, vol: 0.18 }); noise({ dur: 0.2, vol: 0.14, lp: 2000 }); },
  click: () => { for (let i = 0; i < 4; i += 1) tone({ type: "square", f: 1800, dur: 0.02, at: i * 0.05, vol: 0.1 }); },
  whale: () => tone({ type: "sine", f: 300, f2: 600, dur: 0.6, vol: 0.2, attack: 0.1 }),
  plop: () => tone({ type: "sine", f: 600, f2: 200, dur: 0.1, vol: 0.2 }),
  rock: () => noise({ dur: 0.06, vol: 0.18, lp: 1200 }),
};
const PET_SFX = {
  puppy: "bark", kitten: "meow", bunny: "squeak", hamster: "squeak", duckling: "quack", frog: "ribbit", fox: "bark",
  turtle: "plop", penguin: "chirp", owl: "hoot", ghost: "blob", robot: "beep", slime: "blob", unicorn: "chirp",
  dragon: "roar", rock: "rock", himalayan: "meow", tuxedo: "meow", crab: "click", betta: "plop", gecko: "click",
  platypus: "quack", shark: "roar", whale: "whale",
};

/* Resolve "kind:key" names to a sound. */
function keyed(name) {
  const at = name.indexOf(":");
  if (at < 0) return null;
  const kind = name.slice(0, at);
  const key = name.slice(at + 1);
  if (kind === "swing") return SWING[weaponParts(key)[0]] || SWING.whoosh;
  if (kind === "hit") return MAT[weaponParts(key)[1]] || MAT.thud;
  if (kind === "special") return () => { SFX.special(); (FLOURISH[weaponParts(key)[2]] || FLOURISH.hero)(); };
  if (kind === "voice") return voiceOf(key);
  if (kind === "attack") return () => { SFX.enemy(); voiceOf(key)(); };
  if (kind === "defeat") return () => { voiceOf(key)(); SFX.poof(); };
  if (kind === "lob") return LOB[key] || (() => noise({ dur: 0.1, vol: 0.14, lp: 4000, hp: 700 }));
  if (kind === "pet") return PET_CRY[PET_SFX[key]] || PET_CRY.chirp;
  return null;
}

/* ---------- weather ambience ----------
   "storm": a looping, gusting wind (filtered noise with slow wobbles). Follows the Sound FX switch. */
let wantedWeather = null;
let weatherNodes = null;

function startWeather() {
  const a = ctx();
  if (!a || a.state !== "running" || weatherNodes || wantedWeather !== "storm" || !sfxOn) return;
  const src = a.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const band = a.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 420;
  band.Q.value = 0.9;
  const low = a.createBiquadFilter();
  low.type = "lowpass";
  low.frequency.value = 1400;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.5, a.currentTime + 1.5);
  // Slow LFOs make the wind howl up and down in gusts.
  const lfo = a.createOscillator();
  lfo.frequency.value = 0.17;
  const lfoAmt = a.createGain();
  lfoAmt.gain.value = 260;
  lfo.connect(lfoAmt).connect(band.frequency);
  const gust = a.createOscillator();
  gust.frequency.value = 0.31;
  const gustAmt = a.createGain();
  gustAmt.gain.value = 0.28;
  gust.connect(gustAmt).connect(g.gain);
  src.connect(band).connect(low).connect(g).connect(sfxBus);
  src.start();
  lfo.start();
  gust.start();
  weatherNodes = { src, lfo, gust, g };
}

function stopWeather() {
  if (!weatherNodes || !ac) return;
  const { src, lfo, gust, g } = weatherNodes;
  weatherNodes = null;
  const t = ac.currentTime;
  try {
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    for (const node of [src, lfo, gust]) node.stop(t + 0.85);
  } catch { /* already stopped */ }
}

/* Ask for weather sound: "storm" or null for calm. */
export function weather(name) {
  wantedWeather = name === "storm" ? "storm" : null;
  if (wantedWeather) startWeather();
  else stopWeather();
}

/* Play a sound effect by name. Rapid repeats (like a shower of coins) are thinned out. */
export function play(name) {
  if (!sfxOn) return;
  const fn = SFX[name] || keyed(String(name || ""));
  if (!fn) return;
  const a = ctx();
  if (!a || a.state !== "running") return;
  const now = a.currentTime;
  const gap = name === "coin" ? 0.05 : 0.03;
  if (now - (lastPlayed.get(name) || -1) < gap) return;
  lastPlayed.set(name, now);
  try { fn(); } catch { /* never let audio break the game */ }
}

/* ---------- music ----------
   Each track: bpm, steps per bar 8 (eighth notes), and per-channel patterns.
   Tokens: note name (e.g. "E5"), "." rest, "-" hold. Drums: k kick, s snare, h hat. */
const TRACKS = {
  trail: {
    bpm: 112,
    lead: "E5 - G5 - C6 - B5 A5 | G5 - E5 - D5 - . . | F5 - A5 - C6 - B5 A5 | G5 - - - . . . . | E5 - G5 - C6 - D6 E6 | D6 - C6 - A5 - G5 - | F5 - E5 - D5 - G5 - | C5 - - - . . . .",
    bass: "C3 . G3 . C3 . G3 . | C3 . G3 . E3 . G3 . | F3 . C4 . F3 . C4 . | G3 . D4 . G3 . B3 . | C3 . G3 . C3 . G3 . | F3 . C4 . F3 . A3 . | D3 . A3 . G3 . B3 . | C3 . G3 . C3 . . .",
    drums: "k . h . s . h . | k . h . s . h h",
  },
  market: {
    bpm: 132,
    lead: "C5 E5 G5 E5 F5 A5 G5 . | E5 G5 C6 . B5 G5 A5 . | F5 A5 C6 A5 G5 E5 C5 . | D5 F5 E5 D5 C5 - . . ",
    bass: "C3 . C4 . F3 . G3 . | C3 . E3 . F3 . G3 . | F3 . A3 . C3 . E3 . | G3 . G3 . C3 . . . ",
    drums: "k h s h k h s h | k h s h k k s h",
  },
  arena: {
    bpm: 150,
    lead: "A4 . A4 C5 E5 . D5 C5 | B4 . G4 B4 D5 . C5 B4 | A4 . A4 C5 E5 . A5 G5 | F5 E5 D5 B4 A4 - . . | C5 . C5 E5 G5 . F5 E5 | D5 . B4 D5 F5 . E5 D5 | C5 . E5 G5 A5 . G5 E5 | F5 E5 D5 E5 A4 - . . ",
    bass: "A2 A3 A2 A3 A2 A3 A2 A3 | G2 G3 G2 G3 G2 G3 G2 G3 | F2 F3 F2 F3 F2 F3 F2 F3 | E2 E3 E2 E3 E2 E3 G#2 G#3",
    drums: "k h s h k k s h | k h s h k h s s",
  },
  grounded: {
    bpm: 76,
    lead: "A4 - - - C5 - B4 - | A4 - - - E4 - - - | F4 - - - A4 - G4 - | E4 - - - . . . . ",
    bass: "A2 . . . E3 . . . | A2 . . . C3 . . . | F2 . . . C3 . . . | E2 . . . E2 . . . ",
    drums: "k . . . . . h . ",
  },
};

function parse(str) {
  return str.replace(/\|/g, " ").trim().split(/\s+/);
}

function startMusic(name) {
  const a = ctx();
  if (!a || a.state !== "running" || !TRACKS[name]) return;
  stopMusic();
  const tr = TRACKS[name];
  const lead = parse(tr.lead);
  const bass = parse(tr.bass);
  const drums = parse(tr.drums);
  const step = 60 / tr.bpm / 2;
  let i = 0;
  let next = a.currentTime + 0.08;
  const len = (list, at) => {
    let n = 1;
    while (list[(at + n) % list.length] === "-") n += 1;
    return n;
  };
  const tick = () => {
    while (next < a.currentTime + 0.15) {
      const at = next - a.currentTime;
      const l = lead[i % lead.length];
      if (l !== "." && l !== "-") tone({ type: "square", f: N(l), dur: step * len(lead, i % lead.length) * 0.92, vol: 0.5, at, attack: 0.006, bus: musBus });
      const b = bass[i % bass.length];
      if (b !== "." && b !== "-") tone({ type: "triangle", f: N(b), dur: step * len(bass, i % bass.length) * 0.95, vol: 0.9, at, attack: 0.004, bus: musBus });
      const d = drums[i % drums.length];
      if (d === "k") tone({ type: "sine", f: 150, f2: 45, dur: 0.12, vol: 1, at, bus: musBus });
      if (d === "s") noise({ dur: 0.1, vol: 0.5, at, lp: 6000, hp: 900, bus: musBus });
      if (d === "h") noise({ dur: 0.03, vol: 0.25, at, lp: 12000, hp: 6000, bus: musBus });
      next += step;
      i += 1;
    }
  };
  tick();
  seq = setInterval(tick, 40);
  playing = name;
}

function stopMusic() {
  if (seq) clearInterval(seq);
  seq = null;
  playing = null;
}

/* Ask for a music track ("trail", "market", "arena", "grounded") or null for silence. */
export function music(name) {
  wanted = name && TRACKS[name] ? name : null;
  if (!musicOn || !wanted) {
    stopMusic();
    return;
  }
  if (playing === wanted) return;
  startMusic(wanted);
}
