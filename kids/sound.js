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
};

/* Play a sound effect by name. Rapid repeats (like a shower of coins) are thinned out. */
export function play(name) {
  if (!sfxOn || !SFX[name]) return;
  const a = ctx();
  if (!a || a.state !== "running") return;
  const now = a.currentTime;
  const gap = name === "coin" ? 0.05 : 0.03;
  if (now - (lastPlayed.get(name) || -1) < gap) return;
  lastPlayed.set(name, now);
  try { SFX[name](); } catch { /* never let audio break the game */ }
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
