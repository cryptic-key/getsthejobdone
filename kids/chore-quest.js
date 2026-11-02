/**
 * Chore Quest battle engine: 8-bit forest battle animations for a kids' chore app.
 * Zero dependencies, no image assets: every sprite is a pixel map in this file.
 *
 *   import { createChoreQuest } from './chore-quest.js';
 *   const quest = createChoreQuest(canvasEl, { dialogEl, coins: 120, hero: 'princess', weapon: 'broom', onComplete: r => console.log(r) });
 *   quest.setWeapon('mop');
 *   quest.play('bed');
 *
 * Heroes: knight, princess, king, queen.  Pets (25): puppy, kitten, bunny, hamster, duckling, frog, fox, turtle, penguin, owl, ghost, robot, slime, unicorn, dragon, rock, himalayan, tuxedo, crab, betta, gecko, platypus, shark, whale, rainbowshark
 * Monster keys (43): calc, mime, flask, alarm, robber, dust, sleep, dry, breakfast, dinner, lunchmade, basketball, bus, repair, helping, babysit, shirts, bed, shoes, pack, dishes, teeth, laundry, toys, reading, pet, plants, table, trash, counters, towels, bookshelf, lunch, coats, groceries, homework, dressed, petbrush, leaves, snow, outside, wood, bath
 * Weapon keys (35): broom, duster, mop, squeegee, vacuum, golden, toothbrush, spatula, rake, pencil, plunger, dustpan, sponge, spray, diamond, bubble, lint, watering, bookmark, bone, shovel, bat, mallet, duckhammer, pillowmace, rattle, butterknife, whisk, baguette, hockey, crossing, wrench, iron, bottle, foamfinger
 * Canvas renders at 128x72; scale it up with CSS and `image-rendering: pixelated`.
 */
export function createChoreQuest(canvasEl, opts = {}) {
const W=128,H=72,G=60;
const cv=canvasEl,ctx=cv.getContext('2d');
cv.width=W;cv.height=H;ctx.imageSmoothingEnabled=false;
const dlg=opts.dialogEl||null,live=opts.liveEl||null;
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- helpers ---------- */
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const R=mulberry(opts.seed??11);
const rnd=(a,b)=>a+R()*(b-a);
function rect(g,x,y,w,h,c){g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),w,h)}
function px(g,x,y,c){g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),1,1)}
function disc(g,cx,cy,r,c){g.fillStyle=c;for(let dy=-r;dy<=r;dy++){const hw=Math.floor(Math.sqrt(r*r-dy*dy)+.3);g.fillRect(Math.round(cx)-hw,Math.round(cy)+dy,hw*2+1,1)}}
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.imageSmoothingEnabled=false;return[c,g]}
function sprite(rows,pal){const w=Math.max(...rows.map(r=>r.length));const[c,g]=canvas(w,rows.length);
  rows.forEach((r,j)=>[...r].forEach((ch,i)=>{if(pal[ch]){g.fillStyle=pal[ch];g.fillRect(i,j,1,1)}}));return c}
const K='#1a1c2c';

/* ---------- sprites ---------- */
const heroPal={K,H:'#3fa34d',h:'#2a6e3a',S:'#f4c89c',s:'#d39a6c',E:K,B:'#7a4a26',b:'#f4c542'};
const heroTop=[
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
"...KHHKKHHK..."];
const heroA=sprite([...heroTop,"...KBBK.KBBK..","..KBBBK.KBBBK.","..KKKKK.KKKKK."],heroPal);
const heroB=sprite([...heroTop,"....KBBKBBK...","...KBBBKBBBK..","...KKKKKKKKK.."],heroPal);
const prinPal={K,C:'#f4c542',c:'#e04a4a',A:'#a0562a',a:'#6e3418',S:'#f4c89c',s:'#d39a6c',E:K,P:'#ff9cb4',D:'#ff8ac6',d:'#d65a9e',W:'#ffffff'};
const prinTop=[
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
"..KDDdDDdDDK.."];
const prinA=sprite([...prinTop,".KDDdDDdDDdDK.",".KDdDDdDDdDDK.","KWWWWWWWWWWWWK"],prinPal);
const prinB=sprite([...prinTop,"..KDdDDdDDdDK.",".KDDdDDdDDdDDK","KWWWWWWWWWWWWK"],prinPal);
const kingPal={K,C:'#f4c542',c:'#e04a4a',A:'#8a5a2a',S:'#f4c89c',s:'#d39a6c',E:K,G:'#dcdce6',R:'#c0392b',Y:'#f4c542',W:'#ffffff',B:'#5a3418'};
const kingTop=[
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
".KWRRRRRRRRWK."];
const kingA=sprite([...kingTop,".KWKWKWKWKWWK.","..KBBK..KBBK.."],kingPal);
const kingB=sprite([...kingTop,".KWWKWKWKWKWK.","...KBBKKBBK..."],kingPal);
const queenPal={K,C:'#f4c542',c:'#7fe0ff',A:'#3a2418',S:'#f4c89c',E:K,R:'#d64545',Y:'#f4c542',P:'#7a3fb0',p:'#552a80'};
const queenTop=[
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
"..KPPpPPpPPK.."];
const queenA=sprite([...queenTop,".KPPpPPpPPpPK.",".KPpPPpPPpPPK.","KYYYYYYYYYYYYK"],queenPal);
const queenB=sprite([...queenTop,"..KPpPPpPPpPK.",".KPPpPPpPPpPPK","KYYYYYYYYYYYYK"],queenPal);
// h = sprite height, hand = row of the weapon hand (always column 11)
const HEROES={knight:{name:'Adventurer',a:heroA,b:heroB,h:16,hand:10},princess:{name:'Princess',a:prinA,b:prinB,h:16,hand:10},
 king:{name:'King',a:kingA,b:kingB,h:20,hand:13},queen:{name:'Queen',a:queenA,b:queenB,h:20,hand:13}};
let heroKey=HEROES[opts.hero]?opts.hero:'knight';
/* ---------- pets: follow the hero, cheer on hits ---------- */
const P_=(rows,pal)=>sprite(rows,pal);
const petDefs={
 puppy:{name:'Puppy',price:150,cheer:['#ff8aa0','#ffffff'],pal:{K,B:'#c98a4a',d:'#7a4a26',E:K,N:K,P:'#ff8aa0'},
  top:["......KKKK..",".....KBBBBK.","K...KdBBEBK.","BK..KdBBBBNK",".KKKKBBBBPK.",".KBBBBBBBK..",".KBBBBBBBK.."],
  a:[".KBK..KBK...",".KK...KK...."],b:["..KBKKBK....","..KK.KK....."]},
 kitten:{name:'Kitten',price:150,cheer:['#ff9cb4','#ffffff'],pal:{K,G:'#9aa4b6',g:'#6e7688',E:'#5cc96a',P:'#ff9cb4'},
  top:[".......K..K.","K.....KGKKGK","GK....KGGGGK",".GK...KEGEGK",".GK..KKGPGGK","..KKKGGGGGK.","..KGgGgGGK.."],
  a:["..KGK.KGK...","..KK..KK...."],b:["...KGKGK....","...KK.KK...."]},
 bunny:{name:'Bunny',price:150,hop:true,cheer:['#ff9cb4','#ffffff'],pal:{K,W:'#ffffff',w:'#d6dcea',P:'#ff9cb4',E:K},
  top:["......K.K.",".....KWKWK",".....KPKPK",".....KWKWK","....KWWWWK","KK..KWWEWK","KWK.KWWWPK",".KKKWWWWK.",".KWWWWWWK."],
  a:[".KwK.KwK.."],b:["..KwKwK..."]},
 hamster:{name:'Hamster',price:120,cheer:['#e8a050','#ffffff'],pal:{K,O:'#e8a050',W:'#fff0d8',E:K,P:'#ff9cb4'},
  top:["..KK..KK..",".KOOKKOOK.","KOOOOOOEOK","KOWWOOOOPK","KWWWWWOOOK",".KWWWWWOK."],
  a:["..KK..KK.."],b:["...KK.KK.."]},
 duckling:{name:'Duckling',price:120,cheer:['#f4d742','#ffffff'],pal:{K,Y:'#f4d742',y:'#d4b42a',O:'#f4862e',E:K},
  top:[".....KKK..","....KYYYK.","....KYYEOO","K..KYYYYK.","KYKKYYYYK.","KYYYyYYYK.",".KYYYYYK.."],
  a:["..KOKKOK.."],b:["...KOOK..."]},
 frog:{name:'Frog',price:150,hop:true,cheer:['#5cc96a','#ffffff'],pal:{K,G:'#5cc96a',g:'#3a8f4a',W:'#ffffff',E:K},
  top:[".KKK...KKK..","KWEWK.KWEWK.","KWWWKKKWWWK.","KGGGGGGGGGK.","KGKKKKKKKGK.","KgGGGGGGGgK."],
  a:["KgK.KKK.KgK."],b:[".KgK...KgK.."]},
 fox:{name:'Fox',price:250,cheer:['#e8702a','#ffffff'],pal:{K,O:'#e8702a',W:'#ffffff',E:K},
  top:["........K.K.",".......KOKOK","KK.....KOOEK","KOK...KOOOWK","KWOKKKOOOWKK",".KOOOOOOOK..",".KOOOOOOOK.."],
  a:[".KOK..KOK..."],b:["..KOKKOK...."]},
 turtle:{name:'Turtle',price:200,cheer:['#5cc96a','#b07840'],pal:{K,G:'#5cc96a',S:'#8a5a2a',s:'#b07840',E:K},
  top:["...KKKKK.....","..KSsSsSK.KK.",".KSsSsSsSKGEK","KSSSSSSSSSKGK","KKKKKKKKKKKK."],
  a:[".KGK...KGK..."],b:["..KGK.KGK...."]},
 penguin:{name:'Penguin',price:250,cheer:['#7fe0ff','#ffffff'],pal:{K,W:'#ffffff',B:'#2a3048',O:'#f4862e',E:K},
  top:["..KKKK..",".KBBBBK.",".KBBWEK.",".KBWWWOO","KBBWWWBK","KBWWWWBK","KBWWWWBK",".KWWWWK."],
  a:["..KOKOK."],b:["..KOOKO."]},
 owl:{name:'Owl',price:300,fly:true,cheer:['#f4c542','#ffffff'],pal:{K,B:'#a0622a',b:'#7a4a26',W:'#ffffff',E:K,O:'#f4862e'},
  top:[".K......K.",".KBKKKKBK.",".KBBBBBBK.","KBWWBBWWBK","KBWEBBWEBK","KBBBOOBBBK"],
  a:["KbBBBBBBbK","KbBWBWBBbK",".KBBBBBBK.","..KOK.KOK."],b:["bKBBBBBBKb","KbBWBWBBbK",".KBBBBBBK.","..KOK.KOK."]},
 ghost:{name:'Ghost Wisp',price:300,fly:true,cheer:['#bfefff','#ffffff'],pal:{K,W:'#e6f0ff',w:'#b8c8e8',E:K},
  top:["..KKKK..",".KWWWWK.","KWWWWWWK","KWEWWEWK","KWWWWWWK","KWWWWWwK","KWwWWwWK"],
  a:["KKWKKWKK"],b:["KWKKWKKW"]},
 robot:{name:'Robo Buddy',price:400,cheer:['#7fe0ff','#e04a4a'],pal:{K,S:'#c8d0e0',s:'#8890a8',C:'#7fe0ff',R:'#e04a4a'},
  top:["....R....","....K....","..KKKKK..",".KSSSSSK.",".KSCSCSK.",".KSSSSSK.","..KKKKK..",".KsSSSsK.",".KSsSsSK."],
  a:["..KK.KK.."],b:["..KK.KK.."]},
 slime:{name:'Slime Pal',price:200,hop:true,cheer:['#ff8ac6','#ffffff'],pal:{K,P:'#ff8ac6',p:'#ffc0dd',E:K},
  top:["...KKKK...","..KPPPPK..",".KPpPPPPK.","KPPPEPPEPK","KPPPPPPPPK","KPPPPPPPPK"],
  a:[".KKKKKKKK."],b:[".KKKKKKKK."]},
 unicorn:{name:'Unicorn',price:600,cheer:'rainbow',pal:{K,W:'#ffffff',w:'#e0e4f0',M:'#ff8ac6',m:'#9b6ad6',Y:'#f4d742',E:K},
  top:["..........KY.","........MMKK.",".......MmKWWK","M......MKWEWK","mM.....KWWWWK",".mMKKKKWWWKK.","..KWWWWWWWK..","..KwWWWWWwK.."],
  a:["..KWK..KWK...","..KK...KK...."],b:["...KWKKWK....","...KK.KK....."]},
 dragon:{name:'Mini Dragon',price:750,fly:true,cheer:['#f4862e','#f4d742','#e04a4a'],pal:{K,G:'#5cc96a',g:'#3a8f4a',Y:'#f4d742',E:K,R:'#e04a4a'},
  top:[],
  a:["..KK........",".KggK...KK..",".KgggK.KGGK.","..KggKKGGEGK","KKKKGGGGGGRK","KGGGGYYGGKK.",".KKGGYYGGK..","...KGKKGK...","...KK..KK..."],
  b:["............","........KK..",".......KGGK.","..KKKKKGGEGK","KKggggGGGGRK","KGKgggYGGKK.",".KKKKYYGGK..","...KGKKGK...","...KK..KK..."]}
};
Object.assign(petDefs,{
 rock:{name:'Pet Rock',price:50,hop:true,cheer:['#b0b6c2','#ffffff'],pal:{K,G:'#8a8f9a',g:'#6e7688',h:'#b0b6c2'},
  top:["............","...KKKKK....",".KKhhGGGKK..","KhhGGGGGGGK.","KhGGGGGGGgK.","KGGGGGgGGgK.","KgGGGGGGggK.",".KKKKKKKKK.."],a:[],b:[],
  extra(x,y,c=ctx){const j=pet.hopV||pet.hopY?2:1;[[3,1,0],[8,1,2]].forEach(([ex,ey,ph])=>{rect(c,x+ex-2,y+ey-2,5,5,K);rect(c,x+ex-1,y+ey-1,3,3,'#ffffff');
    const dx=Math.max(-1,Math.min(1,Math.round(Math.sin(time*10+ph)*j))),dy=Math.max(-1,Math.min(1,Math.round(Math.cos(time*7+ph)*j)));px(c,x+ex+dx,y+ey+dy,K)})}},
 himalayan:{name:'Himalayan Cat',price:300,cheer:['#4aa3ff','#f4e6d0'],pal:{K,C:'#f4e6d0',c:'#d8c4a8',B:'#5a3a2a',E:'#4aa3ff',P:'#ff9cb4'},
  top:[".......K..K.","K.....KBKKBK","BK....KCBBCK",".BK...KEBBEK",".BK..KKCBPCK","..KKKCCCCCK.","..KCcCcCCK.."],
  a:["..KBK.KBK...","..KK..KK...."],b:["...KBKBK....","...KK.KK...."]},
 tuxedo:{name:'Tuxedo Cat',price:200,cheer:['#f4d742','#ffffff'],pal:{K,B:'#2e3346',W:'#ffffff',E:'#f4d742',P:'#ff9cb4'},
  top:[".......K..K.","K.....KBKKBK","BK....KBBBBK",".BK...KEBEBK",".BK..KKBWPWK","..KKKBBWWBK.","..KBBBWWBK.."],
  a:["..KWK.KWK...","..KK..KK...."],b:["...KWKWK....","...KK.KK...."]},
 crab:{name:'Crab',price:180,cheer:['#e8603c','#ffffff'],pal:{K,R:'#e8603c',r:'#a8402a',E:K},
  top:["KKK......KKK","KRK.K..K.KRK",".KK.E..E.KK.","..KKKKKKKK..",".KRRRRRRRRK.","KRRRRKKRRRRK"],
  a:[".K.K.KK.K.K."],b:["K.K..KK..K.K"]},
 betta:{name:'Betta Fish',price:220,cheer:['#e04a4a','#6c4cd8','#7fc8f0'],glide:true,top:[],a:[],b:[]},
 gecko:{name:'Leopard Gecko',price:180,cheer:['#f4d06a','#5cc96a'],pal:{K,Y:'#f4d06a',y:'#d4a84a',S:'#5a3a2a',E:K},
  top:["..........KK.",".....KKKKKYYK","KK..KYSYYSYEK","SYKKYYYYSYYYK",".KYYSYYYYYKK."],
  a:["..KY.K.KY.K.."],b:["...KY.KY.K..."]},
 platypus:{name:'Platypus',price:350,cheer:['#8a5a3a','#7fc8f0'],pal:{K,B:'#8a5a3a',b:'#6a4228',D:'#3a3a48',E:K},
  top:["......KKKKKK....",".....KBBBBBBK...","KKKKKBBBBBBEBKKK","KbbbbBBBBBBBBDDK","KKKKKBBBBBBBBKKK",".....KbBBBBBbK.."],
  a:[".....KDK..KDK..."],b:["......KDKKDK...."]},
 shark:{name:'Sky Shark',price:500,fly:true,cheer:['#7f8fa6','#7fc8f0','#ffffff'],pal:{K,G:'#7f8fa6',g:'#5a6a80',W:'#ffffff',E:K,T:'#ffffff'},
  top:[],
  a:[".......KK.......","......KGGK......","KK..KKGGGGKKK...","KGKKGGGGGGGGGKK.",".KGGGGGGGGGGEGGK","KGKKWWWWWWWWKWTK","KK..KKKWWWWKKKK.","......KgK......."],
  b:[".......KK.......","......KGGK......","....KKGGGGKKK...","K..KGGGGGGGGGKK.","GKGGGGGGGGGGEGGK","KGKKWWWWWWWWKWTK",".K..KKKWWWWKKKK.","......KgK......."]},
 whale:{name:'Whale',price:650,fly:true,cheer:['#3b74d9','#bfe3ff','#ffffff'],pal:{K,B:'#3b74d9',b:'#27509e',W:'#dfe8f5',E:K,P:'#ff9cb4'},
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
petDefs.rainbowshark=Object.assign({},petDefs.shark,{name:'Rainbow Shark',price:1000,cheer:'rainbow',rainbow:true});
const PETS={};for(const [k,p] of Object.entries(petDefs)){const A=p.canvas||sprite([...p.top,...p.a],p.pal),B=p.canvas||sprite([...p.top,...p.b],p.pal);
  PETS[k]={name:p.name,price:p.price,fly:!!p.fly,hop:!!p.hop,cheer:p.cheer,a:A,b:B,w:A.width,h:A.height,extra:p.extra||null,glide:!!p.glide};
  if(p.rainbow){const shade=['#a83232','#b8601e','#b8961e','#3a8f4a','#27509e','#6e47a8'];
    PETS[k].variants=['#e04a4a','#f4862e','#f4c542','#5cc96a','#4aa3ff','#9b6ad6'].map((c,i)=>[sprite([...p.top,...p.a],{...p.pal,G:c,g:shade[i]}),sprite([...p.top,...p.b],{...p.pal,G:c,g:shade[i]})]);
    PETS[k].a=PETS[k].variants[0][0];PETS[k].b=PETS[k].variants[0][1]}}
let petKey=opts.pet||null;const pet={x:4,hopY:0,hopV:0};
function petCheer(big){if(!petKey)return;const P=PETS[petKey];pet.hopV=big?-80:-55;const cols=P.cheer==='rainbow'?RAINBOW:P.cheer;
  for(let i=0;i<(big?8:4);i++)particles.push({x:pet.x+P.w/2,y:G-P.h-(P.fly?10:0),vx:rnd(-20,20),vy:-rnd(20,45),g:40,life:.6,c:cols[i%cols.length]})}
function updatePet(dt){if(!petKey)return;const P=PETS[petKey];const tx=heroX()-P.w-1;pet.x+=(tx-pet.x)*Math.min(1,dt*(busy?4:6));
  if(P.hop&&scroll>2&&pet.hopY===0&&pet.hopV===0&&R()<dt*3)pet.hopV=-45;
  if(pet.hopV||pet.hopY){pet.hopY+=pet.hopV*dt;pet.hopV+=300*dt;if(pet.hopY>=0){pet.hopY=0;pet.hopV=0}}
  if(grounded&&R()<dt*.6)particles.push({x:pet.x+P.w-3,y:G-P.h+3,vx:0,vy:10,g:80,life:.4,c:'#7fd0ff'})}
function drawPet(){if(!petKey)return;const P=PETS[petKey];const moving=scroll>2||Math.abs(heroX()-P.w-1-pet.x)>1.5;
  let fr=(P.fly?(time*6|0)%2:moving&&(time*8|0)%2)?P.b:P.a;
  if(P.variants){const v=P.variants[(time*8|0)%P.variants.length];fr=fr===P.b?v[1]:v[0];if(R()<.5)particles.push({x:pet.x+rnd(10,15),y:G-(P.h-1)-10+rnd(2,7),vx:-rnd(5,15),vy:rnd(-4,4),g:0,life:.4,c:RAINBOW[R()*6|0]})}const x=Math.round(pet.x);
  const y=G-(P.h-1)+Math.round(pet.hopY)+(P.fly?-10+Math.round(Math.sin(time*3)*2):0);
  rect(ctx,x+2,G,Math.max(3,P.w-4),1,SHC);ctx.drawImage(fr,x,y);if(P.extra)P.extra(x,y)}


const dustPal={K,g:'#b4b4c4',D:'#6e6e82',W:'#ffffff',E:K,P:'#e88aa6'};
const dustTop=[
"..KK.....KK.....",
".KgPK...KgPK....",
".KgPK...KgPK....",
"..KgK.K.KgK.....",
".KKgKKgKKgKK....",
"KgggggggggggK...",
"KggWWgggWWgggK..",
"KgDWEggDWEgggK..",
"KggggggggggggK.."];
const dustA=sprite([...dustTop,"KgggKKKKKggggK..",".KgggggggggggK..","KgDgggDgggDggK..",".KggDggggDgggK..","..KKK.KKKK.KK..."],dustPal);
const dustB=sprite([...dustTop,"KgggKDDDKggggK..",".KgggKKKgggggK..","KgDgggDgggDggK..",".KggDggggDgggK..","..KKK.KKKK.KK..."],dustPal);

const ghostPal={K,W:'#f6f6fb',w:'#c4c8de',E:K};
const ghostTop=[
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
".KWWwWWWwWWWwwK."];
const ghostA=sprite([...ghostTop,".KWKKWWKKWWKKwK.",".KK..KK..KK..KK."],ghostPal);
const ghostB=sprite([...ghostTop,".KKWWKKWWKKWWKK.","...KK..KK..KK..."],ghostPal);

const shoePal={K,r:'#d63c3c',W:'#ffffff',w:'#d8d8e0',E:K,T:'#ffffff'};
const shoeUpper=sprite([
"............KKKK......",
"...........KrrrrK.....",
"..........KrWrWrK.....",
".........KrWrWrrrK....",
"......KKKrrrrrrrrrK...",
"....KKrrrrWWrrrrrrrK..",
"..KKrrrrrrEWrrrrrrrK..",
".KrrrrrrrrrrrrrrrrrrK.",
".KTKTKTKTrrrrrrrrrrrK."],shoePal);
const shoeSole=sprite([
"KWWWWWWWWWWWWWWWWWWWWK",
"KwWwWwWwWwWwWwWwWwWwWK",
".KKKKKKKKKKKKKKKKKKKK."],shoePal);

const packPal={K,B:'#3b74d9',b:'#27509e',Y:'#f4c542',W:'#ffffff',E:K};
const packFlap=sprite([
"....KKKKKKKK....",
"...KBBBBBBBBK...",
"..KBBBBBBBBBBK..",
"..KBWWBBBBWWBK..",
"..KBEWBBBBEWBK..",
"..KbbbbbbbbbbK.."],packPal);
const packBody=sprite([
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
"...KK......KK..."],packPal);

const slimePal={K,G:'#5cc96a',g:'#a8f0b0',D:'#3a8f4a',W:'#ffffff',E:K};
const sl={
 p0:"....KKKKKKKK....",p1:"...KWWWWWWWWK...",p2:"....KKKKKKKK....",
 n:".....KGGGGK.....",a:"...KKGGGGGGKK...",b:"..KGGGgGGGGGGK..",
 e1:".KGGgWWGGGWWGGK.",e2:".KGGEWGGGEWGGGK.",f:"KGGGGGGGGGGGGGGK",
 m:"KGGGGGKKKKGGGGGK",mo:"KGGGGKKKKKKGGGGK",mi:"KGGGGKDDDDKGGGDK",
 l:"KGGGGGGGGGGGGGDK",s:"KDGGDGGGGDGGGDDK",z:".KKKKKKKKKKKKKK."};
const slimeA=sprite([sl.p0,sl.p1,sl.p2,sl.n,sl.a,sl.b,sl.e1,sl.e2,sl.f,sl.m,sl.l,sl.s,sl.z],slimePal);
const slimeB=sprite([sl.p0,sl.p1,sl.p2,sl.a,sl.b,sl.e1,sl.e2,sl.f,sl.f,sl.m,sl.l,sl.s,sl.z],slimePal);
const slimeC=sprite([sl.p0,sl.p1,sl.p2,sl.n,sl.a,sl.b,sl.e1,sl.e2,sl.f,sl.mo,sl.mi,sl.s,sl.z],slimePal);

const pastePal={K,W:'#f4f6fb',w:'#c8d0e0',B:'#3b74d9',R:'#e04a4a',E:K};
const pasteTop=["....KKKK....","....KBBK....","...KKBBKK...","..KBBBBBBK..","..KKKKKKKK..",".KWWWWWWWWK.",".KWWWWWWWwK.",".KRRRRRRRRK.",".KWEWWWEWwK.",".KWEWWWEWwK.",".KWWWWWWWwK."];
const pasteBot=[".KBBBBBBBBK.",".KWWWWWWWwK.","..KWWWWWWK..","..KKKKKKKK..","..KwKwKwKK.."];
const pasteA=sprite([...pasteTop,".KWWKKKKWwK.",".KWWWWWWWwK.",...pasteBot],pastePal);
const pasteB=sprite([...pasteTop,".KWWKRRKWwK.",".KWWKKKKWwK.",...pasteBot],pastePal);

const laundry=sprite([
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
".KKKKKKKKKKKKKKKKKK."],{K,R:'#e04a4a',r:'#a83232',B:'#3b74d9',b:'#27509e',Y:'#f4c542',y:'#c99a1e',G:'#5cc96a',g:'#3a8f4a',P:'#9b6ad6',p:'#6e47a8'});
const sockRows=["KKKK..","KRRK..","KWWK..","KWWK..","KWWWWK","KWWWWK","KKKKKK"];
const sockSpr=['#e04a4a','#3b74d9','#5cc96a'].map(c=>sprite(sockRows,{K,R:c,W:'#f4f6fb'}));

const golemPal={K,R:'#e04a4a',B:'#3b74d9',Y:'#f4c542',G:'#5cc96a',W:'#ffffff',E:K};
const golemRest=[
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
"....KKKKKKKK...."];
const golemHead=["....KKKKKKKK....","....KYYYYYYK....","....KYEWYEWK....","....KYYYYYYK...."];
const golemA=sprite([...golemHead,"....KYKKKKYK....",...golemRest],golemPal);
const golemB=sprite([...golemHead,"....KYKRRKYK....",...golemRest],golemPal);

const bookPal={K,R:'#c0392b',W:'#fff8e6',w:'#b8b0a0',E:K};
const bE="..................";
const bookUp=sprite([
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
".......KKKKK......"],bookPal);
const bookFlat=sprite([bE,bE,bE,bE,
"KKKKKKKK..KKKKKKKK",
"KRWWWWWWKKWWWWWWRK",
"KRWwwwWWEKWEwwwWRK",
"KRWWWWWWWKWWWWWWRK",
"KRWwwwwWWKWWwwwwRK",
"KKRRRRRRRKRRRRRRKK",
"..KKKKKKKKKKKKKK.."],bookPal);
const bookDown=sprite([bE,bE,bE,bE,
"......KKKKKK......",
"....KKWWEKWEKK....",
"..KKWWWWWKWWWWKK..",
".KRWWwwWWKWWwwWRK.",
"KRWWWWWWWKWWWWWWRK",
"KRRRKKKKKKKKKKRRRK",
"KKKK..........KKKK"],bookPal);

/* ---- wave 3 monsters ---- */
const gremPal={K,P:'#8e5bd0',p:'#5e3a96',W:'#ffffff',E:K,T:'#ffffff'};
const gremTop=["K............K","KPK........KPK","KPPK.KKKK.KPPK",".KPPKPPPPKPPK.","..KPPPPPPPPK..","..KPWWPPWWPK..","..KPEWPPEWPK..","..KPPPPPPPPK.."];
const gremBot=[".KpPPPPPPPPpK.",".KpKPPKKPPKpK.","..KK.KK.KK.KK."];
const gremA=sprite([...gremTop,"..KPKTKTKTPK..","..KPPKKKKPPK..",...gremBot],gremPal);
const gremB=sprite([...gremTop,"..KPKKKKKKPK..","..KPKTKTKKPK..",...gremBot],gremPal);
const kibbleS=sprite(["KKK","KBK","KKK"],{K,B:'#a0622a'});

const weedS=sprite([
"......KKKKK.....",".....KYYYYYK....","....KYYOOOYYK...","....KYOEOEOYK...","....KYYOOOYYK...",".....KYKYKYK....",
".......KGK......",".KKK...KGK...KKK","KLLLK..KGK..KLLK",".KLLLKKKGKKKLLK.","..KKK..KGK..KK..",
"...KKKKKKKKKK...","...KTTTTTTTTK...","....KTTTTTTK....","....KTtTTtTK....","....KTTTTTTK....",".....KKKKKK....."],
{K,Y:'#f4d742',O:'#e88a2e',E:K,G:'#3a9d4a',L:'#5cc96a',T:'#c8693a',t:'#8e4524'});

const forkS=sprite([
".K.K.K.K.","KSKSKSKSK","KSKSKSKSK","KSKSKSKSK","KSSSSSSSK","KSSSSSSSK","KSESSESSK","KSSKKKSSK",".KSSSSSK.","..KSSSK..",
"...KSK...","...KSK...","...KSK...","...KsK...","...KSK...","...KsK...","...KSK...","...KSK...","..KSSSK..","..KKKKK.."],
{K,S:'#c8d0e0',s:'#8890a8',E:K});

const canPal={K,L:'#9aa6b4',G:'#7f8c9a',g:'#55606e'};
const canLid=sprite(["......KK......","...KKKKKKKK...",".KKLLLLLLLLKK.","KLLLLLLLLLLLLK","KKKKKKKKKKKKKK"],canPal);
const canBody=sprite([".KGgGGgGGgGGK.",".KGgGGgGGgGGK.",".KGgGGgGGgGGK.",".KGgGGgGGgGGK.",".KGgGGgGGgGGK.",".KGgGGgGGgGGK.",
"..KgGGgGGgGK..","..KgGGgGGgGK..","..KKKKKKKKKK.."],canPal);
const peelS=sprite(["..KK..",".KYK.K","KYYKYK","KYYYYK",".KKKK."],{K,Y:'#f4d742'});

const crabA=sprite([
"KKK..........KKK","KCK..K....K..KCK","KCCK.E....E.KCCK",".KCK.K....K.KCK.","..KKKKKKKKKKKK..",".KCCCCCCCCCCCCK.",
"KCCCCCKKCCCCCCCK","KCCCCCCCCCCCCCCK",".KKcKKcKKcKKcKK.","K..K..K..K..K..K"],{K,C:'#e8603c',c:'#a8402a',E:K});
const crumbS=sprite(["tt","tT"],{t:'#e0b56a',T:'#a8763a'});

const mummyS=sprite([
"...KKKKKK...","..KBBBBBBK..",".KBWWWWWWBK.",".KBKYKKYKBK.",".KBWWWWWWBK.",".KBBBBBBBBK.","KBBWWWWWWBBK","KBBBBBBBBBBK",
"KBWWWWWWWWBK",".KBBBBBBBBK.",".KBWWWWWWBK.",".KBBBBBBBBK.",".KBWWWWWWBK.",".KBBBBBBBBK.",".KBBK..KBBK.",".KKK....KKK."],
{K,B:'#5aa9e6',W:'#f4f6fb',Y:'#ffe066'});

const stackS=sprite([
"..KKKKKKKKK...","..KRRRRRRRWK..","..KKKKKKKKKK..",".KKKKKKKKKKK..",".KBBBBBBBBWK..",".KKKKKKKKKKK..",
"..KKKKKKKKKKK.","..KGEWGGEWGWK.","..KGGGGGGGGWK.","..KGGKKKKGGWK.","..KKKKKKKKKKK.",
"KKKKKKKKKKKK..","KYYYYYYYYYWK..","KKKKKKKKKKKK..",".KKKKKKKKKKKK.",".KPPPPPPPPPWK.",".KKKKKKKKKKKK."],
{K,R:'#d64545',B:'#3b74d9',G:'#5cc96a',Y:'#f4c542',P:'#9b6ad6',W:'#fff8e6',E:K});
const bookS=sprite(["KKKKKK","KRRRWK","KRRRWK","KKKKKK"],{K,R:'#3b74d9',W:'#fff8e6'});

const lunchPal={K,R:'#d6453c',r:'#9a2e28',W:'#ffffff',E:K,Y:'#f4c542'};
const lunchLid=sprite([".....KKKKKK.....",".....K....K.....","..KKKKKKKKKKKK..",".KRREWRRRREWRRK.",".KrrrrrrrrrrrrK."],lunchPal);
const lunchBody=sprite([".KRRRRRRRRRRRRK.",".KRRRKYYKRRRRRK.",".KRRRRRRRRRRRRK.",".KrrrrrrrrrrrrK.","..KKKKKKKKKKKK.."],lunchPal);
const grapeS=sprite([".KK.","KPpK","KPPK",".KK."],{K,P:'#8e44ad',p:'#c39bd3'});

const rackS=sprite([
"....KKKKK.....","....KHHHK.....","..KKKKKKKKK...","....KSSSK.....","....KESEK.....","....KSSSK.....",
"KK...KBK...KK.",".KKKKCBCKKKK..","...KCCBCCK....","..KCCcBcCCK...","..KCCcBcCCK...","..KCYcBcYCK...",
"..KCCcBcCCK...","..KCCcBcCCK...","..KKKKBKKKK...","......KBK.....","......KBK.....","......KBK.....",
"....KKKBKKK...","...KBBBBBBBK..","...KKKKKKKKK.."],
{K,H:'#3d3a5c',S:'#c99a5b',E:K,B:'#7a4a26',C:'#2f6f8f',c:'#1f4f6a',Y:'#f4c542'});
const hangerS=sprite(["...H...","..H.H..",".H...H.","HHHHHHH"],{H:'#c8d0e0'});

const bagS=sprite([
"...G.G..KK....","..GGKGG.KYK...","...GKG..KYK...","..KKKKKKKKKKK.","..KBBBBBBBBBK.",".KBBBBBBBBBBBK",
".KBBEWBBBEWBBK",".KBBBBBBBBBBBK",".KBBBKKKKBBBBK",".KBBBBBBBBBBBK",".KbBBBBBBBBBbK",".KBBBBBBBBBBBK",
".KbbbbbbbbbbbK","..KKKKKKKKKKK."],{K,G:'#5cc96a',Y:'#e8c070',B:'#c99a5b',b:'#a07a40',E:K,W:'#ffffff'});
const canS=sprite(["KKKKK","KRRRK","KWWWK","KRRRK","KKKKK"],{K,R:'#d64545',W:'#f4f6fb'});

const pencilS=sprite([
".KKKKKK.",".KPPPPK.",".KPPPPK.",".KSSSSK.",".KYYYYK.","KYYYYYYK","KEWYEWYK","KYYYYYYK","KYKKKYYK","KYYYYYYK",
".KYYYYK.",".KYYYYK.",".KYyYYK.",".KYyYYK.",".KWWWWK.","..KWWK..","..KWWK..","...GK..."],
{K,P:'#f08aa0',S:'#c8d0e0',Y:'#f4c542',y:'#c99a1e',E:K,W:'#e8c890',G:'#3a3a48'});
const eraserS=sprite(["PP","Pp"],{P:'#f08aa0',p:'#c06070'});

const pjS=sprite([
"...........WW...","..........KWWK..","........KKRK....","......KKRRRK....","....KKRRRRRK....","...KRRRRRRRK....",
"..KWWWWWWWWWK...","..KSSSSSSSSSK...","..KSKKSSSKKSK...","..KSSSSSSSSSK...",".KKBBBKKKBBBKK..",
"KBBDBBBBBDBBBBK.","KBBBBBDBBBBBDBK.",".KBDBBBBDBBBBK..",".KBBBBBBBBBDBK..",".KBBBDBBBBBBBK..","..KKBKKBKKBKK..."],
{K,W:'#ffffff',R:'#d64545',S:'#e8ecff',B:'#6c8cff',D:'#ffffff'});

const furS=sprite([
"....K.K.K.....","..K.KFKFK.K...",".KFKFFFFFKFK..","KFFFFFFFFFFFK.",".KFWWFFFWWFFK.","KFFEWFFFEWFFFK",
".KFFFFFFFFFFK.","KFFFFFKKFFFFFK",".KFfFFFFFFfFK.","KFFFFfFFfFFFFK",".KFKFFKFFKFK..","..K.KK.KK.K..."],
{K,F:'#c98a4a',f:'#a06a30',W:'#ffffff',E:K});
const fluffS=sprite(["..FF.",".FFFF","FFFFF",".FF.."],{F:'#e8c08a'});

const leafPal={K,O:'#e8862e',R:'#c8402a',Y:'#f4c542',W:'#ffffff',E:K};
const leafPileS=sprite([
".......KK...........",".....KKOOKK..KK.....","...KKOORRRKKYYKK....","..KOOOOOROOOYYYYK...",
".KRRRKWWOOOWWKYYYK..",".KRRRKEWOOOEWKYYYYK.","KRRRRROOOOOOOOYYYYYK","KOOOYYYOOOKKOORRRRYK",
"KOOOYYYYOOOOORRRRRRK","KYYYRRRROOOOYYYOOORK","KYYRRRRROOOOYYYOOOOK",".KKKKKKKKKKKKKKKKKK."],leafPal);
const leafS=[leafPal.O,leafPal.R,leafPal.Y].map(c=>sprite(["..K..",".KOK.","KOOOK",".KOK.","..K.."],{K,O:c}));
const snowPal={K,W:'#f4f8ff',w:'#c8d8ee',O:'#f4862e',H:'#2a2a38',R:'#d64545',r:'#9a2626',E:K,B:'#7a4a26'};
const snowHead=["....KKKKK.....","....KHHHK.....","....KHHHK.....","..KKKKKKKKK..."];
const snowBody=["OOOOWWWWWWK...","..KWKWKWWWK...","..KRRRRRRRK...",".KRrRRRRRRRK.."];
const snowLow=["..KWWWEWWWWWK.",".KWWWWWWWWWWWK","KWWWWWEWWWWWWK","KWWWWWWWWWWWwK","KWwWWWWWWWWwwK",".KwwWWWWWWwwK.","..KKKKKKKKKK.."];
const snowA=sprite([...snowHead,"...KWWWWWK....","..KWEWWEWWK...",...snowBody,"B.KWRrWWWWWK.B",".BKWWRWWWWWKB.",...snowLow],snowPal);
const snowB=sprite([...snowHead,"B..KWWWWWK..B.",".BKWEWWEWWKB..",...snowBody,"..KWRrWWWWWK..","..KWWRWWWWWK..",...snowLow],snowPal);
const couchPal={K,C:'#c8403a',c:'#8a2a26',h:'#e86a5a',W:'#ffffff',E:K,T:'#ffffff'};
const couchTop=sprite([
"...KKKKKKKKKKKKKKKK...",
"..KChCCCCCCCCCCCChCK..",
"..KCCWWWCCCCCCWWWCCK..",
"..KCCKEWCCCCCCKEWCCK..",
"..KCCcCCCCCCCCCCcCCK..",
"KKKCCCCCCCCCCCCCCCCKKK",
"KhCKCCCCCCCCCCCCCCKChK",
"KCCKKKKKKKKKKKKKKKKCCK",
"KCCKTKTKTKTKTKTKTKKCCK"],couchPal);
const couchBot=sprite([
"KCCKccccccccccccccKCCK",
"KCCKCCCCCCKCCCCCCCKCCK",
"KCCKccccccKcccccccKCCK",
"KKKKKKKKKKKKKKKKKKKKKK",
".KK................KK."],couchPal);
const woodPal={K,B:'#b07840',w:'#e8c07a',r:'#b88848',W:'#ffffff',E:K,T:'#ffffff',D:'#3a0c14',G:'#5cc96a',g:'#3a8f4a'};
const logPlain=sprite([".KKKK.","KBBBBK","KBwwBK","KBwrBK","KBBBBK",".KKKK."],woodPal);
const logEye=sprite([".KKKK.","KBBBBK","KBWWBK","KBEWBK","KBBBBK",".KKKK."],woodPal);
const logMouthA=sprite([".KKKK.","KBwwBK","KwKKwK","KwwwwK","KBwwBK",".KKKK."],woodPal);
const logMouthB=sprite([".KKKK.","KBwwBK","KTDDTK","KDDDDK","KBwwBK",".KKKK."],woodPal);
function woodpile(mouth){const[c,g]=canvas(22,17);const o=2;
  g.drawImage(logPlain,o+6,1);px(g,o+8,0,'#5cc96a');px(g,o+9,0,'#3a8f4a');px(g,o+7,1,'#5cc96a');
  g.drawImage(logEye,o+3,6);g.drawImage(logEye,o+9,6);rect(g,o+4,5,2,1,K);rect(g,o+12,5,2,1,K);
  g.drawImage(logPlain,o,11);g.drawImage(mouth,o+6,11);g.drawImage(logPlain,o+12,11);
  [[0,9],[1,9],[1,8],[20,9],[21,9],[20,8]].forEach(([x,y])=>px(g,x,y,'#6b4426'));return c}
const woodA=woodpile(logMouthA),woodB=woodpile(logMouthB);
const logS=sprite(["KKKKKK","KBBBBw","KKKKKK"],woodPal);
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
/* basketball hoop */
const hoopPal={K,W:'#ffffff',w:'#c8d0e0',R:'#e8603c',S:'#8890a8',s:'#5a6278',E:K,N:'#f4f6fb'};
const hoopTop=["KKKKKKKKKKKKK.","KWWWWWWWWWWWK.","KWEWWWWWWEWWK.","KWWWKKKKKWWWK.","KWWWKRRRKWWWK.","KKKKKKKKKKKKK.",".KRRRRRRRRRK..","..KNKNKNKNK...","...KNKNKNK...."];
const hoopLow=[".....KSK......",".....KSK......",".....KSK......",".....KsK......",".....KSK......","...KKKSKKK....","..KSSSSSSSK...","..KKKKKKKKK..."];
const hoopA=sprite([...hoopTop,"....KNNNK.....",...hoopLow],hoopPal);
const hoopB=sprite([...hoopTop,"....KKKKK.....",...hoopLow],hoopPal);
const ballS=sprite([".KKKK.","KOKOOK","KKKKKK","KOOKOK",".KKKK."],{K,O:'#e8702a'});
/* school bus */
const busPal={K,Y:'#f4c542',y:'#c99a1e',W:'#bfe3ff',w:'#e6f4ff',E:K,D:'#3a3a48',R:'#e04a4a',S:'#8890a8'};
const busTop=["..KKKKKKKKKKKKKKKKKKKK..",".KYYYYYYYYYYYYYYYYYYYYK.","KYKWWKWWKWWKWWKKWWWWKYYK","KYKWwKWwKWwKWwKKWEWEKYYK","KYKKKKKKKKKKKKKKKKKKKYYK","KYYYYYYYYYYYYYYYYYYYYYRK","KDDDDDDDDDDDDDDDDDDDDDDK"];
const busLow=["KYYYYYYYYYYYYYYYYYYYYYSK",".KKKKKKKKKKKKKKKKKKKKKK.","...KDDK..........KDDK...","...KKKK..........KKKK..."];
const busA=sprite([...busTop,"KYYYYYYYYYYYYYYYYKKKKKYK",...busLow],busPal);
const busB=sprite([...busTop,"KYYYYYYYYYYYYYYYYKRRRKYK",...busLow],busPal);
const stopSignS=sprite([".KKKK.","KRRRRK","KRWWRK","KRRRRK",".KKKK.","..KK..","..KK.."],{K,R:'#e04a4a',W:'#ffffff'});
/* toolbox */
const toolPal={K,R:'#d63c3c',r:'#9a2626',S:'#c8d0e0',s:'#8890a8',W:'#ffffff',E:K,Y:'#f4c542',D:'#3a0c14'};
const toolLid=sprite(["......KKKKKK......","......KSKKSK......","..KKKKKKKKKKKKKK..",".KRRRRRRRRRRRRRRK.","KRRRWWRRRRRRWWRRRK","KRRREWRRRRRREWRRRK"],toolPal);
const toolBody=sprite(["KKKKKKKKKKKKKKKKKK","KRRRRRRKYYKRRRRRRK","KRRRRRRKKKKRRRRRRK","KrrrrrrrrrrrrrrrrK","KRRRRRRRRRRRRRRRRK","KrrrrrrrrrrrrrrrrK","KKKKKKKKKKKKKKKKKK"],toolPal);
const wrenchS=sprite(["KK..KK","KSKKSK",".KSSK.","..KSK.","..KSK.","..KSK.","..KKK."],{K,S:'#c8d0e0'});
const screwS=sprite(["KKKK","KSSK",".KS.",".KS.","..K."],{K,S:'#c8d0e0'});
const nailS=sprite(["KKK",".S.",".S.",".S.",".K."],{K,S:'#c8d0e0'});
const shirtPal={K,G:'#3fa34d',g:'#2a6e3a',Y:'#f4c542',W:'#ffffff',E:K,D:'#3a0c14',C:'#2a6e3a'};
function shirtFrame(flap,open){const rows=[
"......KKKKKK......",
"..KKKKGKCCKGKKKK..",
".KGGGGGGKKGGGGGGK.",
flap?"KGGGGGGGGGGGGGGGGK":"KGGGKGGGGGGGGKGGGK",
flap?"KGgGKWWGGGGWWKGgGK":"KGGKKWWGGGGWWKKGGK",
flap?".KKKKEWGGGGEWKKKK.":".KK.KEWGGGGEWK.KK.",
"....KGGGGGGGGK....",
open?"....KGGKDDKGGK....":"....KGGKKKKGGK....",
"....KYYYYYYYYK....",
"....KGGGGGGGGK....",
"....KGgGGGGgGK....",
"....KKKKKKKKKK...."];return sprite(rows,shirtPal)}
const shirtA=shirtFrame(false,false),shirtB=shirtFrame(true,true);
const buttonS=sprite([".KKK.","KWWWK","KWKWK","KWWWK",".KKK."],{K,W:'#f4efdc'});
const mStar=sprite(["..K..",".KYK.","KYYYK",".KYK.",".K.K."],{K,Y:'#f4d742'});
const mMoon=sprite([".KK.","KMMK","KMK.","KMMK",".KK."],{K,M:'#bfe3ff'});
const mHeart=sprite(["KK.KK","KPKPK","KPPPK",".KPK.","..K.."],{K,P:'#ff9cb4'});
const pacifierS=sprite([".KKK.","KBBBK",".KPK.",".KPK.","..K.."],{K,B:'#7fb4f0',P:'#ffd1e0'});
const rattleS=sprite([".KKK.","KYRYK","KRYRK",".KKK.","..K..","..K.."],{K,Y:'#f4d742',R:'#ff9cb4'});
function drawMobile(g,x,y,m){const sp=m.t*1.6,cx=x+10;
  rect(g,cx,y,1,3,'#8890a8');
  rect(g,cx-9,y+3,19,1,K);rect(g,cx-8,y+3,17,1,'#c98a4a');
  const hangs=[[mStar,-8,10],[mMoon,0,12],[mHeart,8,10]];
  for(const [spr,dx,len] of hangs){const sw=Math.round(Math.sin(sp+dx)*1.5),ox=cx+dx+sw;
    for(let i=0;i<len-4;i++)px(g,cx+dx+Math.round(sw*i/(len-4)),y+4+i,'#b0b6c2');g.drawImage(spr,ox-2,y+len)}
  disc(g,cx,y+8,4,K);disc(g,cx,y+8,3,'#fff0d8');px(g,cx-2,y+7,K);px(g,cx+2,y+7,K);
  if(m.open>.5)rect(g,cx-1,y+9,3,2,'#3a0c14');else{px(g,cx-1,y+10,K);px(g,cx,y+10,K);px(g,cx+1,y+10,K)}
  px(g,cx-3,y+9,'#ff9cb4');px(g,cx+3,y+9,'#ff9cb4')}
const glovePal={K,W:'#ffffff',w:'#d6dcea',E:K,M:'#3a0c14',P:'#ff9cb4'};
const gloveFingers=[
"...KK.KK.KK.....",
"..KWWKWWKWWK....",
"..KWWKWWKWWK.KK.",
"..KWWKWWKWWKKWWK",
"..KWWKWWKWWKKWWK"];
const gloveMid=[
".KKWwKWwKWwKWWK.",
"KWKWWWWWWWWWWWK.",
"KWWKWWWWWWWWWWK.",
"KWWKWEWWWWEWWK..",
".KWWWWWWWWWWWK..",
"..KWWWPMMPWWK...",
"...KWWWWWWWK...."];
const gloveCuff=["..KKKKKKKKKK....","..KWwWwWwWwK....","..KwWwWwWwWK....","..KKKKKKKKKK...."];
const gloveA=sprite([...gloveFingers,...gloveMid,...gloveCuff],glovePal);
const gloveB=sprite(["................","..KK.KK.KK......",".KWWKWWKWWK.....",".KWWKWWKWWK.KK..",".KWWKWWKWWKKWWK.",...gloveMid,...gloveCuff],glovePal);
/* ---- arena-only monsters ---- */
function outlined(rows,col,sc=1){const w=rows[0].length,h=rows.length;const[c,g]=canvas(w+2,h+2);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(rows[y][x]==='X')for(const[dx,dy]of[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,1],[-1,1],[1,-1]]){g.fillStyle=K;g.fillRect(x+1+dx,y+1+dy,1,1)}
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(rows[y][x]==='X'){g.fillStyle=col;g.fillRect(x+1,y+1,1,1)}return c}
const GLYPHS={pi:["XXXXX",".X.X.",".X.X.",".X.X.","X..XX"],plus:["..X..","..X..","XXXXX","..X..","..X.."],times:["X...X",".X.X.","..X..",".X.X.","X...X"],
  divide:["..X..",".....","XXXXX",".....","..X.."],equals:[".....","XXXXX",".....","XXXXX","....."],seven:["XXXXX","....X","...X.","..X..","..X.."],
  three:["XXXX.","....X",".XXX.","....X","XXXX."],nine:[".XXX.","X...X",".XXXX","....X",".XXX."],root:["...XX","...X.","X..X.",".XX..","..X.."]};
const glyphCols=['#f4c542','#7fe0ff','#ff8ac6','#9be04a','#f4862e'];
const glyphS=Object.values(GLYPHS).map((r,i)=>outlined(r,glyphCols[i%glyphCols.length]));
const calcPal={K,S:'#4a5060',s:'#353a48',G:'#a8d878',g:'#86b85a',E:'#1c2a14',W:'#e6ecf5',O:'#f4862e',R:'#e04a4a',D:'#1c2a14'};
const calcTop=["..KKKKKKKKKKKK..",".KSSSSSSSSSSSSK.",".KSKKKKKKKKKKSK.",".KSKGGGGGGGGKSK.",".KSKGEEGGEEGKSK."];
const calcLow=[".KSKKKKKKKKKKSK.",".KSSSSSSSSSSSSK.",".KSWWSWWSWWSOOK.",".KSSSSSSSSSSSSK.",".KSWWSWWSWWSOOK.",".KSSSSSSSSSSSSK.",".KSWWSWWSWWSOOK.",".KSSSSSSSSSSSSK.",".KSWWSWWSWWSRRK.",".KsssssssssssssK".slice(0,16),"..KKKKKKKKKKKK.."];
const calcA=sprite([...calcTop,".KSKGGGKKGGGKSK.",...calcLow,"...KK......KK..."],calcPal);
const calcB=sprite([...calcTop,".KSKGGKDDKGGKSK.",...calcLow,"....KK....KK...."],calcPal);
const mimePal={K,B:'#2a2a38',W:'#ffffff',E:K,R:'#e04a4a',w:'#d6dcea'};
const mimeRows=["....KKKK....","...KBBBBK...","..KBBBBBBKK.","..KWWWWWWK..","..KWKWWKWK..","..KWEWWEWK..","..KWWWWWWK..","..KWWRRWWK..","...KWWWWK...","..KKRRRRKK..",
  "..KBWBWBWBK.","..KWBWBWBWK.","..KBWBWBWBK.","...KWBWBWK..","...KKKKKKK..","...KBBKBBK..","...KBBKBBK.."];
const mimeA=sprite([...mimeRows,"..KKKK.KKKK."],mimePal),mimeB=sprite([...mimeRows.slice(0,7),"..KWKRRKWK..",...mimeRows.slice(8),"..KKKK.KKKK."],mimePal);
const gloveSmall=sprite([".KKK.","KWWWK","KWWWK","KWWWK",".KKK."],{K,W:'#ffffff'});
const croissantS=sprite([".KKKKK.","KOoOoOK","KOK.KOK","KK...KK"],{K,O:'#e8a050',o:'#b07030'});
const beretS=sprite(["..K..",".KKK.","KBBBK","KKKKK"],{K,B:'#2a2a38'});
function drawFlask(g,x,y,m){const cx=x+8,lvl=7+Math.round(Math.sin(m.t*3)*.6);
  for(let r=0;r<18;r++){const hw=r<4?2:Math.min(7.5,2+(r-3)*.62);const L=Math.round(cx-hw),Rr=Math.round(cx+hw);
    if(r===0){rect(g,cx-3,y,7,1,K);continue}
    if(r===17){rect(g,L,y+r,Rr-L+1,1,K);continue}
    px(g,L,y+r,K);px(g,Rr,y+r,K);
    for(let xx=L+1;xx<Rr;xx++){const liquid=r>=lvl;g.fillStyle=liquid?(r>14?'#6cb82e':'#9be04a'):'#d6f0f8';g.fillRect(xx,y+r,1,1)}
    if(r>=lvl&&r<15)px(g,L+1,y+r,'#c8f088')}
  px(g,cx-1,y+2,'#ffffff');px(g,cx-1,y+3,'#ffffff');
  rect(g,cx-4,y+10,3,3,'#ffffff');rect(g,cx+2,y+10,3,3,'#ffffff');px(g,cx-3,y+11,K);px(g,cx-2,y+11,K);px(g,cx+3,y+11,K);px(g,cx+4,y+11,K);
  if(m.open>.5)rect(g,cx-1,y+14,3,2,'#2a4a14');else{px(g,cx-1,y+14,'#2a4a14');px(g,cx,y+15,'#2a4a14');px(g,cx+1,y+14,'#2a4a14')}
  for(let i=0;i<4;i++){const ph=(m.t*1.4+i*.27)%1;const by=Math.round(16-ph*(16-lvl)),bx=Math.round(cx-4+i*2.6+Math.sin(m.t*4+i));px(g,bx,y+by,'#e6ffc8')}}
const dnaS=sprite(["RWWB",".RB.",".BR.","BWWR","BWWR",".BR.",".RB.","RWWB"],{R:'#e04a4a',B:'#3b74d9',W:'#ffffff'});
function spiralEye(g,cx,cy,spin){disc(g,cx,cy,4,K);disc(g,cx,cy,3,'#ffffff');
  for(let i=0;i<=16;i++){const a=i*.62+spin,r=i*.19;px(g,cx+Math.round(Math.cos(a)*r),cy+Math.round(Math.sin(a)*r),K)}}
function drawAlarm(g,x,y,m){const cx=x+12,cy=y+14,ring=(m.idle&&(m.t%2.2)<.5)||m.open>.5,j=ring?((m.t*30|0)%2?1:-1):0;
  rect(g,cx-6,cy+9,2,3,K);rect(g,cx+5,cy+9,2,3,K);rect(g,cx-9,cy+11,5,2,K);rect(g,cx+5,cy+11,5,2,K);
  for(const s of [-1,1]){const bx=cx+s*8+j,by=y+4;disc(g,bx,by,4,K);disc(g,bx,by,3,'#f4c542');px(g,bx-1,by-2,'#fff3a8');px(g,bx-2,by-1,'#fff3a8')}
  rect(g,cx,y,1,4,K);rect(g,cx-2+j,y,5,1,K);
  disc(g,cx,cy,11,K);disc(g,cx,cy,10,'#d63c3c');px(g,cx-7,cy-6,'#f07a6a');px(g,cx-8,cy-5,'#f07a6a');
  disc(g,cx,cy,9,K);disc(g,cx,cy,8,'#fff8e6');
  for(const [dx,dy] of [[0,-7],[-7,0],[7,0],[0,7]])px(g,cx+dx,cy+dy,'#9aa4b6');
  const spin=m.t*(m.open>.5?14:5);spiralEye(g,cx-4,cy-2,spin);spiralEye(g,cx+4,cy-2,spin);
  if(m.open>.5){rect(g,cx-2,cy+4,5,2,'#3a0c14');px(g,cx-1,cy+4,'#ffffff');px(g,cx+1,cy+4,'#ffffff')}else{px(g,cx-2,cy+4,K);px(g,cx+2,cy+4,K);rect(g,cx-1,cy+5,3,1,K)}
  if(ring)for(const s of [-1,1]){px(g,cx+s*13,y+2,'#ffffff');px(g,cx+s*14,y+4,'#ffffff');px(g,cx+s*13,y+6,'#ffffff')}}
const puzzleS=['#e04a4a','#3b74d9','#5cc96a','#f4c542'].map(c=>sprite(["..KK....",".KPPK...","KKPPKKK.","KPPPPPKK","KPPPPPPK","KPPPPPKK","KKKKKKK."],{K,P:c}));
/* Robber Rascal: cartoon burglar who throws grawlix (@#!$*) */
const robPal={K,B:'#2a2a38',b:'#45465a',S:'#f4c89c',s:'#d39a6c',M:'#1a1c2c',W:'#ffffff',E:K,g:'#8a8f9a',D:'#2a2a38',T:'#c9a46a',t:'#a07a40',G:'#3a8f4a'};
const robRows=["....KKKKK....","...KBbBBBK...","..KBBBBbBBK..","..KKKKKKKKK..","..KSSSSSSSK..","..KMWEMWEMK..","..KSSSSSSsK..","..KSgSgSgsK..","...KSKKKSK...",
  "..KWWWWWWWK..",".KSKDDDDDKSK.",".KSKWWWWWKSK.","..KKDDDDDKK..","...KWWWWWK...","...KDDDDDK...","...KBBKBBK...","...KBBKBBK..."];
const robA=sprite([...robRows,"..KKKK.KKKK.."],robPal);
const robB=sprite([...robRows.slice(0,8),"...KSKDDKSK..",...robRows.slice(9),"..KKKK.KKKK.."],robPal);
const sackS=sprite(["...KK...","..KTTK..",".KTTTTK.","KTTGTTTK","KTGGGTTK","KTTGTTTK","KTGGGTTK","KTTGTtTK",".KKKKKK."],robPal);
const GRAWLIX={at:[".XXX.","X.XXX","X.X.X","X.XX.",".XXXX"],hash:[".X.X.","XXXXX",".X.X.","XXXXX",".X.X."],bang:["XX","XX","XX","..","XX"],
  dollar:["..X..",".XXXX","X.X..",".XXX.","..X.X","XXXX.","..X.."],star:["X.X.X",".XXX.","XXXXX",".XXX.","X.X.X"],amp:[".XX..","X..X.",".XX..","X..XX",".XX.X"],
  pct:["XX..X","XX.X.","..X..",".X.XX","X..XX"]};
const grawCols=['#e04a4a','#f4c542','#ff8ac6','#7fe0ff','#9be04a','#f4862e'];
const grawS=Object.values(GRAWLIX).map((r,i)=>outlined(r,grawCols[i%grawCols.length]));
const cushionS=sprite(["KKKKK","KChCK","KCCCK","KKKKK"],couchPal);
const remoteS=sprite(["KKKKKK","KRrRRK","KKKKKK"],{K,R:'#3a3a48',r:'#e04a4a'});
const chipS=sprite([".KK.","KYYK","KYyK",".KK."],{K,Y:'#f4d06a',y:'#d4a84a'});
const snowballS=sprite([".KKK.","KWWWK","KWWwK","KWwwK",".KKK."],{K,W:'#ffffff',w:'#c8d8ee'});

function jaw(g,x,y,m,top,bottom,split,c0,cw,inside,teeth){const o=Math.round(m.open*4);g.drawImage(top,x,y-o);
  if(o>0){rect(g,x+c0-1,y+split-o,cw+2,o,K);rect(g,x+c0,y+split-o,cw,o,inside);if(teeth&&o>=2)for(let c=c0+1;c<c0+cw;c+=2){px(g,x+c,y+split-o,teeth);px(g,x+c,y+split-1,teeth)}}
  g.drawImage(bottom,x,y+split)}
async function toss(m,list,{open=true,lift=true}={}){if(open)m.openT=1;if(lift)m.lift=1;await wait(.25);
  for(const p of list){projectiles.push(Object.assign({k:'spr',x:m.x+2,y:G-12,vy:-50,g:150,spin:true},p));await wait(p.gap??.15)}m.openT=0;m.lift=0}
async function lash(m,d){m.openT=1;await wait(.2);const L=m.x+(d.lashX??10)-(heroX()+17);m.tongueT=L;await until(()=>m.tongue>=L-1.5);
  block(heroX()+17,G-(d.lashY??4),d.hit);m.tongueT=0;await until(()=>m.tongue<.6);m.tongue=0;m.openT=0}
async function lunge(m){m.lift=1;await wait(.25);m.lift=0;const L=-(m.x-(heroX()+18));m.lungeT=L;await until(()=>m.lunge<=L+1.5);
  block(heroX()+17,G-10,m.def.hit);m.lungeT=0;await until(()=>Math.abs(m.lunge)<.6);m.lunge=0}

/* ---------- background layers ---------- */
function layer(w,h,fn){const[c,g]=canvas(w,h);const wrap=f=>{f(0);f(-w);f(w)};fn(g,w,h,wrap);return c}
function pine(g,x,base,h,col){g.fillStyle=col;for(let i=0;i<h;i++){const hw=Math.floor((i%5)*.8+Math.floor(i/5)*1.2);g.fillRect(x-hw,base-h+i,hw*2+1,1)}g.fillRect(x,base,1,3)}
const sky=layer(W,H,(g)=>{const C=['#4f9fe0','#6db3ea','#8fcaf0','#b5def5'];
  for(let y=0;y<H;y++){const b=Math.min(3,Math.floor(y/10));g.fillStyle=C[b];g.fillRect(0,y,W,1);
    if(y%10===9&&b<3){g.fillStyle=C[b+1];for(let x=y%2;x<W;x+=2)g.fillRect(x,y,1,1)}}});
const clouds=layer(256,30,(g,w,h,wrap)=>{[[20,8],[90,14],[150,6],[210,12]].forEach(([x,y])=>wrap(o=>{
  disc(g,x+o,y,4,'#ffffff');disc(g,x+o+5,y-2,5,'#ffffff');disc(g,x+o+11,y,4,'#ffffff');rect(g,x+o-3,y+3,18,2,'#d6eefa')}))});
const hills=layer(256,H,(g)=>{g.fillStyle='#8fb9c9';for(let x=0;x<256;x++){const y=Math.round(30+6*Math.sin(x*Math.PI*2/128)+4*Math.sin(x*Math.PI*2/64+1));g.fillRect(x,y,1,H-y)}});
const farPines=layer(256,H,(g,w,h,wrap)=>{for(let x=2;x<256;x+=rnd(6,10)|0){const hh=rnd(9,17)|0,xx=x|0;wrap(o=>pine(g,xx+o,51,hh,'#5d9886'))}rect(g,0,51,256,H,'#5d9886')});
const midPines=layer(256,H,(g,w,h,wrap)=>{for(let x=4;x<256;x+=rnd(10,15)|0){const hh=rnd(15,25)|0,xx=x|0;wrap(o=>pine(g,xx+o,55,hh,'#356f57'))}rect(g,0,55,256,H,'#356f57')});
const trees=layer(256,H,(g,w,h,wrap)=>{[18,84,150,206].forEach((x,i)=>wrap(o=>{const X=x+o;
  rect(g,X-2,10,6,G-10,'#6b4426');rect(g,X+2,10,2,G-10,'#4a2e18');rect(g,X-4,G-2,10,2,'#4a2e18');
  disc(g,X-7,8+i%2*3,9,'#2e7d36');disc(g,X+8,6,10,'#2e7d36');disc(g,X,-2,11,'#2e7d36');
  disc(g,X-8,6+i%2*3,6,'#3d9a45');disc(g,X+7,3,7,'#3d9a45');disc(g,X-1,-4,7,'#3d9a45');
  px(g,X-9,3,'#6cc04a');px(g,X-8,2,'#6cc04a');px(g,X+5,0,'#6cc04a');px(g,X+6,-1,'#6cc04a');px(g,X-3,-6,'#6cc04a')}))});
const ground=layer(256,H,(g,w,h,wrap)=>{rect(g,0,G,256,H-G,'#9a6432');rect(g,0,G,256,3,'#5cc23c');rect(g,0,G,256,1,'#8ee05a');
  for(let x=0;x<256;x++){if(R()<.35)px(g,x,G-1,'#5cc23c');if(R()<.12)px(g,x,G+3,'#4a9a2e')}
  for(let i=0;i<70;i++){px(g,rnd(0,256),rnd(G+4,H),'#7a4a22')}
  for(let i=0;i<12;i++){const x=rnd(0,250)|0,y=rnd(G+5,H-3)|0;rect(g,x,y,3,2,'#b08a5a');px(g,x,y+1,'#8a6a40')}
  for(let i=0;i<10;i++){const x=rnd(0,256)|0,c=i%2?'#ff6b6b':'#ffe066';px(g,x,G-2,c);px(g,x,G-1,'#2f7a2f')}});
const fore=layer(256,12,(g,w,h,wrap)=>{[30,120,200].forEach(x=>wrap(o=>{disc(g,x+o,13,6,'#2a6e2e');disc(g,x+o+7,14,5,'#2a6e2e');px(g,x+o-2,8,'#4fa04a');px(g,x+o+6,10,'#4fa04a')}))});
function drawLayer(c,off,y=0){const w=c.width;const x=-(((Math.round(off))%w)+w)%w;ctx.drawImage(c,x,y);ctx.drawImage(c,x+w,y)}

/* ---------- tiny pixel font ---------- */
const FONT={'0':'111101101101111','1':'010110010010111','2':'111001111100111','3':'111001111001111','4':'101101111001001','5':'111100111001111','6':'111100111101111','7':'111001001001001','8':'111101111101111','9':'111101111001111','+':'000010111010000','-':'000000111000000',A:'010101111101101',B:'110101110101110',C:'011100100100011',Z:'111001010100111',S:'111100111001111',H:'101101111101101',O:'111101101101111',P:'111101111100100',M:'101111111101101',I:'111010010010111',N:'111101101101101',X:'101101010101101'};
function glyph(ch,x,y,col){const f=FONT[ch];if(!f)return;for(let k=0;k<15;k++)if(f[k]==='1')px(ctx,x+k%3,y+(k/3|0),col)}
function text(s,x,y,col){[...s].forEach((ch,i)=>{const f=FONT[ch];if(!f)return;for(let k=0;k<15;k++)if(f[k]==='1'){const gx=x+i*4+k%3,gy=y+(k/3|0);px(ctx,gx+1,gy+1,K);px(ctx,gx,gy,col)}})}

/* ---------- state ---------- */
let worldX=0,scroll=18,scrollTarget=18,shake=0,coinsTotal=opts.coins??0,hudPop=0,time=0;
const hero={ox:0,oxT:0,kx:0,jy:0,vy:0,pose:'walk',ang:-55,smear:0,alert:0};
let mon=null;const projectiles=[],particles=[],coins=[],floats=[];
const timers=[],conds=[];
const wait=s=>new Promise(r=>timers.push({t:s,r}));
const until=fn=>new Promise(r=>conds.push({fn,r}));
const heroX=()=>26+hero.ox+hero.kx;
const heroY=()=>G-(HEROES[heroKey].h-1)+hero.jy;

let full='',shown=0;
function say(t){full=t;shown=0;if(live)live.textContent=t;if(opts.onSay)opts.onSay(t)}

function burst(x,y,cols,n=12,sp=50){for(let i=0;i<n;i++){const a=R()*Math.PI*2,v=rnd(sp*.3,sp);particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-20,g:120,life:rnd(.25,.5),c:cols[i%cols.length]})}}
function block(x,y,cols){if(hurtMode){burst(x,y,['#e04a4a','#ff9a9a','#ffffff'],14,60);hero.kx=-6;hero.hurt=.7;if(!reduce)shake=.2;return}burst(x,y,['#ffffff',...cols],14,60);hero.kx=-3;if(!reduce)shake=.12}

/* ---------- monsters ---------- */
const MON={
 calc:{name:'Count Calculo',chore:'Arena: Math',coins:1,arenaOnly:true,w:16,h:18,attackName:'number barrage',
  intro:'COUNT CALCULO beeps and boops!',atk:'It fires a barrage of numbers and math symbols!',win:'Calculated!',
  hit:['#a8d878','#4a5060','#f4c542'],yoff:m=>m.idle?-((m.t*3|0)%2):0,
  draw(g,x,y,m){g.drawImage(m.open>.5||(m.idle&&(m.t*4|0)%2)?calcB:calcA,x,y)},
  attack(m){return toss(m,[0,1,2,3].map(()=>({s:aqPick(glyphS),y:G-12,vx:-rnd(70,88),vy:-rnd(30,60),g:120,spin:R()<.5,gap:.11})))}},
 mime:{name:'Le Mime',chore:'Arena: French',coins:1,arenaOnly:true,w:12,h:18,attackName:'croissant toss',
  intro:'LE MIME presses on an invisible wall...',atk:'Le Mime silently hurls croissants and berets!',win:'Très bien!',
  hit:['#ffffff','#2a2a38','#e04a4a'],yoff:()=>0,
  draw(g,x,y,m){g.drawImage(m.open>.5?mimeB:mimeA,x,y);if(m.idle||m.open>.5){const wv=Math.round(Math.sin(m.t*2.5)*2);g.drawImage(gloveSmall,x-4,y+6+wv);g.drawImage(gloveSmall,x-4,y+11-wv)}},
  attack(m){return toss(m,[{s:croissantS,y:G-12,vx:-74,vy:-50,gap:.18},{s:beretS,y:G-14,vx:-80,vy:-35,gap:.18},{s:croissantS,y:G-12,vx:-86,vy:-60}],{lift:false})}},
 flask:{name:'Flask Fiend',chore:'Arena: Nature & Science',coins:1,arenaOnly:true,w:16,h:18,attackName:'DNA blast',fizz:true,
  intro:'The FLASK FIEND bubbles and fizzes!',atk:'It blasts out bits of DNA!',win:'Experiment complete!',
  hit:['#9be04a','#e04a4a','#3b74d9'],yoff:m=>m.idle?-Math.round(Math.abs(Math.sin(m.t*4))):0,
  draw(g,x,y,m){drawFlask(g,x,y,m)},
  attack(m){return toss(m,[0,1,2].map(()=>({s:dnaS,y:G-16,vx:-rnd(70,84),vy:-rnd(40,65),g:130,spin:true,gap:.14})),{lift:false})}},
 alarm:{name:'Hypno-Clock',chore:'Arena: Puzzles',coins:1,arenaOnly:true,w:24,h:27,attackName:'puzzle piece storm',
  intro:'The HYPNO-CLOCK rings and spins its eyes... you are getting sleepy...',atk:'BRRRING! It flings puzzle pieces!',win:'Puzzle solved!',
  hit:['#d63c3c','#f4c542','#fff8e6'],yoff:()=>0,
  draw(g,x,y,m){drawAlarm(g,x,y,m)},
  attack(m){return toss(m,[0,1,2,3].map(i=>({s:puzzleS[i],y:G-16,vx:-rnd(68,86),vy:-rnd(35,60),g:130,spin:true,gap:.12})),{lift:false})}},
 robber:{name:'Robber Rascal',chore:'Arena: Good Morals',coins:1,arenaOnly:true,w:15,h:18,attackName:'grawlix barrage',
  intro:'ROBBER RASCAL tiptoes in with a sack of loot!',atk:'@#!$*! He hurls a string of grumbly symbols!',win:'Caught! He gives everything back.',
  hit:['#2a2a38','#ffffff','#f4c542'],yoff:m=>m.idle?-Math.round(Math.abs(Math.sin(m.t*5))):0,
  draw(g,x,y,m){g.drawImage(sackS,x+8,y+5+(m.idle?((m.t*5|0)%2):0));g.drawImage(m.open>.5?robB:robA,x,y)},
  attack(m){return toss(m,[0,1,2,3,4].map(()=>({s:aqPick(grawS),y:G-13,vx:-rnd(70,90),vy:-rnd(25,60),g:110,spin:R()<.4,gap:.09})),{lift:false})}},
 dust:{name:'Dust Bunny',chore:'Swept the floor',coins:5,w:16,h:14,attackName:'dust sneeze',
  intro:'A DUST BUNNY hops out from under the couch!',atk:'The Dust Bunny sneezes a dust cloud!',win:'Floor swept! The Dust Bunny is gone.',
  hit:['#b4b4c4','#6e6e82','#ffffff'],
  yoff:m=>m.idle?-Math.round(Math.abs(Math.sin(m.t*7))*2):0,
  draw(g,x,y,m){g.drawImage(m.open>.5?dustB:dustA,x,y)},
  async attack(m){m.openT=1;await wait(.3);projectiles.push({k:'cloud',x:m.x,y:G-7,vx:-62,vy:0,g:0});m.openT=0}},
 sleep:{name:'Bedtime Beast',chore:'Went to sleep without issues',coins:5,w:24,h:16,attackName:'pillow fight',chomp:true,
  intro:'The BEDTIME BEAST wants one more story, one more snack, one more drink!',atk:'It hurls pillows and a teddy bear!',win:'Lights out, no fuss! The Bedtime Beast is snoring happily.',
  hit:['#4a7ad8','#7fa8f0','#ffffff'],yoff:m=>m.idle?-((m.t*1.5|0)%2):0,
  draw(g,x,y,m){jaw(g,x,y+3,m,bedTop,bedBot,7,1,16,'#3a0c14','#ffffff');g.drawImage(headboard,x+18,y)},
  attack(m){return toss(m,[{k:'pillow',y:G-10,vx:-75,vy:-50,gap:.22},{s:teddyS,y:G-10,vx:-80,vy:-40,gap:.2},{k:'pillow',y:G-10,vx:-85,vy:-60}],{lift:false})}},
 dry:{name:'Diaper Monster',chore:'Kept diaper dry all night',coins:5,w:16,h:12,attackName:'drizzle toss',headroom:11,hpLift:11,drizzle:true,
  intro:'A DIAPER MONSTER waddles in with a drippy rain cloud!',atk:'It flings raindrops and baby powder!',win:'Dry all night! The rain cloud ran out of drips.',
  hit:['#ffffff','#7fb4f0','#ffb0c4'],yoff:m=>m.idle?-Math.round(Math.abs(Math.sin(m.t*6))*2):0,
  draw(g,x,y,m){const cy=y-8+((m.t*2|0)%2);
    disc(g,x+6,cy,3,K);disc(g,x+10,cy-1,3,K);rect(g,x+3,cy,11,3,K);disc(g,x+6,cy,2,'#9aa4b6');disc(g,x+10,cy-1,2,'#9aa4b6');rect(g,x+4,cy,9,2,'#9aa4b6');px(g,x+9,cy-2,'#c8d0e0');
    g.drawImage(m.open>.5?diaB:diaA,x,y+(m.idle?((m.t*4|0)%2):0)*0)},
  attack(m){return toss(m,[{s:dropS,spin:false,y:G-14,vx:-70,vy:-35,gap:.15},{s:powderS,spin:false,y:G-8,vx:-60,vy:-20,g:40,gap:.15},{s:dropS,spin:false,y:G-14,vx:-82,vy:-50}],{lift:false})}},
 breakfast:{name:'Toaster Terror',chore:'Helped make breakfast',coins:4,w:20,h:14,attackName:'toast launch',headroom:4,hpLift:4,
  intro:'A TOASTER TERROR clanks across the kitchen counter!',atk:'DING! It launches hot toast at you!',win:'Breakfast made! The Toaster Terror is unplugged and cooling down.',
  hit:['#d8dee8','#f0d090','#b07840'],yoff:m=>m.idle?-((m.t*3|0)%2):0,
  draw(g,x,y,m){const pop=Math.round(m.open*4);
    for(const c of [3,9]){rect(g,x+c,y-2-pop,5,4,K);rect(g,x+c+1,y-1-pop,3,3,'#b07840');rect(g,x+c+2,y-pop,1,2,'#f0d090')}
    g.drawImage(m.open>.5?toasterB:toasterA,x,y+1);
    rect(g,x+18,y+5,1,4,K);rect(g,x+18,y+4-(m.open>.5?0:-2),2,2,'#e04a4a');px(g,x+19,y+4-(m.open>.5?0:-2),K)},
  async attack(m){m.openT=1;await wait(.2);for(let i=0;i<6;i++)particles.push({x:m.x+5+(i%2)*6,y:G-15,vx:rnd(-6,6),vy:-rnd(12,22),g:-8,life:.8,c:R()<.5?'#9aa4b6':'#c8d0e0',s:2});
    for(let i=0;i<2;i++){projectiles.push({k:'spr',s:toastS,x:m.x+5+i*6,y:G-16,vx:-rnd(62,72),vy:-rnd(70,85),g:170,spin:true});await wait(.18)}m.openT=0}},
 dinner:{name:'Sizzle Skillet',chore:'Helped make dinner',coins:5,w:24,h:13,attackName:'sausage flip',sizzle:true,
  intro:'A SIZZLE SKILLET hisses and pops on the stove!',atk:'It flips sizzling sausages and peas at you!',win:'Dinner made! The Sizzle Skillet cooled off and went in the dishrack.',
  hit:['#6e7688','#f4c542','#ffffff'],yoff:m=>m.idle?-((m.t*4|0)%2):0,
  draw(g,x,y,m){g.drawImage(m.open>.5?panB:panA,x,y)},
  async attack(m){m.openT=1;m.lift=1;await wait(.22);for(let i=0;i<8;i++)particles.push({x:m.x+rnd(3,15),y:G-8,vx:rnd(-30,30),vy:-rnd(30,60),g:160,life:.4,c:'#f4e08a'});
    for(const p of [{s:sausageS,vx:-70,vy:-75},{s:peaS,vx:-80,vy:-55},{s:sausageS,vx:-78,vy:-90},{s:peaS,vx:-86,vy:-45}]){projectiles.push(Object.assign({k:'spr',x:m.x+8,y:G-10,g:170,spin:p.s===sausageS},p));await wait(.12)}
    m.lift=0;m.openT=0}},
 lunchmade:{name:'Sandwich Snapper',chore:'Helped make lunch',coins:4,w:18,h:13,attackName:'pickle spit',chomp:true,headroom:6,hpLift:6,
  intro:'A SANDWICH SNAPPER chomps its bun at you!',atk:'It spits pickles and tomato slices!',win:'Lunch made! The Sandwich Snapper got gobbled up.',
  hit:['#e0a858','#5cc96a','#e04a4a','#f4d742'],yoff:m=>m.idle?-((m.t*2|0)%2):0,
  draw(g,x,y,m){const o=Math.round(m.open*4);rect(g,x+9,y-4-o,1,4,'#e8c07a');disc(g,x+9,y-5-o,1,'#3a8f4a');px(g,x+9,y-5-o,'#e04a4a');
    jaw(g,x,y,m,sandTop,sandBot,6,1,16,'#3a0c14','#ffffff');px(g,x+5,y+9,'#f4d742');rect(g,x+12,y+9,1,2,'#f4d742')},
  attack(m){return toss(m,[{s:pickleS,y:G-8,vx:-72,vy:-45,gap:.13},{s:tomatoS,y:G-8,vx:-80,vy:-60,gap:.13},{s:pickleS,y:G-8,vx:-86,vy:-35}],{lift:false})}},
 basketball:{name:'Hoop Hornet',chore:'Practiced basketball',coins:4,w:14,h:18,attackName:'slam shot',
  intro:'The HOOP HORNET rattles its rim and dares you to play!',atk:'It fires a volley of basketballs!',win:'Swish! The Hoop Hornet admits you have game.',
  hit:['#e8702a','#ffffff','#8890a8'],yoff:()=>0,
  draw(g,x,y,m){const sw=m.idle?Math.round(Math.sin(m.t*3)):0;g.drawImage(m.open>.5?hoopB:hoopA,x+sw,y)},
  async attack(m){m.openT=1;await wait(.2);for(let i=0;i<3;i++){projectiles.push({k:'spr',s:ballS,x:m.x+5,y:G-12,vx:-rnd(70,82),vy:-rnd(75,95),g:220,spin:true,bounce:1});await wait(.18)}m.openT=0}},
 bus:{name:'School Bus Bully',chore:'Got ready for the bus on time',coins:5,w:24,h:11,attackName:'stop sign storm',
  intro:'The SCHOOL BUS BULLY honks: "HURRY UP, YOU\'RE LATE!"',atk:'Its stop sign arm flips out and flings stop signs!',win:'Ready on time! The School Bus Bully drove off to school.',
  hit:['#f4c542','#e04a4a','#ffffff'],yoff:m=>m.idle?-((m.t*5|0)%2):0,
  draw(g,x,y,m){g.drawImage(m.open>.5?busB:busA,x,y);if(m.open>.5){rect(g,x-4,y+3,5,5,K);rect(g,x-3,y+4,3,3,'#e04a4a');px(g,x-2,y+5,'#ffffff')}
    if(m.idle&&(m.t*2|0)%2){px(g,x+22,y+5,'#ffe066')}},
  async attack(m){m.openT=1;await wait(.25);for(let i=0;i<3;i++){projectiles.push({k:'spr',s:stopSignS,x:m.x,y:G-8,vx:-rnd(70,85),vy:-rnd(30,55),g:130,spin:true});await wait(.16)}m.openT=0}},
 repair:{name:'Toolbox Titan',chore:'Helped Dad fix something',coins:5,w:18,h:13,attackName:'hardware hurl',chomp:true,
  intro:'The TOOLBOX TITAN clanks open with a mouth full of bolts!',atk:'It hurls wrenches, screws and nails!',win:'All fixed! The Toolbox Titan snapped shut and went back to the garage.',
  hit:['#d63c3c','#c8d0e0','#f4c542'],yoff:m=>m.idle?-((m.t*2|0)%2):0,
  draw(g,x,y,m){jaw(g,x,y,m,toolLid,toolBody,6,1,16,'#3a0c14','#c8d0e0')},
  attack(m){return toss(m,[{s:wrenchS,y:G-10,vx:-72,vy:-55,gap:.15},{s:screwS,y:G-10,vx:-80,vy:-40,gap:.12},{s:nailS,y:G-10,vx:-86,vy:-60}],{lift:false})}},
 helping:{name:'Grabby Glove',chore:'Gave a helping hand',coins:4,w:16,h:16,hpLift:3,attackName:'snap and slap',
  intro:'The GRABBY GLOVE waves hello... then wiggles its fingers menacingly!',atk:'SNAP! It flicks sparkles, then winds up a big slap!',win:'What a helping hand! The Grabby Glove gives you a high five.',
  hit:['#ffffff','#d6dcea','#f4d742'],yoff:m=>m.idle?-Math.round(Math.abs(Math.sin(m.t*3))*2):0,
  draw(g,x,y,m){const wv=m.idle?Math.round(Math.sin(m.t*4)):0;g.drawImage(m.open>.5?gloveB:gloveA,x+wv,y)},
  async attack(m){m.openT=1;await wait(.18);burst(m.x+3,G-14,['#f4d742','#ffffff'],10,40);
    for(let i=0;i<3;i++){const a=-.3-i*.25;projectiles.push({k:'spr',s:starS,x:m.x+3,y:G-14,vx:-80,vy:Math.sin(a)*60,g:40,spin:false});await wait(.1)}
    m.openT=0;await until(()=>projectiles.length===0);await wait(.15);await lunge(m)}},
 babysit:{name:'Mobile Menace',chore:'Babysat a little sibling',coins:5,w:21,h:17,attackName:'pacifier pelt',
  intro:"The MOBILE MENACE spins over the crib and won't let anyone nap!",atk:'It flings pacifiers and rattles!',win:'Great babysitting! The Mobile Menace spun down and everyone is napping.',
  hit:['#f4d742','#bfe3ff','#ff9cb4'],yoff:m=>-6+Math.round(Math.sin(m.t*2)*2),
  draw(g,x,y,m){drawMobile(g,x,y,m)},
  attack(m){return toss(m,[{s:pacifierS,y:G-16,vx:-72,vy:-35,gap:.16},{s:rattleS,y:G-16,vx:-80,vy:-50,gap:.16},{s:pacifierS,y:G-16,vx:-86,vy:-30}])}},
 shirts:{name:'Shirt Shredder',chore:'Folded the clothes',coins:4,w:18,h:12,attackName:'sleeve snap',lashX:1,lashY:7,lashCol:['#3fa34d','#2a6e3a'],
  intro:'A SHIRT SHREDDER flaps its wrinkly sleeves at you!',atk:'It snaps a sleeve and fires its buttons!',win:'Clothes folded! The Shirt Shredder is crisp, flat and quiet.',
  hit:['#3fa34d','#f4c542','#ffffff'],yoff:m=>m.idle?-((m.t*3|0)%2):0,
  draw(g,x,y,m){g.drawImage(m.open>.5||(m.idle&&(m.t*4|0)%2)?shirtB:shirtA,x,y)},
  async attack(m){await lash(m,this);m.openT=1;await wait(.1);for(let i=0;i<3;i++){projectiles.push({k:'spr',s:buttonS,x:m.x+6,y:G-8,vx:-rnd(75,90),vy:-rnd(25,45),g:120,spin:false});await wait(.1)}m.openT=0}},
 bed:{name:'Sheet Ghost',chore:'Made the bed',coins:5,w:16,h:17,attackName:'pillow toss',
  intro:'A SHEET GHOST rises out of the messy bed!',atk:'The Sheet Ghost hurls a pillow!',win:'Bed made! The Sheet Ghost is tucked in for good.',
  hit:['#f6f6fb','#c4c8de','#cfe0ff'],
  yoff:m=>-7+Math.round(Math.sin(m.t*3)*2),
  draw(g,x,y,m){g.drawImage((m.t*4|0)%2?ghostB:ghostA,x,y)},
  async attack(m){m.lift=1;await wait(.25);projectiles.push({k:'pillow',x:m.x+2,y:G-20,vx:-78,vy:-30,g:110});m.lift=0;await wait(.3);
    projectiles.push({k:'pillow',x:m.x+2,y:G-16,vx:-82,vy:-45,g:130})}},
 shoes:{name:'Shoe Chomper',chore:'Tidied the shoes',coins:3,w:22,h:12,attackName:'tongue lash',
  intro:'A SHOE CHOMPER snaps out of the shoe pile!',atk:'It lashes out with its long tongue!',win:'Shoes tidied! The Chomper is paired up and quiet.',
  hit:['#d63c3c','#ffffff','#ff79a8'],chomp:true,
  yoff:()=>0,
  draw(g,x,y,m){const o=Math.round(m.open*4);g.drawImage(shoeUpper,x,y-o);
    if(o>0){rect(g,x+1,y-o+9,12,o,'#4a0e1c');rect(g,x+13,y-o+9,8,o,'#d63c3c');rect(g,x+21,y-o+9,1,o,K);
      if(o>=2)[3,5,7,9].forEach(c=>px(g,x+c,y+8,'#ffffff'))}
    g.drawImage(shoeSole,x,y+9)},
  async attack(m){m.openT=1;await wait(.2);const L=m.x+10-(heroX()+17);m.tongueT=L;await until(()=>m.tongue>=L-1.5);
    block(heroX()+17,G-5,this.hit);m.tongueT=0;await until(()=>m.tongue<.6);m.tongue=0;m.openT=0}},
 pack:{name:'Backpack Beast',chore:'Cleaned out the backpack',coins:4,w:16,h:17,attackName:'homework spit',
  intro:'The BACKPACK BEAST unzips its jaws!',atk:'It spits out crumpled homework!',win:'Backpack cleaned! The Beast is empty and zipped.',
  hit:['#3b74d9','#f4c542','#ffffff'],chomp:true,
  yoff:m=>m.idle?-((m.t*3|0)%2):0,
  draw(g,x,y,m){const o=Math.round(m.open*4);g.drawImage(packFlap,x,y-o);
    if(o>0){rect(g,x+2,y-o+6,12,o,K);rect(g,x+3,y-o+6,10,o,'#1c1433');for(let c=3;c<13;c+=2)px(g,x+c,y-o+6,'#f4c542')}
    g.drawImage(packBody,x,y+6)},
  async attack(m){m.openT=1;await wait(.25);for(let i=0;i<3;i++){projectiles.push({k:i===1?'pencil':'paper',x:m.x+4,y:G-12,vx:-rnd(70,85),vy:-rnd(40,60),g:140});await wait(.18)}m.openT=0}},
 dishes:{name:'Suds Slime',chore:'Did the dishes',coins:5,w:16,h:13,attackName:'bubble blast',
  intro:'A SUDS SLIME bubbles up out of the sink!',atk:'It blows a stream of soap bubbles!',win:'Dishes done! The Suds Slime got rinsed away.',
  hit:['#5cc96a','#bfefff','#ffffff'],
  yoff:()=>0,
  draw(g,x,y,m){g.drawImage(m.open>.5?slimeC:((m.t*3|0)%2?slimeB:slimeA),x,y)},
  async attack(m){m.openT=1;await wait(.25);for(let i=0;i<3;i++){projectiles.push({k:'bubble',x:m.x,y:G-6,vx:-48,vy:0,g:0,ph:i*2,base:G-6-i*3});await wait(.2)}m.openT=0}},
 teeth:{name:'Paste Pest',chore:'Brushed teeth',coins:3,w:12,h:18,attackName:'paste squirt',
  intro:'A PASTE PEST squeezes out of the bathroom drawer!',atk:'It squirts a stripe of toothpaste!',win:'Teeth brushed! The Paste Pest got its cap screwed on.',
  hit:['#f4f6fb','#e04a4a','#3b74d9'],
  yoff:m=>m.idle?-Math.round(Math.abs(Math.sin(m.t*6))*3):0,
  draw(g,x,y,m){g.drawImage(m.open>.5?pasteB:pasteA,x,y)},
  async attack(m){m.openT=1;await wait(.25);for(let i=0;i<3;i++){projectiles.push({k:'paste',x:m.x+4,y:G-18,vx:-rnd(66,78),vy:-rnd(45,60),g:150});await wait(.12)}m.openT=0}},
 laundry:{name:'Laundry Lump',chore:'Put away laundry',coins:5,w:20,h:15,attackName:'sock barrage',
  intro:'A LAUNDRY LUMP heaves out of the hamper, eyes wobbling!',atk:'It flings a pile of stinky socks!',win:'Laundry put away! The Laundry Lump got folded flat.',
  hit:['#e04a4a','#3b74d9','#f4c542','#9b6ad6'],
  yoff:m=>m.idle?-((m.t*2.5|0)%2):0,
  draw(g,x,y,m){g.drawImage(laundry,x,y);const j=m.shake>0||m.flash>0?2.4:1.1;
    [[5,5,0],[12,4,1.7]].forEach(([ex,ey,ph])=>{disc(g,x+ex,y+ey,3,K);disc(g,x+ex,y+ey,2,'#ffffff');
      const dx=Math.max(-1,Math.min(1,Math.round(Math.sin(m.t*11+ph)*j))),dy=Math.max(-1,Math.min(1,Math.round(Math.cos(m.t*7.3+ph*2)*j)));
      rect(g,x+ex+dx-1,y+ey+dy-1,2,2,K)})},
  async attack(m){m.lift=1;await wait(.2);for(let i=0;i<3;i++){projectiles.push({k:'sock',ci:i,x:m.x+3,y:G-14,vx:-rnd(70,85),vy:-rnd(45,65),g:150});await wait(.16)}m.lift=0}},
 toys:{name:'Block Golem',chore:'Cleaned up toys',coins:4,w:16,h:16,attackName:'block toss',
  intro:'A BLOCK GOLEM stacks itself up out of the toy mess!',atk:'It hurls toy blocks!',win:'Toys put away! The Block Golem tumbled back into the bin.',
  hit:['#e04a4a','#3b74d9','#f4c542','#5cc96a'],
  yoff:m=>m.idle?-((m.t*2|0)%2):0,
  draw(g,x,y,m){g.drawImage(m.open>.5?golemB:golemA,x,y)},
  async attack(m){m.openT=1;m.lift=1;await wait(.25);for(let i=0;i<2;i++){projectiles.push({k:'block',x:m.x+2,y:G-12,vx:-rnd(72,84),vy:-rnd(55,70),g:160,c:['#e04a4a','#f4c542'][i]});await wait(.22)}m.lift=0;m.openT=0}},
 reading:{name:'Page Flapper',chore:'Read a book',coins:5,w:18,h:11,attackName:'letter storm',
  intro:'A PAGE FLAPPER flutters down from the bookshelf!',atk:'It fires a flurry of letters!',win:'Book finished! The Page Flapper settles back on the shelf.',
  hit:['#fff8e6','#c0392b','#b8b0a0'],
  yoff:m=>-11+Math.round(Math.sin(m.t*3.5)*2),
  draw(g,x,y,m){g.drawImage(m.open>.5?bookFlat:[bookUp,bookFlat,bookDown,bookFlat][(m.t*10|0)%4],x,y)},
  async attack(m){m.openT=1;await wait(.25);for(const L of 'ABC'){projectiles.push({k:'letter',L,x:m.x+2,y:G-17,vx:-58,vy:0,g:0,ph:R()*6,base:G-17});await wait(.17)}m.openT=0}},
 pet:{name:'Kibble Gremlin',chore:'Fed the pet',coins:3,w:14,h:13,attackName:'kibble spray',
  intro:'A KIBBLE GREMLIN raids the pet food bin!',atk:'It sprays a handful of kibble!',win:'Pet fed! The Kibble Gremlin scampered off full.',
  hit:['#8e5bd0','#a0622a','#ffffff'],yoff:m=>m.idle?-Math.round(Math.abs(Math.sin(m.t*8))*2):0,
  draw(g,x,y,m){g.drawImage(m.open>.5?gremB:gremA,x,y)},
  attack(m){return toss(m,[0,1,2,3].map(()=>({s:kibbleS,vx:-rnd(65,85),vy:-rnd(30,70),gap:.08})),{lift:false})}},
 plants:{name:'Wilty Weed',chore:'Watered the plants',coins:3,w:16,h:17,attackName:'vine whip',lashX:2,lashY:8,lashCol:['#5cc96a','#2e7d36'],
  intro:'A WILTY WEED droops out of a thirsty pot!',atk:'It whips a vine at you!',win:'Plants watered! The Wilty Weed perked right up.',
  hit:['#5cc96a','#f4d742','#c8693a'],yoff:()=>0,
  draw(g,x,y,m){g.drawImage(weedS,x,y)},attack(m){return lash(m,this)}},
 table:{name:'Fork Knight',chore:'Set the table',coins:4,w:9,h:20,attackName:'fork joust',
  intro:'A FORK KNIGHT rises from the cutlery drawer!',atk:'It charges with a joust!',win:'Table set! The Fork Knight took its place by the plate.',
  hit:['#c8d0e0','#ffffff','#8890a8'],yoff:m=>m.idle?-((m.t*3|0)%2):0,
  draw(g,x,y,m){g.drawImage(forkS,x,y)},attack(m){return lunge(m)}},
 trash:{name:'Garbage Goblin',chore:'Took out the trash',coins:4,w:14,h:14,attackName:'banana peel toss',chomp:true,
  intro:'A GARBAGE GOBLIN peeks out from under the bin lid!',atk:'It lobs slimy banana peels!',win:'Trash out! The Garbage Goblin got hauled to the curb.',
  hit:['#7f8c9a','#f4d742','#5cc96a'],yoff:()=>0,
  draw(g,x,y,m){jaw(g,x,y,m,canLid,canBody,5,2,10,'#1c1433',null);const o=Math.round(m.open*4);if(o>=2){px(g,x+4,y+5-o+1,'#ffe066');px(g,x+8,y+5-o+1,'#ffe066')}},
  attack(m){return toss(m,[{s:peelS,vx:-75,vy:-60},{s:peelS,vx:-82,vy:-45}],{lift:false})}},
 counters:{name:'Crumb Crab',chore:'Wiped the counters',coins:3,w:16,h:10,attackName:'crumb flick',
  intro:'A CRUMB CRAB scuttles across the counter!',atk:'It flicks a pinch of crumbs!',win:'Counters wiped! The Crumb Crab got swept away.',
  hit:['#e8603c','#e0b56a','#ffffff'],yoff:m=>m.idle?-((m.t*6|0)%2):0,
  draw(g,x,y,m){g.drawImage(crabA,x,y)},
  attack(m){return toss(m,[0,1,2,3,4].map(()=>({s:crumbS,spin:false,y:G-6,vx:-rnd(70,90),vy:-rnd(20,60),gap:.06})))}},
 towels:{name:'Towel Mummy',chore:'Folded the towels',coins:4,w:12,h:16,attackName:'towel snap',lashX:1,lashY:9,lashCol:['#5aa9e6','#f4f6fb'],
  intro:'A TOWEL MUMMY shuffles out of the linen closet!',atk:'It snaps a loose towel end!',win:'Towels folded! The Towel Mummy is neatly stacked.',
  hit:['#5aa9e6','#f4f6fb'],yoff:m=>m.idle?-((m.t*2|0)%2):0,
  draw(g,x,y,m){g.drawImage(mummyS,x,y)},attack(m){return lash(m,this)}},
 bookshelf:{name:'Book Stack',chore:'Tidied the bookshelf',coins:3,w:14,h:17,attackName:'book topple',
  intro:'A BOOK STACK wobbles off the shelf!',atk:'Books come tumbling off the top!',win:'Bookshelf tidy! The Book Stack is back in neat rows.',
  hit:['#d64545','#3b74d9','#f4c542','#fff8e6'],yoff:()=>0,
  draw(g,x,y,m){g.drawImage(stackS,x+(m.idle&&(m.t*2|0)%2?1:0),y)},
  attack(m){return toss(m,[{s:bookS,y:G-17,vx:-70,vy:-40,gap:.25},{s:bookS,y:G-17,vx:-80,vy:-55}])}},
 lunch:{name:'Lunchbox Mimic',chore:'Packed lunch',coins:3,w:16,h:10,attackName:'grape spit',chomp:true,
  intro:'A LUNCHBOX MIMIC snaps its lid at you!',atk:'It spits a volley of grapes!',win:'Lunch packed! The Lunchbox Mimic is ready for school.',
  hit:['#d6453c','#8e44ad','#ffffff'],yoff:()=>0,
  draw(g,x,y,m){jaw(g,x,y,m,lunchLid,lunchBody,5,2,12,'#3a0c14','#ffffff')},
  attack(m){return toss(m,[0,1,2].map(()=>({s:grapeS,spin:false,y:G-7,vx:-rnd(70,80),vy:-rnd(25,40),gap:.12})),{lift:false})}},
 coats:{name:'Coat Rack Scarecrow',chore:'Hung up coats',coins:3,w:14,h:21,attackName:'hanger fling',
  intro:'A COAT RACK SCARECROW creaks to life by the door!',atk:'It flings coat hangers!',win:'Coats hung up! The Scarecrow stands still again.',
  hit:['#2f6f8f','#c8d0e0','#7a4a26'],yoff:()=>0,
  draw(g,x,y,m){g.drawImage(rackS,x+(m.idle&&(m.t*1.5|0)%2?1:0),y)},
  attack(m){return toss(m,[{s:hangerS,y:G-15,vx:-72,vy:-35,gap:.25},{s:hangerS,y:G-15,vx:-80,vy:-50}])}},
 groceries:{name:'Grocery Bag Blob',chore:'Put away groceries',coins:4,w:14,h:14,attackName:'can roll',
  intro:'A GROCERY BAG BLOB flops onto the kitchen floor!',atk:'It rolls a soup can at you!',win:'Groceries away! The bag is folded flat.',
  hit:['#c99a5b','#5cc96a','#d64545'],yoff:m=>m.idle?-Math.round(Math.abs(Math.sin(m.t*5))*2):0,
  draw(g,x,y,m){g.drawImage(bagS,x,y)},
  attack(m){return toss(m,[{s:canS,y:G-2,vy:0,g:0,vx:-70,gap:.35},{s:canS,y:G-2,vy:0,g:0,vx:-80}],{lift:false})}},
 homework:{name:'Pencil Imp',chore:'Finished homework',coins:5,w:8,h:18,attackName:'eraser shot',
  intro:'A PENCIL IMP scribbles out of the homework pile!',atk:'It fires eraser bits!',win:'Homework done! The Pencil Imp is back in the case.',
  hit:['#f4c542','#f08aa0','#3a3a48'],yoff:m=>m.idle?-Math.round(Math.abs(Math.sin(m.t*7))*3):0,
  draw(g,x,y,m){g.drawImage(pencilS,x,y)},
  attack(m){return toss(m,[0,1,2,3].map(()=>({s:eraserS,spin:false,y:G-16,vx:-rnd(75,90),vy:-rnd(5,25),g:60,gap:.1})))}},
 dressed:{name:'Pajama Phantom',chore:'Got dressed',coins:3,w:16,h:17,attackName:'sleepy Zzz',
  intro:'A PAJAMA PHANTOM floats up, refusing to change!',atk:'It drifts a cloud of sleepy Zzz at you!',win:'All dressed! The Pajama Phantom went back in the drawer.',
  hit:['#6c8cff','#ffffff','#d64545'],yoff:m=>-8+Math.round(Math.sin(m.t*2.5)*2),
  draw(g,x,y,m){g.drawImage(pjS,x,y)},
  async attack(m){m.lift=1;await wait(.25);for(let i=0;i<3;i++){projectiles.push({k:'letter',L:'Z',x:m.x+2,y:G-20+i*3,vx:-50,vy:0,g:0,ph:i*2,base:G-20+i*3});await wait(.2)}m.lift=0}},
 petbrush:{name:'Fur Tumbleweed',chore:'Brushed the pet',coins:3,w:14,h:12,attackName:'fluff storm',
  intro:'A FUR TUMBLEWEED rolls out from under the sofa!',atk:'It sheds a storm of fluff!',win:'Pet brushed! The Fur Tumbleweed is one neat little ball.',
  hit:['#c98a4a','#e8c08a'],yoff:m=>m.idle?-Math.round(Math.abs(Math.sin(m.t*5))*3):0,
  draw(g,x,y,m){g.drawImage(furS,x,y)},
  attack(m){return toss(m,[0,1,2,3].map(i=>({s:fluffS,y:G-8-i*2,vx:-rnd(55,70),vy:-rnd(10,30),g:30,gap:.1})))}},
 leaves:{name:'Leaf Pile Lurker',chore:'Raked the leaves',coins:5,w:20,h:12,attackName:'leaf flurry',
  intro:'A LEAF PILE LURKER bursts out of the yard!',atk:'It whirls a flurry of leaves!',win:'Leaves raked! The Lurker is bagged up for good.',
  hit:['#e8862e','#c8402a','#f4c542'],yoff:m=>m.idle?-((m.t*2|0)%2):0,
  draw(g,x,y,m){g.drawImage(leafPileS,x,y)},
  attack(m){return toss(m,[0,1,2].map(i=>({s:leafS[i],y:G-10,vx:-rnd(60,75),vy:-rnd(30,50),g:60,gap:.15})))}},
 snow:{name:'Sneaky Snowman',chore:'Shoveled the snow',coins:5,w:14,h:19,attackName:'snowball barrage',snow:true,
  intro:'A SNEAKY SNOWMAN rises out of the driveway drift!',atk:'It hurls a flurry of snowballs!',win:'Driveway shoveled! The Snowman melted into a puddle.',
  hit:['#f4f8ff','#c8d8ee','#ffffff'],yoff:m=>m.idle?-((m.t*2|0)%2):0,
  draw(g,x,y,m){g.drawImage(m.open>.5?snowB:snowA,x,y)},
  attack(m){return toss(m,[0,1,2].map(()=>({s:snowballS,spin:false,y:G-15,vx:-rnd(70,85),vy:-rnd(35,60),gap:.18})),{lift:false})}},
 outside:{name:'Couch Monster',chore:'Played outside 30+ minutes',coins:5,w:22,h:14,attackName:'cushion chomp',chomp:true,
  intro:'The COUCH MONSTER wants you to stay inside all day!',atk:'It spits out cushions, the remote and old chips!',win:'You played outside! The Couch Monster flopped back into the living room.',
  hit:['#c8403a','#e86a5a','#ffffff'],yoff:m=>m.idle?-((m.t*1.5|0)%2):0,
  draw(g,x,y,m){jaw(g,x,y,m,couchTop,couchBot,9,4,14,'#3a0c14','#ffffff')},
  attack(m){return toss(m,[{s:cushionS,y:G-8,vx:-72,vy:-55,gap:.2},{s:remoteS,y:G-8,vx:-80,vy:-40,gap:.15},{s:chipS,y:G-8,vx:-85,vy:-60}],{lift:false})}},
 wood:{name:'Woodpile Grump',chore:'Brought in firewood',coins:4,w:22,h:17,attackName:'log toss',
  intro:'A WOODPILE GRUMP stacks itself up by the back door!',atk:'It hurls spinning logs!',win:'Firewood brought in! The Grump is stacked neatly by the fireplace.',
  hit:['#7a4a26','#e8c07a','#b88848'],yoff:m=>m.idle?-((m.t*2|0)%2):0,
  draw(g,x,y,m){g.drawImage(m.open>.5?woodB:woodA,x,y)},
  attack(m){return toss(m,[{s:logS,y:G-14,vx:-72,vy:-50,gap:.25},{s:logS,y:G-14,vx:-82,vy:-35}])}},
 bath:{name:'Bubble Bath Beast',chore:'Took a bath',coins:4,w:20,h:15,hpLift:12,headroom:14,shower:true,attackName:'rubber duck barrage',bubbly:true,
  intro:'A BUBBLE BATH BEAST foams up out of the tub!',atk:'It fires squeaky rubber ducks and bubbles!',win:'Squeaky clean! The Bubble Bath Beast went down the drain.',
  hit:['#e6f4ff','#bfefff','#f4d742','#ffffff'],yoff:m=>m.idle?-((m.t*2|0)%2):0,
  draw(g,x,y,m){const P='#d8dee8',p='#9aa4b6';
    rect(g,x+17,y-14,4,22,K);rect(g,x+11,y-14,10,4,K);            // pipe outline: riser + arm
    rect(g,x+18,y-13,2,21,P);rect(g,x+12,y-13,7,2,P);rect(g,x+19,y-13,1,21,p);px(g,x+18,y-13,'#ffffff');
    rect(g,x+16,y+4,6,3,K);rect(g,x+17,y+5,4,1,'#f4c542');        // gold tap collar on the rim
    rect(g,x+8,y-11,7,4,K);rect(g,x+9,y-11,5,2,P);rect(g,x+9,y-9,5,1,p);  // shower head
    for(const c of [9,11,13])px(g,x+c,y-8,'#55606e');
    g.drawImage(m.open>.5?bathB:bathA,x,y);g.drawImage(duckS,x+11,y-4+((m.t*3|0)%2))},
  async attack(m){m.openT=1;await wait(.25);
    projectiles.push({k:'spr',s:duckS,x:m.x+6,y:G-14,vx:-75,vy:-55,g:150,spin:false});await wait(.2);
    for(let i=0;i<2;i++){projectiles.push({k:'bubble',x:m.x+4,y:G-9,vx:-50,vy:0,g:0,ph:i*2,base:G-9-i*4});await wait(.2)}
    projectiles.push({k:'spr',s:duckS,x:m.x+6,y:G-14,vx:-82,vy:-40,g:150,spin:false});m.openT=0}}
};
for(const d of Object.values(MON))d.tx=Math.round(94-d.w/2);

/* ---------- achievements ---------- */
const cnt=(s,k)=>((s.chores||{})[k]||0);
const ACH=[
 {key:'first',name:'First Quest',desc:'Finish your first chore',tier:0,icon:'star',goal:1,v:s=>s.battles||0},
 {key:'hunter',name:'Monster Hunter',desc:'Win 10 battles',tier:1,icon:'monster',goal:10,v:s=>s.battles||0},
 {key:'legend',name:'Legendary Hero',desc:'Win 50 battles',tier:2,icon:'sword',goal:50,v:s=>s.battles||0},
 {key:'fame',name:'Hall of Fame',desc:'Win 100 battles',tier:3,icon:'crown',goal:100,v:s=>s.battles||0},
 {key:'coins100',name:'Coin Collector',desc:'Earn 100 coins',tier:0,icon:'coin',goal:100,v:s=>s.coins||0},
 {key:'coins500',name:'Treasure Hoarder',desc:'Earn 500 coins',tier:1,icon:'coin',goal:500,v:s=>s.coins||0},
 {key:'coins1000',name:"Dragon's Hoard",desc:'Earn 1,000 coins',tier:2,icon:'coin',goal:1000,v:s=>s.coins||0},
 {key:'bedboss',name:'Bed Boss',desc:'Make your bed 7 times',tier:0,icon:'bed',goal:7,v:s=>cnt(s,'bed')},
 {key:'smile',name:'Sparkle Smile',desc:'Brush teeth 14 times',tier:1,icon:'tooth',goal:14,v:s=>cnt(s,'teeth')},
 {key:'bookworm',name:'Bookworm',desc:'Read 10 books',tier:1,icon:'book',goal:10,v:s=>cnt(s,'reading')},
 {key:'socks',name:'Sock Slayer',desc:'Put away laundry 10 times',tier:1,icon:'sock',goal:10,v:s=>cnt(s,'laundry')},
 {key:'petpal',name:'Best Friend',desc:'Feed the pet 10 times',tier:1,icon:'paw',goal:10,v:s=>cnt(s,'pet')},
 {key:'suds',name:'Bubble Master',desc:'Do the dishes 15 times',tier:1,icon:'bubble',goal:15,v:s=>cnt(s,'dishes')},
 {key:'snowday',name:'Snow Day Hero',desc:'Shovel snow 5 times',tier:1,icon:'snow',goal:5,v:s=>cnt(s,'snow')},
 {key:'freshair',name:'Fresh Air Fan',desc:'Play outside 10 times',tier:1,icon:'tree',goal:10,v:s=>cnt(s,'outside')},
 {key:'firekeeper',name:'Cozy Fire Keeper',desc:'Bring in firewood 10 times',tier:1,icon:'flame',goal:10,v:s=>cnt(s,'wood')},
 {key:'squeaky',name:'Squeaky Clean',desc:'Take a bath 10 times',tier:1,icon:'bubble',goal:10,v:s=>cnt(s,'bath')},
 {key:'dreams',name:'Sweet Dreams',desc:'Go to sleep without issues 7 times',tier:1,icon:'moon',goal:7,v:s=>cnt(s,'sleep')},
 {key:'drynight',name:'Dry Night Champ',desc:'Keep your diaper dry all night 7 times',tier:1,icon:'star',goal:7,v:s=>cnt(s,'dry')},
 {key:'breakfast',name:'Breakfast Champ',desc:'Help make breakfast 10 times',tier:1,icon:'sun',goal:10,v:s=>cnt(s,'breakfast')},
 {key:'chef',name:'Junior Chef',desc:'Help make dinner 10 times',tier:1,icon:'flame',goal:10,v:s=>cnt(s,'dinner')},
 {key:'lunchhero',name:'Lunch Hero',desc:'Help make lunch 10 times',tier:1,icon:'star',goal:10,v:s=>cnt(s,'lunchmade')},
 {key:'baller',name:'All-Star Baller',desc:'Practice basketball 10 times',tier:1,icon:'star',goal:10,v:s=>cnt(s,'basketball')},
 {key:'ontime',name:'Never Late',desc:'Be ready for the bus 20 times',tier:2,icon:'sun',goal:20,v:s=>cnt(s,'bus')},
 {key:'handy',name:"Dad's Right Hand",desc:'Help Dad fix things 5 times',tier:1,icon:'sword',goal:5,v:s=>cnt(s,'repair')},
 {key:'neat',name:'Neat Freak',desc:'Fold the clothes 10 times',tier:1,icon:'star',goal:10,v:s=>cnt(s,'shirts')},
 {key:'sibling',name:'Super Sibling',desc:'Babysit a little sibling 10 times',tier:2,icon:'star',goal:10,v:s=>cnt(s,'babysit')},
 {key:'helper',name:'Helping Hand Hero',desc:'Give a helping hand 10 times',tier:1,icon:'star',goal:10,v:s=>cnt(s,'helping')},
 {key:'early',name:'Early Bird',desc:'Finish a chore before 8 a.m.',tier:0,icon:'sun',goal:1,v:s=>s.earlyBird||0},
 {key:'week',name:'Week Warrior',desc:'Do chores 7 days in a row',tier:1,icon:'flame',goal:7,v:s=>Math.max(s.bestStreak||0,s.streak||0)},
 {key:'month',name:'Unstoppable',desc:'Do chores 30 days in a row',tier:3,icon:'flame',goal:30,v:s=>Math.max(s.bestStreak||0,s.streak||0)},
 {key:'arsenal',name:'Weapon Master',desc:'Unlock 5 weapons',tier:2,icon:'sword',goal:5,v:s=>Object.keys(WEAPONS).filter(k=>weaponUnlocked(k,s)).length},
 {key:'armory',name:'Full Armory',desc:'Unlock every weapon',tier:3,icon:'crown',goal:20,v:s=>Object.keys(WEAPONS).filter(k=>weaponUnlocked(k,s)).length},
 {key:'encyclopedia',name:'Monster Encyclopedia',desc:'Defeat every kind of monster',tier:3,icon:'monster',goal:Object.keys(MON).filter(k=>!MON[k].arenaOnly).length,v:s=>Object.keys(MON).filter(k=>!MON[k].arenaOnly).filter(k=>cnt(s,k)>0).length}
];
const TIERS=[{name:'Bronze',a:'#e09a50',b:'#9a5a22'},{name:'Silver',a:'#e4e9f2',b:'#8890a8'},{name:'Gold',a:'#f4c542',b:'#b8860b'},{name:'Diamond',a:'#9ff0ff',b:'#3a9ab8'}];
const ICONS={star:"..X...XXX.XXXXX.XXX.X...X",monster:".XXX.X.X.XXXXXX.X.X..XXX.",sword:"....X...X.X.X...X...X.X..",crown:"X.X.XXXXXXXXXXX.XXX.....",
 coin:".XXX.XX.XXX.X.XXX.XX.XXX.",bed:"X....X.XXXXXXXXX...X.....",tooth:"XXXXXXXXXXXXXXX.X.X..X.X.",book:"XX.XXXX.XXXX.XXXX.XX.....",
 sock:".XX...XX...XX...XXXX.XXXX",paw:"X.X.X......XXX.XXXXX.XXX.",bubble:".XXX.X...XX.X.XX...X.XXX.",sun:"X.X.X.XXX.XXXXX.XXX.X.X.X",flame:"..X...XX...XXX.XXXXX.XXX.",tree:"..X...XXX.XXXXX..X....X..",moon:".XXX.XX...X....XX....XXX.",snow:"X.X.X.XXX.XXXXX.XXX.X.X.X".replace(/./g,(c,i)=>"X.X.X.X.X...X...X.X.X.X.X"[i])};
function makeBadge(a){const[c,g]=canvas(12,15);const T=TIERS[a.tier];
  for(let r=0;r<5;r++){px(g,2+Math.floor(r*.5),r,'#d64545');px(g,3+Math.floor(r*.5),r,'#d64545');px(g,9-Math.floor(r*.5),r,'#3b74d9');px(g,8-Math.floor(r*.5),r,'#3b74d9')}
  disc(g,6,9,5,K);disc(g,6,9,4,T.b);disc(g,6,9,3,T.a);
  const ic=ICONS[a.icon]||ICONS.star;for(let k=0;k<25;k++)if(ic[k]==='X')px(g,4+k%5,7+(k/5|0),T===TIERS[3]?'#1c3a5a':'#3a2410');
  px(g,3,6,'#ffffff');return c}
for(const a of ACH)a.badge=makeBadge(a);
const achQueue=[];let banner=null;
function showAchievement(key){const a=ACH.find(x=>x.key===key);if(a)achQueue.push({title:'Achievement unlocked!',name:a.name,desc:a.desc,img:a.badge})}
function checkAchievements(stats,unlocked=[]){const have=new Set(unlocked);return ACH.filter(a=>!have.has(a.key)&&a.v(stats)>=a.goal).map(a=>a.key)}
function achievementProgress(stats){return Object.fromEntries(ACH.map(a=>{const v=a.v(stats);return[a.key,{value:Math.min(v,a.goal),goal:a.goal,done:v>=a.goal}]}))}


const [mc,mg]=canvas(56,56);
function drawMonster(m){const d=m.def;mg.clearRect(0,0,56,56);mg.globalCompositeOperation='source-over';
  const lift=m.lift?-3:0;d.draw(mg,16,52-d.h+d.yoff(m)+lift,m);
  if(m.flash>0&&(m.flash*30|0)%2===0){mg.globalCompositeOperation='source-atop';mg.fillStyle='#ffffff';mg.fillRect(0,0,56,56);mg.globalCompositeOperation='source-over'}
  const sx=(m.shake>0?Math.round(Math.sin(m.shake*80)*2):0)+Math.round(m.lunge||0);
  // shadow
  const sw=Math.round(d.w*.7);rect(ctx,m.x+(d.w-sw)/2+sx,G,sw,1,SHC);
  if(m.hopY&&m.hopV!=null&&m.spinT>0&&(time*16|0)%2){ctx.save();ctx.translate(Math.round(m.x-16+sx)+28,G+1-52+Math.round(m.hopY)+28);ctx.scale(-1,-1);ctx.drawImage(mc,-28,-28);ctx.restore()}
  else ctx.drawImage(mc,Math.round(m.x-16+sx),G+1-52+Math.round(m.hopY||0));
  if(m.tongue>0){const tc=d.lashCol||['#ff79a8','#c8406e'];const bx=m.x+(d.lashX??10),by=G-(d.lashY??4);const L=Math.round(m.tongue);
    for(let i=0;i<L;i++){const y=by+Math.round(Math.sin(i*.35-m.t*14)*Math.min(3,i*.15));px(ctx,bx-i,y,tc[0]);px(ctx,bx-i,y+1,tc[1])}
    const ty=by+Math.round(Math.sin(L*.35-m.t*14)*Math.min(3,L*.15));disc(ctx,bx-L,ty,1,tc[0]);px(ctx,bx-L-1,ty+1,tc[1])}
  if(m.showHp){const bx=Math.round(m.x+d.w/2-7),by=G+d.yoff(m)-d.h-6-(d.hpLift||0);rect(ctx,bx-1,by-1,15,4,K);
    for(let i=0;i<3;i++)rect(ctx,bx+i*5,by,4,2,i<m.hp?'#e04a4a':'#4a2030')}}

/* ---------- broom ---------- */
const POSE={walk:-55,idle:-55,windup:-160,swing:35,block:-78,victory:-95,aim:0,rest:30};
/* ---------- weapons ---------- */
// Each weapon is a pixel map drawn pointing right; grip=[col,row] is where the hero's hand holds it.
const WEAPONS={
 broom:{name:'Broom Sword',perk:'Trusty and reliable.',grip:[2,2],
  map:["............yYyYy","..........RYyYyYy","HHHHHHHHHHRyYyYyY","..........RYyYyYy","............yYyYy"],
  pal:{H:'#9a6232',R:'#d64545',Y:'#e8d07a',y:'#c9a84e'},smear:['#fffbe0','#fff3b0'],fx:['#e8d07a','#c9a84e']},
 duster:{name:'Feather Duster Rapier',perk:'Faster swings.',speed:.55,grip:[1,2],
  map:["...G.........fFf..","...G........FfWfF.","HHHGHHHHHHHHFWFfFf","...G........FfWfF.","...G.........fFf.."],
  pal:{H:'#5a3a8a',G:'#f4c542',F:'#ff8ac6',f:'#c46cd9',W:'#ffffff'},smear:['#ffd1ec','#ff8ac6'],fx:['#ff8ac6','#c46cd9','#ffffff'],fxG:20},
 mop:{name:'Mop Mace',perk:'Heavy hits shake the screen.',heavy:true,grip:[2,3],
  map:["............mMmM...","...........mMmMmMB.","..........KMmMMmMmB","HHHHHHHHHHKMMmMMmMB","..........KMmMMmMmB","...........mMmMmMB.","............mMmM..."],
  pal:{H:'#8a8f9a',K,M:'#eeeae0',m:'#b8b0a0',B:'#4aa3ff'},smear:['#bfe3ff','#4aa3ff'],fx:['#4aa3ff','#bfe3ff','#ffffff'],fxG:200},
 squeegee:{name:'Squeegee Axe',perk:'Wide arc, shiny streak.',grip:[2,4],
  map:["...........SSK","..........sSSK","..........sSWK","..........sSSK","HHHHHHHHHHsSSK","..........sSSK","..........sSWK","..........sSSK","...........SSK"],
  pal:{H:'#2f6f8f',S:'#dfe5f0',s:'#8890a8',K,W:'#ffffff'},smear:['#ffffff','#bff3ff'],fx:['#ffffff','#bff3ff','#7fe0ff']},
 vacuum:{name:'Vacuum Cannon',perk:'Fires a suction beam from range.',beam:true,grip:[0,3],
  map:["..KKKKKKK.......",".KBBBBBBBK......","..KBYbYbBKKKKKK.","HHKBbbbbBKGGGGGY",".KBBBBBBBKKKKKK.","..KKKKKKK......."],
  pal:{K,B:'#d64545',b:'#9a2626',Y:'#7fe0ff',G:'#8890a8',H:'#3a3a48'},smear:['#7fe0ff','#ffffff'],fx:['#7fe0ff','#ffffff','#b4b4c4']},
 golden:{name:'Golden Broom of Legend',perk:'+1 bonus coin every battle.',bonus:1,grip:[2,2],
  map:["............WYWYW","..........GYWYWYW","hHhHhHhHhHGWYWYWY","..........GYWYWYW","............WYWYW"],
  pal:{H:'#f4c542',h:'#c99a1e',G:'#7fe0ff',W:'#fff3a8',Y:'#f4c542'},smear:'rainbow',fx:['#f4c542','#fff3a8','#ffffff','#7fe0ff']},
 toothbrush:{name:'Toothbrush Dagger',perk:'Quick stabs, foamy hits.',speed:.6,grip:[1,2],
  map:["........WRWRW","........WWWWW","HHHHHHHHhhhhh"],
  pal:{H:'#4aa3ff',h:'#2f6fbf',W:'#ffffff',R:'#e04a4a'},smear:['#bfefff','#ffffff'],fx:['#ffffff','#bfefff'],fxG:-20},
 spatula:{name:'Spatula Shield',perk:'Clang! Blocks knock monsters back.',grip:[1,2],
  map:[".........sSSSSs",".........SSsSSS","HHHHHHHHHSSSSSS",".........SSsSSS",".........sSSSSs"],
  pal:{H:'#3a3a48',S:'#dfe5f0',s:'#8890a8'},smear:['#ffffff','#dfe5f0'],fx:['#ffe066','#ffffff','#f4c542']},
 rake:{name:'Rake Trident',perk:'Three-prong stab, leaf burst.',grip:[2,2],
  map:["...........MMMMM","...........M....","HHHHHHHHHHHMMMMMM","...........M....","...........MMMMM"],
  pal:{H:'#9a6232',M:'#8890a8'},smear:['#f4c542','#e8862e'],fx:['#e8862e','#c8402a','#f4c542']},
 pencil:{name:'Pencil Lance',perk:'Long reach, scribble trail.',grip:[3,1],
  map:["..SYYYYYYYYYYYYW..","PPSYYYYYYYYYYYYWWG","..SyyyyyyyyyyyyW.."],
  pal:{P:'#f08aa0',S:'#c8d0e0',Y:'#f4c542',y:'#c99a1e',W:'#e8c890',G:'#3a3a48'},smear:['#3a3a48','#6a6a78'],fx:['#3a3a48','#f4c542','#f08aa0']},
 plunger:{name:'Plunger Hammer',perk:'Sticky bonk!',heavy:true,grip:[2,2],
  map:["...........RR.","..........rRRR","HHHHHHHHHHrRRR","..........rRRR","...........RR."],
  pal:{H:'#9a6232',R:'#d64545',r:'#9a2626'},smear:['#ffd1d1','#d64545'],fx:['#d64545','#ffffff']},
 dustpan:{name:'Dustpan Cleaver',perk:'Scoops up extra dust on every hit.',grip:[2,2],
  map:["..........PPPPP","..........PpppP","HHHHHHHHHHPpppP","..........PpppP","..........PPPPP"],
  pal:{H:'#e8603c',P:'#e8603c',p:'#a8402a'},smear:['#ffd1b8','#e8603c'],fx:['#b4b4c4','#e8603c']},
 sponge:{name:'Sponge Hammer',perk:'Bouncy bonks and soapy bubbles.',heavy:true,grip:[2,2],
  map:["..........GYYYYY","..........GYyYyY","HHHHHHHHHHGYYYYY","..........GYyYyY","..........GYYYYY"],
  pal:{H:'#4aa3ff',G:'#3a9d4a',Y:'#f4d742',y:'#c9a81e'},smear:['#fff7b0','#f4d742'],fx:['#bfefff','#ffffff','#f4d742'],fxG:-30},
 spray:{name:'Spray Bottle Blaster',perk:'Ranged mist beam.',beam:true,grip:[0,3],beamCol:['#bfefff','#ffffff','#e6f8ff','#7fd0ff'],
  map:["....KKK.....","...KWWWK....","..KBBBBBKKK.","HHKBBbBBKWWK","..KBBBBBK...","..KBBBBBK...",".KKKKKKK...."],
  pal:{K,B:'#4aa3ff',b:'#2f6fbf',W:'#ffffff',H:'#3a3a48'},smear:['#bfefff','#ffffff'],fx:['#bfefff','#ffffff']},
 diamond:{name:'Diamond Mop of Destiny',perk:'+2 bonus coins every battle.',bonus:2,heavy:true,grip:[2,3],
  map:["............mMmM...","...........mMBMmMB.","..........KMmMMBMmB","hHhHhHhHhHKMBmMMmMB","..........KMmMMBMmB","...........mMBMmMB.","............mMmM..."],
  pal:{H:'#7fe0ff',h:'#3a9ab8',K,M:'#dff8ff',m:'#7fe0ff',B:'#ffffff'},smear:'rainbow',fx:['#7fe0ff','#ffffff','#dff8ff','#ff8ac6']},
 bubble:{name:'Bubble Wand',perk:'Every hit pops a cloud of bubbles.',speed:.7,grip:[1,2],
  map:["...........RRR.","..........R...R","HHHHHHHHHHR...R","..........R...R","...........RRR."],
  pal:{H:'#f08aa0',R:'#9fe8ff'},smear:['#e6f8ff','#c39bd3'],fx:['#bfefff','#ffffff','#c39bd3'],fxG:-40},
 lint:{name:'Lint Roller Club',perk:'Sticky roller grabs fluff.',grip:[2,2],
  map:["...........WWWW","..........KWwWw","HHHHHHHHHHKWWWW","..........KWwWw","...........WWWW"],
  pal:{H:'#3a3a48',K,W:'#f4f6fb',w:'#c8d0e0'},smear:['#ffffff','#c8d0e0'],fx:['#e8c08a','#9b6ad6','#ffffff'],fxG:30},
 watering:{name:'Watering Can Cannon',perk:'Ranged water stream.',beam:true,grip:[0,3],beamCol:['#4aa3ff','#bfe3ff','#7fd0ff','#2f6fbf'],
  map:["........K.......",".......KGK......","..KKKKKGGGKK....","HHKGGGGGGGGGKKKK","..KGgGGGGGGK...B","..KGGGGGGGGK....","...KKKKKKKK....."],
  pal:{K,G:'#5cc96a',g:'#3a8f4a',B:'#4aa3ff',H:'#3a3a48'},smear:['#bfe3ff','#4aa3ff'],fx:['#4aa3ff','#bfe3ff','#5cc96a'],fxG:200},
 bookmark:{name:'Bookmark Blade',perk:'Long ribbon blade.',grip:[1,2],
  map:["..G..............","..G.WWWWWWWWWWWWR.","HHGHWRRRRRRRRRRWRR","..G.WWWWWWWWWWWWR.","..G.............."],
  pal:{H:'#7a4a26',G:'#f4c542',W:'#fff8e6',R:'#c0392b'},smear:['#fff8e6','#c0392b'],fx:['#fff8e6','#c0392b','#f4c542']},
 bone:{name:'Squeaky Bone Club',perk:'SQUEAK! Monsters get dizzy.',heavy:true,grip:[2,2],
  map:["...........WW.WW","...........WWWWW","HHHHHHHHHHHWWWW.","...........WWWWW","...........WW.WW"],
  pal:{H:'#9a6232',W:'#f4efdc'},smear:['#ffffff','#ff9cb4'],fx:['#f4efdc','#ff9cb4','#ffffff']},
 shovel:{name:'Snow Shovel Smasher',perk:'Big scoops and a frosty burst.',heavy:true,grip:[2,3],
  map:["...........SS","..........SSs","H.........SSs","HHHHHHHHHHSSs","H.........SSs","..........SSs","...........SS"],
  pal:{H:'#7a4a26',S:'#3b74d9',s:'#27509e'},smear:['#ffffff','#c8d8ee'],fx:['#ffffff','#e6f0ff','#c8d8ee'],fxG:40},
 bat:{name:'Slugger Bat',perk:'Home-run hits send sparks flying.',heavy:true,grip:[2,1],
  map:["...........wWWWw.","KHHHwWWWWWWWWWWWW","...........wWWWw."],
  pal:{K,H:'#3a3a48',W:'#e0b070',w:'#b88848'},smear:['#ffffff','#f4d06a'],fx:['#f4c542','#ffffff','#e0b070']},
 mallet:{name:'Lumberjack Mallet',perk:'Heavy thuds and flying wood chips.',heavy:true,grip:[2,3],
  map:["..........KKKKKK","..........KBwwBK","..........KBwwBK","HHHHHHHHHHKBwwBK","..........KBwwBK","..........KBwwBK","..........KKKKKK"],
  pal:{K,H:'#9a6232',B:'#7a4a26',w:'#e8c07a'},smear:['#e8c07a','#b88848'],fx:['#e8c07a','#7a4a26','#b88848']},
 duckhammer:{name:'Rubber Duck Hammer',perk:'SQUEAK! Every hit bursts into bubbles.',grip:[2,2],
  map:["...........KKK..","..........KYYYK.","HHHHHHHHHHKYYEYO","..........KYYYYK","...........KKKK."],
  pal:{K,H:'#4aa3ff',Y:'#f4d742',E:K,O:'#f4862e'},smear:['#e6f4ff','#f4d742'],fx:['#bfefff','#ffffff','#f4d742'],fxG:-40},
 pillowmace:{name:'Pillow Mace',perk:'Soft but mighty. Feathers fly everywhere.',grip:[2,2],
  map:["..........KKKKKK","..........KWWWWK","HHHHHHHHHHKWwwWK","..........KWWWWK","..........KKKKKK"],
  pal:{K,H:'#7a3fb0',W:'#ffffff',w:'#c8d0e0'},smear:['#ffffff','#e6ecff'],fx:['#ffffff','#e6ecff','#c8d0e0'],fxG:20},
 rattle:{name:'Rattle Mace',perk:'Shake, rattle and roll! Confetti on every hit.',speed:.7,grip:[2,2],
  map:["...........KKKK.","..........KPYPYK","HHHHHHHHHHKYPYPK","..........KPYPYK","...........KKKK."],
  pal:{K,H:'#f08aa0',P:'#f08aa0',Y:'#f4d742'},smear:['#ffd1ec','#f4d742'],fx:['#f08aa0','#f4d742','#7fd0ff','#5cc96a']},
 butterknife:{name:'Butter Knife Sabre',perk:'Smooth, buttery slashes with crumbs flying.',speed:.75,grip:[2,1],
  map:["..........KKKKKKK.","HHHHHHHHHKSSSYSSSK","..........KKKKKKK."],
  pal:{K,H:'#3a3a48',S:'#d8dee8',Y:'#f4e08a'},smear:['#fff7c0','#f4e08a'],fx:['#f4e08a','#f0d090','#b07840']},
 whisk:{name:'Whisk Wand',perk:'Whips monsters into a frothy foam.',speed:.7,grip:[2,2],
  map:["...........SSS.","..........S.S.S","HHHHHHHHHHSSSSS","..........S.S.S","...........SSS."],
  pal:{H:'#c0392b',S:'#c8d0e0'},smear:['#ffffff','#e6ecf5'],fx:['#ffffff','#fff8e6','#e6ecf5'],fxG:-20},
 baguette:{name:'Baguette Blade',perk:'Crusty strikes. Breadcrumbs everywhere.',grip:[2,1],
  map:["....KKKKKKKKKKKKK.","KHHHKBbBBbBBbBBbBK","....KKKKKKKKKKKKK."],
  pal:{K,H:'#7a4a26',B:'#e0a858',b:'#b07838'},smear:['#f0d090','#e0a858'],fx:['#e0a858','#b07838','#f0d090']},
 hockey:{name:'Hockey Stick Slasher',perk:'Slapshot power with a puck on every hit.',grip:[2,1],
  map:["..............KK","KHHHHHHHHHHHHKBB","..............KK"],
  pal:{K,H:'#c98a4a',B:'#2a2a38'},smear:['#ffffff','#bfe3ff'],fx:['#2a2a38','#ffffff','#bfe3ff']},
 crossing:{name:'Crossing Guard Sign',perk:'Halts monsters in their tracks.',heavy:true,grip:[2,3],
  map:["..........KKKKK.","..........KRRRK.","..........KRWRK.","HHHHHHHHHHKRWRK.","..........KRWRK.","..........KRRRK.","..........KKKKK."],
  pal:{K,H:'#8890a8',R:'#e04a4a',W:'#ffffff'},smear:['#ffffff','#e04a4a'],fx:['#e04a4a','#ffffff','#f4c542']},
 wrench:{name:'Mighty Wrench',perk:'Tightens every hit with a CLANK.',heavy:true,grip:[2,2],
  map:["............KK.KK","...........KSKKSK","HHHHHHHHHHHKSSSK.","...........KSSK..","............KK..."],
  pal:{K,H:'#d63c3c',S:'#c8d0e0'},smear:['#ffffff','#c8d0e0'],fx:['#c8d0e0','#f4c542','#ffffff']},
 iron:{name:'Steam Iron Blaster',perk:'Presses monsters flat in a cloud of steam.',heavy:true,grip:[1,3],
  map:["...........KKK.","..........KHHHK","..........KH.HK","KKKKKKKKKKKKKKK","KSSSSSSSSSSSSSK","KCSSSSSSSSSSSSK",".KKKKKKKKKKKKK."],
  pal:{K,H:'#3b74d9',S:'#c8d0e0',C:'#7fc8f0'},smear:['#ffffff','#e6ecf5'],fx:['#ffffff','#e6ecf5','#c8d0e0'],fxG:-30},
 bottle:{name:'Baby Bottle Blaster',perk:'Ranged milk beam. Monsters get sleepy.',beam:true,grip:[0,2],beamCol:['#ffffff','#fff8e6','#ffd1e0','#e6ecf5'],
  map:["....KKKKKKK.K..","...KWWWWWWWKPK.","HHKWWMWMWWWKPPK","...KWWWWWWWKPK.","....KKKKKKK.K.."],
  pal:{K,W:'#ffffff',M:'#ff9cb4',P:'#ffd1a8',H:'#7fb4f0'},smear:['#ffffff','#ffd1e0'],fx:['#ffffff','#ffd1e0','#fff8e6']},
 foamfinger:{name:'Foam Finger',perk:"You're #1! Every hit cheers.",grip:[2,3],
  map:["..........KKK....","..........KFK....","..........KFK....","HHHHHHHHHKFFFFFK.",".........KFWFFFK.","..........KFFFK..","...........KKK..."],
  pal:{K,H:'#3b74d9',F:'#f4c542',W:'#3a3a48'},smear:['#f4c542','#ffffff'],fx:['#f4c542','#3b74d9','#ffffff']}
};
// How each weapon is earned: a day streak, a total-chores milestone, or mastery of one chore. No coin cost.
const REQ={broom:null,duster:{streak:3},dustpan:{total:10},mop:{streak:7},sponge:{total:25},squeegee:{streak:14},spray:{total:50},
 vacuum:{streak:21},golden:{streak:30},diamond:{total:100},plunger:{total:75},
 toothbrush:{chore:'teeth',n:20},spatula:{chore:'dishes',n:20},rake:{chore:'leaves',n:10},pencil:{chore:'homework',n:20},
 bubble:{chore:'dishes',n:50},lint:{chore:'laundry',n:30},watering:{chore:'plants',n:20},bookmark:{chore:'reading',n:20},bone:{chore:'pet',n:25},shovel:{chore:'snow',n:10},bat:{chore:'outside',n:15},mallet:{chore:'wood',n:15},duckhammer:{chore:'bath',n:15},pillowmace:{chore:'sleep',n:15},rattle:{chore:'dry',n:15},butterknife:{chore:'breakfast',n:15},whisk:{chore:'dinner',n:15},baguette:{chore:'lunchmade',n:15},hockey:{chore:'basketball',n:15},crossing:{chore:'bus',n:20},wrench:{chore:'repair',n:10},iron:{chore:'shirts',n:15},bottle:{chore:'babysit',n:10},foamfinger:{chore:'helping',n:15}};
for(const [k,w] of Object.entries(WEAPONS)){w.icon=sprite(w.map,w.pal);const r=w.req=REQ[k]??null;
  if(!r){w.tier='Starter';w.unlock='Ready from day one'}
  else if(r.streak){w.tier='Streak';w.unlock=`${r.streak}-day chore streak`;w.goal=r.streak}
  else if(r.total){w.tier='Milestone';w.unlock=`Finish ${r.total} chores`;w.goal=r.total}
  else{w.tier='Mastery';w.unlock=`${MON[r.chore].chore} ${r.n} times`;w.goal=r.n}}
ACH.find(a=>a.key==='armory').goal=Object.keys(WEAPONS).length;
function weaponProgress(k,s){const r=WEAPONS[k].req;if(!r)return 1;
  return r.streak?Math.max(s.bestStreak||0,s.streak||0):r.total?(s.battles||0):((s.chores||{})[r.chore]||0)}
function weaponUnlocked(k,s){const w=WEAPONS[k];return !w.req||weaponProgress(k,s)>=w.goal}
function checkWeaponUnlocks(s,have=[]){const h=new Set(have);return Object.keys(WEAPONS).filter(k=>!h.has(k)&&weaponUnlocked(k,s))}
function showWeaponUnlock(k){const w=WEAPONS[k];if(w)achQueue.push({title:'New weapon unlocked!',name:w.name,desc:w.perk,img:w.icon})}
let weapon=WEAPONS[opts.weapon]?opts.weapon:'broom';
function drawWeapon(w,hx,hy,deg){const q=Math.round(deg/15)*15*Math.PI/180;const dx=Math.cos(q),dy=Math.sin(q),nx=-dy,ny=dx;
  w.map.forEach((row,r)=>[...row].forEach((ch,c)=>{const col=w.pal[ch];if(!col)return;const u=c-w.grip[0],v=r-w.grip[1];
    for(const su of [0,.5])for(const sv of [0,.5])px(ctx,hx+dx*(u+su)+nx*(v+sv),hy+dy*(u+su)+ny*(v+sv),col)}))}
function weaponTip(w,hx,hy,deg){const q=Math.round(deg/15)*15*Math.PI/180;const L=w.map[0].length-w.grip[0];return[hx+Math.cos(q)*L,hy+Math.sin(q)*L]}
const RAINBOW=['#e04a4a','#f4862e','#f4c542','#5cc96a','#4aa3ff','#9b6ad6'];
let beamT=0;


/* ---------- projectiles ---------- */
function drawProj(p){const t=time;
  if(p.k==='cloud'){disc(ctx,p.x,p.y,3,'#c8c8d4');disc(ctx,p.x+3,p.y-2,2,'#dcdce6');disc(ctx,p.x+4,p.y+1,2,'#a8a8b8');
    if(R()<.6)particles.push({x:p.x+5,y:p.y+rnd(-2,2),vx:rnd(10,25),vy:rnd(-8,8),g:0,life:.3,c:'#b4b4c4'})}
  else if(p.k==='pillow'){const r=(t*12|0)%2;const w=r?7:5,h=r?5:7;rect(ctx,p.x-w/2,p.y-h/2,w,h,K);rect(ctx,p.x-w/2+1,p.y-h/2+1,w-2,h-2,'#dfe9ff');px(ctx,p.x,p.y,'#b8c8ec')}
  else if(p.k==='paper'){disc(ctx,p.x,p.y,2,'#ffffff');px(ctx,p.x-1,p.y,'#9aa0b8');px(ctx,p.x+1,p.y-1,'#9aa0b8')}
  else if(p.k==='pencil'){const r=(t*14|0)%2;if(r){rect(ctx,p.x-3,p.y,6,1,'#f4c542');px(ctx,p.x-4,p.y,'#3a2a1a');px(ctx,p.x+3,p.y,'#ff8a9a')}else{rect(ctx,p.x,p.y-3,1,6,'#f4c542');px(ctx,p.x,p.y-4,'#3a2a1a');px(ctx,p.x,p.y+3,'#ff8a9a')}}
  else if(p.k==='bubble'){const x=Math.round(p.x),y=Math.round(p.y);rect(ctx,x-1,y-2,3,1,'#bfefff');rect(ctx,x-1,y+2,3,1,'#bfefff');rect(ctx,x-2,y-1,1,3,'#bfefff');rect(ctx,x+2,y-1,1,3,'#bfefff');px(ctx,x-1,y-1,'#ffffff')}
  else if(p.k==='spr'){ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y));if(p.spin)ctx.rotate(((t*12|0)%4)*Math.PI/2);ctx.drawImage(p.s,-(p.s.width>>1),-(p.s.height>>1));ctx.restore()}
  else if(p.k==='paste'){const x=Math.round(p.x),y=Math.round(p.y);rect(ctx,x-2,y-1,5,3,'#f4f6fb');px(ctx,x-2,y-1,'#e04a4a');px(ctx,x,y-1,'#3b74d9');px(ctx,x+2,y+1,'#e04a4a');
    if(R()<.5)particles.push({x:x+3,y,vx:rnd(5,20),vy:rnd(-5,5),g:60,life:.25,c:'#f4f6fb'})}
  else if(p.k==='sock'){ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y));ctx.rotate(((t*12|0)%4)*Math.PI/2);ctx.drawImage(sockSpr[p.ci||0],-3,-3);ctx.restore()}
  else if(p.k==='block'){const x=Math.round(p.x),y=Math.round(p.y);rect(ctx,x-2,y-2,5,5,K);rect(ctx,x-1,y-1,3,3,p.c);px(ctx,(t*12|0)%2?x-1:x+1,y-1,'#ffffff')}
  else if(p.k==='letter'){const x=Math.round(p.x),y=Math.round(p.y);rect(ctx,x-3,y-4,7,9,K);rect(ctx,x-2,y-3,5,7,'#fff8e6');glyph(p.L,x-1,y-2,K)}}

/* ---------- battle script ---------- */
let busy=false;
async function battle(type){if(grounded||mkt)return false;thought=null;
  if(busy||!MON[type])return false;busy=true;opts.onStart?.(type);
  const d=MON[type];mon={def:d,x:W+6,hp:3,open:0,openT:0,tongue:0,tongueT:0,lunge:0,lungeT:0,flash:0,shake:0,t:0,idle:true,approach:true,alive:true,showHp:false,lift:0};
  say('...');scrollTarget=30;scroll=Math.max(scroll,18);hero.pose='walk';
  await until(()=>mon.x<=d.tx);
  mon.x=d.tx;mon.approach=false;scroll=0;scrollTarget=0;hero.pose='idle';hero.alert=.9;mon.showHp=true;
  say(d.intro);
  await wait(.5);
  for(let i=0;i<2;i++){mon.openT=.8;if(type==='shoes')mon.tongueT=8;await wait(.18);mon.openT=0;mon.tongueT=0;await wait(.18)}
  await wait(.5);
  const wpn=WEAPONS[weapon],reward=d.coins+(wpn.bonus||0);
  const lines=[wpn.beam?`You fire the ${wpn.name}!`:`You strike with the ${wpn.name}!`,'Another big hit!','Final blow!'];
  for(let i=0;i<3;i++){
    say(lines[i]);
    if(wpn.beam){hero.pose='aim';hero.oxT=-2;await wait(.3);beamT=.45;mon.lungeT=-5}
    else{hero.pose='windup';await wait(.2*(wpn.speed||1));
      const reach=wpn.map[0].length-wpn.grip[0];hero.oxT=mon.x-(reach>15?22:18)-26;await wait(.14);
      hero.pose='swing';hero.ang=POSE.swing;hero.smear=.12}
    mon.hp--;mon.flash=.2;mon.shake=.25;mon.idle=false;if(!reduce)shake=wpn.heavy?.3:.15;
    const hx=mon.x+d.w/2,hy=G-d.h/2+d.yoff(mon);
    burst(hx,hy,d.hit,12,70);
    for(let k=0;k<10;k++){const a=R()*Math.PI*2,v=rnd(20,60);particles.push({x:hx,y:hy,vx:Math.cos(a)*v,vy:Math.sin(a)*v-15,g:wpn.fxG??120,life:rnd(.3,.7),c:wpn.fx[k%wpn.fx.length]})}
    petCheer(i===2);
    if(i===2){special(weapon,hx,hy);await wait(.75)}
    await wait(wpn.beam?.45:.25);mon.lungeT=0;hero.oxT=0;hero.pose='idle';await wait(.3);mon.idle=true;
    if(mon.hp>0){say(d.atk);hero.pose='block';mon.idle=false;await d.attack(mon);await until(()=>projectiles.length===0);mon.idle=true;hero.pose='idle';await wait(.35)}
  }
  // defeat
  mon.idle=false;mon.showHp=false;mon.flash=.7;await wait(.7);
  const cx=mon.x+d.w/2,cy=G-d.h/2;
  for(let i=0;i<26;i++){const a=R()*Math.PI*2,v=rnd(10,45);particles.push({x:cx+rnd(-4,4),y:cy+rnd(-4,4),vx:Math.cos(a)*v,vy:Math.sin(a)*v-10,g:-15,life:rnd(.4,.8),c:['#ffffff','#e6e6ee','#c8c8d4'][i%3],s:2})}
  burst(cx,cy,d.hit,10,50);mon.alive=false;
  floats.push({s:'+'+reward,x:cx-4,y:cy-8,life:1.3});
  for(let i=0;i<reward;i++)coins.push({x:cx,y:cy,vx:rnd(-35,35),vy:rnd(-75,-45),t:-i*.06});
  say(d.win+'  +'+reward+' coins');
  hero.pose='victory';hero.vy=-80;petCheer(true);await wait(.55);hero.vy=-80;petCheer(true);
  await until(()=>coins.length===0);await wait(.8);
  mon=null;hero.pose='walk';scrollTarget=18;busy=false;opts.onComplete?.({type,weapon,hero:heroKey,coins:reward,total:coinsTotal});
  await wait(1.6);if(!busy)say('Back on the trail. Finish a chore to find the next monster.');
}


/* ---------- grounded mode ---------- */
const copPal={K,N:'#2a3f8a',S:'#f4c89c',E:K,M:'#6e3418',Y:'#f4c542',B:'#1a1c2c'};
const copTop=["...KKKKKK...","..KNNNYNNK..",".KKKKKKKKKK.","..KSSSSSSSK.","..KSESSESSK.","..KMMMMSSSK.","...KSSSSK...",
"..KNNNNNNK..",".KSNNYNNNNSK",".KSNNNNNNNSK","..KKKKKKKKK.","..KNNNKNNNK."];
const copA=sprite([...copTop,"..KNNK.KNNK.","..KBBK.KBBK.","..KKK..KKK.."],copPal);
const copB=sprite([...copTop,"...KNNKNNK..","...KBBKBBK..","...KKKKKK..."],copPal);
let grounded=false,siren=false,cage=null,cops=[],flyWeapon=null,royal=null;
/* pointing arm: drawn pointing RIGHT; flip it for a left-facing character.
   Sleeve + cuff match the character's outfit; one outlined index finger, shaded knuckles. */
function makeArm(sleeve,cuff,skin='#f4c89c',shade='#d39a6c'){return sprite([
"KKKKKKK.........",
"KRRRRWKKKKKKKKK.",
"KRRRRWKSSSSSSSSK",
"KRRRRWKSSSKKKKK.",
"KKKKKKKSsSK.....",
"......KKKK......"],{K,R:sleeve,W:cuff,S:skin,s:shade})}
const ARMS={king:makeArm('#c0392b','#ffffff'),queen:makeArm('#7a3fb0','#f4c542')};
function drawRoyal(){if(!royal)return;const R_=HEROES[royal.who],moving=royal.vx!==0,fr=moving&&(time*8|0)%2?R_.b:R_.a;
  const x=Math.round(royal.x),y=G-(R_.h-1),left=royal.vx<=0;
  rect(ctx,x+3,G,8,1,SHC);
  if(left){ctx.save();ctx.translate(x+14,y);ctx.scale(-1,1);ctx.drawImage(fr,0,0);ctx.restore()}else ctx.drawImage(fr,x,y);
  if(royal.point&&left){const arm=ARMS[royal.who],jab=(time*6|0)%2?-1:0,ext=Math.min(1,royal.point);
    const ax=Math.round(x+5-arm.width*ext)+jab,ay=y+R_.hand-3;
    ctx.save();ctx.beginPath();ctx.rect(ax-2,ay-1,x+6-ax+2,arm.height+2);ctx.clip();
    ctx.translate(ax+arm.width,ay);ctx.scale(-1,1);ctx.drawImage(arm,0,0);ctx.restore()}}
async function groundHero(reason,by='king'){
  if(busy||grounded)return false;busy=true;siren=true;
  say('WEE-OOO! The Chore Patrol is on the way!');scrollTarget=0;
  await wait(.5);scroll=0;hero.pose='idle';
  royal={who:HEROES[by]&&ARMS[by]?by:'king',x:W+4,vx:-42,point:0};
  cops=[{x:W+22,vx:-42,flip:false},{x:W+36,vx:-42,flip:false}];
  await until(()=>royal.x<=heroX()+27);royal.vx=0;cops.forEach(c=>c.vx=0);cops[0].x=royal.x+16;cops[1].x=royal.x+30;
  royal.pointT=1;hero.alert=1;say(reason?`${HEROES[royal.who].name}: "You're GROUNDED for ${reason}!"`:`${HEROES[royal.who].name}: "You're GROUNDED!"`);
  await wait(1.6);royal.pointT=0;
  const hx=heroX()+11,hy=heroY()+HEROES[heroKey].hand;flyWeapon={x:hx,y:hy,tx:cops[0].x+1,ty:G-6,t:0};hero.noWeapon=true;
  say('The Chore Patrol confiscates your weapon!');await until(()=>flyWeapon.t>=1);
  cage={y:-60,vy:0,drop:true,locked:false};await until(()=>!cage.drop);
  if(!reduce)shake=.3;burst(heroX()+7,G,['#b4b4c4','#8890a8','#ffffff'],18,60);
  await wait(.35);cage.locked=true;burst(heroX()+10,G-5,['#f4c542','#ffffff'],8,30);
  say('Locked in! Finish your chores to break out.');
  await wait(1);cops.forEach(c=>{c.vx=40;c.flip=true});royal.vx=40;
  await until(()=>cops.every(c=>c.x>W+4)&&royal.x>W+4);cops=[];royal=null;flyWeapon=null;siren=false;
  grounded=true;busy=false;return true}
async function releaseHero(){
  if(!grounded||busy)return false;busy=true;
  say('Chores done! The lock pops open!');cage.locked=false;
  particles.push({x:heroX()+10,y:G-5,vx:30,vy:-70,g:220,life:.9,c:'#f4c542',s:3});
  await wait(.6);cage.lift=true;await until(()=>cage.y<-70);cage=null;
  hero.noWeapon=false;hero.pose='victory';hero.vy=-80;burst(heroX()+7,G-8,['#f4c542','#fff3a8','#ffffff'],16,60);
  say('FREE! Back to the quest!');await wait(.55);hero.vy=-80;await wait(1);
  hero.pose='walk';scrollTarget=18;grounded=false;busy=false;return true}
function drawCage(){const hx=Math.round(heroX()),x0=hx-3,top=G-21+Math.round(cage.y);
  for(let x=x0;x<=x0+19;x+=3){rect(ctx,x,top,1,22,'#c8d0e0');rect(ctx,x+1,top,1,22,'#6e7688')}
  rect(ctx,x0-1,top-3,22,4,K);rect(ctx,x0,top-2,20,2,'#55606e');rect(ctx,x0-1,top+20,22,3,K);rect(ctx,x0,top+21,20,1,'#55606e');
  if(cage.locked){const lx=x0+8,ly=top+15;rect(ctx,lx,ly-2,1,2,'#8890a8');rect(ctx,lx+3,ly-2,1,2,'#8890a8');rect(ctx,lx,ly-3,4,1,'#8890a8');
    rect(ctx,lx-1,ly,6,5,K);rect(ctx,lx,ly+1,4,3,'#f4c542');px(ctx,lx+2,ly+2,K)}}
function drawCops(){for(const c of cops){const moving=c.vx!==0,fr=moving&&(time*8|0)%2?copB:copA;const x=Math.round(c.x),y=G-15;
  rect(ctx,x+2,G,8,1,SHC);
  if(c.flip){ctx.save();ctx.translate(x+12,y);ctx.scale(-1,1);ctx.drawImage(fr,0,0);ctx.restore()}else ctx.drawImage(fr,x,y);
  if(siren){const on=(time*8|0)%2;px(ctx,x+5,y-1,on?'#ff4a4a':'#4a7aff');px(ctx,x+6,y-1,on?'#4a7aff':'#ff4a4a')}}
  if(flyWeapon){const f=flyWeapon,t=Math.min(1,f.t),c0=cops[0];const tx=c0?c0.x+(c0.flip?11:1):f.tx;
    const fx=t<1?f.x+(tx-f.x)*t:tx,fy=t<1?f.y+(f.ty-f.y)*t-Math.sin(t*Math.PI)*14:G-6;
    drawWeapon(WEAPONS[weapon],fx,fy,t<1?-55+t*720:(c0&&c0.flip?-30:-150))}}


/* ---------- approval screen: pixel thought bubble + hearts ---------- */
function tint(src,col){const[c,g]=canvas(src.width,src.height);g.drawImage(src,0,0);g.globalCompositeOperation='source-in';g.fillStyle=col;g.fillRect(0,0,c.width,c.height);return c}
function cloudMask(w,h){const[c,g]=canvas(w,h);const r=Math.max(3,Math.min(5,(h>>1)-2)),W_='#ffffff';
  rect(g,r,1,w-2*r,h-2,W_);rect(g,1,r,w-2,h-2*r,W_);
  const n=Math.max(2,Math.round((w-2*r)/7));for(let i=0;i<=n;i++){const x=Math.round(r+(w-2*r-1)*i/n);disc(g,x,r,r,W_);disc(g,x,h-r-1,r,W_)}
  const m=Math.max(1,Math.round((h-2*r)/6));for(let i=0;i<=m;i++){const y=Math.round(r+(h-2*r-1)*i/m);disc(g,r,y,r,W_);disc(g,w-r-1,y,r,W_)}
  return c}
function makeThought(type){const d=MON[type],hr=d.headroom||0;const[ic,ig]=canvas(d.w,d.h+hr);d.draw(ig,0,hr,{open:0,t:0,idle:false,shake:0,flash:0});
  const w=d.w+10,h=d.h+hr+8,mask=cloudMask(w,h);const[c,g]=canvas(w+2,h+2);const edge=tint(mask,K);
  for(const[dx,dy]of[[0,1],[2,1],[1,0],[1,2]])g.drawImage(edge,dx,dy);
  const[inner,ing]=canvas(w,h);ing.drawImage(tint(mask,'#cfdcef'),0,0);ing.globalCompositeOperation='source-atop';ing.drawImage(tint(mask,'#ffffff'),-1,-1);
  g.drawImage(inner,1,1);px(g,4,3,'#ffffff');g.drawImage(ic,1+5,1+4);return c}
let thought=null;
function think(type,text){if(!MON[type])return false;thought={img:makeThought(type),t:0};if(!busy&&!grounded){scrollTarget=0;scroll=0;hero.pose='rest'}if(text)say(text);return true}
function clearThought(){thought=null;if(!busy&&!grounded){scrollTarget=18;hero.pose='walk'}}
function puff(x,y,r){disc(ctx,x,y,r,K);disc(ctx,x,y,r-1,'#ffffff')}
function drawThought(){if(!thought)return;const t=thought.t,hx=Math.round(heroX()),hy=Math.round(heroY());
  if(t>.08)puff(hx+15,hy-1,2);if(t>.2)puff(hx+20,hy-4,3);
  if(t>.34){const im=thought.img,bob=Math.round(Math.sin(time*2.4));const x=Math.min(W-im.width-2,hx+24),y=Math.max(14,hy+3-im.height)+bob;
    ctx.drawImage(im,x,y);if(t<.5)for(let k=0;k<6;k++){const a=k/6*Math.PI*2;px(ctx,x+im.width/2+Math.cos(a)*(im.width/2+3),y+im.height/2+Math.sin(a)*(im.height/2+3),'#ffffff')}}}
const heartS=sprite([".KK.KK.","KWRKRRK","KRRRRRK",".KRRRK.","..KRK..","...K..."],{K,W:'#ffb0b0',R:'#e04a4a'});
const heartE=sprite([".KK.KK.","KDDKDDK","KDDDDDK",".KDDDK.","..KDK..","...K..."],{K,D:'#4a3a58'});
let hearts=opts.hearts??null,maxHearts=opts.maxHearts??3;
function drawHearts(){if(hearts==null)return;for(let i=0;i<maxHearts;i++)ctx.drawImage(i<hearts?heartS:heartE,W-3-(maxHearts-i)*9,3)}
const hudCoinY=()=>hearts==null?6:16;


/* ---------- weapon special attacks (fire on the final hit) ---------- */
const featherS=sprite(["...F","..Ff",".Ff.","F..."],{F:'#ff8ac6',f:'#c46cd9'});
const flowerS=sprite([".P.","PYP",".P.",".G."],{P:'#ff8ac6',Y:'#f4d742',G:'#3a9d4a'});
const starS=sprite(["..Y..",".YYY.","YYYYY",".Y.Y."],{Y:'#f4d742'});
const pageS=sprite(["KKKK","KWWK","KwwK","KWWK","KKKK"],{K,W:'#fff8e6',w:'#b8b0a0'});
const sprOf=k=>({feather:featherS,flower:flowerS,star:starS,page:pageS,snowball:snowballS,log:logS,duck:duckS,crumb:crumbS,leaf:leafS[0]})[k];
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
 baguette:{name:'Breadcrumb Storm',fx:'rain',spr:'crumb',n:20},
 hockey:{name:'Slapshot Blizzard',fx:'burst',cols:['#ffffff','#bfe3ff','#2a2a38'],n:30,speed:80},
 crossing:{name:'All Stop!',fx:'ring',cols:['#e04a4a','#ffffff']},
 wrench:{name:'Gear Grinder',fx:'swirl',cols:['#c8d0e0','#8890a8','#f4c542']},
 bottle:{name:'Lullaby Hush',fx:'orbit'},
 foamfinger:{name:'Stadium Wave',fx:'burst',cols:['#f4c542','#3b74d9','#ffffff','#e04a4a'],n:40,speed:85},
 iron:{name:'Steam Press',fx:'burst',cols:['#ffffff','#e6ecf5','#c8d0e0'],n:34,speed:55}
};
const effects=[];
function special(wk,cx,cy){const sp=SPECIALS[wk]||{name:'Power Strike',fx:'burst',cols:WEAPONS[wk].fx};const cols=sp.cols==='rainbow'?RAINBOW:(sp.cols||['#ffffff']);
  say(`SPECIAL ATTACK: ${sp.name.toUpperCase()}!`);if(!reduce)shake=.35;effects.push({type:'flash',t:0,dur:.12});
  const P=o=>particles.push(o);
  switch(sp.fx){
   case 'swirl':effects.push({type:'swirl',t:0,dur:1.1,cx,cy,cols});break;
   case 'rain':for(let i=0;i<(sp.n||10);i++)P({x:cx+rnd(-24,22),y:-rnd(4,46),vx:rnd(-6,6),vy:rnd(45,75),g:70,life:1.8,spr:sprOf(sp.spr)});break;
   case 'wave':effects.push({type:'wave',t:0,dur:.8,cols});break;
   case 'flash':effects.push({type:'flash',t:0,dur:.35});for(let i=0;i<8;i++){const a=i/8*Math.PI*2;P({x:cx,y:cy,vx:Math.cos(a)*55,vy:Math.sin(a)*55,g:0,life:.6,spr:starS})}break;
   case 'suck':effects.push({type:'suck',t:0,dur:.9,cx,cy,cols});break;
   case 'ring':effects.push({type:'ring',t:0,dur:.7,cx,cy,cols});break;
   case 'burst':for(let i=0;i<(sp.n||20);i++){const a=R()*Math.PI*2,v=rnd(20,sp.speed||70);P({x:cx,y:cy,vx:Math.cos(a)*v,vy:Math.sin(a)*v-20,g:sp.spr?40:110,life:rnd(.6,1.1),spr:sp.spr?sprOf(sp.spr):null,c:cols[i%cols.length]})}
     if(sp.ring)effects.push({type:'ring',t:0,dur:.6,cx,cy,cols:sp.ring});break;
   case 'bubble':effects.push({type:'bubble',t:0,dur:.9,cx,cy,cols});break;
   case 'flip':if(mon){mon.hopV=sp.homerun?-150:-110;mon.spinT=.6}for(let i=0;i<6;i++){const a=R()*Math.PI*2;P({x:cx,y:cy,vx:Math.cos(a)*50,vy:Math.sin(a)*50,g:0,life:.5,spr:starS})}
     if(sp.homerun)P({x:cx,y:cy,vx:90,vy:-110,g:60,life:1.2,spr:starS});break;
   case 'scribble':effects.push({type:'scribble',t:0,dur:.9,cx,cy});break;
   case 'bloom':for(let i=0;i<9;i++)P({x:cx+rnd(-26,22),y:G-3,vx:0,vy:-rnd(30,60),g:140,life:1.4,spr:flowerS});P({x:cx,y:cy,vx:0,vy:0,g:0,life:.01,c:'#fff'});
     for(let i=0;i<12;i++){const a=R()*Math.PI*2;P({x:cx,y:cy,vx:Math.cos(a)*40,vy:Math.sin(a)*40,g:60,life:.6,c:['#ff8ac6','#f4d742','#5cc96a'][i%3]})}break;
   case 'orbit':effects.push({type:'orbit',t:0,dur:1.4,cx,cy});break;
  }}
function updateEffects(dt){for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.t+=dt;
  if(e.type==='suck'&&mon){const[tx,ty]=weaponTip(WEAPONS[weapon],heroX()+11,heroY()+HEROES[heroKey].hand,hero.ang);for(let k=0;k<3;k++){const a=R()*Math.PI*2,r=rnd(10,20),x=e.cx+Math.cos(a)*r,y=e.cy+Math.sin(a)*r;
    particles.push({x,y,vx:(tx-x)/.35,vy:(ty-y)/.35,g:0,life:.35,c:e.cols[k%e.cols.length]})}}
  if(e.type==='bubble'&&e.t>=e.dur){for(let k=0;k<20;k++){const a=k/20*Math.PI*2;particles.push({x:e.cx+Math.cos(a)*14,y:e.cy+Math.sin(a)*12,vx:Math.cos(a)*50,vy:Math.sin(a)*50,g:60,life:.4,c:e.cols[k%e.cols.length]})}}
  if(e.t>=e.dur)effects.splice(i,1)}}
function drawEffects(){for(const e of effects){const p=e.t/e.dur;
  if(e.type==='swirl')for(let k=0;k<48;k++){const f=k/48,a=f*Math.PI*5+e.t*12,r=(3+f*16)*(1-p*.4);const z=k%2?1:2;rect(ctx,e.cx+Math.cos(a)*r,e.cy+10-f*30,z,z,e.cols[k%e.cols.length]);if(k%4===0)px(ctx,e.cx+Math.cos(a+.3)*r,e.cy+10-f*30,K)}
  if(e.type==='wave'){const front=-12+p*(W+30);for(let x=Math.max(0,front-40);x<Math.min(W,front);x++){const h=Math.round(Math.sin((x-front+40)/40*Math.PI)*7);if(h<=0)continue;
    rect(ctx,x,G-h,1,h,e.cols[0]);px(ctx,x,G-h,e.cols[2]);if((x+(time*20|0))%5===0)px(ctx,x,G-h-1,e.cols[1])}}
  if(e.type==='ring'){const r=4+p*42;for(let k=0;k<48;k++){const a=k/48*Math.PI*2;px(ctx,e.cx+Math.cos(a)*r,e.cy+Math.sin(a)*r*.8,e.cols[k%e.cols.length]);px(ctx,e.cx+Math.cos(a)*(r-2),e.cy+Math.sin(a)*(r-2)*.8,e.cols[(k+1)%e.cols.length])}}
  if(e.type==='bubble'){const r=13+Math.round(Math.sin(e.t*14)),ry=11-Math.round(Math.sin(e.t*14));for(let k=0;k<56;k++){const a=k/56*Math.PI*2;px(ctx,e.cx+Math.cos(a)*r,e.cy+Math.sin(a)*ry,e.cols[(k>>3)%e.cols.length])}
    px(ctx,e.cx-6,e.cy-6,'#ffffff');px(ctx,e.cx-5,e.cy-7,'#ffffff');px(ctx,e.cx-7,e.cy-5,'#ffffff')}
  if(e.type==='scribble'){const r2=mulberry((time*12|0)+7);let x=e.cx-12,y=e.cy-8;for(let k=0;k<40;k++){const nx=e.cx-12+r2()*24,ny=e.cy-10+r2()*20;
    const st=Math.max(Math.abs(nx-x),Math.abs(ny-y))|0;for(let j=0;j<st;j++)px(ctx,x+(nx-x)*j/st,y+(ny-y)*j/st,'#3a3a48');x=nx;y=ny}}
  if(e.type==='orbit')for(let k=0;k<5;k++){const a=k/5*Math.PI*2+e.t*7;ctx.drawImage(starS,Math.round(e.cx-2+Math.cos(a)*11),Math.round(e.cy-16+Math.sin(a)*3))}
  if(e.type==='flash'&&((e.t*40|0)%2===0)){ctx.globalAlpha=.6;rect(ctx,0,0,W,H,'#ffffff');ctx.globalAlpha=1}}}

/* ================= MONSTER ARENA (learning battles) ================= */
// Tune these any time.
const ARENA={entry:2,perKill:1,monsterHP:3,heroHP:3};
// Each question category has its own monster.
const ARENA_CATS={
 math:{name:'Math',monster:'calc'},
 words:{name:'Words',monster:'reading'},
 french:{name:'French',monster:'mime'},
 nature:{name:'Nature & Science',monster:'flask'},
 puzzles:{name:'Puzzles',monster:'alarm'},
 morals:{name:'Good Morals',monster:'robber'}
};
const ARENA_LEVELS={little:{name:'Little Explorer',ages:'Ages 3–5',readAloud:true},kid:{name:'Adventurer',ages:'Ages 6–8',readAloud:false},big:{name:'Champion',ages:'Ages 9–12',readAloud:false},teen:{name:'Legend',ages:'Ages 13–16',readAloud:false}};
let hurtMode=false;
const aqR=(()=>{try{const buf=new Uint32Array(1);crypto.getRandomValues(buf);return()=>{crypto.getRandomValues(buf);return buf[0]/4294967296}}catch(e){return R}})();
const aqPick=a=>a[aqR()*a.length|0];
const aqBags=new Map();
// Shuffle-bag: every item in a list comes up once before any repeats, and never twice in a row.
function aqDraw(key,list){let bag=aqBags.get(key);if(!bag)aqBags.set(key,bag={items:[],last:null});
  if(!bag.items.length){bag.items=aqShuf(list.slice());const n=bag.items.length;if(n>1&&bag.items[n-1]===bag.last)[bag.items[0],bag.items[n-1]]=[bag.items[n-1],bag.items[0]]}
  bag.last=bag.items.pop();return bag.last}
const aqShuf=a=>{for(let i=a.length-1;i>0;i--){const j=aqR()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const aqInt=(a,b)=>a+(aqR()*(b-a+1)|0);
function aqMC(correct,wrongs,n=3){const key=x=>JSON.stringify(x);const set=[correct];
  for(const w of aqShuf(wrongs.slice()))if(set.length<n&&!set.some(s=>key(s)===key(w)))set.push(w);
  aqShuf(set);return{choices:set,answer:set.findIndex(s=>key(s)===key(correct))}}
const aqT=v=>({t:'text',v:String(v)});
function aqNear(n,spread,min=0){const out=[];for(let d=1;out.length<6;d++){if(n+d<=n+spread*2)out.push(n+d);if(n-d>=min)out.push(n-d);if(d>40)break}return aqShuf(out).map(aqT)}
const aqEN=t=>({t,lang:'en-CA'}),aqFR=t=>({t,lang:'fr-CA'});
const PET_WORDS={frog:'frog',duckling:'duck',puppy:'puppy',bunny:'bunny',crab:'crab',turtle:'turtle',owl:'owl',whale:'whale',shark:'shark',kitten:'kitten',hamster:'hamster',penguin:'penguin',fox:'fox',dragon:'dragon',unicorn:'unicorn'};
const COLOURS=[['red','rouge','#e04a4a'],['blue','bleu','#3b74d9'],['yellow','jaune','#f4d742'],['green','vert','#3fa34d'],['orange','orange','#f4862e'],['pink','rose','#ff8ac6'],['purple','violet','#8e5bd0'],['black','noir','#2a2a38'],['white','blanc','#ffffff'],['brown','brun','#8a5a2a']];
const SHAPES=['circle','square','triangle','star','heart'];
const KID_WORDS=['because','friend','said','they','school','little','would','could','people','every','water','sleep','there','where','house','again','about','write','night','light','after','before','water','animal','family','pretty','always','around','thought','laugh'];
const BIG_WORDS=['necessary','separate','definitely','environment','government','rhythm','beautiful','February','Wednesday','library','restaurant','knowledge','especially','neighbour','favourite','centre','receive','believe','achieve','tomorrow','surprise','calendar','temperature','vacuum','committee','occasion','privilege','guarantee','conscience','exaggerate'];
const SYN=[['enormous','huge',['tiny','quiet','fast']],['rapid','fast',['slow','loud','soft']],['furious','angry',['happy','sleepy','calm']],['ancient','very old',['brand new','shiny','tiny']],['brave','courageous',['scared','lazy','sad']],['glimmer','shine',['shout','crawl','melt']],['exhausted','very tired',['very hungry','excited','lost']],['gigantic','huge',['small','narrow','short']],['silent','quiet',['noisy','bright','wet']],['assist','help',['hurt','hide','leave']]];
const ANT=[['ancient','modern',['old','dusty','huge']],['generous','selfish',['kind','giving','friendly']],['victory','defeat',['win','trophy','success']],['shallow','deep',['wet','short','calm']],['rough','smooth',['bumpy','hard','dry']],['expand','shrink',['grow','stretch','swell']],['hero','villain',['champion','friend','knight']],['arrive','depart',['come','reach','land']]];
const FR_ANIMALS=[['le chat','kitten'],['le chien','puppy'],['la grenouille','frog'],['le lapin','bunny'],['le canard','duckling'],['la tortue','turtle'],['le hibou','owl'],['la baleine','whale'],['le requin','shark'],['le crabe','crab'],['le renard','fox'],['le dragon','dragon'],['le pingouin','penguin']];
const FR_NUM=['zéro','un','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze'];
const FR_VOCAB=[['la bibliothèque','the library'],['la cuisine','the kitchen'],['le petit-déjeuner','breakfast'],['le souper','supper'],['la fenêtre','the window'],['les devoirs','homework'],['le lit','the bed'],['la chemise','the shirt'],['les chaussures','the shoes'],['l’école','the school'],['le vélo','the bike'],['la neige','the snow'],['la pluie','the rain'],['le soleil','the sun'],['aujourd’hui','today'],['demain','tomorrow'],['hier','yesterday'],['lundi','Monday'],['vendredi','Friday'],['janvier','January'],['juillet','July'],['le frère','the brother'],['la sœur','the sister'],['les grands-parents','the grandparents'],['manger','to eat'],['dormir','to sleep'],['nettoyer','to clean'],['jouer','to play'],['lire','to read'],['aider','to help']];
const NAT_KID=[['What do plants need to grow?','sunlight',['candy','socks','music']],['How many legs does a spider have?','8',['6','4','10']],['Which animal is a mammal?','whale',['shark','frog','goldfish']],['What is frozen water called?','ice',['steam','sand','glass']],['Which planet do we live on?','Earth',['Mars','the Moon','the Sun']],['What do bees make?','honey',['milk','silk','bread']],['What is a baby frog called?','tadpole',['puppy','calf','chick']],['How many seasons are in a year?','4',['2','6','12']],['Which animal has a long trunk?','elephant',['giraffe','horse','lion']],['What do caterpillars turn into?','butterflies',['bees','birds','worms']],['Where do fish breathe from?','gills',['noses','ears','fins']],['What colour do you get mixing blue and yellow?','green',['purple','orange','pink']],['Which is a bird?','owl',['bat','whale','snake']],['What falls from clouds?','rain',['sand','leaves','rocks']],['What part of a plant is underground?','roots',['petals','leaves','flowers']]];
const NAT_BIG=[['What is the largest planet?','Jupiter',['Saturn','Earth','Mars']],['Which organ pumps blood?','the heart',['the lungs','the brain','the liver']],['What is the capital of Canada?','Ottawa',['Toronto','Vancouver','Montréal']],['What is the capital of Ontario?','Toronto',['Ottawa','Kingston','Waterloo']],['At what temperature does water boil?','100 °C',['50 °C','0 °C','212 °C']],['Which planet is called the Red Planet?','Mars',['Venus','Jupiter','Mercury']],['How many provinces does Canada have?','10',['13','8','12']],['What do herbivores eat?','plants',['meat','both','insects']],['What gas do plants take in?','carbon dioxide',['oxygen','helium','nitrogen']],['What is the largest ocean?','Pacific',['Atlantic','Arctic','Indian']],['What is the fastest land animal?','cheetah',['lion','horse','antelope']],['What force pulls things to the ground?','gravity',['magnetism','friction','wind']],['How many bones are in an adult body?','206',['106','306','26']],['Animals active at night are called?','nocturnal',['diurnal','aquatic','dormant']],['A frog is which kind of animal?','amphibian',['reptile','mammal','fish']],['What is the closest star to Earth?','the Sun',['the North Star','Mars','the Moon']],['What are the three states of matter?','solid, liquid, gas',['hot, warm, cold','rock, paper, scissors','land, sea, air']],['Which layer of Earth is in the very middle?','inner core',['crust','mantle','outer core']],['What makes the food in a leaf?','photosynthesis',['digestion','evaporation','erosion']],['Which Canadian animal builds dams?','beaver',['moose','loon','bear']]];
function misspell(w){const ops=[s=>{const i=1+(aqR()*(s.length-2)|0);return s.slice(0,i)+s.slice(i+1)},s=>{const i=aqR()*(s.length-1)|0;return s.slice(0,i)+s[i+1]+s[i]+s.slice(i+2)},
  s=>{const i=1+(aqR()*(s.length-2)|0);return s.slice(0,i)+s[i]+s.slice(i)},s=>s.replace(/ie/,'ei').replace(/ce/,'se'),s=>s.replace(/ou/,'o').replace(/ph/,'f'),s=>s.replace(/(.)\1/,'$1')];
  for(let t=0;t<12;t++){const m=aqPick(ops)(w);if(m!==w&&m.length>2)return m}return w+'e'}
const LETTER_PETS={F:'frog',D:'duckling',P:'puppy',B:'bunny',C:'crab',T:'turtle',O:'owl',W:'whale',S:'shark',K:'kitten',H:'hamster'};
/* Good Morals: [scenario, right choice, [wrong choices]] by level */
const MORALS={
 little:[
  ['Your brother takes your toy without asking. What should you do?',"Say, “Can I have it back, please?”",['Hit him','Scream and cry']],
  ['You spill your juice on the floor. What should you do?','Tell a grown-up and help clean it',['Hide it','Walk away']],
  ['Your friend falls down and gets hurt. What should you do?','Ask if they are okay',['Laugh at them','Keep playing']],
  ['You and your sister both want the last cookie. What should you do?','Share it or take turns',['Grab it fast','Hide it']],
  ['Someone gives you a present. What should you say?','Thank you!',['Nothing','I don’t like it']],
  ['You break a toy by accident. What should you do?','Tell the truth',['Blame the dog','Hide it under the bed']],
  ['A grown-up is talking and you want to say something. What should you do?','Wait for your turn',['Shout over them','Pull on their arm']],
  ['It is time to clean up the toys. What should you do?','Help put them away',['Run and hide','Make a bigger mess']],
  ['A new kid wants to play with you. What should you do?','Say, “Come play with us!”',['Tell them to go away','Ignore them']],
  ['You feel really, really angry. What should you do?','Take deep breaths and use your words',['Throw things','Hit someone']],
  ['Your friend is sad. What should you do?','Give them a hug or ask what’s wrong',['Tell them to stop crying','Walk away']],
  ['A grown-up says it is bedtime. What should you do?','Brush your teeth and get in bed',['Run around the house','Yell “No!”']]],
 kid:[
  ['Your brother takes your toy without asking. What should you do?','Calmly ask for it back, and tell a parent if he won’t give it',['Grab it back and push him','Take one of his toys to get even']],
  ['You find $5 on the floor at school. What should you do?','Give it to a teacher',['Keep it','Spend it at lunch']],
  ['Other kids are teasing your friend. What should you do?','Stand up for your friend and tell a teacher',['Join in so they like you','Walk away and say nothing']],
  ['You forgot to do your homework. What should you do?','Tell your teacher the truth',['Say the dog ate it','Copy a friend’s']],
  ['You are losing a board game. What should you do?','Keep playing and be a good sport',['Flip the board over','Cheat when nobody is looking']],
  ['A classmate drops all of their books. What should you do?','Help pick them up',['Laugh at them','Kick the books away']],
  ['A parent asks you to set the table, but your show is on. What should you do?','Pause the show and help',['Pretend you didn’t hear','Say “later” and keep watching']],
  ['You bump into someone and they drop their lunch. What should you do?','Say sorry and help clean it up',['Run away fast','Say it was their fault']],
  ['You won a game and your sister is sad she lost. What should you do?','Say “good game” and cheer her up',['Brag about winning','Tease her about losing']],
  ['Someone is sitting alone at recess. What should you do?','Invite them to play',['Point and laugh','Pretend you didn’t see']],
  ['You see a friend take candy from a store without paying. What should you do?','Tell them it’s wrong and tell a grown-up',['Ask them to get you one too','Keep it a secret']],
  ['You promised to play with your sister, then a friend calls. What should you do?','Keep your promise, or ask your sister first',['Leave without telling her','Tell her she’s too little']]],
 big:[
  ['A friend posts a mean photo of a classmate in the group chat. What should you do?','Don’t share it, and tell a trusted adult',['Add a funny comment','Forward it to more people','Like it so you fit in']],
  ['The cashier gives you too much change. What should you do?','Tell the cashier and give it back',['Keep it, it was their mistake','Split it with your friend','Spend it before anyone notices']],
  ['Your friends want you to skip practice and lie to your coach. What should you do?','Say no and go to practice',['Go along so you fit in','Skip and say you were sick','Let a friend lie for you']],
  ['Someone you don’t know online asks where you live. What should you do?','Don’t answer, and tell a parent',['Tell them, they seem nice','Send a photo of your street','Give them your school instead']],
  ['You break a neighbour’s window playing ball. What should you do?','Knock, apologize and offer to help fix it',['Run home and hope nobody saw','Blame another kid','Leave a note with a fake name']],
  ['Your little brother keeps bugging you while you study. What should you do?','Calmly ask for quiet time, and offer to play after',['Yell at him to get lost','Lock him out and ignore him','Tell on him for nothing']],
  ['You see the answer sheet left on the teacher’s desk. What should you do?','Leave it and let the teacher know',['Take a picture of it','Peek at just one answer','Share it with your friends']],
  ['Kids are copying a new student’s accent to tease them. What should you do?','Don’t join in, and make the new student feel welcome',['Laugh along','Copy it too, it’s just a joke','Avoid the new student']],
  ['Your mistake cost your team the game. What should you do?','Own it, say sorry and keep practising',['Blame the referee','Quit the team','Blame a teammate']],
  ['A friend tells you someone is getting hurt, and asks you to keep it secret. What should you do?','Tell a trusted adult. Safety comes first',['Keep the secret no matter what','Post about it online','Try to handle it all alone']],
  ['A parent comes home tired and stressed. What should you do?','Offer to help without being asked',['Ask for something you want right away','Complain about dinner','Leave your mess for them']],
  ['You borrowed a friend’s game and scratched it. What should you do?','Tell them and offer to replace it',['Return it and say nothing','Say it was already scratched','Keep it so they forget']]]};
MORALS.teen=[
  ['Friends at a party offer you a vape. What should you do?','Say no thanks, and leave or call a parent if you feel pressured',['Try it so you fit in','Hold one so they stop asking','Post a picture of it']],
  ['Your ride home has been drinking. What should you do?','Don’t get in. Call a parent or another safe adult for a ride',['Get in, it’s only a short drive','Drive the car yourself','Walk home alone without telling anyone']],
  ['A friend says they want to hurt themselves. What should you do?','Tell a trusted adult right away, even if they asked you not to',['Keep it secret to be loyal','Tell them they’re being dramatic','Post about it online']],
  ['Someone online asks you to send a private photo. What should you do?','Say no, block them, and tell a trusted adult',['Send it if you trust them','Send someone else’s photo instead','Keep chatting so they like you']],
  ['Your group project partner isn’t doing any work. What should you do?','Talk to them first, then tell the teacher if nothing changes',['Do nothing and let the grade drop','Do it all and complain to everyone','Leave their name off without telling anyone']],
  ['Your plans change and you won’t be where you told your parents. What should you do?','Text your parents where you’re going before you go',['Don’t mention it','Turn off your location','Ask a friend to cover for you']],
  ['Your friends are mocking someone’s post in a group chat. What should you do?','Don’t join in, and say it’s not cool',['Add a meme about it','Screenshot it and share it','React with a laugh and stay quiet']],
  ['You want to skip a shift at your part-time job for a party. What should you do?','Keep your commitment, or arrange a proper shift swap',['Just don’t show up','Call in sick when you aren’t','Quit by text']],
  ['You feel bad about yourself after scrolling social media. What should you do?','Take a break, and remember people only post their best moments',['Scroll more to keep up','Post something mean about others','Change everything about yourself']],
  ['A friend copies your essay and hands it in. What should you do?','Talk to them, and be honest with the teacher if asked',['Say nothing, ever','Copy theirs next time','Tell everyone they’re a cheater']],
  ['Your younger sibling sees you break a house rule. What should you do?','Own up to it and set a better example',['Bribe them to stay quiet','Blame them first','Threaten them if they tell']],
  ['Your younger brother is being bullied at school. What should you do?','Support him and help him tell a parent or teacher',['Tell him to toughen up','Go fight the bully','Ignore it, it’s not your problem']],
  ['Your parents are busy and ask you to help out more. What should you do?','Pitch in with chores without being asked twice',['Say it’s not your job','Do it badly so they stop asking','Demand to be paid for everything']],
  ['You borrowed money from a sibling. What should you do?','Pay it back when you said you would',['Hope they forget','Say you never borrowed it','Pay back only half']],
  ['Someone you’ve only met online wants to meet in person. What should you do?','Don’t go, and tell a parent',['Go alone','Go, but don’t tell anyone','Send them your address']],
  ['You said something that hurt a friend’s feelings. What should you do?','Apologize sincerely and try to make it right',['Wait for them to forget','Say they’re too sensitive','Avoid them']],
  ['Your little sister wants to tag along with you and your friends. What should you do?','Include her when you can, or kindly plan time with her later',['Tell her she’s embarrassing','Sneak out so she can’t follow','Make fun of her in front of your friends']],
  ['You and a sibling both want the last of something you share. What should you do?','Split it fairly or let them have it this time',['Hide it so they can’t find it','Take it and say they had more last time','Tell on them to get it']]
];
/* Sibling scenarios: sharing, patience, fairness and looking after each other */
MORALS.little.push(
  ['Your baby sister knocks over your block tower. What should you do?','Take a deep breath and build it again together',['Knock her down','Yell at her']],
  ['Your brother is crying because he can’t find his teddy. What should you do?','Help him look for it',['Laugh at him','Hide it even more']],
  ['You and your brother both want the red cup. What should you do?','Take turns or pick another cup',['Grab it and run','Push him away']],
  ['Your big sister is reading and you want to play. What should you do?','Ask nicely if she can play later',['Pull her book away','Scream until she plays']],
  ['Your little brother wants to help you build. What should you do?','Let him help with an easy part',['Say “Go away, baby!”','Take all the blocks']],
  ['Your sister says sorry for bumping into you. What should you say?','“It’s okay. I forgive you.”',['Bump her back','Say “I don’t like you”']],
  ['You got a sticker and your brother didn’t. What should you do?','Be kind, and maybe share one',['Tease him about it','Wave it in his face']],
  ['A grown-up is feeding the baby and you want a snack. What should you do?','Wait patiently or ask nicely',['Whine and stomp','Take the baby’s food']]
);
MORALS.kid.push(
  ['Your little sister wants to play with your new toy. What should you do?','Show her how it works and let her have a turn',['Snatch it and run','Tell her she’ll break it and walk away']],
  ['Your little brother wrecks your drawing by accident. What should you do?','Tell him it’s okay and draw a new one together',['Rip up his drawing','Tell a parent he did it on purpose']],
  ['You and your sibling both want to pick the movie. What should you do?','Take turns choosing, or find one you both like',['Grab the remote and hide it','Say the oldest always picks']],
  ['Your little sister is scared of the dark. What should you do?','Stay with her and help turn on a night light',['Tell her monsters are coming','Laugh and leave her alone']],
  ['Your brother did something wrong and blames you. What should you do?','Calmly tell a parent the truth',['Hit him','Blame him for something else too']],
  ['Your big brother is in an online class for school. What should you do?','Play quietly until he’s done',['Make silly noises behind him','Turn off the Wi-Fi']],
  ['Your sibling gets a bigger piece of cake than you. What should you do?','Let it go, or kindly ask a grown-up',['Squish their cake','Cry until you get theirs']],
  ['Your little sister is learning to tie her shoes and it’s taking forever. What should you do?','Be patient and help her practise',['Do it for her and say she’s slow','Leave without her']]
);
MORALS.big.push(
  ['Your younger brother keeps coming into your room without asking. What should you do?','Calmly explain the rule and agree he’ll knock first',['Lock him out and yell','Go mess up his room','Tell your parents he steals things']],
  ['Your little sister copies everything you do. What should you do?','Set a good example. She looks up to you',['Tell her she’s annoying','Do silly things to trick her','Ignore her completely']],
  ['A parent asks you to watch your younger siblings for an hour. What should you do?','Keep them safe and play with them',['Lock yourself in your room','Let them do whatever they want','Scare them so they stay quiet']],
  ['Your brother earns a reward and you don’t. What should you do?','Congratulate him and keep working on your own goals',['Say it’s unfair and sulk','Say he must have cheated','Break his reward']],
  ['Your sibling tells you they feel sad at school. What should you do?','Listen, be kind, and help them tell a parent',['Tell everyone at school','Laugh about it','Tell them to stop being a baby']],
  ['You and your brother argue about who played the game longest. What should you do?','Make a fair timer plan together',['Unplug it so nobody plays','Hide the controller','Keep playing until he gives up']],
  ['Your little sister keeps losing a board game and gets upset. What should you do?','Help her learn and cheer for her good moves',['Beat her as hard as you can','Quit the game','Tell her she’s bad at it']],
  ['You said something mean to your brother when you were angry. What should you do?','Say sorry and tell him how you really felt',['Pretend it never happened','Say it was his fault','Say something even meaner']]
);

/* ---- ages 13-16 (Legend) ---- */
const TEEN_WORDS=['accommodate','conscientious','embarrass','millennium','occurrence','perseverance','questionnaire','recommend','liaison','bureaucracy','entrepreneur','hierarchy','mischievous','pronunciation','threshold','unnecessary','acquaintance','definitely','independent','maintenance','noticeable','parliament','possession','reminiscent','surveillance'];
const TEEN_VOCAB=[['benevolent','kind and generous',['angry and loud','careless','very sleepy']],['meticulous','very careful about details',['messy','very fast','forgetful']],['ambiguous','having more than one meaning',['very clear','very loud','brand new']],['resilient','able to recover quickly',['easily broken','very shy','always late']],['candid','honest and direct',['secretive','sweet-tasting','very tall']],['tedious','long and boring',['exciting','tiny','dangerous']],['diligent','hard-working',['lazy','rude','lucky']],['skeptical','doubtful',['certain','cheerful','hungry']],['obsolete','out of date',['brand new','popular','expensive']],['empathy','understanding how others feel',['being jealous','being bored','winning a prize']],['concise','short and clear',['long-winded','confusing','very loud']],['frugal','careful with money',['wasteful','generous','famous']],['inevitable','certain to happen',['impossible','unlikely','optional']],['vivid','bright and clear',['dull','faded','invisible']]];
const TEEN_DEVICES=[['“The wind whispered through the trees.”','personification',['simile','alliteration','hyperbole']],['“She was as brave as a lion.”','simile',['metaphor','onomatopoeia','personification']],['“Time is a thief.”','metaphor',['simile','alliteration','hyperbole']],['“Peter Piper picked a peck of pickled peppers.”','alliteration',['metaphor','simile','personification']],['“The bacon sizzled and the door went bang.”','onomatopoeia',['alliteration','metaphor','simile']],['“I’ve told you a million times!”','hyperbole',['simile','personification','onomatopoeia']],['“The classroom was a zoo.”','metaphor',['simile','hyperbole','alliteration']],['“The sun smiled down on us.”','personification',['metaphor','simile','onomatopoeia']]];
const FR_CONJ={'être':['suis','es','est','sommes','êtes','sont'],'avoir':['ai','as','a','avons','avez','ont'],'aller':['vais','vas','va','allons','allez','vont'],'faire':['fais','fais','fait','faisons','faites','font'],'parler':['parle','parles','parle','parlons','parlez','parlent'],'finir':['finis','finis','finit','finissons','finissez','finissent']};
const FR_PRON=['Je','Tu','Il','Nous','Vous','Ils'];
const FR_TEEN=[['Je voudrais un verre d’eau.','I would like a glass of water.'],['Où est la bibliothèque ?','Where is the library?'],['J’ai faim.','I am hungry.'],['Il fait froid aujourd’hui.','It is cold today.'],['Nous allons au cinéma ce soir.','We are going to the movies tonight.'],['Qu’est-ce que tu fais ?','What are you doing?'],['Je ne comprends pas.','I don’t understand.'],['Elle a quinze ans.','She is fifteen years old.'],['Peux-tu m’aider, s’il te plaît ?','Can you help me, please?'],['Mon frère est plus grand que moi.','My brother is taller than me.'],['J’aime jouer au hockey.','I like playing hockey.'],['Quelle heure est-il ?','What time is it?'],['Il pleut depuis ce matin.','It has been raining since this morning.'],['Je dois faire mes devoirs.','I have to do my homework.']];
const NAT_TEEN=[['Which part of a cell makes energy?','mitochondria',['nucleus','cell wall','ribosome']],['What is the chemical formula for water?','H₂O',['CO₂','O₂','NaCl']],['What is the capital of British Columbia?','Victoria',['Vancouver','Kelowna','Surrey']],['In what year did Canada become a country?','1867',['1776','1914','1982']],['How many territories does Canada have?','3',['2','4','10']],['What carries genetic information in cells?','DNA',['ATP','protein','glucose']],['What is the pH of pure water?','7',['0','14','1']],['Which gas do plants give off during photosynthesis?','oxygen',['carbon dioxide','nitrogen','methane']],['Which particle has a negative charge?','electron',['proton','neutron','nucleus']],['Which blood cells fight infection?','white blood cells',['red blood cells','platelets','plasma']],['What is the largest organ of the human body?','skin',['liver','heart','brain']],['Which is a renewable energy source?','wind',['coal','oil','natural gas']],['What is the capital of Nova Scotia?','Halifax',['Sydney','Moncton','Charlottetown']],['What is the main gas in the air we breathe?','nitrogen',['oxygen','carbon dioxide','hydrogen']],['Newton’s first law is also called the law of…','inertia',['gravity','friction','energy']],['Which 1982 document protects the rights of Canadians?','the Charter of Rights and Freedoms',['the Magna Carta','the US Bill of Rights','the Treaty of Paris']],['Which ocean is on Canada’s east coast?','Atlantic',['Pacific','Indian','Southern']],['What is the longest river entirely in Canada?','Mackenzie River',['St. Lawrence River','Fraser River','Yukon River']],['Animals that eat both plants and meat are called…','omnivores',['herbivores','carnivores','decomposers']],['Light travels about how fast?','300,000 km per second',['300 km per second','3,000 km per hour','30 km per second']]];
const TEEN_ODDS=[['You flip a coin twice. What is the chance of two heads?','1 in 4',['1 in 2','1 in 3','1 in 8']],['You roll a six-sided die. What is the chance of rolling a 6?','1 in 6',['1 in 3','1 in 2','1 in 12']],['A bag has 3 red marbles and 1 blue. What is the chance of picking blue?','1 in 4',['1 in 3','3 in 4','1 in 2']],['You roll two dice. Which total is most likely?','7',['2','12','10']]];
const aqSigned=n=>n<0?'- '+(-n):'+ '+n;
function teenQuestion(cat,k,Q){const r=aqR();
 if(cat==='math'){
  if(r<.25){const x=aqInt(-6,12),a=aqInt(2,9),b=aqInt(-15,20),c=a*x+b;return Q('Solve for x:  '+a+'x '+aqSigned(b)+' = '+c,[aqEN('Solve for x. '+a+' x '+(b<0?'minus '+(-b):'plus '+b)+' equals '+c)],aqMC(aqT(x),aqNear(x,3,-30),4))}
  if(r<.45){const p=aqPick([10,15,20,25,30,40,50,75]),n=aqInt(2,20)*20;return Q('What is '+p+'% of '+n+'?',null,aqMC(aqT(n*p/100),aqNear(n*p/100,5,0),4))}
  if(r<.6){const n=aqInt(4,15);return aqR()<.5?Q('What is √'+(n*n)+'?',[aqEN('What is the square root of '+(n*n)+'?')],aqMC(aqT(n),aqNear(n,2,1),4)):Q('What is '+n+'²?',[aqEN('What is '+n+' squared?')],aqMC(aqT(n*n),[n*n+n,n*n-n,2*n,(n+1)*(n+1)].map(aqT),4))}
  if(r<.8){const a=aqInt(2,12),b=aqInt(2,9),c=aqInt(2,9);return aqR()<.5?Q(a+' + '+b+' × '+c+' = ?',[aqEN(a+' plus '+b+' times '+c)],aqMC(aqT(a+b*c),[(a+b)*c,a*b+c,a+b+c].filter(v=>v!==a+b*c).map(aqT).concat(aqNear(a+b*c,3,0)),4)):Q('('+a+' + '+b+') × '+c+' = ?',[aqEN(a+' plus '+b+', all times '+c)],aqMC(aqT((a+b)*c),[a+b*c,a*c+b,a+b+c].filter(v=>v!==(a+b)*c).map(aqT).concat(aqNear((a+b)*c,3,0)),4))}
  const a=aqInt(2,12),b=aqInt(2,12);return aqR()<.5?Q('(-'+a+') × (-'+b+') = ?',[aqEN('negative '+a+' times negative '+b)],aqMC(aqT(a*b),[-a*b,a+b,-(a+b)].map(aqT).concat(aqNear(a*b,3,0)),4)):Q('-'+a+' + '+b+' = ?',[aqEN('negative '+a+' plus '+b)],aqMC(aqT(b-a),[a+b,a-b,-(a+b)].filter(v=>v!==b-a).map(aqT).concat(aqNear(b-a,3,-60)),4))}
 if(cat==='words'){
  if(r<.4){const w=aqDraw('teen-spell',TEEN_WORDS);const wr=[];for(let i=0;i<10;i++)wr.push(misspell(w));return Q('Which word is spelled right?',[aqEN('Which word is spelled right? '+w+'.')],aqMC(aqT(w),wr.filter(x=>x!==w).map(aqT),4))}
  if(r<.75){const [w,a,b]=aqDraw('teen-vocab',TEEN_VOCAB);return Q('What does "'+w+'" mean?',null,aqMC(aqT(a),b.map(aqT),4))}
  const [line,a,b]=aqDraw('teen-device',TEEN_DEVICES);return Object.assign(Q('Which writing device is this?  '+line,null,aqMC(aqT(a),b.map(aqT),4)),{layout:'list'})}
 if(cat==='french'){
  if(r<.5){const verb=aqPick(Object.keys(FR_CONJ)),forms=FR_CONJ[verb],i=aqInt(0,5),ans=forms[i];const pron=(i===0&&/^[aeéiou]/.test(ans))?'J’':FR_PRON[i];
    return Q(pron+(pron.endsWith('’')?'':' ')+'___ ('+verb+')',[aqEN('Fill in the verb'),aqFR(verb)],aqMC(aqT(ans),forms.filter(f=>f!==ans).map(aqT),4))}
  const [fr,en]=aqDraw('teen-fr-phrase',FR_TEEN);const others=FR_TEEN.filter(x=>x[1]!==en).map(x=>aqT(x[1]));return Object.assign(Q('What does "'+fr+'" mean?',[aqEN('What does'),aqFR(fr),aqEN('mean?')],aqMC(aqT(en),others,4)),{layout:'list'})}
 if(cat==='nature'){const [q,a,w]=aqDraw('nature-teen',NAT_TEEN);return Q(q,null,aqMC(aqT(a),w.map(aqT),4))}
 if(cat==='puzzles'){
  if(r<.25){const [q,a,w]=aqDraw('teen-odds',TEEN_ODDS);return Q(q,null,aqMC(aqT(a),w.map(aqT),4))}
  if(r<.5){const price=aqInt(4,20)*10,p=aqPick([10,20,25,50]),sale=price*(100-p)/100;const $=v=>'$'+(Number.isInteger(v)?v:v.toFixed(2));return Q('A $'+price+' jacket is '+p+'% off. What is the sale price?',null,aqMC(aqT($(sale)),[price*p/100,sale+10,sale-5,price-p,sale+5,sale-10].filter(v=>v>0&&v!==sale).map(v=>aqT($(v))),4))}
  if(r<.75){const sp=aqPick([40,50,60,80,90,100]),h=aqInt(2,5);return Q('A car drives '+sp*h+' km in '+h+' hours. What is its average speed?',null,aqMC(aqT(sp+' km/h'),[sp+10,sp-10,sp*h,sp+20].filter(v=>v>0&&v!==sp).map(v=>aqT(v+' km/h')),4))}
  if(aqR()<.5){const a=aqInt(1,5),b=aqInt(a,8);const seq=[a,b];while(seq.length<6)seq.push(seq[seq.length-1]+seq[seq.length-2]);const nxt=seq[4]+seq[5];return Q('What comes next?  '+seq.join(', ')+', ?',[aqEN('What comes next? '+seq.join(', '))],aqMC(aqT(nxt),aqNear(nxt,4,1),4))}
  const st=aqInt(1,6);const sq=[0,1,2,3,4].map(i=>(st+i)*(st+i));const nxt=(st+5)*(st+5);return Q('What comes next?  '+sq.join(', ')+', ?',[aqEN('What comes next? '+sq.join(', '))],aqMC(aqT(nxt),[nxt+st,nxt-1,sq[4]+sq[3],nxt+10].filter(v=>v!==nxt).map(aqT),4))}
 return null}
function makeQuestionRaw(cat,lvl,k=0){const Q=(text,sayParts,res,vis)=>Object.assign({cat,text,say:sayParts||[aqEN(text)],vis:vis||null},res);
 if(lvl==='teen'&&cat!=='morals'){const tq=teenQuestion(cat,k,Q);if(tq)return tq}
 if(cat==='math'){
  if(lvl==='little'){const n=aqInt(1,Math.min(8,4+k));return Q('How many apples?',null,aqMC(aqT(n),aqNear(n,2,1)),{apples:n})}
  if(lvl==='kid'){const hard=k>3;if(aqR()<.5){const a=aqInt(1,hard?15:10),b=aqInt(1,hard?10:9);return Q(`${a} + ${b} = ?`,[aqEN(`${a} plus ${b}`)],aqMC(aqT(a+b),aqNear(a+b,3)))}
    const a=aqInt(5,hard?20:12),b=aqInt(1,a);return Q(`${a} - ${b} = ?`,[aqEN(`${a} minus ${b}`)],aqMC(aqT(a-b),aqNear(a-b,3)))}
  const r=aqR(),hi=k>4?12:9;
  if(r<.45){const a=aqInt(2,hi),b=aqInt(2,hi);return Q(`${a} × ${b} = ?`,[aqEN(`${a} times ${b}`)],aqMC(aqT(a*b),[a*(b+1),a*(b-1),(a+1)*b,a*b+2,a*b-2].filter(x=>x>0&&x!==a*b).map(aqT),4))}
  if(r<.75){const b=aqInt(2,hi),q=aqInt(2,hi);return Q(`${b*q} ÷ ${b} = ?`,[aqEN(`${b*q} divided by ${b}`)],aqMC(aqT(q),aqNear(q,2,1),4))}
  const d=aqPick([2,3,4,5]),m=aqInt(2,8)*d;return Q(`What is 1/${d} of ${m}?`,[aqEN(`What is one ${['','','half','third','quarter','fifth'][d]} of ${m}?`)],aqMC(aqT(m/d),aqNear(m/d,3,1),4))}
 if(cat==='words'){
  if(lvl==='little'){if(aqR()<.5){const L=aqDraw('little-letter-pet',Object.keys(LETTER_PETS)),pk=LETTER_PETS[L];const others=Object.entries(LETTER_PETS).filter(([l])=>l!==L).map(([,p])=>({t:'pet',k:p}));
      return Q(`Which one starts with ${L}?`,[aqEN(`Which one starts with the letter ${L}?`)],aqMC({t:'pet',k:pk},others))}
    const L=aqDraw('little-letter','ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''));const others='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter(x=>x!==L).map(aqT);return Q(`Tap the letter ${L}`,[aqEN(`Tap the letter ${L}`)],aqMC(aqT(L),others))}
  if(lvl==='kid'){const w=aqDraw('kid-spell',[...new Set(KID_WORDS)]);const wr=[];for(let i=0;i<8;i++)wr.push(misspell(w));return Q('Which word is spelled right?',[aqEN(`Which word is spelled right? ${w}.`)],aqMC(aqT(w),wr.filter(x=>x!==w).map(aqT)))}
  const r=aqR();if(r<.5){const w=aqDraw('big-spell',BIG_WORDS);const wr=[];for(let i=0;i<10;i++)wr.push(misspell(w));return Q('Which word is spelled right?',[aqEN(`Which word is spelled right? ${w}.`)],aqMC(aqT(w),wr.filter(x=>x!==w).map(aqT),4))}
  if(r<.8){const [w,a,b]=aqDraw('big-syn',SYN);return Q(`Which word means the same as "${w}"?`,null,aqMC(aqT(a),b.map(aqT),4))}
  const [w,a,b]=aqDraw('big-ant',ANT);return Q(`Which word means the opposite of "${w}"?`,null,aqMC(aqT(a),b.map(aqT),4))}
 if(cat==='french'){
  if(lvl==='little'){const c=aqDraw('little-colour',COLOURS.slice(0,7));const others=COLOURS.filter(x=>x!==c).map(x=>({t:'swatch',c:x[2],v:x[0]}));
    return Q(`Which colour is "${c[1]}"?`,[aqEN('Which colour is'),aqFR(c[1])],aqMC({t:'swatch',c:c[2],v:c[0]},others))}
  if(lvl==='kid'){if(aqR()<.55){const [fr,pk]=aqDraw('kid-fr-animal',FR_ANIMALS);const others=FR_ANIMALS.filter(x=>x[1]!==pk).map(x=>({t:'pet',k:x[1]}));
      return Q(`Which one is "${fr}"?`,[aqEN('Which one is'),aqFR(fr)],aqMC({t:'pet',k:pk},others))}
    const n=aqDraw('kid-fr-num',[1,2,3,4,5,6,7,8,9,10,11,12]);return Q(`What number is "${FR_NUM[n]}"?`,[aqEN('What number is'),aqFR(FR_NUM[n])],aqMC(aqT(n),aqNear(n,3,0)))}
  const [fr,en]=aqDraw('big-fr-vocab',FR_VOCAB);const others=FR_VOCAB.filter(x=>x[1]!==en).map(x=>aqT(x[1]));return Q(`What does "${fr}" mean?`,[aqEN('What does'),aqFR(fr),aqEN('mean?')],aqMC(aqT(en),others,4))}
 if(cat==='nature'){
  if(lvl==='little'){const r=aqR();
    if(r<.5){const pk=aqDraw('little-tap-pet',Object.keys(PET_WORDS));const others=Object.keys(PET_WORDS).filter(x=>x!==pk).map(x=>({t:'pet',k:x}));return Q(`Tap the ${PET_WORDS[pk]}`,null,aqMC({t:'pet',k:pk},others))}
    if(r<.75){const yes=aqDraw('little-fly',['owl','dragon','duckling']);return Q('Which one can fly?',null,aqMC({t:'pet',k:yes},['turtle','frog','crab','puppy','kitten','whale'].map(x=>({t:'pet',k:x}))))}
    const yes=aqDraw('little-water',['whale','shark','crab']);return Q('Which one lives in the water?',null,aqMC({t:'pet',k:yes},['puppy','kitten','bunny','owl','hamster','unicorn'].map(x=>({t:'pet',k:x}))))}
  const bank=lvl==='kid'?NAT_KID:NAT_BIG;const [q,a,w]=aqDraw('nature-'+lvl,bank);return Q(q,null,aqMC(aqT(a),w.map(aqT),lvl==='kid'?3:4))}
 if(cat==='morals'){const [q,a,w]=aqDraw('morals-'+lvl,MORALS[lvl]||MORALS.kid);const res=aqMC(aqT(a),w.map(aqT),lvl==='big'||lvl==='teen'?4:3);
  const opts=res.choices.map(c=>c.v);const say=[aqEN(q),aqEN('Is it: '+opts.slice(0,-1).join('? Or, ')+'? Or, '+opts[opts.length-1]+'?')];
  return Object.assign({cat,text:q,say,vis:null,layout:'list'},res)}
 /* puzzles */
 if(lvl==='little'){if(aqR()<.55){const s=aqDraw('little-shape',SHAPES);return Q(`Tap the ${s}`,null,aqMC({t:'shape',s},SHAPES.filter(x=>x!==s).map(x=>({t:'shape',s:x}))))}
   const cs=aqShuf(COLOURS.slice(0,6)).slice(0,2);const seq=[0,1,0,1,0];return Q('What colour comes next?',null,aqMC({t:'swatch',c:cs[1][2],v:cs[1][0]},COLOURS.filter(x=>x!==cs[1]).map(x=>({t:'swatch',c:x[2],v:x[0]}))),{pattern:seq.map(i=>cs[i][2])})}
 if(lvl==='kid'){const r=aqR();
   if(r<.4){const h=aqInt(1,12),half=aqR()<.5;const lab=(hh,m)=>`${hh}:${m?'30':'00'}`;const wr=[lab(h,!half),lab(h%12+1,half),lab((h+10)%12+1,half),lab(h%12+1,!half)];
     return Q('What time is it?',null,aqMC(aqT(lab(h,half)),wr.map(aqT)),{clock:[h,half?30:0]})}
   if(r<.7){const coins=[['a quarter',25],['a dime',10],['a nickel',5]];const a=aqPick(coins),b=aqPick(coins),tot=a[1]+b[1];
     return Q(`${a[0][0].toUpperCase()+a[0].slice(1)} and ${b[0]} make how many cents?`,null,aqMC(aqT(tot+'¢'),[tot+5,tot-5,tot+10,tot-10].filter(x=>x>0).map(x=>aqT(x+'¢'))))}
   const st=aqInt(1,10),d=aqPick([2,5,10]);const s=[0,1,2,3].map(i=>st+i*d);return Q(`What comes next?  ${s.join(', ')}, ?`,[aqEN(`What comes next? ${s.join(', ')}`)],aqMC(aqT(st+4*d),aqNear(st+4*d,d)))}
 const r=aqR();
 if(r<.35){const st=aqInt(2,5),m=aqPick([2,3]);const s=[0,1,2,3].map(i=>st*m**i);return Q(`What comes next?  ${s.join(', ')}, ?`,[aqEN(`What comes next? ${s.join(', ')}`)],aqMC(aqT(st*m**4),[st*m**4+st,st*m**3*2,st*m**4-m,s[3]+s[2]].filter(x=>x!==st*m**4).map(aqT),4))}
 if(r<.7){const h=aqInt(1,10),m=aqPick([0,15,30,45]),dh=aqInt(1,2),dm=aqPick([15,30,45]);let em=m+dm,eh=h+dh+Math.floor(em/60);em%=60;eh=(eh-1)%12+1;const f=(a,b)=>`${a}:${String(b).padStart(2,'0')}`;
   return Q(`A movie starts at ${f(h,m)} and lasts ${dh} h ${dm} min. When does it end?`,null,aqMC(aqT(f(eh,em)),[f(eh,(em+15)%60),f(eh%12+1,em),f((eh+10)%12+1,em),f(eh,(em+45)%60)].map(aqT),4))}
 const price=aqInt(5,19)*25,paid=price<=500?500:1000,ch=paid-price;const $=c=>'$'+(c/100).toFixed(2);
 return Q(`Something costs ${$(price)}. You pay ${$(paid)}. What is your change?`,null,aqMC(aqT($(ch)),[ch+25,ch-25,ch+100,ch-50].filter(x=>x>0).map(x=>aqT($(x))),4))}
let aqLastKey='';
function makeQuestion(cat,lvl,k=0){let q=null;
  for(let t=0;t<12;t++){q=makeQuestionRaw(cat,lvl,k);const key=q.text+'|'+JSON.stringify(q.choices[q.answer]);if(key!==aqLastKey){aqLastKey=key;return q}}
  aqLastKey=q.text+'|'+JSON.stringify(q.choices[q.answer]);return q}
function choiceLabel(c){return c.t==='text'?c.v:c.t==='swatch'?c.v:c.t==='pet'?(PET_WORDS[c.k]||PETS[c.k]?.name||c.k):c.t==='shape'?c.s:''}
/* pixel art for questions */
const appleS=sprite(["...K...","..KG...",".KKKKK.","KRRRWRK","KRRRRRK","KRRRRRK",".KRRRK.","..KKK.."],{K,R:'#e04a4a',W:'#ffb0b0',G:'#3fa34d'});
function drawShape(s,size=12){const[c,g]=canvas(size,size);const m=size/2-.5;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const dx=x-m,dy=y-m;let inside=false;
    if(s==='circle')inside=dx*dx+dy*dy<=(m+.3)**2;
    else if(s==='square')inside=true;
    else if(s==='triangle')inside=y>=1&&Math.abs(dx)<=(y-1)*0.55;
    else if(s==='heart')inside=((dx+2.6)**2+(dy+2)**2<=8.5)||((dx-2.6)**2+(dy+2)**2<=8.5)||(dy>=-2&&Math.abs(dx)<=5.4-(dy+2)*0.75);
    else if(s==='star'){const a=Math.atan2(dy,dx),r=Math.hypot(dx,dy),rr=3+2.8*(.5+.5*Math.cos(5*(a+Math.PI/2)));inside=r<=rr}
    if(inside){g.fillStyle=K;g.fillRect(x,y,1,1)}}
  const[c2,g2]=canvas(size,size);g2.drawImage(c,0,0);g2.globalCompositeOperation='source-in';g2.fillStyle='#3b74d9';g2.fillRect(0,0,size,size);
  const[o,og]=canvas(size+2,size+2);for(const[dx,dy]of[[0,1],[2,1],[1,0],[1,2]])og.drawImage(c,dx,dy);og.drawImage(c2,1,1);return o}
function drawClock(h,m){const[c,g]=canvas(25,25);disc(g,12,12,12,K);disc(g,12,12,11,'#fff8e6');
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2-Math.PI/2;px(g,12+Math.round(Math.cos(a)*9.5),12+Math.round(Math.sin(a)*9.5),i%3?'#9aa4b6':K)}
  const line=(a,len,col)=>{for(let r=0;r<=len;r+=.5)px(g,12+Math.round(Math.cos(a)*r),12+Math.round(Math.sin(a)*r),col)};
  line((m/60)*Math.PI*2-Math.PI/2,8,'#3b74d9');line(((h%12)+m/60)/12*Math.PI*2-Math.PI/2,5,K);px(g,12,12,'#e04a4a');return c}
function drawVis(v){if(!v)return null;
  if(v.apples){const n=v.apples,per=Math.min(n,4),rows=Math.ceil(n/4);const[c,g]=canvas(per*9,rows*10);for(let i=0;i<n;i++)g.drawImage(appleS,(i%4)*9+1,Math.floor(i/4)*10+1);return c}
  if(v.clock)return drawClock(v.clock[0],v.clock[1]);
  if(v.pattern){const n=v.pattern.length+1;const[c,g]=canvas(n*9,8);v.pattern.forEach((col,i)=>{rect(g,i*9,0,8,8,K);rect(g,i*9+1,1,6,6,col)});rect(g,(n-1)*9,0,8,8,K);rect(g,(n-1)*9+1,1,6,6,'#fff8e6');
    [[2,2],[3,1],[4,1],[5,2],[5,3],[4,4],[3,4],[3,6]].forEach(([x,y])=>px(g,(n-1)*9+x,y,K));return c}
  return null}
function choiceArt(c){if(c.t==='pet'){const p=PETS[c.k];if(!p)return null;const[cv,g]=canvas(p.w,p.h);g.drawImage(p.a,0,0);if(p.extra)p.extra(0,0,g);return cv}
  if(c.t==='shape')return drawShape(c.s);return null}
/* speech: questions read aloud (French words in a French voice) */
function speakParts(parts){try{const S=window.speechSynthesis;if(!S||!parts)return;S.cancel();for(const p of parts){const u=new SpeechSynthesisUtterance(p.t);u.lang=p.lang||'en-CA';u.rate=.92;S.speak(u)}}catch(e){}}
/* arena battle steps */
async function arenaSpawn(type){thought=null;const d=MON[type];
  mon={def:d,x:W+6,hp:ARENA.monsterHP,open:0,openT:0,tongue:0,tongueT:0,lunge:0,lungeT:0,flash:0,shake:0,t:0,idle:true,approach:true,alive:true,showHp:false,lift:0};
  scrollTarget=30;scroll=Math.max(scroll,18);hero.pose=arenaScene?'idle':'walk';if(arenaScene)crowdHype=.6;await until(()=>mon.x<=d.tx);
  mon.x=d.tx;mon.approach=false;scroll=0;scrollTarget=0;hero.pose='idle';hero.alert=.6;mon.showHp=true}
async function arenaHit(){const d=mon.def,wpn=WEAPONS[weapon];
  if(wpn.beam){hero.pose='aim';hero.oxT=-2;await wait(.3);beamT=.45;mon.lungeT=-5}
  else{hero.pose='windup';await wait(.2*(wpn.speed||1));const reach=wpn.map[0].length-wpn.grip[0];hero.oxT=mon.x-(reach>15?22:18)-26;await wait(.14);hero.pose='swing';hero.ang=POSE.swing;hero.smear=.12}
  mon.hp--;mon.flash=.2;mon.shake=.25;mon.idle=false;if(!reduce)shake=wpn.heavy?.3:.15;
  const hx=mon.x+d.w/2,hy=G-d.h/2+d.yoff(mon);burst(hx,hy,d.hit,12,70);
  for(let k=0;k<10;k++){const a=R()*Math.PI*2,v=rnd(20,60);particles.push({x:hx,y:hy,vx:Math.cos(a)*v,vy:Math.sin(a)*v-15,g:wpn.fxG??120,life:rnd(.3,.7),c:wpn.fx[k%wpn.fx.length]})}
  petCheer(mon.hp<=0);const last=mon.hp<=0;if(arenaScene)crowdHype=last?2.2:.9;if(last){special(weapon,hx,hy);await wait(.6)}
  await wait(wpn.beam?.45:.25);mon.lungeT=0;hero.oxT=0;hero.pose='idle';await wait(.25);mon.idle=true;
  if(!last)return false;
  mon.idle=false;mon.showHp=false;mon.flash=.6;await wait(.5);const cx=mon.x+d.w/2,cy=G-d.h/2;
  for(let i=0;i<22;i++){const a=R()*Math.PI*2,v=rnd(10,45);particles.push({x:cx+rnd(-4,4),y:cy+rnd(-4,4),vx:Math.cos(a)*v,vy:Math.sin(a)*v-10,g:-15,life:rnd(.4,.8),c:['#ffffff','#e6e6ee','#c8c8d4'][i%3],s:2})}
  burst(cx,cy,d.hit,10,50);mon.alive=false;if(arenaScene)for(let i=0;i<30;i++)particles.push({x:rnd(0,W),y:rnd(14,40),vx:rnd(-10,10),vy:rnd(-30,-5),g:50,life:rnd(.8,1.4),c:RAINBOW[i%6]});floats.push({s:'+'+ARENA.perKill,x:cx-4,y:cy-8,life:1.2});
  for(let i=0;i<ARENA.perKill;i++)coins.push({x:cx,y:cy,vx:rnd(-30,30),vy:rnd(-70,-45),t:-i*.06});
  await until(()=>coins.length===0);await wait(.3);mon=null;return true}
async function arenaMiss(){const d=mon.def;hero.pose='idle';mon.idle=false;hurtMode=true;await d.attack(mon);await until(()=>projectiles.length===0);hurtMode=false;mon.idle=true;
  if(hearts>0)hearts--;await wait(.3)}
function arenaBegin(){setArenaScene(true);busy=true;thought=null;hearts=ARENA.heroHP;maxHearts=ARENA.heroHP}
function arenaEnd(){busy=false;hearts=null;setArenaScene(false)}
async function arenaKO(){hero.ko=true;effects.push({type:'orbit',t:0,dur:3,cx:heroX()+7,cy:heroY()+12});if(mon){mon.showHp=false;mon.idle=true}await wait(1.8);
  if(mon){mon.approach=false;const d=mon.def;for(let i=0;i<14;i++)particles.push({x:mon.x+d.w/2,y:G-d.h/2,vx:rnd(-30,30),vy:-rnd(20,50),g:60,life:.5,c:'#ffffff',s:2});mon=null}
  hero.ko=false;hero.pose='walk';scrollTarget=18}


/* ---------- arena backdrop: pixel colosseum at dusk ---------- */
let arenaScene=false,sceneFade=0,crowdHype=0,SHC='#3e8c2c';
function setArenaScene(on){if(arenaScene===on)return;arenaScene=on;sceneFade=1;SHC=on?'#b89058':'#3e8c2c'}
const colo=(()=>{const[c,g]=canvas(W,H);
  const SK=['#3a2a5c','#5c3468','#8e3e6a','#c4566a','#f08a5a'];
  for(let y=0;y<22;y++){const b=Math.min(4,Math.floor(y/4.5));g.fillStyle=SK[b];g.fillRect(0,y,W,1);if(y%5===4&&b<4){g.fillStyle=SK[b+1];for(let x=y%2;x<W;x+=2)g.fillRect(x,y,1,1)}}
  for(let i=0;i<9;i++){px(g,(i*37+11)%W,(i*13+3)%10,'#ffffff')}
  // back rim + crenellations
  rect(g,0,15,W,3,'#6e5e4c');for(let x=0;x<W;x+=6)rect(g,x,12,3,3,'#6e5e4c');rect(g,0,18,W,1,'#4e4238');
  // stands: 4 tiers
  for(let t=0;t<4;t++){const y=19+t*7;rect(g,0,y,W,7,t%2?'#8a7a68':'#7e6e5e');rect(g,0,y+6,W,1,'#a8987e');rect(g,0,y,W,1,'#5e5248')}
  // front wall with stone blocks
  rect(g,0,47,W,10,'#9a8670');rect(g,0,47,W,1,'#c4b090');
  for(let row=0;row<3;row++){const y=48+row*3;rect(g,0,y+2,W,1,'#6e5e4c');for(let x=(row%2)*4;x<W;x+=8)rect(g,x,y,1,3,'#6e5e4c')}
  // arches
  for(const ax of [8,40,72,104]){rect(g,ax,50,12,7,'#2a2030');disc(g,ax+6,50,6,'#2a2030');rect(g,ax-1,44,14,1,'#2a2030');
    for(let x=0;x<14;x++){const yy=50-Math.round(Math.sqrt(Math.max(0,36-(x-6.5)**2)));px(g,ax-1+x,yy-1,'#c4b090')}
    rect(g,ax,44,12,13,'rgba(0,0,0,0)')}
  // redraw arches cleanly (keep stone above them)
  for(const ax of [8,40,72,104]){for(let y=44;y<57;y++)for(let x=0;x<12;x++){const top=50-Math.sqrt(Math.max(0,36-(x-5.5)**2));if(y>=top){g.fillStyle=y<47?'#3a2e3e':'#2a2030';g.fillRect(ax+x,y,1,1)}}}
  // sand floor
  rect(g,0,57,W,H-57,'#e0c088');rect(g,0,57,W,1,'#c8a468');
  const r2=mulberry(77);for(let i=0;i<90;i++)px(g,r2()*W|0,58+(r2()*(H-58)|0),r2()<.5?'#c8a468':'#ecd4a0');
  for(let x=0;x<W;x++){const y=Math.round(66+Math.sin(x/W*Math.PI)*-3);px(g,x,y,'#c8a468')}
  return c})();
const crowd=(()=>{const r3=mulberry(41),out=[];const shirts=['#a85a58','#5a6e98','#b89a5a','#6a8a64','#7e6698','#b07a58','#c4bcae','#b07e98'],skins=['#d8b490','#b88a64','#7a5438','#d8bca0'];
  for(let t=0;t<4;t++)for(let x=1;x<W-2;x+=4){if(r3()<.3)continue;out.push({x:x+(r3()*2|0),y:19+t*7+5,shirt:shirts[r3()*shirts.length|0],skin:skins[r3()*skins.length|0],ph:r3()*6.28,flag:r3()<.06})}return out})();
const BANNERS=[[24,'#3b74d9','#ffffff'],[56,'#e04a4a','#f4c542'],[88,'#5cc96a','#ffffff'],[120,'#f4c542','#d63c3c']];
function drawArenaBG(){ctx.drawImage(colo,0,0);const hype=crowdHype>0;
  for(const p of crowd){const bob=hype?Math.round(Math.abs(Math.sin(time*12+p.ph))*2):((time*1.3+p.ph)%6<.4?1:0);const y=p.y-bob;
    rect(ctx,p.x,y-2,3,2,p.shirt);rect(ctx,p.x+.5|0,y-4,2,2,p.skin);
    if(hype&&(time*8+p.ph|0)%2){px(ctx,p.x-1,y-4,p.skin);px(ctx,p.x+3,y-4,p.skin)}
    if(p.flag){rect(ctx,p.x+3,y-7,1,5,'#4e4238');rect(ctx,p.x+4,y-7+((time*6|0)%2),3,2,'#f4c542')}}
  for(const [bx,c1,c2] of BANNERS){rect(ctx,bx-1,46,7,1,'#4e4238');const sw=Math.round(Math.sin(time*3+bx)*1);
    for(let y=0;y<9;y++){const off=Math.round(sw*y/9);rect(ctx,bx+off,47+y,5,1,y===3||y===4?c2:c1)}
    const tip=47+9;px(ctx,bx+sw,tip,c1);px(ctx,bx+4+sw,tip,c1)}
  for(const tx of [36,68,100]){rect(ctx,tx,50,1,4,'#4e4238');rect(ctx,tx-1,49,3,1,'#4e4238');const f=(time*10+tx|0)%3;
    px(ctx,tx,48,'#f4862e');px(ctx,tx,47-(f===1?1:0),'#f4c542');if(f!==2)px(ctx,tx+(f?1:-1),47,'#e04a4a');px(ctx,tx,46-(f===0?1:0),'#fff3a8')}}


/* ---------- market stand ---------- */
const keeperPal={K,H:'#5a3a8a',h:'#7a5aaa',S:'#f4c89c',E:K,P:'#e09a7a',M:'#6e3418',A:'#3fa34d',W:'#fff8e6'};
const keeperRows=["...KKKKK....","..KHHHHHK...","..KHhHHHK...",".KKKKKKKKK..","..KSSSSSK...","..KSESESK...","..KSSPSSK...","..KMMMMMK...","...KSSSK....","..KAWWWAK...",".KAAWWWAAK.."];
const keeperA=sprite(keeperRows,keeperPal);
const keeperB=sprite(keeperRows.map((r,i)=>i===5?"..KSKSKSK...":r),keeperPal);
const billS=sprite(["KKKKKKKKK","KGGGGGGGK","KGKgWgKGK","KGGgWgGGK","KGKgWgKGK","KGGGGGGGK","KKKKKKKKK"],{K,G:'#5cb85c',g:'#3a8f4a',W:'#e6ffd8'});
const stopwatchS=sprite(["...KKK...","....K....","..KKKKK..",".KRRRRRK.","KRWWWWWRK","KRWWKWWRK","KRWWKKWRK","KRWWWWWRK",".KRRRRRK.","..KKKKK.."],{K,R:'#e04a4a',W:'#ffffff'});
const potionR=sprite([".K.","KWK","KRK","KRK","KKK"],{K,W:'#e6ecf5',R:'#e04a4a'}),potionB=sprite([".K.","KWK","KBK","KBK","KKK"],{K,W:'#e6ecf5',B:'#3b74d9'});
let mkt=null,gift=null;
const MKT_X=50;
function drawStall(){if(!mkt)return;const x=Math.round(mkt.x),t=time,Y=G;
  rect(ctx,x+2,Y,38,1,SHC);
  // posts
  rect(ctx,x+1,Y-32,3,32,K);rect(ctx,x+2,Y-32,1,32,'#8a5a2a');rect(ctx,x+37,Y-32,3,32,K);rect(ctx,x+38,Y-32,1,32,'#8a5a2a');
  // shopkeeper (behind counter)
  const throwing=mkt.throwT>0;ctx.drawImage((t%3.5)<.15?keeperB:keeperA,x+14,Y-25);
  if(throwing){rect(ctx,x+12,Y-26,2,5,K);rect(ctx,x+12,Y-25,1,3,'#f4c89c')}
  else if(mkt.wave>0){const up=(t*8|0)%2;rect(ctx,x+24,Y-20-up*2,2,4,K);px(ctx,x+24,Y-20-up*2,'#f4c89c')}
  // counter
  rect(ctx,x,Y-15,41,3,K);rect(ctx,x+1,Y-14,39,1,'#d09a5a');rect(ctx,x+1,Y-13,39,1,'#b07840');
  rect(ctx,x+2,Y-12,37,12,K);for(let i=0;i<37;i++){const c=i%6===0?K:(i%6<3?'#9a6232':'#8a5a2a');rect(ctx,x+2+i,Y-11,1,11,c)}
  rect(ctx,x+3,Y-11,35,1,'#b07840');
  // pouch on the front
  disc(ctx,x+20,Y-6,3,K);disc(ctx,x+20,Y-6,2,'#c98a4a');rect(ctx,x+19,Y-9,3,1,K);px(ctx,x+20,Y-6,'#f4c542');
  // goods on the counter
  ctx.drawImage(potionR,x+4,Y-20);ctx.drawImage(potionB,x+8,Y-20);
  rect(ctx,x+31,Y-17,5,2,K);rect(ctx,x+32,Y-17,3,1,'#f4c542');rect(ctx,x+31,Y-19,5,2,K);rect(ctx,x+32,Y-19,3,1,'#f4c542');rect(ctx,x+32,Y-21,4,2,K);rect(ctx,x+33,Y-21,2,1,'#fff3a8');
  // awning
  const sw=Math.round(Math.sin(t*2)*.6);
  rect(ctx,x-2,Y-36,45,8,K);for(let i=0;i<43;i++){const c=Math.floor(i/4)%2?'#fff0d0':'#d63c3c';rect(ctx,x-1+i,Y-35,1,6,c)}
  rect(ctx,x-1,Y-35,43,1,'#ff7a6a');
  for(let i=0;i<11;i++){const sx=x-1+i*4+sw,c=i%2?'#fff0d0':'#d63c3c';rect(ctx,sx,Y-29,4,1,K);rect(ctx,sx+1,Y-29,2,1,c);rect(ctx,sx+1,Y-28,2,1,K)}
  // sign
  rect(ctx,x+12,Y-44,17,8,K);rect(ctx,x+13,Y-43,15,6,'#fff0d0');rect(ctx,x+16,Y-36,1,1,K);rect(ctx,x+24,Y-36,1,1,K);
  'SHOP'.split('').forEach((ch,i)=>glyph(ch,x+14+i*4-(i>1?0:0)-(i?0:0)+0,Y-42,'#d63c3c'));
  // lantern
  rect(ctx,x+35,Y-28,1,3,K);rect(ctx,x+33,Y-25,5,5,K);const fl=(t*8|0)%3;rect(ctx,x+34,Y-24,3,3,fl?'#f4c542':'#fff3a8');
  if(fl===0)px(ctx,x+35,Y-23,'#ffffff')}
function drawGift(){if(!gift)return;const g=gift,p=Math.min(1,g.t/g.dur);const x=g.x0+(g.x1-g.x0)*p,y=g.y0+(g.y1-g.y0)*p-Math.sin(p*Math.PI)*g.arc;
  const img=g.img;const rot=g.spin?Math.round(p*8)%4:0;ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.rotate(rot*Math.PI/2);ctx.drawImage(img,-(img.width>>1),-(img.height>>1));ctx.restore();
  if((time*20|0)%2)px(ctx,x-img.width/2-2,y,'#ffffff')}
async function marketOpen(text){if(busy||mkt)return false;busy=true;thought=null;mkt={x:W+8,state:'in',throwT:0,wave:0};
  scrollTarget=30;scroll=Math.max(scroll,18);hero.pose='walk';say('Walking to the market...');
  await until(()=>mkt.x<=MKT_X);mkt.x=MKT_X;scroll=0;scrollTarget=0;hero.pose='idle';mkt.state='open';mkt.wave=1.4;
  say(text||'Welcome to the Market! Spend your coins here.');busy=false;return true}
async function marketBuy(item={}){if(mkt&&mkt.state==='in')await until(()=>mkt&&mkt.state==='open'&&!busy);if(!mkt||mkt.state!=='open'||busy)return false;busy=true;
  if(item.cost&&item.cost>coinsTotal){busy=false;say(`You need ${item.cost} coins for that. Do more chores!`);mkt.wave=.8;return false}
  if(item.cost){coinsTotal-=item.cost;hudPop=.2;floats.push({s:'-'+item.cost,x:W-26,y:hearts==null?14:24,life:1.1})}
  let img=billS,spin=true,label=null;
  if(item.type==='timer'){img=stopwatchS;spin=false;label=item.label||('+'+(item.minutes||15)+' MIN')}
  else if(item.type==='pet'&&PETS[item.pet]){img=PETS[item.pet].a;spin=true}
  else if(item.type==='weapon'&&WEAPONS[item.weapon]){img=WEAPONS[item.weapon].icon;spin=true}
  else if(item.sprite){img=item.sprite}
  say(item.text||'Here you go!');mkt.throwT=.5;mkt.wave=0;await wait(.25);
  const hx=heroX()+(item.type==='pet'?-4:7),hy=item.type==='pet'?G-4:heroY()+4;
  gift={img,spin,t:0,dur:.75,x0:mkt.x+14,y0:G-26,x1:hx,y1:hy,arc:item.type==='pet'?26:20};
  await until(()=>gift.t>=gift.dur);gift=null;
  if(item.type==='pet'){petKey=item.pet;pet.x=heroX()-PETS[item.pet].w-1;pet.hopV=-70;for(let i=0;i<10;i++)particles.push({x:pet.x+4,y:G-8,vx:rnd(-25,25),vy:-rnd(20,50),g:60,life:.7,c:['#ff8ac6','#ffffff','#f4c542'][i%3]})}
  else burst(hx,hy,['#f4c542','#ffffff','#fff3a8'],14,55);
  if(label)floats.push({s:label,x:hx-label.length*2,y:hy-10,life:1.6});
  hero.pose='victory';hero.vy=-80;petCheer(true);await wait(.5);hero.pose='idle';
  say(item.thanks||'Thanks for shopping! Come back soon.');mkt.wave=1.2;busy=false;return true}
async function marketClose(){if(!mkt||busy)return false;busy=true;mkt.state='out';scrollTarget=18;scroll=Math.max(scroll,12);hero.pose='walk';say('Back on the trail.');
  await until(()=>mkt.x<-50);mkt=null;busy=false;return true}

/* ---------- loop ---------- */
let last=performance.now();
function update(dt){
  time+=dt;
  for(let i=timers.length-1;i>=0;i--){timers[i].t-=dt;if(timers[i].t<=0){const r=timers[i].r;timers.splice(i,1);r()}}
  for(let i=conds.length-1;i>=0;i--){if(conds[i].fn()){const r=conds[i].r;conds.splice(i,1);r()}}
  scroll+=(scrollTarget-scroll)*Math.min(1,dt*5);if(Math.abs(scroll)<.2&&scrollTarget===0)scroll=0;
  worldX+=scroll*dt;
  hero.ox+=(hero.oxT-hero.ox)*Math.min(1,dt*22);hero.kx*=Math.exp(-dt*9);
  hero.jy+=hero.vy*dt;hero.vy+=320*dt;if(hero.jy>0){hero.jy=0;hero.vy=0}
  const tA=POSE[hero.pose]??-55;hero.ang+=(tA-hero.ang)*Math.min(1,dt*28);
  hero.smear=Math.max(0,hero.smear-dt);hero.hurt=Math.max(0,(hero.hurt||0)-dt);if(mkt){if(mkt.state!=='open')mkt.x-=scroll*dt;mkt.throwT=Math.max(0,mkt.throwT-dt);mkt.wave=Math.max(0,mkt.wave-dt)}if(gift)gift.t+=dt;sceneFade=Math.max(0,sceneFade-dt*1.6);crowdHype=Math.max(0,crowdHype-dt);beamT=Math.max(0,beamT-dt);if(thought)thought.t+=dt;updateEffects(dt);updatePet(dt);
  if(mon&&mon.hopV!=null){mon.hopY=(mon.hopY||0)+mon.hopV*dt;mon.hopV+=360*dt;if(mon.hopY>=0){mon.hopY=0;mon.hopV=null}}
  if(mon&&mon.alive&&mon.def.fizz&&R()<dt*8)particles.push({x:mon.x+8+rnd(-1,1),y:G-mon.def.h-1,vx:rnd(-4,4),vy:-rnd(8,14),g:-4,life:1,c:R()<.5?'#c8f088':'#e6ffc8',s:R()<.3?2:1});
  if(mon&&mon.alive&&mon.def.sizzle&&R()<dt*9)particles.push({x:mon.x+rnd(3,15),y:G-10+mon.def.yoff(mon),vx:rnd(-3,3),vy:-rnd(10,18),g:-5,life:.9,c:R()<.5?'#c8d0e0':'#e6ecf5'});
  if(mon&&mon.alive&&mon.def.drizzle&&R()<dt*6)particles.push({x:mon.x+4+(R()*9|0),y:G+1-mon.def.h+mon.def.yoff(mon)-5,vx:0,vy:30,g:80,life:.2,c:'#4aa3ff'});
  if(mon&&mon.alive&&mon.def.shower&&R()<dt*14)particles.push({x:mon.x+9+(R()*3|0)*2,y:G+1-mon.def.h+mon.def.yoff(mon)-7,vx:0,vy:35,g:90,life:.22,c:R()<.5?'#7fd0ff':'#bfefff'});
  if(mon&&mon.alive&&mon.def.bubbly&&R()<dt*5)particles.push({x:mon.x+rnd(3,17),y:G-13+mon.def.yoff(mon),vx:rnd(-4,4),vy:-12,g:-6,life:1.3,c:R()<.5?'#bfefff':'#ffffff'});
  if(mon&&mon.def.snow&&R()<dt*30)particles.push({x:rnd(0,W+30),y:-2,vx:-10,vy:rnd(12,22),g:0,life:4.5,c:R()<.3?'#c8d8ee':'#ffffff'});
  for(const c of cops)c.x+=c.vx*dt;if(royal){royal.x+=royal.vx*dt;royal.point+=((royal.pointT||0)-royal.point)*Math.min(1,dt*14)}
  if(flyWeapon)flyWeapon.t+=dt*1.6;
  if(cage){if(cage.drop){cage.vy+=420*dt;cage.y+=cage.vy*dt;if(cage.y>=0){cage.y=0;cage.drop=false}}if(cage.lift)cage.y-=90*dt}
  if(grounded&&cage&&!busy&&R()<dt*.9)particles.push({x:heroX()+(R()<.5?6:9),y:heroY()+HEROES[heroKey].hand-4,vx:0,vy:10,g:80,life:.5,c:'#7fd0ff'});
  if(!banner&&!busy&&achQueue.length){const a=achQueue.shift();banner={a,t:0};say(`${a.title} ${a.name}: ${a.desc}`);burst(64,40,['#f4c542','#fff3a8','#ffffff'],24,70)}
  if(banner){banner.t+=dt;if(banner.t>3)banner=null}hero.alert=Math.max(0,hero.alert-dt);
  shake=Math.max(0,shake-dt);hudPop=Math.max(0,hudPop-dt);
  if(mon){mon.t+=dt;if(mon.approach)mon.x-=scroll*dt;
    let ot=mon.openT;if(mon.def.chomp&&mon.idle&&!mon.approach&&mon.alive)ot=Math.max(ot,Math.sin(mon.t*5)>.55?.6:0);
    mon.open+=(ot-mon.open)*Math.min(1,dt*18);mon.tongue+=(mon.tongueT-mon.tongue)*Math.min(1,dt*13);mon.lunge+=(mon.lungeT-mon.lunge)*Math.min(1,dt*12);
    mon.flash=Math.max(0,mon.flash-dt);mon.shake=Math.max(0,mon.shake-dt)}
  const hx=heroX()+17;
  for(let i=projectiles.length-1;i>=0;i--){const p=projectiles[i];p.x+=p.vx*dt;p.vy+=p.g*dt;p.y+=p.vy*dt;
    if(p.bounce&&p.y>G-3&&p.vy>0){p.y=G-3;p.vy*=-.55;p.bounce=0}
    if(p.k==='bubble'||p.k==='letter')p.y=p.base+Math.sin(time*8+p.ph)*2;
    if(p.x<=hx){block(p.x,p.y,mon?mon.def.hit:['#ffffff']);projectiles.splice(i,1)}}
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=(p.g||0)*dt;p.life-=dt;if(p.life<=0)particles.splice(i,1)}
  for(let i=coins.length-1;i>=0;i--){const c=coins[i];c.t+=dt;if(c.t<0)continue;
    if(c.t<.5){c.x+=c.vx*dt;c.y+=c.vy*dt;c.vy+=200*dt}
    else{const tx=W-23,ty=hudCoinY();c.x+=(tx-c.x)*Math.min(1,dt*9);c.y+=(ty-c.y)*Math.min(1,dt*9);
      if(Math.abs(c.x-tx)<2&&Math.abs(c.y-ty)<2){coins.splice(i,1);coinsTotal++;hudPop=.15;burst(tx,ty,['#f4c542','#fff3a8'],5,30)}}}
  for(let i=floats.length-1;i>=0;i--){const f=floats[i];f.y-=12*dt;f.life-=dt;if(f.life<=0)floats.splice(i,1)}
  if(shown<full.length){shown+=dt*48;if(dlg)dlg.textContent=full.slice(0,shown|0)}
}
function drawCoin(x,y,ph){const w=[5,3,1,3][(ph*10|0)%4];x=Math.round(x);y=Math.round(y);
  rect(ctx,x-(w>>1)-1,y-3,w+2,7,'#8a5a10');rect(ctx,x-(w>>1),y-2,w,5,'#f4c542');if(w>1)px(ctx,x-(w>>1),y-2,'#fff3a8')}
function draw(){
  ctx.save();if(shake>0)ctx.translate(Math.round(rnd(-1.5,1.5)),Math.round(rnd(-1,1)));
  if(arenaScene)drawArenaBG();else{
  ctx.drawImage(sky,0,0);
  drawLayer(clouds,worldX*.08+time*2,2);drawLayer(hills,worldX*.15);drawLayer(farPines,worldX*.3);
  drawLayer(midPines,worldX*.5);drawLayer(trees,worldX*.7);drawLayer(ground,worldX);}
  drawStall();
  // hero
  const HY=HEROES[heroKey].hand;const x=Math.round(heroX()),walking=scroll>2&&hero.pose==='walk';const fr=walking&&(time*8|0)%2;
  const y=Math.round(heroY())-(fr?1:0);
  drawPet();
  rect(ctx,x+3,G,8,1,SHC);
  if(hero.smear>0){const W_=WEAPONS[weapon],L=W_.map[0].length-W_.grip[0]-2;let k=0;for(let a=-160;a<=35;a+=7,k++){const r=a*Math.PI/180;const c1=W_.smear==='rainbow'?RAINBOW[k%6]:W_.smear[0],c2=W_.smear==='rainbow'?RAINBOW[(k+1)%6]:W_.smear[1];
    px(ctx,x+11+Math.cos(r)*L,y+HY+Math.sin(r)*L,c1);px(ctx,x+11+Math.cos(r)*(L-1),y+HY+Math.sin(r)*(L-1),c2)}}
  if(hero.ko){ctx.save();ctx.translate(x+7,G);ctx.rotate(-Math.PI/2);ctx.drawImage(HEROES[heroKey].a,0,-7);ctx.restore()}
  else if(!(hero.hurt>0&&(time*20|0)%2))ctx.drawImage(fr?HEROES[heroKey].b:HEROES[heroKey].a,x,y);
  if(!hero.noWeapon&&!hero.ko)drawWeapon(WEAPONS[weapon],x+11,y+HY,hero.ang);
  if(beamT>0&&mon){const[bx,by]=weaponTip(WEAPONS[weapon],x+11,y+HY,hero.ang);const ex=mon.x+mon.def.w/2;
    for(let i=0;bx+i<ex;i++){const BC=WEAPONS[weapon].beamCol||['#7fe0ff','#ffffff','#bfefff','#4aa3ff'];const c=((i+time*60|0)%4)<2?BC[0]:BC[1];const w=1+((i+time*30|0)%5===0);px(ctx,bx+i,by,c);if(w)px(ctx,bx+i,by-1,BC[2]);px(ctx,bx+i,by+1,BC[3])}
    if(R()<.7)particles.push({x:ex,y:by+rnd(-4,4),vx:-(ex-bx)*3,vy:0,g:0,life:.3,c:'#ffffff'})}
  if(hero.alert>0){rect(ctx,x+4,y-11,7,9,K);rect(ctx,x+5,y-10,5,7,'#ffffff');rect(ctx,x+7,y-9,1,3,'#e04a4a');px(ctx,x+7,y-5,'#e04a4a')}
  if(cage)drawCage();drawRoyal();drawCops();
  if(mon&&mon.alive)drawMonster(mon);
  drawThought();
  projectiles.forEach(drawProj);
  drawGift();
  particles.forEach(p=>p.spr?ctx.drawImage(p.spr,Math.round(p.x),Math.round(p.y)):rect(ctx,p.x,p.y,p.s||1,p.s||1,p.c));
  drawEffects();
  coins.forEach(c=>{if(c.t>=0)drawCoin(c.x,c.y,time+c.x*.05)});
  floats.forEach(f=>text(f.s,Math.round(f.x),Math.round(f.y),'#f4c542'));
  if(!arenaScene)drawLayer(fore,worldX*1.3,H-12);
  ctx.restore();
  if(banner){const t=banner.t,p=t<.35?t/.35:t>2.65?1-(t-2.65)/.35:1;const e=1-Math.pow(1-p,3);const im=banner.a.img,iw=im.width*2,ih=im.height*2,bw=iw+10,bh=ih+8,bx=Math.round(64-bw/2),by=Math.round(-50+e*(92-bh/2));
    rect(ctx,bx-1,by-1,bw+2,bh+2,K);rect(ctx,bx,by,bw,bh,'#f4c542');rect(ctx,bx+1,by+1,bw-2,bh-2,'#1a1f3a');
    ctx.drawImage(im,bx+5,by+4,iw,ih);const R0=Math.max(bw,bh)/2+4;
    for(let k=0;k<10;k++){const a=k/10*Math.PI*2+t*2,r=R0+Math.sin(t*6+k)*2;px(ctx,bx+bw/2+Math.cos(a)*r,by+bh/2+Math.sin(a)*r,k%2?'#ffffff':'#f4c542')}}
  if(siren){const on=(time*6|0)%2;rect(ctx,0,0,W,1,on?'#ff4a4a':'#4a7aff');rect(ctx,0,H-1,W,1,on?'#4a7aff':'#ff4a4a')}
  if(sceneFade>0){ctx.globalAlpha=Math.min(1,sceneFade*1.4);rect(ctx,0,0,W,H,'#161a2c');ctx.globalAlpha=1}
  // HUD
  drawHearts();const cy_=hudCoinY();drawCoin(W-23,cy_,time*.6);text(String(coinsTotal),W-18,cy_-2,hudPop>0?'#ffffff':'#f4c542');
}
let raf=0,running=true;
function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;update(dt);draw();if(running)raf=requestAnimationFrame(frame)}
raf=requestAnimationFrame(frame);

/* ---------- public API ---------- */
say(opts.idleText||'Walking the forest trail...');
function pixelCanvas(src,scale){const[c,g]=canvas(src.width,src.height);g.drawImage(src,0,0);c.style.width=src.width*scale+'px';c.style.height=src.height*scale+'px';c.style.imageRendering='pixelated';return c}
return {
  play:battle,                       // play('bed') -> Promise; false if busy or unknown key
  isBusy:()=>busy,
  setCoins:n=>{coinsTotal=n},
  getCoins:()=>coinsTotal,
  setWeapon:k=>{if(!WEAPONS[k])return false;weapon=k;return true},
  getWeapon:()=>weapon,
  setHero:k=>{if(!HEROES[k])return false;heroKey=k;return true},
  getHero:()=>heroKey,
  heroes:Object.fromEntries(Object.entries(HEROES).map(([k,h])=>[k,{name:h.name}])),
  monsters:Object.fromEntries(Object.entries(MON).map(([k,d])=>[k,{name:d.name,chore:d.chore,coins:d.coins,attack:d.attackName}])),
  weapons:Object.fromEntries(Object.entries(WEAPONS).map(([k,w])=>[k,{name:w.name,tier:w.tier,unlock:w.unlock,req:w.req,perk:w.perk,bonus:w.bonus||0,special:(SPECIALS[k]||{name:'Power Strike'}).name}])),
  achievements:ACH.map(a=>({key:a.key,name:a.name,desc:a.desc,tier:TIERS[a.tier].name,goal:a.goal})),
  // stats: { battles, coins, chores:{monsterKey:count}, streak, bestStreak, earlyBird }
  checkAchievements,                 // (stats, alreadyUnlockedKeys) -> newly earned keys
  checkWeaponUnlocks,                // (stats, alreadyUnlockedKeys) -> newly unlocked weapon keys
  achievementProgress,               // (stats) -> { key: { value, goal, done } }
  weaponUnlocked:(k,s)=>!!WEAPONS[k]&&weaponUnlocked(k,s),
  weaponProgress:(k,s)=>WEAPONS[k]?{value:Math.min(weaponProgress(k,s),WEAPONS[k].goal||1),goal:WEAPONS[k].goal||1}:null,
  showAchievement,                   // queue the medal pop-up (waits until no battle is running)
  showWeaponUnlock,                  // queue the "New weapon unlocked!" pop-up
  badgeIcon(key,scale=3){const a=ACH.find(x=>x.key===key);return a?pixelCanvas(a.badge,scale):null},
  ground:groundHero,                 // ground('skipping chores', 'king'|'queen') -> the King/Queen points, cops cage the hero; play() refused while grounded
  release:releaseHero,               // chores done: lock pops, cage lifts, back to walking
  isGrounded:()=>grounded,
  // Monster Arena (learning battles). See CURSOR_BRIEF.md for the run loop.
  arena:{config:ARENA,categories:ARENA_CATS,levels:ARENA_LEVELS,makeQuestion,begin:arenaBegin,spawn:arenaSpawn,hit:arenaHit,miss:arenaMiss,ko:arenaKO,end:arenaEnd,
    hearts:()=>hearts,speak:speakParts,drawVis,choiceArt,choiceLabel},
  // Market: hero walks up to the stall, the trail stops, purchases get thrown to the hero
  market:{open:marketOpen,buy:marketBuy,close:marketClose,isOpen:()=>!!mkt&&mkt.state==='open'},
  think:(type,text)=>think(type,text),   // approval screen: hero waits with a pixel thought cloud of that monster
  clearThought,                           // call on Approve (then play) or Decline
  setHearts:(n,max)=>{hearts=n;if(max)maxHearts=max},   // pixel hearts HUD; null hides it
  icon(type,scale=3){const d=MON[type];if(!d)return null;const hr=(d.headroom||0)+1;const[c,g]=canvas(d.w+(d.headroom?2:0),d.h+hr);d.draw(g,0,hr,{open:0,t:0,idle:false,shake:0,flash:0});return pixelCanvas(c,scale)},
  weaponSprite(key){const w=WEAPONS[key];return w?{key,name:w.name,image:pixelCanvas(w.icon,1),grip:w.grip,mapLen:w.map[0].length,smear:w.smear,fx:w.fx,fxG:w.fxG,beam:!!w.beam,beamCol:w.beamCol,heavy:!!w.heavy,speed:w.speed||1,bonus:w.bonus||0}:null},
  heroFrames(key){const h=HEROES[key];return h?{a:pixelCanvas(h.a,1),b:pixelCanvas(h.b,1)}:null},
  weaponIcon(key,scale=4){const w=WEAPONS[key];return w?pixelCanvas(w.icon,scale):null},
  setPet:k=>{petKey=PETS[k]?k:null},   // pet that follows the hero; null for none
  getPet:()=>petKey,
  pets:Object.fromEntries(Object.entries(PETS).map(([k,p])=>[k,{name:p.name,price:p.price,flies:p.fly,hops:p.hop}])),
  petIcon(key,scale=3){const p=PETS[key];if(!p)return null;const c=pixelCanvas(p.a,scale);if(p.extra)p.extra(0,0,c.getContext('2d'));return c},
  heroIcon(key,scale=3){const h=HEROES[key];return h?pixelCanvas(h.a,scale):null},
  destroy(){running=false;cancelAnimationFrame(raf)}
};
}

export default createChoreQuest;
