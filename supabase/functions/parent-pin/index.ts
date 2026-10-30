import { createClient } from "jsr:@supabase/supabase-js@2";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

function reply(body: Record<string, string>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return reply({ error: "Sign in again." }, 405);
  let parentId = "";
  let pin = "";
  try {
    const body = await req.json();
    parentId = String(body?.parent_id || "");
    pin = String(body?.pin || "");
  } catch {
    return reply({ error: "That PIN does not match." }, 400);
  }
  if (!/^[0-9a-f-]{36}$/i.test(parentId) || !/^[0-9]{4}$/.test(pin)) {
    return reply({ error: "That PIN does not match." }, 400);
  }
  const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const claimed = await admin.rpc("claim_parent_pin", { p_parent: parentId, p_pin: pin });
  if (claimed.error || !claimed.data) {
    const message = /too many tries/i.test(claimed.error?.message || "") ? "Too many tries. Wait a few minutes." : "That PIN does not match.";
    return reply({ error: message }, 401);
  }
  const user = await admin.auth.admin.getUserById(claimed.data);
  const email = user.data.user?.email;
  if (!email) return reply({ error: "That PIN does not match." }, 401);
  if (!user.data.user?.email_confirmed_at) {
    await admin.auth.admin.updateUserById(claimed.data, { email_confirm: true });
  }
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = link.data?.properties?.hashed_token;
  if (link.error || !tokenHash) return reply({ error: "Sign in again." }, 500);
  const verified = await admin.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
  const session = verified.data.session;
  if (verified.error || !session) return reply({ error: "Sign in again." }, 500);
  return reply({ access_token: session.access_token, refresh_token: session.refresh_token });
});
