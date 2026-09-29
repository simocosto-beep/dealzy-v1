-- User administration is performed by checked RPCs and Edge Functions.
-- Keep the read policies used by the existing /admin screen, but remove
-- client-side writes to roles, account state and audit records.
drop policy if exists dealzy_admin_users_superadmin_write on public.dealzy_admin_users;
drop policy if exists dealzy_user_admin_state_superadmin_write on public.dealzy_user_admin_state;
drop policy if exists dealzy_user_controls_superadmin_write on public.dealzy_user_controls;
drop policy if exists dealzy_admin_audit_admin_insert on public.dealzy_admin_audit_log;

revoke all on public.dealzy_admin_users from public, anon, authenticated;
revoke all on public.dealzy_user_admin_state from public, anon, authenticated;
revoke all on public.dealzy_user_controls from public, anon, authenticated;
revoke all on public.dealzy_admin_audit_log from public, anon, authenticated;

grant select on public.dealzy_admin_users to authenticated;
grant select on public.dealzy_user_admin_state to authenticated;
grant select on public.dealzy_user_controls to authenticated;
grant select on public.dealzy_admin_audit_log to authenticated;

-- These older SECURITY DEFINER endpoints also mutate roles or account status.
-- Their protection checks use a variable named current_role, which PostgreSQL
-- resolves as the built-in current_role expression in PL/pgSQL conditions.
-- Retire them in favor of the corrected staff RPC and checked Edge endpoint.
revoke execute on function public.dealzy_superadmin_set_admin_role(uuid,text) from public, anon, authenticated;
revoke execute on function public.dealzy_superadmin_set_user_disabled(uuid,boolean) from public, anon, authenticated;
revoke execute on function public.dealzy_superadmin_set_user_status(uuid,text,text,text) from public, anon, authenticated;

-- The role RPC remains the only browser-callable role mutation. Include a
-- stable user id in audit records so history survives an email change.
create or replace function public.dealzy_superadmin_set_staff(target_user uuid, new_role text)
returns jsonb
language plpgsql security definer
set search_path = 'public', 'auth'
as $function$
declare
  uid uuid := auth.uid();
  target_email text;
  target_existing_role text;
  requested_role text := lower(coalesce(new_role,''));
begin
  if uid is null or not public.dealzy_is_superadmin(uid) then
    raise exception 'forbidden';
  end if;
  if target_user is null or target_user = uid then
    raise exception 'protected account';
  end if;

  select u.email into target_email
  from auth.users u
  where u.id=target_user and u.deleted_at is null;
  if target_email is null then
    raise exception 'user not found';
  end if;

  select a.role into target_existing_role
  from public.dealzy_admin_users a
  where a.user_id=target_user;
  if target_existing_role='superadmin' then
    raise exception 'protected superadmin cannot be changed';
  end if;

  if requested_role='user' then
    delete from public.dealzy_admin_users where user_id=target_user;
  elsif requested_role in ('viewer','admin') then
    insert into public.dealzy_admin_users(user_id,role,enabled,created_at,updated_at)
    values(target_user,requested_role,true,now(),now())
    on conflict (user_id) do update
      set role=excluded.role,enabled=true,updated_at=now();
  else
    raise exception 'invalid role';
  end if;

  insert into public.dealzy_admin_audit_log(user_id,action,target,details)
  values(uid,'admin_role.update',target_email,
    jsonb_build_object('target_user_id',target_user,'before',coalesce(target_existing_role,'user'),'after',requested_role));
  return jsonb_build_object('ok',true,'user_id',target_user,'role',requested_role);
end;
$function$;

revoke execute on function public.dealzy_superadmin_set_staff(uuid,text) from public, anon;
grant execute on function public.dealzy_superadmin_set_staff(uuid,text) to authenticated, service_role;

-- A bounded activity feed for the user detail screen. The partner click,
-- travel and order feeds remain in their existing, separately checked RPCs.
create or replace function public.dealzy_admin_user_activity(target_user uuid)
returns jsonb
language plpgsql stable security definer
set search_path = 'public', 'auth'
as $function$
begin
  if auth.uid() is null or not public.dealzy_can_manage(auth.uid()) then
    raise exception 'forbidden';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(activity) order by activity.created_at desc)
    from (
      select kind,title,created_at
      from (
        select 'search'::text kind, left(coalesce(h.query,''),200)::text title, h.created_at
        from public.dealzy_search_history h
        where h.user_id=target_user and h.deleted_at is null
        union all
        select 'saved_deal', left(coalesce(d.title,d.deal_key,''),200), d.created_at
        from public.dealzy_saved_deals d
        where d.user_id=target_user and d.deleted_at is null
        union all
        select 'trip', left(coalesce(t.name,''),200), t.created_at
        from public.dealzy_trips t
        where t.user_id=target_user and t.deleted_at is null
      ) all_activity
      order by created_at desc
      limit 100
    ) activity
  ),'[]'::jsonb);
end;
$function$;

revoke execute on function public.dealzy_admin_user_activity(uuid) from public, anon;
grant execute on function public.dealzy_admin_user_activity(uuid) to authenticated, service_role;
