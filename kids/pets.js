/* Companion pets for the market and forest battles. Default coin price is 50. */

const K = "#1a1c2c";
const RAINBOW = ["#e04a4a", "#f4862e", "#f4c542", "#5cc96a", "#4aa3ff", "#9b6ad6"];
const R = Math.random;
const rnd = (a, b) => a + R() * (b - a);

function rect(g, x, y, w, h, c) {
  g.fillStyle = c;
  g.fillRect(x | 0, y | 0, w, h);
}
function px(g, x, y, c) {
  g.fillStyle = c;
  g.fillRect(x | 0, y | 0, 1, 1);
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
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const [c, g] = canvas(w, h);
  for (let y = 0; y < h; y += 1) {
    const row = rows[y];
    for (let x = 0; x < row.length; x += 1) {
      const ch = row[x];
      if (ch === "." || ch === " ") continue;
      const col = pal[ch];
      if (col) px(g, x, y, col);
    }
  }
  return c;
}

function pixelCanvas(src, scale) {
  const [c, g] = canvas(src.width, src.height);
  g.drawImage(src, 0, 0);
  c.style.width = `${src.width * scale}px`;
  c.style.height = `${src.height * scale}px`;
  c.style.imageRendering = "pixelated";
  return c;
}


let time = 0;
let pet = { x: 4, hopY: 0, hopV: 0 };
let petKey = null;
let ctx = null;
let G = 60;
/* ---------- pets: follow the hero, cheer on hits ---------- */
const petDefs={
 puppy:{name:'Puppy',price:50,cheer:['#ff8aa0','#ffffff'],pal:{K,B:'#c98a4a',d:'#7a4a26',E:K,N:K,P:'#ff8aa0'},
  top:["......KKKK..",".....KBBBBK.","K...KdBBEBK.","BK..KdBBBBNK",".KKKKBBBBPK.",".KBBBBBBBK..",".KBBBBBBBK.."],
  a:[".KBK..KBK...",".KK...KK...."],b:["..KBKKBK....","..KK.KK....."]},
 kitten:{name:'Kitten',price:50,cheer:['#ff9cb4','#ffffff'],pal:{K,G:'#9aa4b6',g:'#6e7688',E:'#5cc96a',P:'#ff9cb4'},
  top:[".......K..K.","K.....KGKKGK","GK....KGGGGK",".GK...KEGEGK",".GK..KKGPGGK","..KKKGGGGGK.","..KGgGgGGK.."],
  a:["..KGK.KGK...","..KK..KK...."],b:["...KGKGK....","...KK.KK...."]},
 bunny:{name:'Bunny',price:50,hop:true,cheer:['#ff9cb4','#ffffff'],pal:{K,W:'#ffffff',w:'#d6dcea',P:'#ff9cb4',E:K},
  top:["......K.K.",".....KWKWK",".....KPKPK",".....KWKWK","....KWWWWK","KK..KWWEWK","KWK.KWWWPK",".KKKWWWWK.",".KWWWWWWK."],
  a:[".KwK.KwK.."],b:["..KwKwK..."]},
 hamster:{name:'Hamster',price:50,cheer:['#e8a050','#ffffff'],pal:{K,O:'#e8a050',W:'#fff0d8',E:K,P:'#ff9cb4'},
  top:["..KK..KK..",".KOOKKOOK.","KOOOOOOEOK","KOWWOOOOPK","KWWWWWOOOK",".KWWWWWOK."],
  a:["..KK..KK.."],b:["...KK.KK.."]},
 duckling:{name:'Duckling',price:50,cheer:['#f4d742','#ffffff'],pal:{K,Y:'#f4d742',y:'#d4b42a',O:'#f4862e',E:K},
  top:[".....KKK..","....KYYYK.","....KYYEOO","K..KYYYYK.","KYKKYYYYK.","KYYYyYYYK.",".KYYYYYK.."],
  a:["..KOKKOK.."],b:["...KOOK..."]},
 frog:{name:'Frog',price:50,hop:true,cheer:['#5cc96a','#ffffff'],pal:{K,G:'#5cc96a',g:'#3a8f4a',W:'#ffffff',E:K},
  top:[".KKK...KKK..","KWEWK.KWEWK.","KWWWKKKWWWK.","KGGGGGGGGGK.","KGKKKKKKKGK.","KgGGGGGGGgK."],
  a:["KgK.KKK.KgK."],b:[".KgK...KgK.."]},
 fox:{name:'Fox',price:50,cheer:['#e8702a','#ffffff'],pal:{K,O:'#e8702a',W:'#ffffff',E:K},
  top:["........K.K.",".......KOKOK","KK.....KOOEK","KOK...KOOOWK","KWOKKKOOOWKK",".KOOOOOOOK..",".KOOOOOOOK.."],
  a:[".KOK..KOK..."],b:["..KOKKOK...."]},
 turtle:{name:'Turtle',price:50,cheer:['#5cc96a','#b07840'],pal:{K,G:'#5cc96a',S:'#8a5a2a',s:'#b07840',E:K},
  top:["...KKKKK.....","..KSsSsSK.KK.",".KSsSsSsSKGEK","KSSSSSSSSSKGK","KKKKKKKKKKKK."],
  a:[".KGK...KGK..."],b:["..KGK.KGK...."]},
 penguin:{name:'Penguin',price:50,cheer:['#7fe0ff','#ffffff'],pal:{K,W:'#ffffff',B:'#2a3048',O:'#f4862e',E:K},
  top:["..KKKK..",".KBBBBK.",".KBBWEK.",".KBWWWOO","KBBWWWBK","KBWWWWBK","KBWWWWBK",".KWWWWK."],
  a:["..KOKOK."],b:["..KOOKO."]},
 owl:{name:'Owl',price:50,fly:true,cheer:['#f4c542','#ffffff'],pal:{K,B:'#a0622a',b:'#7a4a26',W:'#ffffff',E:K,O:'#f4862e'},
  top:[".K......K.",".KBKKKKBK.",".KBBBBBBK.","KBWWBBWWBK","KBWEBBWEBK","KBBBOOBBBK"],
  a:["KbBBBBBBbK","KbBWBWBBbK",".KBBBBBBK.","..KOK.KOK."],b:["bKBBBBBBKb","KbBWBWBBbK",".KBBBBBBK.","..KOK.KOK."]},
 ghost:{name:'Ghost Wisp',price:50,fly:true,cheer:['#bfefff','#ffffff'],pal:{K,W:'#e6f0ff',w:'#b8c8e8',E:K},
  top:["..KKKK..",".KWWWWK.","KWWWWWWK","KWEWWEWK","KWWWWWWK","KWWWWWwK","KWwWWwWK"],
  a:["KKWKKWKK"],b:["KWKKWKKW"]},
 robot:{name:'Robo Buddy',price:50,cheer:['#7fe0ff','#e04a4a'],pal:{K,S:'#c8d0e0',s:'#8890a8',C:'#7fe0ff',R:'#e04a4a'},
  top:["....R....","....K....","..KKKKK..",".KSSSSSK.",".KSCSCSK.",".KSSSSSK.","..KKKKK..",".KsSSSsK.",".KSsSsSK."],
  a:["..KK.KK.."],b:["..KK.KK.."]},
 slime:{name:'Slime Pal',price:50,hop:true,cheer:['#ff8ac6','#ffffff'],pal:{K,P:'#ff8ac6',p:'#ffc0dd',E:K},
  top:["...KKKK...","..KPPPPK..",".KPpPPPPK.","KPPPEPPEPK","KPPPPPPPPK","KPPPPPPPPK"],
  a:[".KKKKKKKK."],b:[".KKKKKKKK."]},
 unicorn:{name:'Unicorn',price:50,cheer:'rainbow',pal:{K,W:'#ffffff',w:'#e0e4f0',M:'#ff8ac6',m:'#9b6ad6',Y:'#f4d742',E:K},
  top:["..........KY.","........MMKK.",".......MmKWWK","M......MKWEWK","mM.....KWWWWK",".mMKKKKWWWKK.","..KWWWWWWWK..","..KwWWWWWwK.."],
  a:["..KWK..KWK...","..KK...KK...."],b:["...KWKKWK....","...KK.KK....."]},
 dragon:{name:'Mini Dragon',price:50,fly:true,cheer:['#f4862e','#f4d742','#e04a4a'],pal:{K,G:'#5cc96a',g:'#3a8f4a',Y:'#f4d742',E:K,R:'#e04a4a'},
  top:[],
  a:["..KK........",".KggK...KK..",".KgggK.KGGK.","..KggKKGGEGK","KKKKGGGGGGRK","KGGGGYYGGKK.",".KKGGYYGGK..","...KGKKGK...","...KK..KK..."],
  b:["............","........KK..",".......KGGK.","..KKKKKGGEGK","KKggggGGGGRK","KGKgggYGGKK.",".KKKKYYGGK..","...KGKKGK...","...KK..KK..."]}
};
Object.assign(petDefs,{
 rock:{name:'Pet Rock',price:50,hop:true,cheer:['#b0b6c2','#ffffff'],pal:{K,G:'#8a8f9a',g:'#6e7688',h:'#b0b6c2'},
  top:["............","...KKKKK....",".KKhhGGGKK..","KhhGGGGGGGK.","KhGGGGGGGgK.","KGGGGGgGGgK.","KgGGGGGGggK.",".KKKKKKKKK.."],a:[],b:[],
  extra(x,y,c=ctx){const j=pet.hopV||pet.hopY?2:1;[[3,1,0],[8,1,2]].forEach(([ex,ey,ph])=>{rect(c,x+ex-2,y+ey-2,5,5,K);rect(c,x+ex-1,y+ey-1,3,3,'#ffffff');
    const dx=Math.max(-1,Math.min(1,Math.round(Math.sin(time*10+ph)*j))),dy=Math.max(-1,Math.min(1,Math.round(Math.cos(time*7+ph)*j)));px(c,x+ex+dx,y+ey+dy,K)})}},
 himalayan:{name:'Himalayan Cat',price:50,cheer:['#4aa3ff','#f4e6d0'],pal:{K,C:'#f4e6d0',c:'#d8c4a8',B:'#5a3a2a',E:'#4aa3ff',P:'#ff9cb4'},
  top:[".......K..K.","K.....KBKKBK","BK....KCBBCK",".BK...KEBBEK",".BK..KKCBPCK","..KKKCCCCCK.","..KCcCcCCK.."],
  a:["..KBK.KBK...","..KK..KK...."],b:["...KBKBK....","...KK.KK...."]},
 tuxedo:{name:'Tuxedo Cat',price:50,cheer:['#f4d742','#ffffff'],pal:{K,B:'#2e3346',W:'#ffffff',E:'#f4d742',P:'#ff9cb4'},
  top:[".......K..K.","K.....KBKKBK","BK....KBBBBK",".BK...KEBEBK",".BK..KKBWPWK","..KKKBBWWBK.","..KBBBWWBK.."],
  a:["..KWK.KWK...","..KK..KK...."],b:["...KWKWK....","...KK.KK...."]},
 crab:{name:'Crab',price:50,cheer:['#e8603c','#ffffff'],pal:{K,R:'#e8603c',r:'#a8402a',E:K},
  top:["KKK......KKK","KRK.K..K.KRK",".KK.E..E.KK.","..KKKKKKKK..",".KRRRRRRRRK.","KRRRRKKRRRRK"],
  a:[".K.K.KK.K.K."],b:["K.K..KK..K.K"]},
 betta:{name:'Betta Fish',price:50,cheer:['#e04a4a','#6c4cd8','#7fc8f0'],glide:true,top:[],a:[],b:[]},
 gecko:{name:'Leopard Gecko',price:50,cheer:['#f4d06a','#5cc96a'],pal:{K,Y:'#f4d06a',y:'#d4a84a',S:'#5a3a2a',E:K},
  top:["..........KK.",".....KKKKKYYK","KK..KYSYYSYEK","SYKKYYYYSYYYK",".KYYSYYYYYKK."],
  a:["..KY.K.KY.K.."],b:["...KY.KY.K..."]},
 platypus:{name:'Platypus',price:50,cheer:['#8a5a3a','#7fc8f0'],pal:{K,B:'#8a5a3a',b:'#6a4228',D:'#3a3a48',E:K},
  top:["......KKKKKK....",".....KBBBBBBK...","KKKKKBBBBBBEBKKK","KbbbbBBBBBBBBDDK","KKKKKBBBBBBBBKKK",".....KbBBBBBbK.."],
  a:[".....KDK..KDK..."],b:["......KDKKDK...."]},
 shark:{name:'Sky Shark',price:50,fly:true,cheer:['#7f8fa6','#7fc8f0','#ffffff'],pal:{K,G:'#7f8fa6',g:'#5a6a80',W:'#ffffff',E:K,T:'#ffffff'},
  top:[],
  a:[".......KK.......","......KGGK......","KK..KKGGGGKKK...","KGKKGGGGGGGGGKK.",".KGGGGGGGGGGEGGK","KGKKWWWWWWWWKWTK","KK..KKKWWWWKKKK.","......KgK......."],
  b:[".......KK.......","......KGGK......","....KKGGGGKKK...","K..KGGGGGGGGGKK.","GKGGGGGGGGGGEGGK","KGKKWWWWWWWWKWTK",".K..KKKWWWWKKKK.","......KgK......."]},
 whale:{name:'Whale',price:50,fly:true,cheer:['#3b74d9','#bfe3ff','#ffffff'],pal:{K,B:'#3b74d9',b:'#27509e',W:'#dfe8f5',E:K,P:'#ff9cb4'},
  top:[],
  a:["..........KKKKK...","KK.....KKKBBBBBKK.","KBK..KKBBBBBBBBBBK",".KBKKBBBBBBBBBEBBK","..KBBBBBBBBBBBBPBK",".KBKWWWWWWWWWWWWBK","KBK.KWWWWWWWWWWWK.","KK...KKKKKKKKKKK.."],
  b:["..........KKKKK...",".......KKKBBBBBKK.","KK...KKBBBBBBBBBBK","KBKKKBBBBBBBBBEBBK","..KBBBBBBBBBBBBPBK","KBKKWWWWWWWWWWWWBK","KK..KWWWWWWWWWWWK.",".....KKKKKKKKKKK.."],
  extra(x,y,c=ctx){const t=time%3.2;if(t>.9)return;const h=Math.round(Math.min(1,t*4)*5);
    for(let i=0;i<h;i++)px(c,x+12,y-1-i,i%2?'#bfe3ff':'#ffffff');px(c,x+11,y-1-h,'#bfe3ff');px(c,x+13,y-1-h,'#bfe3ff');px(c,x+10,y-h,'#ffffff');px(c,x+14,y-h,'#ffffff')}}
});
function makeBowl(){const[c,g]=canvas(13,12);const cx=6,cy=6;
  for(let y=0;y<12;y++)for(let x=0;x<13;x++){const d=Math.hypot(x-cx,(y-cy)*1.05);if(y<2&&(x<3||x>9))continue;
    if(d<=6.2&&y>=1){const edge=d>5.2||y===1;g.fillStyle=edge?K:y<4?'#e6f4ff':y>=9?'#e8d090':'#7fc8f0';g.fillRect(x,y,1,1)}}
  rect(g,3,0,7,1,K);rect(g,2,4,1,1,'#bfe8ff');px(g,3,9,'#3a9d4a');px(g,3,8,'#5cc96a');px(g,4,7,'#3a9d4a');px(g,9,9,'#5cc96a');px(g,9,8,'#3a9d4a');
  px(g,2,6,'#ffffff');px(g,2,7,'#ffffff');return c}
const bettaR=sprite(["BB.R..","BBRRRE","BB.RR."],{B:'#6c4cd8',R:'#e04a4a',E:K});
const bowlS=makeBowl();
petDefs.betta.canvas=bowlS;
petDefs.betta.extra=(x,y,c=ctx)=>{const ph=time*1.2,fx=Math.round(3.5+Math.sin(ph)*2.5),fy=Math.round(5+Math.sin(time*2.3));const right=Math.cos(ph)>0;
  c.save();if(right)c.drawImage(bettaR,x+fx,y+fy);else{c.translate(x+fx+6,y+fy);c.scale(-1,1);c.drawImage(bettaR,0,0);}c.restore();
  if((time*2|0)%3===0)px(c,x+fx+(right?6:-1),y+fy-2,'#ffffff');px(c,x+10,y+5,'#ffffff')};

const PETS = {};
for (const [k, p] of Object.entries(petDefs)) {
  const A = p.canvas || sprite([...p.top, ...p.a], p.pal);
  const B = p.canvas || sprite([...p.top, ...p.b], p.pal);
  PETS[k] = {
    name: p.name,
    price: 50,
    fly: !!p.fly,
    hop: !!p.hop,
    glide: !!p.glide,
    cheer: p.cheer,
    a: A,
    b: B,
    w: A.width,
    h: A.height,
    extra: p.extra || null,
  };
}

export const DEFAULT_PET_PRICE = 50;
export const PET_KEYS = Object.keys(PETS);
export const PET_CATALOG = Object.fromEntries(
  Object.entries(PETS).map(([k, p]) => [k, { name: p.name, price: DEFAULT_PET_PRICE, fly: p.fly, hop: p.hop, glide: p.glide }])
);

export function normalizePet(key) {
  return PETS[key] ? key : null;
}

export function petIcon(key, scale = 3) {
  const p = PETS[key];
  if (!p) return null;
  const c = pixelCanvas(p.a, scale);
  if (p.extra) p.extra(0, 0, c.getContext("2d"));
  return c;
}

export function drawPetIcon(target, key) {
  const p = PETS[key];
  if (!p || !target) return;
  const g = target.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, target.width, target.height);
  const pad = 1;
  const scale = Math.max(1, Math.floor(Math.min((target.width - pad * 2) / p.w, (target.height - pad * 2) / p.h)));
  const x = Math.floor((target.width - p.w * scale) / 2);
  const y = Math.floor((target.height - p.h * scale) / 2);
  g.save();
  g.translate(x, y);
  g.scale(scale, scale);
  g.drawImage(p.a, 0, 0);
  if (p.extra) p.extra(0, 0, g);
  g.restore();
}

/** Battle-stage follower. Wire into the stage loop. */
export function createPetFollower(api) {
  return {
    set(key) {
      petKey = normalizePet(key);
      if (petKey) pet.x = api.heroX() - (PETS[petKey].w + 1);
      pet.hopY = 0;
      pet.hopV = 0;
    },
    get() { return petKey; },
    cheer(big) {
      if (!petKey) return;
      const P = PETS[petKey];
      pet.hopV = big ? -80 : -55;
      const cols = P.cheer === "rainbow" ? RAINBOW : P.cheer;
      for (let i = 0; i < (big ? 8 : 4); i += 1) {
        api.particles.push({
          x: pet.x + P.w / 2,
          y: api.G - P.h - (P.fly ? 10 : 0),
          vx: rnd(-20, 20),
          vy: -rnd(20, 45),
          g: 40,
          life: 0.6,
          c: cols[i % cols.length],
        });
      }
    },
    update(dt) {
      time = api.time();
      if (!petKey) return;
      const P = PETS[petKey];
      const tx = api.heroX() - P.w - 1;
      const busy = api.busy?.() || false;
      pet.x += (tx - pet.x) * Math.min(1, dt * (busy ? 4 : 6));
      if (P.hop && api.scroll() > 2 && pet.hopY === 0 && pet.hopV === 0 && R() < dt * 3) pet.hopV = -45;
      if (pet.hopV || pet.hopY) {
        pet.hopY += pet.hopV * dt;
        pet.hopV += 300 * dt;
        if (pet.hopY >= 0) { pet.hopY = 0; pet.hopV = 0; }
      }
      if (api.grounded?.() && R() < dt * 0.6) {
        api.particles.push({ x: pet.x + P.w - 3, y: api.G - P.h + 3, vx: 0, vy: 10, g: 80, life: 0.4, c: "#7fd0ff" });
      }
    },
    draw(drawCtx) {
      if (!petKey) return;
      ctx = drawCtx;
      G = api.G;
      time = api.time();
      const P = PETS[petKey];
      const moving = api.scroll() > 2 || Math.abs(api.heroX() - P.w - 1 - pet.x) > 1.5;
      const fr = (P.fly ? (time * 6 | 0) % 2 : moving && (time * 8 | 0) % 2) ? P.b : P.a;
      const x = Math.round(pet.x);
      const y = G - (P.h - 1) + Math.round(pet.hopY) + (P.fly ? -10 + Math.round(Math.sin(time * 3) * 2) : 0);
      rect(drawCtx, x + 2, G, Math.max(3, P.w - 4), 1, "#3e8c2c");
      drawCtx.drawImage(fr, x, y);
      if (P.extra) P.extra(x, y, drawCtx);
    },
  };
}
