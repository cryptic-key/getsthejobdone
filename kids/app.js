import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config.js";

const COLORS = ["leaf", "sun", "sky", "clay", "plum", "teal"];
const CODE_KEY = "chart-family-code";
const KID_TOKEN = "chart-kid-token";

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
let route = { name: "loading" };
let draft = {};
let notice = "";
let busy = false;

function blank() {
  return { family: null, parents: [], kids: [], chores: [], items: [], requests: [], activity: [], session: null };
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
  if (/email not confirmed/i.test(msg)) return "Confirm that email first, then sign in.";
  if (/not a parent/i.test(msg)) return "This login is not on a family yet.";
  if (/already has an account/i.test(msg)) return "That email already has an account. They can sign in.";
  if (/^grounded$/i.test(msg)) return "Device time is locked while you are grounded.";
  if (/not enough points/i.test(msg)) return "Not enough points for that.";
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
  const { error } = await supabase.from("households").select("id").limit(1);
  schemaReady = !error;
  if (!schemaReady) {
    route = { name: "welcome" };
    render();
    return;
  }
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
  localStorage.setItem(CODE_KEY, me.households.code);
  const [parents, kids, chores, items, requests, activity] = await Promise.all([
    supabase.from("parents").select("id,name,email").order("created_at"),
    supabase.from("kids").select("id,name,color,points,cash_cents,minutes,grounded_until").order("created_at"),
    supabase.from("chores").select("id,kid_id,title,points,cash_cents,minutes,status").neq("status", "approved").order("created_at"),
    supabase.from("shop_items").select("id,name,cost").order("created_at"),
    supabase.from("requests").select("id,kid_id,item_id,cost,status").eq("status", "pending"),
    supabase.from("activity").select("id,kid_id,body,created_at").order("created_at", { ascending: false }).limit(20),
  ]);
  for (const result of [parents, kids, chores, items, requests, activity]) {
    if (result.error) throw result.error;
  }
  db = {
    family: {
      name: me.households.name,
      code: me.households.code,
      pointsPerDollar: me.households.points_per_dollar,
      pointsPer30: me.households.points_per_30,
    },
    parents: parents.data,
    kids: kids.data.map(mapKid),
    chores: chores.data.map((chore) => ({
      ...chore,
      kidId: chore.kid_id,
      cashCents: chore.cash_cents,
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
    },
    parents: [],
    kids: [mapKid(snap.kid)],
    chores: snap.chores.map((chore) => ({ ...chore, kidId: snap.kid.id, cashCents: chore.cash_cents })),
    items: snap.items,
    requests: snap.requests.map((req) => ({ ...req, kidId: snap.kid.id, itemId: req.item_id })),
    activity: snap.activity.map((row) => ({ id: row.id, text: row.body, at: row.created_at })),
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

function shell(title, sub, body, nav) {
  const signedIn = Boolean(db.session);
  return `
    <header class="top">
      <button class="brand" data-action="home">
        ${mark()}
        <span><h1>${esc(title)}</h1><p>${esc(sub)}</p></span>
      </button>
      ${signedIn ? `<button class="btn ghost small" data-action="sign-out">Sign out</button>` : ""}
    </header>
    ${nav || ""}
    ${notice ? `<div class="banner info" style="margin-bottom:14px">${esc(notice)}</div>` : ""}
    ${body}
    <footer class="note">Saved in Supabase. Screen Time still gets set by a parent in Settings.</footer>`;
}

function parentNav(current) {
  return `<nav class="nav">${[
    ["family", "Family"],
    ["chart", "Chart"],
    ["shop", "Shop"],
  ]
    .map(
      ([id, label]) =>
        `<button data-action="goto" data-to="${id}" ${current === id ? 'aria-current="page"' : ""}>${label}</button>`
    )
    .join("")}</nav>`;
}

function kidNav(current) {
  return `<nav class="nav">${[
    ["today", "Today"],
    ["kid-shop", "Shop"],
    ["me", "Me"],
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

function payLabel(chore) {
  const parts = [];
  if (chore.points) parts.push(`${chore.points} pts`);
  if (chore.cashCents) parts.push(money(chore.cashCents));
  if (chore.minutes) parts.push(`${chore.minutes} min`);
  return parts.join(" · ") || "No pay set";
}

function render() {
  const view = views[route.name] || views.welcome;
  app.innerHTML = view();
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
      <header class="top"><div class="brand">${mark()}<span><h1>Our chart</h1><p>Gets the job done</p></span></div></header>
      <section class="hero">
        <h2>Chores, rewards, and device time.</h2>
        <p class="lede">Parents keep the accounts. Kids open the chart with a PIN.</p>
      </section>
      <div class="doors">
        <button class="door leaf" data-action="goto" data-to="parent-auth">
          <span><strong>Parents</strong><span>Create an account or sign in.</span></span>
          <span class="btn small leaf">Open</span>
        </button>
        <button class="door sun" data-action="kids-door">
          <span><strong>Kids</strong><span>Tap your name and enter your PIN.</span></span>
          <span class="btn small sun">Open</span>
        </button>
      </div>`;
  },

  "parent-auth"() {
    const creating = route.mode !== "signin";
    return shell(
      "Our chart",
      creating ? "New parent" : "Parent sign in",
      `<form class="card stack" data-action="parent-auth-submit">
        <div class="section-title"><h2>${creating ? "Create a parent account" : "Parent sign in"}</h2></div>
        ${creating ? `<label>Your name<input name="name" autocomplete="name" required value="${esc(draft.name || "")}"></label>` : ""}
        ${creating ? `<label>Family name<input name="family" required value="${esc(draft.family || "Our family")}"></label>` : ""}
        <label>Email<input name="email" type="email" autocomplete="username" required value="${esc(draft.email || route.email || "")}"></label>
        <label>Password<input name="password" type="password" autocomplete="${creating ? "new-password" : "current-password"}" required minlength="8"></label>
        ${route.error ? `<p class="error">${esc(route.error)}</p>` : ""}
        <button class="btn leaf wide" type="submit">${creating ? "Create account" : "Sign in"}</button>
        <button class="btn ghost wide" type="button" data-action="auth-mode" data-mode="${creating ? "signin" : "create"}">${creating ? "I already have an account" : "Create a parent account"}</button>
        <button class="btn ghost wide" type="button" data-action="goto" data-to="welcome">Back</button>
      </form>`
    );
  },

  "kid-gate"() {
    const selected = route.kidId || "";
    const code = draft.code ?? localStorage.getItem(CODE_KEY) ?? "";
    return shell(
      "Our chart",
      "Who's here?",
      `<div class="stack">
        <form class="card stack" data-action="save-code">
          <label>Family code<input name="code" value="${esc(code)}" autocomplete="off" required></label>
          <button class="btn ghost" type="submit">Show kids</button>
        </form>
        ${
          gateKids.length
            ? `<div class="kid-grid">${gateKids
                .map(
                  (child) => `<button class="kid-pick" data-action="pick-kid" data-id="${child.id}" aria-pressed="${selected === child.id}">
                    <span class="swatch ${esc(child.color)}"></span>
                    <strong style="display:block;margin-top:8px">${esc(child.name)}</strong>
                  </button>`
                )
                .join("")}</div>`
            : `<p class="hint">Enter the family code from a parent. It is on the Family page.</p>`
        }
        ${
          selected
            ? `<div class="card">
                <h2 class="page-title" style="text-align:center">PIN for ${esc(kidById(selected)?.name || "")}</h2>
                <div class="pin-dots">${[0, 1, 2, 3].map((i) => `<i class="${(draft.pin || "").length > i ? "on" : ""}"></i>`).join("")}</div>
                ${route.error ? `<p class="error" style="text-align:center">${esc(route.error)}</p>` : ""}
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
        <div class="banner info">Kids door code <strong>${esc(db.family.code)}</strong>. This browser remembers it.</div>
        <div class="split">
          <section class="card">
            <div class="section-title"><h2>Parents</h2><button class="btn small leaf" data-action="goto" data-to="add-parent">Add</button></div>
            ${db.parents
              .map(
                (person) => `<div class="person">
                  <div><strong>${esc(person.name)}</strong><div class="tiny muted">${esc(person.email)}${person.id === me?.id ? " · You" : ""}</div></div>
                  ${person.id === me?.id ? "" : `<button class="btn ghost small" data-action="remove-parent" data-id="${person.id}">Remove</button>`}
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
        <p class="lede">They sign in on the Parents door with this email and password. Supabase will email them a confirmation first.</p>
        <label>Name<input name="name" required value="${esc(draft.name || "")}"></label>
        <label>Email<input name="email" type="email" required value="${esc(draft.email || "")}"></label>
        <label>Password<input name="password" type="password" minlength="8" required autocomplete="new-password"></label>
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
        <p class="lede">They tap their name on the Kids door and enter this PIN.</p>
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

  chart() {
    const pending = db.chores.filter((chore) => chore.status === "submitted");
    return shell(
      db.family.name,
      "Chart",
      `<div class="stack">
        ${
          db.kids
            .map(
              (child) => `<section class="card stack"><div class="who"><span class="swatch ${esc(child.color)}"></span><strong>${esc(child.name)}</strong></div>${balances(child)}${
                grounded(child)
                  ? `<div class="banner">Grounded until ${esc(when(child.groundedUntil))}. Match that in Screen Time. <button class="btn small ghost" data-action="lift-one" data-id="${child.id}">Lift</button></div>`
                  : ""
              }</section>`
            )
            .join("") || `<div class="card">Add a kid before you build the chart.</div>`
        }
        <section class="card">
          <div class="section-title"><h2>Waiting on you</h2></div>
          ${
            pending.length
              ? pending
                  .map((chore) => {
                    const child = kidById(chore.kidId);
                    return `<div class="chore"><div><strong>${esc(chore.title)}</strong><div class="tiny muted">${esc(child?.name || "")} · ${payLabel(chore)}</div></div><button class="btn small leaf" data-action="approve-chore" data-id="${chore.id}">Approve</button></div>`;
                  })
                  .join("")
              : `<p class="muted">Nothing to approve.</p>`
          }
        </section>
        <section class="card">
          <div class="section-title"><h2>On the chart</h2></div>
          ${
            db.chores.length
              ? db.chores
                  .map((chore) => {
                    const child = kidById(chore.kidId);
                    return `<div class="chore"><div><strong>${esc(chore.title)}</strong><div class="tiny muted">${esc(child?.name || "")} · ${chore.status === "submitted" ? "Marked done" : "Open"}</div></div></div>`;
                  })
                  .join("")
              : `<p class="muted">No open chores.</p>`
          }
          <form class="stack" data-action="add-chore" style="margin-top:12px">
            <div class="two">
              <label>Chore<input name="title" required placeholder="Make the bed"></label>
              <label>Kid<select name="kidId" required>${db.kids.map((child) => `<option value="${child.id}">${esc(child.name)}</option>`).join("")}</select></label>
              <label>Points<input name="points" type="number" min="0" value="2"></label>
              <button class="btn leaf" type="submit" ${db.kids.length ? "" : "disabled"}>Add</button>
            </div>
          </form>
        </section>
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
          <form class="stack" data-action="ground">
            <label>Kid<select name="kidId">${db.kids.map((child) => `<option value="${child.id}">${esc(child.name)}</option>`).join("")}</select></label>
            <label>Until<input name="until" type="datetime-local" required></label>
            <label>Reason<input name="reason" required placeholder="What happened"></label>
            <label class="row" style="font-weight:700"><input type="checkbox" name="clearMinutes" style="width:auto"> Clear device minutes</label>
            <button class="btn clay" ${db.kids.length ? "" : "disabled"}>Save grounding</button>
          </form>
          ${route.error ? `<p class="error">${esc(route.error)}</p>` : ""}
        </section>
        <section class="card">
          <h2 class="page-title">Latest</h2>
          ${db.activity.slice(0, 8).map((row) => `<div class="item"><div>${esc(row.text)}</div><div class="tiny muted">${esc(when(row.at))}</div></div>`).join("") || `<p class="muted">Nothing yet.</p>`}
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
          <p class="lede">Kids can cash points in right away. ${db.family.pointsPerDollar} points = $1. ${db.family.pointsPer30} points = 30 device minutes. You still add those minutes in Screen Time.</p>
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
      `Hi, ${child.name}`,
      db.family.name,
      `<div class="stack">
        ${balances(child)}
        ${grounded(child) ? `<div class="banner">Devices are grounded until ${esc(when(child.groundedUntil))}.</div>` : ""}
        <section class="card">
          <h2 class="page-title">Today</h2>
          ${
            mine.length
              ? mine
                  .map(
                    (chore) => `<div class="chore"><div><strong>${esc(chore.title)}</strong><div class="tiny muted">${payLabel(chore)}</div></div>${
                      chore.status === "submitted" ? `<span class="chip">Waiting</span>` : `<button class="btn small leaf" data-action="done" data-id="${chore.id}">Done</button>`
                    }</div>`
                  )
                  .join("")
              : `<p class="muted">Nothing on your chart right now.</p>`
          }
        </section>
      </div>`,
      kidNav("today")
    );
  },

  "kid-shop"() {
    const child = kid();
    return shell(
      "Shop",
      child.name,
      `<div class="stack">
        ${balances(child)}
        <section class="card stack">
          <h2 class="page-title">Cash in</h2>
          <p class="lede">${db.family.pointsPerDollar} points become $1.00 in your cash balance.</p>
          <button class="btn leaf" data-action="cash-out" ${child.points >= db.family.pointsPerDollar ? "" : "disabled"}>Cash out ${db.family.pointsPerDollar} points</button>
        </section>
        <section class="card stack">
          <h2 class="page-title">Device time</h2>
          <p class="lede">${db.family.pointsPer30} points become 30 minutes. A parent adds that time in Screen Time.</p>
          ${
            grounded(child)
              ? `<div class="banner">Device packs are closed while you are grounded.</div>`
              : `<button class="btn sun" data-action="buy-time" ${child.points >= db.family.pointsPer30 ? "" : "disabled"}>Buy 30 minutes</button>`
          }
        </section>
        <section class="card">
          <h2 class="page-title">Ask for something</h2>
          ${
            db.items.length
              ? db.items
                  .map((item) => {
                    const held = db.requests.some((req) => req.itemId === item.id && req.status === "pending");
                    return `<div class="item"><div><strong>${esc(item.name)}</strong><div class="tiny muted">${item.cost} points</div></div>${
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
      "Your account",
      `<div class="stack">
        <section class="card who"><span class="swatch ${esc(child.color)}"></span><div><strong>${esc(child.name)}</strong><div class="tiny muted">Kid account · PIN set by a parent</div></div></section>
        ${balances(child)}
        <section class="card">
          <h2 class="page-title">Latest</h2>
          ${db.activity.map((row) => `<div class="item"><div>${esc(row.text)}</div></div>`).join("") || `<p class="muted">When you finish a chore, it shows up here.</p>`}
        </section>
      </div>`,
      kidNav("me")
    );
  },
};

app.addEventListener("input", (event) => {
  if (event.target.name) draft[event.target.name] = event.target.value;
});

app.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-action]");
  if (!btn || btn.tagName === "FORM") return;
  const action = btn.dataset.action;
  if (action === "goto") go(btn.dataset.to);
  if (action === "home") go(db.session?.role === "kid" ? "today" : db.session ? "family" : "welcome");
  if (action === "auth-mode") go("parent-auth", { mode: btn.dataset.mode, email: draft.email || "" });
  if (action === "kids-door") openKidGate();
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
  if (action === "done") run(() => rpc("kid_mark_done", { p_token: sessionStorage.getItem(KID_TOKEN), p_chore: btn.dataset.id }), "Marked done. A parent still has to approve it.");
  if (action === "cash-out") run(() => rpc("kid_cash_out", { p_token: sessionStorage.getItem(KID_TOKEN) }), "$1.00 added to your cash balance.");
  if (action === "buy-time") run(() => rpc("kid_buy_time", { p_token: sessionStorage.getItem(KID_TOKEN) }), "30 minutes added. A parent still turns that on in Screen Time.");
  if (action === "ask") run(() => rpc("kid_ask", { p_token: sessionStorage.getItem(KID_TOKEN), p_item: btn.dataset.id }), "Asked. A parent has the points until they say yes or hand them back.");
  if (action === "fulfill") run(() => rpc("fulfill_request", { p_request: btn.dataset.id }));
  if (action === "deny") run(() => rpc("deny_request", { p_request: btn.dataset.id }), "Points returned.");
  if (action === "remove-item") run(() => rpc("remove_item", { p_item: btn.dataset.id }));
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
  if (action === "save-code") saveCode(data);
  if (action === "add-chore") run(() => rpc("add_chore", { p_kid: data.kidId, p_title: data.title, p_points: Number(data.points) || 0 }), "Chore added.");
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
  const creating = route.mode !== "signin";
  if (busy) return;
  busy = true;
  try {
    if (creating) {
      const { data: created, error } = await supabase.auth.signUp({
        email,
        password: data.password,
        options: { data: { name: data.name.trim(), family_name: (data.family || "Our family").trim() } },
      });
      if (error) throw error;
      if (!created.user || created.user.identities?.length === 0) {
        throw new Error("That email already has an account. Sign in instead.");
      }
      if (!created.session) {
        notice = "Check that email and confirm it, then sign in. Use the password you just chose.";
        route = { name: "parent-auth", mode: "signin", email, error: "" };
        draft = { email };
        render();
        return;
      }
      await loadParent();
      notice = "Parent account ready. Add kids and other parents next.";
      route = { name: "family" };
      render();
      return;
    }
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
    notice = `${person} can sign in on the Parents door after they confirm the email. The password is the one you set.`;
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
    `${data.name.trim()} can sign in on the Kids door with that PIN.`,
    "family"
  );
}

async function savePin(data) {
  await run(() => rpc("set_kid_pin", { p_kid: route.id, p_pin: data.pin }), "PIN updated.", "family");
}

async function saveCode(data) {
  const code = data.code.trim();
  localStorage.setItem(CODE_KEY, code);
  draft.code = code;
  const { data: rows, error } = await supabase.rpc("list_kids", { p_code: code });
  if (error) {
    route.error = nice(error);
  } else {
    gateKids = rows || [];
    route.error = gateKids.length ? "" : "No kids for that code yet.";
  }
  render();
}

async function openKidGate() {
  const code = localStorage.getItem(CODE_KEY) || "";
  draft = { code };
  gateKids = [];
  if (schemaReady && code) {
    const { data: rows } = await supabase.rpc("list_kids", { p_code: code });
    gateKids = rows || [];
  }
  route = { name: "kid-gate" };
  render();
}

async function onPin(key) {
  draft.pin = draft.pin || "";
  if (key === "clear") draft.pin = draft.pin.slice(0, -1);
  else if (key === "go") {
    const { data: token, error } = await supabase.rpc("kid_sign_in", { p_kid: route.kidId, p_pin: draft.pin });
    if (error || !token) {
      draft.pin = "";
      route.error = "That PIN does not match.";
      render();
      return;
    }
    sessionStorage.setItem(KID_TOKEN, token);
    await loadKid();
    notice = "";
    route = { name: "today" };
    render();
    return;
  } else if (draft.pin.length < 4) draft.pin += key;
  render();
}

async function signOut() {
  sessionStorage.removeItem(KID_TOKEN);
  if (db.session?.role === "parent") await supabase.auth.signOut();
  db = blank();
  notice = "";
  go("welcome");
}

boot();
