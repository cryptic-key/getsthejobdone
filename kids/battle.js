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
  { id: "pet", name: "Kibble Gremlin" },
  { id: "plants", name: "Wilty Weed" },
  { id: "table", name: "Fork Knight" },
  { id: "trash", name: "Garbage Goblin" },
  { id: "counters", name: "Crumb Crab" },
  { id: "towels", name: "Towel Mummy" },
  { id: "bookshelf", name: "Book Stack" },
  { id: "lunch", name: "Lunchbox Mimic" },
  { id: "coats", name: "Coat Rack Scarecrow" },
  { id: "groceries", name: "Grocery Bag Blob" },
  { id: "homework", name: "Pencil Imp" },
  { id: "dressed", name: "Pajama Phantom" },
  { id: "petbrush", name: "Fur Tumbleweed" },
  { id: "leaves", name: "Leaf Pile Lurker" },
  { id: "snow", name: "Sneaky Snowman" },
  { id: "outside", name: "Couch Monster" },
  { id: "wood", name: "Woodpile Grump" },
];

const SPRITE_IDS = new Set(SPRITES.map((sprite) => sprite.id));

export function normalizeSprite(value) {
  return SPRITE_IDS.has(value) ? value : "dust";
}

export function guessSprite(title) {
  const text = String(title || "").toLowerCase();
  if (/snow|shovel/.test(text)) return "snow";
  if (/outside|fresh air/.test(text)) return "outside";
  if (/firewood|woodpile|fire wood/.test(text)) return "wood";
  if (/bed|sheet|pillow|blanket/.test(text)) return "bed";
  if (/shoe|boot/.test(text)) return "shoes";
  if (/bookshelf|book shelf|\bshelf\b/.test(text)) return "bookshelf";
  if (/pet brush|brush(?:ed|ing)?(?: the)? pet/.test(text)) return "petbrush";
  if (/towel/.test(text)) return "towels";
  if (/dress|pajama|pyjama/.test(text)) return "dressed";
  if (/homework/.test(text)) return "homework";
  if (/lunch/.test(text)) return "lunch";
  if (/coat|jacket/.test(text)) return "coats";
  if (/grocer/.test(text)) return "groceries";
  if (/trash|garbage|rubbish/.test(text)) return "trash";
  if (/counter/.test(text)) return "counters";
  if (/\bleaf|rake/.test(text)) return "leaves";
  if (/plant|flower/.test(text)) return "plants";
  if (/kibble|pet food|\bpet\b/.test(text)) return "pet";
  if (/\btable\b/.test(text)) return "table";
  if (/teeth|tooth|brush|paste/.test(text)) return "teeth";
  if (/laundry|sock|clothes|fold/.test(text)) return "laundry";
  if (/toy|lego|blocks?/.test(text)) return "toys";
  if (/read|book|page|story/.test(text)) return "reading";
  if (/pack|bag|school/.test(text)) return "pack";
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
const heroCache = new Map();
function heroFor(color) {
  const key = color || "#3fa34d";
  if (!heroCache.has(key)) heroCache.set(key, buildHero(key));
  return heroCache.get(key);
}
const prinTop = [
  ".....C.C.C....",
  "....KCCcCCK...",
  "...KAAAAAAAK..",
  "..KAAAAAAAAAK.",
  "..KAASSSSSSK..",
  "..KAASSESSESK.",
  "..KAASPSSSPK..",
  "..KAAKSSSSK...",
  "..KAKDDWWDDK..",
  ".KSKDDDDDDKSK.",
  ".KSKDDWWDDKSK.",
  "..KKDDDDDDKK..",
  "..KDDdDDdDDK..",
];
function buildPrincess(color) {
  const dress = color || "#ff8ac6";
  const pal = {
    K,
    C: "#f4c542",
    c: "#e04a4a",
    A: "#a0562a",
    a: "#6e3418",
    S: "#f4c89c",
    s: "#d39a6c",
    E: K,
    P: shade(dress, 1.08),
    D: dress,
    d: shade(dress, 0.72),
    W: "#ffffff",
  };
  return {
    h: 16,
    hand: 10,
    a: sprite([...prinTop, ".KDDdDDdDDdDK.", ".KDdDDdDDdDDK.", "KWWWWWWWWWWWWK"], pal),
    b: sprite([...prinTop, "..KDdDDdDDdDK.", ".KDDdDDdDDdDDK", "KWWWWWWWWWWWWK"], pal),
  };
}
const kingPal = { K, C: "#f4c542", c: "#e04a4a", A: "#8a5a2a", S: "#f4c89c", s: "#d39a6c", E: K, G: "#dcdce6", R: "#c0392b", Y: "#f4c542", W: "#ffffff", B: "#5a3418" };
const kingTop = [
  "...C.C.C.C....",
  "...KCCCCCCK...",
  "...KCcCcCCK...",
  "...KCCCCCCK...",
  "..KAAAAAAAAK..",
  "..KASSSSSSAK..",
  "..KSSSESSESK..",
  "..KSSSSSSSsK..",
  "..KGGSSSSGGK..",
  "..KGGGGGGGGK..",
  "...KGGGGGGK...",
  "..KRRKGGKRRK..",
  ".KRRRRKKRRRRK.",
  ".KSKRRYRRRKSK.",
  ".KSKRRRRRRKSK.",
  "..KKWRRRRWKK..",
  "..KWRRRRRRWK..",
  ".KWRRRRRRRRWK.",
];
const queenPal = { K, C: "#f4c542", c: "#7fe0ff", A: "#3a2418", S: "#f4c89c", E: K, R: "#d64545", Y: "#f4c542", P: "#7a3fb0", p: "#552a80" };
const queenTop = [
  "....C.C.C.....",
  "...KCcCcCK....",
  "...KCCCCCK....",
  "...KCcCcCK....",
  "..KAAAAAAAAK..",
  "..KAASSSSSSK..",
  "..KAASSESSESK.",
  "..KAASSSSRSK..",
  ".KAAAKSSSSK...",
  ".KAAAKKSSKK...",
  ".KAAKPPYPPPK..",
  ".KAAKPPPPPPK..",
  "..KKPPPPPPKK..",
  ".KSKPPYPPPKSK.",
  ".KSKPPPPPPKSK.",
  "..KKPPPPPPKK..",
  "..KPPpPPpPPK..",
];
const lookCache = new Map();
function heroLook(key, color) {
  const kind = key || "knight";
  const tint = color || (kind === "princess" ? "#ff8ac6" : "#3fa34d");
  const cacheKey = `${kind}:${tint}`;
  if (lookCache.has(cacheKey)) return lookCache.get(cacheKey);
  let look;
  if (kind === "princess") look = buildPrincess(tint);
  else if (kind === "king") {
    look = {
      h: 20,
      hand: 13,
      a: sprite([...kingTop, ".KWKWKWKWKWWK.", "..KBBK..KBBK.."], kingPal),
      b: sprite([...kingTop, ".KWWKWKWKWKWK.", "...KBBKKBBK..."], kingPal),
    };
  } else if (kind === "queen") {
    look = {
      h: 20,
      hand: 13,
      a: sprite([...queenTop, ".KPPpPPpPPpPK.", ".KPpPPpPPpPPK.", "KYYYYYYYYYYYYK"], queenPal),
      b: sprite([...queenTop, "..KPpPPpPPpPK.", ".KPPpPPpPPpPPK", "KYYYYYYYYYYYYK"], queenPal),
    };
  } else look = { h: 16, hand: 10, ...buildHero(tint) };
  lookCache.set(cacheKey, look);
  return look;
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

const gremPal = { K, P: "#8e5bd0", p: "#5e3a96", W: "#ffffff", E: K, T: "#ffffff" };
const gremTop = ["K............K", "KPK........KPK", "KPPK.KKKK.KPPK", ".KPPKPPPPKPPK.", "..KPPPPPPPPK..", "..KPWWPPWWPK..", "..KPEWPPEWPK..", "..KPPPPPPPPK.."];
const gremBot = [".KpPPPPPPPPpK.", ".KpKPPKKPPKpK.", "..KK.KK.KK.KK."];
const gremA = sprite([...gremTop, "..KPKTKTKTPK..", "..KPPKKKKPPK..", ...gremBot], gremPal);
const gremB = sprite([...gremTop, "..KPKKKKKKPK..", "..KPKTKTKKPK..", ...gremBot], gremPal);
const kibbleS = sprite(["KKK", "KBK", "KKK"], { K, B: "#a0622a" });
const weedS = sprite([
  "......KKKKK.....",
  ".....KYYYYYK....",
  "....KYYOOOYYK...",
  "....KYOEOEOYK...",
  "....KYYOOOYYK...",
  ".....KYKYKYK....",
  ".......KGK......",
  ".KKK...KGK...KKK",
  "KLLLK..KGK..KLLK",
  ".KLLLKKKGKKKLLK.",
  "..KKK..KGK..KK..",
  "...KKKKKKKKKK...",
  "...KTTTTTTTTK...",
  "....KTTTTTTK....",
  "....KTtTTtTK....",
  "....KTTTTTTK....",
  ".....KKKKKK.....",
], { K, Y: "#f4d742", O: "#e88a2e", E: K, G: "#3a9d4a", L: "#5cc96a", T: "#c8693a", t: "#8e4524" });
const forkS = sprite([
  ".K.K.K.K.",
  "KSKSKSKSK",
  "KSKSKSKSK",
  "KSKSKSKSK",
  "KSSSSSSSK",
  "KSSSSSSSK",
  "KSESSESSK",
  "KSSKKKSSK",
  ".KSSSSSK.",
  "..KSSSK..",
  "...KSK...",
  "...KSK...",
  "...KSK...",
  "...KsK...",
  "...KSK...",
  "...KsK...",
  "...KSK...",
  "...KSK...",
  "..KSSSK..",
  "..KKKKK..",
], { K, S: "#c8d0e0", s: "#8890a8", E: K });
const canPal = { K, L: "#9aa6b4", G: "#7f8c9a", g: "#55606e" };
const canLid = sprite(["......KK......", "...KKKKKKKK...", ".KKLLLLLLLLKK.", "KLLLLLLLLLLLLK", "KKKKKKKKKKKKKK"], canPal);
const canBody = sprite([
  ".KGgGGgGGgGGK.",
  ".KGgGGgGGgGGK.",
  ".KGgGGgGGgGGK.",
  ".KGgGGgGGgGGK.",
  ".KGgGGgGGgGGK.",
  ".KGgGGgGGgGGK.",
  "..KgGGgGGgGK..",
  "..KgGGgGGgGK..",
  "..KKKKKKKKKK..",
], canPal);
const peelS = sprite(["..KK..", ".KYK.K", "KYYKYK", "KYYYYK", ".KKKK."], { K, Y: "#f4d742" });
const crabA = sprite([
  "KKK..........KKK",
  "KCK..K....K..KCK",
  "KCCK.E....E.KCCK",
  ".KCK.K....K.KCK.",
  "..KKKKKKKKKKKK..",
  ".KCCCCCCCCCCCCK.",
  "KCCCCCKKCCCCCCCK",
  "KCCCCCCCCCCCCCCK",
  ".KKcKKcKKcKKcKK.",
  "K..K..K..K..K..K",
], { K, C: "#e8603c", c: "#a8402a", E: K });
const crumbS = sprite(["tt", "tT"], { t: "#e0b56a", T: "#a8763a" });
const mummyS = sprite([
  "...KKKKKK...",
  "..KBBBBBBK..",
  ".KBWWWWWWBK.",
  ".KBKYKKYKBK.",
  ".KBWWWWWWBK.",
  ".KBBBBBBBBK.",
  "KBBWWWWWWBBK",
  "KBBBBBBBBBBK",
  "KBWWWWWWWWBK",
  ".KBBBBBBBBK.",
  ".KBWWWWWWBK.",
  ".KBBBBBBBBK.",
  ".KBWWWWWWBK.",
  ".KBBBBBBBBK.",
  ".KBBK..KBBK.",
  ".KKK....KKK.",
], { K, B: "#5aa9e6", W: "#f4f6fb", Y: "#ffe066" });
const stackS = sprite([
  "..KKKKKKKKK...",
  "..KRRRRRRRWK..",
  "..KKKKKKKKKK..",
  ".KKKKKKKKKKK..",
  ".KBBBBBBBBWK..",
  ".KKKKKKKKKKK..",
  "..KKKKKKKKKKK.",
  "..KGEWGGEWGWK.",
  "..KGGGGGGGGWK.",
  "..KGGKKKKGGWK.",
  "..KKKKKKKKKKK.",
  "KKKKKKKKKKKK..",
  "KYYYYYYYYYWK..",
  "KKKKKKKKKKKK..",
  ".KKKKKKKKKKKK.",
  ".KPPPPPPPPPWK.",
  ".KKKKKKKKKKKK.",
], { K, R: "#d64545", B: "#3b74d9", G: "#5cc96a", Y: "#f4c542", P: "#9b6ad6", W: "#fff8e6", E: K });
const bookS = sprite(["KKKKKK", "KRRRWK", "KRRRWK", "KKKKKK"], { K, R: "#3b74d9", W: "#fff8e6" });
const lunchPal = { K, R: "#d6453c", r: "#9a2e28", W: "#ffffff", E: K, Y: "#f4c542" };
const lunchLid = sprite([".....KKKKKK.....", ".....K....K.....", "..KKKKKKKKKKKK..", ".KRREWRRRREWRRK.", ".KrrrrrrrrrrrrK."], lunchPal);
const lunchBody = sprite([".KRRRRRRRRRRRRK.", ".KRRRKYYKRRRRRK.", ".KRRRRRRRRRRRRK.", ".KrrrrrrrrrrrrK.", "..KKKKKKKKKKKK.."], lunchPal);
const grapeS = sprite([".KK.", "KPpK", "KPPK", ".KK."], { K, P: "#8e44ad", p: "#c39bd3" });
const rackS = sprite([
  "....KKKKK.....",
  "....KHHHK.....",
  "..KKKKKKKKK...",
  "....KSSSK.....",
  "....KESEK.....",
  "....KSSSK.....",
  "KK...KBK...KK.",
  ".KKKKCBCKKKK..",
  "...KCCBCCK....",
  "..KCCcBcCCK...",
  "..KCCcBcCCK...",
  "..KCYcBcYCK...",
  "..KCCcBcCCK...",
  "..KCCcBcCCK...",
  "..KKKKBKKKK...",
  "......KBK.....",
  "......KBK.....",
  "......KBK.....",
  "....KKKBKKK...",
  "...KBBBBBBBK..",
  "...KKKKKKKKK..",
], { K, H: "#3d3a5c", S: "#c99a5b", E: K, B: "#7a4a26", C: "#2f6f8f", c: "#1f4f6a", Y: "#f4c542" });
const hangerS = sprite(["...H...", "..H.H..", ".H...H.", "HHHHHHH"], { H: "#c8d0e0" });
const bagS = sprite([
  "...G.G..KK....",
  "..GGKGG.KYK...",
  "...GKG..KYK...",
  "..KKKKKKKKKKK.",
  "..KBBBBBBBBBK.",
  ".KBBBBBBBBBBBK",
  ".KBBEWBBBEWBBK",
  ".KBBBBBBBBBBBK",
  ".KBBBKKKKBBBBK",
  ".KBBBBBBBBBBBK",
  ".KbBBBBBBBBBbK",
  ".KBBBBBBBBBBBK",
  ".KbbbbbbbbbbbK",
  "..KKKKKKKKKKK.",
], { K, G: "#5cc96a", Y: "#e8c070", B: "#c99a5b", b: "#a07a40", E: K, W: "#ffffff" });
const canS = sprite(["KKKKK", "KRRRK", "KWWWK", "KRRRK", "KKKKK"], { K, R: "#d64545", W: "#f4f6fb" });
const pencilS = sprite([
  ".KKKKKK.",
  ".KPPPPK.",
  ".KPPPPK.",
  ".KSSSSK.",
  ".KYYYYK.",
  "KYYYYYYK",
  "KEWYEWYK",
  "KYYYYYYK",
  "KYKKKYYK",
  "KYYYYYYK",
  ".KYYYYK.",
  ".KYYYYK.",
  ".KYyYYK.",
  ".KYyYYK.",
  ".KWWWWK.",
  "..KWWK..",
  "..KWWK..",
  "...GK...",
], { K, P: "#f08aa0", S: "#c8d0e0", Y: "#f4c542", y: "#c99a1e", E: K, W: "#e8c890", G: "#3a3a48" });
const eraserS = sprite(["PP", "Pp"], { P: "#f08aa0", p: "#c06070" });
const pjS = sprite([
  "...........WW...",
  "..........KWWK..",
  "........KKRK....",
  "......KKRRRK....",
  "....KKRRRRRK....",
  "...KRRRRRRRK....",
  "..KWWWWWWWWWK...",
  "..KSSSSSSSSSK...",
  "..KSKKSSSKKSK...",
  "..KSSSSSSSSSK...",
  ".KKBBBKKKBBBKK..",
  "KBBDBBBBBDBBBBK.",
  "KBBBBBDBBBBBDBK.",
  ".KBDBBBBDBBBBK..",
  ".KBBBBBBBBBDBK..",
  ".KBBBDBBBBBBBK..",
  "..KKBKKBKKBKK...",
], { K, W: "#ffffff", R: "#d64545", S: "#e8ecff", B: "#6c8cff", D: "#ffffff" });
const furS = sprite([
  "....K.K.K.....",
  "..K.KFKFK.K...",
  ".KFKFFFFFKFK..",
  "KFFFFFFFFFFFK.",
  ".KFWWFFFWWFFK.",
  "KFFEWFFFEWFFFK",
  ".KFFFFFFFFFFK.",
  "KFFFFFKKFFFFFK",
  ".KFfFFFFFFfFK.",
  "KFFFFfFFfFFFFK",
  ".KFKFFKFFKFK..",
  "..K.KK.KK.K...",
], { K, F: "#c98a4a", f: "#a06a30", W: "#ffffff", E: K });
const fluffS = sprite(["..FF.", ".FFFF", "FFFFF", ".FF.."], { F: "#e8c08a" });
const leafPal = { K, O: "#e8862e", R: "#c8402a", Y: "#f4c542", W: "#ffffff", E: K };
const leafPileS = sprite([
  ".......KK...........",
  ".....KKOOKK..KK.....",
  "...KKOORRRKKYYKK....",
  "..KOOOOOROOOYYYYK...",
  ".KRRRKWWOOOWWKYYYK..",
  ".KRRRKEWOOOEWKYYYYK.",
  "KRRRRROOOOOOOOYYYYYK",
  "KOOOYYYOOOKKOORRRRYK",
  "KOOOYYYYOOOOORRRRRRK",
  "KYYYRRRROOOOYYYOOORK",
  "KYYRRRRROOOOYYYOOOOK",
  ".KKKKKKKKKKKKKKKKKK.",
], leafPal);
const leafS = [leafPal.O, leafPal.R, leafPal.Y].map((color) => sprite(["..K..", ".KOK.", "KOOOK", ".KOK.", "..K.."], { K, O: color }));
const snowPal = { K, W: "#f4f8ff", w: "#c8d8ee", O: "#f4862e", H: "#2a2a38", R: "#d64545", r: "#9a2626", E: K, B: "#7a4a26" };
const snowHead = ["....KKKKK.....", "....KHHHK.....", "....KHHHK.....", "..KKKKKKKKK..."];
const snowBody = ["OOOOWWWWWWK...", "..KWKWKWWWK...", "..KRRRRRRRK...", ".KRrRRRRRRRK.."];
const snowLow = ["..KWWWEWWWWWK.", ".KWWWWWWWWWWWK", "KWWWWWEWWWWWWK", "KWWWWWWWWWWWwK", "KWwWWWWWWWWwwK", ".KwwWWWWWWwwK.", "..KKKKKKKKKK.."];
const snowA = sprite([...snowHead, "...KWWWWWK....", "..KWEWWEWWK...", ...snowBody, "B.KWRrWWWWWK.B", ".BKWWRWWWWWKB.", ...snowLow], snowPal);
const snowB = sprite([...snowHead, "B..KWWWWWK..B.", ".BKWEWWEWWKB..", ...snowBody, "..KWRrWWWWWK..", "..KWWRWWWWWK..", ...snowLow], snowPal);
const snowballS = sprite([".KKK.", "KWWWK", "KWWwK", "KWwwK", ".KKK."], { K, W: "#ffffff", w: "#c8d8ee" });
const woodPal = { K, B: "#b07840", w: "#e8c07a", r: "#b88848", W: "#ffffff", E: K, T: "#ffffff", D: "#3a0c14", G: "#5cc96a", g: "#3a8f4a" };
const logPlain = sprite([".KKKK.", "KBBBBK", "KBwwBK", "KBwrBK", "KBBBBK", ".KKKK."], woodPal);
const logEye = sprite([".KKKK.", "KBBBBK", "KBWWBK", "KBEWBK", "KBBBBK", ".KKKK."], woodPal);
const logMouthA = sprite([".KKKK.", "KBwwBK", "KwKKwK", "KwwwwK", "KBwwBK", ".KKKK."], woodPal);
const logMouthB = sprite([".KKKK.", "KBwwBK", "KTDDTK", "KDDDDK", "KBwwBK", ".KKKK."], woodPal);
function woodpile(mouth) {
  const [c, g] = canvas(22, 17);
  const o = 2;
  g.drawImage(logPlain, o + 6, 1);
  px(g, o + 8, 0, "#5cc96a");
  px(g, o + 9, 0, "#3a8f4a");
  px(g, o + 7, 1, "#5cc96a");
  g.drawImage(logEye, o + 3, 6);
  g.drawImage(logEye, o + 9, 6);
  rect(g, o + 4, 5, 2, 1, K);
  rect(g, o + 12, 5, 2, 1, K);
  g.drawImage(logPlain, o, 11);
  g.drawImage(mouth, o + 6, 11);
  g.drawImage(logPlain, o + 12, 11);
  [[0, 9], [1, 9], [1, 8], [20, 9], [21, 9], [20, 8]].forEach(([x, y]) => px(g, x, y, "#6b4426"));
  return c;
}
const woodA = woodpile(logMouthA);
const woodB = woodpile(logMouthB);
const logS = sprite(["KKKKKK", "KBBBBw", "KKKKKK"], woodPal);
const couchPal = { K, C: "#c8403a", c: "#8a2a26", h: "#e86a5a", W: "#ffffff", E: K, T: "#ffffff" };
const couchTop = sprite([
  "...KKKKKKKKKKKKKKKK...",
  "..KChCCCCCCCCCCCChCK..",
  "..KCCWWWCCCCCCWWWCCK..",
  "..KCCKEWCCCCCCKEWCCK..",
  "..KCCcCCCCCCCCCCcCCK..",
  "KKKCCCCCCCCCCCCCCCCKKK",
  "KhCKCCCCCCCCCCCCCCKChK",
  "KCCKKKKKKKKKKKKKKKKCCK",
  "KCCKTKTKTKTKTKTKTKKCCK",
], couchPal);
const couchBot = sprite([
  "KCCKccccccccccccccKCCK",
  "KCCKCCCCCCKCCCCCCCKCCK",
  "KCCKccccccKcccccccKCCK",
  "KKKKKKKKKKKKKKKKKKKKKK",
  ".KK................KK.",
], couchPal);
const cushionS = sprite(["KKKKK", "KChCK", "KCCCK", "KKKKK"], couchPal);
const remoteS = sprite(["KKKKKK", "KRrRRK", "KKKKKK"], { K, R: "#3a3a48", r: "#e04a4a" });
const chipS = sprite([".KK.", "KYYK", "KYyK", ".KK."], { K, Y: "#f4d06a", y: "#d4a84a" });

function jaw(g, x, y, m, top, bottom, split, c0, cw, inside, teeth) {
  const o = Math.round(m.open * 4);
  g.drawImage(top, x, y - o);
  if (o > 0) {
    rect(g, x + c0 - 1, y + split - o, cw + 2, o, K);
    rect(g, x + c0, y + split - o, cw, o, inside);
    if (teeth && o >= 2) {
      for (let c = c0 + 1; c < c0 + cw; c += 2) {
        px(g, x + c, y + split - o, teeth);
        px(g, x + c, y + split - 1, teeth);
      }
    }
  }
  g.drawImage(bottom, x, y + split);
}
async function toss(m, api, list, { open = true, lift = true } = {}) {
  if (open) m.openT = 1;
  if (lift) m.lift = 1;
  if (!(await api.wait(0.25))) return;
  for (const shot of list) {
    api.projectiles.push({ k: "spr", x: m.x + 2, y: G - 12, vx: -70, vy: -50, g: 150, spin: true, ...shot });
    if (!(await api.wait(shot.gap ?? 0.15))) return;
  }
  m.openT = 0;
  m.lift = 0;
}
async function lash(m, api, def) {
  m.openT = 1;
  if (!(await api.wait(0.2))) return;
  const reach = m.x + (def.lashX ?? 10) - (api.heroX() + 17);
  m.tongueT = reach;
  if (!(await api.until(() => m.tongue >= reach - 1.5))) return;
  api.block(api.heroX() + 17, G - (def.lashY ?? 4), def.hit);
  m.tongueT = 0;
  if (!(await api.until(() => m.tongue < 0.6))) return;
  m.tongue = 0;
  m.openT = 0;
}
async function charge(m, api) {
  m.lift = 1;
  if (!(await api.wait(0.25))) return;
  m.lift = 0;
  const reach = -(m.x - (api.heroX() + 18));
  m.lungeT = reach;
  if (!(await api.until(() => m.lunge <= reach + 1.5))) return;
  api.block(api.heroX() + 17, G - 10, m.def.hit);
  m.lungeT = 0;
  if (!(await api.until(() => Math.abs(m.lunge) < 0.6))) return;
  m.lunge = 0;
}

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
  pet: {
    name: "Kibble Gremlin",
    w: 14,
    h: 13,
    hit: ["#8e5bd0", "#a0622a", "#ffffff"],
    yoff: (m) => (m.idle ? -Math.round(Math.abs(Math.sin(m.t * 8)) * 2) : 0),
    draw(g, x, y, m) { g.drawImage(m.open > 0.5 ? gremB : gremA, x, y); },
    attack(m, api) {
      return toss(m, api, [0, 1, 2, 3].map(() => ({ s: kibbleS, vx: -rnd(65, 85), vy: -rnd(30, 70), gap: 0.08 })), { lift: false });
    },
  },
  plants: {
    name: "Wilty Weed",
    w: 16,
    h: 17,
    hit: ["#5cc96a", "#f4d742", "#c8693a"],
    lashX: 2,
    lashY: 8,
    lashCol: ["#5cc96a", "#2e7d36"],
    yoff: () => 0,
    draw(g, x, y) { g.drawImage(weedS, x, y); },
    attack(m, api) { return lash(m, api, this); },
  },
  table: {
    name: "Fork Knight",
    w: 9,
    h: 20,
    hit: ["#c8d0e0", "#ffffff", "#8890a8"],
    yoff: (m) => (m.idle ? -(((m.t * 3) | 0) % 2) : 0),
    draw(g, x, y) { g.drawImage(forkS, x, y); },
    attack(m, api) { return charge(m, api); },
  },
  trash: {
    name: "Garbage Goblin",
    w: 14,
    h: 14,
    hit: ["#7f8c9a", "#f4d742", "#5cc96a"],
    chomp: true,
    yoff: () => 0,
    draw(g, x, y, m) {
      jaw(g, x, y, m, canLid, canBody, 5, 2, 10, "#1c1433", null);
      const o = Math.round(m.open * 4);
      if (o >= 2) {
        px(g, x + 4, y + 5 - o + 1, "#ffe066");
        px(g, x + 8, y + 5 - o + 1, "#ffe066");
      }
    },
    attack(m, api) {
      return toss(m, api, [{ s: peelS, vx: -75, vy: -60 }, { s: peelS, vx: -82, vy: -45 }], { lift: false });
    },
  },
  counters: {
    name: "Crumb Crab",
    w: 16,
    h: 10,
    hit: ["#e8603c", "#e0b56a", "#ffffff"],
    yoff: (m) => (m.idle ? -(((m.t * 6) | 0) % 2) : 0),
    draw(g, x, y) { g.drawImage(crabA, x, y); },
    attack(m, api) {
      return toss(m, api, [0, 1, 2, 3, 4].map(() => ({ s: crumbS, spin: false, y: G - 6, vx: -rnd(70, 90), vy: -rnd(20, 60), gap: 0.06 })));
    },
  },
  towels: {
    name: "Towel Mummy",
    w: 12,
    h: 16,
    hit: ["#5aa9e6", "#f4f6fb"],
    lashX: 1,
    lashY: 9,
    lashCol: ["#5aa9e6", "#f4f6fb"],
    yoff: (m) => (m.idle ? -(((m.t * 2) | 0) % 2) : 0),
    draw(g, x, y) { g.drawImage(mummyS, x, y); },
    attack(m, api) { return lash(m, api, this); },
  },
  bookshelf: {
    name: "Book Stack",
    w: 14,
    h: 17,
    hit: ["#d64545", "#3b74d9", "#f4c542", "#fff8e6"],
    yoff: () => 0,
    draw(g, x, y, m) { g.drawImage(stackS, x + (m.idle && ((m.t * 2) | 0) % 2 ? 1 : 0), y); },
    attack(m, api) {
      return toss(m, api, [{ s: bookS, y: G - 17, vx: -70, vy: -40, gap: 0.25 }, { s: bookS, y: G - 17, vx: -80, vy: -55 }]);
    },
  },
  lunch: {
    name: "Lunchbox Mimic",
    w: 16,
    h: 10,
    hit: ["#d6453c", "#8e44ad", "#ffffff"],
    chomp: true,
    yoff: () => 0,
    draw(g, x, y, m) { jaw(g, x, y, m, lunchLid, lunchBody, 5, 2, 12, "#3a0c14", "#ffffff"); },
    attack(m, api) {
      return toss(m, api, [0, 1, 2].map(() => ({ s: grapeS, spin: false, y: G - 7, vx: -rnd(70, 80), vy: -rnd(25, 40), gap: 0.12 })), { lift: false });
    },
  },
  coats: {
    name: "Coat Rack Scarecrow",
    w: 14,
    h: 21,
    hit: ["#2f6f8f", "#c8d0e0", "#7a4a26"],
    yoff: () => 0,
    draw(g, x, y, m) { g.drawImage(rackS, x + (m.idle && ((m.t * 1.5) | 0) % 2 ? 1 : 0), y); },
    attack(m, api) {
      return toss(m, api, [{ s: hangerS, y: G - 15, vx: -72, vy: -35, gap: 0.25 }, { s: hangerS, y: G - 15, vx: -80, vy: -50 }]);
    },
  },
  groceries: {
    name: "Grocery Bag Blob",
    w: 14,
    h: 14,
    hit: ["#c99a5b", "#5cc96a", "#d64545"],
    yoff: (m) => (m.idle ? -Math.round(Math.abs(Math.sin(m.t * 5)) * 2) : 0),
    draw(g, x, y) { g.drawImage(bagS, x, y); },
    attack(m, api) {
      return toss(m, api, [{ s: canS, y: G - 2, vy: 0, g: 0, vx: -70, gap: 0.35 }, { s: canS, y: G - 2, vy: 0, g: 0, vx: -80 }], { lift: false });
    },
  },
  homework: {
    name: "Pencil Imp",
    w: 8,
    h: 18,
    hit: ["#f4c542", "#f08aa0", "#3a3a48"],
    yoff: (m) => (m.idle ? -Math.round(Math.abs(Math.sin(m.t * 7)) * 3) : 0),
    draw(g, x, y) { g.drawImage(pencilS, x, y); },
    attack(m, api) {
      return toss(m, api, [0, 1, 2, 3].map(() => ({ s: eraserS, spin: false, y: G - 16, vx: -rnd(75, 90), vy: -rnd(5, 25), g: 60, gap: 0.1 })));
    },
  },
  dressed: {
    name: "Pajama Phantom",
    w: 16,
    h: 17,
    hit: ["#6c8cff", "#ffffff", "#d64545"],
    yoff: (m) => -8 + Math.round(Math.sin(m.t * 2.5) * 2),
    draw(g, x, y) { g.drawImage(pjS, x, y); },
    async attack(m, api) {
      m.lift = 1;
      if (!(await api.wait(0.25))) return;
      for (let i = 0; i < 3; i += 1) {
        api.projectiles.push({ k: "letter", L: "Z", x: m.x + 2, y: G - 20 + i * 3, vx: -50, vy: 0, g: 0, ph: i * 2, base: G - 20 + i * 3 });
        if (!(await api.wait(0.2))) return;
      }
      m.lift = 0;
    },
  },
  petbrush: {
    name: "Fur Tumbleweed",
    w: 14,
    h: 12,
    hit: ["#c98a4a", "#e8c08a"],
    yoff: (m) => (m.idle ? -Math.round(Math.abs(Math.sin(m.t * 5)) * 3) : 0),
    draw(g, x, y) { g.drawImage(furS, x, y); },
    attack(m, api) {
      return toss(m, api, [0, 1, 2, 3].map((i) => ({ s: fluffS, y: G - 8 - i * 2, vx: -rnd(55, 70), vy: -rnd(10, 30), g: 30, gap: 0.1 })));
    },
  },
  leaves: {
    name: "Leaf Pile Lurker",
    w: 20,
    h: 12,
    hit: ["#e8862e", "#c8402a", "#f4c542"],
    yoff: (m) => (m.idle ? -(((m.t * 2) | 0) % 2) : 0),
    draw(g, x, y) { g.drawImage(leafPileS, x, y); },
    attack(m, api) {
      return toss(m, api, [0, 1, 2].map((i) => ({ s: leafS[i], y: G - 10, vx: -rnd(60, 75), vy: -rnd(30, 50), g: 60, gap: 0.15 })));
    },
  },
  snow: {
    name: "Sneaky Snowman",
    w: 14,
    h: 19,
    snow: true,
    hit: ["#f4f8ff", "#c8d8ee", "#ffffff"],
    yoff: (m) => (m.idle ? -(((m.t * 2) | 0) % 2) : 0),
    draw(g, x, y, m) { g.drawImage(m.open > 0.5 ? snowB : snowA, x, y); },
    attack(m, api) {
      return toss(m, api, [0, 1, 2].map(() => ({ s: snowballS, spin: false, y: G - 15, vx: -rnd(70, 85), vy: -rnd(35, 60), gap: 0.18 })), { lift: false });
    },
  },
  outside: {
    name: "Couch Monster",
    w: 22,
    h: 14,
    chomp: true,
    hit: ["#c8403a", "#e86a5a", "#ffffff"],
    yoff: (m) => (m.idle ? -(((m.t * 1.5) | 0) % 2) : 0),
    draw(g, x, y, m) { jaw(g, x, y, m, couchTop, couchBot, 9, 4, 14, "#3a0c14", "#ffffff"); },
    attack(m, api) {
      return toss(m, api, [
        { s: cushionS, y: G - 8, vx: -72, vy: -55, gap: 0.2 },
        { s: remoteS, y: G - 8, vx: -80, vy: -40, gap: 0.15 },
        { s: chipS, y: G - 8, vx: -85, vy: -60 },
      ], { lift: false });
    },
  },
  wood: {
    name: "Woodpile Grump",
    w: 22,
    h: 17,
    hit: ["#7a4a26", "#e8c07a", "#b88848"],
    yoff: (m) => (m.idle ? -(((m.t * 2) | 0) % 2) : 0),
    draw(g, x, y, m) { g.drawImage(m.open > 0.5 ? woodB : woodA, x, y); },
    attack(m, api) {
      return toss(m, api, [
        { s: logS, y: G - 14, vx: -72, vy: -50, gap: 0.25 },
        { s: logS, y: G - 14, vx: -82, vy: -35 },
      ]);
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

const SEASON_LOOK = {
  spring: {
    sky: ["#6eb4e8", "#8fcaf0", "#c5e6fa", "#eaf6fc"],
    cloud: ["#ffffff", "#e4f4ff"],
    hill: "#9ec4b0",
    far: "#6eaa86",
    mid: "#458a60",
    leaf: ["#3f9a4a", "#5cbc66", "#7ed67a"],
    bloom: ["#ff9ac8", "#ffe3f0", "#fff8a8"],
    dirt: "#9a6432",
    grass: ["#6ed24a", "#9aee6a", "#4a9a2e"],
    bits: ["#ff8ac6", "#fff3a8", "#9ad8ff"],
    fore: "#3a8a48",
    tip: "#6cc04a",
    shadow: "#4a9a3c",
  },
  summer: {
    sky: ["#4f9fe0", "#6db3ea", "#8fcaf0", "#b5def5"],
    cloud: ["#ffffff", "#d6eefa"],
    hill: "#8fb9c9",
    far: "#5d9886",
    mid: "#356f57",
    leaf: ["#2e7d36", "#3d9a45", "#2e7d36"],
    bloom: ["#6cc04a", "#8ee05a"],
    dirt: "#9a6432",
    grass: ["#5cc23c", "#8ee05a", "#4a9a2e"],
    bits: ["#ff6b6b", "#ffe066"],
    fore: "#2a6e2e",
    tip: "#4fa04a",
    shadow: "#3e8c2c",
  },
  fall: {
    sky: ["#5f8fbe", "#7ea4c8", "#c9a878", "#e8c89a"],
    cloud: ["#fff4e4", "#e8d2b0"],
    hill: "#b89a78",
    far: "#8a7a4e",
    mid: "#6a5230",
    leaf: ["#d45a28", "#e8a030", "#c43c1a", "#8a5020"],
    bloom: ["#f0b040", "#e07030"],
    dirt: "#7a4a28",
    grass: ["#c48a38", "#e0b050", "#8a6028"],
    bits: ["#e07030", "#f0b040", "#c43c1a"],
    fore: "#8a5020",
    tip: "#e8a030",
    shadow: "#8a6028",
  },
  winter: {
    sky: ["#7a96aa", "#9bb0c0", "#c4d2dc", "#e6eef4"],
    cloud: ["#f7fbfe", "#d7e4ee"],
    hill: "#d5e2ea",
    far: "#9aafbc",
    mid: "#7e93a0",
    leaf: ["#eef5f8", "#d7e4ee", "#ffffff"],
    bloom: ["#ffffff", "#e8f2f8"],
    dirt: "#cfdbe4",
    grass: ["#f4f9fc", "#ffffff", "#b7c8d4"],
    bits: ["#ffffff", "#dce8f0"],
    fore: "#9eb2be",
    tip: "#ffffff",
    shadow: "#9eb0bc",
    snow: true,
  },
};

export function currentSeason(at = new Date()) {
  const month = Number(
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", month: "numeric" }).format(at)
  );
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "fall";
  return "winter";
}

function buildScenery(season) {
  const pal = SEASON_LOOK[season] || SEASON_LOOK.summer;
  const rand = mulberry({ spring: 21, summer: 11, fall: 33, winter: 47 }[season] || 11);
  const roll = (a, b) => a + rand() * (b - a);
  const pick = (list) => list[(rand() * list.length) | 0];

  const sky = layer(W, H, (g) => {
    for (let y = 0; y < H; y += 1) {
      const band = Math.min(3, Math.floor(y / 10));
      g.fillStyle = pal.sky[band];
      g.fillRect(0, y, W, 1);
      if (y % 10 === 9 && band < 3) {
        g.fillStyle = pal.sky[band + 1];
        for (let x = y % 2; x < W; x += 2) g.fillRect(x, y, 1, 1);
      }
    }
  });
  const clouds = layer(256, 30, (g, w, h, wrap) => {
    [[20, 8], [90, 14], [150, 6], [210, 12]].forEach(([x, y]) => wrap((o) => {
      disc(g, x + o, y, 4, pal.cloud[0]);
      disc(g, x + o + 5, y - 2, 5, pal.cloud[0]);
      disc(g, x + o + 11, y, 4, pal.cloud[0]);
      rect(g, x + o - 3, y + 3, 18, 2, pal.cloud[1]);
    }));
  });
  const hills = layer(256, H, (g) => {
    g.fillStyle = pal.hill;
    for (let x = 0; x < 256; x += 1) {
      const y = Math.round(30 + 6 * Math.sin((x * Math.PI * 2) / 128) + 4 * Math.sin((x * Math.PI * 2) / 64 + 1));
      g.fillRect(x, y, 1, H - y);
    }
  });
  const farPines = layer(256, H, (g, w, h, wrap) => {
    for (let x = 2; x < 256; x += (roll(6, 10) | 0)) {
      const hh = roll(9, 17) | 0;
      const xx = x | 0;
      wrap((o) => {
        pine(g, xx + o, 51, hh, pal.far);
        if (pal.snow) {
          px(g, xx + o, 51 - hh + 1, "#ffffff");
          px(g, xx + o - 1, 51 - hh + 3, "#ffffff");
          px(g, xx + o + 1, 51 - hh + 4, "#eef5f8");
        }
      });
    }
    rect(g, 0, 51, 256, H, pal.far);
  });
  const midPines = layer(256, H, (g, w, h, wrap) => {
    for (let x = 4; x < 256; x += (roll(10, 15) | 0)) {
      const hh = roll(15, 25) | 0;
      const xx = x | 0;
      wrap((o) => {
        pine(g, xx + o, 55, hh, pal.mid);
        if (pal.snow) {
          px(g, xx + o, 55 - hh + 2, "#ffffff");
          px(g, xx + o - 1, 55 - hh + 5, "#ffffff");
          px(g, xx + o + 1, 55 - hh + 6, "#eef5f8");
        }
      });
    }
    rect(g, 0, 55, 256, H, pal.mid);
  });
  const trees = layer(256, H, (g, w, h, wrap) => {
    [18, 84, 150, 206].forEach((x, i) => wrap((o) => {
      const X = x + o;
      rect(g, X - 2, 10, 6, G - 10, "#6b4426");
      rect(g, X + 2, 10, 2, G - 10, "#4a2e18");
      rect(g, X - 4, G - 2, 10, 2, "#4a2e18");
      if (pal.snow) {
        disc(g, X - 4, 8 + (i % 2) * 2, 4, pal.leaf[0]);
        disc(g, X + 5, 6, 4, pal.leaf[1]);
        disc(g, X, 2, 5, pal.leaf[2] || pal.leaf[0]);
        px(g, X - 1, 10, "#6b4426");
        px(g, X + 2, 14, "#6b4426");
        px(g, X - 3, 18, "#4a2e18");
      } else {
        disc(g, X - 7, 8 + (i % 2) * 3, 9, pal.leaf[0]);
        disc(g, X + 8, 6, 10, pal.leaf[0]);
        disc(g, X, -2, 11, pal.leaf[0]);
        disc(g, X - 8, 6 + (i % 2) * 3, 6, pal.leaf[1]);
        disc(g, X + 7, 3, 7, pal.leaf[1]);
        disc(g, X - 1, -4, 7, pal.leaf[1]);
        const accents = season === "fall" ? pal.leaf : pal.bloom;
        for (let n = 0; n < (season === "spring" ? 10 : 5); n += 1) {
          px(g, X + (roll(-9, 8) | 0), (roll(-6, 8) | 0), pick(accents));
        }
      }
    }));
  });
  const ground = layer(256, H, (g) => {
    rect(g, 0, G, 256, H - G, pal.dirt);
    rect(g, 0, G, 256, 3, pal.grass[0]);
    rect(g, 0, G, 256, 1, pal.grass[1]);
    for (let x = 0; x < 256; x += 1) {
      if (rand() < 0.35) px(g, x, G - 1, pal.grass[0]);
      if (rand() < 0.12) px(g, x, G + 3, pal.grass[2]);
    }
    for (let i = 0; i < 70; i += 1) {
      px(g, roll(0, 256), roll(G + 4, H), pal.snow ? "#b7c8d4" : "#7a4a22");
    }
    for (let i = 0; i < 12; i += 1) {
      const x = roll(0, 250) | 0;
      const y = roll(G + 5, H - 3) | 0;
      if (pal.snow) {
        rect(g, x, y, 3, 2, "#ffffff");
        px(g, x, y + 1, "#d7e4ee");
      } else {
        rect(g, x, y, 3, 2, "#b08a5a");
        px(g, x, y + 1, "#8a6a40");
      }
    }
    for (let i = 0; i < 10; i += 1) {
      const x = roll(0, 256) | 0;
      px(g, x, G - 2, pick(pal.bits));
      px(g, x, G - 1, pal.snow ? "#d7e4ee" : pal.grass[2]);
    }
  });
  const fore = layer(256, 12, (g, w, h, wrap) => {
    [30, 120, 200].forEach((x) => wrap((o) => {
      if (pal.snow) {
        disc(g, x + o, 14, 5, "#ffffff");
        disc(g, x + o + 6, 15, 4, "#eef5f8");
        px(g, x + o + 2, 10, "#ffffff");
      } else {
        disc(g, x + o, 13, 6, pal.fore);
        disc(g, x + o + 7, 14, 5, pal.fore);
        px(g, x + o - 2, 8, pal.tip);
        px(g, x + o + 6, 10, pal.tip);
        if (season === "fall" || season === "spring") {
          px(g, x + o + 1, 9, pick(pal.bits));
          px(g, x + o + 8, 11, pick(pal.bits));
        }
      }
    }));
  });
  return { season, sky, clouds, hills, farPines, midPines, trees, ground, fore, shadow: pal.shadow };
}

let scenery = buildScenery(currentSeason());
let seasonDay = "";

export function applySeasonTheme(at = new Date()) {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto" }).format(at);
  if (day === seasonDay && scenery.season) {
    if (typeof document !== "undefined") document.body.dataset.season = scenery.season;
    return scenery.season;
  }
  seasonDay = day;
  const season = currentSeason(at);
  if (typeof document !== "undefined") document.body.dataset.season = season;
  if (scenery.season !== season) scenery = buildScenery(season);
  return season;
}

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
  Z: "111001010100111",
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

export function drawHeroIcon(target, color) {
  const src = heroFor(color).a;
  const scale = 4;
  target.width = src.width * scale;
  target.height = src.height * scale;
  const g = target.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, target.width, target.height);
  g.drawImage(src, 0, 0, target.width, target.height);
}

export function paintHeroBadge(target, heroKey, weapon, color) {
  const look = heroLook(heroKey, color);
  const src = look.a;
  const padTop = 20;
  const padSide = 28;
  const padBottom = 4;
  const draft = document.createElement("canvas");
  draft.width = src.width + padSide * 2;
  draft.height = src.height + padTop + padBottom;
  const dg = draft.getContext("2d");
  dg.imageSmoothingEnabled = false;
  const ox = padSide;
  dg.drawImage(src, ox, padTop);
  const image = weapon?.image;
  if (image) {
    const q = -55 * (Math.PI / 180);
    dg.save();
    dg.translate(ox + 11, padTop + look.hand);
    dg.rotate(q);
    dg.drawImage(image, -(weapon.grip?.[0] || 0), -(weapon.grip?.[1] || 0));
    dg.restore();
  }

  const pixels = dg.getImageData(0, 0, draft.width, draft.height).data;
  let left = draft.width;
  let top = draft.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < draft.height; y += 1) {
    for (let x = 0; x < draft.width; x += 1) {
      if (pixels[(y * draft.width + x) * 4 + 3] < 8) continue;
      if (x < left) left = x;
      if (y < top) top = y;
      if (x > right) right = x;
      if (y > bottom) bottom = y;
    }
  }
  if (right < left || bottom < top) {
    left = ox;
    top = padTop;
    right = ox + src.width - 1;
    bottom = padTop + src.height - 1;
  }

  const scale = 4;
  const margin = 2 * scale;
  const bodyW = right - left + 1;
  const bodyH = bottom - top + 1;
  target.width = bodyW * scale + margin * 2;
  target.height = bodyH * scale + margin * 2;
  const g = target.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, target.width, target.height);
  g.drawImage(
    draft,
    left,
    top,
    bodyW,
    bodyH,
    margin,
    margin,
    bodyW * scale,
    bodyH * scale
  );
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
const hero = { ox: 0, oxT: 0, kx: 0, jy: 0, vy: 0, pose: "walk", ang: -55, smear: 0, alert: 0, down: false, noWeapon: false };
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
const scene = { waiting: [], plays: [], onDone: null, color: "#3fa34d", paradeKey: "", gear: null, hero: "", lockup: null, hearts: 3, onLockup: null };
let parade = [];
let paradeOn = false;
const copPal = { K, N: "#2a3f8a", S: "#f4c89c", E: K, M: "#6e3418", Y: "#f4c542", B: "#1a1c2c" };
const copTop = [
  "...KKKKKK...", "..KNNNYNNK..", ".KKKKKKKKKK.", "..KSSSSSSSK.", "..KSESSESSK.", "..KMMMMSSSK.", "...KSSSSK...",
  "..KNNNNNNK..", ".KSNNYNNNNSK", ".KSNNNNNNNSK", "..KKKKKKKKK.", "..KNNNKNNNK.",
];
const copA = sprite([...copTop, "..KNNK.KNNK.", "..KBBK.KBBK.", "..KKK..KKK.."], copPal);
const copB = sprite([...copTop, "...KNNKNNK..", "...KBBKBBK..", "...KKKKKK..."], copPal);
let lockBusy = false;
let siren = false;
let cage = null;
let cops = [];
let flyWeapon = null;
let lastLockup = "";

function say(text) {
  const next = text || "";
  if (next === full) return;
  full = next;
  shown = 0;
  if (dialog) dialog.textContent = "";
}
function heroX() {
  if (paradeOn && parade.length) return parade.reduce((max, walker) => Math.max(max, walker.x), 0);
  return 26 + hero.ox + hero.kx;
}
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
    x: W + 6, hp: 3, open: 0, openT: 0, tongue: 0, tongueT: 0, lunge: 0, lungeT: 0, flash: 0, shake: 0,
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
  hero.down = false;
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
async function playFlee(item, token) {
  const ready = await approach(item, token, false);
  if (!ready || token !== runToken || !mon) return;
  const def = mon.def;
  hero.down = false;
  mon.flee = false;
  say(`${def.name} wins this one!`);
  hero.pose = "block";
  hero.alert = 1;
  if (!(await waitFor(0.35, token))) return;
  hero.kx = -12;
  hero.down = true;
  if (!reduce) shake = 0.22;
  burst(heroX() + 10, G - 6, ["#ffffff", "#e04a4a", "#f4c542"], 14, 50);
  say("Knocked down!");
  if (!(await waitFor(0.45, token))) return;
  mon.approach = false;
  mon.idle = false;
  mon.flee = true;
  say(`${def.name} runs away.`);
  if (!(await until(() => !mon || mon.x > W + 16, token))) return;
  mon = null;
  if (!(await waitFor(0.55, token))) return;
  if (token !== runToken) return;
  hero.down = false;
  hero.pose = "walk";
  say("Back on the trail.");
  if (!(await waitFor(0.35, token))) return;
  scene.onDone?.(item.id);
}
async function playBattle(item, token) {
  hero.down = false;
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
function shuffleWalkers(list) {
  const next = list.slice();
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}
function layoutParade() {
  const ordered = shuffleWalkers(parade);
  ordered.forEach((walker, index) => {
    const fromFront = ordered.length - 1 - index;
    walker.tx = 30 - fromFront * 15;
  });
  parade = ordered;
}
function paradeNames() {
  return parade.slice().sort((a, b) => a.tx - b.tx).map((walker) => walker.name);
}
async function runParade() {
  const token = runToken;
  while (paradeOn && token === runToken && parade.length) {
    layoutParade();
    mon = null;
    projectiles.length = 0;
    scrollTarget = reduce ? 0 : 16;
    parade.forEach((walker) => {
      walker.pose = "walk";
      walker.angT = POSE.walk;
    });
    const names = paradeNames();
    say(names.length ? `${names.join(", ")} are on the trail.` : "Walking the forest trail...");
    if (!(await waitFor(reduce ? 0.4 : 2.6, token))) return;
    if (!paradeOn || token !== runToken) return;
    const sprite = SPRITES[Math.floor(Math.random() * SPRITES.length)];
    const def = MON[sprite.id];
    const front = parade.slice().sort((a, b) => a.tx - b.tx).at(-1);
    mon = makeMon(def, { id: `parade-${sprite.id}-${time}`, title: def.name, sprite: sprite.id, points: 0 });
    mon.showHp = false;
    scrollTarget = reduce ? 0 : 22;
    say(front ? `${front.name} meets the ${def.name}.` : `${def.name} is on the trail.`);
    if (!(await until(() => !mon || mon.x <= def.tx + 6, token))) return;
    scrollTarget = 0;
    if (front && mon?.alive) {
      front.pose = "windup";
      front.angT = POSE.windup;
      if (!(await waitFor(0.22, token))) return;
      front.pose = "swing";
      front.angT = POSE.swing;
      mon.flash = 0.2;
      mon.shake = 0.2;
      burst(mon.x + def.w / 2, G - def.h / 2, def.hit, 12, 50);
      if (!(await waitFor(0.28, token))) return;
      front.pose = "block";
      front.angT = POSE.block;
      try {
        await def.attack(mon, apiFor(token));
        if (!(await until(() => projectiles.length === 0, token))) return;
      } catch {
        projectiles.length = 0;
      }
      front.pose = "walk";
      front.angT = POSE.walk;
    }
    if (mon) {
      burst(mon.x + def.w / 2, G - 8, def.hit, 8, 30);
      mon.alive = false;
    }
    if (!(await waitFor(0.35, token))) return;
  }
}
function paintHearts(count) {
  if (!host) return;
  const row = host.querySelector(".quest-hearts");
  if (!row) return;
  const n = Math.max(0, Math.min(3, Number(count) || 0));
  row.dataset.hearts = String(n);
  row.innerHTML = [0, 1, 2].map((i) => `<i class="${i < n ? "on" : "off"}" aria-hidden="true"></i>`).join("");
  row.setAttribute("aria-label", `${n} heart${n === 1 ? "" : "s"} left`);
}

function holdCage() {
  mon = null;
  projectiles.length = 0;
  scroll = 0;
  scrollTarget = 0;
  hero.pose = "idle";
  hero.oxT = 0;
  hero.down = false;
  hero.noWeapon = true;
  hero.alert = 0;
  cage = { y: 0, vy: 0, drop: false, locked: true, lift: false };
  cops = [];
  flyWeapon = null;
  siren = false;
  say("Locked in! Earn coins to break out.");
}

async function playLockup(token) {
  if (lockBusy) return;
  lockBusy = true;
  mon = null;
  projectiles.length = 0;
  hero.down = false;
  hero.noWeapon = false;
  siren = true;
  say("WEE-OOO! The Chore Patrol is on the way!");
  scrollTarget = 0;
  if (!(await waitFor(0.5, token))) { lockBusy = false; return; }
  scroll = 0;
  hero.pose = "idle";
  cops = [{ x: W + 4, vx: -42, flip: false }, { x: W + 20, vx: -42, flip: false }];
  if (!(await until(() => cops[0].x <= heroX() + 19, token))) { lockBusy = false; return; }
  cops.forEach((c) => { c.vx = 0; });
  cops[1].x = cops[0].x + 14;
  hero.alert = 1;
  say("Halt! You're GROUNDED!");
  if (!(await waitFor(1.1, token))) { lockBusy = false; return; }
  const hx = heroX() + 11;
  const hy = heroY() + 10;
  flyWeapon = { x: hx, y: hy, tx: cops[0].x + 1, ty: G - 6, t: 0 };
  hero.noWeapon = true;
  say("The Chore Patrol confiscates your weapon!");
  if (!(await until(() => flyWeapon && flyWeapon.t >= 1, token))) { lockBusy = false; return; }
  cage = { y: -60, vy: 0, drop: true, locked: false, lift: false };
  if (!(await until(() => cage && !cage.drop, token))) { lockBusy = false; return; }
  if (!reduce) shake = 0.3;
  burst(heroX() + 7, G, ["#b4b4c4", "#8890a8", "#ffffff"], 18, 60);
  if (!(await waitFor(0.35, token))) { lockBusy = false; return; }
  cage.locked = true;
  burst(heroX() + 10, G - 5, ["#f4c542", "#ffffff"], 8, 30);
  say("Locked in! Earn coins to break out.");
  if (!(await waitFor(1, token))) { lockBusy = false; return; }
  cops.forEach((c) => { c.vx = 40; c.flip = true; });
  if (!(await until(() => cops.every((c) => c.x > W + 4), token))) { lockBusy = false; return; }
  cops = [];
  flyWeapon = null;
  siren = false;
  lockBusy = false;
  scene.onLockup?.("held");
}

async function playRelease(token) {
  if (lockBusy) return;
  lockBusy = true;
  if (!cage) holdCage();
  say("Chores done! The lock pops open!");
  cage.locked = false;
  particles.push({ x: heroX() + 10, y: G - 5, vx: 30, vy: -70, g: 220, life: 0.9, c: "#f4c542", s: 3 });
  if (!(await waitFor(0.6, token))) { lockBusy = false; return; }
  cage.lift = true;
  if (!(await until(() => !cage || cage.y < -70, token))) { lockBusy = false; return; }
  cage = null;
  hero.noWeapon = false;
  hero.pose = "victory";
  hero.vy = -80;
  burst(heroX() + 7, G - 8, ["#f4c542", "#fff3a8", "#ffffff"], 16, 60);
  say("FREE! Back to the quest!");
  if (!(await waitFor(0.55, token))) { lockBusy = false; return; }
  hero.vy = -80;
  if (!(await waitFor(1, token))) { lockBusy = false; return; }
  hero.pose = "walk";
  scrollTarget = 18;
  lockBusy = false;
  scene.onLockup?.("free");
}

function drawCage() {
  if (!cage) return;
  const hx = Math.round(heroX());
  const x0 = hx - 3;
  const top = G - 21 + Math.round(cage.y);
  for (let x = x0; x <= x0 + 19; x += 3) {
    rect(ctx, x, top, 1, 22, "#c8d0e0");
    rect(ctx, x + 1, top, 1, 22, "#6e7688");
  }
  rect(ctx, x0 - 1, top - 3, 22, 4, K);
  rect(ctx, x0, top - 2, 20, 2, "#55606e");
  rect(ctx, x0 - 1, top + 20, 22, 3, K);
  rect(ctx, x0, top + 21, 20, 1, "#55606e");
  if (cage.locked) {
    const lx = x0 + 8;
    const ly = top + 15;
    rect(ctx, lx, ly - 2, 1, 2, "#8890a8");
    rect(ctx, lx + 3, ly - 2, 1, 2, "#8890a8");
    rect(ctx, lx, ly - 3, 4, 1, "#8890a8");
    rect(ctx, lx - 1, ly, 6, 5, K);
    rect(ctx, lx, ly + 1, 4, 3, "#f4c542");
    px(ctx, lx + 2, ly + 2, K);
  }
}

function drawCops() {
  for (const c of cops) {
    const moving = c.vx !== 0;
    const fr = moving && (time * 8 | 0) % 2 ? copB : copA;
    const x = Math.round(c.x);
    const y = G - 15;
    rect(ctx, x + 2, G, 8, 1, scenery.shadow);
    if (c.flip) {
      ctx.save();
      ctx.translate(x + 12, y);
      ctx.scale(-1, 1);
      ctx.drawImage(fr, 0, 0);
      ctx.restore();
    } else {
      ctx.drawImage(fr, x, y);
    }
    if (siren) {
      const on = (time * 8 | 0) % 2;
      px(ctx, x + 5, y - 1, on ? "#ff4a4a" : "#4a7aff");
      px(ctx, x + 6, y - 1, on ? "#4a7aff" : "#ff4a4a");
    }
  }
  if (flyWeapon) {
    const f = flyWeapon;
    const t = Math.min(1, f.t);
    const c0 = cops[0];
    const tx = c0 ? c0.x + (c0.flip ? 11 : 1) : f.tx;
    const fx = t < 1 ? f.x + (tx - f.x) * t : tx;
    const fy = t < 1 ? f.y + (f.ty - f.y) * t - Math.sin(t * Math.PI) * 14 : G - 6;
    if (scene.gear?.weapon?.image) drawGearWeapon(scene.gear.weapon, fx, fy, t < 1 ? -55 + t * 720 : -150);
    else drawBroom(fx, fy, t < 1 ? -55 + t * 720 : -150);
  }
}

function reconcile() {
  const token = runToken;
  if (scene.lockup === "arrive") {
    playLockup(token);
    return;
  }
  if (scene.lockup === "free") {
    playRelease(token);
    return;
  }
  if (scene.lockup === "held") {
    if (!cage || !cage.locked) holdCage();
    return;
  }
  const play = scene.plays[0];
  if (play) {
    if (play.flee) playFlee(play, token);
    else playBattle(play, token);
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
  host.innerHTML = `<canvas class="quest-canvas" width="128" height="72" aria-label="Forest battle"></canvas><div class="quest-panel"><div class="quest-hearts" aria-label="3 hearts left"><i class="on"></i><i class="on"></i><i class="on"></i></div><div class="quest-dialog" aria-live="polite"></div></div>`;
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
  applySeasonTheme();
  if (Object.prototype.hasOwnProperty.call(next, "hearts")) paintHearts(next.hearts);
  if (Array.isArray(next.parade)) {
    scene.gear = null;
    scene.hero = "";
    scene.lockup = null;
    scene.onLockup = null;
    lastLockup = "";
    cage = null;
    cops = [];
    flyWeapon = null;
    siren = false;
    lockBusy = false;
    hero.noWeapon = false;
    const key = next.parade.map((kid) => `${kid.id}:${kid.hero || "knight"}:${kid.color || ""}:${kid.weaponKey || "broom"}`).sort().join("|");
    if (paradeOn && scene.paradeKey === key) return;
    scene.paradeKey = key;
    scene.waiting = [];
    scene.plays = [];
    scene.onDone = null;
    lastLead = null;
    lastFront = null;
    parade = next.parade.map((kid) => {
      const look = heroLook(kid.hero, kid.color);
      return {
        id: kid.id,
        name: kid.name,
        x: 8,
        tx: 8,
        pose: "walk",
        ang: POSE.walk,
        angT: POSE.walk,
        sprites: look,
        h: look.h,
        hand: look.hand,
        weapon: kid.weapon || null,
      };
    });
    paradeOn = parade.length > 0;
    runToken += 1;
    projectiles.length = 0;
    mon = null;
    if (!paradeOn) {
      goTrail();
      return;
    }
    runParade();
    return;
  }
  if (paradeOn || scene.paradeKey) {
    paradeOn = false;
    parade = [];
    scene.paradeKey = "";
    runToken += 1;
    mon = null;
    projectiles.length = 0;
  }
  scene.gear = next.gear || null;
  scene.hero = next.hero || "";
  scene.onDone = next.onDone;
  scene.onLockup = next.onLockup || null;
  const lockup = next.lockup || null;
  const color = next.color || "#3fa34d";
  const waiting = next.waiting || [];
  const plays = next.plays || [];
  const lead = plays[0] ? `${plays[0].id}:${plays[0].sprite}` : "";
  const front = waiting[0];
  const frontKey = front ? `${front.id}:${front.sprite}:${front.title}` : "";
  scene.waiting = waiting;
  scene.plays = plays;
  if (color !== scene.color) {
    scene.color = color;
    heroSprites = buildHero(color);
  }
  if (lockup) {
    const lockKey = `${lockup}:${next.lockKey || ""}`;
    scene.lockup = lockup;
    if (lockKey === lastLockup && (lockBusy || (lockup === "held" && cage?.locked) || (lockup === "arrive" && cage))) return;
    lastLockup = lockKey;
    runToken += 1;
    projectiles.length = 0;
    if (lockup === "held") {
      holdCage();
      return;
    }
    reconcile();
    return;
  }
  if (scene.lockup || cage || cops.length || hero.noWeapon) {
    scene.lockup = null;
    lastLockup = "";
    cage = null;
    cops = [];
    flyWeapon = null;
    siren = false;
    lockBusy = false;
    hero.noWeapon = false;
  }
  const sameLead = lead === lastLead;
  const sameFront = frontKey === lastFront;
  lastLead = lead;
  lastFront = frontKey;
  if (lead && sameLead && plays[0].flee && mon?.choreId === plays[0].id && mon.alive) return;
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
  root.querySelectorAll("canvas[data-hero]").forEach((icon) => drawHeroIcon(icon, icon.dataset.hero));
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
function drawGearWeapon(weapon, hx, hy, deg) {
  const image = weapon?.image;
  if (!image) {
    drawBroom(hx, hy, deg);
    return;
  }
  const q = Math.round(deg / 15) * 15 * (Math.PI / 180);
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(q);
  ctx.drawImage(image, -(weapon.grip?.[0] || 0), -(weapon.grip?.[1] || 0));
  ctx.restore();
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
  const sx = (m.shake > 0 ? Math.round(Math.sin(m.shake * 80) * 2) : 0) + Math.round(m.lunge || 0);
  const sw = Math.round(d.w * 0.7);
  rect(ctx, m.x + (d.w - sw) / 2 + sx, G, sw, 1, scenery.shadow);
  const dx = Math.round(m.x - 16 + sx);
  const dy = G + 1 - 52;
  if (m.flee) {
    ctx.save();
    ctx.translate(dx + 56, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(mc, 0, 0);
    ctx.restore();
  } else {
    ctx.drawImage(mc, dx, dy);
  }
  if (m.tongue > 0) {
    const tone = m.def.lashCol || ["#ff79a8", "#c8406e"];
    const bx = m.x + (m.def.lashX ?? 10);
    const by = G - (m.def.lashY ?? 4);
    const L = Math.round(m.tongue);
    for (let i = 0; i < L; i += 1) {
      const y = by + Math.round(Math.sin(i * 0.35 - m.t * 14) * Math.min(3, i * 0.15));
      px(ctx, bx - i, y, tone[0]);
      px(ctx, bx - i, y + 1, tone[1]);
    }
    const ty = by + Math.round(Math.sin(L * 0.35 - m.t * 14) * Math.min(3, L * 0.15));
    disc(ctx, bx - L, ty, 1, tone[0]);
    px(ctx, bx - L - 1, ty + 1, tone[1]);
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
  } else if (p.k === "spr" && p.s) {
    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(p.y));
    if (p.spin) ctx.rotate((((time * 12) | 0) % 4) * Math.PI / 2);
    ctx.drawImage(p.s, -(p.s.width >> 1), -(p.s.height >> 1));
    ctx.restore();
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
  if (paradeOn) {
    parade.forEach((walker) => {
      walker.x += (walker.tx - walker.x) * Math.min(1, dt * 5);
      walker.ang += ((walker.angT ?? POSE.walk) - walker.ang) * Math.min(1, dt * 18);
    });
  }
  shake = Math.max(0, shake - dt);
  for (const c of cops) c.x += c.vx * dt;
  if (flyWeapon) flyWeapon.t += dt * 1.6;
  if (cage) {
    if (cage.drop) {
      cage.vy += 420 * dt;
      cage.y += cage.vy * dt;
      if (cage.y >= 0) {
        cage.y = 0;
        cage.drop = false;
      }
    }
    if (cage.lift) cage.y -= 90 * dt;
  }
  if (cage?.locked && !lockBusy && R() < dt * 0.9) {
    particles.push({ x: heroX() + (R() < 0.5 ? 6 : 9), y: heroY() + 6, vx: 0, vy: 10, g: 80, life: 0.5, c: "#7fd0ff" });
  }
  if (mon) {
    mon.t += dt;
    if (mon.approach) mon.x -= scroll * dt;
    if (mon.flee && mon.alive) mon.x += 78 * dt;
    let openTarget = mon.openT;
    if (mon.def.chomp && mon.idle && !mon.approach && mon.alive) openTarget = Math.max(openTarget, Math.sin(mon.t * 5) > 0.55 ? 0.6 : 0);
    mon.open += (openTarget - mon.open) * Math.min(1, dt * 18);
    mon.tongue += (mon.tongueT - mon.tongue) * Math.min(1, dt * 13);
    mon.lunge += (mon.lungeT - mon.lunge) * Math.min(1, dt * 12);
    mon.flash = Math.max(0, mon.flash - dt);
    mon.shake = Math.max(0, mon.shake - dt);
    if (mon.def.snow && R() < dt * 30) {
      particles.push({ x: rnd(0, W + 30), y: -2, vx: -10, vy: rnd(12, 22), g: 0, life: 4.5, c: R() < 0.3 ? "#c8d8ee" : "#ffffff" });
    }
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
  ctx.drawImage(scenery.sky, 0, 0);
  drawLayer(scenery.clouds, worldX * 0.08 + time * 2, 2);
  drawLayer(scenery.hills, worldX * 0.15);
  drawLayer(scenery.farPines, worldX * 0.3);
  drawLayer(scenery.midPines, worldX * 0.5);
  drawLayer(scenery.trees, worldX * 0.7);
  drawLayer(scenery.ground, worldX);
  if (paradeOn && parade.length) {
    const walking = scroll > 2;
    parade.slice().sort((a, b) => a.x - b.x).forEach((walker) => {
      const fr = walking && walker.pose === "walk" && ((time * 8 + walker.x) | 0) % 2;
      const x = Math.round(walker.x);
      const y = Math.round(G - ((walker.h || 16) - 1)) - (fr ? 1 : 0);
      rect(ctx, x + 3, G, 8, 1, scenery.shadow);
      ctx.drawImage(fr ? walker.sprites.b : walker.sprites.a, x, y);
      if (walker.weapon?.image) drawGearWeapon(walker.weapon, x + 11, y + (walker.hand ?? 10), walker.ang);
      else drawBroom(x + 11, y + (walker.hand ?? 10), walker.ang);
    });
  }
  const look = scene.hero ? heroLook(scene.hero, scene.color) : null;
  const x = Math.round(heroX());
  const walking = scroll > 2 && hero.pose === "walk";
  const fr = walking && ((time * 8) | 0) % 2;
  const stand = look?.h || 16;
  const hand = look?.hand ?? 10;
  const y = Math.round(G - (stand - 1) + hero.jy) - (fr ? 1 : 0);
  if (!(paradeOn && parade.length)) {
  rect(ctx, x + 3, G, 8, 1, scenery.shadow);
  if (hero.smear > 0 && !scene.gear?.weapon) {
    for (let a = -160; a <= 35; a += 7) {
      const r = a * (Math.PI / 180);
      px(ctx, x + 11 + Math.cos(r) * 14, y + hand + Math.sin(r) * 14, "#fffbe0");
      px(ctx, x + 11 + Math.cos(r) * 13, y + hand + Math.sin(r) * 13, "#fff3b0");
    }
  }
  const sprites = look || (scene.gear?.frames?.a ? scene.gear.frames : heroSprites);
  if (hero.down) {
    ctx.save();
    ctx.translate(x + 8, y + stand);
    ctx.rotate(-Math.PI / 2);
    ctx.drawImage(sprites.a, -8, -stand);
    ctx.restore();
  } else {
    ctx.drawImage(fr ? sprites.b : sprites.a, x, y);
    if (!hero.noWeapon) {
      if (scene.gear?.weapon?.image) drawGearWeapon(scene.gear.weapon, x + 11, y + hand, hero.ang);
      else drawBroom(x + 11, y + hand, hero.ang);
    }
  }
  if (hero.alert > 0) {
    rect(ctx, x + 4, y - 11, 7, 9, K);
    rect(ctx, x + 5, y - 10, 5, 7, "#ffffff");
    rect(ctx, x + 7, y - 9, 1, 3, "#e04a4a");
    px(ctx, x + 7, y - 5, "#e04a4a");
  }
  if (cage) drawCage();
  drawCops();
  }
  if (mon?.alive) drawMonster(mon);
  projectiles.forEach(drawProj);
  particles.forEach((p) => rect(ctx, p.x, p.y, p.s || 1, p.s || 1, p.c));
  coins.forEach((c) => { if (c.t >= 0) drawCoin(c.x, c.y, time + c.x * 0.05); });
  floats.forEach((f) => text(f.s, Math.round(f.x), Math.round(f.y), "#f4c542"));
  drawLayer(scenery.fore, worldX * 1.3, H - 12);
  if (siren) {
    const on = (time * 6 | 0) % 2;
    rect(ctx, 0, 0, W, 1, on ? "#ff4a4a" : "#4a7aff");
    rect(ctx, 0, H - 1, W, 1, on ? "#4a7aff" : "#ff4a4a");
  }
  ctx.restore();
}
function frame(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}
