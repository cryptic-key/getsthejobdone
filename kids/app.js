import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config.js";
import { APP_VERSION } from "./version.js";
import { SPRITES, applySeasonTheme, guessSprite, mountQuestWalkers, normalizeSprite, paintHeroBadge, paintSpriteIcons, setStageScene, stageElement } from "./battle.js?v=11";
import { mergeBattleLine, splitBattleLine } from "./battle-line.js?v=11";
import { createChoreQuest } from "./chore-quest.js?v=11";

const COLORS = ["leaf", "sun", "sky", "clay", "plum", "teal", "rose", "cobalt", "coral", "indigo", "mustard", "mint"];
const COLOR_HEX = {
  leaf: "#2f7d5a",
  sun: "#e3a31a",
  sky: "#3c7f92",
  clay: "#a24b34",
  plum: "#6e6284",
  teal: "#2f6f6a",
  rose: "#d45d8c",
  cobalt: "#3b6fd9",
  coral: "#e06b5c",
  indigo: "#5a4fcf",
  mustard: "#c9a227",
  mint: "#3faf8c",
};
const PLAY_ROUTES = new Set(["welcome", "loading", "kid-gate", "today", "hero", "kid-shop", "me"]);
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
let libraryOpen = false;
let logKidFilter = "";
let logTypeFilter = "";

const LOG_TYPES = [
  ["approve", "Approved"],
  ["done", "Marked done"],
  ["reject", "Sent back"],
  ["undo", "Undo approval"],
  ["reward", "Reward"],
  ["deduct", "Deduct"],
  ["warn", "Warn"],
  ["ground", "Ground"],
  ["lift", "Lift"],
  ["shop", "Shop"],
  ["reset", "Reset"],
  ["family", "Family"],
  ["other", "Other"],
];

function activityType(text) {
  const t = String(text || "");
  if (/was paid for /.test(t)) return "approve";
  if (/ marked .+ done\./.test(t)) return "done";
  if (/was sent back on /.test(t)) return "reject";
  if (/^Approval undone/.test(t)) return "undo";
  if (/ got a reward/.test(t)) return "reward";
  if (/ is grounded until /.test(t)) return "ground";
  if (/ warned /.test(t)) return "warn";
  if (/ is free\. Three hearts/.test(t)) return "lift";
  if (/ was reset/.test(t)) return "reset";
  if (/ asked for | points went back to | bought 30 device| cashed .+ points for \$1/.test(t)) return "shop";
  if (/ got (?!a reward)/.test(t)) return "shop";
  if (/ spent | cashed in | had a balance taken off| was paid \$/.test(t)) return "deduct";
  if (/PIN|joined as a parent|was removed/.test(t)) return "family";
  return "other";
}

function activityTypeLabel(type) {
  return LOG_TYPES.find(([id]) => id === type)?.[1] || "Other";
}

function filteredActivity() {
  return (db.activity || []).filter((row) => {
    if (logKidFilter && row.kidId !== logKidFilter) return false;
    if (logTypeFilter && activityType(row.text) !== logTypeFilter) return false;
    return true;
  });
}

function blank() {
  return { family: null, parents: [], kids: [], chores: [], templates: [], sections: [], items: [], requests: [], activity: [], week: [], hero: null, session: null };
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
  if (/weapon locked/i.test(msg)) return "That weapon is still locked.";
  if (/pick a hero/i.test(msg)) return "Pick a hero from the choices.";
  if (/pick a color/i.test(msg)) return "Pick one of the colors under your hero.";
  if (/unknown weapon/i.test(msg)) return "That weapon is not in the armory.";
  if (/section name required/i.test(msg)) return "Give the section a name.";
  if (/use a time like/i.test(msg)) return "Use times like 07:00 and 09:00.";
  if (/section not found/i.test(msg)) return "That schedule section is gone. Refresh and try again.";
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
      route = { name: ok ? "chart" : "parent-auth", mode: "signin" };
      if (!ok) notice = "Sign in with a parent account on this family.";
    } else if (sessionStorage.getItem(KID_TOKEN)) {
      const ok = await loadKid();
      route = { name: ok ? "today" : "welcome" };
    } else {
      route = { name: "welcome" };
    }
    render();
  } catch (error) {
    notice = nice(error);
    route = { name: route.name || "welcome" };
    try {
      render();
    } catch (renderError) {
      notice = nice(renderError);
      app.innerHTML = `<div class="card stack"><h2 class="page-title">Something went wrong</h2><p class="error">${esc(notice)}</p><button class="btn leaf" type="button" onclick="location.reload()">Reload</button></div>`;
    }
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
    progressResetAt: row.progress_reset_at || null,
    hearts: Math.max(0, Math.min(3, Number(row.hearts ?? 3))),
    groundProgress: Math.max(0, Number(row.ground_progress) || 0),
    warnParent: row.warn_parent || "",
    warnSeq: Number(row.warn_seq) || 0,
    hero: row.hero || "knight",
    weapon: row.weapon || "broom",
  };
}

function afterReset(chore, child) {
  if (!child?.progressResetAt || chore.status !== "approved") return true;
  if (!chore.approved_at) return false;
  return new Date(chore.approved_at) > new Date(child.progressResetAt);
}

function heartMarks(count) {
  const n = Math.max(0, Math.min(3, Number(count) || 0));
  return `<span class="hearts" aria-label="${n} heart${n === 1 ? "" : "s"} left">${[0, 1, 2]
    .map((i) => `<i class="${i < n ? "on" : "off"}" aria-hidden="true"></i>`)
    .join("")}</span>`;
}

async function loadParent() {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return false;
  const { data: me, error } = await supabase
    .from("parents")
    .select("id,name,email,color,hero,weapon,household_id,households(name,code,points_per_dollar,points_per_30,unground_points)")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!me?.households) return false;
  await rpc("ensure_today");
  const day = torontoToday();
  const [parents, kids, chores, templates, sections, items, requests, activity, doorPins] = await Promise.all([
    supabase.from("parents").select("id,name,email,color,hero,weapon").order("created_at"),
    supabase.from("kids").select("id,name,color,points,cash_cents,minutes,grounded_until,progress_reset_at,hearts,ground_progress,warn_parent,warn_seq,hero,weapon").order("created_at"),
    supabase.from("chores").select("id,kid_id,title,points,cash_cents,minutes,status,chore_day,sprite,approved_at,verdict").or(`and(status.neq.approved,or(chore_day.is.null,chore_day.eq.${day})),and(status.eq.approved,approved_at.gte."${torontoMidnightIso()}")`).order("created_at"),
    supabase.from("chore_templates").select("id,title,points,kind,sprite,active,assignee_id,section_id,sort_order").order("sort_order").order("created_at"),
    supabase.from("chore_sections").select("id,title,start_minute,end_minute,sort_order").order("sort_order").order("created_at"),
    supabase.from("shop_items").select("id,name,cost").order("created_at"),
    supabase.from("requests").select("id,kid_id,item_id,cost,status").eq("status", "pending"),
    supabase.from("activity").select("id,kid_id,body,created_at").order("created_at", { ascending: false }).limit(200),
    supabase.rpc("door_ready"),
  ]);
  for (const result of [parents, kids, chores, templates, sections, items, requests, activity]) {
    if (result.error) throw result.error;
  }
  const readyPins = new Set((doorPins.data || []).map((row) => row.parent_id));
  db = {
    family: {
      name: me.households.name,
      code: me.households.code,
      pointsPerDollar: me.households.points_per_dollar,
      pointsPer30: me.households.points_per_30,
      ungroundPoints: Number(me.households.unground_points) || 0,
    },
    parents: parents.data.map((person) => ({
      ...person,
      color: COLORS.includes(person.color) ? person.color : "teal",
      hero: parentLook(person.hero, person.name),
      weapon: person.weapon || "broom",
      hasPin: readyPins.has(person.id),
    })),
    kids: kids.data.map(mapKid),
    chores: chores.data.map((chore) => ({
      ...chore,
      kidId: chore.kid_id,
      cashCents: chore.cash_cents,
      special: chore.chore_day == null,
    })),
    templates: (templates.data || []).map((row) => ({
      ...row,
      assigneeId: row.assignee_id,
      sectionId: row.section_id || null,
      sortOrder: Number(row.sort_order) || 0,
      active: row.active !== false,
    })),
    sections: (sections.data || []).map((row) => ({
      id: row.id,
      title: row.title,
      startMinute: Number(row.start_minute) || 0,
      endMinute: Number(row.end_minute) || 0,
      sortOrder: Number(row.sort_order) || 0,
    })),
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
      ungroundPoints: Number(snap.family.unground_points) || 0,
    },
    parents: [],
    kids: [mapKid(snap.kid)],
    chores: snap.chores.map((chore) => ({
      ...chore,
      kidId: snap.kid.id,
      cashCents: chore.cash_cents,
      special: Boolean(chore.special),
      sectionId: chore.section_id || null,
      sectionTitle: chore.section_title || "",
      sectionStart: chore.section_start,
      sectionEnd: chore.section_end,
      sortOrder: Number(chore.sort_order) || 0,
    })),
    items: snap.items,
    requests: snap.requests.map((req) => ({ ...req, kidId: snap.kid.id, itemId: req.item_id })),
    activity: snap.activity.map((row) => ({ id: row.id, text: row.body, at: row.created_at })),
    templates: [],
    sections: (snap.sections || []).map((row) => ({
      id: row.id,
      title: row.title,
      startMinute: Number(row.start_minute) || 0,
      endMinute: Number(row.end_minute) || 0,
      open: row.open !== false,
      sortOrder: Number(row.sort_order) || 0,
    })),
    week: snap.week || [],
    hero: await loadHeroBoard(token),
    session: { role: "kid", id: snap.kid.id },
  };
  return true;
}

async function loadHeroBoard(token) {
  await supabase.rpc("kid_sync_rewards", { p_token: token });
  const board = await supabase.rpc("kid_hero_board", { p_token: token });
  if (board.error) return null;
  return board.data;
}

async function run(work, message, next) {
  if (busy) return;
  busy = true;
  try {
    await work();
    if (db.session?.role === "kid") await loadKid();
    else if (db.session?.role === "parent") await loadParent();
    notice = typeof message === "function" ? message() || "" : message || "";
    if (next) route = { name: next };
    else route = { ...route, error: "" };
    draft = {};
    render();
    if (db.session?.role === "kid" && notice && !/marked done/i.test(notice)) celebrate();
  } catch (error) {
    route = { ...route, error: nice(error) };
    render();
  } finally {
    busy = false;
  }
}

function mark() {
  return `<img class="mark" src="icon.svg" width="48" height="48" alt="" decoding="async">`;
}

const BRAND_TITLE = "Family Adventure Tasks";
const BRAND_TAGLINE = "Work together to defeat the task monsters";

function face(color) {
  const fill = COLOR_HEX[color] || COLOR_HEX.leaf;
  return `<svg class="face" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="34" r="26" fill="${fill}"/><circle cx="22" cy="30" r="4" fill="#fff"/><circle cx="42" cy="30" r="4" fill="#fff"/><circle cx="23" cy="31" r="2" fill="#24312c"/><circle cx="43" cy="31" r="2" fill="#24312c"/><path d="M22 42 Q32 50 42 42" fill="none" stroke="#24312c" stroke-width="3" stroke-linecap="round"/></svg>`;
}

const PARENT_HEROES = {
  knight: { name: "Adventurer" },
  princess: { name: "Princess" },
  king: { name: "King" },
  queen: { name: "Queen" },
};

function parentHeroFallback(name) {
  const key = String(name || "").trim().toLowerCase();
  if (key === "alex") return "king";
  if (key === "jackie") return "queen";
  return "knight";
}

function parentHero(name) {
  return parentHeroFallback(name);
}

function parentLook(hero, name) {
  return PARENT_HEROES[hero] ? hero : parentHero(name);
}

function kidHero(hero) {
  return hero === "princess" ? "princess" : "knight";
}

function doorPeople() {
  return [
    ...gateKids.map((child) => ({ id: child.id, name: child.name, color: child.color, kind: "kid", hasPin: true, hero: kidHero(child.hero), weapon: child.weapon || "broom" })),
    ...gateParents.map((person) => ({
      id: person.id,
      name: person.name,
      color: person.color || "teal",
      kind: "parent",
      hasPin: person.hasPin,
      hero: parentLook(person.hero, person.name),
      weapon: person.weapon || "broom",
    })),
  ];
}

function heldWeapon(key) {
  const quest = questCatalog();
  const chosen = quest.weapons[key] ? key : "broom";
  return { key: chosen, ...quest.weaponSprite(chosen) };
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
    <button class="btn ghost wide" type="button" data-action="close-pin">Back</button>
  </div>`;
}

function pinDialog(inner) {
  return `<dialog class="pin-dialog">${inner}</dialog>`;
}

function roster() {
  const people = doorPeople();
  const selected = people.find((person) => person.id === route.playerId);
  const pad = !selected
    ? ""
    : pinDialog(selected.kind === "parent" && !selected.hasPin
      ? `<form class="card stack" data-action="parent-auth-submit">
          <h2 class="page-title">${esc(selected.name)}</h2>
          <p class="lede">This parent does not have a door PIN yet. Sign in once, then set one on the Family page.</p>
          <label>Email<input name="email" type="email" autocomplete="username" required value="${esc(draft.email || "")}"></label>
          <label>Password<input name="password" type="password" autocomplete="current-password" required minlength="8"></label>
          ${route.error ? `<p class="error">${esc(route.error)}</p>` : ""}
          <button class="btn leaf" type="submit">Sign in</button>
          <button class="btn ghost wide" type="button" data-action="close-pin">Back</button>
        </form>`
      : pinPad(`PIN for ${esc(selected.name)}`));
  return `<div class="stack">
    <div class="roster">${people
      .map(
        (person) => `<button class="kid-pick" data-action="pick-player" data-id="${person.id}" data-kind="${person.kind}" aria-pressed="${selected?.id === person.id}">
          <canvas class="hero-icon" data-look="${esc(person.hero)}" data-weapon="${esc(person.weapon)}" data-color="${esc(COLOR_HEX[person.color] || COLOR_HEX.leaf)}" width="40" height="34" aria-hidden="true"></canvas>
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
      color: COLORS.includes(row.color) ? row.color : "teal",
      hero: parentLook(row.hero, row.name),
      weapon: row.weapon || "broom",
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

const CAGE_SEEN = "chart-cage-seen";
const CAGE_HELD = "chart-cage-held";
const WARN_SEEN = "chart-warn-seen";
const PARENT_WARN_SEEN = "chart-parent-warn-seen";
const PARENT_WARN_PENDING = "chart-parent-warn-pending";

function pendingWarn(child) {
  if (!child?.warnParent || !child.warnSeq) return null;
  const key = `${child.warnSeq}:${child.warnParent}`;
  if (sessionStorage.getItem(WARN_SEEN) === key) return null;
  const parent = (db.parents || []).find((person) => person.name === child.warnParent);
  return {
    parent: child.warnParent,
    hero: parent ? parentLook(parent.hero, parent.name) : parentHeroFallback(child.warnParent),
    color: COLOR_HEX[parent?.color] || COLOR_HEX.teal,
    hearts: child.hearts,
    seq: child.warnSeq,
    locked: grounded(child),
    lockKey: grounded(child) ? String(child.groundedUntil || child.id) : "",
  };
}

function readParentWarnPending() {
  try {
    const raw = sessionStorage.getItem(PARENT_WARN_PENDING);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.kidId || !data?.seq) return null;
    const key = `${data.seq}:${data.kidId}`;
    if (sessionStorage.getItem(PARENT_WARN_SEEN) === key) {
      sessionStorage.removeItem(PARENT_WARN_PENDING);
      return null;
    }
    return data;
  } catch {
    sessionStorage.removeItem(PARENT_WARN_PENDING);
    return null;
  }
}

function queueParentWarn(kidId, result) {
  const me = parent();
  const child = kidById(kidId);
  const seq = Number(result?.warn_seq) || Number(child?.warnSeq) || Date.now();
  const payload = {
    kidId,
    seq,
    hearts: Number(result?.hearts ?? child?.hearts ?? 0),
    locked: Boolean(result?.locked) || grounded({ ...child, groundedUntil: result?.grounded_until || child?.groundedUntil }),
    parent: result?.parent || me?.name || "Parent",
    lockKey: String(result?.grounded_until || child?.groundedUntil || kidId),
  };
  sessionStorage.setItem(PARENT_WARN_PENDING, JSON.stringify(payload));
  if (child) {
    child.warnParent = payload.parent;
    child.warnSeq = payload.seq;
    child.hearts = payload.hearts;
    if (payload.locked && result?.grounded_until) child.groundedUntil = result.grounded_until;
  }
  return payload;
}

function pendingParentWarn() {
  const me = parent();
  if (!me?.name) return null;
  const queued = readParentWarnPending();
  const child = queued ? kidById(queued.kidId) : null;
  if (queued && child) {
    return {
      view: "parent",
      parent: queued.parent || me.name,
      hero: parentLook(me.hero, me.name),
      color: COLOR_HEX[me.color] || COLOR_HEX.teal,
      weapon: heldWeapon(me.weapon || "broom"),
      hearts: queued.hearts,
      seq: queued.seq,
      locked: queued.locked,
      lockKey: queued.locked ? queued.lockKey : "",
      kidId: child.id,
      kidName: child.name,
    };
  }
  const kids = (db.kids || [])
    .filter((row) => row.warnParent === me.name && row.warnSeq)
    .sort((a, b) => (b.warnSeq || 0) - (a.warnSeq || 0));
  const next = kids[0];
  if (!next) return null;
  const key = `${next.warnSeq}:${next.id}`;
  if (sessionStorage.getItem(PARENT_WARN_SEEN) === key) return null;
  return {
    view: "parent",
    parent: me.name,
    hero: parentLook(me.hero, me.name),
    color: COLOR_HEX[me.color] || COLOR_HEX.teal,
    weapon: heldWeapon(me.weapon || "broom"),
    hearts: next.hearts,
    seq: next.warnSeq,
    locked: grounded(next),
    lockKey: grounded(next) ? String(next.groundedUntil || next.id) : "",
    kidId: next.id,
    kidName: next.name,
  };
}

function kidStageGear(child) {
  if (!child) return null;
  const quest = questCatalog();
  const weaponKey = quest.weapons[child.weapon] ? child.weapon : "broom";
  return { weapon: quest.weaponSprite(weaponKey) };
}

function parentGuardian() {
  const me = parent();
  return {
    name: me?.name || "Parent",
    hero: parentLook(me?.hero, me?.name),
    color: COLOR_HEX[me?.color] || COLOR_HEX.teal,
    weapon: heldWeapon(me?.weapon || "broom"),
  };
}

function paintStage() {
  const host = document.querySelector(".stage");
  if (!host || host.hidden) return;
  if (db.session?.role === "parent" && route.name === "chart") {
    const guardian = parentGuardian();
    const parentWarn = pendingParentWarn();
    if (parentWarn) {
      const child = kidById(parentWarn.kidId);
      setStageScene({
        color: COLOR_HEX[child?.color || host.dataset.color] || COLOR_HEX.leaf,
        hero: kidHero(child?.hero),
        waiting: [],
        plays: [],
        onDone: onFightDone,
        gear: kidStageGear(child),
        hearts: Math.min(3, (child?.hearts ?? 0) + 1),
        guardian,
        warn: parentWarn,
        onWarn: (info) => {
          const key = `${info?.seq || parentWarn.seq}:${info?.kidId || parentWarn.kidId}`;
          sessionStorage.setItem(PARENT_WARN_SEEN, key);
          sessionStorage.removeItem(PARENT_WARN_PENDING);
          paintStage();
        },
        onLockup: (mode) => {
          if (mode === "held" && parentWarn.lockKey) sessionStorage.setItem(CAGE_SEEN, parentWarn.lockKey);
        },
      });
      return;
    }
    const seen = seenFlee();
    const fleeing = (db.chores || []).filter((chore) => chore.verdict === "flee" && !seen.has(chore.id) && !finishedIds.has(chore.id));
    if (fleeing.length) {
      const child = kidById(fleeing[0].kidId);
      setStageScene({
        color: COLOR_HEX[child?.color || host.dataset.color] || COLOR_HEX.leaf,
        hero: kidHero(child?.hero),
        waiting: [],
        plays: fleeing.map((chore) => ({ ...actor(chore), flee: true, approved: true })),
        onDone: onFightDone,
        gear: kidStageGear(child),
        hearts: child?.hearts ?? 3,
        guardian,
      });
      return;
    }
    const waiting = (db.chores || []).filter((chore) => chore.status === "submitted");
    const chore = waiting[0];
    if (chore) {
      const child = kidById(chore.kidId);
      const review = {
        ...actor(chore),
        kidName: child?.name || "Hero",
        hero: kidHero(child?.hero),
        parentName: guardian.name,
        parentHero: guardian.hero,
        parentColor: guardian.color,
        parentWeapon: guardian.weapon,
      };
      setStageScene({
        color: COLOR_HEX[child?.color || host.dataset.color] || COLOR_HEX.leaf,
        hero: kidHero(child?.hero),
        waiting: [],
        plays: [],
        onDone: onFightDone,
        gear: kidStageGear(child),
        hearts: child?.hearts ?? 3,
        guardian,
        review,
        onReviewApprove: (id) => {
          run(() => rpc("approve_chore", { p_chore: id }), "Approved. Add any new device minutes in Screen Time.");
        },
        onReviewDecline: (id) => {
          markFleeSeen(id);
          run(() => rpc("reject_chore", { p_chore: id }), "Sent back. The hero gets knocked down and the monster runs off.", "chart");
        },
      });
      return;
    }
    setStageScene({
      color: guardian.color,
      hero: "",
      waiting: [],
      plays: [],
      gear: null,
      hearts: null,
      guardian,
    });
    return;
  }
  if (!db.session && route.name === "welcome") {
    setStageScene({
      parade: doorPeople().map((person) => ({
        id: person.id,
        name: person.name,
        hero: person.hero,
        color: COLOR_HEX[person.color] || COLOR_HEX.leaf,
        weaponKey: person.weapon,
        weapon: heldWeapon(person.weapon),
      })),
      hearts: 3,
    });
    return;
  }
  const name = host.dataset.color || "leaf";
  const child = db.session?.role === "kid" ? kid() : null;
  const heroKey = child ? kidHero(db.hero?.hero) : "";
  const warn = child ? pendingWarn(child) : null;
  const locked = child && grounded(child) && !warn;
  const lockKey = child && grounded(child) ? String(child.groundedUntil || child.id) : "";
  let lockup = null;
  if (locked) {
    lockup = sessionStorage.getItem(CAGE_SEEN) === lockKey ? "held" : "arrive";
    sessionStorage.setItem(CAGE_HELD, lockKey);
  } else if (!warn && sessionStorage.getItem(CAGE_HELD)) {
    lockup = "free";
  }
  const playing = new Set(playChores.map((chore) => chore.id));
  const shownHearts = warn ? Math.min(3, (child?.hearts ?? 0) + 1) : child?.hearts ?? 3;
  setStageScene({
    color: COLOR_HEX[name] || COLOR_HEX.leaf,
    hero: heroKey,
    waiting: locked || warn ? [] : battleLine.filter((chore) => !playing.has(chore.id)).map((chore) => ({ ...actor(chore), ready: Boolean(chore.approved) })),
    plays: locked || warn
      ? []
      : playChores.map((chore) => ({
          ...actor(chore),
          flee: Boolean(chore.flee),
          approved: Boolean(chore.approved),
        })),
    onDone: onFightDone,
    gear: heroGear(),
    hearts: shownHearts,
    lockup,
    lockKey,
    warn,
    onWarn: (info) => {
      const key = `${info?.seq || child?.warnSeq || ""}:${info?.parent || child?.warnParent || ""}`;
      sessionStorage.setItem(WARN_SEEN, key);
      if (child) {
        child.warnParent = "";
        supabase.rpc("kid_ack_warn", { p_token: sessionStorage.getItem(KID_TOKEN), p_seq: info?.seq || child.warnSeq });
      }
      paintStage();
    },
    onLockup: (mode) => {
      if (mode === "held") sessionStorage.setItem(CAGE_SEEN, lockKey);
      if (mode === "free") {
        sessionStorage.removeItem(CAGE_HELD);
        sessionStorage.removeItem(CAGE_SEEN);
      }
    },
  });
}

let questEngine = null;
function questCatalog() {
  if (!questEngine) {
    const canvas = document.createElement("canvas");
    questEngine = createChoreQuest(canvas, {});
    questEngine.destroy();
  }
  return questEngine;
}

function heroGear() {
  if (db.session?.role !== "kid" || !db.hero) return null;
  const quest = questCatalog();
  const weaponKey = quest.weapons[db.hero.weapon] ? db.hero.weapon : "broom";
  return { weapon: quest.weaponSprite(weaponKey) };
}

function heroColorName() {
  if (db.session?.role === "parent") {
    const me = parent();
    return COLORS.includes(me?.color) ? me.color : "teal";
  }
  const child = kid();
  return COLORS.includes(child?.color) ? child.color : "leaf";
}

function heroStats() {
  const stats = db.hero?.stats || {};
  return {
    battles: Number(stats.battles) || 0,
    coins: Number(stats.coins) || 0,
    earlyBird: Number(stats.earlyBird) || 0,
    streak: Number(stats.streak) || 0,
    bestStreak: Number(stats.bestStreak) || 0,
    chores: stats.chores || {},
  };
}

function meter(value, goal) {
  const safeGoal = Math.max(1, Number(goal) || 1);
  const safeValue = Math.max(0, Math.min(safeGoal, Number(value) || 0));
  const pct = Math.round((safeValue / safeGoal) * 100);
  return `<div class="meter" role="progressbar" aria-valuenow="${safeValue}" aria-valuemin="0" aria-valuemax="${safeGoal}" aria-valuetext="${safeValue} of ${safeGoal}"><span style="width:${pct}%"></span></div><small class="meter-count">${safeValue} / ${safeGoal}</small>`;
}

function colorSwatches(selected) {
  return COLORS.map(
    (name) =>
      `<button type="button" class="swatch ${esc(name)}" data-action="set-color" data-color="${esc(name)}" aria-pressed="${selected === name ? "true" : "false"}" aria-label="${esc(name)}"></button>`
  ).join("");
}

function heroBoard() {
  const quest = questCatalog();
  const stats = heroStats();
  const heroKey = quest.heroes[db.hero?.hero] ? db.hero.hero : "knight";
  const weaponKey = quest.weapons[db.hero?.weapon] ? db.hero.weapon : "broom";
  const achievementProgress = quest.achievementProgress(stats);
  const heroes = Object.entries(quest.heroes).map(([key, hero]) => `
    <button type="button" class="hero-pick" data-action="set-hero" data-hero="${esc(key)}" aria-pressed="${key === heroKey ? "true" : "false"}">
      <canvas data-quest-hero="${esc(key)}" width="14" height="16" aria-hidden="true"></canvas>
      <span>${esc(hero.name)}</span>
    </button>`).join("");
  const weapons = Object.entries(quest.weapons).map(([key, weapon]) => {
    const progress = quest.weaponProgress(key, stats);
    const open = quest.weaponUnlocked(key, stats);
    const equipped = key === weaponKey;
    return `<article class="armory-card${open ? " open" : " locked"}${equipped ? " equipped" : ""}">
      <canvas data-quest-weapon="${esc(key)}" width="16" height="8" aria-hidden="true"></canvas>
      <div>
        <strong>${esc(weapon.name)}</strong>
        <p class="tiny muted">${esc(weapon.unlock)}</p>
        ${open ? (equipped ? `<span class="chip">Equipped</span>` : `<button class="btn small leaf" type="button" data-action="set-weapon" data-weapon="${esc(key)}">Equip</button>`) : meter(progress.value, progress.goal)}
      </div>
    </article>`;
  }).join("");
  const medals = quest.achievements.map((medal) => {
    const progress = achievementProgress[medal.key] || { value: 0, goal: medal.goal, done: false };
    return `<article class="medal${progress.done ? " done" : ""}">
      <canvas data-quest-badge="${esc(medal.key)}" width="12" height="15" aria-hidden="true"></canvas>
      <div>
        <strong>${esc(medal.name)}</strong>
        <p class="tiny muted">${esc(medal.desc)} · ${esc(medal.tier)}</p>
        ${meter(progress.value, progress.goal)}
      </div>
    </article>`;
  }).join("");
  const monsters = SPRITES.map((sprite) => {
    const count = Number(stats.chores?.[sprite.id]) || 0;
    const info = quest.monsters[sprite.id];
    return `<figure class="monster-count${count ? " beaten" : ""}">
      <canvas data-sprite="${esc(sprite.id)}" width="16" height="16" aria-hidden="true"></canvas>
      <figcaption><strong>${esc(info?.name || sprite.name)}</strong><small>${count}</small></figcaption>
    </figure>`;
  }).join("");
  const color = heroColorName();
  return `<section class="card stack">
      <h2 class="page-title">Choose your hero</h2>
      <div class="hero-picks">${heroes}</div>
      <div>
        <div class="field-label">Color</div>
        <div class="swatches hero-swatches">${colorSwatches(color)}</div>
      </div>
      <p class="hint">${stats.battles} quests finished · ${stats.streak}-day streak</p>
    </section>
    <section class="card stack">
      <h2 class="page-title">Weapons</h2>
      <p class="lede">Unlocked weapons stay in color. Locked ones show how close you are.</p>
      <div class="armory">${weapons}</div>
    </section>
    <section class="card stack">
      <h2 class="page-title">Achievements</h2>
      <div class="medal-list">${medals}</div>
    </section>
    <section class="card stack">
      <h2 class="page-title">Monsters defeated</h2>
      <div class="monster-log">${monsters}</div>
    </section>
    ${route.error ? `<p class="error">${esc(route.error)}</p>` : ""}`;
}

function parentHeroBoard() {
  const quest = questCatalog();
  const me = parent();
  const heroKey = parentLook(me?.hero, me?.name);
  const weaponKey = quest.weapons[me?.weapon] ? me.weapon : "broom";
  const color = heroColorName();
  const heroes = Object.entries(PARENT_HEROES)
    .map(
      ([key, hero]) => `<button type="button" class="hero-pick" data-action="set-hero" data-hero="${esc(key)}" aria-pressed="${key === heroKey ? "true" : "false"}">
      <canvas data-quest-hero="${esc(key)}" width="14" height="16" aria-hidden="true"></canvas>
      <span>${esc(hero.name)}</span>
    </button>`
    )
    .join("");
  const weapons = Object.entries(quest.weapons)
    .map(([key, weapon]) => {
      const equipped = key === weaponKey;
      return `<article class="armory-card open${equipped ? " equipped" : ""}">
      <canvas data-quest-weapon="${esc(key)}" width="16" height="8" aria-hidden="true"></canvas>
      <div>
        <strong>${esc(weapon.name)}</strong>
        <p class="tiny muted">${esc(weapon.perk || "Ready for the door parade.")}</p>
        ${equipped ? `<span class="chip">Equipped</span>` : `<button class="btn small leaf" type="button" data-action="set-weapon" data-weapon="${esc(key)}">Equip</button>`}
      </div>
    </article>`;
    })
    .join("");
  return `<section class="card stack">
      <h2 class="page-title">Choose your hero</h2>
      <p class="lede">This look shows on the front door and the trail parade.</p>
      <div class="hero-picks parent-hero-picks">${heroes}</div>
      <div>
        <div class="field-label">Color</div>
        <div class="swatches hero-swatches">${colorSwatches(color)}</div>
      </div>
    </section>
    <section class="card stack">
      <h2 class="page-title">Weapons</h2>
      <p class="lede">Parents keep the whole armory unlocked.</p>
      <div class="armory">${weapons}</div>
    </section>
    ${route.error ? `<p class="error">${esc(route.error)}</p>` : ""}`;
}

function paintQuestArt(root) {
  if (!root.querySelector("[data-quest-hero], [data-quest-weapon], [data-quest-badge]")) return;
  const quest = questCatalog();
  const swap = (slot, art) => {
    if (!art) return;
    art.className = slot.className;
    art.setAttribute("aria-hidden", "true");
    slot.replaceWith(art);
  };
  const tint = COLOR_HEX[heroColorName()] || COLOR_HEX.leaf;
  root.querySelectorAll("canvas[data-quest-hero]").forEach((slot) => {
    paintHeroBadge(slot, slot.dataset.questHero, null, tint);
    slot.style.width = "42px";
    slot.style.height = "auto";
  });
  root.querySelectorAll("canvas[data-quest-weapon]").forEach((slot) => swap(slot, quest.weaponIcon(slot.dataset.questWeapon, 3)));
  root.querySelectorAll("canvas[data-quest-badge]").forEach((slot) => swap(slot, quest.badgeIcon(slot.dataset.questBadge, 3)));
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

function seenFlee() {
  try {
    const ids = JSON.parse(sessionStorage.getItem("chart-seen-flee") || "[]");
    return new Set(Array.isArray(ids) ? ids : []);
  } catch {
    return new Set();
  }
}

function markFleeSeen(id) {
  const seen = seenFlee();
  seen.add(id);
  sessionStorage.setItem("chart-seen-flee", JSON.stringify([...seen]));
}

function onFightDone(id) {
  finishedIds.add(id);
  const chore = (db.chores || []).find((item) => item.id === id);
  if (chore?.verdict === "flee") {
    if (db.session?.role === "kid") {
      chore.verdict = "";
      supabase.rpc("kid_ack_verdict", { p_token: sessionStorage.getItem(KID_TOKEN), p_chore: id });
    } else {
      markFleeSeen(id);
    }
  }
  applyBattleLine(battleLine.filter((item) => item.id !== id));
}

function syncBattles() {
  if (db.session?.role !== "kid") return;
  const kidId = db.session.id;
  const submitted = (db.chores || []).filter((chore) => chore.status === "submitted").map(actor);
  const fleeing = (db.chores || [])
    .filter((chore) => chore.verdict === "flee" && !finishedIds.has(chore.id))
    .map((chore) => ({ ...actor(chore), flee: true, approved: true }));
  const line = mergeBattleLine({
    order: lineIds,
    stored: loadTracked(kidId).map(actor),
    memory: battleLine,
    submitted,
    finished: [...finishedIds],
  });
  const fleeIds = new Set(fleeing.map((chore) => chore.id));
  applyBattleLine([...fleeing, ...line.filter((chore) => !fleeIds.has(chore.id))]);
}

function ensurePoll() {
  if (pollTimer || db.session?.role !== "kid") return;
  pollTimer = setInterval(async () => {
    if (busy || db.session?.role !== "kid") return;
    const ok = await loadKid();
    if (!ok || db.session?.role !== "kid") return;
    const me = kid();
    const sig = `${me?.points}|${me?.hearts}|${me?.warnSeq}|${(db.chores || []).map((chore) => chore.id + chore.status + (chore.verdict || "")).join(",")}`;
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
    <span class="stat coins"><i class="ico-chest" aria-hidden="true"></i><b>${child.points}</b><small>coins</small></span>
    <span class="stat cash"><i class="ico-bill" aria-hidden="true"></i><b>${money(child.cashCents)}</b><small>cash</small></span>
    <span class="stat time"><i class="ico-timer" aria-hidden="true"></i><b>${child.minutes}</b><small>min</small></span>
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
    ["chart", waiting ? `Approve (${waiting})` : "Approve"],
    ["log", "Log"],
    ["chores", "Tasks"],
    ["shop", "Shop"],
    ["family", "Family"],
    ["parent-hero", "My Hero"],
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
    ["hero", "My Hero"],
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

function torontoMidnightIso() {
  const day = torontoToday();
  const start = new Date(`${day}T00:00:00Z`);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Toronto",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(formatter.formatToParts(start).map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return new Date(start.getTime() - (asUtc - start.getTime())).toISOString();
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

function clockLabel(minute) {
  const m = ((Number(minute) % 1440) + 1440) % 1440;
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function sectionOpen(section, nowMinute = torontoMinute()) {
  if (!section) return true;
  const start = Number(section.startMinute);
  const end = Number(section.endMinute);
  if (start === end) return true;
  if (start < end) return nowMinute >= start && nowMinute < end;
  return nowMinute >= start || nowMinute < end;
}

function torontoMinute() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);
  return hour * 60 + minute;
}

function sortedSections() {
  return [...(db.sections || [])].sort((a, b) => (a.sortOrder - b.sortOrder) || a.title.localeCompare(b.title));
}

function templatesInSection(sectionId, kind = "daily") {
  return (db.templates || [])
    .filter((chore) => (kind === "daily" ? chore.kind !== "special" : chore.kind === kind))
    .filter((chore) => (chore.sectionId || null) === (sectionId || null))
    .sort((a, b) => (a.sortOrder - b.sortOrder) || String(a.title).localeCompare(String(b.title)));
}

function specialTemplates() {
  return (db.templates || [])
    .filter((chore) => chore.kind === "special")
    .sort((a, b) => (a.sortOrder - b.sortOrder) || String(a.title).localeCompare(String(b.title)));
}

function dragHandle() {
  return `<button type="button" class="drag-handle" draggable="true" aria-label="Drag to rearrange">⋮⋮</button>`;
}

function questBlock(list, empty) {
  if (!list.length) return `<p class="muted">${empty}</p>`;
  return list
    .map((chore) => {
      const sprite = taskSprite(chore);
      const waiting = chore.status === "submitted";
      return `<div class="quest${waiting ? " waiting-quest" : ""}">
        <span class="quest-pay">+${Number(chore.points) || 0}</span>
        <div class="quest-copy"><strong>${esc(chore.title)}</strong><div class="tiny muted">${payLabel(chore)}</div></div>
        <div class="quest-lane" aria-hidden="true">
          <canvas data-quest-walker="${esc(sprite)}" width="96" height="44"></canvas>
        </div>
        ${waiting ? `<span class="chip">Waiting</span>` : `<button class="btn small leaf" data-action="done" data-id="${chore.id}">Done</button>`}
      </div>`;
    })
    .join("");
}

function kidDailyBoard(list) {
  const dailies = list.filter((chore) => !isSpecial(chore));
  if (!dailies.length) return `<section class="card"><h2 class="page-title">Daily tasks</h2><p class="muted">No daily tasks right now. They come back each day.</p></section>`;
  const groups = new Map();
  for (const chore of dailies) {
    const key = chore.sectionId || "anytime";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(chore);
  }
  const sectionMeta = new Map((db.sections || []).map((section) => [section.id, section]));
  const keys = [...groups.keys()].sort((a, b) => {
    if (a === "anytime") return -1;
    if (b === "anytime") return 1;
    return (sectionMeta.get(a)?.sortOrder || 0) - (sectionMeta.get(b)?.sortOrder || 0);
  });
  return keys
    .map((key) => {
      const chores = groups.get(key) || [];
      const section = key === "anytime" ? null : sectionMeta.get(key);
      const title = section?.title || (chores[0]?.sectionTitle) || "Anytime";
      const window = section
        ? `${clockLabel(section.startMinute)}–${clockLabel(section.endMinute)}`
        : chores[0]?.sectionStart != null
          ? `${clockLabel(chores[0].sectionStart)}–${clockLabel(chores[0].sectionEnd)}`
          : "All day";
      return `<section class="card">
        <h2 class="page-title">${esc(title)}</h2>
        <p class="lede">${esc(window)}</p>
        ${questBlock(chores, "Nothing in this window right now.")}
      </section>`;
    })
    .join("");
}

function payLabel(chore) {
  const parts = [];
  if (chore.points) parts.push(`${chore.points} pts`);
  if (chore.cashCents) parts.push(money(chore.cashCents));
  if (chore.minutes) parts.push(`${chore.minutes} min`);
  return parts.join(" · ") || "No pay set";
}

function monsterChoice(sprite, templateId) {
  const id = normalizeSprite(sprite);
  return `<button type="button" class="monster-choice" data-action="open-monster"${templateId ? ` data-id="${esc(templateId)}"` : ""}>
    <canvas data-sprite="${esc(id)}" width="16" height="16"></canvas>
    <span>${esc(spriteName(id))}</span>
  </button>`;
}

function monsterDialog() {
  return `<dialog class="monster-dialog">
    <div class="section-title"><h2>Choose a monster</h2><button type="button" class="btn small ghost" data-action="close-monster">Close</button></div>
    <div class="sprite-library">
      ${SPRITES.map((sprite) => `<button type="button" class="sprite-card monster-option" data-action="choose-monster" data-sprite="${esc(sprite.id)}"><canvas data-sprite="${esc(sprite.id)}" width="16" height="16"></canvas><span>${esc(sprite.name)}</span></button>`).join("")}
    </div>
  </dialog>`;
}

function spriteLibrary() {
  return `<details class="card library"${libraryOpen ? " open" : ""}>
    <summary>Sprite library</summary>
    <p class="lede">Each task gets one monster. It waits on the trail when a kid taps Done, and the fight plays when you approve it.</p>
    <div class="sprite-library">
      ${SPRITES.map((sprite) => `<figure class="sprite-card"><canvas data-sprite="${sprite.id}" width="16" height="16" aria-hidden="true"></canvas><figcaption>${esc(sprite.name)}</figcaption></figure>`).join("")}
    </div>
  </details>`;
}

function assigneeName(chore) {
  const id = chore.assigneeId || chore.assignee_id;
  if (!id) return "Everybody";
  return kidById(id)?.name || "One kid";
}

let pinHold = false;

const SKY_THEME = {
  morning: "#f0a070",
  day: "#7eb8c9",
  evening: "#c86058",
  night: "#171f33",
};

function paintVersion() {
  let el = document.querySelector(".app-version");
  if (!el) {
    el = document.createElement("div");
    el.className = "app-version";
    el.setAttribute("aria-hidden", "true");
    document.body.appendChild(el);
  }
  el.textContent = `v${APP_VERSION}`;
}

function render() {
  pinHold = true;
  app.querySelector("dialog.pin-dialog[open]")?.close();
  const view = views[route.name] || views.welcome;
  const play = PLAY_ROUTES.has(route.name);
  document.body.classList.toggle("play", play);
  const theme = applySeasonTheme();
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", play ? SKY_THEME[theme.sky] || SKY_THEME.day : "#f3efe4");
  const host = document.querySelector(".stage");
  if (host) document.body.appendChild(host);
  app.innerHTML = view();
  mountStage();
  if (db.session?.role === "kid") {
    syncBattles();
    lastKidSig = `${kid()?.points}|${kid()?.hearts}|${kid()?.warnSeq}|${(db.chores || []).map((chore) => chore.id + chore.status + (chore.verdict || "")).join(",")}`;
    ensurePoll();
  } else {
    paintStage();
  }
  paintSpriteIcons(app);
  paintQuestArt(app);
  mountQuestWalkers(app);
  app.querySelectorAll("canvas[data-look]").forEach((icon) =>
    paintHeroBadge(icon, icon.dataset.look, heldWeapon(icon.dataset.weapon), icon.dataset.color || COLOR_HEX.leaf)
  );
  paintVersion();
  pinHold = false;
  const pin = app.querySelector("dialog.pin-dialog");
  if (pin) pin.showModal();
  requestAnimationFrame(() => {
    document.querySelectorAll(".ring-value").forEach((el) => {
      if (el.dataset.offset) el.setAttribute("stroke-dashoffset", el.dataset.offset);
    });
  });
}

const views = {
  loading() {
    return `<div class="card"><h1>${esc(BRAND_TITLE)}</h1><p class="lede">Loading…</p></div>`;
  },

  welcome() {
    if (!schemaReady) {
      return `
        <header class="top"><div class="brand">${mark()}<span><h1>${esc(BRAND_TITLE)}</h1><p>${esc(BRAND_TAGLINE)}</p></span></div></header>
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
      <header class="top hud"><div class="brand">${mark()}<span><h1>${esc(BRAND_TITLE)}</h1><p>${esc(BRAND_TAGLINE)}</p></span></div></header>
      ${worldScene("sun")}
      <section class="hero">
        <h2>Who's here?</h2>
        <p class="lede">Tap your name and enter your PIN.</p>
      </section>
      ${roster()}`;
  },

  "parent-auth"() {
    return shell(
      BRAND_TITLE,
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
            ? pinDialog(pinPad(`PIN for ${esc(picked?.name || "")}`))
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
    const specials = specialTemplates();
    const sections = sortedSections();
    const now = torontoMinute();
    const kidChoices = `<option value="">Everybody</option>${db.kids.map((child) => `<option value="${esc(child.id)}">${esc(child.name)}</option>`).join("")}`;
    const sectionChoices = `<option value="">Anytime</option>${sections.map((section) => `<option value="${esc(section.id)}">${esc(section.title)}</option>`).join("")}`;
    const dailyRow = (chore) => {
      const sprite = taskSprite(chore);
      const on = chore.active !== false;
      return `<form class="chore daily-chore${on ? "" : " off"}" data-action="save-daily" data-drag-item="${esc(chore.id)}" draggable="false">
        <input type="hidden" name="id" value="${chore.id}">
        ${dragHandle()}
        <div class="daily-tools">
          <button type="button" class="switch" data-action="toggle-daily" data-id="${chore.id}" aria-pressed="${on ? "true" : "false"}" aria-label="${on ? "Daily task on" : "Daily task off"}"><i></i></button>
          <button type="button" class="btn small ghost" data-action="send-once" data-id="${chore.id}">Send once</button>
        </div>
        <div class="chore-copy"><strong>${esc(chore.title)}</strong><div class="tiny muted">Once a day${on ? "" : " · Hidden from the daily board"}</div></div>
        ${monsterChoice(sprite, chore.id)}
        <label class="points-field">Points<input name="points" type="number" min="0" value="${Number(chore.points) || 0}"></label>
        <button class="btn small leaf" type="submit">Save</button>
        <button class="btn small ghost" type="button" data-action="remove-daily" data-id="${chore.id}">Remove</button>
      </form>`;
    };
    const dailyGroups = [
      { id: "", title: "Anytime", hint: "Shows all day", open: true, chores: templatesInSection(null) },
      ...sections.map((section) => ({
        id: section.id,
        title: section.title,
        hint: `${clockLabel(section.startMinute)}–${clockLabel(section.endMinute)}${sectionOpen(section, now) ? " · Open now" : " · Closed now"}`,
        open: sectionOpen(section, now),
        chores: templatesInSection(section.id),
      })),
    ];
    return shell(
      db.family.name,
      "Tasks",
      `<div class="stack">
        <p class="lede">Finished tasks are paid on the Approve page, after a kid taps Done. Drag the dots to rearrange.</p>
        ${spriteLibrary()}
        <section class="card">
          <h2 class="page-title">Schedule sections</h2>
          <p class="lede">Kids only see a section during its hours (Toronto time). Submitted tasks still stay visible.</p>
          <div class="section-list" data-drop-kind="sections">
            ${
              sections.length
                ? sections
                    .map(
                      (section) => `<div class="schedule-row" data-drag-item="${esc(section.id)}" data-drag-kind="section">
                        ${dragHandle()}
                        <div><strong>${esc(section.title)}</strong><div class="tiny muted">${clockLabel(section.startMinute)}–${clockLabel(section.endMinute)}${sectionOpen(section, now) ? " · Open now" : " · Closed now"}</div></div>
                        <button class="btn small ghost" type="button" data-action="remove-section" data-id="${section.id}">Remove</button>
                      </div>`
                    )
                    .join("")
                : `<p class="muted">No timed sections yet. Add Morning, After school, or Bedtime below.</p>`
            }
          </div>
          <form class="two" data-action="add-section" style="margin-top:12px">
            <label>Section name<input name="title" required placeholder="Morning"></label>
            <label>Starts<input name="start" type="time" required value="07:00"></label>
            <label>Ends<input name="end" type="time" required value="09:00"></label>
            <button class="btn leaf" type="submit">Add section</button>
          </form>
        </section>
        <section class="card">
          <h2 class="page-title">Special task board</h2>
          <p class="lede">Bonus chores, one time. Pick one kid or everybody. They stay until that kid finishes them or you remove them.</p>
          <div class="task-list" data-drop-kind="special" data-section="">
            ${
              specials.length
                ? specials
                    .map((chore) => {
                      const sprite = taskSprite(chore);
                      return `<div class="chore" data-drag-item="${esc(chore.id)}" data-drag-kind="special">${dragHandle()}<div><strong>${esc(chore.title)}</strong><div class="tiny muted">${Number(chore.points) || 0} pts · One time · ${esc(assigneeName(chore))} · ${esc(spriteName(sprite))}</div></div><button class="btn small ghost" type="button" data-action="remove-special" data-id="${chore.id}">Remove</button>${monsterChoice(sprite, chore.id)}</div>`;
                    })
                    .join("")
                : `<p class="muted">No bonus tasks yet.</p>`
            }
          </div>
          <form class="two" id="add-special-form" data-action="add-special" style="margin-top:12px">
            <label>Bonus task<input name="title" required placeholder="Wash the car"></label>
            <label>Points<input name="points" type="number" min="0" value="5" required></label>
            <label>Who<select name="kidId">${kidChoices}</select></label>
            <input type="hidden" name="sprite" value="dust">
            ${monsterChoice("dust")}
            <button class="btn sun" type="submit">Add once</button>
          </form>
        </section>
        <section class="card">
          <h2 class="page-title">Daily tasks</h2>
          <p class="lede">Every kid can do these once a day. Drop a task into a section to move it. Turn one off to hide it from the daily board.</p>
          ${dailyGroups
            .map(
              (group) => `<div class="daily-section${group.open ? "" : " closed"}" data-drop-kind="daily" data-section="${esc(group.id)}">
                <div class="daily-section-head"><strong>${esc(group.title)}</strong><span class="tiny muted">${esc(group.hint)}</span></div>
                ${group.chores.length ? group.chores.map(dailyRow).join("") : `<p class="muted drop-empty">Drop tasks here</p>`}
              </div>`
            )
            .join("")}
          <form class="two" id="add-daily-form" data-action="add-daily" style="margin-top:12px">
            <label>Task<input name="title" required placeholder="Make the bed"></label>
            <label>Points<input name="points" type="number" min="0" value="2" required></label>
            <label>Section<select name="sectionId">${sectionChoices}</select></label>
            <input type="hidden" name="sprite" value="dust">
            ${monsterChoice("dust")}
            <button class="btn leaf" type="submit">Add daily task</button>
          </form>
        </section>
        ${monsterDialog()}
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
        ${worldScene("leaf")}
        <section class="card">
          <h2 class="page-title">Waiting for approval</h2>
          <p class="lede">This is where finished chores get paid. A kid taps Done, then you tap Approve.</p>
          ${
            waiting.length
              ? waiting
                  .map((chore) => {
                    const child = kidById(chore.kidId);
                    return `<div class="chore waiting"><div><strong>${esc(chore.title)}</strong><div class="tiny muted">${esc(child?.name || "")} · ${isSpecial(chore) ? "Special" : "Daily"} · ${payLabel(chore)}</div></div><span class="row"><button class="btn small leaf" data-action="approve-chore" data-id="${chore.id}">Approve</button><button class="btn small clay" data-action="reject-chore" data-id="${chore.id}">Reject</button></span></div>`;
                  })
                  .join("")
              : `<p class="muted">Nothing is waiting. When a kid taps Done, it shows up here.</p>`
          }
        </section>
        ${
          db.kids.length
            ? `<div class="chart-kids">${db.kids
                .map((child) => {
                  const goal = Number(db.family.ungroundPoints) || 0;
                  const look = kidHero(child.hero);
                  const weapon = child.weapon || "broom";
                  const tint = COLOR_HEX[child.color] || COLOR_HEX.leaf;
                  return `<section class="card stack kid-column" data-kid-id="${esc(child.id)}">
                    <div class="kid-hero-toggle" aria-hidden="true">
                      <canvas class="hero-icon" data-look="${esc(look)}" data-weapon="${esc(weapon)}" data-color="${esc(tint)}" width="40" height="34"></canvas>
                    </div>
                    <div class="kid-column-head">
                      <div class="who"><strong>${esc(child.name)}</strong>${heartMarks(child.hearts)}</div>
                      <button class="btn small ${child.hearts === 1 ? "clay" : "ghost"}" type="button" data-action="warn-kid" data-id="${child.id}" ${child.hearts <= 0 ? "disabled" : ""}>${child.hearts === 1 ? "Ground" : "Warn"}</button>
                    </div>
                    <div class="kid-column-balances">${balances(child)}</div>
                    ${
                      grounded(child)
                        ? `<div class="banner">Locked in the cage until ${esc(when(child.groundedUntil))}. Cage progress ${child.groundProgress}/${goal || "—"} coins.${goal ? "" : " Set a coin goal below, or lift now."} Match that in Screen Time. <button class="btn small ghost" data-action="lift-one" data-id="${child.id}">Lift</button></div>`
                        : ""
                    }
                  </section>`;
                })
                .join("")}</div>`
            : `<div class="card">Add a kid on the Family page first.</div>`
        }
        ${db.templates.length ? "" : `<button class="btn leaf" data-action="goto" data-to="chores">Add tasks</button>`}
        <section class="card stack">
          <h2 class="page-title">Reward or deduct</h2>
          <div class="reward-deduct-actions">
            <button class="btn sun" type="button" data-action="open-reward" ${db.kids.length ? "" : "disabled"}>Reward</button>
            <button class="btn clay" type="button" data-action="open-deduct" ${db.kids.length ? "" : "disabled"}>Deduct</button>
            <button class="btn clay ground-action" type="button" data-action="open-ground" ${db.kids.length ? "" : "disabled"}>Ground</button>
          </div>
          <dialog class="balance-dialog reward-dialog">
            <form class="stack" data-action="grant">
              <div class="section-title"><h2>Reward</h2><button type="button" class="btn small ghost" data-action="close-reward">Close</button></div>
              <p class="lede">Add coins, cash, or minutes for a good report.</p>
              <div class="two">
                <label>Kid<select name="kidId">${db.kids.map((child) => `<option value="${child.id}">${esc(child.name)}</option>`).join("")}</select></label>
                <label>Points<input name="points" type="number" min="0" value="0"></label>
                <label>Cash $<input name="dollars" type="number" min="0" step="0.01" value="0"></label>
                <label>Minutes<input name="minutes" type="number" min="0" value="0"></label>
              </div>
              <label>Note<input name="note" placeholder="Good report"></label>
              <span class="row"><button class="btn sun" type="submit" ${db.kids.length ? "" : "disabled"}>Grant reward</button><button class="btn ghost" type="button" data-action="close-reward">Cancel</button></span>
            </form>
          </dialog>
          <dialog class="balance-dialog deduct-dialog">
            <form class="stack" data-action="spend">
              <div class="section-title"><h2>Deduct</h2><button type="button" class="btn small ghost" data-action="close-deduct">Close</button></div>
              <p class="lede">Take coins off when they get spent. Take minutes off when you cash in screen time and add it in Screen Time. Take cash off when you pay it out.</p>
              <div class="two">
                <label>Kid<select name="kidId">${db.kids.map((child) => `<option value="${child.id}">${esc(child.name)}</option>`).join("")}</select></label>
                <label>Coins<input name="points" type="number" min="0" value="0"></label>
                <label>Cash $<input name="dollars" type="number" min="0" step="0.01" value="0"></label>
                <label>Minutes<input name="minutes" type="number" min="0" value="0"></label>
              </div>
              <label>Note<input name="note" placeholder="Ice cream, or screen time used"></label>
              <span class="row"><button class="btn clay" type="submit" ${db.kids.length ? "" : "disabled"}>Take off</button><button class="btn ghost" type="button" data-action="close-deduct">Cancel</button></span>
            </form>
          </dialog>
          <dialog class="balance-dialog ground-dialog">
            <form class="stack" data-action="ground">
              <div class="section-title"><h2>Ground</h2><button type="button" class="btn small ghost" data-action="close-ground">Close</button></div>
              <p class="lede">Lock a hero in the cage until a set time. Match the end time in Screen Time.</p>
              <label>Kid<select name="kidId">${db.kids.map((child) => `<option value="${child.id}">${esc(child.name)}</option>`).join("")}</select></label>
              <label>Until<input name="until" type="datetime-local" required></label>
              <label>Reason<input name="reason" required placeholder="What happened"></label>
              <label class="row" style="font-weight:700"><input type="checkbox" name="clearMinutes" style="width:auto"> Clear device minutes</label>
              <span class="row"><button class="btn clay" type="submit" ${db.kids.length ? "" : "disabled"}>Save grounding</button><button class="btn ghost" type="button" data-action="close-ground">Cancel</button></span>
            </form>
          </dialog>
          <h2 class="page-title">Cage release</h2>
          <p class="lede">When the last heart is gone, the hero is locked up. Approved chore coins count toward this goal. Hitting the goal frees them for good and restores three hearts. Set 0 if only a parent can lift.</p>
          <form class="two" data-action="save-cage-goal">
            <label>Coins to free the cage<input name="points" type="number" min="0" value="${Number(db.family.ungroundPoints) || 0}" required></label>
            <button class="btn leaf" type="submit">Save cage goal</button>
          </form>
          ${route.error ? `<p class="error">${esc(route.error)}</p>` : ""}
        </section>
        <section class="card stack">
          <h2 class="page-title">Reset child</h2>
          <p class="lede">Start one kid over. This clears coins, cash, minutes, finished tasks, shop requests, achievements, and monster counts.</p>
          <button class="btn clay wide" type="button" data-action="open-reset-child" ${db.kids.length ? "" : "disabled"}>Reset child</button>
        </section>
        <dialog class="reset-child-dialog">
          <form class="stack" data-action="confirm-reset-child">
            <div class="section-title"><h2>Reset child</h2><button type="button" class="btn small ghost" data-action="close-reset-child">Close</button></div>
            <p class="lede">Which child should start over? Hearts come back full, the cage lifts, and today's tasks show as not done.</p>
            <label>Child<select name="kidId" required ${db.kids.length ? "" : "disabled"}>${
              db.kids.map((child) => `<option value="${child.id}">${esc(child.name)}</option>`).join("")
            }</select></label>
            <span class="row"><button class="btn clay" type="submit" ${db.kids.length ? "" : "disabled"}>Reset</button><button class="btn ghost" type="button" data-action="close-reset-child">Cancel</button></span>
          </form>
        </dialog>
      </div>`,
      parentNav("chart")
    );
  },

  log() {
    const rows = filteredActivity();
    const kidOptions = `<option value="">Everybody</option>${db.kids
      .map((child) => `<option value="${esc(child.id)}" ${logKidFilter === child.id ? "selected" : ""}>${esc(child.name)}</option>`)
      .join("")}`;
    const typeOptions = `<option value="">All actions</option>${LOG_TYPES.map(
      ([id, label]) => `<option value="${esc(id)}" ${logTypeFilter === id ? "selected" : ""}>${esc(label)}</option>`
    ).join("")}`;
    return shell(
      db.family.name,
      "Log",
      `<div class="stack">
        <section class="card stack">
          <h2 class="page-title">Log</h2>
          <p class="lede">Everything that happened for the family. Filter by child or action type.</p>
          <div class="log-filters">
            <label>Child<select name="logKid">${kidOptions}</select></label>
            <label>Action<select name="logType">${typeOptions}</select></label>
          </div>
          <div class="list">
            ${
              rows.length
                ? rows
                    .map((row) => {
                      const type = activityType(row.text);
                      const child = row.kidId ? kidById(row.kidId) : null;
                      return `<div class="item log-entry">
                        <div class="log-meta">
                          <span class="log-type">${esc(activityTypeLabel(type))}</span>
                          ${child ? `<span class="tiny muted">${esc(child.name)}</span>` : ""}
                          <span class="tiny muted">${esc(when(row.at))}</span>
                        </div>
                        <div>${esc(row.text)}</div>
                      </div>`;
                    })
                    .join("")
                : `<p class="muted">${db.activity?.length ? "Nothing matches those filters." : "No actions yet."}</p>`
            }
          </div>
        </section>
      </div>`,
      parentNav("log")
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
        ${
          grounded(child)
            ? `<div class="banner">Locked in the cage until ${esc(when(child.groundedUntil))}. Earn ${(Number(db.family.ungroundPoints) || 0) > 0 ? `${child.groundProgress}/${db.family.ungroundPoints} coins` : "approved coins"} to break out and get three hearts back.</div>`
            : ""
        }
        ${kidDailyBoard(mine)}
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

  hero() {
    const child = kid();
    return shell(
      child.name,
      "My Hero",
      `<div class="stack">
        ${worldScene(child.color)}
        ${heroBoard()}
      </div>`,
      kidNav("hero")
    );
  },

  "parent-hero"() {
    const me = parent();
    if (!me) return views.family();
    return shell(
      me.name,
      "My Hero",
      `<div class="stack">
        ${parentHeroBoard()}
      </div>`,
      parentNav("parent-hero")
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

app.addEventListener("toggle", (event) => {
  if (event.target.classList?.contains("library")) libraryOpen = event.target.open;
});

app.addEventListener("change", (event) => {
  if (event.target.name === "logKid") {
    logKidFilter = event.target.value || "";
    render();
    return;
  }
  if (event.target.name === "logType") {
    logTypeFilter = event.target.value || "";
    render();
  }
});

app.addEventListener("input", (event) => {
  if (event.target.name) draft[event.target.name] = event.target.value;
  if (event.target.name !== "title") return;
  const form = event.target.closest("form");
  if (!form || form.dataset.spritePicked === "1") return;
  const sprite = guessSprite(event.target.value);
  const input = form.querySelector('input[name="sprite"]');
  if (input) input.value = sprite;
  const button = form.querySelector("[data-action='open-monster']");
  const canvas = button?.querySelector("canvas");
  const label = button?.querySelector("span");
  if (canvas) canvas.dataset.sprite = sprite;
  if (label) label.textContent = spriteName(sprite);
  if (button) paintSpriteIcons(button);
});

app.addEventListener("close", (event) => {
  if (pinHold || !event.target.matches?.("dialog.pin-dialog")) return;
  if (!route.playerId && !route.kidId) return;
  route = { name: route.name === "kid-gate" ? "kid-gate" : "welcome", error: "" };
  draft = {};
  render();
});

app.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-action]");
  if (!btn || btn.tagName === "FORM") return;
  const action = btn.dataset.action;
  if (action === "goto") go(btn.dataset.to);
  if (action === "home") go(db.session?.role === "kid" ? "today" : db.session ? "chart" : "welcome");
  if (action === "auth-mode") go("parent-auth", { mode: btn.dataset.mode, email: draft.email || "" });
  if (action === "kids-door") openKidGate();
  if (action === "pick-player") {
    route = { name: "welcome", playerId: btn.dataset.id, playerKind: btn.dataset.kind, error: "" };
    draft = {};
    notice = "";
    render();
  }
  if (action === "close-pin") {
    route = { name: route.name === "kid-gate" ? "kid-gate" : "welcome", error: "" };
    draft = {};
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
  if (action === "lift-one") run(() => rpc("lift_grounding", { p_kid: btn.dataset.id }), "Cage open. Three hearts are back. Turn it off in Screen Time too.");
  if (action === "warn-kid") {
    let warnNote = "Warning saved. One heart is gone.";
    const kidId = btn.dataset.id;
    run(
      async () => {
        const result = await rpc("warn_kid", { p_kid: kidId, p_reason: "" });
        queueParentWarn(kidId, result || {});
        if (result?.locked) warnNote = "Last heart gone. The Chore Patrol locked the hero in the cage.";
      },
      () => warnNote,
      "chart"
    );
  }
  if (action === "set-hero") {
    if (db.session?.role === "parent") run(() => rpc("parent_set_hero", { p_hero: btn.dataset.hero }), "Hero saved.", "parent-hero");
    else run(() => rpc("kid_set_hero", { p_token: sessionStorage.getItem(KID_TOKEN), p_hero: btn.dataset.hero }), "Hero saved.", "hero");
  }
  if (action === "set-color") {
    if (db.session?.role === "parent") run(() => rpc("parent_set_color", { p_color: btn.dataset.color }), "Color saved.", "parent-hero");
    else run(() => rpc("kid_set_color", { p_token: sessionStorage.getItem(KID_TOKEN), p_color: btn.dataset.color }), "Color saved.", "hero");
  }
  if (action === "set-weapon") {
    if (db.session?.role === "parent") run(() => rpc("parent_set_weapon", { p_weapon: btn.dataset.weapon }), "Weapon equipped.", "parent-hero");
    else run(() => rpc("kid_set_weapon", { p_token: sessionStorage.getItem(KID_TOKEN), p_weapon: btn.dataset.weapon }), "Weapon equipped.", "hero");
  }
  if (action === "pick-sprite") {
    const form = btn.closest("form");
    const input = form?.querySelector('input[name="sprite"]');
    if (input) input.value = btn.dataset.sprite;
    form?.setAttribute("data-sprite-picked", "1");
    form?.querySelectorAll("[data-action='pick-sprite']").forEach((pick) => {
      pick.setAttribute("aria-pressed", pick === btn ? "true" : "false");
    });
  }
  if (action === "open-monster") {
    const dialog = document.querySelector(".monster-dialog");
    if (!dialog) return;
    dialog.dataset.templateId = btn.dataset.id || "";
    dialog.dataset.formId = btn.closest("form")?.id || "";
    if (!dialog.open) dialog.showModal();
  }
  if (action === "close-monster") document.querySelector(".monster-dialog")?.close();
  if (action === "choose-monster") {
    const dialog = document.querySelector(".monster-dialog");
    const sprite = normalizeSprite(btn.dataset.sprite);
    const templateId = dialog?.dataset.templateId || "";
    const form = dialog?.dataset.formId ? document.getElementById(dialog.dataset.formId) : null;
    dialog?.close();
    if (templateId) {
      run(() => rpc("set_chore_sprite", { p_id: templateId, p_sprite: sprite }), "Monster saved.", "chores");
    } else if (form) {
      form.dataset.spritePicked = "1";
      const input = form.querySelector('input[name="sprite"]');
      if (input) input.value = sprite;
      const choice = form.querySelector("[data-action='open-monster']");
      const canvas = choice?.querySelector("canvas");
      const label = choice?.querySelector("span");
      if (canvas) canvas.dataset.sprite = sprite;
      if (label) label.textContent = spriteName(sprite);
      if (choice) paintSpriteIcons(choice);
    }
  }
  if (action === "toggle-daily") {
    const turningOn = btn.getAttribute("aria-pressed") !== "true";
    run(() => rpc("set_daily_active", { p_id: btn.dataset.id, p_on: turningOn }), turningOn ? "Back on the daily board." : "Hidden from the daily board.", "chores");
  }
  if (action === "send-once") {
    const chore = db.templates.find((item) => item.id === btn.dataset.id);
    if (!chore) return;
    const form = btn.closest("form");
    const points = form ? Number(new FormData(form).get("points")) : Number(chore.points) || 0;
    run(
      () => rpc("add_special_chore", { p_title: chore.title, p_points: points, p_sprite: taskSprite(chore), p_kid: null }),
      "Sent to the special board once, for everybody.",
      "chores"
    );
  }
  if (action === "open-reset-child") {
    const dialog = document.querySelector(".reset-child-dialog");
    if (dialog && !dialog.open) dialog.showModal();
  }
  if (action === "close-reset-child") document.querySelector(".reset-child-dialog")?.close();
  if (action === "open-reward") {
    const dialog = document.querySelector(".reward-dialog");
    if (dialog && !dialog.open) dialog.showModal();
  }
  if (action === "close-reward") document.querySelector(".reward-dialog")?.close();
  if (action === "open-deduct") {
    const dialog = document.querySelector(".deduct-dialog");
    if (dialog && !dialog.open) dialog.showModal();
  }
  if (action === "close-deduct") document.querySelector(".deduct-dialog")?.close();
  if (action === "open-ground") {
    const dialog = document.querySelector(".ground-dialog");
    if (dialog && !dialog.open) dialog.showModal();
  }
  if (action === "close-ground") document.querySelector(".ground-dialog")?.close();
  if (action === "reject-chore") run(() => rpc("reject_chore", { p_chore: btn.dataset.id }), "Sent back. The hero gets knocked down and the monster runs off.", "chart");
  if (action === "undo-approval") run(() => rpc("undo_approval", { p_chore: btn.dataset.id }), "Approval undone. It is waiting again.", "chart");
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
  if (action === "remove-section") run(() => rpc("remove_chore_section", { p_id: btn.dataset.id }), "Section removed. Those tasks moved to Anytime.", "chores");
});

let dragState = null;

function listIds(container) {
  return [...container.querySelectorAll(":scope > [data-drag-item]")].map((node) => node.dataset.dragItem).filter(Boolean);
}

function dropKindOk(zone) {
  if (!zone || !dragState) return false;
  if (dragState.kind === "sections") return zone.dataset.dropKind === "sections";
  if (dragState.kind === "special") return zone.dataset.dropKind === "special";
  if (dragState.kind === "daily") return zone.dataset.dropKind === "daily";
  return false;
}

function dragSlot() {
  let slot = app.querySelector(".drag-slot");
  if (slot) return slot;
  slot = document.createElement("div");
  slot.className = "drag-slot";
  slot.setAttribute("aria-hidden", "true");
  return slot;
}

function placeDragSlot(zone, event) {
  const slot = dragSlot();
  if (event.target.closest(".drag-slot") === slot && slot.parentElement === zone) return;
  const over = event.target.closest("[data-drag-item]");
  if (over && over !== dragState.node && over.parentElement === zone) {
    const rect = over.getBoundingClientRect();
    const before = event.clientY < rect.top + rect.height / 2;
    zone.insertBefore(slot, before ? over : over.nextSibling);
    return;
  }
  const empty = zone.querySelector(":scope > .drop-empty");
  if (empty) zone.insertBefore(slot, empty);
  else zone.appendChild(slot);
}

function clearDragUi() {
  app.querySelectorAll(".dragging, .drop-target").forEach((node) => node.classList.remove("dragging", "drop-target"));
  app.querySelector(".drag-slot")?.remove();
}

async function persistDrop(container, movedId) {
  const kind = container.dataset.dropKind;
  if (kind === "sections") {
    const ids = listIds(container);
    await run(() => rpc("reorder_chore_sections", { p_ids: ids }), "Section order saved.", "chores");
    return;
  }
  if (kind === "special") {
    const ids = listIds(container);
    if (movedId && !ids.includes(movedId)) ids.push(movedId);
    await run(() => rpc("reorder_chore_templates", { p_ids: ids, p_section: null, p_kind: "special" }), "Order saved.", "chores");
    return;
  }
  if (kind === "daily") {
    const section = container.dataset.section || null;
    const ids = listIds(container);
    if (movedId && !ids.includes(movedId)) ids.push(movedId);
    await run(
      () => rpc("reorder_chore_templates", { p_ids: ids, p_section: section || null, p_kind: "daily" }),
      "Moved.",
      "chores"
    );
  }
}

app.addEventListener("dragstart", (event) => {
  const handle = event.target.closest(".drag-handle");
  const row = handle?.closest("[data-drag-item]") || event.target.closest("[data-drag-item]");
  if (!row || !handle) return;
  const from = row.closest("[data-drop-kind]");
  if (!from) return;
  dragState = { id: row.dataset.dragItem, kind: from.dataset.dropKind, node: row, dropped: false };
  row.classList.add("dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", row.dataset.dragItem);
});

app.addEventListener("dragend", () => {
  clearDragUi();
  dragState = null;
});

app.addEventListener("dragover", (event) => {
  const zone = event.target.closest("[data-drop-kind]");
  if (!dropKindOk(zone)) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  app.querySelectorAll(".drop-target").forEach((node) => {
    if (node !== zone) node.classList.remove("drop-target");
  });
  zone.classList.add("drop-target");
  placeDragSlot(zone, event);
});

app.addEventListener("dragleave", (event) => {
  const zone = event.target.closest("[data-drop-kind]");
  if (!zone || zone.contains(event.relatedTarget)) return;
  zone.classList.remove("drop-target");
  const slot = zone.querySelector(":scope > .drag-slot");
  if (slot && !zone.contains(event.relatedTarget)) slot.remove();
});

app.addEventListener("drop", (event) => {
  const zone = event.target.closest("[data-drop-kind]");
  if (!dropKindOk(zone)) return;
  event.preventDefault();
  const movedId = dragState.id;
  const node = dragState.node;
  dragState.dropped = true;
  const slot = zone.querySelector(":scope > .drag-slot") || app.querySelector(".drag-slot");
  if (slot) slot.replaceWith(node);
  else zone.appendChild(node);
  zone.querySelector(":scope > .drop-empty")?.remove();
  clearDragUi();
  node.classList.remove("dragging");
  dragState = null;
  persistDrop(zone, movedId);
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
  if (action === "add-section") {
    run(
      () => rpc("add_chore_section", { p_title: data.title, p_start: data.start, p_end: data.end }),
      "Schedule section added.",
      "chores"
    );
  }
  if (action === "add-daily") {
    const sectionId = data.sectionId || null;
    run(
      () =>
        rpc("add_daily_chore", {
          p_title: data.title,
          p_points: Number(data.points) || 0,
          p_sprite: normalizeSprite(data.sprite || guessSprite(data.title)),
          p_section: sectionId,
        }),
      "Added for every kid. It comes back each day.",
      "chores"
    );
  }
  if (action === "add-special") {
    const kidId = data.kidId || null;
    const name = kidId ? db.kids.find((child) => child.id === kidId)?.name : "";
    run(
      () => rpc("add_special_chore", { p_title: data.title, p_points: Number(data.points) || 0, p_sprite: normalizeSprite(data.sprite || guessSprite(data.title)), p_kid: kidId }),
      name ? `Added once for ${name}.` : "Added once for every kid.",
      "chores"
    );
  }
  if (action === "save-daily") run(() => rpc("save_daily_chore", { p_id: data.id, p_points: Number(data.points) || 0 }), "Points updated for everybody.", "chores");
  if (action === "confirm-reset-child") {
    document.querySelector(".reset-child-dialog")?.close();
    if (!data.kidId) return;
    const name = kidById(data.kidId)?.name || "that child";
    run(
      () => rpc("reset_kid_progress", { p_kid: data.kidId }),
      `Reset ${name}. Coins, cash, minutes, and the finished log are cleared. Today's tasks are not done again.`,
      "chart"
    );
  }
  if (action === "grant") {
    document.querySelector(".reward-dialog")?.close();
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
    document.querySelector(".deduct-dialog")?.close();
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
    document.querySelector(".ground-dialog")?.close();
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
  if (action === "save-cage-goal") run(() => rpc("save_cage_goal", { p_points: Number(data.points) || 0 }), "Cage release goal saved.", "chart");
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
    route = { name: "chart" };
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
    route = { name: "chart" };
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
setInterval(() => {
  const before = `${document.body.dataset.season || ""}:${document.body.dataset.sky || ""}`;
  const next = applySeasonTheme();
  const key = `${next.season}:${next.sky}`;
  if (before !== ":" && before !== key) render();
}, 60_000);
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
