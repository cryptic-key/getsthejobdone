import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, VAPID_PUBLIC_KEY } from "./config.js";

function urlBase64ToUint8Array(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((ch) => ch.charCodeAt(0)));
}

export async function registerAdventureWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("./sw.js", { scope: "./" });
  } catch {
    return null;
  }
}

async function currentSubscription() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export async function ensurePushSubscription({ role, supabase, kidToken }) {
  if (!VAPID_PUBLIC_KEY || !("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return false;
  }
  await registerAdventureWorker();
  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") return false;

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }
  const json = sub.toJSON();
  const endpoint = json.endpoint;
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!endpoint || !p256dh || !auth) return false;

  if (role === "parent") {
    const { error } = await supabase.rpc("save_parent_push", {
      p_endpoint: endpoint,
      p_p256dh: p256dh,
      p_auth: auth,
      p_user_agent: navigator.userAgent.slice(0, 180),
    });
    return !error;
  }
  if (role === "kid" && kidToken) {
    const { error } = await supabase.rpc("save_kid_push", {
      p_token: kidToken,
      p_endpoint: endpoint,
      p_p256dh: p256dh,
      p_auth: auth,
      p_user_agent: navigator.userAgent.slice(0, 180),
    });
    return !error;
  }
  return false;
}

export async function clearPushSubscription({ role, supabase, kidToken }) {
  const sub = await currentSubscription();
  if (!sub) return;
  const endpoint = sub.endpoint;
  try {
    if (role === "parent") await supabase.rpc("remove_push", { p_endpoint: endpoint });
    if (role === "kid" && kidToken) await supabase.rpc("remove_kid_push", { p_token: kidToken, p_endpoint: endpoint });
  } catch {
    /* ignore */
  }
  try {
    await sub.unsubscribe();
  } catch {
    /* ignore */
  }
}

async function authHeader(supabase) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token || SUPABASE_PUBLISHABLE_KEY;
  return {
    "Content-Type": "application/json",
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${token}`,
  };
}

export async function sendAdventurePush(supabase, payload) {
  try {
    const headers = await authHeader(supabase);
    await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
  } catch {
    /* push is best-effort */
  }
}
