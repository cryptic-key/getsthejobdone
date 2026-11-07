/* Live demo for the portfolio: the real quest-board stage, with a pretend family taking turns
   beating random chore monsters on a loop. No sign-in, no network, nothing is saved. */

import { PET_KEYS, normalizePet, setStageScene, stageElement } from "./battle.js?v=70";
import createChoreQuest from "./chore-quest.js";
import { setSilent } from "./sound.js";

/* The portfolio demo is always silent: no audio context, no music, no sound effects, nothing saved. */
setSilent(true);

const quest = createChoreQuest(document.createElement("canvas"), {});
quest.destroy();

const weaponKeys = Object.keys(quest.weapons);
const pick = (index) => weaponKeys[Math.min(weaponKeys.length - 1, index)] || "broom";

/* Hero look, colour and gear for each family member. */
const FAMILY = [
  { name: "Dad", hero: "king", color: "#c0392b", weapon: pick(0), pet: PET_KEYS[0] },
  { name: "Sam", hero: "knight", color: "#3c7f92", weapon: pick(8), pet: PET_KEYS[1] },
  { name: "Mom", hero: "queen", color: "#7a3fb0", weapon: pick(16), pet: PET_KEYS[2] },
  { name: "Riley", hero: "princess", color: "#d45d8c", weapon: pick(24), pet: PET_KEYS[3] },
];

/* Chore name for each monster. */
const TASKS = {
  dust: "Dust the shelves",
  bed: "Make your bed",
  teeth: "Brush your teeth",
  dishes: "Do the dishes",
  laundry: "Put away laundry",
  toys: "Tidy the toys",
  reading: "Read for 20 minutes",
  pet: "Feed the dog",
  plants: "Water the plants",
  table: "Set the table",
  trash: "Take out the trash",
  counters: "Wipe the counters",
  towels: "Hang the towels",
  homework: "Finish homework",
  leaves: "Rake the leaves",
  petbrush: "Brush the cat",
  shoes: "Line up the shoes",
  pack: "Pack your backpack",
  bath: "Take a bath",
  dressed: "Get dressed",
  breakfast: "Make breakfast",
  groceries: "Carry the groceries",
};
const SPRITE_KEYS = Object.keys(TASKS);

const rosterEl = document.getElementById("roster");
rosterEl.innerHTML = FAMILY.map((member) => `<span style="--c:${member.color}"><i></i>${member.name}</span>`).join("");
const chips = [...rosterEl.children];
document.getElementById("stage").appendChild(stageElement());

const recent = [];
let turn = 0;
let fights = 0;

function nextMonster() {
  const fresh = SPRITE_KEYS.filter((key) => !recent.includes(key));
  const key = fresh[Math.floor(Math.random() * fresh.length)];
  recent.push(key);
  if (recent.length > 8) recent.shift();
  return key;
}

function startFight() {
  const index = turn % FAMILY.length;
  const member = FAMILY[index];
  turn += 1;
  chips.forEach((chip, i) => chip.classList.toggle("on", i === index));
  const sprite = nextMonster();
  fights += 1;
  const chore = { id: `demo-${fights}`, title: TASKS[sprite], points: 2 + Math.floor(Math.random() * 7), sprite, approved: true };
  setStageScene({
    color: member.color,
    hero: member.hero,
    waiting: [],
    plays: [chore],
    gear: { weapon: quest.weaponSprite(member.weapon), pet: normalizePet(member.pet) || null },
    hearts: 3,
    onDone: () => setTimeout(startFight, 2200),
  });
}

startFight();
