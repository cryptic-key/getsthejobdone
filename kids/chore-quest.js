/**
 * Chore Quest battle engine: 8-bit forest battle animations for a kids' chore app.
 * Zero dependencies, no image assets: every sprite is a pixel map in this file.
 *
 *   import { createChoreQuest } from './chore-quest.js';
 *   const quest = createChoreQuest(canvasEl, { dialogEl, coins: 120, hero: 'princess', weapon: 'broom', onComplete: r => console.log(r) });
 *   quest.setWeapon('mop');
 *   quest.play('bed');
 *
 * Heroes: knight, princess
 * Monster keys (32): dust, sleep, dry, breakfast, dinner, lunchmade, bed, shoes, pack, dishes, teeth, laundry, toys, reading, pet, plants, table, trash, counters, towels, bookshelf, lunch, coats, groceries, homework, dressed, petbrush, leaves, snow, outside, wood, bath
 * Weapon keys (29): broom, duster, mop, squeegee, vacuum, golden, toothbrush, spatula, rake, pencil, plunger, dustpan, sponge, spray, diamond, bubble, lint, watering, bookmark, bone, shovel, bat, mallet, duckhammer, pillowmace, rattle, butterknife, whisk, baguette
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
const R=mulberry(11);
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
const HEROES={knight:{name:'Adventurer',a:heroA,b:heroB},princess:{name:'Princess',a:prinA,b:prinB}};
let heroKey=HEROES[opts.hero]?opts.hero:'knight';

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
const cushionS=sprite(["KKKKK","KChCK","KCCCK","KKKKK"],couchPal);
const remoteS=sprite(["KKKKKK","KRrRRK","KKKKKK"],{K,R:'#3a3a48',r:'#e04a4a'});
const chipS=sprite([".KK.","KYYK","KYyK",".KK."],{K,Y:'#f4d06a',y:'#d4a84a'});
const snowballS=sprite([".KKK.","KWWWK","KWWwK","KWwwK",".KKK."],{K,W:'#ffffff',w:'#c8d8ee'});
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
const FONT={'0':'111101101101111','1':'010110010010111','2':'111001111100111','3':'111001111001111','4':'101101111001001','5':'111100111001111','6':'111100111101111','7':'111001001001001','8':'111101111101111','9':'111101111001111','+':'000010111010000','-':'000000111000000',A:'010101111101101',B:'110101110101110',C:'011100100100011',Z:'111001010100111'};
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
const heroY=()=>G-15+hero.jy;

let full='',shown=0;
function say(t){full=t;shown=0;if(live)live.textContent=t;if(opts.onSay)opts.onSay(t)}

function burst(x,y,cols,n=12,sp=50){for(let i=0;i<n;i++){const a=R()*Math.PI*2,v=rnd(sp*.3,sp);particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-20,g:120,life:rnd(.25,.5),c:cols[i%cols.length]})}}
function block(x,y,cols){burst(x,y,['#ffffff',...cols],14,60);hero.kx=-3;if(!reduce)shake=.12}

/* ---------- monsters ---------- */
const MON={
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
    projectiles.push({k:'spr',s:duckS,x:m.x+6,y:G-14,vx:-82,vy:-40,g:150,spin:false});m.openT=0}},
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
  attack(m){return toss(m,[{s:logS,y:G-14,vx:-72,vy:-50,gap:.25},{s:logS,y:G-14,vx:-82,vy:-35}])}}
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
 {key:'early',name:'Early Bird',desc:'Finish a chore before 8 a.m.',tier:0,icon:'sun',goal:1,v:s=>s.earlyBird||0},
 {key:'week',name:'Week Warrior',desc:'Do chores 7 days in a row',tier:1,icon:'flame',goal:7,v:s=>Math.max(s.bestStreak||0,s.streak||0)},
 {key:'month',name:'Unstoppable',desc:'Do chores 30 days in a row',tier:3,icon:'flame',goal:30,v:s=>Math.max(s.bestStreak||0,s.streak||0)},
 {key:'arsenal',name:'Weapon Master',desc:'Unlock 5 weapons',tier:2,icon:'sword',goal:5,v:s=>Object.keys(WEAPONS).filter(k=>weaponUnlocked(k,s)).length},
 {key:'armory',name:'Full Armory',desc:'Unlock every weapon',tier:3,icon:'crown',goal:20,v:s=>Object.keys(WEAPONS).filter(k=>weaponUnlocked(k,s)).length},
 {key:'encyclopedia',name:'Monster Encyclopedia',desc:'Defeat every kind of monster',tier:3,icon:'monster',goal:Object.keys(MON).length,v:s=>Object.keys(MON).filter(k=>cnt(s,k)>0).length}
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
  const sw=Math.round(d.w*.7);rect(ctx,m.x+(d.w-sw)/2+sx,G,sw,1,'#3e8c2c');
  const dx=Math.round(m.x-16+sx),dy=G+1-52,hop=Math.round(m.hopY||0);
  if(m.hopY&&m.hopV!=null&&m.spinT>0&&(time*16|0)%2){ctx.save();ctx.translate(dx+28,dy+28+hop);ctx.scale(-1,-1);ctx.drawImage(mc,-28,-28);ctx.restore()}
  else ctx.drawImage(mc,dx,dy+hop);
  if(m.tongue>0){const tc=d.lashCol||['#ff79a8','#c8406e'];const bx=m.x+(d.lashX??10),by=G-(d.lashY??4);const L=Math.round(m.tongue);
    for(let i=0;i<L;i++){const y=by+Math.round(Math.sin(i*.35-m.t*14)*Math.min(3,i*.15));px(ctx,bx-i,y,tc[0]);px(ctx,bx-i,y+1,tc[1])}
    const ty=by+Math.round(Math.sin(L*.35-m.t*14)*Math.min(3,L*.15));disc(ctx,bx-L,ty,1,tc[0]);px(ctx,bx-L-1,ty+1,tc[1])}
  if(m.showHp){const bx=Math.round(m.x+d.w/2-7),by=G+d.yoff(m)-d.h-6-(d.hpLift||0);rect(ctx,bx-1,by-1,15,4,K);
    for(let i=0;i<3;i++)rect(ctx,bx+i*5,by,4,2,i<m.hp?'#e04a4a':'#4a2030')}}

/* ---------- broom ---------- */
const POSE={walk:-55,idle:-55,windup:-160,swing:35,block:-78,victory:-95,aim:0};
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
  pal:{K,H:'#7a4a26',B:'#e0a858',b:'#b07838'},smear:['#f0d090','#e0a858'],fx:['#e0a858','#b07838','#f0d090']}
};
// How each weapon is earned: a day streak, a total-chores milestone, or mastery of one chore. No coin cost.
const REQ={broom:null,duster:{streak:3},dustpan:{total:10},mop:{streak:7},sponge:{total:25},squeegee:{streak:14},spray:{total:50},
 vacuum:{streak:21},golden:{streak:30},diamond:{total:100},plunger:{total:75},
 toothbrush:{chore:'teeth',n:20},spatula:{chore:'dishes',n:20},rake:{chore:'leaves',n:10},pencil:{chore:'homework',n:20},
 bubble:{chore:'dishes',n:50},lint:{chore:'laundry',n:30},watering:{chore:'plants',n:20},bookmark:{chore:'reading',n:20},bone:{chore:'pet',n:25},shovel:{chore:'snow',n:10},bat:{chore:'outside',n:15},mallet:{chore:'wood',n:15},duckhammer:{chore:'bath',n:15},pillowmace:{chore:'sleep',n:15},rattle:{chore:'dry',n:15},butterknife:{chore:'breakfast',n:15},whisk:{chore:'dinner',n:15},baguette:{chore:'lunchmade',n:15}};
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
 baguette:{name:'Breadcrumb Storm',fx:'rain',spr:'crumb',n:20}
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
   case 'bloom':for(let i=0;i<9;i++)P({x:cx+rnd(-26,22),y:G-3,vx:0,vy:-rnd(30,60),g:140,life:1.4,spr:flowerS});
     for(let i=0;i<12;i++){const a=R()*Math.PI*2;P({x:cx,y:cy,vx:Math.cos(a)*40,vy:Math.sin(a)*40,g:60,life:.6,c:['#ff8ac6','#f4d742','#5cc96a'][i%3]})}break;
   case 'orbit':effects.push({type:'orbit',t:0,dur:1.4,cx,cy});break;
  }}
function updateEffects(dt){for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.t+=dt;
  if(e.type==='suck'&&mon){const[tx,ty]=weaponTip(WEAPONS[weapon],heroX()+11,heroY()+10,hero.ang);for(let k=0;k<3;k++){const a=R()*Math.PI*2,r=rnd(10,20),x=e.cx+Math.cos(a)*r,y=e.cy+Math.sin(a)*r;
    particles.push({x,y,vx:(tx-x)/.35,vy:(ty-y)/.35,g:0,life:.35,c:e.cols[k%e.cols.length]})}}
  if(e.type==='bubble'&&e.t>=e.dur){for(let k=0;k<20;k++){const a=k/20*Math.PI*2;particles.push({x:e.cx+Math.cos(a)*14,y:e.cy+Math.sin(a)*12,vx:Math.cos(a)*50,vy:Math.sin(a)*50,g:60,life:.4,c:e.cols[k%e.cols.length]})}}
  if(e.t>=e.dur)effects.splice(i,1)}}
function drawEffects(){for(const e of effects){const p=e.t/e.dur;
  if(e.type==='swirl')for(let k=0;k<48;k++){const f=k/48,a=f*Math.PI*5+e.t*12,r=(3+f*16)*(1-p*.4);const z=k%2?1:2;rect(ctx,e.cx+Math.cos(a)*r,e.cy+10-f*30,z,z,e.cols[k%e.cols.length]);if(k%4===0)px(ctx,e.cx+Math.cos(a+.3)*r,e.cy+10-f*30,K)}
  if(e.type==='wave'){const front=-12+p*(W+30);for(let x=Math.max(0,front-40);x<Math.min(W,front);x++){const h=Math.round(Math.sin((x-front+40)/40*Math.PI)*7);if(h<=0)continue;
    rect(ctx,x,G-h,1,h,e.cols[0]);px(ctx,x,G-h,e.cols[2]);if((x+(time*20|0))%5===0)px(ctx,x,G-h-1,e.cols[1])}}
  if(e.type==='ring'){const r=4+p*42;for(let k=0;k<48;k++){const a=k/48*Math.PI*2;px(ctx,e.cx+Math.cos(a)*r,e.cy+Math.sin(a)*r*.8,e.cols[k%e.cols.length]);px(ctx,e.cx+Math.cos(a)*(r-2),e.cy+Math.sin(a)*(r-2)*.8,e.cols[(k+1)%e.cols.length])}
  }
  if(e.type==='flash'){ctx.fillStyle=`rgba(255,255,255,${.45*(1-p)})`;ctx.fillRect(0,0,W,H)}
  if(e.type==='bubble'){const r=6+p*18;for(let k=0;k<24;k++){const a=k/24*Math.PI*2;px(ctx,e.cx+Math.cos(a)*r,e.cy+Math.sin(a)*r*.85,e.cols[k%e.cols.length])}px(ctx,e.cx-r*.3,e.cy-r*.4,'#ffffff')}
  if(e.type==='scribble'){for(let k=0;k<30;k++){const a=e.t*10+k*.7;px(ctx,e.cx+Math.cos(a)*(8+(k%5)*2),e.cy+Math.sin(a*1.3)*(6+(k%4)),k%2?'#3a3a48':'#f4c542')}}
  if(e.type==='orbit'){for(let k=0;k<8;k++){const a=e.t*8+k*(Math.PI*2/8),rr=12+Math.sin(e.t*6+k)*2;ctx.drawImage(starS,Math.round(e.cx+Math.cos(a)*rr-2),Math.round(e.cy+Math.sin(a)*rr*.7-2))}}
}}



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
async function battle(type){if(grounded)return false;
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
  hero.pose='victory';hero.vy=-80;await wait(.55);hero.vy=-80;
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
let grounded=false,siren=false,cage=null,cops=[],flyWeapon=null;
async function groundHero(reason){
  if(busy||grounded)return false;busy=true;siren=true;
  say('WEE-OOO! The Chore Patrol is on the way!');scrollTarget=0;
  await wait(.5);scroll=0;hero.pose='idle';
  cops=[{x:W+4,vx:-42,flip:false},{x:W+20,vx:-42,flip:false}];
  await until(()=>cops[0].x<=heroX()+19);cops.forEach(c=>c.vx=0);cops[1].x=cops[0].x+14;
  hero.alert=1;say(reason?`Halt! You're GROUNDED for ${reason}!`:"Halt! You're GROUNDED!");
  await wait(1.1);
  const hx=heroX()+11,hy=heroY()+10;flyWeapon={x:hx,y:hy,tx:cops[0].x+1,ty:G-6,t:0};hero.noWeapon=true;
  say('The Chore Patrol confiscates your weapon!');await until(()=>flyWeapon.t>=1);
  cage={y:-60,vy:0,drop:true,locked:false};await until(()=>!cage.drop);
  if(!reduce)shake=.3;burst(heroX()+7,G,['#b4b4c4','#8890a8','#ffffff'],18,60);
  await wait(.35);cage.locked=true;burst(heroX()+10,G-5,['#f4c542','#ffffff'],8,30);
  say('Locked in! Finish your chores to break out.');
  await wait(1);cops.forEach(c=>{c.vx=40;c.flip=true});
  await until(()=>cops.every(c=>c.x>W+4));cops=[];flyWeapon=null;siren=false;
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
  rect(ctx,x+2,G,8,1,'#3e8c2c');
  if(c.flip){ctx.save();ctx.translate(x+12,y);ctx.scale(-1,1);ctx.drawImage(fr,0,0);ctx.restore()}else ctx.drawImage(fr,x,y);
  if(siren){const on=(time*8|0)%2;px(ctx,x+5,y-1,on?'#ff4a4a':'#4a7aff');px(ctx,x+6,y-1,on?'#4a7aff':'#ff4a4a')}}
  if(flyWeapon){const f=flyWeapon,t=Math.min(1,f.t),c0=cops[0];const tx=c0?c0.x+(c0.flip?11:1):f.tx;
    const fx=t<1?f.x+(tx-f.x)*t:tx,fy=t<1?f.y+(f.ty-f.y)*t-Math.sin(t*Math.PI)*14:G-6;
    drawWeapon(WEAPONS[weapon],fx,fy,t<1?-55+t*720:(c0&&c0.flip?-30:-150))}}

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
  hero.smear=Math.max(0,hero.smear-dt);beamT=Math.max(0,beamT-dt);updateEffects(dt);
  if(mon&&mon.def.snow&&R()<dt*30)particles.push({x:rnd(0,W+30),y:-2,vx:-10,vy:rnd(12,22),g:0,life:4.5,c:R()<.3?'#c8d8ee':'#ffffff'});
  if(mon&&mon.alive&&mon.def.sizzle&&R()<dt*9)particles.push({x:mon.x+rnd(3,15),y:G-10+mon.def.yoff(mon),vx:rnd(-3,3),vy:-rnd(10,18),g:-5,life:.9,c:R()<.5?'#c8d0e0':'#e6ecf5'});
  if(mon&&mon.alive&&mon.def.drizzle&&R()<dt*6)particles.push({x:mon.x+4+(R()*9|0),y:G+1-mon.def.h+mon.def.yoff(mon)-5,vx:0,vy:30,g:80,life:.2,c:'#4aa3ff'});
  if(mon&&mon.alive&&mon.def.shower&&R()<dt*14)particles.push({x:mon.x+9+(R()*3|0)*2,y:G+1-mon.def.h+mon.def.yoff(mon)-7,vx:0,vy:35,g:90,life:.22,c:R()<.5?'#7fd0ff':'#bfefff'});
  if(mon&&mon.alive&&mon.def.bubbly&&R()<dt*5)particles.push({x:mon.x+rnd(3,17),y:G-13+mon.def.yoff(mon),vx:rnd(-4,4),vy:-12,g:-6,life:1.3,c:R()<.5?'#bfefff':'#ffffff'});
  if(mon&&mon.hopV!=null){mon.hopY=(mon.hopY||0)+mon.hopV*dt;mon.hopV+=360*dt;if(mon.hopY>=0){mon.hopY=0;mon.hopV=null}}
  if(mon&&mon.spinT>0)mon.spinT=Math.max(0,mon.spinT-dt);
  for(const c of cops)c.x+=c.vx*dt;
  if(flyWeapon)flyWeapon.t+=dt*1.6;
  if(cage){if(cage.drop){cage.vy+=420*dt;cage.y+=cage.vy*dt;if(cage.y>=0){cage.y=0;cage.drop=false}}if(cage.lift)cage.y-=90*dt}
  if(grounded&&cage&&!busy&&R()<dt*.9)particles.push({x:heroX()+(R()<.5?6:9),y:heroY()+6,vx:0,vy:10,g:80,life:.5,c:'#7fd0ff'});
  if(!banner&&!busy&&achQueue.length){const a=achQueue.shift();banner={a,t:0};say(`${a.title} ${a.name}: ${a.desc}`);burst(64,40,['#f4c542','#fff3a8','#ffffff'],24,70)}
  if(banner){banner.t+=dt;if(banner.t>3)banner=null}hero.alert=Math.max(0,hero.alert-dt);
  shake=Math.max(0,shake-dt);hudPop=Math.max(0,hudPop-dt);
  if(mon){mon.t+=dt;if(mon.approach)mon.x-=scroll*dt;
    let ot=mon.openT;if(mon.def.chomp&&mon.idle&&!mon.approach&&mon.alive)ot=Math.max(ot,Math.sin(mon.t*5)>.55?.6:0);
    mon.open+=(ot-mon.open)*Math.min(1,dt*18);mon.tongue+=(mon.tongueT-mon.tongue)*Math.min(1,dt*13);mon.lunge+=(mon.lungeT-mon.lunge)*Math.min(1,dt*12);
    mon.flash=Math.max(0,mon.flash-dt);mon.shake=Math.max(0,mon.shake-dt)}
  const hx=heroX()+17;
  for(let i=projectiles.length-1;i>=0;i--){const p=projectiles[i];p.x+=p.vx*dt;p.vy+=p.g*dt;p.y+=p.vy*dt;
    if(p.k==='bubble'||p.k==='letter')p.y=p.base+Math.sin(time*8+p.ph)*2;
    if(p.x<=hx){block(p.x,p.y,mon?mon.def.hit:['#ffffff']);projectiles.splice(i,1)}}
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=(p.g||0)*dt;p.life-=dt;if(p.life<=0)particles.splice(i,1)}
  for(let i=coins.length-1;i>=0;i--){const c=coins[i];c.t+=dt;if(c.t<0)continue;
    if(c.t<.5){c.x+=c.vx*dt;c.y+=c.vy*dt;c.vy+=200*dt}
    else{const tx=W-23,ty=6;c.x+=(tx-c.x)*Math.min(1,dt*9);c.y+=(ty-c.y)*Math.min(1,dt*9);
      if(Math.abs(c.x-tx)<2&&Math.abs(c.y-ty)<2){coins.splice(i,1);coinsTotal++;hudPop=.15;burst(tx,ty,['#f4c542','#fff3a8'],5,30)}}}
  for(let i=floats.length-1;i>=0;i--){const f=floats[i];f.y-=12*dt;f.life-=dt;if(f.life<=0)floats.splice(i,1)}
  if(shown<full.length){shown+=dt*48;if(dlg)dlg.textContent=full.slice(0,shown|0)}
}
function drawCoin(x,y,ph){const w=[5,3,1,3][(ph*10|0)%4];x=Math.round(x);y=Math.round(y);
  rect(ctx,x-(w>>1)-1,y-3,w+2,7,'#8a5a10');rect(ctx,x-(w>>1),y-2,w,5,'#f4c542');if(w>1)px(ctx,x-(w>>1),y-2,'#fff3a8')}
function draw(){
  ctx.save();if(shake>0)ctx.translate(Math.round(rnd(-1.5,1.5)),Math.round(rnd(-1,1)));
  ctx.drawImage(sky,0,0);
  drawLayer(clouds,worldX*.08+time*2,2);drawLayer(hills,worldX*.15);drawLayer(farPines,worldX*.3);
  drawLayer(midPines,worldX*.5);drawLayer(trees,worldX*.7);drawLayer(ground,worldX);
  // hero
  const x=Math.round(heroX()),walking=scroll>2&&hero.pose==='walk';const fr=walking&&(time*8|0)%2;
  const y=Math.round(heroY())-(fr?1:0);
  rect(ctx,x+3,G,8,1,'#3e8c2c');
  if(hero.smear>0){const W_=WEAPONS[weapon],L=W_.map[0].length-W_.grip[0]-2;let k=0;for(let a=-160;a<=35;a+=7,k++){const r=a*Math.PI/180;const c1=W_.smear==='rainbow'?RAINBOW[k%6]:W_.smear[0],c2=W_.smear==='rainbow'?RAINBOW[(k+1)%6]:W_.smear[1];
    px(ctx,x+11+Math.cos(r)*L,y+10+Math.sin(r)*L,c1);px(ctx,x+11+Math.cos(r)*(L-1),y+10+Math.sin(r)*(L-1),c2)}}
  ctx.drawImage(fr?HEROES[heroKey].b:HEROES[heroKey].a,x,y);
  if(!hero.noWeapon)drawWeapon(WEAPONS[weapon],x+11,y+10,hero.ang);
  if(beamT>0&&mon){const[bx,by]=weaponTip(WEAPONS[weapon],x+11,y+10,hero.ang);const ex=mon.x+mon.def.w/2;
    for(let i=0;bx+i<ex;i++){const BC=WEAPONS[weapon].beamCol||['#7fe0ff','#ffffff','#bfefff','#4aa3ff'];const c=((i+time*60|0)%4)<2?BC[0]:BC[1];const w=1+((i+time*30|0)%5===0);px(ctx,bx+i,by,c);if(w)px(ctx,bx+i,by-1,BC[2]);px(ctx,bx+i,by+1,BC[3])}
    if(R()<.7)particles.push({x:ex,y:by+rnd(-4,4),vx:-(ex-bx)*3,vy:0,g:0,life:.3,c:'#ffffff'})}
  if(hero.alert>0){rect(ctx,x+4,y-11,7,9,K);rect(ctx,x+5,y-10,5,7,'#ffffff');rect(ctx,x+7,y-9,1,3,'#e04a4a');px(ctx,x+7,y-5,'#e04a4a')}
  if(cage)drawCage();drawCops();
  if(mon&&mon.alive)drawMonster(mon);
  projectiles.forEach(drawProj);
  particles.forEach(p=>p.spr?ctx.drawImage(p.spr,Math.round(p.x),Math.round(p.y)):rect(ctx,p.x,p.y,p.s||1,p.s||1,p.c));
  drawEffects();
  coins.forEach(c=>{if(c.t>=0)drawCoin(c.x,c.y,time+c.x*.05)});
  floats.forEach(f=>text(f.s,Math.round(f.x),Math.round(f.y),'#f4c542'));
  drawLayer(fore,worldX*1.3,H-12);
  ctx.restore();
  if(banner){const t=banner.t,p=t<.35?t/.35:t>2.65?1-(t-2.65)/.35:1;const e=1-Math.pow(1-p,3);const im=banner.a.img,iw=im.width*2,ih=im.height*2,bw=iw+10,bh=ih+8,bx=Math.round(64-bw/2),by=Math.round(-50+e*(92-bh/2));
    rect(ctx,bx-1,by-1,bw+2,bh+2,K);rect(ctx,bx,by,bw,bh,'#f4c542');rect(ctx,bx+1,by+1,bw-2,bh-2,'#1a1f3a');
    ctx.drawImage(im,bx+5,by+4,iw,ih);const R0=Math.max(bw,bh)/2+4;
    for(let k=0;k<10;k++){const a=k/10*Math.PI*2+t*2,r=R0+Math.sin(t*6+k)*2;px(ctx,bx+bw/2+Math.cos(a)*r,by+bh/2+Math.sin(a)*r,k%2?'#ffffff':'#f4c542')}}
  if(siren){const on=(time*6|0)%2;rect(ctx,0,0,W,1,on?'#ff4a4a':'#4a7aff');rect(ctx,0,H-1,W,1,on?'#4a7aff':'#ff4a4a')}
  // HUD
  drawCoin(W-23,6,time*.6);text(String(coinsTotal),W-18,4,hudPop>0?'#ffffff':'#f4c542');
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
  weapons:Object.fromEntries(Object.entries(WEAPONS).map(([k,w])=>[k,{name:w.name,tier:w.tier,unlock:w.unlock,req:w.req,perk:w.perk,bonus:w.bonus||0}])),
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
  ground:groundHero,                 // ground('skipping chores') -> cops arrive, cage drops; play() is refused while grounded
  release:releaseHero,               // chores done: lock pops, cage lifts, back to walking
  isGrounded:()=>grounded,
  icon(type,scale=3){const d=MON[type];if(!d)return null;const hr=d.headroom||0;const[c,g]=canvas(d.w+(hr?2:0),d.h+hr+1);d.draw(g,0,hr+1,{open:0,t:0,idle:false,shake:0,flash:0});return pixelCanvas(c,scale)},
  weaponIcon(key,scale=4){const w=WEAPONS[key];return w?pixelCanvas(w.icon,scale):null},
  heroIcon(key,scale=3){const h=HEROES[key];return h?pixelCanvas(h.a,scale):null},
  heroFrames(key){const h=HEROES[key];return h?{a:pixelCanvas(h.a,1),b:pixelCanvas(h.b,1)}:null},
  weaponSprite(key){const w=WEAPONS[key];return w?{key,name:w.name,image:pixelCanvas(w.icon,1),grip:w.grip,mapLen:w.map[0].length,smear:w.smear,fx:w.fx,fxG:w.fxG,beam:!!w.beam,beamCol:w.beamCol,heavy:!!w.heavy,speed:w.speed||1,bonus:w.bonus||0}:null},
  destroy(){running=false;cancelAnimationFrame(raf)}
};
}

export default createChoreQuest;
