// Compatibility endpoint for older clients. All writes are forwarded to the
// checked user-auth function or the checked role RPC using the caller's JWT.
const BASE = Deno.env.get("SUPABASE_URL") ?? "";
const PUBLIC_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const ORIGIN = "https://dealzy-v1.vercel.app";
const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return reply(405, { ok: false, error: "Method not allowed" });
  const authorization = request.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return reply(401, { ok: false, error: "Unauthorized" });

  const body = await request.json().catch(() => ({}));
  const target = String(body.user_id ?? "");
  if (!target) return reply(400, { ok: false, error: "user_id required" });
  const action = String(body.action ?? "");
  try {
    const roleAction = action === "set_role";
    if (!roleAction && !["update_identity", "set_status", "set_password", "send_password_reset"].includes(action)) {
      return reply(400, { ok: false, error: "Unknown action" });
    }
    const endpoint = roleAction ? "/rest/v1/rpc/dealzy_superadmin_set_staff" : "/functions/v1/dealzy-admin-user-auth";
    const payload = roleAction
      ? { target_user: target, new_role: body.role }
      : { ...body, target_user: target };
    const response = await fetch(BASE + endpoint, {
      method: "POST",
      headers: { apikey: PUBLIC_KEY, Authorization: authorization, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({ ok: false, error: "Invalid upstream response" }));
    return reply(response.status, result);
  } catch {
    return reply(503, { ok: false, error: "User administration unavailable" });
  }
});
