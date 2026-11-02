/* Monster Arena: kids pay an entry fee, then answer age-level questions to beat monsters for coins. */

import { createChoreQuest } from "./chore-quest.js?v=42";

let host = null;
let quest = null;
let ctx = null;
let view = "lobby";
let run = null;
let pending = null;
let current = null;
let alive = false;
// The arena opens after the hero walks through the colosseum gate on the main stage.
let revealed = false;

export function arenaRevealed() {
  return revealed;
}

export function revealArena() {
  revealed = true;
  if (host) host.hidden = false;
  quest?.arena.scene?.(true);
}

const LEVEL_ORDER = ["little", "kid", "big", "teen"];
const PERFECT_TO_LEVEL = 3;

const esc = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);

function buildHost() {
  host = document.createElement("div");
  host.className = "arena-host stack";
  host.innerHTML = `<div class="arena-stage"><canvas class="arena-canvas" width="128" height="72" aria-label="Monster Arena"></canvas><div class="arena-dialog" aria-live="polite"></div></div><section class="card arena-panel" aria-live="polite"></section>`;
  host.addEventListener("click", onClick);
  host.hidden = !revealed;
  return host;
}

function startEngine() {
  if (quest) return;
  const canvas = host.querySelector(".arena-canvas");
  quest = createChoreQuest(canvas, {
    dialogEl: host.querySelector(".arena-dialog"),
    coins: ctx.points(),
    hero: ctx.hero(),
    weapon: ctx.weapon(),
    pet: ctx.pet(),
    seed: (Date.now() ^ (Math.random() * 0x7fffffff)) | 0,
    idleText: "The Monster Arena awaits...",
  });
}

export function mountArena(slot, context) {
  ctx = context;
  if (!host) buildHost();
  slot.replaceWith(host);
  startEngine();
  quest.setCoins(ctx.points());
  host.hidden = !revealed;
  if (revealed) quest.arena.scene?.(true);
  if (view === "lobby") paintLobby();
}

export function leaveArena() {
  if (!host) return;
  alive = false;
  if (pending) {
    pending(-1);
    pending = null;
  }
  if (run?.id && ctx) {
    ctx.rpc("kid_arena_end", { p_token: ctx.token(), p_run: run.id }).catch(() => {});
  }
  run = null;
  view = "lobby";
  revealed = false;
  try { window.speechSynthesis?.cancel(); } catch { /* speech is optional */ }
  quest?.destroy();
  quest = null;
  host.remove();
  host = null;
}

function panel() {
  return host?.querySelector(".arena-panel");
}

function levelInfo() {
  const levels = quest?.arena.levels || {};
  return levels[ctx.level()] || levels.kid || { name: "Adventurer", ages: "Ages 6–8" };
}

function paintLobby(message = "") {
  view = "lobby";
  const el = panel();
  if (!el) return;
  const fee = ctx.entry();
  const per = ctx.perKill();
  const coins = ctx.points();
  const level = levelInfo();
  const cats = Object.values(quest?.arena.categories || {}).map((cat) => cat.name).join(" · ");
  const locked = ctx.grounded();
  el.innerHTML = `<h2 class="page-title">Monster Arena</h2>
    <p class="lede">Answer questions to beat the monsters. Each monster takes 3 hits. A wrong answer costs a heart, and the run ends when your 3 hearts are gone. Beat 3 monsters in a row without losing a heart to level up to harder questions.</p>
    <div class="arena-facts">
      <span><b>${fee}</b> coin${fee === 1 ? "" : "s"} to enter</span>
      <span><b>+${per}</b> per monster</span>
      <span>You have <b>${coins}</b></span>
    </div>
    <p class="tiny muted">${esc(level.name)} · ${esc(level.ages)}<br>${esc(cats)}</p>
    ${message ? `<p class="error">${esc(message)}</p>` : ""}
    ${locked
      ? `<div class="banner">The arena is closed while you are grounded.</div>`
      : `<button class="btn sun wide" type="button" data-arena="enter" ${coins >= fee ? "" : "disabled"}>${coins >= fee ? `Enter the arena (${fee} coin${fee === 1 ? "" : "s"})` : `You need ${fee} coins to enter`}</button>`}`;
}

function choiceButton(choice, index) {
  const A = quest.arena;
  const label = A.choiceLabel(choice);
  if (choice.t === "swatch") {
    return `<button class="arena-choice" type="button" data-arena="pick" data-i="${index}" aria-label="${esc(label)}"><i class="arena-swatch" style="background:${esc(choice.c)}"></i></button>`;
  }
  if (choice.t === "pet" || choice.t === "shape") {
    return `<button class="arena-choice" type="button" data-arena="pick" data-i="${index}" aria-label="${esc(label)}"><span class="arena-art" data-art="${index}"></span></button>`;
  }
  return `<button class="arena-choice text" type="button" data-arena="pick" data-i="${index}">${esc(choice.v)}</button>`;
}

function paintQuestion(q) {
  view = "question";
  const el = panel();
  if (!el) return;
  const A = quest.arena;
  const cat = A.categories[q.cat]?.name || "";
  const lvl = A.levels[run?.level] || {};
  const next = LEVEL_ORDER[LEVEL_ORDER.indexOf(run?.level) + 1];
  const streak = next ? ` · Perfect streak ${run?.streak || 0}/${PERFECT_TO_LEVEL}` : "";
  el.innerHTML = `<div class="arena-q-head"><span class="chip">${esc(cat)}</span><span class="tiny muted">${esc(lvl.name || "")}${streak} · Beaten: ${run?.kills || 0}</span></div>
    <p class="arena-q">${esc(q.text)}</p>
    <div class="arena-vis"></div>
    <div class="arena-choices${q.layout === "list" ? " list" : q.choices.length > 3 ? " four" : ""}">${q.choices.map(choiceButton).join("")}</div>
    <button class="btn ghost small" type="button" data-arena="hear">Hear it</button>`;
  const vis = A.drawVis(q.vis);
  if (vis) {
    vis.className = "arena-vis-art";
    vis.style.width = `${vis.width * 4}px`;
    el.querySelector(".arena-vis").appendChild(vis);
  }
  q.choices.forEach((choice, i) => {
    const slot = el.querySelector(`[data-art="${i}"]`);
    const art = slot ? A.choiceArt(choice) : null;
    if (art) {
      art.className = "arena-art-canvas";
      art.style.width = `${art.width * 4}px`;
      slot.appendChild(art);
    }
  });
}

function lockChoices(answer, picked) {
  const el = panel();
  if (!el) return;
  el.querySelectorAll("[data-arena='pick']").forEach((btn) => {
    const i = Number(btn.dataset.i);
    btn.disabled = true;
    if (i === answer) btn.classList.add("right");
    else if (i === picked) btn.classList.add("wrong");
  });
  el.querySelector("[data-arena='hear']")?.setAttribute("disabled", "");
}

function ask(q) {
  current = q;
  paintQuestion(q);
  return new Promise((resolve) => {
    pending = resolve;
  });
}

function paintSummary(kills, won, topLevel, startLevel) {
  view = "summary";
  const el = panel();
  if (!el) return;
  const top = quest?.arena.levels[topLevel];
  const climbed = top && topLevel !== startLevel;
  el.innerHTML = `<h2 class="page-title">Out of hearts!</h2>
    <p class="arena-q">You beat ${kills} monster${kills === 1 ? "" : "s"} and won ${won} coin${won === 1 ? "" : "s"}.</p>
    ${climbed ? `<p class="tiny muted">You leveled up to ${esc(top.name)} (${esc(top.ages)}) questions!</p>` : ""}
    <div class="row">
      <button class="btn sun" type="button" data-arena="again">Play again</button>
      <button class="btn ghost" type="button" data-arena="lobby">Done</button>
    </div>`;
}

async function playRun() {
  const A = quest.arena;
  let start;
  try {
    start = await ctx.rpc("kid_arena_start", { p_token: ctx.token() });
  } catch (error) {
    paintLobby(ctx.nice(error));
    return;
  }
  alive = true;
  run = { id: start.run_id, kills: 0, won: 0 };
  A.config.entry = Number(start.entry) || 0;
  A.config.perKill = Number(start.per_kill) || 0;
  run.level = A.levels[start.level] ? start.level : "kid";
  run.streak = 0;
  run.top = run.level;
  quest.setCoins(Number(start.points) || 0);
  ctx.setPoints(Number(start.points) || 0);
  A.begin();
  let last = null;
  let levelUp = "";
  while (alive && A.hearts() > 0) {
    const cats = Object.keys(A.categories).filter((cat) => cat !== last);
    const cat = cats[Math.floor(Math.random() * cats.length)];
    last = cat;
    if (panel()) panel().innerHTML = levelUp || `<p class="arena-q">A monster enters the arena...</p>`;
    levelUp = "";
    const heartsBefore = A.hearts();
    await A.spawn(A.categories[cat].monster);
    if (!alive) return;
    const level = run.level;
    let beaten = false;
    while (alive && !beaten && A.hearts() > 0) {
      const q = A.makeQuestion(cat, level, run.kills);
      if (A.levels[level].readAloud) A.speak(q.say);
      const picked = await ask(q);
      pending = null;
      if (!alive) return;
      lockChoices(q.answer, picked);
      if (picked === q.answer) {
        beaten = await A.hit();
      } else {
        A.speak([{ t: `The answer is ${A.choiceLabel(q.choices[q.answer])}`, lang: "en-CA" }]);
        await A.miss();
      }
      if (!alive) return;
    }
    if (beaten) {
      run.kills += 1;
      try {
        const paid = await ctx.rpc("kid_arena_kill", { p_token: ctx.token(), p_run: run.id });
        run.won += Number(paid?.reward) || 0;
        quest.setCoins(Number(paid?.points) || 0);
        ctx.setPoints(Number(paid?.points) || 0);
      } catch {
        /* keep playing; the coin just isn't saved */
      }
      run.streak = A.hearts() === heartsBefore ? run.streak + 1 : 0;
      const next = LEVEL_ORDER[LEVEL_ORDER.indexOf(run.level) + 1];
      if (run.streak >= PERFECT_TO_LEVEL && next && A.levels[next]) {
        run.level = next;
        run.top = next;
        run.streak = 0;
        const info = A.levels[next];
        levelUp = `<p class="arena-q">Level up! ${PERFECT_TO_LEVEL} perfect monsters in a row.</p><p class="tiny muted">Harder questions now: ${esc(info.name)} · ${esc(info.ages)}</p>`;
        A.speak([{ t: `Level up! ${info.name} questions now.`, lang: "en-CA" }]);
      }
    } else {
      run.streak = 0;
    }
  }
  if (!alive) return;
  if (panel()) panel().innerHTML = `<p class="arena-q">Out of hearts...</p>`;
  await A.ko();
  A.end(true);
  const id = run.id;
  const topLevel = run.top;
  const startLevel = A.levels[start.level] ? start.level : "kid";
  run = null;
  let result = { kills: 0, coins_won: 0 };
  try {
    result = await ctx.rpc("kid_arena_end", { p_token: ctx.token(), p_run: id });
  } catch {
    /* summary still shows local counts */
  }
  alive = false;
  paintSummary(Number(result?.kills) || 0, Number(result?.coins_won) || 0, topLevel, startLevel);
  ctx.refresh();
}

function onClick(event) {
  const btn = event.target.closest("[data-arena]");
  if (!btn || btn.disabled) return;
  const action = btn.dataset.arena;
  if (action === "enter" || action === "again") {
    btn.disabled = true;
    playRun();
  }
  if (action === "lobby") paintLobby();
  if (action === "pick" && pending) {
    const resolve = pending;
    pending = null;
    resolve(Number(btn.dataset.i));
  }
  if (action === "hear" && view === "question" && current) quest.arena.speak(current.say);
}
