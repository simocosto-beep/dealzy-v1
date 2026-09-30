import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.0";
import { targetActionDenied } from "./permissions.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ADMIN_ORIGIN = "https://admin.dealzyai.com";
const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, { auth:{ persistSession:false, autoRefreshToken:false } });

const ALLOWED_ORIGINS = new Set([
  ADMIN_ORIGIN,
  "https://dealzy-v1.vercel.app",
  "https://appassets.androidplatform.net"
]);

function corsHeadersFor(req:Request) {
  const origin=req.headers.get("Origin") || ADMIN_ORIGIN;
  const allowed=ALLOWED_ORIGINS.has(origin) ? origin : ADMIN_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(req:Request,status:number, body:unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersFor(req), "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function authAdmin(path:string, init:RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("apikey", SERVICE_KEY);
  headers.set("Authorization", "Bearer " + SERVICE_KEY);
  headers.set("Content-Type", "application/json");
  return fetch(SUPABASE_URL + "/auth/v1/admin" + path, { ...init, headers });
}

async function rest(path:string, init:RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("apikey", SERVICE_KEY);
  headers.set("Authorization", "Bearer " + SERVICE_KEY);
  headers.set("Content-Type", "application/json");
  return fetch(SUPABASE_URL + "/rest/v1/" + path, { ...init, headers });
}

async function callerFromJwt(authHeader:string) {
  const r = await fetch(SUPABASE_URL + "/auth/v1/user", {
    headers: { "apikey": ANON_KEY, "Authorization": authHeader },
  });
  if (!r.ok) return null;
  return await r.json();
}

async function getAdmin(userId:string) {
  const r = await rest("dealzy_admin_users?select=role,enabled&user_id=eq." + encodeURIComponent(userId) + "&limit=1");
  if (!r.ok) return null;
  const rows = await r.json();
  return Array.isArray(rows) ? rows[0] ?? null : null;
}

async function getAccountState(userId:string) {
  const r = await rest("dealzy_user_admin_state?select=status,reason&user_id=eq." + encodeURIComponent(userId) + "&limit=1");
  if (!r.ok) throw new Error("Could not verify admin account status");
  const rows = await r.json();
  return Array.isArray(rows) ? rows[0] ?? null : null;
}

async function getTargetUser(userId:string) {
  const r = await authAdmin("/users/" + encodeURIComponent(userId), { method:"GET" });
  if (!r.ok) return null;
  return await r.json();
}

async function audit(callerId:string, action:string, target:string, details:Record<string,unknown>={}) {
  const response = await rest("dealzy_admin_audit_log", {
    method:"POST",
    headers:{ "Prefer":"return=minimal" },
    body:JSON.stringify({ user_id:callerId, action, target, details }),
  });
  if (!response.ok) throw new Error("Could not record admin audit event");
}

async function upsertState(userId:string, payload:Record<string,unknown>) {
  const r = await rest("dealzy_user_admin_state?on_conflict=user_id", {
    method:"POST",
    headers:{ "Prefer":"resolution=merge-duplicates,return=minimal" },
    body:JSON.stringify({ user_id:userId, ...payload }),
  });
  if (!r.ok) throw new Error("Could not update user state");

  const r2 = await rest("dealzy_user_controls?on_conflict=user_id", {
    method:"POST",
    headers:{ "Prefer":"resolution=merge-duplicates,return=minimal" },
    body:JSON.stringify({
      user_id:userId,
      status:payload.status,
      reason:payload.reason ?? null,
      notes:payload.notes ?? null,
      updated_by:payload.updated_by ?? null,
      updated_at:payload.updated_at ?? new Date().toISOString()
    }),
  });
  if (!r2.ok) throw new Error("Could not update user controls");
}

async function updateAuthUser(userId:string, payload:Record<string,unknown>) {
  const r = await authAdmin("/users/" + encodeURIComponent(userId), {
    method:"PUT",
    body:JSON.stringify(payload),
  });
  const text = await r.text();
  let data:any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { message:text }; }
  if (!r.ok) throw new Error(data.msg || data.message || data.error_description || ("Auth update failed: " + r.status));
  return data;
}

Deno.serve(async (req:Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers:corsHeadersFor(req) });
  if (req.method !== "POST") return json(req,405,{ok:false,error:"Method not allowed"});

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json(req,401,{ok:false,error:"Unauthorized"});

    const caller = await callerFromJwt(authHeader);
    if (!caller?.id) return json(req,401,{ok:false,error:"Unauthorized"});

    const callerAdmin = await getAdmin(caller.id);
    const callerState = await getAccountState(caller.id);
    if (callerState && String(callerState.status || "active") !== "active") {
      return json(req,403,{ok:false,error:"Admin account is "+String(callerState.status||"disabled"),account_status:callerState.status,reason:callerState.reason||null});
    }
    if (!callerAdmin?.enabled || !["superadmin","admin"].includes(String(callerAdmin.role || ""))) {
      return json(req,403,{ok:false,error:"Admin access required"});
    }
    const callerIsSuperadmin = callerAdmin.role === "superadmin";

    const body = await req.json().catch(()=>({}));
    const action = String(body.action || "");

    if (action === "invite_user") {
      if (!callerIsSuperadmin) return json(req,403,{ok:false,error:"Superadmin required"});
      const email = String(body.email || "").trim().toLowerCase();
      const displayName = String(body.display_name || "").trim().slice(0,120);
      const role = String(body.role || "user").toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(req,400,{ok:false,error:"Invalid email"});
      if (!["user","viewer","admin"].includes(role)) return json(req,400,{ok:false,error:"Invalid role"});

      const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email,{
        data:{ display_name:displayName, full_name:displayName, name:displayName },
        redirectTo:ADMIN_ORIGIN + "/reset-password"
      });
      if (error || !data?.user?.id) return json(req,400,{ok:false,error:error?.message || "Invite failed"});

      const newUserId = data.user.id;
      if (displayName) {
        const rp = await rest("dealzy_profiles?on_conflict=user_id", {
          method:"POST",
          headers:{ "Prefer":"resolution=merge-duplicates,return=minimal" },
          body:JSON.stringify({ user_id:newUserId, display_name:displayName, updated_at:new Date().toISOString() }),
        });
        if (!rp.ok) throw new Error("Profile create failed");
      }

      if (role !== "user") {
        const rr = await rest("dealzy_admin_users?on_conflict=user_id", {
          method:"POST",
          headers:{ "Prefer":"resolution=merge-duplicates,return=minimal" },
          body:JSON.stringify({ user_id:newUserId, role, enabled:true, updated_at:new Date().toISOString() }),
        });
        if (!rr.ok) throw new Error("Staff role create failed");
      }

      await audit(caller.id,"user.invite.sent",email,{target_user_id:newUserId,role,display_name:displayName});
      return json(req,200,{ok:true,user_id:newUserId,email,role});
    }

    const targetUser = String(body.target_user || "");
    if (!targetUser) return json(req,400,{ok:false,error:"target_user required"});

    const target = await getTargetUser(targetUser);
    if (!target?.id) return json(req,404,{ok:false,error:"User not found"});

    const targetAdmin = await getAdmin(targetUser);
    // A disabled staff row is still staff: otherwise it could be edited through
    // the normal-user path and later re-enabled with elevated privileges.
    const targetRole = String(targetAdmin?.role || "user");
    const isSelf = targetUser === caller.id;
    const denied = targetActionDenied(String(callerAdmin.role),targetRole,isSelf,action);
    if (denied) return json(req,403,{ok:false,error:denied});

    const targetLabel = String(target.email || target.phone || target.id);

    if (action === "update_identity") {
      const patch:any = {};
      const email = body.email == null ? null : String(body.email).trim();
      const phone = body.phone == null ? null : String(body.phone).trim();
      const displayName = body.display_name == null ? null : String(body.display_name).trim();

      if (email !== null && email.toLowerCase() !== String(target.email || "").toLowerCase()) {
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(req,400,{ok:false,error:"Invalid email"});
        patch.email = email;
      }
      if (phone !== null && phone !== String(target.phone || "")) {
        if (phone && !/^\+?[0-9 ()\-.]{7,25}$/.test(phone)) return json(req,400,{ok:false,error:"Invalid phone"});
        patch.phone = phone || null;
      }
      if (displayName !== null) {
        if (displayName.length > 120) return json(req,400,{ok:false,error:"Name too long"});
        patch.user_metadata = {
          ...(target.user_metadata || {}),
          display_name:displayName,
          full_name:displayName,
          name:displayName,
        };
      }

      if (Object.keys(patch).length) await updateAuthUser(targetUser, patch);

      if (displayName !== null) {
        const rp = await rest("dealzy_profiles?on_conflict=user_id", {
          method:"POST",
          headers:{ "Prefer":"resolution=merge-duplicates,return=minimal" },
          body:JSON.stringify({ user_id:targetUser, display_name:displayName || null, updated_at:new Date().toISOString() }),
        });
        if (!rp.ok) throw new Error("Profile update failed");
      }

      await audit(caller.id,"user.identity.update",targetLabel,{
        target_user_id:targetUser,
        changed_email: Object.hasOwn(patch,"email"),
        changed_phone: Object.hasOwn(patch,"phone"),
        changed_name: displayName !== null,
      });
      return json(req,200,{ok:true});
    }

    if (action === "set_status") {
      const status = String(body.status || "").toLowerCase();
      if (!["active","disabled","blacklisted"].includes(status)) return json(req,400,{ok:false,error:"Invalid status"});
      const reason = String(body.reason || "").trim().slice(0,500);
      const notes = String(body.notes || "").trim().slice(0,2000);

      await updateAuthUser(targetUser, { ban_duration: status === "active" ? "none" : "876000h" });
      await upsertState(targetUser,{
        status,
        reason: reason || null,
        notes: notes || null,
        updated_by: caller.id,
        updated_at: new Date().toISOString(),
      });
      await audit(caller.id,"user.status.update",targetLabel,{target_user_id:targetUser,status,reason});
      return json(req,200,{ok:true,status});
    }

    if (action === "set_password") {
      if (!callerIsSuperadmin) return json(req,403,{ok:false,error:"Superadmin required"});
      const password = String(body.password || "");
      if (password.length < 12) return json(req,400,{ok:false,error:"Password must contain at least 12 characters"});
      if (password.length > 128) return json(req,400,{ok:false,error:"Password is too long"});
      if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
        return json(req,400,{ok:false,error:"Password must include upper-case, lower-case and a number"});
      }

      await updateAuthUser(targetUser,{ password });
      await audit(caller.id,"user.password.admin_set",targetLabel,{
        target_user_id:targetUser,
        forced_by_superadmin:true
      });
      return json(req,200,{ok:true});
    }

    if (action === "send_password_reset") {
      if (!target.email) return json(req,400,{ok:false,error:"User has no email"});
      const r = await fetch(SUPABASE_URL + "/auth/v1/recover?redirect_to=" + encodeURIComponent(ADMIN_ORIGIN + "/reset-password"), {
        method:"POST",
        headers:{ "apikey":ANON_KEY, "Content-Type":"application/json" },
        body:JSON.stringify({email:target.email}),
      });
      if (!r.ok) {
        const t = await r.text();
        throw new Error(t || "Could not send reset email");
      }
      await audit(caller.id,"user.password.reset_email",targetLabel,{target_user_id:targetUser});
      return json(req,200,{ok:true});
    }

    return json(req,400,{ok:false,error:"Unknown action"});
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected error";
    return json(req,400,{ok:false,error:message});
  }
});
