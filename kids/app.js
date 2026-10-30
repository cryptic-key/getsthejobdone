import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config.js";
import { SPRITES, guessSprite, normalizeSprite, paintSpriteIcons, setStageScene, stageElement } from "./battle.js";
import { mergeBattleLine, splitBattleLine } from "./battle-line.js";

const COLORS = ["leaf", "sun", "sky", "clay", "plum", "teal"];
const COLOR_HEX = { leaf: "#2f7d5a", sun: "#e3a31a", sky: "#3c7f92", clay: "#a24b34", plum: "#6e6284", teal: "#2f6f6a" };
const PLAY_ROUTES = new Set(["welcome", "loading", "kid-gate", "today", "kid-shop", "me"]);
const KID_TOKEN = "chart-kid-token";
const BATTLE_KEY = "chart-battle-v1";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const sideAuth = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: "chart-side-auth",
  },
});

const app = document.querySelector("#app");
let schemaReady = false;
let db = blank();
let gateKids = [];
let gateParents = [];
let route = { name: "loading" };
let draft = {};
let notice = "";
let busy = false;

function blank() {
  return { family: null, parents: [], kids: [], chores: [], templates: [], items: [], requests: [], activity: [], week: [], session: null };
}

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parent() {
  return db.parents.find((p) => p.id === db.session?.id) || null;
}

function kid() {
  return db.kids.find((k) => k.id === db.session?.id) || db.kids[0] || null;
}

function kidById(id) {
  return db.kids.find((k) => k.id === id) || gateKids.find((k) => k.id === id) || null;
}

function money(cents) {
  return `$${(Number(cents) / 100).toFixed(2)}`;
}

function when(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function grounded(child) {
  return child?.groundedUntil && new Date(child.groundedUntil).getTime() > Date.now();
}

async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data;
}

function nice(error) {
  const msg = error?.message || "Something went wrong";
  if (/wrong pin/i.test(msg)) return "That PIN does not match.";
  if (/too many tries/i.test(msg)) return "Too many tries. Wait a few minutes.";
  if (/email not confirmed/i.test(msg)) return "Confirm that email first, then sign in.";
  if (/not a parent/i.test(msg)) return "This login is not on a family yet.";
  if (/already has an account/i.test(msg)) return "That email already has an account. They can sign in.";
  if (/^grounded$/i.test(msg)) return "Device time is locked while you are grounded.";
  if (/not enough points/i.test(msg)) return "Not enough points for that.";
  if (/not enough coins/i.test(msg)) return "Not enough coins to take off.";
  if (/not enough minutes/i.test(msg)) return "Not enough screen time to cash in.";
  if (/not enough cash/i.test(msg)) return "Not enough cash to take off.";
  if (/enter coins, cash, or minutes/i.test(msg)) return "Enter coins, cash, or minutes to take off.";
  if (/already asked/i.test(msg)) return "You already asked for that.";
  if (/sign in again/i.test(msg)) return "Sign in again.";
  return msg;
}

function go(name, extra) {
  route = { name, ...(extra || {}) };
  draft = {};
  notice = extra?.notice || "";
  render();
}

async function boot() {
  try {
  const { error } = await supabase.rpc("list_kids", { p_code: "" });
  schemaReady = !error || (error.code !== "PGRST202" && error.code !== "PGRST205" && !/schema cache/i.test(error.message || ""));
  if (!schemaReady) {
    route = { name: "welcome" };
    render();
    return;
  }
  await loadPlayers();
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    const ok = await loadParent();
    route = { name: ok ? "family" : "parent-auth", mode: "signin" };
    if (!ok) notice = "Sign in with a parent account on this family.";
  } else if (sessionStorage.getItem(KID_TOKEN)) {
    const ok = await loadKid();
    route = { name: ok ? "today" : "welcome" };
  } else {
    route = { name: "welcome" };
  }
  render();
  } catch (error) {
    schemaReady = false;
    notice = nice(error);
    route = { name: "welcome" };
    render();
  }
}

function mapKid(row) {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    points: row.points,
    cashCents: row.cash_cents,
    minutes: row.minutes,
    groundedUntil: row.grounded_until,
  };
}

async function loadParent() {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return false;
  const { data: me, error } = await supabase
    .from("parents")
    .select("id,name,email,household_id,households(name,code,points_per_dollar,points_per_30)")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!me?.households) return false;
  await rpc("ensure_today");
  const day = torontoToday();
  const [parents, kids, chores, templates, items, requests, activity, doorPins] = await Promise.all([
    supabase.from("parents").select("id,name,email").order("created_at"),
    supabase.from("kids").select("id,name,color,points,cash_cents,minutes,grounded_until").order("created_at"),
    supabase.from("chores").select("id,kid_id,title,points,cash_cents,minutes,status,chore_day,sprite").or(`chore_day.is.null,chore_day.eq.${day}`).neq("status", "approved").order("created_at"),
    supabase.from("chore_templates").select("id,title,points,kind,sprite").order("created_at"),
    supabase.from("shop_items").select("id,name,cost").order("created_at"),
    supabase.from("requests").select("id,kid_id,item_id,cost,status").eq("status", "pending"),
    supabase.from("activity").select("id,kid_id,body,created_at").order("created_at", { ascending: false }).limit(20),
    supabase.rpc("door_ready"),
  ]);
  for (const result of [parents, kids, chores, templates, items, requests, activity]) {
    if (result.error) throw result.error;
  }
  const readyPins = new Set((doorPins.data || []).map((row) => row.parent_id));
  db = {
    family: {
      name: me.households.name,
      code: me.households.code,
      pointsPerDollar: me.households.points_per_dollar,
      pointsPer30: me.households.points_per_30,
    },
    parents: parents.data.map((person) => ({ ...person, hasPin: readyPins.has(person.id) })),
    kids: kids.data.map(mapKid),
    chores: chores.data.map((chore) => ({
      ...chore,
      kidId: chore.kid_id,
      cashCents: chore.cash_cents,
      special: chore.chore_day == null,
    })),
    templates: templates.data,
    items: items.data,
    requests: requests.data.map((req) => ({ ...req, kidId: req.kid_id, itemId: req.item_id })),
    activity: activity.data.map((row) => ({ id: row.id, kidId: row.kid_id, text: row.body, at: row.created_at })),
    session: { role: "parent", id: me.id },
  };
  return true;
}

async function loadKid() {
  const token = sessionStorage.getItem(KID_TOKEN);
  if (!token) return false;
  const { data, error } = await supabase.rpc("kid_snapshot", { p_token: token });
  if (error) {
    sessionStorage.removeItem(KID_TOKEN);
    return false;
  }
  const snap = data;
  db = {
    family: {
      name: snap.family.name,
      code: snap.family.code,
      pointsPerDollar: snap.family.points_per_dollar,
      pointsPer30: snap.family.points_per_30,
    },
    parents: [],
    kids: [mapKid(snap.kid)],
    chores: snap.chores.map((chore) => ({ ...chore, kidId: snap.kid.id, cashCents: chore.cash_cents, special: Boolean(chore.special) })),
    items: snap.items,
    requests: snap.requests.map((req) => ({ ...req, kidId: snap.kid.id, itemId: req.item_id })),
    activity: snap.activity.map((row) => ({ id: row.id, text: row.body, at: row.created_at })),
    templates: [],
    week: snap.week || [],
    session: { role: "kid", id: snap.kid.id },
  };
  return true;
}

async function run(work, message, next) {
  if (busy) return;
  busy = true;
  try {
    await work();
    if (db.session?.role === "kid") await loadKid();
    else if (db.session?.role === "parent") await loadParent();
    notice = message || "";
    if (next) route = { name: next };
    else route = { ...route, error: "" };
    draft = {};
    render();
    if (db.session?.role === "kid" && message && !/marked done/i.test(message)) celebrate();
  } catch (error) {
    route = { ...route, error: nice(error) };
    render();
  } finally {
    busy = false;
  }
}

function mark() {
  return `<span class="mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5 9.2 17 19 7"/></svg></span>`;
}

function face(color) {
  const fill = COLOR_HEX[color] || COLOR_HEX.leaf;
  return `<svg class="face" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="34" r="26" fill="${fill}"/><circle cx="22" cy="30" r="4" fill="#fff"/><circle cx="42" cy="30" r="4" fill="#fff"/><circle cx="23" cy="31" r="2" fill="#24312c"/><circle cx="43" cy="31" r="2" fill="#24312c"/><path d="M22 42 Q32 50 42 42" fill="none" stroke="#24312c" stroke-width="3" stroke-linecap="round"/></svg>`;
}

function pinPad(title) {
  return `<div class="card pin-card">
    <h2 class="page-title">${title}</h2>
    <div class="pin-dots">${[0, 1, 2, 3].map((i) => `<i class="${(draft.pin || "").length > i ? "on" : ""}"></i>`).join("")}</div>
    ${route.error ? `<p class="error">${esc(route.error)}</p>` : ""}
    <div class="pad">
      ${["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "go"]
        .map((key) => `<button type="button" data-action="pin" data-key="${key}">${key === "clear" ? "⌫" : key === "go" ? "Go" : key}</button>`)
        .join("")}
    </div>
  </div>`;
}

function roster() {
  const people = [
    ...gateKids.map((child) => ({ id: child.id, name: child.name, color: child.color, kind: "kid", hasPin: true })),
    ...gateParents.map((person) => ({ id: person.id, name: person.name, color: person.color || "teal", kind: "parent", hasPin: person.hasPin })),
  ];
  const selected = people.find((person) => person.id === route.playerId);
  const pad = !selected
    ? ""
    : selected.kind === "parent" && !selected.hasPin
      ? `<form class="card stack" data-action="parent-auth-submit">
          <h2 class="page-title">${esc(selected.name)}</h2>
          <p class="lede">This parent does not have a door PIN yet. Sign in once, then set one on the Family page.</p>
          <label>Email<input name="email" type="email" autocomplete="username" required value="${esc(draft.email || "")}"></label>
          <label>Password<input name="password" type="password" autocomplete="current-password" required minlength="8"></label>
          ${route.error ? `<p class="error">${esc(route.error)}</p>` : ""}
          <button class="btn leaf" type="submit">Sign in</button>
        </form>`
      : pinPad(`PIN for ${esc(selected.name)}`);
  return `<div class="stack">
    <div class="roster">${people
      .map(
        (person) => `<button class="kid-pick" data-action="pick-player" data-id="${person.id}" data-kind="${person.kind}" aria-pressed="${selected?.id === person.id}">
          <canvas class="hero-icon" data-hero="${esc(COLOR_HEX[person.color] || COLOR_HEX.leaf)}" width="14" height="17" aria-hidden="true"></canvas>
          <strong>${esc(person.name)}</strong>
          ${person.kind === "parent" ? `<span class="role">Parent</span>` : ""}
        </button>`
      )
      .join("")}</div>
    ${pad}
  </div>`;
}

async function loadPlayers() {
  gateKids = [];
  gateParents = [];
  const { data, error } = await supabase.rpc("list_players");
  if (!error && data) {
    gateKids = data.filter((row) => row.kind === "kid");
    gateParents = data.filter((row) => row.kind === "parent").map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color || "teal",
      hasPin: Boolean(row.has_pin),
    }));
    return;
  }
  const kids = await supabase.rpc("list_kids", { p_code: "" });
  if (!kids.error) gateKids = kids.data || [];
}

function worldScene(color) {
  return `<div class="stage-slot" data-color="${esc(color || "leaf")}"></div>`;
}

function mountStage() {
  const slot = app.querySelector(".stage-slot");
  const host = stageElement();
  if (slot) {
    host.dataset.color = slot.dataset.color || "leaf";
    host.hidden = false;
    slot.replaceWith(host);
  } else if (host.isConnected) {
    host.hidden = true;
    if (host.parentElement !== document.body) document.body.appendChild(host);
  }
}

let battleLine = [];
let playChores = [];
let finishedIds = new Set();
let lineIds = [];
let pollTimer = 0;
let lastKidSig = "";

function battleStore() {
  try {
    const data = JSON.parse(localStorage.getItem(BATTLE_KEY) || "{}");
    if (data && data.kids && typeof data.kids === "object" && !Array.isArray(data.kids)) return data.kids;
    if (data && data.kidId && Array.isArray(data.chores)) return { [data.kidId]: data.chores };
  } catch {
    /* keep an empty board if storage is unreadable */
  }
  return {};
}

function loadTracked(kidId) {
  const chores = battleStore()[kidId];
  return Array.isArray(chores) ? chores.filter((chore) => chore && chore.id) : [];
}

function saveTracked(kidId, chores) {
  const kids = battleStore();
  kids[kidId] = chores;
  localStorage.setItem(BATTLE_KEY, JSON.stringify({ kids }));
}

function taskSprite(chore) {
  if (!chore) return "dust";
  return normalizeSprite(chore.sprite || guessSprite(chore.title));
}

function spriteName(id) {
  return SPRITES.find((sprite) => sprite.id === normalizeSprite(id))?.name || "Dust Bunny";
}

function actor(chore) {
  return {
    id: chore.id,
    title: chore.title,
    points: Number(chore.points) || 0,
    sprite: taskSprite(chore),
  };
}

function paintStage() {
  const host = document.querySelector(".stage");
  if (!host || host.hidden) return;
  if (!db.session && route.name === "welcome") {
    setStageScene({
      parade: gateKids.map((child) => ({
        id: child.id,
        name: child.name,
        color: COLOR_HEX[child.color] || COLOR_HEX.leaf,
      })),
    });
    return;
  }
  const name = host.dataset.color || "leaf";
  const playing = new Set(playChores.map((chore) => chore.id));
  setStageScene({
    color: COLOR_HEX[name] || COLOR_HEX.leaf,
    waiting: battleLine.filter((chore) => !playing.has(chore.id)).map((chore) => ({ ...actor(chore), ready: Boolean(chore.approved) })),
    plays: playChores.map(actor),
    onDone: onFightDone,
  });
}

function applyBattleLine(line) {
  battleLine = line.filter((chore) => chore?.id && !finishedIds.has(chore.id));
  lineIds = battleLine.map((chore) => chore.id);
  playChores = splitBattleLine(battleLine).plays;
  const kidId = db.session?.role === "kid" ? db.session.id : "";
  if (kidId) saveTracked(kidId, playChores.length ? battleLine.slice(1) : battleLine);
  paintStage();
}

function resetBattleMemory() {
  clearInterval(pollTimer);
  pollTimer = 0;
  battleLine = [];
  playChores = [];
  finishedIds = new Set();
  lineIds = [];
  lastKidSig = "";
}

function onFightDone(id) {
  finishedIds.add(id);
  applyBattleLine(battleLine.filter((chore) => chore.id !== id));
}

function syncBattles() {
  if (db.session?.role !== "kid") return;
  const kidId = db.session.id;
  const submitted = (db.chores || []).filter((chore) => chore.status === "submitted").map(actor);
  applyBattleLine(mergeBattleLine({
    order: lineIds,
    stored: loadTracked(kidId).map(actor),
    memory: battleLine,
    submitted,
    finished: [...finishedIds],
  }));
}

function ensurePoll() {
  if (pollTimer || db.session?.role !== "kid") return;
  pollTimer = setInterval(async () => {
    if (busy || db.session?.role !== "kid") return;
    const ok = await loadKid();
    if (!ok || db.session?.role !== "kid") return;
    const sig = `${kid()?.points}|${(db.chores || []).map((chore) => chore.id + chore.status).join(",")}`;
    syncBattles();
    if (sig !== lastKidSig) {
      lastKidSig = sig;
      render();
    } else {
      paintStage();
    }
  }, 5000);
}

function hudStats(child) {
  return `<div class="hud-stats">
    <span class="stat coins"><i></i><b>${child.points}</b><small>coins</small></span>
    <span class="stat cash"><i></i><b>${money(child.cashCents)}</b><small>cash</small></span>
    <span class="stat time"><i></i><b>${child.minutes}</b><small>min</small></span>
  </div>`;
}

function celebrate() {
  const layer = document.createElement("div");
  layer.className = "fx";
  layer.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 16; i += 1) {
    const bit = document.createElement("span");
    bit.textContent = i % 3 === 0 ? "★" : "●";
    bit.style.left = `${8 + Math.random() * 84}%`;
    bit.style.animationDelay = `${Math.random() * 0.18}s`;
    bit.style.setProperty("--dx", `${-50 + Math.random() * 100}px`);
    layer.appendChild(bit);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 1100);
}

function shell(title, sub, body, nav) {
  const play = PLAY_ROUTES.has(route.name);
  const signedIn = Boolean(db.session);
  const child = play && db.session?.role === "kid" ? kid() : null;
  return `
    <header class="top${play ? " hud" : ""}">
      <button class="brand" data-action="home">
        ${child ? face(child.color) : mark()}
        <span><h1>${esc(title)}</h1><p>${esc(sub)}</p></span>
      </button>
      ${signedIn ? `<button class="btn ghost small" data-action="sign-out">${play ? "Exit" : "Sign out"}</button>` : ""}
    </header>
    ${child ? hudStats(child) : ""}
    ${play ? "" : nav || ""}
    ${notice ? `<div class="banner info toast">${esc(notice)}</div>` : ""}
    ${body}
    ${play ? nav || "" : ""}
    ${play ? "" : `<footer class="note">Saved in Supabase. Screen Time still gets set by a parent in Settings.</footer>`}`;
}

function parentNav(current) {
  const waiting = (db.chores || []).filter((chore) => chore.status === "submitted").length;
  return `<nav class="nav">${[
    ["family", "Family"],
    ["chores", "Tasks"],
    ["chart", waiting ? `Approve (${waiting})` : "Approve"],
    ["shop", "Shop"],
  ]
    .map(
      ([id, label]) =>
        `<button data-action="goto" data-to="${id}" ${current === id ? 'aria-current="page"' : ""}>${label}</button>`
    )
    .join("")}</nav>`;
}

function kidNav(current) {
  return `<nav class="nav play-nav">${[
    ["today", "Quests"],
    ["kid-shop", "Market"],
    ["me", "Player"],
  ]
    .map(
      ([id, label]) =>
        `<button data-action="goto" data-to="${id}" ${current === id ? 'aria-current="page"' : ""}>${label}</button>`
    )
    .join("")}</nav>`;
}

function balances(child) {
  return `<div class="balances">
    <div class="balance points"><span>Points</span><b>${child.points}</b></div>
    <div class="balance cash"><span>Cash</span><b>${money(child.cashCents)}</b></div>
    <div class="balance time"><span>Device</span><b>${child.minutes} min</b></div>
  </div>`;
}

function torontoToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto" }).format(new Date());
}

function dayLetter(iso) {
  const [year, month, day] = String(iso).slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", { weekday: "narrow", timeZone: "UTC" });
}

function ring(pct, color, value, label, hint) {
  const radius = 46;
  const turn = 2 * Math.PI * radius;
  const offset = turn * (1 - Math.max(0, Math.min(1, pct)));
  return `<div class="ring-card">
    <svg class="ring" viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="${radius}" class="ring-track"></circle>
      <circle cx="60" cy="60" r="${radius}" class="ring-value" stroke="${color}" stroke-dasharray="${turn.toFixed(2)}" stroke-dashoffset="${turn.toFixed(2)}" data-offset="${offset.toFixed(2)}"></circle>
    </svg>
    <div class="ring-copy"><b>${value}</b><span>${label}</span><small>${esc(hint)}</small></div>
  </div>`;
}

function kidCharts(child) {
  const perDollar = db.family.pointsPerDollar || 10;
  const perTime = db.family.pointsPer30 || 4;
  const dollarsReady = Math.floor(child.points / perDollar);
  const intoDollar = child.points % perDollar;
  const dollarFull = dollarsReady > 0 && intoDollar === 0;
  const dollarPct = child.points === 0 ? 0 : dollarFull ? 1 : intoDollar / perDollar;
  const dollarHint = child.points === 0 ? `Fill this to earn $1` : dollarFull ? `Ready to cash $${dollarsReady}` : `${perDollar - intoDollar} points until $1`;
  const packsReady = Math.floor(child.points / perTime);
  const intoTime = child.points % perTime;
  const timeFull = packsReady > 0 && intoTime === 0;
  const timePct = child.points === 0 ? 0 : timeFull ? 1 : intoTime / perTime;
  const timeHint = child.points === 0 ? `Fill this for 30 minutes` : timeFull ? `Ready for ${packsReady * 30} minutes` : `${perTime - intoTime} points until 30 minutes`;
  const dollars = Math.floor(child.cashCents / 100);
  const bills = Math.min(dollars, 8);
  const week = db.week.length ? db.week : [];
  const peak = Math.max(1, ...week.map((day) => Number(day.points) || 0));
  return `<section class="card stack power">
    <h2 class="page-title">Power</h2>
    <div class="rings">
      ${ring(dollarPct, "#e3a31a", child.points, "Points", dollarHint)}
      ${ring(timePct, "#3c7f92", `${child.minutes}`, "Minutes", timeHint)}
    </div>
    <div class="cash-card">
      <div><span>Cash</span><b>${money(child.cashCents)}</b></div>
      <div class="bills" aria-hidden="true">${bills ? Array.from({ length: bills }, () => `<i></i>`).join("") : `<i class="empty"></i>`}${dollars > bills ? `<span>+${dollars - bills}</span>` : ""}</div>
    </div>
    <div class="week" aria-label="Points earned this week">
      ${week
        .map((day) => {
          const height = Math.max(8, Math.round(((Number(day.points) || 0) / peak) * 88));
          const today = String(day.day).slice(0, 10) === torontoToday();
          return `<div class="week-col${today ? " today" : ""}"><i style="height:${height}px"></i><span>${esc(dayLetter(day.day))}</span></div>`;
        })
        .join("")}
    </div>
    <p class="hint">The bars are points a parent approved this week.</p>
  </section>`;
}

function isSpecial(chore) {
  return chore.special === true;
}

function questBlock(list, empty) {
  if (!list.length) return `<p class="muted">${empty}</p>`;
  return list
    .map(
      (chore) => `<div class="quest"><span class="quest-pay">+${Number(chore.points) || 0}</span><div><strong>${esc(chore.title)}</strong><div class="tiny muted">${payLabel(chore)}</div></div>${
        chore.status === "submitted" ? `<span class="chip">Waiting</span>` : `<button class="btn small leaf" data-action="done" data-id="${chore.id}">Done</button>`
      }</div>`
    )
    .join("");
}

function payLabel(chore) {
  const parts = [];
  if (chore.points) parts.push(`${chore.points} pts`);
  if (chore.cashCents) parts.push(money(chore.cashCents));
  if (chore.minutes) parts.push(`${chore.minutes} min`);
  return parts.join(" · ") || "No pay set";
}

function spriteButtons(current, action, id) {
  return `<div class="sprite-picks" role="group" aria-label="Monster">${SPRITES.map(
    (sprite) => `<button type="button" class="sprite-pick" data-action="${action}"${id ? ` data-id="${esc(id)}"` : ""} data-sprite="${sprite.id}" aria-pressed="${sprite.id === current ? "true" : "false"}" aria-label="${esc(sprite.name)}"><canvas data-sprite="${sprite.id}" width="16" height="16"></canvas></button>`
  ).join("")}</div>`;
}

function spriteLibrary() {
  return `<section class="card">
    <h2 class="page-title">Sprite library</h2>
    <p class="lede">Each task gets one monster. It waits on the trail when a kid taps Done, and the fight plays when you approve it.</p>
    <div class="sprite-library">
      ${SPRITES.map((sprite) => `<figure class="sprite-card"><canvas data-sprite="${sprite.id}" width="16" height="16" aria-hidden="true"></canvas><figcaption>${esc(sprite.name)}</figcaption></figure>`).join("")}
    </div>
  </section>`;
}

function render() {
  const view = views[route.name] || views.welcome;
  const play = PLAY_ROUTES.has(route.name);
  document.body.classList.toggle("play", play);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", play ? "#7eb8c9" : "#f3efe4");
  const host = document.querySelector(".stage");
  if (host) document.body.appendChild(host);
  app.innerHTML = view();
  mountStage();
  if (db.session?.role === "kid") {
    syncBattles();
    lastKidSig = `${kid()?.points}|${(db.chores || []).map((chore) => chore.id + chore.status).join(",")}`;
    ensurePoll();
  } else {
    paintStage();
  }
  paintSpriteIcons(app);
  requestAnimationFrame(() => {
    document.querySelectorAll(".ring-value").forEach((el) => {
      if (el.dataset.offset) el.setAttribute("stroke-dashoffset", el.dataset.offset);
    });
  });
}

const views = {
  loading() {
    return `<div class="card"><h1>Our chart</h1><p class="lede">Loading…</p></div>`;
  },

  welcome() {
    if (!schemaReady) {
      return `
        <header class="top"><div class="brand">${mark()}<span><h1>Our chart</h1><p>Gets the job done</p></span></div></header>
        <section class="hero">
          <h2>Chores, rewards, and device time.</h2>
          <p class="lede">Parents keep the accounts. Kids open the chart with a PIN.</p>
        </section>
        <div class="card stack">
          <h2 class="page-title">Supabase is connected</h2>
          <p>The family tables are not in the project yet, so accounts cannot be saved. Open the SQL editor for this project and run <strong>kids/schema.sql</strong>, then reload this page.</p>
          ${notice ? `<p class="error">${esc(notice)}</p>` : ""}
        </div>`;
    }
    return `
      <header class="top hud"><div class="brand">${mark()}<span><h1>Our chart</h1><p>Gets the job done</p></span></div></header>
      ${worldScene("sun")}
      <section class="hero">
        <h2>Who's here?</h2>
        <p class="lede">Tap your name and enter your PIN.</p>
      </section>
      ${roster()}`;
  },

  "parent-auth"() {
    return shell(
      "Our chart",
      "Parent sign in",
      `<form class="card stack" data-action="parent-auth-submit">
        <div class="section-title"><h2>Parent sign in</h2></div>
        <p class="lede">Use the email and password for this parent. A new parent is added from the Family page.</p>
        <label>Email<input name="email" type="email" autocomplete="username" required value="${esc(draft.email || route.email || "")}"></label>
        <label>Password<input name="password" type="password" autocomplete="current-password" required minlength="8"></label>
        ${route.error ? `<p class="error">${esc(route.error)}</p>` : ""}
        <button class="btn leaf wide" type="submit">Sign in</button>
        <button class="btn ghost wide" type="button" data-action="goto" data-to="welcome">Back</button>
      </form>`
    );
  },

  "kid-gate"() {
    const selected = route.kidId || "";
    const picked = kidById(selected);
    return shell(
      "Players",
      "Who's playing?",
      `<div class="stack">
        ${selected ? "" : worldScene(picked?.color || "leaf")}
        ${
          gateKids.length
            ? `<div class="kid-grid">${gateKids
                .map(
                  (child) => `<button class="kid-pick" data-action="pick-kid" data-id="${child.id}" aria-pressed="${selected === child.id}">
                    ${face(child.color)}
                    <strong>${esc(child.name)}</strong>
                  </button>`
                )
                .join("")}</div>`
            : `<p class="hint">A parent adds each kid on the Family page. Then the name shows up here.</p>`
        }
        ${
          selected
            ? `<div class="card pin-card">
                <h2 class="page-title">PIN for ${esc(picked?.name || "")}</h2>
                <div class="pin-dots">${[0, 1, 2, 3].map((i) => `<i class="${(draft.pin || "").length > i ? "on" : ""}"></i>`).join("")}</div>
                ${route.error ? `<p class="error">${esc(route.error)}</p>` : ""}
                <div class="pad">
                  ${["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "go"]
                    .map((key) => `<button type="button" data-action="pin" data-key="${key}">${key === "clear" ? "⌫" : key === "go" ? "Go" : key}</button>`)
                    .join("")}
                </div>
              </div>`
            : ""
        }
        <button class="btn ghost" data-action="goto" data-to="welcome">Back</button>
      </div>`
    );
  },

  family() {
    const me = parent();
    return shell(
      db.family.name,
      me?.name || "",
      `<div class="stack">
        <div class="split">
          <section class="card">
            <div class="section-title"><h2>Parents</h2><button class="btn small leaf" data-action="goto" data-to="add-parent">Add</button></div>
            ${me?.hasPin ? "" : `<p class="lede">Choose a 4-digit PIN on your name. That is how you open the chart from the front page.</p>`}
            ${db.parents
              .map(
                (person) => `<div class="person">
                  <div><strong>${esc(person.name)}</strong><div class="tiny muted">${esc(person.email)}${person.id === me?.id ? " · You" : ""}${person.hasPin ? "" : " · no door PIN"}</div></div>
                  <div class="row">
                    <button class="btn ghost small" data-action="edit-parent-pin" data-id="${person.id}">PIN</button>
                    ${person.id === me?.id ? "" : `<button class="btn ghost small" data-action="remove-parent" data-id="${person.id}">Remove</button>`}
                  </div>
                </div>`
              )
              .join("")}
          </section>
          <section class="card">
            <div class="section-title"><h2>Kids</h2><button class="btn small sun" data-action="goto" data-to="add-kid">Add</button></div>
            ${
              db.kids.length
                ? db.kids
                    .map(
                      (child) => `<div class="person">
                        <div class="who"><span class="swatch ${esc(child.color)}"></span><div><strong>${esc(child.name)}</strong><div class="tiny muted">${child.points} pts · ${money(child.cashCents)} · ${child.minutes} min${grounded(child) ? " · grounded" : ""}</div></div></div>
                        <button class="btn ghost small" data-action="edit-pin" data-id="${child.id}">PIN</button>
                      </div>`
                    )
                    .join("")
                : `<p class="muted">No kids yet. Add the first one.</p>`
            }
          </section>
        </div>
      </div>`,
      parentNav("family")
    );
  },

  "add-parent"() {
    return shell(
      db.family.name,
      "Add a parent",
      `<form class="card stack" data-action="add-parent-submit">
        <p class="lede">They tap their name on the front page and enter this PIN. Supabase still emails them to confirm the account.</p>
        <label>Name<input name="name" required value="${esc(draft.name || "")}"></label>
        <label>Email<input name="email" type="email" required value="${esc(draft.email || "")}"></label>
        <label>Password<input name="password" type="password" minlength="8" required autocomplete="new-password"></label>
        <label>4-digit PIN<input name="pin" inputmode="numeric" pattern="[0-9]{4}" minlength="4" maxlength="4" required value="${esc(draft.pin || "")}"></label>
        ${route.error ? `<p class="error">${esc(route.error)}</p>` : ""}
        <button class="btn leaf" type="submit">Save parent</button>
        <button class="btn ghost" type="button" data-action="goto" data-to="family">Cancel</button>
      </form>`,
      parentNav("family")
    );
  },

  "add-kid"() {
    const color = draft.color || COLORS[db.kids.length % COLORS.length];
    draft.color = color;
    return shell(
      db.family.name,
      "Add a kid",
      `<form class="card stack" data-action="add-kid-submit">
        <p class="lede">They tap their name on the front page and enter this PIN.</p>
        <label>Name<input name="name" required value="${esc(draft.name || "")}"></label>
        <div>
          <div class="field-label">Color</div>
          <div class="swatches">
            ${COLORS.map(
              (colorName) =>
                `<button type="button" class="swatch ${colorName}" data-action="color" data-color="${colorName}" aria-pressed="${color === colorName}" aria-label="${colorName}"></button>`
            ).join("")}
          </div>
        </div>
        <label>4-digit PIN<input name="pin" inputmode="numeric" pattern="[0-9]{4}" minlength="4" maxlength="4" required value="${esc(draft.pin || "")}"></label>
        ${route.error ? `<p class="error">${esc(route.error)}</p>` : ""}
        <button class="btn sun" type="submit">Save kid</button>
        <button class="btn ghost" type="button" data-action="goto" data-to="family">Cancel</button>
      </form>`,
      parentNav("family")
    );
  },

  "edit-parent-pin"() {
    const person = db.parents.find((parentRow) => parentRow.id === route.id);
    if (!person) return views.family();
    return shell(
      db.family.name,
      `PIN for ${person.name}`,
      `<form class="card stack" data-action="save-parent-pin">
        <p class="lede">${esc(person.name)} uses this 4-digit PIN on the front page.</p>
        <label>4-digit PIN<input name="pin" inputmode="numeric" pattern="[0-9]{4}" minlength="4" maxlength="4" required></label>
        ${route.error ? `<p class="error">${esc(route.error)}</p>` : ""}
        <div class="row">
          <button class="btn leaf" type="submit">Save PIN</button>
          <button class="btn ghost" type="button" data-action="goto" data-to="family">Cancel</button>
        </div>
      </form>`,
      parentNav("family")
    );
  },

  "edit-pin"() {
    const child = kidById(route.id);
    if (!child) return views.family();
    return shell(
      db.family.name,
      `PIN for ${child.name}`,
      `<form class="card stack" data-action="save-pin">
        <label>New 4-digit PIN<input name="pin" inputmode="numeric" pattern="[0-9]{4}" minlength="4" maxlength="4" required></label>
        ${route.error ? `<p class="error">${esc(route.error)}</p>` : ""}
        <div class="row">
          <button class="btn leaf" type="submit">Save PIN</button>
          <button class="btn clay" type="button" data-action="remove-kid" data-id="${child.id}">Remove ${esc(child.name)}</button>
          <button class="btn ghost" type="button" data-action="goto" data-to="family">Cancel</button>
        </div>
      </form>`,
      parentNav("family")
    );
  },

  chores() {
    const daily = db.templates.filter((chore) => chore.kind !== "special");
    const specials = db.templates.filter((chore) => chore.kind === "special");
    return shell(
      db.family.name,
      "Tasks",
      `<div class="stack">
        <p class="lede">Finished tasks are paid on the Approve page, after a kid taps Done.</p>
        ${spriteLibrary()}
        <section class="card">
          <h2 class="page-title">Daily tasks</h2>
          <p class="lede">Every kid can do these once a day. They come back tomorrow with the same points and the same monster.</p>
          ${
            daily.length
              ? daily
                  .map((chore) => {
                    const sprite = taskSprite(chore);
                    return `<form class="chore" data-action="save-daily">
                      <input type="hidden" name="id" value="${chore.id}">
                      <div><strong>${esc(chore.title)}</strong><div class="tiny muted">Once a day · ${esc(spriteName(sprite))}</div></div>
                      <label class="points-field">Points<input name="points" type="number" min="0" value="${Number(chore.points) || 0}"></label>
                      <button class="btn small leaf" type="submit">Save</button>
                      <button class="btn small ghost" type="button" data-action="remove-daily" data-id="${chore.id}">Remove</button>
                      ${spriteButtons(sprite, "sprite", chore.id)}
                    </form>`;
                  })
                  .join("")
              : `<p class="muted">No daily tasks yet.</p>`
          }
          <form class="two" data-action="add-daily" style="margin-top:12px">
            <label>Task<input name="title" required placeholder="Make the bed"></label>
            <label>Points<input name="points" type="number" min="0" value="2" required></label>
            <input type="hidden" name="sprite" value="dust">
            <div class="field-label">Monster</div>
            ${spriteButtons("dust", "pick-sprite")}
            <button class="btn leaf" type="submit">Add daily task</button>
          </form>
        </section>
        <section class="card">
          <h2 class="page-title">Special task board</h2>
          <p class="lede">Bonus chores for everybody, one time. They stay until a kid finishes them or you remove them.</p>
          ${
            specials.length
              ? specials
                  .map((chore) => {
                    const sprite = taskSprite(chore);
                    return `<div class="chore"><div><strong>${esc(chore.title)}</strong><div class="tiny muted">${Number(chore.points) || 0} pts · One time · ${esc(spriteName(sprite))}</div></div><button class="btn small ghost" type="button" data-action="remove-special" data-id="${chore.id}">Remove</button>${spriteButtons(sprite, "sprite", chore.id)}</div>`;
                  })
                  .join("")
              : `<p class="muted">No bonus tasks yet.</p>`
          }
          <form class="two" data-action="add-special" style="margin-top:12px">
            <label>Bonus task<input name="title" required placeholder="Wash the car"></label>
            <label>Points<input name="points" type="number" min="0" value="5" required></label>
            <input type="hidden" name="sprite" value="dust">
            <div class="field-label">Monster</div>
            ${spriteButtons("dust", "pick-sprite")}
            <button class="btn sun" type="submit">Add once</button>
          </form>
        </section>
        ${route.error ? `<p class="error">${esc(route.error)}</p>` : ""}
      </div>`,
      parentNav("chores")
    );
  },

  chart() {
    const waiting = db.chores.filter((chore) => chore.status === "submitted");
    return shell(
      db.family.name,
      "Approve",
      `<div class="stack">
        <section class="card">
          <h2 class="page-title">Waiting for approval</h2>
          <p class="lede">This is where finished chores get paid. A kid taps Done, then you tap Approve.</p>
          ${
            waiting.length
              ? waiting
                  .map((chore) => {
                    const child = kidById(chore.kidId);
                    return `<div class="chore waiting"><div><strong>${esc(chore.title)}</strong><div class="tiny muted">${esc(child?.name || "")} · ${isSpecial(chore) ? "Special" : "Daily"} · ${payLabel(chore)}</div></div><button class="btn small leaf" data-action="approve-chore" data-id="${chore.id}">Approve</button></div>`;
                  })
                  .join("")
              : `<p class="muted">Nothing is waiting. When a kid taps Done, it shows up here.</p>`
          }
        </section>
        ${
          db.kids.length
            ? db.kids
                .map((child) => {
                  const open = db.chores.filter((chore) => chore.kidId === child.id && chore.status !== "submitted");
                  return `<section class="card stack"><div class="who"><span class="swatch ${esc(child.color)}"></span><strong>${esc(child.name)}</strong></div>${balances(child)}${
                    grounded(child)
                      ? `<div class="banner">Grounded until ${esc(when(child.groundedUntil))}. Match that in Screen Time. <button class="btn small ghost" data-action="lift-one" data-id="${child.id}">Lift</button></div>`
                      : ""
                  }${
                    open.length
                      ? open
                          .map(
                            (chore) => `<div class="chore"><div><strong>${esc(chore.title)}</strong><div class="tiny muted">${isSpecial(chore) ? "Special" : "Daily"} · ${payLabel(chore)} · Still open</div></div></div>`
                          )
                          .join("")
                      : `<p class="muted">No open tasks.</p>`
                  }</section>`;
                })
                .join("")
            : `<div class="card">Add a kid on the Family page first.</div>`
        }
        ${db.templates.length ? "" : `<button class="btn leaf" data-action="goto" data-to="chores">Add tasks</button>`}
        <section class="card stack">
          <h2 class="page-title">Grant or ground</h2>
          <form class="stack" data-action="grant">
            <div class="two">
              <label>Kid<select name="kidId">${db.kids.map((child) => `<option value="${child.id}">${esc(child.name)}</option>`).join("")}</select></label>
              <label>Points<input name="points" type="number" min="0" value="0"></label>
              <label>Cash $<input name="dollars" type="number" min="0" step="0.01" value="0"></label>
              <label>Minutes<input name="minutes" type="number" min="0" value="0"></label>
            </div>
            <label>Note<input name="note" placeholder="Good report"></label>
            <button class="btn sun" ${db.kids.length ? "" : "disabled"}>Grant reward</button>
          </form>
          <h2 class="page-title">Spent or cashed in</h2>
          <p class="lede">Take coins off when they get spent. Take minutes off when you cash in screen time and add it in Screen Time. Take cash off when you pay it out.</p>
          <form class="stack" data-action="spend">
            <div class="two">
              <label>Kid<select name="kidId">${db.kids.map((child) => `<option value="${child.id}">${esc(child.name)}</option>`).join("")}</select></label>
              <label>Coins<input name="points" type="number" min="0" value="0"></label>
              <label>Cash $<input name="dollars" type="number" min="0" step="0.01" value="0"></label>
              <label>Minutes<input name="minutes" type="number" min="0" value="0"></label>
            </div>
            <label>Note<input name="note" placeholder="Ice cream, or screen time used"></label>
            <button class="btn clay" ${db.kids.length ? "" : "disabled"}>Take off</button>
          </form>
          <form class="stack" data-action="ground">
            <label>Kid<select name="kidId">${db.kids.map((child) => `<option value="${child.id}">${esc(child.name)}</option>`).join("")}</select></label>
            <label>Until<input name="until" type="datetime-local" required></label>
            <label>Reason<input name="reason" required placeholder="What happened"></label>
            <label class="row" style="font-weight:700"><input type="checkbox" name="clearMinutes" style="width:auto"> Clear device minutes</label>
            <button class="btn clay" ${db.kids.length ? "" : "disabled"}>Save grounding</button>
          </form>
          ${route.error ? `<p class="error">${esc(route.error)}</p>` : ""}
        </section>
      </div>`,
      parentNav("chart")
    );
  },

  shop() {
    const pending = db.requests.filter((req) => req.status === "pending");
    return shell(
      db.family.name,
      "Shop",
      `<div class="stack">
        <section class="card">
          <h2 class="page-title">Packs</h2>
          <p class="lede">Kids can cash points in right away. ${db.family.pointsPerDollar} points = $1. ${db.family.pointsPer30} points = 30 device minutes. After you add those minutes in Screen Time, take them off on Approve.</p>
          <form class="two" data-action="save-rates">
            <label>Points per $1<input name="pointsPerDollar" type="number" min="1" value="${db.family.pointsPerDollar}"></label>
            <label>Points per 30 min<input name="pointsPer30" type="number" min="1" value="${db.family.pointsPer30}"></label>
            <button class="btn ghost" type="submit">Save rates</button>
          </form>
        </section>
        <section class="card">
          <div class="section-title"><h2>Requests</h2></div>
          ${
            pending.length
              ? pending
                  .map((req) => {
                    const child = kidById(req.kidId);
                    const item = db.items.find((entry) => entry.id === req.itemId);
                    return `<div class="item"><div><strong>${esc(item?.name || "Item")}</strong><div class="tiny muted">${esc(child?.name || "")} · ${req.cost} pts on hold</div></div><span class="row"><button class="btn small leaf" data-action="fulfill" data-id="${req.id}">Got it</button><button class="btn small ghost" data-action="deny" data-id="${req.id}">Return points</button></span></div>`;
                  })
                  .join("")
              : `<p class="muted">No one is waiting on an item.</p>`
          }
        </section>
        <section class="card">
          <div class="section-title"><h2>Custom items</h2></div>
          ${db.items.map((item) => `<div class="item"><div><strong>${esc(item.name)}</strong><div class="tiny muted">${item.cost} points</div></div><button class="btn ghost small" data-action="remove-item" data-id="${item.id}">Remove</button></div>`).join("") || `<p class="muted">Add something they can ask for.</p>`}
          <form class="two" data-action="add-item" style="margin-top:12px">
            <label>Item<input name="name" required placeholder="Ice cream"></label>
            <label>Point cost<input name="cost" type="number" min="1" value="15" required></label>
            <button class="btn leaf" type="submit">Add item</button>
          </form>
        </section>
      </div>`,
      parentNav("shop")
    );
  },

  today() {
    const child = kid();
    const mine = db.chores.filter((chore) => chore.kidId === child.id && chore.status !== "approved");
    return shell(
      child.name,
      "Quest board",
      `<div class="stack">
        ${worldScene(child.color)}
        ${kidCharts(child)}
        ${grounded(child) ? `<div class="banner">Devices are grounded until ${esc(when(child.groundedUntil))}.</div>` : ""}
        <section class="card">
          <h2 class="page-title">Daily tasks</h2>
          ${questBlock(mine.filter((chore) => !isSpecial(chore)), "No daily tasks right now. They come back each day.")}
        </section>
        <section class="card">
          <h2 class="page-title">Special board</h2>
          ${questBlock(mine.filter((chore) => isSpecial(chore)), "No bonus tasks right now.")}
        </section>
      </div>`,
      kidNav("today")
    );
  },

  "kid-shop"() {
    const child = kid();
    return shell(
      "Market",
      child.name,
      `<div class="stack">
        ${worldScene(child.color)}
        <section class="card stack">
          <h2 class="page-title">Trade coins</h2>
          <p class="lede">${db.family.pointsPerDollar} coins become $1.00 in your cash.</p>
          <button class="btn leaf" data-action="cash-out" ${child.points >= db.family.pointsPerDollar ? "" : "disabled"}>Cash out ${db.family.pointsPerDollar} coins</button>
        </section>
        <section class="card stack">
          <h2 class="page-title">Screen time</h2>
          <p class="lede">${db.family.pointsPer30} coins become 30 minutes. A parent adds that time in Screen Time.</p>
          ${
            grounded(child)
              ? `<div class="banner">Device packs are closed while you are grounded.</div>`
              : `<button class="btn sun" data-action="buy-time" ${child.points >= db.family.pointsPer30 ? "" : "disabled"}>Buy 30 minutes</button>`
          }
        </section>
        <section class="card">
          <h2 class="page-title">Treasure</h2>
          ${
            db.items.length
              ? db.items
                  .map((item) => {
                    const held = db.requests.some((req) => req.itemId === item.id && req.status === "pending");
                    return `<div class="item loot"><div><strong>${esc(item.name)}</strong><div class="tiny muted">${item.cost} coins</div></div>${
                      held ? `<span class="chip">Asked</span>` : `<button class="btn small" data-action="ask" data-id="${item.id}" ${child.points >= item.cost ? "" : "disabled"}>Ask</button>`
                    }</div>`;
                  })
                  .join("")
              : `<p class="muted">No extra items yet.</p>`
          }
        </section>
      </div>`,
      kidNav("kid-shop")
    );
  },

  me() {
    const child = kid();
    return shell(
      child.name,
      "Player card",
      `<div class="stack">
        ${worldScene(child.color)}
        <section class="card">
          <h2 class="page-title">Log</h2>
          ${db.activity.map((row) => `<div class="item"><div>${esc(row.text)}</div></div>`).join("") || `<p class="muted">When you finish a quest, it shows up here.</p>`}
        </section>
      </div>`,
      kidNav("me")
    );
  },
};

app.addEventListener("input", (event) => {
  if (event.target.name) draft[event.target.name] = event.target.value;
  if (event.target.name !== "title") return;
  const form = event.target.closest("form");
  if (!form || form.dataset.spritePicked === "1") return;
  const sprite = guessSprite(event.target.value);
  const input = form.querySelector('input[name="sprite"]');
  if (input) input.value = sprite;
  form.querySelectorAll("[data-action='pick-sprite']").forEach((pick) => {
    pick.setAttribute("aria-pressed", pick.dataset.sprite === sprite ? "true" : "false");
  });
});

app.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-action]");
  if (!btn || btn.tagName === "FORM") return;
  const action = btn.dataset.action;
  if (action === "goto") go(btn.dataset.to);
  if (action === "home") go(db.session?.role === "kid" ? "today" : db.session ? "family" : "welcome");
  if (action === "auth-mode") go("parent-auth", { mode: btn.dataset.mode, email: draft.email || "" });
  if (action === "kids-door") openKidGate();
  if (action === "pick-player") {
    route = { name: "welcome", playerId: btn.dataset.id, playerKind: btn.dataset.kind, error: "" };
    draft = {};
    notice = "";
    render();
  }
  if (action === "edit-parent-pin") go("edit-parent-pin", { id: btn.dataset.id });
  if (action === "sign-out") signOut();
  if (action === "pick-kid") {
    route = { ...route, kidId: btn.dataset.id, error: "" };
    draft.pin = "";
    render();
  }
  if (action === "pin") onPin(btn.dataset.key);
  if (action === "color") {
    draft.color = btn.dataset.color;
    render();
  }
  if (action === "remove-parent") run(() => rpc("remove_parent", { p_parent: btn.dataset.id }), "Parent removed.", "family");
  if (action === "edit-pin") go("edit-pin", { id: btn.dataset.id });
  if (action === "remove-kid") run(() => rpc("remove_kid", { p_kid: btn.dataset.id }), "Kid removed.", "family");
  if (action === "approve-chore") run(() => rpc("approve_chore", { p_chore: btn.dataset.id }), "Approved. Add any new device minutes in Screen Time.");
  if (action === "lift-one") run(() => rpc("lift_grounding", { p_kid: btn.dataset.id }), "Grounding lifted here. Turn it off in Screen Time too.");
  if (action === "pick-sprite") {
    const form = btn.closest("form");
    const input = form?.querySelector('input[name="sprite"]');
    if (input) input.value = btn.dataset.sprite;
    form?.setAttribute("data-sprite-picked", "1");
    form?.querySelectorAll("[data-action='pick-sprite']").forEach((pick) => {
      pick.setAttribute("aria-pressed", pick === btn ? "true" : "false");
    });
  }
  if (action === "sprite") run(() => rpc("set_chore_sprite", { p_id: btn.dataset.id, p_sprite: btn.dataset.sprite }), "Monster saved for that task.", "chores");
  if (action === "done") {
    const chore = (db.chores || []).find((item) => item.id === btn.dataset.id);
    run(
      () => rpc("kid_mark_done", { p_token: sessionStorage.getItem(KID_TOKEN), p_chore: btn.dataset.id }),
      `Marked done. ${spriteName(taskSprite(chore))} is waiting until a parent approves it.`
    );
  }
  if (action === "cash-out") run(() => rpc("kid_cash_out", { p_token: sessionStorage.getItem(KID_TOKEN) }), "$1.00 added to your cash balance.");
  if (action === "buy-time") run(() => rpc("kid_buy_time", { p_token: sessionStorage.getItem(KID_TOKEN) }), "30 minutes added. A parent still turns that on in Screen Time.");
  if (action === "ask") run(() => rpc("kid_ask", { p_token: sessionStorage.getItem(KID_TOKEN), p_item: btn.dataset.id }), "Asked. A parent has the points until they say yes or hand them back.");
  if (action === "fulfill") run(() => rpc("fulfill_request", { p_request: btn.dataset.id }));
  if (action === "deny") run(() => rpc("deny_request", { p_request: btn.dataset.id }), "Points returned.");
  if (action === "remove-item") run(() => rpc("remove_item", { p_item: btn.dataset.id }));
  if (action === "remove-daily") run(() => rpc("remove_daily_chore", { p_id: btn.dataset.id }), "Daily task removed.", "chores");
  if (action === "remove-special") run(() => rpc("remove_special_chore", { p_id: btn.dataset.id }), "Bonus task removed.", "chores");
});

app.addEventListener("submit", (event) => {
  const form = event.target.closest("form[data-action]");
  if (!form) return;
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());
  const action = form.dataset.action;
  if (action === "parent-auth-submit") parentAuth(data);
  if (action === "add-parent-submit") addParent(data);
  if (action === "add-kid-submit") addKid(data);
  if (action === "save-pin") savePin(data);
  if (action === "save-parent-pin") saveParentPin(data);
  if (action === "add-daily") run(() => rpc("add_daily_chore", { p_title: data.title, p_points: Number(data.points) || 0, p_sprite: normalizeSprite(data.sprite || guessSprite(data.title)) }), "Added for every kid. It comes back each day.", "chores");
  if (action === "add-special") run(() => rpc("add_special_chore", { p_title: data.title, p_points: Number(data.points) || 0, p_sprite: normalizeSprite(data.sprite || guessSprite(data.title)) }), "Added once for every kid.", "chores");
  if (action === "save-daily") run(() => rpc("save_daily_chore", { p_id: data.id, p_points: Number(data.points) || 0 }), "Points updated for everybody.", "chores");
  if (action === "grant") {
    run(
      () =>
        rpc("grant_reward", {
          p_kid: data.kidId,
          p_points: Number(data.points) || 0,
          p_cash_cents: Math.round((Number(data.dollars) || 0) * 100),
          p_minutes: Number(data.minutes) || 0,
          p_note: data.note || "",
        }),
      "Reward saved. Match any new device minutes in Screen Time.",
      "chart"
    );
  }
  if (action === "spend") {
    run(
      () =>
        rpc("spend_balance", {
          p_kid: data.kidId,
          p_points: Number(data.points) || 0,
          p_cash_cents: Math.round((Number(data.dollars) || 0) * 100),
          p_minutes: Number(data.minutes) || 0,
          p_note: data.note || "",
        }),
      "Taken off their balance.",
      "chart"
    );
  }
  if (action === "ground") {
    run(
      () =>
        rpc("ground_kid", {
          p_kid: data.kidId,
          p_until: new Date(data.until).toISOString(),
          p_reason: data.reason,
          p_clear: Boolean(data.clearMinutes),
        }),
      "Grounding saved. Set the same end time in Screen Time.",
      "chart"
    );
  }
  if (action === "save-rates") run(() => rpc("save_rates", { p_per_dollar: Number(data.pointsPerDollar), p_per_30: Number(data.pointsPer30) }), "Rates saved.");
  if (action === "add-item") run(() => rpc("add_item", { p_name: data.name, p_cost: Number(data.cost) }), "Item added.");
});

async function parentAuth(data) {
  const email = data.email.trim().toLowerCase();
  if (busy) return;
  busy = true;
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password: data.password });
    if (error) throw error;
    const ok = await loadParent();
    if (!ok) throw new Error("This login is not on a family yet.");
    route = { name: "family" };
    notice = "";
    render();
  } catch (error) {
    route = { ...route, error: nice(error) };
    render();
  } finally {
    busy = false;
  }
}

async function addParent(data) {
  const email = data.email.trim().toLowerCase();
  const person = data.name.trim();
  if (!/^[0-9]{4}$/.test(data.pin || "")) {
    route = { ...route, error: "PIN must be 4 digits." };
    render();
    return;
  }
  if (busy) return;
  busy = true;
  try {
    await rpc("invite_parent", { p_email: email });
    const { data: created, error } = await sideAuth.auth.signUp({
      email,
      password: data.password,
      options: { data: { name: person } },
    });
    if (error) throw error;
    if (!created.user || created.user.identities?.length === 0) {
      throw new Error("That email already has an account.");
    }
    await loadParent();
    const createdParent = db.parents.find((row) => row.email.toLowerCase() === email);
    if (!createdParent) throw new Error("That parent did not join the family.");
    if (!/^[0-9]{4}$/.test(data.pin || "")) throw new Error("pin must be 4 digits");
    await rpc("set_parent_pin", { p_parent: createdParent.id, p_pin: data.pin });
    notice = `${person} can tap their name on the front page and enter that PIN.`;
    route = { name: "family" };
    draft = {};
    render();
  } catch (error) {
    route = { ...route, error: nice(error) };
    render();
  } finally {
    busy = false;
  }
}

async function addKid(data) {
  await run(
    () => rpc("add_kid", { p_name: data.name.trim(), p_color: draft.color || "leaf", p_pin: data.pin }),
    `${data.name.trim()} can tap their name on the front page and enter that PIN.`,
    "family"
  );
}

async function savePin(data) {
  await run(() => rpc("set_kid_pin", { p_kid: route.id, p_pin: data.pin }), "PIN updated.", "family");
}

async function saveParentPin(data) {
  await run(() => rpc("set_parent_pin", { p_parent: route.id, p_pin: data.pin }), "Door PIN saved.", "family");
}

async function parentPinSignIn(parentId, pin) {
  if (busy) return;
  busy = true;
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/parent-pin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ parent_id: parentId, pin }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.access_token) throw new Error(body.error || "wrong pin");
    const { error } = await supabase.auth.setSession({
      access_token: body.access_token,
      refresh_token: body.refresh_token,
    });
    if (error) throw error;
    const ok = await loadParent();
    if (!ok) throw new Error("This login is not on a family yet.");
    notice = "";
    route = { name: "family" };
    draft = {};
    render();
  } catch (error) {
    draft.pin = "";
    route.error = nice(error);
    render();
    document.querySelector(".pin-card")?.classList.add("shake");
  } finally {
    busy = false;
  }
}

async function openKidGate() {
  draft = {};
  gateKids = [];
  if (schemaReady) {
    const { data: rows, error } = await supabase.rpc("list_kids", { p_code: "" });
    if (!error) gateKids = rows || [];
  }
  route = { name: "kid-gate" };
  render();
}

async function onPin(key) {
  if (busy) return;
  draft.pin = draft.pin || "";
  if (key === "clear") {
    draft.pin = draft.pin.slice(0, -1);
    route.error = "";
    render();
    return;
  }
  if (key !== "go") {
    if (draft.pin.length >= 4) return;
    draft.pin += key;
    render();
  }
  if (draft.pin.length === 4) await submitPin();
  else if (key === "go") {
    route.error = "Enter all 4 digits.";
    render();
  }
}

async function submitPin() {
  if (busy || (draft.pin || "").length !== 4) return;
  if (route.playerKind === "parent") {
    await parentPinSignIn(route.playerId, draft.pin);
    return;
  }
  busy = true;
  const { data: token, error } = await supabase.rpc("kid_sign_in", { p_kid: route.playerId || route.kidId, p_pin: draft.pin });
  busy = false;
  if (error || !token) {
    draft.pin = "";
    route.error = "That PIN does not match.";
    render();
    document.querySelector(".pin-card")?.classList.add("shake");
    return;
  }
  sessionStorage.setItem(KID_TOKEN, token);
  await loadKid();
  notice = "";
  route = { name: "today" };
  render();
  celebrate();
}

async function signOut() {
  resetBattleMemory();
  sessionStorage.removeItem(KID_TOKEN);
  if (db.session?.role === "parent") await supabase.auth.signOut();
  db = blank();
  notice = "";
  await loadPlayers();
  go("welcome");
}

blockPinchZoom();
installPullToRefresh();
boot();

function blockPinchZoom() {
  const stop = (event) => event.preventDefault();
  document.addEventListener("gesturestart", stop, { passive: false, capture: true });
  document.addEventListener("gesturechange", stop, { passive: false, capture: true });
  document.addEventListener("touchmove", (event) => {
    if (event.touches.length > 1) event.preventDefault();
  }, { passive: false, capture: true });
  document.addEventListener("wheel", (event) => {
    if (event.ctrlKey) event.preventDefault();
  }, { passive: false, capture: true });
}

function installPullToRefresh() {
  const hint = document.createElement("div");
  hint.className = "pull-refresh";
  hint.hidden = true;
  hint.innerHTML = "<span>Pull to refresh</span>";
  document.body.appendChild(hint);
  const label = hint.querySelector("span");

  let startX = 0;
  let startY = 0;
  let tracking = false;
  let pulled = 0;

  const reset = () => {
    tracking = false;
    pulled = 0;
    hint.hidden = true;
    hint.classList.remove("ready");
    label.textContent = "Pull to refresh";
    document.body.style.removeProperty("--pull-space");
  };

  const typing = () => {
    const tag = document.activeElement?.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
  };

  document.addEventListener(
    "touchstart",
    (event) => {
      if (event.touches.length > 1) {
        reset();
        return;
      }
      if (event.touches.length !== 1 || window.scrollY > 2 || typing()) return;
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
      tracking = true;
      pulled = 0;
    },
    { passive: true }
  );

  document.addEventListener(
    "touchmove",
    (event) => {
      if (event.touches.length > 1) {
        reset();
        return;
      }
      if (!tracking) return;
      if (window.scrollY > 2) {
        reset();
        return;
      }
      const touch = event.touches[0];
      const dx = Math.abs(touch.clientX - startX);
      const dy = touch.clientY - startY;
      if (dy < 12 || dx > dy) return;
      event.preventDefault();
      pulled = Math.min(dy, 140);
      const space = Math.min(pulled, 76);
      hint.hidden = false;
      hint.style.setProperty("--pull", `${space}px`);
      document.body.style.setProperty("--pull-space", `${space}px`);
      const ready = pulled >= 72;
      hint.classList.toggle("ready", ready);
      label.textContent = ready ? "Let go to refresh" : "Pull to refresh";
    },
    { passive: false }
  );

  const finish = () => {
    if (!tracking) return;
    if (pulled >= 72 && window.scrollY <= 2) {
      hint.classList.add("ready");
      label.textContent = "Refreshing…";
      location.reload();
      return;
    }
    reset();
  };

  document.addEventListener("touchend", finish);
  document.addEventListener("touchcancel", reset);
}
