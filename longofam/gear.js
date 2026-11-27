/* Hero armour: helmets (head slot) and body armour (body slot).
   Each piece is pixel art layered onto any hero look (knight, princess, king, queen, any tint),
   and grants one arena special that can be used once per arena run. */

const K = "#1a1c2c";
const SKIN = new Set(["#f4c89c", "#d39a6c"]);

export const ABILITIES = {
  fifty: { name: "50/50", desc: "Removes wrong answers until only two are left." },
  sniff: { name: "Pet Sniff", desc: "Your pet sniffs out one wrong answer." },
  shield: { name: "Shield", desc: "Your next wrong answer costs no heart." },
  heal: { name: "Heal", desc: "Get back one lost heart." },
  swap: { name: "Swap", desc: "Trade this question for a new one." },
  power: { name: "Power Strike", desc: "Your next right answer hits twice." },
  lucky: { name: "Lucky Coin", desc: "The next monster you beat drops +1 coin." },
};

// slot: "head" or "body". price: suggested Market price in coins.
export const GEAR = {
  cap: { slot: "head", name: "Explorer Cap", price: 60, ability: "sniff" },
  flowercrown: { slot: "head", name: "Flower Crown", price: 100, ability: "heal" },
  knighthelm: { slot: "head", name: "Knight Helmet", price: 120, ability: "shield" },
  wizardhat: { slot: "head", name: "Wizard Hat", price: 150, ability: "fifty" },
  vikinghelm: { slot: "head", name: "Viking Helmet", price: 180, ability: "power" },
  goldcrown: { slot: "head", name: "Golden Crown", price: 250, ability: "lucky" },
  vest: { slot: "body", name: "Padded Vest", price: 60, ability: "lucky" },
  cape: { slot: "body", name: "Hero Cape", price: 120, ability: "heal" },
  chainmail: { slot: "body", name: "Chainmail", price: 150, ability: "shield" },
  starrobe: { slot: "body", name: "Star Robe", price: 180, ability: "swap" },
  plate: { slot: "body", name: "Knight Plate", price: 250, ability: "power" },
};

export const GEAR_KEYS = Object.keys(GEAR);

export function normalizeGear(key, slot) {
  const item = GEAR[key];
  return item && (!slot || item.slot === slot) ? key : null;
}

/* Rows on each hero sprite: crown = first row of the head below any crown, eye = eye row,
   body = torso rows that armour recolours. */
const ANCHOR = {
  knight: { crown: 0, eye: 5, body: [8, 11] },
  princess: { crown: 2, eye: 5, body: [8, 12] },
  king: { crown: 4, eye: 6, body: [11, 16] },
  queen: { crown: 4, eye: 6, body: [10, 15] },
};

/* Helmet art, 12 pixels wide, drawn starting at x = 1. The last row sits just above the eyes. */
const HELMETS = {
  cap: {
    rows: ["...KKKKK....", "..KCCCCCK...", "..KCcCCCCK..", "..KKKKKKKKKK"],
    pal: { K, C: "#8a5a2a", c: "#b07840" },
  },
  flowercrown: {
    rows: ["..P...Y...P.", ".PWP.YWY.PWP", "..GKGGKGGKG.", "..GGGGGGGGG."],
    pal: { K, P: "#ff8ac6", Y: "#f4d742", W: "#ffffff", G: "#3fa34d" },
  },
  knighthelm: {
    rows: ["......RR....", ".....RRR....", "...KKKKKKK..", "..KSSSSSSSK.", "..KSsSSSSSK.", "..KSKKSKKSK."],
    pal: { K, R: "#d63c3c", S: "#c8d0dc", s: "#ffffff" },
  },
  wizardhat: {
    rows: ["........K...", ".......KPK..", "......KPPK..", ".....KPYPK..", "....KPPPPK..", "....KPPPPPK.", "...KPPYPPPK.", "..KPPPPPPPPK", "KKKKKKKKKKKK", "KBBBBBBBBBBK"],
    pal: { K, P: "#6c4cd8", Y: "#f4d742", B: "#4a2e9e" },
  },
  vikinghelm: {
    rows: ["K..........K", "WK........KW", "KWK.KKKK.KWK", ".KWKSSSSKWK.", "..KSSsSSSSK.", "..KSSSSSSSK.", "..KYKYKYKYK."],
    pal: { K, W: "#f4efdc", S: "#9aa4b6", s: "#d6dcea", Y: "#f4c542" },
  },
  goldcrown: {
    rows: ["..K..K..K...", "..KYKKYKKYK.", "..KYYYYYYYK.", "..KYRYBYRYK.", "..KKKKKKKKK."],
    pal: { K, Y: "#f4c542", R: "#e04a4a", B: "#4aa3ff" },
  },
};

/* Body armour recolours the torso (skin and outlines stay). Cape also adds cloth behind the hero. */
const BODY = {
  vest: (x, y) => (x % 2 === 0 && y % 2 === 1 ? "#c98a4a" : "#8a5a2a"),
  chainmail: (x, y) => ((x + y) % 2 ? "#b8c0cc" : "#7a8296"),
  plate: (x, y, top, bottom) => (y === bottom ? "#f4c542" : y === top || x === 4 ? "#ffffff" : "#c8d0dc"),
  starrobe: (x, y) => ((x * 7 + y * 3) % 11 === 0 ? "#f4d742" : "#2e4a9e"),
  cape: (x, y, top) => (y === top && (x === 5 || x === 8) ? "#f4c542" : null),
};

const PAD = 6;

/* Row of the eyes on a (possibly helmeted) hero look, for framing portraits. */
export function heroEyeRow(kind, head) {
  const a = ANCHOR[kind] || ANCHOR.knight;
  return (normalizeGear(head, "head") ? PAD : 0) + a.eye;
}

function hexAt(data, i) {
  return `#${[data[i], data[i + 1], data[i + 2]].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  return [c, g];
}

function drawRows(g, rows, pal, ox, oy) {
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const col = pal[ch];
      if (!col) return;
      g.fillStyle = col;
      g.fillRect(ox + x, oy + y, 1, 1);
    });
  });
}

function dressFrame(src, kind, head, body) {
  const a = ANCHOR[kind] || ANCHOR.knight;
  const pad = head ? PAD : 0;
  const [c, g] = makeCanvas(src.width, src.height + pad);
  g.drawImage(src, 0, pad);
  if (head) {
    // A helmet replaces any crown: clear the rows above the head first.
    if (a.crown > 0) g.clearRect(0, pad, c.width, a.crown);
    const art = HELMETS[head];
    if (art) drawRows(g, art.rows, art.pal, 1, pad + a.eye - art.rows.length);
  }
  if (body && BODY[body]) {
    const [top, bottom] = a.body;
    const img = g.getImageData(0, 0, c.width, c.height);
    const d = img.data;
    for (let y = top; y <= bottom; y += 1) {
      for (let x = 2; x <= 11; x += 1) {
        const i = ((y + pad) * c.width + x) * 4;
        if (d[i + 3] < 200) continue;
        const hex = hexAt(d, i);
        if (hex === K || SKIN.has(hex)) continue;
        const col = BODY[body](x, y, top, bottom);
        if (!col) continue;
        d[i] = parseInt(col.slice(1, 3), 16);
        d[i + 1] = parseInt(col.slice(3, 5), 16);
        d[i + 2] = parseInt(col.slice(5, 7), 16);
      }
    }
    g.putImageData(img, 0, 0);
    if (body === "cape") {
      // Red cape flowing behind the hero (hero faces right, so the cape trails left).
      for (let y = top + 1; y <= Math.min(src.height - 2, bottom + 3); y += 1) {
        g.fillStyle = y === bottom + 3 ? K : "#c0392b";
        g.fillRect(1, y + pad, 1, 1);
        g.fillStyle = K;
        g.fillRect(0, y + pad, 1, 1);
      }
    }
  }
  return c;
}

const lookCache = new WeakMap();

/* Returns the hero look with gear on. Same shape as a hero look: { a, b, h, hand }. */
export function gearedLook(look, kind, head, body) {
  const h = normalizeGear(head, "head");
  const b = normalizeGear(body, "body");
  if (!look || (!h && !b)) return look;
  let byGear = lookCache.get(look);
  if (!byGear) lookCache.set(look, (byGear = new Map()));
  const key = `${kind}|${h}|${b}`;
  if (!byGear.has(key)) {
    const pad = h ? PAD : 0;
    byGear.set(key, {
      ...look,
      a: dressFrame(look.a, kind, h, b),
      b: dressFrame(look.b, kind, h, b),
      h: (look.h || look.a.height) + pad,
      hand: (look.hand ?? 10) + pad,
    });
  }
  return byGear.get(key);
}

/* Shop / inventory icon for one piece of gear, shown on a plain knight silhouette. */
export function drawGearIcon(target, key, scale = 3) {
  const item = GEAR[key];
  if (!item || !target) return;
  const [c, g] = makeCanvas(14, 12);
  if (item.slot === "head") {
    const art = HELMETS[key];
    drawRows(g, art.rows, art.pal, 1, 12 - art.rows.length - 1);
  } else {
    // A small torso mannequin wearing the armour.
    for (let y = 2; y <= 10; y += 1) {
      for (let x = 3; x <= 10; x += 1) {
        const edge = x === 3 || x === 10 || y === 2 || y === 10;
        g.fillStyle = edge ? K : BODY[key](x, y, 3, 9) || "#c0392b";
        g.fillRect(x, y, 1, 1);
      }
    }
    if (key === "cape") {
      g.fillStyle = "#c0392b";
      g.fillRect(1, 3, 2, 8);
      g.fillStyle = K;
      g.fillRect(0, 3, 1, 8);
    }
  }
  target.width = c.width;
  target.height = c.height;
  const tg = target.getContext("2d");
  tg.imageSmoothingEnabled = false;
  tg.clearRect(0, 0, c.width, c.height);
  tg.drawImage(c, 0, 0);
  target.style.width = `${c.width * scale}px`;
  target.style.height = `${c.height * scale}px`;
  target.style.imageRendering = "pixelated";
}

/* Abilities a kid can use this arena run, from their equipped helmet and armour (one use each). */
export function gearSpecials(head, body) {
  const out = [];
  for (const key of [normalizeGear(head, "head"), normalizeGear(body, "body")]) {
    if (!key) continue;
    const ability = GEAR[key].ability;
    // Two pieces with the same ability still give one use (the server pays Lucky Coin once per run).
    const same = out.find((sp) => sp.ability === ability);
    if (same) {
      same.gearName = `${same.gearName} + ${GEAR[key].name}`;
      continue;
    }
    out.push({ slot: GEAR[key].slot, gear: key, gearName: GEAR[key].name, ability, ...ABILITIES[ability] });
  }
  return out;
}
