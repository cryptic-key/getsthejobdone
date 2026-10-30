const STORAGE_KEY = "gtjd-our-chart-v1";
const COLORS = ["leaf", "sun", "sky", "clay", "plum", "teal"];

const app = document.querySelector("#app");
let db = load();
let route = startRoute();
let draft = {};
let notice = "";

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved && saved.family) return saved;
  } catch (_) {}
  return blank();
}

function blank() {
  return {
    family: null,
    parents: [],
    kids: [],
    chores: [],
    items: [],
    requests: [],
    activity: [],
    session: null,
  };
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function startRoute() {
  if (!db.session) return { name: "welcome" };
  if (db.session.role === "parent" && parent()) return { name: "family" };
  if (db.session.role === "kid" && kid()) return { name: "today" };
  db.session = null;
  return { name: "welcome" };
}

function uid() {
  return crypto.randomUUID();
}

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function hashSecret(secret, salt) {
  const data = new TextEncoder().encode(`${salt}:${secret}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function needsFirstParent() {
  return !db.family || db.parents.length === 0;
}

function parent() {
  return db.parents.find((p) => p.id === db.session?.id) || null;
}

function kid() {
  return db.kids.find((k) => k.id === db.session?.id) || null;
}

function kidById(id) {
  return db.kids.find((k) => k.id === id) || null;
}

function money(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

function when(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function grounded(child) {
  return child.groundedUntil && new Date(child.groundedUntil).getTime() > Date.now();
}

function log(text) {
  db.activity.unshift({ id: uid(), text, at: new Date().toISOString() });
  db.activity = db.activity.slice(0, 40);
}

function go(name, extra) {
  route = { name, ...(extra || {}) };
  draft = {};
  notice = "";
  render();
}

function mark(svg) {
  return `<span class="mark" aria-hidden="true"><svg viewBox="0 0 24 24">${svg}</svg></span>`;
}

const check = `<path d="M5 12.5 9.2 17 19 7"/>`;

function shell(title, sub, body, nav) {
  const me = db.session?.role === "parent" ? parent() : kid();
  return `
    <header class="top">
      <button class="brand" data-action="home">
        ${mark(check)}
        <span>
          <h1>${esc(title)}</h1>
          <p>${esc(sub)}</p>
        </span>
      </button>
      ${me ? `<button class="btn ghost small" data-action="sign-out">Sign out</button>` : ""}
    </header>
    ${nav || ""}
    ${notice ? `<div class="banner info" style="margin-bottom:14px">${esc(notice)}</div>` : ""}
    ${body}
    <footer class="note">Saved in this browser for now. Screen Time still gets set by a parent in Settings.</footer>
  `;
}

function parentNav(current) {
  const tabs = [
    ["family", "Family"],
    ["chart", "Chart"],
    ["shop", "Shop"],
  ];
  return `<nav class="nav">${tabs
    .map(
      ([id, label]) =>
        `<button data-action="goto" data-to="${id}" ${current === id ? 'aria-current="page"' : ""}>${label}</button>`
    )
    .join("")}</nav>`;
}

function kidNav(current) {
  const tabs = [
    ["today", "Today"],
    ["kid-shop", "Shop"],
    ["me", "Me"],
  ];
  return `<nav class="nav">${tabs
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

function render() {
  const view = views[route.name] || views.welcome;
  app.innerHTML = view();
}

const views = {
  welcome() {
    const hasFamily = Boolean(db.family);
    return `
      <header class="top">
        <div class="brand">${mark(check)}<span><h1>Our chart</h1><p>Gets the job done</p></span></div>
      </header>
      <section class="hero">
        <h2>Chores, rewards, and device time.</h2>
        <p class="lede">Parents keep the accounts. Kids open the chart with a PIN.</p>
      </section>
      <div class="doors">
        <button class="door leaf" data-action="goto" data-to="parent-auth">
          <span><strong>Parents</strong><span>${needsFirstParent() ? "Create the first parent account." : "Sign in to add people, chores, and rewards."}</span></span>
          <span class="btn small leaf">Open</span>
        </button>
        <button class="door sun" data-action="goto" data-to="kid-gate">
          <span><strong>Kids</strong><span>${db.kids.length ? "Tap your name and enter your PIN." : "A parent adds you first."}</span></span>
          <span class="btn small sun">Open</span>
        </button>
      </div>`;
  },

  "parent-auth"() {
    const creating = needsFirstParent();
    const title = creating ? "Create a parent account" : "Parent sign in";
    return shell(
      "Our chart",
      db.family ? db.family.name : "New family",
      `<form class="card stack" data-action="parent-auth-submit">
        <div class="section-title"><h2>${title}</h2></div>
        ${creating ? `<label>Your name<input name="name" autocomplete="name" required value="${esc(draft.name || "")}"></label>` : ""}
        ${creating && !db.family ? `<label>Family name<input name="family" required value="${esc(draft.family || "Our family")}"></label>` : ""}
        <label>Email<input name="email" type="email" autocomplete="username" required value="${esc(draft.email || "")}"></label>
        <label>Password<input name="password" type="password" autocomplete="${creating ? "new-password" : "current-password"}" required minlength="8"></label>
        ${route.error ? `<p class="error">${esc(route.error)}</p>` : ""}
        <button class="btn leaf wide" type="submit">${creating ? "Create account" : "Sign in"}</button>
        <button class="btn ghost wide" type="button" data-action="goto" data-to="welcome">Back</button>
      </form>`
    );
  },

  "kid-gate"() {
    if (!db.kids.length) {
      return shell(
        "Our chart",
        "Kids",
        `<div class="card stack">
          <h2 class="page-title">No kid accounts yet</h2>
          <p class="lede">A parent adds each kid from the Family page. Then that kid picks their name here.</p>
          <button class="btn ghost" data-action="goto" data-to="welcome">Back</button>
        </div>`
      );
    }
    const selected = route.kidId || "";
    return shell(
      "Our chart",
      "Who's here?",
      `<div class="stack">
        <div class="kid-grid">
          ${db.kids
            .map(
              (child) => `<button class="kid-pick" data-action="pick-kid" data-id="${child.id}" aria-pressed="${selected === child.id}">
                <span class="swatch ${esc(child.color)}"></span>
                <strong style="display:block;margin-top:8px">${esc(child.name)}</strong>
              </button>`
            )
            .join("")}
        </div>
        ${
          selected
            ? `<div class="card">
                <h2 class="page-title" style="text-align:center">PIN for ${esc(kidById(selected).name)}</h2>
                <div class="pin-dots">${[0, 1, 2, 3].map((i) => `<i class="${(draft.pin || "").length > i ? "on" : ""}"></i>`).join("")}</div>
                ${route.error ? `<p class="error" style="text-align:center">${esc(route.error)}</p>` : ""}
                <div class="pad">
                  ${["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "go"]
                    .map((key) => {
                      const label = key === "clear" ? "⌫" : key === "go" ? "Go" : key;
                      return `<button type="button" data-action="pin" data-key="${key}">${label}</button>`;
                    })
                    .join("")}
                </div>
              </div>`
            : `<p class="hint">Pick a name, then enter the 4-digit PIN a parent set.</p>`
        }
        <button class="btn ghost" data-action="goto" data-to="welcome">Back</button>
      </div>`
    );
  },

  family() {
    const me = parent();
    return shell(
      db.family.name,
      me.name,
      `<div class="split">
        <section class="card">
          <div class="section-title"><h2>Parents</h2><button class="btn small leaf" data-action="goto" data-to="add-parent">Add</button></div>
          ${db.parents
            .map(
              (p) => `<div class="person">
                <div>
                  <strong>${esc(p.name)}</strong>
                  <div class="tiny muted">${esc(p.email)}${p.id === me.id ? " · You" : ""}</div>
                </div>
                ${p.id === me.id ? "" : `<button class="btn ghost small" data-action="remove-parent" data-id="${p.id}">Remove</button>`}
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
                      <div class="who">
                        <span class="swatch ${esc(child.color)}"></span>
                        <div>
                          <strong>${esc(child.name)}</strong>
                          <div class="tiny muted">${child.points} pts · ${money(child.cashCents)} · ${child.minutes} min${grounded(child) ? " · grounded" : ""}</div>
                        </div>
                      </div>
                      <button class="btn ghost small" data-action="edit-pin" data-id="${child.id}">PIN</button>
                    </div>`
                  )
                  .join("")
              : `<p class="muted">No kids yet. Add the first one.</p>`
          }
        </section>
      </div>`,
      parentNav("family")
    );
  },

  "add-parent"() {
    return shell(
      db.family.name,
      "Add a parent",
      `<form class="card stack" data-action="add-parent-submit">
        <p class="lede">They sign in on the Parents door with this email and password.</p>
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
              (c) => `<button type="button" class="swatch ${c}" data-action="color" data-color="${c}" aria-pressed="${color === c}" aria-label="${c}"></button>`
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
    const pending = db.chores.filter((c) => c.status === "submitted");
    const open = db.chores.filter((c) => c.status === "open" || c.status === "submitted");
    return shell(
      db.family.name,
      "Chart",
      `<div class="stack">
        ${db.kids.map((child) => `<section class="card stack"><div class="who"><span class="swatch ${esc(child.color)}"></span><strong>${esc(child.name)}</strong></div>${balances(child)}${grounded(child) ? `<div class="banner">Grounded until ${esc(when(child.groundedUntil))}. Match that in Screen Time. <button class="btn small ghost" data-action="lift-one" data-id="${child.id}">Lift</button></div>` : ""}</section>`).join("") || `<div class="card">Add a kid before you build the chart.</div>`}
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
            open.length
              ? open
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
              <label>Kid<select name="kidId" required>${db.kids.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></label>
              <label>Points<input name="points" type="number" min="0" value="2"></label>
              <button class="btn leaf" type="submit" ${db.kids.length ? "" : "disabled"}>Add</button>
            </div>
          </form>
        </section>
        <section class="card stack">
          <h2 class="page-title">Grant or ground</h2>
          <form class="stack" data-action="grant">
            <div class="two">
              <label>Kid<select name="kidId">${db.kids.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></label>
              <label>Points<input name="points" type="number" min="0" value="0"></label>
              <label>Cash $<input name="dollars" type="number" min="0" step="0.01" value="0"></label>
              <label>Minutes<input name="minutes" type="number" min="0" value="0"></label>
            </div>
            <label>Note<input name="note" placeholder="Good report"></label>
            <button class="btn sun" ${db.kids.length ? "" : "disabled"}>Grant reward</button>
          </form>
          <form class="stack" data-action="ground">
            <label>Kid<select name="kidId">${db.kids.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></label>
            <label>Until<input name="until" type="datetime-local" required></label>
            <label>Reason<input name="reason" required placeholder="What happened"></label>
            <label class="row" style="font-weight:700"><input type="checkbox" name="clearMinutes" style="width:auto"> Clear device minutes</label>
            <button class="btn clay" ${db.kids.length ? "" : "disabled"}>Save grounding</button>
          </form>
          ${route.error ? `<p class="error">${esc(route.error)}</p>` : ""}
        </section>
        <section class="card">
          <h2 class="page-title">Latest</h2>
          ${db.activity.slice(0, 8).map((a) => `<div class="item"><div>${esc(a.text)}</div><div class="tiny muted">${esc(when(a.at))}</div></div>`).join("") || `<p class="muted">Nothing yet.</p>`}
        </section>
      </div>`,
      parentNav("chart")
    );
  },

  shop() {
    const pending = db.requests.filter((r) => r.status === "pending");
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
                    const item = db.items.find((i) => i.id === req.itemId);
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
    const mine = db.chores.filter((c) => c.kidId === child.id && c.status !== "approved");
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
                    (chore) => `<div class="chore">
                      <div><strong>${esc(chore.title)}</strong><div class="tiny muted">${payLabel(chore)}</div></div>
                      ${chore.status === "submitted" ? `<span class="chip">Waiting</span>` : `<button class="btn small leaf" data-action="done" data-id="${chore.id}">Done</button>`}
                    </div>`
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
    const dollarBlocks = Math.floor(child.points / db.family.pointsPerDollar);
    const timeBlocks = Math.floor(child.points / db.family.pointsPer30);
    return shell(
      "Shop",
      child.name,
      `<div class="stack">
        ${balances(child)}
        <section class="card stack">
          <h2 class="page-title">Cash in</h2>
          <p class="lede">${db.family.pointsPerDollar} points become $1.00 in your cash balance.</p>
          <button class="btn leaf" data-action="cash-out" ${dollarBlocks ? "" : "disabled"}>Cash out ${db.family.pointsPerDollar} points</button>
        </section>
        <section class="card stack">
          <h2 class="page-title">Device time</h2>
          <p class="lede">${db.family.pointsPer30} points become 30 minutes. A parent adds that time in Screen Time.</p>
          ${grounded(child) ? `<div class="banner">Device packs are closed while you are grounded.</div>` : `<button class="btn sun" data-action="buy-time" ${timeBlocks ? "" : "disabled"}>Buy 30 minutes</button>`}
        </section>
        <section class="card">
          <h2 class="page-title">Ask for something</h2>
          ${
            db.items.length
              ? db.items
                  .map((item) => {
                    const held = db.requests.some((r) => r.kidId === child.id && r.itemId === item.id && r.status === "pending");
                    return `<div class="item"><div><strong>${esc(item.name)}</strong><div class="tiny muted">${item.cost} points</div></div>${held ? `<span class="chip">Asked</span>` : `<button class="btn small" data-action="ask" data-id="${item.id}" ${child.points >= item.cost ? "" : "disabled"}>Ask</button>`}</div>`;
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
    const mine = db.activity.filter((a) => a.text.includes(child.name)).slice(0, 8);
    return shell(
      child.name,
      "Your account",
      `<div class="stack">
        <section class="card who">
          <span class="swatch ${esc(child.color)}"></span>
          <div><strong>${esc(child.name)}</strong><div class="tiny muted">Kid account · PIN set by a parent</div></div>
        </section>
        ${balances(child)}
        <section class="card">
          <h2 class="page-title">Latest</h2>
          ${mine.map((a) => `<div class="item"><div>${esc(a.text)}</div></div>`).join("") || `<p class="muted">When you finish a chore, it shows up here.</p>`}
        </section>
      </div>`,
      kidNav("me")
    );
  },
};

function payLabel(chore) {
  const parts = [];
  if (chore.points) parts.push(`${chore.points} pts`);
  if (chore.cashCents) parts.push(money(chore.cashCents));
  if (chore.minutes) parts.push(`${chore.minutes} min`);
  return parts.join(" · ") || "No pay set";
}

app.addEventListener("input", (event) => {
  const el = event.target;
  if (el.name) draft[el.name] = el.value;
});

app.addEventListener("click", (event) => {
  const btn = event.target.closest("[data-action]");
  if (!btn || btn.tagName === "FORM") return;
  const action = btn.dataset.action;
  if (action === "goto") go(btn.dataset.to);
  if (action === "home") go(db.session?.role === "kid" ? "today" : db.session ? "family" : "welcome");
  if (action === "sign-out") {
    db.session = null;
    save();
    go("welcome");
  }
  if (action === "pick-kid") {
    route = { name: "kid-gate", kidId: btn.dataset.id };
    draft.pin = "";
    render();
  }
  if (action === "pin") onPin(btn.dataset.key);
  if (action === "color") {
    draft.color = btn.dataset.color;
    render();
  }
  if (action === "remove-parent") removeParent(btn.dataset.id);
  if (action === "edit-pin") go("edit-pin", { id: btn.dataset.id });
  if (action === "remove-kid") removeKid(btn.dataset.id);
  if (action === "approve-chore") approveChore(btn.dataset.id);
  if (action === "done") markDone(btn.dataset.id);
  if (action === "cash-out") cashOut();
  if (action === "buy-time") buyTime();
  if (action === "ask") askItem(btn.dataset.id);
  if (action === "fulfill") fulfill(btn.dataset.id);
  if (action === "deny") deny(btn.dataset.id);
  if (action === "remove-item") {
    db.items = db.items.filter((item) => item.id !== btn.dataset.id);
    save();
    render();
  }
  if (action === "lift-one") liftOne(btn.dataset.id);
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
  if (action === "add-chore") addChore(data);
  if (action === "grant") grant(data);
  if (action === "ground") ground(data);
  if (action === "save-rates") saveRates(data);
  if (action === "add-item") addItem(data);
});

async function parentAuth(data) {
  const email = data.email.trim().toLowerCase();
  if (needsFirstParent()) {
    if (!data.name.trim() || data.password.length < 8) return fail("Use a name and a password of at least 8 characters.");
    const salt = uid();
    if (!db.family) {
      db.family = {
        name: (data.family || "Our family").trim() || "Our family",
        pointsPerDollar: 10,
        pointsPer30: 4,
      };
    }
    const id = uid();
    db.parents.push({ id, name: data.name.trim(), email, salt, passHash: await hashSecret(data.password, salt) });
    db.session = { role: "parent", id };
    log(`${data.name.trim()} created the parent account.`);
    save();
    notice = "Parent account ready. Add kids and other parents next.";
    route = { name: "family" };
    draft = {};
    render();
    return;
  }
  const found = db.parents.find((p) => p.email === email);
  if (!found || (await hashSecret(data.password, found.salt)) !== found.passHash) {
    return fail("That email and password do not match a parent account.");
  }
  db.session = { role: "parent", id: found.id };
  save();
  go("family");
}

async function addParent(data) {
  const email = data.email.trim().toLowerCase();
  if (!data.name.trim()) return fail("Add a name.");
  if (data.password.length < 8) return fail("Use a password of at least 8 characters.");
  if (db.parents.some((p) => p.email === email)) return fail("A parent already uses that email.");
  const salt = uid();
  const id = uid();
  db.parents.push({ id, name: data.name.trim(), email, salt, passHash: await hashSecret(data.password, salt) });
  log(`${parent().name} added parent ${data.name.trim()}.`);
  save();
  notice = `${data.name.trim()} can sign in on the Parents door.`;
  route = { name: "family" };
  draft = {};
  render();
}

async function addKid(data) {
  const name = data.name.trim();
  if (!name) return fail("Add a name.");
  if (!/^\d{4}$/.test(data.pin)) return fail("The PIN needs 4 digits.");
  const salt = uid();
  db.kids.push({
    id: uid(),
    name,
    color: draft.color || "leaf",
    salt,
    pinHash: await hashSecret(data.pin, salt),
    points: 0,
    cashCents: 0,
    minutes: 0,
    groundedUntil: null,
  });
  log(`${parent().name} added ${name}.`);
  save();
  notice = `${name} can sign in on the Kids door with that PIN.`;
  route = { name: "family" };
  draft = {};
  render();
}

async function savePin(data) {
  const child = kidById(route.id);
  if (!child) return go("family");
  if (!/^\d{4}$/.test(data.pin)) return fail("The PIN needs 4 digits.");
  child.salt = uid();
  child.pinHash = await hashSecret(data.pin, child.salt);
  log(`${parent().name} changed ${child.name}'s PIN.`);
  save();
  notice = `PIN updated for ${child.name}.`;
  route = { name: "family" };
  render();
}

async function onPin(key) {
  draft.pin = draft.pin || "";
  if (key === "clear") draft.pin = draft.pin.slice(0, -1);
  else if (key === "go") {
    const child = kidById(route.kidId);
    if (child && (await hashSecret(draft.pin, child.salt)) === child.pinHash) {
      db.session = { role: "kid", id: child.id };
      save();
      go("today");
      return;
    }
    draft.pin = "";
    route.error = "That PIN does not match.";
  } else if (draft.pin.length < 4) draft.pin += key;
  render();
}

function removeParent(id) {
  const person = db.parents.find((p) => p.id === id);
  if (!person || person.id === parent().id) return;
  db.parents = db.parents.filter((p) => p.id !== id);
  log(`${parent().name} removed parent ${person.name}.`);
  save();
  render();
}

function removeKid(id) {
  const child = kidById(id);
  if (!child) return;
  db.kids = db.kids.filter((k) => k.id !== id);
  db.chores = db.chores.filter((c) => c.kidId !== id);
  db.requests = db.requests.filter((r) => r.kidId !== id);
  log(`${parent().name} removed ${child.name}.`);
  save();
  notice = `${child.name} was removed.`;
  route = { name: "family" };
  render();
}

function addChore(data) {
  const title = data.title.trim();
  if (!title || !data.kidId) return;
  db.chores.push({
    id: uid(),
    kidId: data.kidId,
    title,
    points: Number(data.points) || 0,
    cashCents: 0,
    minutes: 0,
    status: "open",
  });
  log(`${parent().name} added “${title}” for ${kidById(data.kidId).name}.`);
  save();
  render();
}

function markDone(id) {
  const chore = db.chores.find((c) => c.id === id && c.kidId === kid().id);
  if (!chore || chore.status !== "open") return;
  chore.status = "submitted";
  log(`${kid().name} marked “${chore.title}” done.`);
  save();
  notice = "Marked done. A parent still has to approve it.";
  render();
}

function approveChore(id) {
  const chore = db.chores.find((c) => c.id === id);
  const child = chore && kidById(chore.kidId);
  if (!chore || !child || chore.status === "approved") return;
  chore.status = "approved";
  child.points += chore.points;
  child.cashCents += chore.cashCents;
  if (!grounded(child)) child.minutes += chore.minutes;
  log(`${parent().name} approved “${chore.title}” for ${child.name}.`);
  save();
  notice = chore.minutes && !grounded(child) ? `Add ${chore.minutes} minutes in Screen Time for ${child.name}.` : `${child.name} was paid.`;
  render();
}

function grant(data) {
  const child = kidById(data.kidId);
  if (!child) return;
  const points = Math.max(0, Number(data.points) || 0);
  const cashCents = Math.round(Math.max(0, Number(data.dollars) || 0) * 100);
  const minutes = Math.max(0, Number(data.minutes) || 0);
  if (!points && !cashCents && !minutes) return fail("Add points, cash, or minutes.");
  child.points += points;
  child.cashCents += cashCents;
  if (minutes && !grounded(child)) child.minutes += minutes;
  const note = data.note.trim() || "Reward";
  log(`${parent().name} granted ${child.name}: ${note}.`);
  save();
  notice = minutes ? `Reward saved. Add ${minutes} minutes in Screen Time for ${child.name}.` : "Reward saved.";
  route = { name: "chart" };
  render();
}

function ground(data) {
  const child = kidById(data.kidId);
  if (!child || !data.until || !data.reason.trim()) return fail("Pick an end time and a reason.");
  child.groundedUntil = new Date(data.until).toISOString();
  if (data.clearMinutes) child.minutes = 0;
  log(`${parent().name} grounded ${child.name} until ${when(child.groundedUntil)}. ${data.reason.trim()}`);
  save();
  notice = `Grounding saved until ${when(child.groundedUntil)}. Set the same end time in Screen Time.`;
  route = { name: "chart" };
  render();
}

function liftOne(id) {
  const child = kidById(id);
  if (!child) return;
  child.groundedUntil = null;
  log(`${parent().name} lifted ${child.name}'s grounding.`);
  save();
  notice = `Grounding lifted for ${child.name}. Turn it off in Screen Time too.`;
  render();
}

function saveRates(data) {
  db.family.pointsPerDollar = Math.max(1, Number(data.pointsPerDollar) || 10);
  db.family.pointsPer30 = Math.max(1, Number(data.pointsPer30) || 4);
  save();
  notice = "Rates saved.";
  render();
}

function addItem(data) {
  const name = data.name.trim();
  const cost = Number(data.cost);
  if (!name || cost < 1) return;
  db.items.push({ id: uid(), name, cost });
  save();
  render();
}

function cashOut() {
  const child = kid();
  const cost = db.family.pointsPerDollar;
  if (child.points < cost) return;
  child.points -= cost;
  child.cashCents += 100;
  log(`${child.name} cashed ${cost} points for $1.00.`);
  save();
  notice = "$1.00 added to your cash balance.";
  render();
}

function buyTime() {
  const child = kid();
  if (grounded(child)) return;
  const cost = db.family.pointsPer30;
  if (child.points < cost) return;
  child.points -= cost;
  child.minutes += 30;
  log(`${child.name} bought 30 device minutes.`);
  save();
  notice = "30 minutes added. A parent still turns that on in Screen Time.";
  render();
}

function askItem(id) {
  const child = kid();
  const item = db.items.find((entry) => entry.id === id);
  if (!item || child.points < item.cost) return;
  child.points -= item.cost;
  db.requests.push({ id: uid(), kidId: child.id, itemId: item.id, cost: item.cost, status: "pending" });
  log(`${child.name} asked for ${item.name}.`);
  save();
  notice = `Asked for ${item.name}. A parent has the points until they say yes or hand them back.`;
  render();
}

function fulfill(id) {
  const req = db.requests.find((r) => r.id === id);
  const item = req && db.items.find((i) => i.id === req.itemId);
  const child = req && kidById(req.kidId);
  if (!req || req.status !== "pending") return;
  req.status = "approved";
  log(`${parent().name} handed ${child.name} ${item?.name || "an item"}.`);
  save();
  render();
}

function deny(id) {
  const req = db.requests.find((r) => r.id === id);
  const child = req && kidById(req.kidId);
  const item = req && db.items.find((i) => i.id === req.itemId);
  if (!req || !child || req.status !== "pending") return;
  req.status = "denied";
  child.points += req.cost;
  log(`${parent().name} returned ${req.cost} points to ${child.name} for ${item?.name || "an item"}.`);
  save();
  render();
}

function fail(message) {
  route.error = message;
  render();
}

render();
