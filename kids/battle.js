/* Pixel forest battles. Waiting chores idle on the trail. Approval plays the fight, hit bars, and defeat. */

export const SPRITES = [
  { id: "dust", name: "Dust Bunny" },
  { id: "sleep", name: "Bedtime Beast" },
  { id: "dry", name: "Diaper Monster" },
  { id: "breakfast", name: "Toaster Terror" },
  { id: "dinner", name: "Sizzle Skillet" },
  { id: "lunchmade", name: "Sandwich Snapper" },
  { id: "bath", name: "Bubble Bath Beast" },
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
  if (/sleep|bedtime|went to bed|lights out/.test(text)) return "sleep";
  if (/diaper|dry all night|potty/.test(text)) return "dry";
  if (/breakfast|toast|cereal/.test(text)) return "breakfast";
  if (/dinner|supper|cook/.test(text)) return "dinner";
  if (/bath|bathtub|shower/.test(text)) return "bath";
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
  if (/make lunch|helped make lunch/.test(text)) return "lunchmade";
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
function buildKing(color) {
  const robe = color || "#c0392b";
  const pal = {
    K,
    C: "#f4c542",
    c: "#e04a4a",
    A: "#8a5a2a",
    S: "#f4c89c",
    s: "#d39a6c",
    E: K,
    G: "#dcdce6",
    R: robe,
    Y: "#f4c542",
    W: "#ffffff",
    B: "#5a3418",
  };
  return {
    h: 20,
    hand: 13,
    a: sprite([...kingTop, ".KWKWKWKWKWWK.", "..KBBK..KBBK.."], pal),
    b: sprite([...kingTop, ".KWWKWKWKWKWK.", "...KBBKKBBK..."], pal),
  };
}
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
function buildQueen(color) {
  const dress = color || "#7a3fb0";
  const pal = {
    K,
    C: "#f4c542",
    c: "#7fe0ff",
    A: "#3a2418",
    S: "#f4c89c",
    E: K,
    R: "#d64545",
    Y: "#f4c542",
    P: dress,
    p: shade(dress, 0.72),
  };
  return {
    h: 20,
    hand: 13,
    a: sprite([...queenTop, ".KPPpPPpPPpPK.", ".KPpPPpPPpPPK.", "KYYYYYYYYYYYYK"], pal),
    b: sprite([...queenTop, "..KPpPPpPPpPK.", ".KPPpPPpPPpPPK", "KYYYYYYYYYYYYK"], pal),
  };
}
const lookCache = new Map();
function heroLook(key, color) {
  const kind = key || "knight";
  const tint = color || (kind === "princess" ? "#ff8ac6" : kind === "queen" ? "#7a3fb0" : kind === "king" ? "#c0392b" : "#3fa34d");
  const cacheKey = `${kind}:${tint}`;
  if (lookCache.has(cacheKey)) return lookCache.get(cacheKey);
  let look;
  if (kind === "princess") look = buildPrincess(tint);
  else if (kind === "king") look = buildKing(tint);
  else if (kind === "queen") look = buildQueen(tint);
  else look = { h: 16, hand: 10, ...buildHero(tint) };
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
const bathPal={K,W:'#f6a8c0',w:'#d47a98',F:'#f4faff',f:'#b8d8f0',E:K,I:'#ffffff',D:'#3a2a4a',G:'#f4c542'};
const foamTop=["......KKKK.KKK......","....KKFFFFKFFFKK....","..KKFFFFFFFFFFFFKK..",".KFFFEEFFFFEEFFFFK..",".KFFFEIFFFFEIFFfFFK."];
const tubRows=["KKKKKKKKKKKKKKKKKKKK","KWWWWWWWWWWWWWWWWWwK",".KWWWWWWWWWWWWWWWwK.",".KWWWWWWWWWWWWWWwwK.","..KWWWWWWWWWWWWwwK..","...KKKKKKKKKKKKKK...","...KG.........KG....","..KGG........KGG...."];
const bathA=sprite([...foamTop,"KFFfFFFFKKKFFFFFFFFK","KFFFFFFFFFFFFFfFFFFK",...tubRows],bathPal);
const bathB=sprite([...foamTop,"KFFfFFFKDDDKFFFFFFFK","KFFFFFFFKKKFFFFfFFFK",...tubRows],bathPal);
const duckS=sprite(["..KK..",".KYEK.","OOYYYK",".KYYYK","..KKK."],{K,Y:'#f4d742',E:K,O:'#f4862e'});
const bedPal={K,N:'#4a7ad8',n:'#7fa8f0',W:'#ffffff',w:'#c8d0e0',E:K,B:'#9a6232',b:'#6a4220'};
const bedTop=sprite([
"..........KKKKKK...",
".KKKKKKKKKWWWWWWK..",
"KnNnNnNnNKEWWEWWK..",
"KNnNnNnNnKWWWWWWK..",
"KnNnNnNnNnNnNnNnNK.",
"KNnNnNnNnNnNnNnNnK.",
"KKKKKKKKKKKKKKKKKK."],bedPal);
const bedBot=sprite([
"KWWWWWWWWWWWWWWWWK.",
"KwwwwwwwwwwwwwwwwK.",
"KKKKKKKKKKKKKKKKKK.",
"KBBBBBBBBBBBBBBBBK.",
"KKKKKKKKKKKKKKKKKK.",
"KK.............KK.."],bedPal);
const headboard=sprite([".KKKK.","KBBBBK","KBbbBK","KBBBBK","KBbbBK","KBBBBK","KBbbBK","KBBBBK","KBBBBK","KBBBBK","KBBBBK","KBBBBK","KBBBBK","KKKKKK","KBKKBK","KK..KK"],bedPal);
const teddyS=sprite([".K.K.","KBBBK","KEBEK","KBBBK",".KKK."],{K,B:'#a0622a',E:K});
const diaPal={K,W:'#ffffff',w:'#d6e2f2',B:'#7fb4f0',E:K,P:'#ffb0c4',D:'#3a2a4a',b:'#a8ccf6'};
const diaTop=["KKKKKKKKKKKKKKKK","KBWWWWWWWWWWWWBK","KBBWWWWWWWWWWBBK",".KWWWEWWWWEWWWK.",".KWWWWWWWWWWWWK."];
const diaLow=["..KWbWWbWWbWWK..","..KwWWWWWWWWwK..","...KwWbWWbWwK...","....KwWWWWwK....",".....KwwwwK.....","......KKKK......"];
const diaA=sprite([...diaTop,".KWPWWWKKWWWPWK.",...diaLow],diaPal);
const diaB=sprite([...diaTop,".KWPWWKDDKWWPWK.",...diaLow],diaPal);
const dropS=sprite(["..K..",".KBK.","KBBBK","KBWBK",".KKK."],{K,B:'#4aa3ff',W:'#ffffff'});
const powderS=sprite([".WW.","WWWW",".WW."],{W:'#fff8f0'});
const toastPal={K,S:'#d8dee8',s:'#9aa4b6',H:'#ffffff',W:'#ffffff',E:K,D:'#3a3a48'};
const toastTop=["..KKKKKKKKKKKKKK..",".KSDDDDSSDDDDSSSK.","KSSSSSSSSSSSSSSSsK","KSHHSSSSSSSSSSSSsK","KSWWSSSSWWSSSSSSsK","KSEWSSSSEWSSSSSSsK","KSSSSSSSSSSSSSSSsK"];
const toastLow=["KSSSSSSSSSSSSSSSsK","KsSSSSSSSSSSSSSssK","KssssssssssssssssK",".KKKKKKKKKKKKKKKK.",".KK............KK."];
const toasterA=sprite([...toastTop,"KSSSKKKKKKSSSSSSsK",...toastLow],toastPal);
const toasterB=sprite([...toastTop,"KSSSKDDDDKSSSSSSsK",...toastLow],toastPal);
const toastS=sprite([".KKKKK.","KCCCCCK","KCtttCK","KCtttCK","KCtttCK","KCCCCCK",".KKKKK."],{K,C:'#b07840',t:'#f0d090'});
function makePan(open){const[c,g]=canvas(24,13);
  const ell=(rx,ry,col)=>{for(let dy=-Math.ceil(ry);dy<=Math.ceil(ry);dy++){const t=1-(dy*dy)/(ry*ry);if(t<0)continue;const hw=Math.floor(rx*Math.sqrt(t));rect(g,9-hw,6+dy,hw*2+1,1,col)}};
  rect(g,17,5,7,3,K);rect(g,18,6,5,1,'#8a5a2a');px(g,22,6,'#5a3418');
  ell(9.4,5.6,K);ell(8.4,4.6,'#6e7688');ell(7.4,3.6,'#2a2a38');
  for(const ex of [3,10]){rect(g,ex,4,5,3,'#ffffff');px(g,ex,4,'#2a2a38');px(g,ex+4,6,'#2a2a38');rect(g,ex,5,2,1,'#f4c542');px(g,ex,5,'#e8862e')}
  if(open){rect(g,6,8,6,2,'#8a2a26');px(g,7,8,'#ffffff');px(g,10,8,'#ffffff')}else rect(g,6,8,6,1,'#55606e');
  rect(g,4,12,10,1,'#3e8c2c');return c}
const panA=makePan(false),panB=makePan(true);
const sausageS=sprite([".KKKK.","KBBbBK",".KKKK."],{K,B:'#b0583a',b:'#e08a6a'});
const peaS=sprite(["GG","Gg"],{G:'#5cc96a',g:'#3a8f4a'});
const sandPal={K,B:'#e0a858',b:'#b07838',W:'#fff8e0',E:K,L:'#5cc96a',l:'#3a8f4a',R:'#e04a4a',Y:'#f4d742',M:'#e08a8a'};
const sandTop=sprite(["....KKKKKKKKKK....","..KKBBBWBBBBWBKK..",".KBBWBBBBBBBBBBBK.","KBBBEWBBBBEWBBBBbK","KBBBBBBBBBBBBBBBbK","KbbbbbbbbbbbbbbbbK"],sandPal);
const sandBot=sprite(["KLlLLlLLlLLlLLlLLK","KRRRRRRRRRRRRRRRRK","KYYYYYYYYYYYYYYYYK","KMMMMMMMMMMMMMMMMK","KBBBBBBBBBBBBBBBBK","KbbbbbbbbbbbbbbbbK",".KKKKKKKKKKKKKKKK."],sandPal);
const pickleS=sprite([".KKK.","KGgGK","KgGgK",".KKK."],{K,G:'#5cc96a',g:'#3a8f4a'});
const tomatoS=sprite([".KKK.","KRrRK","KrRrK",".KKK."],{K,R:'#e04a4a',r:'#ff9a8a'});

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
  sleep: {
    name: "Bedtime Beast",
    w: 24,
    h: 16,
    chomp: true,
    hit: ["#4a7ad8", "#7fa8f0", "#ffffff"],
    yoff: (m) => (m.idle ? -(((m.t * 1.5) | 0) % 2) : 0),
    draw(g, x, y, m) {
      jaw(g, x, y + 3, m, bedTop, bedBot, 7, 1, 16, "#3a0c14", "#ffffff");
      g.drawImage(headboard, x + 18, y);
    },
    attack(m, api) {
      return toss(m, api, [
        { k: "pillow", y: G - 10, vx: -75, vy: -50, gap: 0.22 },
        { s: teddyS, y: G - 10, vx: -80, vy: -40, gap: 0.2 },
        { k: "pillow", y: G - 10, vx: -85, vy: -60 },
      ], { lift: false });
    },
  },
  dry: {
    name: "Diaper Monster",
    w: 16,
    h: 12,
    headroom: 11,
    hpLift: 11,
    drizzle: true,
    hit: ["#ffffff", "#7fb4f0", "#ffb0c4"],
    yoff: (m) => (m.idle ? -Math.round(Math.abs(Math.sin(m.t * 6)) * 2) : 0),
    draw(g, x, y, m) {
      const cy = y - 8 + (((m.t * 2) | 0) % 2);
      disc(g, x + 6, cy, 3, K);
      disc(g, x + 10, cy - 1, 3, K);
      rect(g, x + 3, cy, 11, 3, K);
      disc(g, x + 6, cy, 2, "#9aa4b6");
      disc(g, x + 10, cy - 1, 2, "#9aa4b6");
      rect(g, x + 4, cy, 9, 2, "#9aa4b6");
      px(g, x + 9, cy - 2, "#c8d0e0");
      g.drawImage(m.open > 0.5 ? diaB : diaA, x, y);
    },
    attack(m, api) {
      return toss(m, api, [
        { s: dropS, spin: false, y: G - 14, vx: -70, vy: -35, gap: 0.15 },
        { s: powderS, spin: false, y: G - 8, vx: -60, vy: -20, g: 40, gap: 0.15 },
        { s: dropS, spin: false, y: G - 14, vx: -82, vy: -50 },
      ], { lift: false });
    },
  },
  breakfast: {
    name: "Toaster Terror",
    w: 20,
    h: 14,
    headroom: 4,
    hpLift: 4,
    hit: ["#d8dee8", "#f0d090", "#b07840"],
    yoff: (m) => (m.idle ? -(((m.t * 3) | 0) % 2) : 0),
    draw(g, x, y, m) {
      const pop = Math.round(m.open * 4);
      for (const c of [3, 9]) {
        rect(g, x + c, y - 2 - pop, 5, 4, K);
        rect(g, x + c + 1, y - 1 - pop, 3, 3, "#b07840");
        rect(g, x + c + 2, y - pop, 1, 2, "#f0d090");
      }
      g.drawImage(m.open > 0.5 ? toasterB : toasterA, x, y + 1);
      rect(g, x + 18, y + 5, 1, 4, K);
      rect(g, x + 18, y + 4 - (m.open > 0.5 ? 0 : -2), 2, 2, "#e04a4a");
      px(g, x + 19, y + 4 - (m.open > 0.5 ? 0 : -2), K);
    },
    async attack(m, api) {
      m.openT = 1;
      if (!(await api.wait(0.2))) return;
      for (let i = 0; i < 6; i += 1) {
        api.particles.push({
          x: m.x + 5 + (i % 2) * 6, y: G - 15, vx: rnd(-6, 6), vy: -rnd(12, 22),
          g: -8, life: 0.8, c: R() < 0.5 ? "#9aa4b6" : "#c8d0e0", s: 2,
        });
      }
      for (let i = 0; i < 2; i += 1) {
        api.projectiles.push({
          k: "spr", s: toastS, x: m.x + 5 + i * 6, y: G - 16,
          vx: -rnd(62, 72), vy: -rnd(70, 85), g: 170, spin: true,
        });
        if (!(await api.wait(0.18))) return;
      }
      m.openT = 0;
    },
  },
  dinner: {
    name: "Sizzle Skillet",
    w: 24,
    h: 13,
    sizzle: true,
    hit: ["#6e7688", "#f4c542", "#ffffff"],
    yoff: (m) => (m.idle ? -(((m.t * 4) | 0) % 2) : 0),
    draw(g, x, y, m) { g.drawImage(m.open > 0.5 ? panB : panA, x, y); },
    async attack(m, api) {
      m.openT = 1;
      m.lift = 1;
      if (!(await api.wait(0.22))) return;
      for (let i = 0; i < 8; i += 1) {
        api.particles.push({
          x: m.x + rnd(3, 15), y: G - 8, vx: rnd(-30, 30), vy: -rnd(30, 60),
          g: 160, life: 0.4, c: "#f4e08a",
        });
      }
      for (const p of [
        { s: sausageS, vx: -70, vy: -75 },
        { s: peaS, vx: -80, vy: -55 },
        { s: sausageS, vx: -78, vy: -90 },
        { s: peaS, vx: -86, vy: -45 },
      ]) {
        api.projectiles.push({ k: "spr", x: m.x + 8, y: G - 10, g: 170, spin: p.s === sausageS, ...p });
        if (!(await api.wait(0.12))) return;
      }
      m.lift = 0;
      m.openT = 0;
    },
  },
  lunchmade: {
    name: "Sandwich Snapper",
    w: 18,
    h: 13,
    chomp: true,
    headroom: 6,
    hpLift: 6,
    hit: ["#e0a858", "#5cc96a", "#e04a4a", "#f4d742"],
    yoff: (m) => (m.idle ? -(((m.t * 2) | 0) % 2) : 0),
    draw(g, x, y, m) {
      const o = Math.round(m.open * 4);
      rect(g, x + 9, y - 4 - o, 1, 4, "#e8c07a");
      disc(g, x + 9, y - 5 - o, 1, "#3a8f4a");
      px(g, x + 9, y - 5 - o, "#e04a4a");
      jaw(g, x, y, m, sandTop, sandBot, 6, 1, 16, "#3a0c14", "#ffffff");
      px(g, x + 5, y + 9, "#f4d742");
      rect(g, x + 12, y + 9, 1, 2, "#f4d742");
    },
    attack(m, api) {
      return toss(m, api, [
        { s: pickleS, y: G - 8, vx: -72, vy: -45, gap: 0.13 },
        { s: tomatoS, y: G - 8, vx: -80, vy: -60, gap: 0.13 },
        { s: pickleS, y: G - 8, vx: -86, vy: -35 },
      ], { lift: false });
    },
  },
  bath: {
    name: "Bubble Bath Beast",
    w: 20,
    h: 15,
    hpLift: 12,
    headroom: 14,
    shower: true,
    bubbly: true,
    hit: ["#e6f4ff", "#bfefff", "#f4d742", "#ffffff"],
    yoff: (m) => (m.idle ? -(((m.t * 2) | 0) % 2) : 0),
    draw(g, x, y, m) {
      const P = "#d8dee8";
      const p = "#9aa4b6";
      rect(g, x + 17, y - 14, 4, 22, K);
      rect(g, x + 11, y - 14, 10, 4, K);
      rect(g, x + 18, y - 13, 2, 21, P);
      rect(g, x + 12, y - 13, 7, 2, P);
      rect(g, x + 19, y - 13, 1, 21, p);
      px(g, x + 18, y - 13, "#ffffff");
      rect(g, x + 16, y + 4, 6, 3, K);
      rect(g, x + 17, y + 5, 4, 1, "#f4c542");
      rect(g, x + 8, y - 11, 7, 4, K);
      rect(g, x + 9, y - 11, 5, 2, P);
      rect(g, x + 9, y - 9, 5, 1, p);
      for (const c of [9, 11, 13]) px(g, x + c, y - 8, "#55606e");
      g.drawImage(m.open > 0.5 ? bathB : bathA, x, y);
      g.drawImage(duckS, x + 11, y - 4 + (((m.t * 3) | 0) % 2));
    },
    async attack(m, api) {
      m.openT = 1;
      if (!(await api.wait(0.25))) return;
      api.projectiles.push({ k: "spr", s: duckS, x: m.x + 6, y: G - 14, vx: -75, vy: -55, g: 150, spin: false });
      if (!(await api.wait(0.2))) return;
      for (let i = 0; i < 2; i += 1) {
        api.projectiles.push({ k: "bubble", x: m.x + 4, y: G - 9, vx: -50, vy: 0, g: 0, ph: i * 2, base: G - 9 - i * 4 });
        if (!(await api.wait(0.2))) return;
      }
      api.projectiles.push({ k: "spr", s: duckS, x: m.x + 6, y: G - 14, vx: -82, vy: -40, g: 150, spin: false });
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

const featherS = sprite(["...F", "..Ff", ".Ff.", "F..."], { F: "#ff8ac6", f: "#c46cd9" });
const flowerS = sprite([".P.", "PYP", ".P.", ".G."], { P: "#ff8ac6", Y: "#f4d742", G: "#3a9d4a" });
const starS = sprite(["..Y..", ".YYY.", "YYYYY", ".Y.Y."], { Y: "#f4d742" });
const pageS = sprite(["KKKK", "KWWK", "KwwK", "KWWK", "KKKK"], { K, W: "#fff8e6", w: "#b8b0a0" });
const sprOf = (k) => ({ feather: featherS, flower: flowerS, star: starS, page: pageS, snowball: snowballS, log: logS, duck: duckS, crumb: crumbS, leaf: leafS[0] })[k];
const RAINBOW = ["#e04a4a", "#f4862e", "#f4c542", "#5cc96a", "#4aa3ff", "#9b6ad6"];
const SPECIALS={
 broom:{name:'Dust Tornado',fx:'swirl',cols:['#e8d07a','#c9a84e','#b4b4c4']},
 duster:{name:'Feather Storm',fx:'rain',spr:'feather',n:14},
 dustpan:{name:'Dust Devil',fx:'swirl',cols:['#b4b4c4','#8890a8','#e8603c']},
 mop:{name:'Tidal Splash',fx:'wave',cols:['#4aa3ff','#bfe3ff','#ffffff']},
 sponge:{name:'Soap Bomb',fx:'bubble',cols:['#f4d742','#bfefff']},
 squeegee:{name:'Sparkle Shine',fx:'flash',spr:'star'},
 spray:{name:'Mist Cloud',fx:'burst',cols:['#bfefff','#ffffff','#e6f8ff'],n:36,speed:30},
 vacuum:{name:'Black Hole Suck',fx:'suck',cols:['#7fe0ff','#ffffff','#b4b4c4']},
 plunger:{name:'Mega Plunge',fx:'ring',cols:['#d64545','#ffffff']},
 golden:{name:'Rainbow Burst',fx:'ring',cols:'rainbow'},
 diamond:{name:'Crystal Storm',fx:'burst',spr:'star',cols:['#9ff0ff','#ffffff'],n:16,ring:['#9ff0ff','#ffffff']},
 toothbrush:{name:'Minty Fresh Blast',fx:'bubble',cols:['#bfefff','#ffffff']},
 spatula:{name:'Pancake Flip',fx:'flip'},
 bubble:{name:'Mega Bubble',fx:'bubble',cols:['#9fe8ff','#c39bd3']},
 rake:{name:'Leaf Storm',fx:'swirl',cols:['#e8862e','#c8402a','#f4c542']},
 pencil:{name:'Scribble Storm',fx:'scribble'},
 lint:{name:'Fluff Cyclone',fx:'swirl',cols:['#e8c08a','#9b6ad6','#ffffff']},
 watering:{name:'Flower Power',fx:'bloom'},
 bookmark:{name:'Page Storm',fx:'rain',spr:'page',n:10},
 bone:{name:'Dizzy Stars',fx:'orbit'},
 shovel:{name:'Snowball Avalanche',fx:'rain',spr:'snowball',n:10},
 bat:{name:'Home Run',fx:'flip',homerun:true},
 mallet:{name:'Timber!',fx:'rain',spr:'log',n:8},
 duckhammer:{name:'Duck Parade',fx:'rain',spr:'duck',n:10},
 pillowmace:{name:'Pillow Fight',fx:'burst',spr:'feather',n:18,speed:60},
 rattle:{name:'Confetti Party',fx:'burst',cols:'rainbow',n:44,speed:90},
 butterknife:{name:'Butter Slide',fx:'wave',cols:['#f4e08a','#fff7c0','#ffffff']},
 whisk:{name:'Whirlwind Whip',fx:'swirl',cols:['#ffffff','#e6ecf5','#fff8e6']},
 baguette:{name:'Breadcrumb Storm',fx:'rain',spr:'crumb',n:20}
};
const effects = [];
let beamT = 0;
function weaponTipFromGear(w, hx, hy, deg) {
  const grip = w.grip || [2, 2];
  const len = (w.mapLen || 14) - grip[0];
  const q = Math.round(deg / 15) * 15 * Math.PI / 180;
  return [hx + Math.cos(q) * len, hy + Math.sin(q) * len];
}
function special(wk, cx, cy) {
  const sp = SPECIALS[wk] || { name: "Power Strike", fx: "burst", cols: (scene.gear?.weapon?.fx) || ["#ffffff"] };
  const cols = sp.cols === "rainbow" ? RAINBOW : (sp.cols || ["#ffffff"]);
  say(`SPECIAL ATTACK: ${sp.name.toUpperCase()}!`);
  if (!reduce) shake = 0.35;
  effects.push({ type: "flash", t: 0, dur: 0.12 });
  const P = (o) => particles.push(o);
  switch (sp.fx) {
    case "swirl": effects.push({ type: "swirl", t: 0, dur: 1.1, cx, cy, cols }); break;
    case "rain":
      for (let i = 0; i < (sp.n || 10); i += 1) P({ x: cx + rnd(-24, 22), y: -rnd(4, 46), vx: rnd(-6, 6), vy: rnd(45, 75), g: 70, life: 1.8, spr: sprOf(sp.spr) });
      break;
    case "wave": effects.push({ type: "wave", t: 0, dur: 0.8, cols }); break;
    case "flash":
      effects.push({ type: "flash", t: 0, dur: 0.35 });
      for (let i = 0; i < 8; i += 1) { const a = i / 8 * Math.PI * 2; P({ x: cx, y: cy, vx: Math.cos(a) * 55, vy: Math.sin(a) * 55, g: 0, life: 0.6, spr: starS }); }
      break;
    case "suck": effects.push({ type: "suck", t: 0, dur: 0.9, cx, cy, cols }); break;
    case "ring": effects.push({ type: "ring", t: 0, dur: 0.7, cx, cy, cols }); break;
    case "burst":
      for (let i = 0; i < (sp.n || 20); i += 1) {
        const a = R() * Math.PI * 2, v = rnd(20, sp.speed || 70);
        P({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, g: sp.spr ? 40 : 110, life: rnd(0.6, 1.1), spr: sp.spr ? sprOf(sp.spr) : null, c: cols[i % cols.length] });
      }
      if (sp.ring) effects.push({ type: "ring", t: 0, dur: 0.6, cx, cy, cols: sp.ring });
      break;
    case "bubble": effects.push({ type: "bubble", t: 0, dur: 0.9, cx, cy, cols }); break;
    case "flip":
      if (mon) { mon.hopV = sp.homerun ? -150 : -110; mon.spinT = 0.6; }
      for (let i = 0; i < 6; i += 1) { const a = R() * Math.PI * 2; P({ x: cx, y: cy, vx: Math.cos(a) * 50, vy: Math.sin(a) * 50, g: 0, life: 0.5, spr: starS }); }
      if (sp.homerun) P({ x: cx, y: cy, vx: 90, vy: -110, g: 60, life: 1.2, spr: starS });
      break;
    case "scribble": effects.push({ type: "scribble", t: 0, dur: 0.9, cx, cy }); break;
    case "bloom":
      for (let i = 0; i < 9; i += 1) P({ x: cx + rnd(-26, 22), y: G - 3, vx: 0, vy: -rnd(30, 60), g: 140, life: 1.4, spr: flowerS });
      for (let i = 0; i < 12; i += 1) { const a = R() * Math.PI * 2; P({ x: cx, y: cy, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40, g: 60, life: 0.6, c: ["#ff8ac6", "#f4d742", "#5cc96a"][i % 3] }); }
      break;
    case "orbit": effects.push({ type: "orbit", t: 0, dur: 1.4, cx, cy }); break;
  }
}
function updateEffects(dt) {
  for (let i = effects.length - 1; i >= 0; i -= 1) {
    const e = effects[i];
    e.t += dt;
    if (e.type === "suck" && mon) {
      const tip = scene.gear?.weapon
        ? weaponTipFromGear(scene.gear.weapon, heroX() + 11, heroY() + (heroLook(scene.hero, scene.color)?.hand || 10), hero.ang)
        : [heroX() + 25, heroY() + 10];
      const [tx, ty] = tip;
      for (let k = 0; k < 3; k += 1) {
        const a = R() * Math.PI * 2, r = rnd(10, 20), x = e.cx + Math.cos(a) * r, y = e.cy + Math.sin(a) * r;
        particles.push({ x, y, vx: (tx - x) / 0.35, vy: (ty - y) / 0.35, g: 0, life: 0.35, c: e.cols[k % e.cols.length] });
      }
    }
    if (e.type === "bubble" && e.t >= e.dur) {
      for (let k = 0; k < 20; k += 1) {
        const a = k / 20 * Math.PI * 2;
        particles.push({ x: e.cx + Math.cos(a) * 14, y: e.cy + Math.sin(a) * 12, vx: Math.cos(a) * 50, vy: Math.sin(a) * 50, g: 60, life: 0.4, c: e.cols[k % e.cols.length] });
      }
    }
    if (e.t >= e.dur) effects.splice(i, 1);
  }
}
function drawEffects() {
  for (const e of effects) {
    const p = e.t / e.dur;
    if (e.type === "swirl") {
      for (let k = 0; k < 48; k += 1) {
        const f = k / 48, a = f * Math.PI * 5 + e.t * 12, r = (3 + f * 16) * (1 - p * 0.4), z = k % 2 ? 1 : 2;
        rect(ctx, e.cx + Math.cos(a) * r, e.cy + 10 - f * 30, z, z, e.cols[k % e.cols.length]);
        if (k % 4 === 0) px(ctx, e.cx + Math.cos(a + 0.3) * r, e.cy + 10 - f * 30, K);
      }
    }
    if (e.type === "wave") {
      const front = -12 + p * (W + 30);
      for (let x = Math.max(0, front - 40); x < Math.min(W, front); x += 1) {
        const h = Math.round(Math.sin((x - front + 40) / 40 * Math.PI) * 7);
        if (h <= 0) continue;
        rect(ctx, x, G - h, 1, h, e.cols[0]); px(ctx, x, G - h, e.cols[2]);
        if ((x + ((time * 20) | 0)) % 5 === 0) px(ctx, x, G - h - 1, e.cols[1]);
      }
    }
    if (e.type === "ring") {
      const r = 4 + p * 42;
      for (let k = 0; k < 48; k += 1) {
        const a = k / 48 * Math.PI * 2;
        px(ctx, e.cx + Math.cos(a) * r, e.cy + Math.sin(a) * r * 0.8, e.cols[k % e.cols.length]);
        px(ctx, e.cx + Math.cos(a) * (r - 2), e.cy + Math.sin(a) * (r - 2) * 0.8, e.cols[(k + 1) % e.cols.length]);
      }
    }
    if (e.type === "flash") {
      ctx.fillStyle = `rgba(255,255,255,${0.45 * (1 - p)})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (e.type === "bubble") {
      const r = 6 + p * 18;
      for (let k = 0; k < 24; k += 1) {
        const a = k / 24 * Math.PI * 2;
        px(ctx, e.cx + Math.cos(a) * r, e.cy + Math.sin(a) * r * 0.85, e.cols[k % e.cols.length]);
      }
      px(ctx, e.cx - r * 0.3, e.cy - r * 0.4, "#ffffff");
    }
    if (e.type === "scribble") {
      for (let k = 0; k < 30; k += 1) {
        const a = e.t * 10 + k * 0.7;
        px(ctx, e.cx + Math.cos(a) * (8 + (k % 5) * 2), e.cy + Math.sin(a * 1.3) * (6 + (k % 4)), k % 2 ? "#3a3a48" : "#f4c542");
      }
    }
    if (e.type === "orbit") {
      for (let k = 0; k < 8; k += 1) {
        const a = e.t * 8 + k * (Math.PI * 2 / 8);
        const rr = 12 + Math.sin(e.t * 6 + k) * 2;
        ctx.drawImage(starS, Math.round(e.cx + Math.cos(a) * rr - 2), Math.round(e.cy + Math.sin(a) * rr * 0.7 - 2));
      }
    }
  }
}

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

const SKY_LOOK = {
  morning: {
    sky: ["#6a98d0", "#f0a070", "#ffc090", "#ffe8c8"],
    cloud: ["#fff2e4", "#ffd0b0"],
    sun: { x: 24, y: 40, r: 8, core: "#ffe566", glow: "#ff9a4a" },
  },
  day: {
    sky: null,
    cloud: null,
    sun: { x: 100, y: 14, r: 7, core: "#fff6b0", glow: "#ffe066" },
  },
  evening: {
    sky: ["#3a4588", "#c86058", "#e89048", "#ffc878"],
    cloud: ["#ffd0b8", "#e89888"],
    sun: { x: 108, y: 42, r: 9, core: "#ffb040", glow: "#ff6a40" },
  },
  night: {
    sky: ["#10141f", "#171f33", "#1f2a44", "#2a3654"],
    cloud: ["#3a4868", "#2a354c"],
    moon: { x: 102, y: 16, r: 7 },
    stars: true,
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

export function currentSkyPeriod(at = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Toronto",
      hour: "numeric",
      hourCycle: "h23",
    })
      .formatToParts(at)
      .find((part) => part.type === "hour")?.value || 12
  );
  if (hour >= 5 && hour < 10) return "morning";
  if (hour >= 10 && hour < 17) return "day";
  if (hour >= 17 && hour < 20) return "evening";
  return "night";
}

function mixHex(hex, toward, amount) {
  const read = (value) => [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));
  const a = read(hex);
  const b = read(toward);
  return `#${a
    .map((v, i) => Math.round(v + (b[i] - v) * amount).toString(16).padStart(2, "0"))
    .join("")}`;
}

function paintSun(g, sun) {
  disc(g, sun.x, sun.y, sun.r + 3, sun.glow);
  disc(g, sun.x, sun.y, sun.r, sun.core);
  disc(g, sun.x - 1, sun.y - 1, Math.max(2, sun.r - 3), "#fffdf0");
}

function paintMoon(g, moon) {
  disc(g, moon.x, moon.y, moon.r + 1, "#dce7f4");
  disc(g, moon.x, moon.y, moon.r, "#f4f8fc");
  disc(g, moon.x + 2, moon.y - 1, moon.r - 1, "#171f33");
  px(g, moon.x - 2, moon.y + 1, "#d0dbe8");
  px(g, moon.x - 1, moon.y + 3, "#c4d0de");
}

function buildScenery(season, skyPeriod = "day") {
  const base = SEASON_LOOK[season] || SEASON_LOOK.summer;
  const skyPal = SKY_LOOK[skyPeriod] || SKY_LOOK.day;
  const night = skyPeriod === "night";
  const dusk = skyPeriod === "evening" || skyPeriod === "morning";
  const shade = night ? 0.48 : dusk ? 0.18 : 0;
  const nightTone = "#10141f";
  const pal = {
    ...base,
    sky: skyPal.sky || base.sky,
    cloud: skyPal.cloud || base.cloud,
    hill: shade ? mixHex(base.hill, nightTone, shade) : base.hill,
    far: shade ? mixHex(base.far, nightTone, shade) : base.far,
    mid: shade ? mixHex(base.mid, nightTone, shade) : base.mid,
    dirt: shade ? mixHex(base.dirt, nightTone, shade * 0.8) : base.dirt,
    grass: shade
      ? base.grass.map((c) => mixHex(c, nightTone, shade * 0.7))
      : base.grass,
    fore: shade ? mixHex(base.fore, nightTone, shade) : base.fore,
    tip: shade ? mixHex(base.tip, nightTone, shade * 0.5) : base.tip,
    shadow: shade ? mixHex(base.shadow, nightTone, shade * 0.6) : base.shadow,
  };
  const rand = mulberry(
    ({ spring: 21, summer: 11, fall: 33, winter: 47 }[season] || 11) +
      ({ morning: 3, day: 0, evening: 7, night: 13 }[skyPeriod] || 0)
  );
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
    if (skyPal.stars) {
      for (let i = 0; i < 28; i += 1) {
        px(g, roll(2, W - 2) | 0, roll(2, 34) | 0, i % 4 ? "#ffffff" : "#cfe0ff");
      }
    }
    if (skyPal.sun) paintSun(g, skyPal.sun);
    if (skyPal.moon) paintMoon(g, skyPal.moon);
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
      const trunk = shade ? mixHex("#6b4426", nightTone, shade * 0.5) : "#6b4426";
      const trunkDark = shade ? mixHex("#4a2e18", nightTone, shade * 0.5) : "#4a2e18";
      const canopy = (color) => (shade ? mixHex(color, nightTone, shade * 0.55) : color);
      rect(g, X - 2, 10, 6, G - 10, trunk);
      rect(g, X + 2, 10, 2, G - 10, trunkDark);
      rect(g, X - 4, G - 2, 10, 2, trunkDark);
      if (pal.snow) {
        disc(g, X - 4, 8 + (i % 2) * 2, 4, canopy(pal.leaf[0]));
        disc(g, X + 5, 6, 4, canopy(pal.leaf[1]));
        disc(g, X, 2, 5, canopy(pal.leaf[2] || pal.leaf[0]));
        px(g, X - 1, 10, trunk);
        px(g, X + 2, 14, trunk);
        px(g, X - 3, 18, trunkDark);
      } else {
        disc(g, X - 7, 8 + (i % 2) * 3, 9, canopy(pal.leaf[0]));
        disc(g, X + 8, 6, 10, canopy(pal.leaf[0]));
        disc(g, X, -2, 11, canopy(pal.leaf[0]));
        disc(g, X - 8, 6 + (i % 2) * 3, 6, canopy(pal.leaf[1]));
        disc(g, X + 7, 3, 7, canopy(pal.leaf[1]));
        disc(g, X - 1, -4, 7, canopy(pal.leaf[1]));
        const accents = season === "fall" ? pal.leaf : pal.bloom;
        for (let n = 0; n < (season === "spring" ? 10 : 5); n += 1) {
          px(g, X + (roll(-9, 8) | 0), (roll(-6, 8) | 0), canopy(pick(accents)));
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
      px(g, roll(0, 256), roll(G + 4, H), pal.snow ? mixHex("#b7c8d4", nightTone, shade) : mixHex("#7a4a22", nightTone, shade));
    }
    for (let i = 0; i < 12; i += 1) {
      const x = roll(0, 250) | 0;
      const y = roll(G + 5, H - 3) | 0;
      if (pal.snow) {
        rect(g, x, y, 3, 2, "#ffffff");
        px(g, x, y + 1, "#d7e4ee");
      } else {
        rect(g, x, y, 3, 2, mixHex("#b08a5a", nightTone, shade));
        px(g, x, y + 1, mixHex("#8a6a40", nightTone, shade));
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
  return {
    season,
    skyPeriod,
    sky,
    clouds,
    hills,
    farPines,
    midPines,
    trees,
    ground,
    fore,
    shadow: pal.shadow,
  };
}

let scenery = buildScenery(currentSeason(), currentSkyPeriod());
let themeKey = "";

export function applySeasonTheme(at = new Date()) {
  const season = currentSeason(at);
  const sky = currentSkyPeriod(at);
  const key = `${season}:${sky}`;
  if (key === themeKey && scenery.season === season && scenery.skyPeriod === sky) {
    if (typeof document !== "undefined") {
      document.body.dataset.season = season;
      document.body.dataset.sky = sky;
    }
    return { season, sky };
  }
  themeKey = key;
  if (scenery.season !== season || scenery.skyPeriod !== sky) scenery = buildScenery(season, sky);
  if (typeof document !== "undefined") {
    document.body.dataset.season = season;
    document.body.dataset.sky = sky;
  }
  return { season, sky };
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
  if (!def) return;
  const hr = def.headroom || 0;
  target.width = def.w + (hr ? 2 : 0);
  target.height = def.h + hr + 2;
  const g = target.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, target.width, target.height);
  def.draw(g, 0, hr + 2, { open: 0, t: 0, idle: false, shake: 0, flash: 0, lunge: 0 });
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

const POSE = { walk: -55, idle: -55, windup: -160, swing: 35, block: -78, victory: -95, aim: -10 };
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
const hero = { ox: 0, oxT: 0, kx: 0, jy: 0, vy: 0, pose: "walk", ang: -55, smear: 0, alert: 0, down: false, noWeapon: false, hurt: 0, power: 0 };
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
const scene = {
  waiting: [],
  plays: [],
  onDone: null,
  color: "#3fa34d",
  paradeKey: "",
  gear: null,
  hero: "",
  lockup: null,
  hearts: 3,
  onLockup: null,
  warn: null,
  onWarn: null,
  review: null,
  onReviewApprove: null,
  onReviewDecline: null,
  guardian: null,
};
let parade = [];
let paradeOn = false;
let warner = null;
let spellBolt = null;
let warnBusy = false;
let lastWarn = "";
let reviewBusy = false;
let lastReview = "";
let actionsEl = null;
let reviewer = null;
let guardian = null;
const copPal = { K, N: "#2a3f8a", S: "#f4c89c", E: K, M: "#6e3418", Y: "#f4c542", B: "#1a1c2c" };
const copTop = [
  "...KKKKKK...", "..KNNNYNNK..", ".KKKKKKKKKK.", "..KSSSSSSSK.", "..KSESSESSK.", "..KMMMMSSSK.", "...KSSSSK...",
  "..KNNNNNNK..", ".KSNNYNNNNSK", ".KSNNNNNNNSK", "..KKKKKKKKK.", "..KNNNKNNNK.",
];
const copA = sprite([...copTop, "..KNNK.KNNK.", "..KBBK.KBBK.", "..KKK..KKK.."], copPal);
const copB = sprite([...copTop, "...KNNKNNK..", "...KBBKBBK..", "...KKKKKK..."], copPal);
/* Pointing arm: drawn pointing RIGHT; flip it for a left-facing parent.
   Sleeve + cuff match the outfit; one outlined index finger, shaded knuckles. */
function makeArm(sleeve, cuff, skin = "#f4c89c", shadeCol = "#d39a6c") {
  return sprite(
    [
      "KKKKKKK.........",
      "KRRRRWKKKKKKKKK.",
      "KRRRRWKSSSSSSSSK",
      "KRRRRWKSSSKKKKK.",
      "KKKKKKKSsSK.....",
      "......KKKK......",
    ],
    { K, R: sleeve, W: cuff, S: skin, s: shadeCol }
  );
}
const armCache = new Map();
function pointingArm(heroKey, tint) {
  const sleeve = tint || "#c0392b";
  const cuff = heroKey === "queen" ? "#f4c542" : "#ffffff";
  const key = `${heroKey || "knight"}:${sleeve}:${cuff}`;
  if (!armCache.has(key)) armCache.set(key, makeArm(sleeve, cuff));
  return armCache.get(key);
}
function drawPointingArm(fig, faceLeft) {
  const amount = Number(fig?.point) || 0;
  if (!fig || amount <= 0.01) return;
  const arm = pointingArm(fig.hero, fig.tint);
  const jab = ((time * 6) | 0) % 2 ? (faceLeft ? -1 : 1) : 0;
  const ext = Math.min(1, amount);
  const x = Math.round(fig.x);
  const y = Math.round(G - ((fig.stand || 16) - 1));
  const hand = fig.hand ?? 10;
  const ay = y + hand - 3;
  if (faceLeft) {
    const ax = Math.round(x + 5 - arm.width * ext) + jab;
    ctx.save();
    ctx.beginPath();
    ctx.rect(ax - 2, ay - 1, x + 6 - ax + 2, arm.height + 2);
    ctx.clip();
    ctx.translate(ax + arm.width, ay);
    ctx.scale(-1, 1);
    ctx.drawImage(arm, 0, 0);
    ctx.restore();
    return;
  }
  const ax = Math.round(x + 9 - arm.width * (1 - ext)) + jab;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 8, ay - 1, ax + arm.width - (x + 8) + 2, arm.height + 2);
  ctx.clip();
  ctx.drawImage(arm, ax, ay);
  ctx.restore();
}
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
  if (scene.review || scene.warn?.view === "parent") return 78 + hero.ox + hero.kx;
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
let hardHit = false;
function block(x, y, cols) {
  burst(x, y, ["#ffffff", ...cols], hardHit ? 18 : 14, hardHit ? 70 : 60);
  hero.kx = hardHit ? -12 : -3;
  if (hardHit) {
    hero.down = true;
    hero.hurt = Math.max(hero.hurt, 1.4);
    hero.pose = "idle";
  }
  if (!reduce) shake = hardHit ? 0.24 : 0.12;
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
    particles,
    heroX,
    block,
  };
}
function clearBattleFx() {
  effects.length = 0;
  beamT = 0;
  particles.length = 0;
  projectiles.length = 0;
}

function bumpRun() {
  runToken += 1;
  clearBattleFx();
}

function goTrail() {
  mon = null;
  hero.pose = "walk";
  hero.down = false;
  hero.oxT = 0;
  hero.power = 0;
  scrollTarget = scene.hero || scene.gear ? 18 : guardian ? 8 : 12;
  clearBattleFx();
  setReviewActions(false);
  if (scene.review) return;
  if (scene.hero || scene.gear) say("Walking the forest trail...");
  else if (guardian) say("Waiting for a finished quest...");
  else say("Waiting for a finished quest...");
}

function setReviewActions(on) {
  if (!actionsEl) actionsEl = host?.querySelector(".quest-actions");
  if (!actionsEl) return;
  actionsEl.hidden = !on;
  actionsEl.querySelectorAll("button").forEach((btn) => {
    btn.disabled = !on;
  });
}

function tintCanvas(src, col) {
  const [c, g] = canvas(src.width, src.height);
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = "source-in";
  g.fillStyle = col;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

function cloudMask(w, h) {
  const [c, g] = canvas(w, h);
  const r = Math.max(3, Math.min(5, (h >> 1) - 2));
  const fill = "#ffffff";
  rect(g, r, 1, w - 2 * r, h - 2, fill);
  rect(g, 1, r, w - 2, h - 2 * r, fill);
  const n = Math.max(2, Math.round((w - 2 * r) / 7));
  for (let i = 0; i <= n; i += 1) {
    const x = Math.round(r + ((w - 2 * r - 1) * i) / n);
    disc(g, x, r, r, fill);
    disc(g, x, h - r - 1, r, fill);
  }
  const m = Math.max(1, Math.round((h - 2 * r) / 6));
  for (let i = 0; i <= m; i += 1) {
    const y = Math.round(r + ((h - 2 * r - 1) * i) / m);
    disc(g, r, y, r, fill);
    disc(g, w - r - 1, y, r, fill);
  }
  return c;
}

function makeThought(spriteId) {
  const def = MON[normalizeSprite(spriteId)];
  const hr = def.headroom || 0;
  const [ic, ig] = canvas(def.w, def.h + hr);
  def.draw(ig, 0, hr, { open: 0, t: 0, idle: false, shake: 0, flash: 0, lunge: 0 });
  const w = def.w + 10;
  const h = def.h + hr + 8;
  const mask = cloudMask(w, h);
  const [c, g] = canvas(w + 2, h + 2);
  const edge = tintCanvas(mask, K);
  for (const [dx, dy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) g.drawImage(edge, dx, dy);
  const [inner, ing] = canvas(w, h);
  ing.drawImage(tintCanvas(mask, "#cfdcef"), 0, 0);
  ing.globalCompositeOperation = "source-atop";
  ing.drawImage(tintCanvas(mask, "#ffffff"), -1, -1);
  g.drawImage(inner, 1, 1);
  px(g, 4, 3, "#ffffff");
  g.drawImage(ic, 1 + 5, 1 + 4);
  return c;
}

function puff(x, y, r) {
  disc(ctx, x, y, r, K);
  disc(ctx, x, y, Math.max(1, r - 1), "#ffffff");
}

let thought = null;

function ensureThought(spriteId) {
  const key = normalizeSprite(spriteId);
  if (thought?.key === key) return thought;
  thought = { key, img: makeThought(key), t: 0 };
  return thought;
}

function clearThought() {
  thought = null;
}

function drawThoughtBubble(hx, hy, spriteId, side = "right") {
  const item = ensureThought(spriteId);
  const t = item.t;
  const left = side === "left";
  if (t > 0.08) puff(hx + (left ? -7 : 15), hy - 1, 2);
  if (t > 0.2) puff(hx + (left ? -12 : 20), hy - 4, 3);
  if (t <= 0.34) return;
  const im = item.img;
  const bob = Math.round(Math.sin(time * 2.4));
  const x = left
    ? Math.max(2, hx - im.width - 8)
    : Math.min(W - im.width - 2, hx + 24);
  const y = Math.max(2, hy + 3 - im.height) + bob;
  ctx.drawImage(im, x, y);
  if (t < 0.5) {
    for (let k = 0; k < 6; k += 1) {
      const a = (k / 6) * Math.PI * 2;
      px(
        ctx,
        x + im.width / 2 + Math.cos(a) * (im.width / 2 + 3),
        y + im.height / 2 + Math.sin(a) * (im.height / 2 + 3),
        "#ffffff",
      );
    }
  }
}

function clearReviewer() {
  reviewer = null;
  spellBolt = null;
  clearThought();
}

function parentFigure(info, x = 18) {
  if (!info) return null;
  const heroKey = info.hero || info.parentHero || "knight";
  const tint = info.color || info.parentColor || "#2a9d8f";
  const look = heroLook(heroKey, tint);
  return {
    x,
    look,
    hero: heroKey,
    tint,
    stand: look.h || 16,
    hand: look.hand ?? 10,
    weapon: info.weapon || info.parentWeapon || null,
    cast: 0,
    point: 0,
    pointT: 0,
    name: info.name || info.parentName || "Parent",
  };
}

function syncGuardian(info) {
  guardian = info ? parentFigure(info, 18) : null;
}

function setupReviewer(item) {
  reviewer = parentFigure(
    {
      hero: item.parentHero,
      color: item.parentColor,
      weapon: item.parentWeapon,
      name: item.parentName,
    },
    18,
  );
}

function stageParent() {
  return reviewer || guardian;
}

async function presentReview(token) {
  const item = scene.review;
  if (!item) return;
  reviewBusy = false;
  mon = null;
  projectiles.length = 0;
  hero.down = false;
  hero.hurt = 0;
  hero.power = 0;
  hero.noWeapon = false;
  hero.pose = "idle";
  hero.ox = 0;
  hero.oxT = 0;
  hero.kx = 0;
  scroll = 0;
  scrollTarget = 0;
  setupReviewer(item);
  ensureThought(item.sprite).t = 0;
  say(`${item.kidName} is done: ${item.title}. Approve it?`);
  setReviewActions(true);
}

async function playReviewApprove(token) {
  const item = scene.review;
  if (!item || reviewBusy) return;
  const done = scene.onReviewApprove;
  const choreId = item.id;
  reviewBusy = true;
  setReviewActions(false);
  const caster = stageParent();
  if (caster) {
    caster.cast = 1;
    say(`${caster.name} casts a power-up!`);
    if (!(await waitFor(0.25, token))) {
      reviewBusy = false;
      return;
    }
    const stand = caster.stand || 16;
    spellBolt = {
      x: caster.x + 10,
      y: G - stand + 6,
      tx: heroX() + 8,
      ty: G - 10,
      t: 0,
    };
    burst(spellBolt.x, spellBolt.y, ["#5cc96a", "#f4c542", "#ffffff"], 10, 40);
    if (!(await until(() => !spellBolt || spellBolt.t >= 1, token))) {
      reviewBusy = false;
      return;
    }
    spellBolt = null;
    caster.cast = 0;
  }
  say(`${item.kidName} is powered up!`);
  hero.pose = "idle";
  hero.power = 1.8;
  burst(heroX() + 8, G - 10, ["#e04a4a", "#f4862e", "#f4c542", "#5cc96a", "#4aa3ff", "#9b6ad6"], 22, 60);
  if (!reduce) shake = 0.12;
  if (!(await waitFor(1.2, token))) {
    reviewBusy = false;
    return;
  }
  say(`${item.kidName} heads off!`);
  hero.pose = "walk";
  // Review hero starts near x=78; ox must clear W+10 (138), so oxT needs > 60.
  hero.oxT = 80;
  if (!(await until(() => heroX() > W + 10, token))) {
    reviewBusy = false;
    return;
  }
  hero.power = 0;
  hero.ox = 0;
  hero.oxT = 0;
  clearReviewer();
  scene.review = null;
  scene.onReviewApprove = null;
  scene.onReviewDecline = null;
  lastReview = "";
  reviewBusy = false;
  done?.(choreId);
}

async function playReviewDecline(token) {
  const item = scene.review;
  if (!item || reviewBusy) return;
  const done = scene.onReviewDecline;
  const choreId = item.id;
  reviewBusy = true;
  setReviewActions(false);
  say(`Not yet. ${item.kidName} tries again.`);
  hero.pose = "block";
  hero.alert = 1;
  hero.kx = -8;
  hero.down = true;
  if (!reduce) shake = 0.18;
  burst(heroX() + 8, G - 8, ["#ffffff", "#e04a4a", "#f4c542"], 12, 45);
  if (!(await waitFor(0.7, token))) {
    reviewBusy = false;
    return;
  }
  hero.down = false;
  hero.pose = "walk";
  hero.oxT = 80;
  if (!(await until(() => heroX() > W + 10, token))) {
    reviewBusy = false;
    return;
  }
  hero.ox = 0;
  hero.oxT = 0;
  clearReviewer();
  scene.review = null;
  scene.onReviewApprove = null;
  scene.onReviewDecline = null;
  lastReview = "";
  reviewBusy = false;
  done?.(choreId);
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
  hero.hurt = 0;
  mon.flee = false;
  mon.approach = false;
  mon.idle = true;
  mon.showHp = false;
  say(`${def.name} attacks!`);
  hero.pose = "block";
  hero.alert = 1;
  if (!(await waitFor(0.4, token))) return;
  mon.idle = false;
  hardHit = true;
  try {
    await def.attack(mon, apiFor(token));
  } finally {
    hardHit = false;
  }
  if (token !== runToken || !mon) return;
  if (!(await until(() => projectiles.length === 0, token))) return;
  if (!hero.down) {
    block(heroX() + 10, G - 6, def.hit || ["#e04a4a", "#ffffff"]);
    hero.down = true;
    hero.hurt = Math.max(hero.hurt, 1.4);
  }
  say("Knocked down!");
  if (!(await waitFor(0.55, token))) return;
  if (token !== runToken || !mon) return;
  mon.approach = false;
  mon.idle = false;
  mon.flee = true;
  say(`${def.name} runs away.`);
  if (!(await until(() => !mon || mon.x > W + 16, token))) return;
  mon = null;
  if (!(await waitFor(0.55, token))) return;
  if (token !== runToken) return;
  hero.down = false;
  hero.hurt = 0;
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
  const wpn = scene.gear?.weapon || {};
  const wk = wpn.key || "broom";
  const lines = [
    wpn.beam ? `You fire the ${wpn.name || "weapon"}!` : `You strike with the ${wpn.name || "broom"}!`,
    "Another big hit!",
    "Final blow!",
  ];
  const fight = apiFor(token);
  for (let i = 0; i < 3; i += 1) {
    if (token !== runToken || !mon?.alive) return;
    say(lines[i]);
    if (wpn.beam) {
      hero.pose = "aim";
      hero.oxT = -2;
      if (!(await waitFor(0.3, token))) return;
      beamT = 0.45;
      mon.lungeT = -5;
    } else {
      hero.pose = "windup";
      if (!(await waitFor(0.2 * (wpn.speed || 1), token))) return;
      const reach = (wpn.mapLen || 14) - (wpn.grip?.[0] || 2);
      hero.oxT = mon.x - (reach > 15 ? 22 : 18) - 26;
      if (!(await waitFor(0.14, token))) return;
      hero.pose = "swing";
      hero.ang = POSE.swing;
      hero.smear = 0.12;
    }
    mon.hp -= 1;
    mon.flash = 0.2;
    mon.shake = 0.25;
    mon.idle = false;
    if (!reduce) shake = wpn.heavy ? 0.3 : 0.15;
    const hx = mon.x + def.w / 2;
    const hy = G - def.h / 2 + def.yoff(mon);
    burst(hx, hy, def.hit, 12, 70);
    const fxCols = wpn.fx || def.hit;
    for (let k = 0; k < 10; k += 1) {
      const a = R() * Math.PI * 2;
      const v = rnd(20, 60);
      particles.push({ x: hx, y: hy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 15, g: wpn.fxG ?? 120, life: rnd(0.3, 0.7), c: fxCols[k % fxCols.length] });
    }
    if (i === 2) {
      special(wk, hx, hy);
      if (!(await waitFor(0.75, token))) return;
    }
    if (!(await waitFor(wpn.beam ? 0.45 : 0.25, token))) return;
    mon.lungeT = 0;
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
  const reward = Math.max(0, mon.points) + (wpn.bonus || 0);
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
const heartS = sprite(
  [".KK.KK.", "KWRKRRK", "KRRRRRK", ".KRRRK.", "..KRK..", "...K..."],
  { K, W: "#ffb0b0", R: "#e04a4a" },
);
const heartE = sprite(
  [".KK.KK.", "KDDKDDK", "KDDDDDK", ".KDDDK.", "..KDK..", "...K..."],
  { K, D: "#4a3a58" },
);
const heartCrack = sprite(
  [".KK.KK.", "KWRKRRK", "KR.RRRK", ".KR.RK.", "..KRK..", "...K..."],
  { K, W: "#fff3a8", R: "#e04a4a" },
);
let hudHearts = 3;
let heartFx = null;

function paintHearts(count) {
  if (heartFx) return;
  if (count == null) {
    hudHearts = null;
    if (!host) return;
    const row = host.querySelector(".quest-hearts");
    if (!row) return;
    row.dataset.hearts = "";
    row.setAttribute("aria-label", "Hearts hidden");
    return;
  }
  const n = Math.max(0, Math.min(3, Number(count) || 0));
  hudHearts = n;
  if (!host) return;
  const row = host.querySelector(".quest-hearts");
  if (!row) return;
  row.dataset.hearts = String(n);
  row.setAttribute("aria-label", `${n} heart${n === 1 ? "" : "s"} left`);
}

function crackHeart(lostIndex) {
  const i = Math.max(0, Math.min(2, lostIndex));
  heartFx = { i, mode: "crack", t: 0 };
  return new Promise((resolve) => {
    window.setTimeout(() => {
      heartFx = { i, mode: "fade", t: 0 };
      window.setTimeout(() => {
        heartFx = null;
        paintHearts(Math.max(0, lostIndex));
        resolve();
      }, 850);
    }, 550);
  });
}

function drawHearts() {
  if (hudHearts == null) return;
  const max = 3;
  for (let i = 0; i < max; i += 1) {
    const x = W - 3 - (max - i) * 9;
    const y = 3;
    let img = i < hudHearts ? heartS : heartE;
    let ox = 0;
    let oy = 0;
    if (heartFx && heartFx.i === i) {
      if (heartFx.mode === "crack") {
        img = heartCrack;
        ox = ((time * 24) | 0) % 2 ? 1 : -1;
        oy = ((time * 18) | 0) % 2 ? -1 : 0;
      } else {
        img = heartS;
        oy = Math.min(8, Math.round(heartFx.t * 10));
        if (heartFx.t > 0.35 && ((heartFx.t * 10) | 0) % 2 === 0) continue;
      }
    }
    ctx.drawImage(img, x + ox, y + oy);
  }
}

function parentLookKey(name) {
  const key = String(name || "").trim().toLowerCase();
  if (key === "alex") return "king";
  if (key === "jackie") return "queen";
  return "knight";
}

function finishWarn(info) {
  warnBusy = false;
  const done = scene.onWarn;
  scene.warn = null;
  scene.onWarn = null;
  lastWarn = "";
  done?.(info);
}

async function playParentWarn(token, info) {
  mon = null;
  projectiles.length = 0;
  spellBolt = null;
  warner = null;
  hero.down = false;
  hero.hurt = 0;
  hero.noWeapon = false;
  scroll = 0;
  scrollTarget = 0;
  hero.pose = "idle";
  hero.ox = 0;
  hero.oxT = 0;
  hero.kx = 0;
  if (!guardian) syncGuardian({
    hero: info.hero,
    color: info.color,
    name: info.parent,
    weapon: info.weapon || null,
  });
  const caster = stageParent();
  if (!caster) {
    finishWarn(info);
    return;
  }
  caster.cast = 0;
  caster.point = 0;
  caster.pointT = 0;
  if (!caster.hero) caster.hero = info.hero || parentLookKey(info.parent);
  if (!caster.tint) caster.tint = info.color || "#2a9d8f";
  const kidName = info.kidName || "the hero";
  say(`${caster.name} warns ${kidName}!`);
  if (!(await waitFor(0.45, token))) {
    warnBusy = false;
    return;
  }
  say(`${caster.name} casts a warning spell!`);
  if (!(await waitFor(0.3, token))) {
    warnBusy = false;
    return;
  }
  caster.cast = 1;
  if (!(await waitFor(0.2, token))) {
    warnBusy = false;
    return;
  }
  const stand = caster.stand || 16;
  spellBolt = {
    x: caster.x + 12,
    y: G - stand + 6,
    tx: heroX() + 8,
    ty: G - 10,
    t: 0,
  };
  burst(spellBolt.x, spellBolt.y, ["#c77dff", "#fff3a8", "#ffffff"], 10, 40);
  if (!(await until(() => !spellBolt || spellBolt.t >= 1, token))) {
    warnBusy = false;
    return;
  }
  spellBolt = null;
  caster.cast = 0;
  hero.hurt = 2.6;
  hero.kx = 8;
  if (!reduce) shake = 0.25;
  burst(heroX() + 10, G - 6, ["#e04a4a", "#ffffff", "#c77dff"], 16, 55);
  say("The spell hits! A heart cracks!");
  const lost = Math.max(0, Math.min(2, Number(info.hearts) || 0));
  const cracking = crackHeart(lost);
  if (!(await waitFor(2.4, token))) {
    warnBusy = false;
    return;
  }
  await cracking;
  paintHearts(Number(info.hearts) || 0);
  if (info.locked) {
    say("Last heart gone...");
    if (!(await waitFor(0.55, token))) {
      warnBusy = false;
      return;
    }
    caster.pointT = 1;
    say(`${caster.name} points at ${kidName}!`);
    if (!(await waitFor(0.85, token))) {
      warnBusy = false;
      return;
    }
    siren = true;
    say("WEE-OOO! The Chore Patrol is on the way!");
    if (!(await waitFor(0.35, token))) {
      warnBusy = false;
      return;
    }
    cops = [
      { x: Math.min(-16, caster.x - 28), vx: 58, flip: true },
      { x: Math.min(-32, caster.x - 46), vx: 58, flip: true },
    ];
    if (!(await until(() => cops[0] && cops[0].x >= heroX() - 4, token))) {
      warnBusy = false;
      return;
    }
    cops.forEach((c) => { c.vx = 0; });
    cops[1].x = cops[0].x - 14;
    hero.alert = 1;
    say(`Halt! ${kidName} is GROUNDED!`);
    if (!(await waitFor(1.0, token))) {
      warnBusy = false;
      return;
    }
    flyWeapon = { x: heroX() + 11, y: heroY() + 10, tx: cops[0].x + 11, ty: G - 6, t: 0 };
    hero.noWeapon = true;
    say("The Chore Patrol confiscates the weapon!");
    if (!(await until(() => flyWeapon && flyWeapon.t >= 1, token))) {
      warnBusy = false;
      return;
    }
    cage = { y: -60, vy: 0, drop: true, locked: false, lift: false };
    if (!(await until(() => cage && !cage.drop, token))) {
      warnBusy = false;
      return;
    }
    if (!reduce) shake = 0.3;
    burst(heroX() + 7, G, ["#b4b4c4", "#8890a8", "#ffffff"], 18, 60);
    if (!(await waitFor(0.35, token))) {
      warnBusy = false;
      return;
    }
    cage.locked = true;
    burst(heroX() + 10, G - 5, ["#f4c542", "#ffffff"], 8, 30);
    say("Locked in! Earn coins to break out.");
    if (!(await waitFor(0.85, token))) {
      warnBusy = false;
      return;
    }
    cops.forEach((c) => { c.vx = -40; c.flip = false; });
    caster.pointT = 0;
    if (!(await until(() => cops.every((c) => c.x < -20), token))) {
      warnBusy = false;
      return;
    }
    cops = [];
    flyWeapon = null;
    siren = false;
    hero.hurt = 0;
    scene.lockup = "held";
    lastLockup = `held:${info.lockKey || ""}`;
    scene.onLockup?.("held");
    finishWarn(info);
    return;
  }
  say(`Be careful out there, ${kidName}.`);
  if (!(await waitFor(1.0, token))) {
    warnBusy = false;
    return;
  }
  hero.hurt = 0;
  finishWarn(info);
  if (token !== runToken) return;
  goTrail();
}

async function playWarn(token) {
  const info = scene.warn;
  if (!info || warnBusy) return;
  warnBusy = true;
  if (info.view === "parent") {
    await playParentWarn(token, info);
    return;
  }
  mon = null;
  projectiles.length = 0;
  spellBolt = null;
  hero.down = false;
  hero.hurt = 0;
  scroll = 0;
  scrollTarget = 0;
  hero.pose = "idle";
  hero.oxT = 0;
  const tint = info.color || "#2a9d8f";
  const look = heroLook(info.hero || parentLookKey(info.parent), tint);
  const stand = look.h || 16;
  const slot = 78;
  const heroKey = info.hero || parentLookKey(info.parent);
  warner = {
    x: W + 10,
    tx: slot,
    look,
    hero: heroKey,
    tint,
    stand,
    hand: look.hand ?? 10,
    cast: 0,
    point: 0,
    pointT: 0,
    name: info.parent || "Parent",
  };
  say(`${warner.name} steps in!`);
  if (!(await until(() => warner && warner.x <= slot + 0.5, token))) {
    warnBusy = false;
    return;
  }
  warner.x = slot;
  warner.tx = slot;
  say(`${warner.name} casts a warning spell!`);
  if (!(await waitFor(0.35, token))) {
    warnBusy = false;
    return;
  }
  warner.cast = 1;
  if (!(await waitFor(0.2, token))) {
    warnBusy = false;
    return;
  }
  const hx = heroX() + 8;
  const hy = G - 10;
  spellBolt = { x: slot + 2, y: G - stand + 6, tx: hx, ty: hy, t: 0 };
  burst(spellBolt.x, spellBolt.y, ["#c77dff", "#fff3a8", "#ffffff"], 10, 40);
  if (!(await until(() => !spellBolt || spellBolt.t >= 1, token))) {
    warnBusy = false;
    return;
  }
  spellBolt = null;
  warner.cast = 0;
  hero.hurt = 2.6;
  hero.kx = -10;
  if (!reduce) shake = 0.25;
  burst(heroX() + 10, G - 6, ["#e04a4a", "#ffffff", "#c77dff"], 16, 55);
  say("The spell hits! A heart cracks!");
  const lost = Math.max(0, Math.min(2, Number(info.hearts) || 0));
  const cracking = crackHeart(lost);
  if (!(await waitFor(2.4, token))) {
    warnBusy = false;
    return;
  }
  await cracking;
  paintHearts(Number(info.hearts) || 0);
  if (info.locked) {
    say("Last heart gone...");
    if (!(await waitFor(0.55, token))) {
      warnBusy = false;
      return;
    }
    warner.pointT = 1;
    say(`${warner.name} points at you!`);
    if (!(await waitFor(0.85, token))) {
      warnBusy = false;
      return;
    }
    siren = true;
    say("WEE-OOO! The Chore Patrol is on the way!");
    if (!(await waitFor(0.35, token))) {
      warnBusy = false;
      return;
    }
    cops = [
      { x: Math.max(W + 8, warner.x + 28), vx: -58, flip: false },
      { x: Math.max(W + 24, warner.x + 46), vx: -58, flip: false },
    ];
    if (!(await until(() => cops[0] && cops[0].x <= heroX() + 19, token))) {
      warnBusy = false;
      return;
    }
    cops.forEach((c) => { c.vx = 0; });
    cops[1].x = cops[0].x + 14;
    hero.alert = 1;
    say("Halt! You're GROUNDED!");
    if (!(await waitFor(1.0, token))) {
      warnBusy = false;
      return;
    }
    flyWeapon = { x: heroX() + 11, y: heroY() + 10, tx: cops[0].x + 1, ty: G - 6, t: 0 };
    hero.noWeapon = true;
    say("The Chore Patrol confiscates your weapon!");
    if (!(await until(() => flyWeapon && flyWeapon.t >= 1, token))) {
      warnBusy = false;
      return;
    }
    cage = { y: -60, vy: 0, drop: true, locked: false, lift: false };
    if (!(await until(() => cage && !cage.drop, token))) {
      warnBusy = false;
      return;
    }
    if (!reduce) shake = 0.3;
    burst(heroX() + 7, G, ["#b4b4c4", "#8890a8", "#ffffff"], 18, 60);
    if (!(await waitFor(0.35, token))) {
      warnBusy = false;
      return;
    }
    cage.locked = true;
    burst(heroX() + 10, G - 5, ["#f4c542", "#ffffff"], 8, 30);
    say("Locked in! Earn coins to break out.");
    if (!(await waitFor(0.85, token))) {
      warnBusy = false;
      return;
    }
    cops.forEach((c) => { c.vx = 40; c.flip = true; });
    warner.pointT = 0;
    warner.tx = W + 28;
    if (!(await until(() => cops.every((c) => c.x > W + 4) && (!warner || warner.x > W + 6), token))) {
      warnBusy = false;
      return;
    }
    cops = [];
    flyWeapon = null;
    siren = false;
    warner = null;
    hero.hurt = 0;
    scene.lockup = "held";
    lastLockup = `held:${info.lockKey || ""}`;
    scene.onLockup?.("held");
    finishWarn(info);
    return;
  }
  say("Be careful out there.");
  warner.tx = W + 24;
  if (!(await until(() => !warner || warner.x > W + 6, token))) {
    warnBusy = false;
    return;
  }
  warner = null;
  hero.hurt = 0;
  finishWarn(info);
  if (token !== runToken) return;
  goTrail();
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
  if (scene.warn) {
    playWarn(token);
    return;
  }
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
  if (scene.review) {
    if (!reviewBusy) presentReview(token);
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
  host.innerHTML = `<canvas class="quest-canvas" width="128" height="72" aria-label="Forest battle"></canvas><div class="quest-hearts" aria-label="3 hearts left"><i class="on"></i><i class="on"></i><i class="on"></i></div><div class="quest-panel"><div class="quest-dialog" aria-live="polite"></div></div><div class="quest-actions" hidden><button type="button" class="quest-approve">Approve</button><button type="button" class="quest-decline">Decline</button></div>`;
  const canvasEl = host.querySelector("canvas");
  ctx = canvasEl.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  dialog = host.querySelector(".quest-dialog");
  actionsEl = host.querySelector(".quest-actions");
  actionsEl.querySelector(".quest-approve").addEventListener("click", () => {
    if (!scene.review || reviewBusy) return;
    playReviewApprove(runToken);
  });
  actionsEl.querySelector(".quest-decline").addEventListener("click", () => {
    if (!scene.review || reviewBusy) return;
    playReviewDecline(runToken);
  });
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
    scene.warn = null;
    scene.onWarn = null;
    scene.review = null;
    scene.onReviewApprove = null;
    scene.onReviewDecline = null;
    scene.guardian = null;
    lastLockup = "";
    lastWarn = "";
    lastReview = "";
    cage = null;
    cops = [];
    flyWeapon = null;
    siren = false;
    lockBusy = false;
    warnBusy = false;
    reviewBusy = false;
    warner = null;
    clearReviewer();
    syncGuardian(null);
    hero.noWeapon = false;
    hero.hurt = 0;
    hero.power = 0;
    hardHit = false;
    setReviewActions(false);
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
    bumpRun();
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
    bumpRun();
    mon = null;
  }
  scene.gear = next.gear || null;
  scene.hero = next.hero || "";
  scene.onDone = next.onDone;
  scene.onLockup = next.onLockup || null;
  scene.onWarn = next.onWarn || null;
  if (!reviewBusy || next.onReviewApprove) scene.onReviewApprove = next.onReviewApprove || null;
  if (!reviewBusy || next.onReviewDecline) scene.onReviewDecline = next.onReviewDecline || null;
  scene.guardian = next.guardian || null;
  syncGuardian(scene.guardian);
  const review = next.review || null;
  const warn = next.warn || null;
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
  if (review) {
    const reviewKey = `${review.id}:${review.sprite}:${review.title}:${review.hero || ""}:${review.parentHero || ""}`;
    scene.review = review;
    scene.warn = null;
    scene.lockup = null;
    setReviewActions(false);
    if (reviewKey === lastReview && (reviewBusy || hero.pose === "idle")) {
      if (!reviewBusy) presentReview(runToken);
      return;
    }
    lastReview = reviewKey;
    bumpRun();
    mon = null;
    hero.ox = 0;
    hero.oxT = 0;
    reconcile();
    return;
  }
  if (scene.review || reviewBusy) {
    if (reviewBusy) return;
    scene.review = null;
    scene.onReviewApprove = null;
    scene.onReviewDecline = null;
    lastReview = "";
    setReviewActions(false);
    clearReviewer();
    hero.power = 0;
  }
  if (warn) {
    const warnKey = `${warn.seq || ""}:${warn.parent || ""}:${warn.hearts ?? ""}`;
    scene.warn = warn;
    scene.lockup = null;
    if (warnKey === lastWarn && (warnBusy || warner)) return;
    lastWarn = warnKey;
    bumpRun();
    mon = null;
    reconcile();
    return;
  }
  if (scene.warn || warnBusy || warner) {
    if (!warnBusy) {
      scene.warn = null;
      scene.onWarn = null;
      lastWarn = "";
      warner = null;
      spellBolt = null;
      hero.hurt = 0;
    }
  }
  if (lockup) {
    const lockKey = `${lockup}:${next.lockKey || ""}`;
    scene.lockup = lockup;
    if (lockKey === lastLockup && (lockBusy || (lockup === "held" && cage?.locked) || (lockup === "arrive" && cage))) return;
    lastLockup = lockKey;
    bumpRun();
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
  bumpRun();
  reconcile();
}

export function paintSpriteIcons(root) {
  root.querySelectorAll("canvas[data-sprite]").forEach((icon) => {
    try { drawMonsterIcon(icon, icon.dataset.sprite); }
    catch { /* keep other icons painting if one sprite fails */ }
  });
  root.querySelectorAll("canvas[data-hero]").forEach((icon) => {
    try { drawHeroIcon(icon, icon.dataset.hero); }
    catch { /* ignore */ }
  });
}

let questWalkRaf = 0;
let questWalkers = [];

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

function scheduleWalkerBeat(walker) {
  if (Math.random() < 0.45) {
    walker.mode = "idle";
    walker.timer = randRange(0.45, 1.8);
    walker.speed = 0;
    return;
  }
  walker.mode = "walk";
  walker.dir = Math.random() < 0.5 ? -1 : 1;
  walker.speed = randRange(18, 42);
  walker.timer = randRange(0.7, 2.6);
}

function buildQuestWalker(canvas) {
  const sprite = normalizeSprite(canvas.dataset.questWalker || canvas.dataset.sprite);
  const def = MON[sprite];
  const scale = 2;
  const box = canvas.parentElement?.getBoundingClientRect();
  const cssW = Math.max(48, Math.floor(box?.width || canvas.clientWidth || 96));
  const cssH = Math.max(36, Math.floor(box?.height || canvas.clientHeight || 44));
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.max(1, Math.floor(cssW * dpr));
  canvas.height = Math.max(1, Math.floor(cssH * dpr));
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  const g = canvas.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const drawW = def.w * scale;
  const drawH = (def.h + 2) * scale;
  const maxX = Math.max(0, cssW - drawW);
  const walker = {
    canvas,
    g,
    def,
    sprite,
    scale,
    cssW,
    cssH,
    drawW,
    drawH,
    maxX,
    x: maxX > 0 ? Math.random() * maxX : 0,
    dir: Math.random() < 0.5 ? -1 : 1,
    speed: 0,
    mode: "idle",
    timer: 0,
    t: Math.random() * 10,
    bob: 0,
  };
  scheduleWalkerBeat(walker);
  return walker;
}

function paintQuestWalker(walker, dt) {
  walker.timer -= dt;
  walker.t += dt;
  if (walker.timer <= 0) scheduleWalkerBeat(walker);
  if (walker.mode === "walk") {
    walker.x += walker.dir * walker.speed * dt;
    if (walker.x <= 0) {
      walker.x = 0;
      walker.dir = 1;
    } else if (walker.x >= walker.maxX) {
      walker.x = walker.maxX;
      walker.dir = -1;
    }
    walker.bob = Math.sin(walker.t * 10) * 1.5;
  } else {
    walker.bob = Math.sin(walker.t * 5) * 0.8;
  }
  const { g, cssW, cssH, def, scale, drawW, drawH } = walker;
  g.clearRect(0, 0, cssW, cssH);
  const ground = cssH - 2;
  const y = ground - drawH + walker.bob;
  const m = { open: 0, t: walker.t, idle: walker.mode === "idle", shake: 0, flash: 0, lunge: 0 };
  g.save();
  if (walker.dir < 0) {
    g.translate(Math.round(walker.x + drawW), Math.round(y));
    g.scale(-scale, scale);
  } else {
    g.translate(Math.round(walker.x), Math.round(y));
    g.scale(scale, scale);
  }
  def.draw(g, 0, 2, m);
  g.restore();
}

function tickQuestWalkers(now) {
  if (!questWalkers.length) {
    questWalkRaf = 0;
    return;
  }
  const prev = tickQuestWalkers.prev || now;
  const dt = Math.min(0.05, Math.max(0.001, (now - prev) / 1000));
  tickQuestWalkers.prev = now;
  const live = [];
  for (const walker of questWalkers) {
    if (!walker.canvas.isConnected) continue;
    paintQuestWalker(walker, dt);
    live.push(walker);
  }
  questWalkers = live;
  if (questWalkers.length) questWalkRaf = requestAnimationFrame(tickQuestWalkers);
  else questWalkRaf = 0;
}

export function mountQuestWalkers(root) {
  if (questWalkRaf) {
    cancelAnimationFrame(questWalkRaf);
    questWalkRaf = 0;
  }
  tickQuestWalkers.prev = 0;
  const nodes = root?.querySelectorAll?.("canvas[data-quest-walker]") || [];
  questWalkers = [...nodes].map(buildQuestWalker);
  if (questWalkers.length) questWalkRaf = requestAnimationFrame(tickQuestWalkers);
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
  const hop = Math.round(m.hopY || 0);
  if (m.hopY && m.hopV != null && m.spinT > 0 && ((time * 16) | 0) % 2) {
    ctx.save();
    ctx.translate(dx + 28, dy + 28 + hop);
    ctx.scale(-1, -1);
    ctx.drawImage(mc, -28, -28);
    ctx.restore();
  } else if (m.flee) {
    ctx.save();
    ctx.translate(dx + 56, dy + hop);
    ctx.scale(-1, 1);
    ctx.drawImage(mc, 0, 0);
    ctx.restore();
  } else {
    ctx.drawImage(mc, dx, dy + hop);
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
    const by = G + d.yoff(m) - d.h - 6 - (d.hpLift || 0);
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
  beamT = Math.max(0, beamT - dt);
  updateEffects(dt);
  hero.alert = Math.max(0, hero.alert - dt);
  hero.hurt = Math.max(0, hero.hurt - dt);
  const parentPoint = stageParent();
  if (parentPoint) {
    parentPoint.point += ((parentPoint.pointT || 0) - parentPoint.point) * Math.min(1, dt * 14);
  }
  if (warner) {
    warner.point += ((warner.pointT || 0) - warner.point) * Math.min(1, dt * 14);
  }
  if (hero.power > 0) {
    hero.power = Math.max(0, hero.power - dt);
    if (R() < dt * 16) {
      const a = R() * Math.PI * 2;
      const cols = ["#e04a4a", "#f4862e", "#f4c542", "#5cc96a", "#4aa3ff", "#9b6ad6"];
      particles.push({
        x: heroX() + 8 + Math.cos(a) * 9,
        y: heroY() + 6 + Math.sin(a) * 7,
        vx: Math.cos(a) * 10,
        vy: Math.sin(a) * 10 - 12,
        g: 30,
        life: 0.35,
        c: cols[(R() * cols.length) | 0],
      });
    }
  }
  if (thought) thought.t += dt;
  if (heartFx) heartFx.t += dt;
  if (warner) {
    warner.x += ((warner.tx ?? warner.x) - warner.x) * Math.min(1, dt * 5);
  }
  if (spellBolt) spellBolt.t += dt * 2.4;
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
    if (mon.def.sizzle && R() < dt * 9) particles.push({ x: mon.x + rnd(3, 15), y: G - 10 + mon.def.yoff(mon), vx: rnd(-3, 3), vy: -rnd(10, 18), g: -5, life: 0.9, c: R() < 0.5 ? "#c8d0e0" : "#e6ecf5" });
    if (mon.def.drizzle && R() < dt * 6) particles.push({ x: mon.x + 4 + ((R() * 9) | 0), y: G + 1 - mon.def.h + mon.def.yoff(mon) - 5, vx: 0, vy: 30, g: 80, life: 0.2, c: "#4aa3ff" });
    if (mon.def.shower && R() < dt * 14) particles.push({ x: mon.x + 9 + ((R() * 3) | 0) * 2, y: G + 1 - mon.def.h + mon.def.yoff(mon) - 7, vx: 0, vy: 35, g: 90, life: 0.22, c: R() < 0.5 ? "#7fd0ff" : "#bfefff" });
    if (mon.def.bubbly && R() < dt * 5) particles.push({ x: mon.x + rnd(3, 17), y: G - 13 + mon.def.yoff(mon), vx: rnd(-4, 4), vy: -12, g: -6, life: 1.3, c: R() < 0.5 ? "#bfefff" : "#ffffff" });
    if (mon.hopV != null) { mon.hopY = (mon.hopY || 0) + mon.hopV * dt; mon.hopV += 360 * dt; if (mon.hopY >= 0) { mon.hopY = 0; mon.hopV = null; } }
    if (mon.spinT > 0) mon.spinT = Math.max(0, mon.spinT - dt);

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
  const parentFig = stageParent();
  if (parentFig && !(paradeOn && parade.length)) {
    const rx = Math.round(parentFig.x);
    const ry = Math.round(G - ((parentFig.stand || 16) - 1));
    const rHand = parentFig.hand ?? 10;
    const warnCast = scene.warn?.view === "parent" && parentFig.cast;
    const pointing = (Number(parentFig.point) || 0) > 0.05;
    rect(ctx, rx + 3, G, 8, 1, scenery.shadow);
    ctx.drawImage(parentFig.look.a, rx, ry);
    if (!pointing) {
      if (parentFig.weapon?.image) drawGearWeapon(parentFig.weapon, rx + 11, ry + rHand, -55);
      else drawBroom(rx + 11, ry + rHand, -55);
    }
    if (parentFig.cast) {
      const hx = rx + 10;
      const hy = ry + 4;
      const glow = warnCast ? "#c77dff" : "#5cc96a";
      const spark = warnCast ? "#fff3a8" : "#f4c542";
      disc(ctx, hx, hy, 2, glow);
      disc(ctx, hx + 1, hy - 1, 1, spark);
      if (R() < 0.35) {
        particles.push({ x: hx + rnd(-1, 2), y: hy + rnd(-2, 1), vx: rnd(-4, 12), vy: rnd(-20, -6), g: 40, life: 0.25, c: R() < 0.5 ? glow : spark });
      }
    }
    // Parent stands on the left and points right at the kid.
    drawPointingArm(parentFig, false);
  }
  const look = scene.hero ? heroLook(scene.hero, scene.color) : null;
  const x = Math.round(heroX());
  const walking = (scroll > 2 || hero.oxT > 2) && hero.pose === "walk";
  const fr = walking && ((time * 8) | 0) % 2;
  const stand = look?.h || 16;
  const hand = look?.hand ?? 10;
  const y = Math.round(G - (stand - 1) + hero.jy) - (fr ? 1 : 0);
  const faceParent = Boolean(
    (scene.review || scene.warn?.view === "parent")
      && !hero.down
      && hero.oxT <= 0
      && hero.pose !== "walk"
  );
  const showHero = Boolean(
    scene.hero || scene.gear || scene.review || scene.warn || scene.lockup || cage || cops.length
      || scene.plays.length || scene.waiting.length
  );
  if (!(paradeOn && parade.length) && showHero) {
  rect(ctx, x + 3, G, 8, 1, scenery.shadow);
  if (hero.smear > 0) {
    const W_ = scene.gear?.weapon;
    const smear = W_?.smear || ["#fffbe0", "#fff3b0"];
    const reach = ((W_?.mapLen || 14) - (W_?.grip?.[0] || 2));
    let k = 0;
    for (let a = -160; a <= 35; a += 7, k += 1) {
      const r = a * (Math.PI / 180);
      const c1 = smear === "rainbow" ? RAINBOW[k % 6] : smear[0];
      const c2 = smear === "rainbow" ? RAINBOW[(k + 1) % 6] : smear[1];
      px(ctx, x + 11 + Math.cos(r) * reach, y + hand + Math.sin(r) * reach, c1);
      px(ctx, x + 11 + Math.cos(r) * (reach - 1), y + hand + Math.sin(r) * (reach - 1), c2);
    }
  }
  const sprites = look || (scene.gear?.frames?.a ? scene.gear.frames : heroSprites);
  if (hero.down) {
    ctx.save();
    ctx.translate(x + 8, y + stand);
    ctx.rotate(-Math.PI / 2);
    ctx.drawImage(sprites.a, -8, -stand);
    ctx.restore();
  } else if (faceParent) {
    ctx.save();
    ctx.translate(x + 16, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(sprites.a, 0, y);
    if (!hero.noWeapon) {
      if (scene.gear?.weapon?.image) drawGearWeapon(scene.gear.weapon, 5, y + hand, -125);
      else drawBroom(5, y + hand, -125);
    }
    ctx.restore();
  } else {
    ctx.drawImage(fr ? sprites.b : sprites.a, x, y);
    if (!hero.noWeapon) {
      if (scene.gear?.weapon?.image) drawGearWeapon(scene.gear.weapon, x + 11, y + hand, hero.ang);
      else drawBroom(x + 11, y + hand, hero.ang);
      if (beamT > 0 && mon && scene.gear?.weapon?.beam) {
        const [bx, by] = weaponTipFromGear(scene.gear.weapon, x + 11, y + hand, hero.ang);
        const ex = mon.x + mon.def.w / 2;
        const BC = scene.gear.weapon.beamCol || ["#7fe0ff", "#ffffff", "#bfefff", "#4aa3ff"];
        for (let i = 0; bx + i < ex; i += 1) {
          const c = ((i + ((time * 60) | 0)) % 4) < 2 ? BC[0] : BC[1];
          const w = 1 + (((i + ((time * 30) | 0)) % 5 === 0) ? 1 : 0);
          px(ctx, bx + i, by, c);
          if (w > 1) px(ctx, bx + i, by - 1, BC[2]);
          px(ctx, bx + i, by + 1, BC[3]);
        }
      }
    }
  }
  if (hero.power > 0) {
    const cols = ["#e04a4a", "#f4862e", "#f4c542", "#5cc96a", "#4aa3ff", "#9b6ad6"];
    for (let i = 0; i < 12; i += 1) {
      const a = time * 5 + i * ((Math.PI * 2) / 12);
      const rx = 9 + Math.sin(time * 8 + i) * 1.5;
      const ry = 10;
      px(ctx, x + 8 + Math.cos(a) * rx, y + stand / 2 + Math.sin(a) * ry, cols[i % 6]);
      px(ctx, x + 8 + Math.cos(a) * (rx - 2), y + stand / 2 + Math.sin(a) * (ry - 2), cols[(i + 2) % 6]);
    }
  }
  if (scene.review && !hero.down && hero.oxT <= 0) {
    drawThoughtBubble(x + 8, y + 2, scene.review.sprite, "left");
  }
  if (hero.alert > 0) {
    rect(ctx, x + 4, y - 11, 7, 9, K);
    rect(ctx, x + 5, y - 10, 5, 7, "#ffffff");
    rect(ctx, x + 7, y - 9, 1, 3, "#e04a4a");
    px(ctx, x + 7, y - 5, "#e04a4a");
  }
  if (hero.hurt > 0 && ((hero.hurt * 10) | 0) % 2 === 0) {
    ctx.fillStyle = "rgba(224, 74, 74, 0.55)";
    ctx.fillRect(x + 1, y, 14, stand);
  }
  if (cage) drawCage();
  drawCops();
  }
  if (warner) {
    const wx = Math.round(warner.x);
    const wy = Math.round(G - ((warner.stand || 16) - 1));
    const moving = Math.abs((warner.tx ?? wx) - warner.x) > 0.4;
    const fr = moving && ((time * 8) | 0) % 2;
    const pointing = (Number(warner.point) || 0) > 0.05;
    rect(ctx, wx + 3, G, 8, 1, scenery.shadow);
    // Face the kid on the left while pointing.
    if (pointing) {
      ctx.save();
      ctx.translate(wx + 14, wy);
      ctx.scale(-1, 1);
      ctx.drawImage(fr ? warner.look.b : warner.look.a, 0, 0);
      ctx.restore();
    } else {
      ctx.drawImage(fr ? warner.look.b : warner.look.a, wx, wy);
    }
    if (warner.cast) {
      const hx = wx + 4;
      const hy = wy + 4;
      disc(ctx, hx, hy, 2, "#c77dff");
      disc(ctx, hx + 1, hy - 1, 1, "#fff3a8");
      if (R() < 0.35) {
        particles.push({ x: hx + rnd(-1, 2), y: hy + rnd(-2, 1), vx: rnd(-8, 8), vy: rnd(-20, -6), g: 40, life: 0.25, c: R() < 0.5 ? "#c77dff" : "#fff3a8" });
      }
    }
    // Warner stands on the right and points left at the kid.
    drawPointingArm(warner, true);
  }
  if (spellBolt) {
    const t = Math.min(1, spellBolt.t);
    const sx = spellBolt.x + (spellBolt.tx - spellBolt.x) * t;
    const sy = spellBolt.y + (spellBolt.ty - spellBolt.y) * t - Math.sin(t * Math.PI) * 10;
    disc(ctx, sx, sy, 3, "#c77dff");
    disc(ctx, sx - 1, sy - 1, 2, "#fff3a8");
    disc(ctx, sx + 1, sy, 1, "#ffffff");
    if (R() < 0.45) particles.push({ x: sx, y: sy, vx: rnd(-12, 12), vy: rnd(-12, 12), g: 0, life: 0.2, c: "#c77dff" });
  }
  if (mon?.alive) drawMonster(mon);
  projectiles.forEach(drawProj);
  particles.forEach((p) => (p.spr ? ctx.drawImage(p.spr, Math.round(p.x), Math.round(p.y)) : rect(ctx, p.x, p.y, p.s || 1, p.s || 1, p.c)));
  drawEffects();
  coins.forEach((c) => { if (c.t >= 0) drawCoin(c.x, c.y, time + c.x * 0.05); });
  floats.forEach((f) => text(f.s, Math.round(f.x), Math.round(f.y), "#f4c542"));
  drawLayer(scenery.fore, worldX * 1.3, H - 12);
  drawHearts();
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
