/* Pixel forest battles. Waiting chores idle on the trail. Approval plays the fight, hit bars, and defeat. */

export const SPRITES = [
  { id: "dust", name: "Dust Bunny" },
  { id: "bed", name: "Sheet Ghost" },
  { id: "shoes", name: "Shoe Chomper" },
  { id: "pack", name: "Backpack Beast" },
  { id: "dishes", name: "Suds Slime" },
  { id: "teeth", name: "Paste Pest" },
  { id: "laundry", name: "Laundry Lump" },
  { id: "toys", name: "Block Golem" },
  { id: "reading", name: "Page Flapper" },
];

const SPRITE_IDS = new Set(SPRITES.map((sprite) => sprite.id));

export function normalizeSprite(value) {
  return SPRITE_IDS.has(value) ? value : "dust";
}

export function guessSprite(title) {
  const text = String(title || "").toLowerCase();
  if (/bed|sheet|pillow|blanket/.test(text)) return "bed";
  if (/shoe|boot/.test(text)) return "shoes";
  if (/teeth|tooth|brush|paste/.test(text)) return "teeth";
  if (/laundry|sock|clothes|fold/.test(text)) return "laundry";
  if (/toy|lego|blocks?/.test(text)) return "toys";
  if (/read|book|page|story/.test(text)) return "reading";
  if (/pack|bag|homework|school/.test(text)) return "pack";
  if (/dish|sink|plate|cup|kitchen/.test(text)) return "dishes";
  return "dust";
}

const W = 128;
const H = 72;
const G = 60;
const K = "#1a1c2c";
const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

function mulberry(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const R = mulberry(11);
const rnd = (a, b) => a + R() * (b - a);
function rect(g, x, y, w, h, c) {
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), w, h);
}
function px(g, x, y, c) {
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), 1, 1);
}
function disc(g, cx, cy, r, c) {
  g.fillStyle = c;
  for (let dy = -r; dy <= r; dy += 1) {
    const hw = Math.floor(Math.sqrt(r * r - dy * dy) + 0.3);
    g.fillRect(Math.round(cx) - hw, Math.round(cy) + dy, hw * 2 + 1, 1);
  }
}
function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  return [c, g];
}
function sprite(rows, pal) {
  const w = Math.max(...rows.map((row) => row.length));
  const [c, g] = canvas(w, rows.length);
  rows.forEach((row, j) => [...row].forEach((ch, i) => {
    if (pal[ch]) {
      g.fillStyle = pal[ch];
      g.fillRect(i, j, 1, 1);
    }
  }));
  return c;
}
function shade(hex, amount) {
  const n = Number.parseInt(String(hex).replace("#", ""), 16);
  const mix = (part) => Math.max(0, Math.min(255, Math.round(part * amount)));
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${[r, g, b].map((part) => part.toString(16).padStart(2, "0")).join("")}`;
}

const heroTop = [
  ".....KKKK.....",
  "....KHHHHK....",
  "...KHHHHHHK...",
  "..KHHHHHHHHK..",
  "..KHSSSSSSHK..",
  "..KSSSESSESK..",
  "..KSSSSSSSsK..",
  "...KSSSSSSK...",
  "..KhHHHHHHhK..",
  ".KSKHHHHHHKSK.",
  ".KSKBBbBBBKSK.",
  "..KKHHHHHHKK..",
  "...KHHKKHHK...",
];
function buildHero(color) {
  const pal = { K, H: color, h: shade(color, 0.62), S: "#f4c89c", s: "#d39a6c", E: K, B: "#7a4a26", b: "#f4c542" };
  return {
    a: sprite([...heroTop, "...KBBK.KBBK..", "..KBBBK.KBBBK.", "..KKKKK.KKKKK."], pal),
    b: sprite([...heroTop, "....KBBKBBK...", "...KBBBKBBBK..", "...KKKKKKKKK.."], pal),
  };
}

const dustPal = { K, g: "#b4b4c4", D: "#6e6e82", W: "#ffffff", E: K, P: "#e88aa6" };
const dustTop = [
  "..KK.....KK.....",
  ".KgPK...KgPK....",
  ".KgPK...KgPK....",
  "..KgK.K.KgK.....",
  ".KKgKKgKKgKK....",
  "KgggggggggggK...",
  "KggWWgggWWgggK..",
  "KgDWEggDWEgggK..",
  "KggggggggggggK..",
];
const dustA = sprite([...dustTop, "KgggKKKKKggggK..", ".KgggggggggggK..", "KgDgggDgggDggK..", ".KggDggggDgggK..", "..KKK.KKKK.KK..."], dustPal);
const dustB = sprite([...dustTop, "KgggKDDDKggggK..", ".KgggKKKgggggK..", "KgDgggDgggDggK..", ".KggDggggDgggK..", "..KKK.KKKK.KK..."], dustPal);

const ghostPal = { K, W: "#f6f6fb", w: "#c4c8de", E: K };
const ghostTop = [
  ".....KKKKKK.....",
  "...KKWWWWWWKK...",
  "..KWWWWWWWWWWK..",
  ".KWWWWWWWWWWWWK.",
  ".KWWEEWWWEEWWWK.",
  ".KWWEEWWWEEWWwK.",
  ".KWWWWWWWWWWWwK.",
  ".KWWWWWEEWWWWwK.",
  "KWWWWWWEEWWWWWwK",
  "KWWWWWWWWWWWWWwK",
  ".KWWWWWWWWWWWwK.",
  ".KWWWWWWWWWWWwK.",
  ".KWWWWWWWWWWwwK.",
  ".KWWWWWWWWWWwwK.",
  ".KWWwWWWwWWWwwK.",
];
const ghostA = sprite([...ghostTop, ".KWKKWWKKWWKKwK.", ".KK..KK..KK..KK."], ghostPal);
const ghostB = sprite([...ghostTop, ".KKWWKKWWKKWWKK.", "...KK..KK..KK..."], ghostPal);

const shoePal = { K, r: "#d63c3c", W: "#ffffff", w: "#d8d8e0", E: K, T: "#ffffff" };
const shoeUpper = sprite([
  "............KKKK......",
  "...........KrrrrK.....",
  "..........KrWrWrK.....",
  ".........KrWrWrrrK....",
  "......KKKrrrrrrrrrK...",
  "....KKrrrrWWrrrrrrrK..",
  "..KKrrrrrrEWrrrrrrrK..",
  ".KrrrrrrrrrrrrrrrrrrK.",
  ".KTKTKTKTrrrrrrrrrrrK.",
], shoePal);
const shoeSole = sprite([
  "KWWWWWWWWWWWWWWWWWWWWK",
  "KwWwWwWwWwWwWwWwWwWwWK",
  ".KKKKKKKKKKKKKKKKKKKK.",
], shoePal);

const packPal = { K, B: "#3b74d9", b: "#27509e", Y: "#f4c542", W: "#ffffff", E: K };
const packFlap = sprite([
  "....KKKKKKKK....",
  "...KBBBBBBBBK...",
  "..KBBBBBBBBBBK..",
  "..KBWWBBBBWWBK..",
  "..KBEWBBBBEWBK..",
  "..KbbbbbbbbbbK..",
], packPal);
const packBody = sprite([
  "..KYYYYYYYYYYK..",
  "..KBBBBBBBBBBK..",
  ".KKBBKKKKKKBBKK.",
  ".KBKBKbbbbKBKBK.",
  ".KBKBKbYYbKBKBK.",
  ".KBKBKbbbbKBKBK.",
  "..KBBKKKKKKBBK..",
  "..KBBBBBBBBBBK..",
  "..KbbbbbbbbbbK..",
  "...KKKKKKKKKK...",
  "...KK......KK...",
], packPal);

const slimePal = { K, G: "#5cc96a", g: "#a8f0b0", D: "#3a8f4a", W: "#ffffff", E: K };
const sl = {
  p0: "....KKKKKKKK....",
  p1: "...KWWWWWWWWK...",
  p2: "....KKKKKKKK....",
  n: ".....KGGGGK.....",
  a: "...KKGGGGGGKK...",
  b: "..KGGGgGGGGGGK..",
  e1: ".KGGgWWGGGWWGGK.",
  e2: ".KGGEWGGGEWGGGK.",
  f: "KGGGGGGGGGGGGGGK",
  m: "KGGGGGKKKKGGGGGK",
  mo: "KGGGGKKKKKKGGGGK",
  mi: "KGGGGKDDDDKGGGDK",
  l: "KGGGGGGGGGGGGGDK",
  s: "KDGGDGGGGDGGGDDK",
  z: ".KKKKKKKKKKKKKK.",
};
const slimeA = sprite([sl.p0, sl.p1, sl.p2, sl.n, sl.a, sl.b, sl.e1, sl.e2, sl.f, sl.m, sl.l, sl.s, sl.z], slimePal);
const slimeB = sprite([sl.p0, sl.p1, sl.p2, sl.a, sl.b, sl.e1, sl.e2, sl.f, sl.f, sl.m, sl.l, sl.s, sl.z], slimePal);
const slimeC = sprite([sl.p0, sl.p1, sl.p2, sl.n, sl.a, sl.b, sl.e1, sl.e2, sl.f, sl.mo, sl.mi, sl.s, sl.z], slimePal);

const pastePal = { K, W: "#f4f6fb", w: "#c8d0e0", B: "#3b74d9", R: "#e04a4a", E: K };
const pasteTop = [
  "....KKKK....",
  "....KBBK....",
  "...KKBBKK...",
  "..KBBBBBBK..",
  "..KKKKKKKK..",
  ".KWWWWWWWWK.",
  ".KWWWWWWWwK.",
  ".KRRRRRRRRK.",
  ".KWEWWWEWwK.",
  ".KWEWWWEWwK.",
  ".KWWWWWWWwK.",
];
const pasteBot = [
  ".KBBBBBBBBK.",
  ".KWWWWWWWwK.",
  "..KWWWWWWK..",
  "..KKKKKKKK..",
  "..KwKwKwKK..",
];
const pasteA = sprite([...pasteTop, ".KWWKKKKWwK.", ".KWWWWWWWwK.", ...pasteBot], pastePal);
const pasteB = sprite([...pasteTop, ".KWWKRRKWwK.", ".KWWKKKKWwK.", ...pasteBot], pastePal);
const laundrySpr = sprite([
  "........KKK.........",
  ".......KPPPK........",
  "...KKKKPPPPKKK......",
  "..KRRRRKPPKBBBK.....",
  ".KRRRRRRKKBBBBBK....",
  ".KRRrRRRRKBBBbBBK...",
  "KYYKRRRRRKBBBBbBBK..",
  "KYYYKKKKKGGKKBBBBBK.",
  "KYYYYYKGGGGGGKBBbBK.",
  "KYyYYKGGGGgGGGGKKKK.",
  "KYYYYKGGGGGGGKRRRRK.",
  "KKYYKPPPKGGGKRRrRRRK",
  "KPPPPPPPPKKKRRRRRRRK",
  "KPPpPPPPPPPPPKRRRRRK",
  ".KKKKKKKKKKKKKKKKKK.",
], { K, R: "#e04a4a", r: "#a83232", B: "#3b74d9", b: "#27509e", Y: "#f4c542", y: "#c99a1e", G: "#5cc96a", g: "#3a8f4a", P: "#9b6ad6", p: "#6e47a8" });
const sockRows = ["KKKK..", "KRRK..", "KWWK..", "KWWK..", "KWWWWK", "KWWWWK", "KKKKKK"];
const sockSpr = ["#e04a4a", "#3b74d9", "#5cc96a"].map((color) => sprite(sockRows, { K, R: color, W: "#f4f6fb" }));
const golemPal = { K, R: "#e04a4a", B: "#3b74d9", Y: "#f4c542", G: "#5cc96a", W: "#ffffff", E: K };
const golemRest = [
  "....KKKKKKKK....",
  "KKKKKRRRRRRKKKKK",
  "KBBBKRRWRRRKGGGK",
  "KBWBKRWWWRRKGWGK",
  "KBBBKRRWRRRKGGGK",
  "KKKKKRRRRRRKKKKK",
  "....KKKKKKKK....",
  "....KBBKKGGK....",
  "....KBBKKGGK....",
  "....KBBKKGGK....",
  "....KKKKKKKK....",
];
const golemHead = ["....KKKKKKKK....", "....KYYYYYYK....", "....KYEWYEWK....", "....KYYYYYYK...."];
const golemA = sprite([...golemHead, "....KYKKKKYK....", ...golemRest], golemPal);
const golemB = sprite([...golemHead, "....KYKRRKYK....", ...golemRest], golemPal);
const bookPal = { K, R: "#c0392b", W: "#fff8e6", w: "#b8b0a0", E: K };
const bookBlank = "..................";
const bookUp = sprite([
  "KK..............KK",
  "KRK............KRK",
  "KRWK..........KWRK",
  ".KRWK........KWRK.",
  ".KRWWK......KWWRK.",
  "..KRWWK....KWWRK..",
  "..KRWWWKKKKWWWRK..",
  "...KRWWEWWEWWWRK..",
  "...KKRWWWWWWWRKK..",
  ".....KKRRRRRKK....",
  ".......KKKKK......",
], bookPal);
const bookFlat = sprite([
  bookBlank, bookBlank, bookBlank, bookBlank,
  "KKKKKKKK..KKKKKKKK",
  "KRWWWWWWKKWWWWWWRK",
  "KRWwwwWWEKWEwwwWRK",
  "KRWWWWWWWKWWWWWWRK",
  "KRWwwwwWWKWWwwwwRK",
  "KKRRRRRRRKRRRRRRKK",
  "..KKKKKKKKKKKKKK..",
], bookPal);
const bookDown = sprite([
  bookBlank, bookBlank, bookBlank, bookBlank,
  "......KKKKKK......",
  "....KKWWEKWEKK....",
  "..KKWWWWWKWWWWKK..",
  ".KRWWwwWWKWWwwWRK.",
  "KRWWWWWWWKWWWWWWRK",
  "KRRRKKKKKKKKKKRRRK",
  "KKKK..........KKKK",
], bookPal);

const MON = {
  dust: {
    name: "Dust Bunny",
    w: 16,
    h: 14,
    hit: ["#b4b4c4", "#6e6e82", "#ffffff"],
    yoff: (m) => (m.idle ? -Math.round(Math.abs(Math.sin(m.t * 7)) * 2) : 0),
    draw(g, x, y, m) { g.drawImage(m.open > 0.5 ? dustB : dustA, x, y); },
    async attack(m, api) {
      m.openT = 1;
      if (!(await api.wait(0.3))) return;
      api.projectiles.push({ k: "cloud", x: m.x, y: G - 7, vx: -62, vy: 0, g: 0 });
      m.openT = 0;
    },
  },
  bed: {
    name: "Sheet Ghost",
    w: 16,
    h: 17,
    hit: ["#f6f6fb", "#c4c8de", "#cfe0ff"],
    yoff: (m) => -7 + Math.round(Math.sin(m.t * 3) * 2),
    draw(g, x, y, m) { g.drawImage(((m.t * 4) | 0) % 2 ? ghostB : ghostA, x, y); },
    async attack(m, api) {
      m.lift = 1;
      if (!(await api.wait(0.25))) return;
      api.projectiles.push({ k: "pillow", x: m.x + 2, y: G - 20, vx: -78, vy: -30, g: 110 });
      m.lift = 0;
      if (!(await api.wait(0.3))) return;
      api.projectiles.push({ k: "pillow", x: m.x + 2, y: G - 16, vx: -82, vy: -45, g: 130 });
    },
  },
  shoes: {
    name: "Shoe Chomper",
    w: 22,
    h: 12,
    hit: ["#d63c3c", "#ffffff", "#ff79a8"],
    chomp: true,
    yoff: () => 0,
    draw(g, x, y, m) {
      const o = Math.round(m.open * 4);
      g.drawImage(shoeUpper, x, y - o);
      if (o > 0) {
        rect(g, x + 1, y - o + 9, 12, o, "#4a0e1c");
        rect(g, x + 13, y - o + 9, 8, o, "#d63c3c");
        rect(g, x + 21, y - o + 9, 1, o, K);
        if (o >= 2) [3, 5, 7, 9].forEach((c) => px(g, x + c, y + 8, "#ffffff"));
      }
      g.drawImage(shoeSole, x, y + 9);
    },
    async attack(m, api) {
      m.openT = 1;
      if (!(await api.wait(0.2))) return;
      const L = m.x + 10 - (api.heroX() + 17);
      m.tongueT = L;
      if (!(await api.until(() => m.tongue >= L - 1.5))) return;
      api.block(api.heroX() + 17, G - 5, this.hit);
      m.tongueT = 0;
      if (!(await api.until(() => m.tongue < 0.6))) return;
      m.tongue = 0;
      m.openT = 0;
    },
  },
  pack: {
    name: "Backpack Beast",
    w: 16,
    h: 17,
    hit: ["#3b74d9", "#f4c542", "#ffffff"],
    chomp: true,
    yoff: (m) => (m.idle ? -(((m.t * 3) | 0) % 2) : 0),
    draw(g, x, y, m) {
      const o = Math.round(m.open * 4);
      g.drawImage(packFlap, x, y - o);
      if (o > 0) {
        rect(g, x + 2, y - o + 6, 12, o, K);
        rect(g, x + 3, y - o + 6, 10, o, "#1c1433");
        for (let c = 3; c < 13; c += 2) px(g, x + c, y - o + 6, "#f4c542");
      }
      g.drawImage(packBody, x, y + 6);
    },
    async attack(m, api) {
      m.openT = 1;
      if (!(await api.wait(0.25))) return;
      for (let i = 0; i < 3; i += 1) {
        api.projectiles.push({ k: i === 1 ? "pencil" : "paper", x: m.x + 4, y: G - 12, vx: -rnd(70, 85), vy: -rnd(40, 60), g: 140 });
        if (!(await api.wait(0.18))) return;
      }
      m.openT = 0;
    },
  },
  dishes: {
    name: "Suds Slime",
    w: 16,
    h: 13,
    hit: ["#5cc96a", "#bfefff", "#ffffff"],
    yoff: () => 0,
    draw(g, x, y, m) { g.drawImage(m.open > 0.5 ? slimeC : ((m.t * 3) | 0) % 2 ? slimeB : slimeA, x, y); },
    async attack(m, api) {
      m.openT = 1;
      if (!(await api.wait(0.25))) return;
      for (let i = 0; i < 3; i += 1) {
        api.projectiles.push({ k: "bubble", x: m.x, y: G - 6, vx: -48, vy: 0, g: 0, ph: i * 2, base: G - 6 - i * 3 });
        if (!(await api.wait(0.2))) return;
      }
      m.openT = 0;
    },
  },
  teeth: {
    name: "Paste Pest",
    w: 12,
    h: 18,
    hit: ["#f4f6fb", "#e04a4a", "#3b74d9"],
    yoff: (m) => (m.idle ? -Math.round(Math.abs(Math.sin(m.t * 6)) * 3) : 0),
    draw(g, x, y, m) { g.drawImage(m.open > 0.5 ? pasteB : pasteA, x, y); },
    async attack(m, api) {
      m.openT = 1;
      if (!(await api.wait(0.25))) return;
      for (let i = 0; i < 3; i += 1) {
        api.projectiles.push({ k: "paste", x: m.x + 4, y: G - 18, vx: -rnd(66, 78), vy: -rnd(45, 60), g: 150 });
        if (!(await api.wait(0.12))) return;
      }
      m.openT = 0;
    },
  },
  laundry: {
    name: "Laundry Lump",
    w: 20,
    h: 15,
    hit: ["#e04a4a", "#3b74d9", "#f4c542", "#9b6ad6"],
    yoff: (m) => (m.idle ? -(((m.t * 2.5) | 0) % 2) : 0),
    draw(g, x, y, m) {
      g.drawImage(laundrySpr, x, y);
      const jiggle = m.shake > 0 || m.flash > 0 ? 2.4 : 1.1;
      [[5, 5, 0], [12, 4, 1.7]].forEach(([ex, ey, phase]) => {
        disc(g, x + ex, y + ey, 3, K);
        disc(g, x + ex, y + ey, 2, "#ffffff");
        const dx = Math.max(-1, Math.min(1, Math.round(Math.sin(m.t * 11 + phase) * jiggle)));
        const dy = Math.max(-1, Math.min(1, Math.round(Math.cos(m.t * 7.3 + phase * 2) * jiggle)));
        rect(g, x + ex + dx - 1, y + ey + dy - 1, 2, 2, K);
      });
    },
    async attack(m, api) {
      m.lift = 1;
      if (!(await api.wait(0.2))) return;
      for (let i = 0; i < 3; i += 1) {
        api.projectiles.push({ k: "sock", ci: i, x: m.x + 3, y: G - 14, vx: -rnd(70, 85), vy: -rnd(45, 65), g: 150 });
        if (!(await api.wait(0.16))) return;
      }
      m.lift = 0;
    },
  },
  toys: {
    name: "Block Golem",
    w: 16,
    h: 16,
    hit: ["#e04a4a", "#3b74d9", "#f4c542", "#5cc96a"],
    yoff: (m) => (m.idle ? -(((m.t * 2) | 0) % 2) : 0),
    draw(g, x, y, m) { g.drawImage(m.open > 0.5 ? golemB : golemA, x, y); },
    async attack(m, api) {
      m.openT = 1;
      m.lift = 1;
      if (!(await api.wait(0.25))) return;
      for (let i = 0; i < 2; i += 1) {
        api.projectiles.push({ k: "block", x: m.x + 2, y: G - 12, vx: -rnd(72, 84), vy: -rnd(55, 70), g: 160, c: ["#e04a4a", "#f4c542"][i] });
        if (!(await api.wait(0.22))) return;
      }
      m.lift = 0;
      m.openT = 0;
    },
  },
  reading: {
    name: "Page Flapper",
    w: 18,
    h: 11,
    hit: ["#fff8e6", "#c0392b", "#b8b0a0"],
    yoff: (m) => -11 + Math.round(Math.sin(m.t * 3.5) * 2),
    draw(g, x, y, m) {
      const flap = [bookUp, bookFlat, bookDown, bookFlat][((m.t * 10) | 0) % 4];
      g.drawImage(m.open > 0.5 ? bookFlat : flap, x, y);
    },
    async attack(m, api) {
      m.openT = 1;
      if (!(await api.wait(0.25))) return;
      for (const letter of "ABC") {
        api.projectiles.push({ k: "letter", L: letter, x: m.x + 2, y: G - 17, vx: -58, vy: 0, g: 0, ph: R() * 6, base: G - 17 });
        if (!(await api.wait(0.17))) return;
      }
      m.openT = 0;
    },
  },
};
for (const def of Object.values(MON)) def.tx = Math.round(94 - def.w / 2);

function layer(w, h, fn) {
  const [c, g] = canvas(w, h);
  const wrap = (f) => { f(0); f(-w); f(w); };
  fn(g, w, h, wrap);
  return c;
}
function pine(g, x, base, h, col) {
  g.fillStyle = col;
  for (let i = 0; i < h; i += 1) {
    const hw = Math.floor((i % 5) * 0.8 + Math.floor(i / 5) * 1.2);
    g.fillRect(x - hw, base - h + i, hw * 2 + 1, 1);
  }
  g.fillRect(x, base, 1, 3);
}
const sky = layer(W, H, (g) => {
  const colors = ["#4f9fe0", "#6db3ea", "#8fcaf0", "#b5def5"];
  for (let y = 0; y < H; y += 1) {
    const band = Math.min(3, Math.floor(y / 10));
    g.fillStyle = colors[band];
    g.fillRect(0, y, W, 1);
    if (y % 10 === 9 && band < 3) {
      g.fillStyle = colors[band + 1];
      for (let x = y % 2; x < W; x += 2) g.fillRect(x, y, 1, 1);
    }
  }
});
const clouds = layer(256, 30, (g, w, h, wrap) => {
  [[20, 8], [90, 14], [150, 6], [210, 12]].forEach(([x, y]) => wrap((o) => {
    disc(g, x + o, y, 4, "#ffffff");
    disc(g, x + o + 5, y - 2, 5, "#ffffff");
    disc(g, x + o + 11, y, 4, "#ffffff");
    rect(g, x + o - 3, y + 3, 18, 2, "#d6eefa");
  }));
});
const hills = layer(256, H, (g) => {
  g.fillStyle = "#8fb9c9";
  for (let x = 0; x < 256; x += 1) {
    const y = Math.round(30 + 6 * Math.sin((x * Math.PI * 2) / 128) + 4 * Math.sin((x * Math.PI * 2) / 64 + 1));
    g.fillRect(x, y, 1, H - y);
  }
});
const farPines = layer(256, H, (g, w, h, wrap) => {
  for (let x = 2; x < 256; x += (rnd(6, 10) | 0)) {
    const hh = rnd(9, 17) | 0;
    const xx = x | 0;
    wrap((o) => pine(g, xx + o, 51, hh, "#5d9886"));
  }
  rect(g, 0, 51, 256, H, "#5d9886");
});
const midPines = layer(256, H, (g, w, h, wrap) => {
  for (let x = 4; x < 256; x += (rnd(10, 15) | 0)) {
    const hh = rnd(15, 25) | 0;
    const xx = x | 0;
    wrap((o) => pine(g, xx + o, 55, hh, "#356f57"));
  }
  rect(g, 0, 55, 256, H, "#356f57");
});
const trees = layer(256, H, (g, w, h, wrap) => {
  [18, 84, 150, 206].forEach((x, i) => wrap((o) => {
    const X = x + o;
    rect(g, X - 2, 10, 6, G - 10, "#6b4426");
    rect(g, X + 2, 10, 2, G - 10, "#4a2e18");
    rect(g, X - 4, G - 2, 10, 2, "#4a2e18");
    disc(g, X - 7, 8 + (i % 2) * 3, 9, "#2e7d36");
    disc(g, X + 8, 6, 10, "#2e7d36");
    disc(g, X, -2, 11, "#2e7d36");
    disc(g, X - 8, 6 + (i % 2) * 3, 6, "#3d9a45");
    disc(g, X + 7, 3, 7, "#3d9a45");
    disc(g, X - 1, -4, 7, "#3d9a45");
    px(g, X - 9, 3, "#6cc04a");
    px(g, X - 8, 2, "#6cc04a");
    px(g, X + 5, 0, "#6cc04a");
    px(g, X + 6, -1, "#6cc04a");
    px(g, X - 3, -6, "#6cc04a");
  }));
});
const ground = layer(256, H, (g) => {
  rect(g, 0, G, 256, H - G, "#9a6432");
  rect(g, 0, G, 256, 3, "#5cc23c");
  rect(g, 0, G, 256, 1, "#8ee05a");
  for (let x = 0; x < 256; x += 1) {
    if (R() < 0.35) px(g, x, G - 1, "#5cc23c");
    if (R() < 0.12) px(g, x, G + 3, "#4a9a2e");
  }
  for (let i = 0; i < 70; i += 1) px(g, rnd(0, 256), rnd(G + 4, H), "#7a4a22");
  for (let i = 0; i < 12; i += 1) {
    const x = rnd(0, 250) | 0;
    const y = rnd(G + 5, H - 3) | 0;
    rect(g, x, y, 3, 2, "#b08a5a");
    px(g, x, y + 1, "#8a6a40");
  }
  for (let i = 0; i < 10; i += 1) {
    const x = rnd(0, 256) | 0;
    const c = i % 2 ? "#ff6b6b" : "#ffe066";
    px(g, x, G - 2, c);
    px(g, x, G - 1, "#2f7a2f");
  }
});
const fore = layer(256, 12, (g, w, h, wrap) => {
  [30, 120, 200].forEach((x) => wrap((o) => {
    disc(g, x + o, 13, 6, "#2a6e2e");
    disc(g, x + o + 7, 14, 5, "#2a6e2e");
    px(g, x + o - 2, 8, "#4fa04a");
    px(g, x + o + 6, 10, "#4fa04a");
  }));
});

const FONT = {
  0: "111101101101111",
  1: "010110010010111",
  2: "111001111100111",
  3: "111001111001111",
  4: "101101111001001",
  5: "111100111001111",
  6: "111100111101111",
  7: "111001001001001",
  8: "111101111101111",
  9: "111101111001111",
  "+": "000010111010000",
  "-": "000000111000000",
  A: "010101111101101",
  B: "110101110101110",
  C: "011100100100011",
};

export function drawMonsterIcon(target, type) {
  const def = MON[normalizeSprite(type)];
  target.width = def.w;
  target.height = def.h + 2;
  const g = target.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, target.width, target.height);
  def.draw(g, 0, 2, { open: 0, t: 0, idle: false });
}

const POSE = { walk: -55, idle: -55, windup: -160, swing: 35, block: -78, victory: -95 };
const [mc, mg] = canvas(56, 56);

let host = null;
let ctx = null;
let dialog = null;
let heroSprites = buildHero("#3fa34d");
let worldX = 0;
let scroll = 18;
let scrollTarget = 18;
let shake = 0;
let time = 0;
const hero = { ox: 0, oxT: 0, kx: 0, jy: 0, vy: 0, pose: "walk", ang: -55, smear: 0, alert: 0 };
let mon = null;
const projectiles = [];
const particles = [];
const coins = [];
const floats = [];
const timers = [];
const conds = [];
let runToken = 0;
let lastLead = null;
let lastFront = null;
let full = "";
let shown = 0;
let lastFrame = 0;
let loopOn = false;
const scene = { waiting: [], plays: [], onDone: null, color: "#3fa34d" };

function say(text) {
  const next = text || "";
  if (next === full) return;
  full = next;
  shown = 0;
  if (dialog) dialog.textContent = "";
}
function heroX() { return 26 + hero.ox + hero.kx; }
function heroY() { return G - 15 + hero.jy; }
function burst(x, y, cols, n = 12, sp = 50) {
  for (let i = 0; i < n; i += 1) {
    const a = R() * Math.PI * 2;
    const v = rnd(sp * 0.3, sp);
    particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, g: 120, life: rnd(0.25, 0.5), c: cols[i % cols.length] });
  }
}
function block(x, y, cols) {
  burst(x, y, ["#ffffff", ...cols], 14, 60);
  hero.kx = -3;
  if (!reduce) shake = 0.12;
}
function makeMon(def, item) {
  return {
    def, choreId: item.id, title: item.title, points: Number(item.points) || 0,
    x: W + 6, hp: 3, open: 0, openT: 0, tongue: 0, tongueT: 0, flash: 0, shake: 0,
    t: 0, idle: true, approach: true, alive: true, showHp: false, lift: 0,
  };
}
function idleLine(item, count, line) {
  const def = MON[normalizeSprite(item.sprite)];
  const behind = Math.max(0, count - 1);
  const ready = (line || []).slice(1).filter((chore) => chore.ready).length;
  const bits = [];
  if (behind) bits.push(`${behind} more in line`);
  if (ready) bits.push(`${ready} ready`);
  const extra = bits.length ? ` ${bits.join(". ")}.` : "";
  return `${def.name} is waiting on ${item.title}.${extra}`;
}
function waitFor(seconds, token) {
  return new Promise((resolve) => timers.push({ t: seconds, token, resolve }));
}
function until(fn, token) {
  return new Promise((resolve) => conds.push({ fn, token, resolve }));
}
function apiFor(token) {
  return {
    wait: (seconds) => waitFor(seconds, token),
    until: (fn) => until(fn, token),
    projectiles,
    heroX,
    block,
  };
}
function goTrail() {
  mon = null;
  hero.pose = "walk";
  hero.oxT = 0;
  scrollTarget = 18;
  projectiles.length = 0;
  say("Walking the forest trail...");
}
async function approach(item, token, showHp) {
  const def = MON[normalizeSprite(item.sprite)];
  if (mon?.choreId === item.id && mon.alive && !mon.approach) {
    mon.def = def;
    mon.title = item.title;
    mon.points = Number(item.points) || 0;
    mon.showHp = showHp;
    return true;
  }
  mon = makeMon(def, item);
  mon.showHp = showHp;
  say("...");
  scrollTarget = 30;
  hero.pose = "walk";
  const arrived = await until(() => mon && mon.x <= def.tx, token);
  if (!arrived || token !== runToken || !mon) return false;
  mon.x = def.tx;
  mon.approach = false;
  scroll = 0;
  scrollTarget = 0;
  hero.pose = "idle";
  return true;
}
async function playBattle(item, token) {
  const def = MON[normalizeSprite(item.sprite)];
  const ready = await approach(item, token, true);
  if (!ready) return;
  mon.idle = true;
  mon.showHp = true;
  hero.alert = 0.9;
  say(`${def.name} battles for ${item.title}!`);
  if (!(await waitFor(0.45, token))) return;
  const lines = ["Broom sword!", "Another sweep!", "Final sweep!"];
  const fight = apiFor(token);
  for (let i = 0; i < 3; i += 1) {
    if (token !== runToken || !mon?.alive) return;
    say(lines[i]);
    hero.pose = "windup";
    if (!(await waitFor(0.2, token))) return;
    hero.oxT = mon.x - 18 - 26;
    if (!(await waitFor(0.14, token))) return;
    hero.pose = "swing";
    hero.ang = POSE.swing;
    hero.smear = 0.12;
    mon.hp -= 1;
    mon.flash = 0.2;
    mon.shake = 0.25;
    mon.idle = false;
    if (!reduce) shake = 0.15;
    burst(mon.x + def.w / 2, G - def.h / 2 + def.yoff(mon), def.hit, 16, 70);
    if (!(await waitFor(0.25, token))) return;
    hero.oxT = 0;
    hero.pose = "idle";
    if (!(await waitFor(0.3, token))) return;
    mon.idle = true;
    if (mon.hp > 0) {
      say(`${def.name} fights back!`);
      hero.pose = "block";
      mon.idle = false;
      await def.attack(mon, fight);
      if (token !== runToken) return;
      if (!(await until(() => projectiles.length === 0, token))) return;
      mon.idle = true;
      hero.pose = "idle";
      if (!(await waitFor(0.35, token))) return;
    }
  }
  if (!mon || token !== runToken) return;
  mon.idle = false;
  mon.showHp = false;
  mon.flash = 0.7;
  if (!(await waitFor(0.7, token))) return;
  const cx = mon.x + def.w / 2;
  const cy = G - def.h / 2;
  for (let i = 0; i < 26; i += 1) {
    const a = R() * Math.PI * 2;
    const v = rnd(10, 45);
    particles.push({
      x: cx + rnd(-4, 4), y: cy + rnd(-4, 4), vx: Math.cos(a) * v, vy: Math.sin(a) * v - 10,
      g: -15, life: rnd(0.4, 0.8), c: ["#ffffff", "#e6e6ee", "#c8c8d4"][i % 3], s: 2,
    });
  }
  burst(cx, cy, def.hit, 10, 50);
  mon.alive = false;
  const reward = Math.max(0, mon.points);
  floats.push({ s: `+${reward}`, x: cx - 6, y: cy - 8, life: 1.3 });
  const bits = Math.min(8, reward);
  for (let i = 0; i < bits; i += 1) coins.push({ x: cx, y: cy, vx: rnd(-35, 35), vy: rnd(-75, -45), t: -i * 0.06 });
  say(`${item.title} is done. +${reward} coins`);
  hero.pose = "victory";
  hero.vy = -80;
  if (!(await waitFor(0.55, token))) return;
  hero.vy = -80;
  if (bits > 0) {
    if (!(await until(() => coins.length === 0, token))) return;
  }
  if (!(await waitFor(0.45, token))) return;
  if (token !== runToken) return;
  mon = null;
  hero.pose = "walk";
  scrollTarget = 18;
  scene.onDone?.(item.id);
}
async function presentIdle(item, token) {
  const ready = await approach(item, token, false);
  if (!ready || token !== runToken) return;
  mon.showHp = false;
  mon.idle = true;
  hero.pose = "idle";
  hero.alert = 0;
  say(idleLine(item, scene.waiting.length, scene.waiting));
}
function reconcile() {
  const token = runToken;
  const play = scene.plays[0];
  if (play) {
    playBattle(play, token);
    return;
  }
  const waiting = scene.waiting[0];
  if (waiting) {
    if (mon?.choreId === waiting.id && mon.alive && !mon.approach && !mon.showHp) {
      say(idleLine(waiting, scene.waiting.length, scene.waiting));
      return;
    }
    presentIdle(waiting, token);
    return;
  }
  if (mon || hero.pose !== "walk") goTrail();
}

export function stageElement() {
  if (host) return host;
  host = document.createElement("div");
  host.className = "stage";
  host.innerHTML = `<canvas class="quest-canvas" width="128" height="72" aria-label="Forest battle"></canvas><div class="quest-dialog" aria-live="polite"></div>`;
  const canvasEl = host.querySelector("canvas");
  ctx = canvasEl.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  dialog = host.querySelector(".quest-dialog");
  if (!loopOn) {
    loopOn = true;
    lastFrame = performance.now();
    requestAnimationFrame(frame);
  }
  goTrail();
  return host;
}

export function setStageScene(next) {
  stageElement();
  const color = next.color || "#3fa34d";
  const waiting = next.waiting || [];
  const plays = next.plays || [];
  const lead = plays[0] ? `${plays[0].id}:${plays[0].sprite}` : "";
  const front = waiting[0];
  const frontKey = front ? `${front.id}:${front.sprite}:${front.title}` : "";
  scene.waiting = waiting;
  scene.plays = plays;
  scene.onDone = next.onDone;
  if (color !== scene.color) {
    scene.color = color;
    heroSprites = buildHero(color);
  }
  const sameLead = lead === lastLead;
  const sameFront = frontKey === lastFront;
  lastLead = lead;
  lastFront = frontKey;
  if (lead && sameLead && mon?.choreId === plays[0].id && mon.alive && (mon.showHp || mon.approach)) return;
  if (!lead && front && sameFront && mon?.choreId === front.id && mon.alive && !mon.approach && !mon.showHp) {
    mon.def = MON[normalizeSprite(front.sprite)];
    mon.title = front.title;
    mon.points = Number(front.points) || 0;
    say(idleLine(front, waiting.length, waiting));
    return;
  }
  if (sameLead && sameFront) return;
  runToken += 1;
  projectiles.length = 0;
  reconcile();
}

export function paintSpriteIcons(root) {
  root.querySelectorAll("canvas[data-sprite]").forEach((icon) => drawMonsterIcon(icon, icon.dataset.sprite));
}

function drawLayer(c, off, y = 0) {
  const w = c.width;
  const x = -((((Math.round(off)) % w) + w) % w);
  ctx.drawImage(c, x, y);
  ctx.drawImage(c, x + w, y);
}
function glyph(ch, x, y, col) {
  const f = FONT[ch];
  if (!f) return;
  for (let k = 0; k < 15; k += 1) if (f[k] === "1") px(ctx, x + (k % 3), y + ((k / 3) | 0), col);
}
function text(s, x, y, col) {
  [...s].forEach((ch, i) => {
    const f = FONT[ch];
    if (!f) return;
    for (let k = 0; k < 15; k += 1) {
      if (f[k] === "1") {
        const gx = x + i * 4 + (k % 3);
        const gy = y + ((k / 3) | 0);
        px(ctx, gx + 1, gy + 1, K);
        px(ctx, gx, gy, col);
      }
    }
  });
}
function drawBroom(hx, hy, deg) {
  const q = Math.round(deg / 15) * 15 * (Math.PI / 180);
  const dx = Math.cos(q);
  const dy = Math.sin(q);
  const nx = -dy;
  const ny = dx;
  for (let i = -2; i <= 9; i += 1) px(ctx, hx + dx * i, hy + dy * i, "#9a6232");
  px(ctx, hx + dx * 9, hy + dy * 9, "#d64545");
  px(ctx, hx + dx * 9 + nx, hy + dy * 9 + ny, "#d64545");
  px(ctx, hx + dx * 9 - nx, hy + dy * 9 - ny, "#d64545");
  for (let k = 1; k <= 6; k += 1) {
    const cx = hx + dx * (9 + k);
    const cy = hy + dy * (9 + k);
    const sp = 1 + Math.floor(k * 0.55);
    for (let s = -sp; s <= sp; s += 1) px(ctx, cx + nx * s, cy + ny * s, (k + s) % 2 ? "#e8d07a" : "#c9a84e");
  }
}
function drawMonster(m) {
  const d = m.def;
  mg.clearRect(0, 0, 56, 56);
  mg.globalCompositeOperation = "source-over";
  const lift = m.lift ? -3 : 0;
  d.draw(mg, 16, 52 - d.h + d.yoff(m) + lift, m);
  if (m.flash > 0 && ((m.flash * 30) | 0) % 2 === 0) {
    mg.globalCompositeOperation = "source-atop";
    mg.fillStyle = "#ffffff";
    mg.fillRect(0, 0, 56, 56);
    mg.globalCompositeOperation = "source-over";
  }
  const sx = m.shake > 0 ? Math.round(Math.sin(m.shake * 80) * 2) : 0;
  const sw = Math.round(d.w * 0.7);
  rect(ctx, m.x + (d.w - sw) / 2 + sx, G, sw, 1, "#3e8c2c");
  ctx.drawImage(mc, Math.round(m.x - 16 + sx), G + 1 - 52);
  if (m.tongue > 0) {
    const bx = m.x + 10;
    const by = G - 4;
    const L = Math.round(m.tongue);
    for (let i = 0; i < L; i += 1) {
      const y = by + Math.round(Math.sin(i * 0.35 - m.t * 14) * Math.min(3, i * 0.15));
      px(ctx, bx - i, y, "#ff79a8");
      px(ctx, bx - i, y + 1, "#c8406e");
    }
    const ty = by + Math.round(Math.sin(L * 0.35 - m.t * 14) * Math.min(3, L * 0.15));
    disc(ctx, bx - L, ty, 1, "#ff79a8");
    px(ctx, bx - L - 1, ty + 1, "#c8406e");
  }
  if (m.showHp) {
    const bx = Math.round(m.x + d.w / 2 - 7);
    const by = G + d.yoff(m) - d.h - 6;
    rect(ctx, bx - 1, by - 1, 15, 4, K);
    for (let i = 0; i < 3; i += 1) rect(ctx, bx + i * 5, by, 4, 2, i < m.hp ? "#e04a4a" : "#4a2030");
  }
}
function drawProj(p) {
  if (p.k === "cloud") {
    disc(ctx, p.x, p.y, 3, "#c8c8d4");
    disc(ctx, p.x + 3, p.y - 2, 2, "#dcdce6");
    disc(ctx, p.x + 4, p.y + 1, 2, "#a8a8b8");
    if (R() < 0.6) particles.push({ x: p.x + 5, y: p.y + rnd(-2, 2), vx: rnd(10, 25), vy: rnd(-8, 8), g: 0, life: 0.3, c: "#b4b4c4" });
  } else if (p.k === "pillow") {
    const r = ((time * 12) | 0) % 2;
    const w = r ? 7 : 5;
    const h = r ? 5 : 7;
    rect(ctx, p.x - w / 2, p.y - h / 2, w, h, K);
    rect(ctx, p.x - w / 2 + 1, p.y - h / 2 + 1, w - 2, h - 2, "#dfe9ff");
    px(ctx, p.x, p.y, "#b8c8ec");
  } else if (p.k === "paper") {
    disc(ctx, p.x, p.y, 2, "#ffffff");
    px(ctx, p.x - 1, p.y, "#9aa0b8");
    px(ctx, p.x + 1, p.y - 1, "#9aa0b8");
  } else if (p.k === "pencil") {
    const r = ((time * 14) | 0) % 2;
    if (r) {
      rect(ctx, p.x - 3, p.y, 6, 1, "#f4c542");
      px(ctx, p.x - 4, p.y, "#3a2a1a");
      px(ctx, p.x + 3, p.y, "#ff8a9a");
    } else {
      rect(ctx, p.x, p.y - 3, 1, 6, "#f4c542");
      px(ctx, p.x, p.y - 4, "#3a2a1a");
      px(ctx, p.x, p.y + 3, "#ff8a9a");
    }
  } else if (p.k === "bubble") {
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    rect(ctx, x - 1, y - 2, 3, 1, "#bfefff");
    rect(ctx, x - 1, y + 2, 3, 1, "#bfefff");
    rect(ctx, x - 2, y - 1, 1, 3, "#bfefff");
    rect(ctx, x + 2, y - 1, 1, 3, "#bfefff");
    px(ctx, x - 1, y - 1, "#ffffff");
  } else if (p.k === "paste") {
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    rect(ctx, x - 2, y - 1, 5, 3, "#f4f6fb");
    px(ctx, x - 2, y - 1, "#e04a4a");
    px(ctx, x, y - 1, "#3b74d9");
    px(ctx, x + 2, y + 1, "#e04a4a");
    if (R() < 0.5) particles.push({ x: x + 3, y, vx: rnd(5, 20), vy: rnd(-5, 5), g: 60, life: 0.25, c: "#f4f6fb" });
  } else if (p.k === "sock") {
    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(p.y));
    ctx.rotate((((time * 12) | 0) % 4) * Math.PI / 2);
    ctx.drawImage(sockSpr[p.ci || 0], -3, -3);
    ctx.restore();
  } else if (p.k === "block") {
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    rect(ctx, x - 2, y - 2, 5, 5, K);
    rect(ctx, x - 1, y - 1, 3, 3, p.c);
    px(ctx, ((time * 12) | 0) % 2 ? x - 1 : x + 1, y - 1, "#ffffff");
  } else if (p.k === "letter") {
    const x = Math.round(p.x);
    const y = Math.round(p.y);
    rect(ctx, x - 3, y - 4, 7, 9, K);
    rect(ctx, x - 2, y - 3, 5, 7, "#fff8e6");
    glyph(p.L, x - 1, y - 2, K);
  }
}
function drawCoin(x, y, ph) {
  const w = [5, 3, 1, 3][((ph * 10) | 0) % 4];
  const px0 = Math.round(x);
  const py = Math.round(y);
  rect(ctx, px0 - (w >> 1) - 1, py - 3, w + 2, 7, "#8a5a10");
  rect(ctx, px0 - (w >> 1), py - 2, w, 5, "#f4c542");
  if (w > 1) px(ctx, px0 - (w >> 1), py - 2, "#fff3a8");
}
function update(dt) {
  time += dt;
  for (let i = timers.length - 1; i >= 0; i -= 1) {
    timers[i].t -= dt;
    if (timers[i].t <= 0 || timers[i].token !== runToken) {
      const done = timers[i];
      timers.splice(i, 1);
      done.resolve(done.token === runToken);
    }
  }
  for (let i = conds.length - 1; i >= 0; i -= 1) {
    if (conds[i].token !== runToken || conds[i].fn()) {
      const done = conds[i];
      const ok = done.token === runToken;
      conds.splice(i, 1);
      done.resolve(ok);
    }
  }
  scroll += (scrollTarget - scroll) * Math.min(1, dt * 5);
  if (Math.abs(scroll) < 0.2 && scrollTarget === 0) scroll = 0;
  worldX += scroll * dt;
  hero.ox += (hero.oxT - hero.ox) * Math.min(1, dt * 22);
  hero.kx *= Math.exp(-dt * 9);
  hero.jy += hero.vy * dt;
  hero.vy += 320 * dt;
  if (hero.jy > 0) { hero.jy = 0; hero.vy = 0; }
  const target = POSE[hero.pose] ?? -55;
  hero.ang += (target - hero.ang) * Math.min(1, dt * 28);
  hero.smear = Math.max(0, hero.smear - dt);
  hero.alert = Math.max(0, hero.alert - dt);
  shake = Math.max(0, shake - dt);
  if (mon) {
    mon.t += dt;
    if (mon.approach) mon.x -= scroll * dt;
    let openTarget = mon.openT;
    if (mon.def.chomp && mon.idle && !mon.approach && mon.alive) openTarget = Math.max(openTarget, Math.sin(mon.t * 5) > 0.55 ? 0.6 : 0);
    mon.open += (openTarget - mon.open) * Math.min(1, dt * 18);
    mon.tongue += (mon.tongueT - mon.tongue) * Math.min(1, dt * 13);
    mon.flash = Math.max(0, mon.flash - dt);
    mon.shake = Math.max(0, mon.shake - dt);
  }
  const hx = heroX() + 17;
  for (let i = projectiles.length - 1; i >= 0; i -= 1) {
    const p = projectiles[i];
    p.x += p.vx * dt;
    p.vy += p.g * dt;
    p.y += p.vy * dt;
    if (p.k === "bubble" || p.k === "letter") p.y = p.base + Math.sin(time * 8 + (p.ph || 0)) * 2;
    if (p.x <= hx) {
      block(p.x, p.y, mon ? mon.def.hit : ["#ffffff"]);
      projectiles.splice(i, 1);
    }
  }
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += (p.g || 0) * dt;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
  for (let i = coins.length - 1; i >= 0; i -= 1) {
    const c = coins[i];
    c.t += dt;
    if (c.t < 0) continue;
    if (c.t < 0.5) {
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.vy += 200 * dt;
    } else {
      const tx = 18;
      const ty = 6;
      c.x += (tx - c.x) * Math.min(1, dt * 9);
      c.y += (ty - c.y) * Math.min(1, dt * 9);
      if (Math.abs(c.x - tx) < 2 && Math.abs(c.y - ty) < 2) {
        coins.splice(i, 1);
        burst(tx, ty, ["#f4c542", "#fff3a8"], 5, 30);
      }
    }
  }
  for (let i = floats.length - 1; i >= 0; i -= 1) {
    floats[i].y -= 12 * dt;
    floats[i].life -= dt;
    if (floats[i].life <= 0) floats.splice(i, 1);
  }
  if (dialog && shown < full.length) {
    shown += dt * 48;
    dialog.textContent = full.slice(0, shown | 0);
  }
}
function draw() {
  if (!ctx) return;
  ctx.save();
  if (shake > 0) ctx.translate(Math.round(rnd(-1.5, 1.5)), Math.round(rnd(-1, 1)));
  ctx.drawImage(sky, 0, 0);
  drawLayer(clouds, worldX * 0.08 + time * 2, 2);
  drawLayer(hills, worldX * 0.15);
  drawLayer(farPines, worldX * 0.3);
  drawLayer(midPines, worldX * 0.5);
  drawLayer(trees, worldX * 0.7);
  drawLayer(ground, worldX);
  const x = Math.round(heroX());
  const walking = scroll > 2 && hero.pose === "walk";
  const fr = walking && ((time * 8) | 0) % 2;
  const y = Math.round(heroY()) - (fr ? 1 : 0);
  rect(ctx, x + 3, G, 8, 1, "#3e8c2c");
  if (hero.smear > 0) {
    for (let a = -160; a <= 35; a += 7) {
      const r = a * (Math.PI / 180);
      px(ctx, x + 11 + Math.cos(r) * 14, y + 10 + Math.sin(r) * 14, "#fffbe0");
      px(ctx, x + 11 + Math.cos(r) * 13, y + 10 + Math.sin(r) * 13, "#fff3b0");
    }
  }
  ctx.drawImage(fr ? heroSprites.b : heroSprites.a, x, y);
  drawBroom(x + 11, y + 10, hero.ang);
  if (hero.alert > 0) {
    rect(ctx, x + 4, y - 11, 7, 9, K);
    rect(ctx, x + 5, y - 10, 5, 7, "#ffffff");
    rect(ctx, x + 7, y - 9, 1, 3, "#e04a4a");
    px(ctx, x + 7, y - 5, "#e04a4a");
  }
  if (mon?.alive) drawMonster(mon);
  projectiles.forEach(drawProj);
  particles.forEach((p) => rect(ctx, p.x, p.y, p.s || 1, p.s || 1, p.c));
  coins.forEach((c) => { if (c.t >= 0) drawCoin(c.x, c.y, time + c.x * 0.05); });
  floats.forEach((f) => text(f.s, Math.round(f.x), Math.round(f.y), "#f4c542"));
  drawLayer(fore, worldX * 1.3, H - 12);
  ctx.restore();
}
function frame(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}
