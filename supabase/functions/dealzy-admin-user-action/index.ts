// Compatibility endpoint for account actions used by older Dealzy clients.
const BASE = Deno.env.get("SUPABASE_URL") ?? "";
const PUBLIC_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "https://dealzy-v1.vercel.app",
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
  const action = body.action === "update_profile" ? "update_identity" : String(body.action ?? "");
  if (!["update_identity", "send_password_reset"].includes(action)) {
    return reply(400, { ok: false, error: "Unknown action" });
  }
  try {
    const response = await fetch(BASE + "/functions/v1/dealzy-admin-user-auth", {
      method: "POST",
      headers: { apikey: PUBLIC_KEY, Authorization: authorization, "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, action, target_user: target }),
    });
    const result = await response.json().catch(() => ({ ok: false, error: "Invalid upstream response" }));
    return reply(response.status, result);
  } catch {
    return reply(503, { ok: false, error: "User administration unavailable" });
  }
});
