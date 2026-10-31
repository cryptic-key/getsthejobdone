import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

function reply(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers });
}

type Target = { endpoint: string; p256dh: string; auth: string };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return reply({ error: "POST only" }, 405);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return reply({ error: "Bad JSON" }, 400);
  }

  const audience = String(body.audience || "");
  const title = String(body.title || "").trim();
  const text = String(body.body || "").trim();
  const url = String(body.url || "./");
  const tag = String(body.tag || "adventure");
  const kidToken = String(body.kid_token || "");
  const kidIds = Array.isArray(body.kid_ids) ? body.kid_ids.map(String).filter(Boolean) : null;

  if (!title || !text || (audience !== "parents" && audience !== "kids")) {
    return reply({ error: "Missing title, body, or audience" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) return reply({ error: "Server not configured" }, 500);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const authHeader = req.headers.get("Authorization") || "";
  const callerClient = createClient(supabaseUrl, anonKey || serviceKey, {
    global: { headers: authHeader ? { Authorization: authHeader } : {} },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const resolved = await callerClient.rpc("resolve_push_caller", {
    p_kid_token: kidToken || null,
  });
  if (resolved.error || !resolved.data?.householdId) {
    return reply({ error: resolved.error?.message || "Sign in again." }, 401);
  }

  const caller = resolved.data as {
    role: string;
    householdId: string;
    name?: string;
    kidId?: string;
  };

  if (audience === "parents" && caller.role !== "kid") {
    return reply({ error: "Kids notify parents." }, 403);
  }
  if (audience === "kids" && caller.role !== "parent") {
    return reply({ error: "Parents notify kids." }, 403);
  }

  const vapid = await admin.rpc("push_vapid_keys");
  if (vapid.error || !vapid.data?.publicKey || !vapid.data?.privateKey) {
    return reply({ error: "Push keys missing" }, 500);
  }
  webpush.setVapidDetails(
    String(vapid.data.subject || "mailto:family@getsthejobdone.ca"),
    String(vapid.data.publicKey),
    String(vapid.data.privateKey)
  );

  const targets = await admin.rpc("list_push_targets", {
    p_household: caller.householdId,
    p_audience: audience,
    p_kid_ids: audience === "kids" ? kidIds : null,
  });
  if (targets.error) return reply({ error: targets.error.message }, 500);

  const rows = (targets.data || []) as Target[];
  const payload = JSON.stringify({ title, body: text, url, tag });
  let sent = 0;
  const stale: string[] = [];

  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          payload
        );
        sent += 1;
      } catch (error) {
        const status = Number((error as { statusCode?: number })?.statusCode || 0);
        if (status === 404 || status === 410) stale.push(row.endpoint);
      }
    })
  );

  if (stale.length) {
    await admin.from("push_subscriptions").delete().in("endpoint", stale);
  }

  return reply({ ok: true, sent, total: rows.length });
});
