import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const ids = {
  root: '00000000-0000-4000-8000-000000000001',
  otherRoot: '00000000-0000-4000-8000-000000000002',
  admin: '00000000-0000-4000-8000-000000000003',
  viewer: '00000000-0000-4000-8000-000000000004',
  user: '00000000-0000-4000-8000-000000000005',
};
await db.exec(`
  create role anon;
  create role authenticated;
  create role service_role;
  create schema auth;
  create table auth.users(id uuid primary key, email text, deleted_at timestamptz);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  create table public.dealzy_admin_users(
    user_id uuid primary key, role text, enabled boolean,
    created_at timestamptz default now(), updated_at timestamptz default now()
  );
  create table public.dealzy_user_admin_state(user_id uuid primary key, status text, reason text);
  create table public.dealzy_user_controls(user_id uuid primary key, status text);
  create table public.dealzy_admin_audit_log(
    id bigint generated always as identity, user_id uuid, action text,
    target text, details jsonb, created_at timestamptz default now()
  );
  create table public.dealzy_search_history(user_id uuid, query text, created_at timestamptz, deleted_at timestamptz);
  create table public.dealzy_saved_deals(user_id uuid, title text, deal_key text, created_at timestamptz, deleted_at timestamptz);
  create table public.dealzy_trips(user_id uuid, name text, created_at timestamptz, deleted_at timestamptz);
  create function public.dealzy_is_superadmin(check_user uuid) returns boolean
    language sql stable security definer set search_path='public'
    as $$ select exists(select 1 from public.dealzy_admin_users a
      left join public.dealzy_user_admin_state s on s.user_id=a.user_id
      where a.user_id=check_user and a.enabled=true and a.role='superadmin'
        and coalesce(s.status,'active')='active') $$;
  create function public.dealzy_can_manage(check_user uuid) returns boolean
    language sql stable security definer set search_path='public'
    as $$ select exists(select 1 from public.dealzy_admin_users a
      left join public.dealzy_user_admin_state s on s.user_id=a.user_id
      where a.user_id=check_user and a.enabled=true and a.role in ('superadmin','admin')
        and coalesce(s.status,'active')='active') $$;
  create function public.dealzy_superadmin_set_admin_role(uuid,text) returns jsonb
    language sql security definer as $$ select '{}'::jsonb $$;
  create function public.dealzy_superadmin_set_user_disabled(uuid,boolean) returns jsonb
    language sql security definer as $$ select '{}'::jsonb $$;
  create function public.dealzy_superadmin_set_user_status(uuid,text,text,text) returns jsonb
    language sql security definer as $$ select '{}'::jsonb $$;
  alter table public.dealzy_admin_users enable row level security;
  alter table public.dealzy_user_admin_state enable row level security;
  alter table public.dealzy_user_controls enable row level security;
  alter table public.dealzy_admin_audit_log enable row level security;
  create policy dealzy_admin_users_superadmin_write on public.dealzy_admin_users for all to authenticated using (true) with check (true);
  create policy dealzy_user_admin_state_superadmin_write on public.dealzy_user_admin_state for all to authenticated using (true) with check (true);
  create policy dealzy_user_controls_superadmin_write on public.dealzy_user_controls for all to authenticated using (true) with check (true);
  create policy dealzy_admin_audit_admin_insert on public.dealzy_admin_audit_log for insert to authenticated with check (true);
  grant all on public.dealzy_admin_users,public.dealzy_user_admin_state,public.dealzy_user_controls,public.dealzy_admin_audit_log to anon,authenticated;
  grant execute on function public.dealzy_superadmin_set_admin_role(uuid,text),
    public.dealzy_superadmin_set_user_disabled(uuid,boolean),
    public.dealzy_superadmin_set_user_status(uuid,text,text,text) to authenticated;
`);

const migration = await readFile(new URL('../supabase/migrations/20260929190528_harden_dealzy_users_admin_access.sql', import.meta.url), 'utf8');
await db.exec(migration);

for (const signature of [
  'public.dealzy_superadmin_set_admin_role(uuid,text)',
  'public.dealzy_superadmin_set_user_disabled(uuid,boolean)',
  'public.dealzy_superadmin_set_user_status(uuid,text,text,text)',
]) {
  const result = await db.query('select has_function_privilege($1,$2,$3) as allowed', ['authenticated',signature,'EXECUTE']);
  assert.equal(result.rows[0].allowed, false, `${signature} remains executable`);
}

for (const table of ['dealzy_admin_users','dealzy_user_admin_state','dealzy_user_controls','dealzy_admin_audit_log']) {
  for (const role of ['anon','authenticated']) {
    for (const action of ['INSERT','UPDATE','DELETE']) {
      const result = await db.query('select has_table_privilege($1,$2,$3) as allowed', [role,`public.${table}`,action]);
      assert.equal(result.rows[0].allowed, false, `${role} ${action} ${table}`);
    }
  }
  assert.equal((await db.query('select has_table_privilege($1,$2,$3) as allowed', ['authenticated',`public.${table}`,'SELECT'])).rows[0].allowed, true);
}

for (const [role, id] of Object.entries(ids)) {
  await db.query('insert into auth.users(id,email) values($1,$2)', [id,`${role}@example.test`]);
}
for (const role of ['root','otherRoot','admin','viewer']) {
  await db.query('insert into public.dealzy_admin_users(user_id,role,enabled) values($1,$2,true)', [ids[role],role.endsWith('Root') || role==='root' ? 'superadmin' : role]);
}
await db.query('insert into public.dealzy_search_history(user_id,query,created_at) values($1,$2,now())', [ids.user,'Paris']);
await db.query('insert into public.dealzy_saved_deals(user_id,title,created_at) values($1,$2,now())', [ids.user,'Hotel']);
await db.query('insert into public.dealzy_trips(user_id,name,created_at) values($1,$2,now())', [ids.user,'Weekend']);

const asUser = async (caller, statement, params=[]) => {
  await db.exec('set role authenticated');
  await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [ids[caller]]);
  try { return await db.query(statement, params); }
  finally { await db.exec('reset role'); }
};
const mustDeny = async (caller, statement, params, errorPattern) => {
  await assert.rejects(() => asUser(caller, statement, params), errorPattern);
};
await mustDeny('admin','select public.dealzy_superadmin_set_staff($1,$2)',[ids.user,'viewer'],/forbidden/);
await mustDeny('root','select public.dealzy_superadmin_set_staff($1,$2)',[ids.root,'user'],/protected account/);
await mustDeny('root','select public.dealzy_superadmin_set_staff($1,$2)',[ids.otherRoot,'user'],/protected superadmin/);
await mustDeny('root','select public.dealzy_superadmin_set_staff($1,$2)',[ids.user,'superadmin'],/invalid role/);
const grant = await asUser('root','select public.dealzy_superadmin_set_staff($1,$2) as result',[ids.user,'viewer']);
assert.equal(grant.rows[0].result.role, 'viewer');
let audit = await db.query("select details from public.dealzy_admin_audit_log where action='admin_role.update'");
assert.equal(audit.rows.length, 1);
assert.equal(audit.rows[0].details.target_user_id, ids.user);
const activity = await asUser('admin','select public.dealzy_admin_user_activity($1) as activity',[ids.user]);
assert.deepEqual(new Set(activity.rows[0].activity.map(a=>a.kind)),new Set(['search','saved_deal','trip']));
await mustDeny('viewer','select public.dealzy_admin_user_activity($1)',[ids.user],/forbidden/);
console.log('PASS: migration executes; DML denied; role and activity permissions; superadmin protection; audit target ID');
await db.close();
