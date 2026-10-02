create extension if not exists pg_cron;
create extension if not exists pg_net;
create table if not exists dealzy_ops.runs(id bigint generated always as identity primary key, created_at timestamptz not null default now(), result jsonb not null);
alter table dealzy_ops.runs enable row level security;
revoke all on dealzy_ops.runs from public,anon,authenticated;
alter table dealzy_ops.email_alert_batches add column if not exists request_id bigint;
alter table dealzy_ops.email_alert_batches add column if not exists attempted_at timestamptz;

create or replace function dealzy_ops.tick() returns jsonb language plpgsql set search_path='' as $$
declare b record; r record; s jsonb; k text; mid text; changed integer; result jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended('dealzy-embedded-ops',0));
 -- Only retire offers whose explicit expiry already excludes them from the public catalogue.
 with retired as (update public.dealzy_direct_deals set active=false,updated_at=now() where active and ends_at<now() returning id)
 insert into public.dealzy_admin_audit_log(user_id,action,target,details)
 select null,'assistant.offer.expired',id::text,jsonb_build_object('reason','explicit_expiry') from retired;
 get diagnostics changed=row_count;
 -- Reconcile asynchronous send responses; never label acceptance as delivery.
 for b in select * from dealzy_ops.email_alert_batches where status='pending' and request_id is not null loop
  select * into r from net._http_response where id=b.request_id;
  if found then
   mid:=null;
   if r.status_code between 200 and 299 then
    begin mid:=r.content::jsonb->>'id'; exception when others then mid:=null; end;
    if mid ~ '^[0-9a-fA-F-]{36}$' then perform dealzy_ops.record_email_accepted(b.id,mid);
    else update dealzy_ops.email_alert_batches set status='unknown',last_error='Email response could not be verified' where id=b.id; end if;
   elsif r.status_code between 400 and 499 and r.status_code<>429 then
    update dealzy_ops.email_alert_batches set status='failed',last_error='Email configuration requires review (HTTP '||r.status_code||')' where id=b.id;
   else update dealzy_ops.email_alert_batches set request_id=null,last_error='Temporary email service error' where id=b.id; end if;
  elsif b.attempted_at<now()-interval '10 minutes' then
   update dealzy_ops.email_alert_batches set request_id=null,last_error='Unconfirmed response; retry with same idempotency key' where id=b.id;
  end if;
 end loop;
 if exists(select 1 from dealzy_ops.email_alert_batches where status in ('failed','unknown')) then
  result:=jsonb_build_object('state','needs_review','retired_offers',changed);
 else
  select decrypted_secret into k from vault.decrypted_secrets where name='dealzy_ops_resend_key';
  if k is null then result:=jsonb_build_object('state','email_not_configured','retired_offers',changed);
  else
   s:=dealzy_ops.prepare_email_alert();
   if s->>'state'='send' then
    if s->>'to'<>'simocosto@gmail.com' or s->>'from'<>'alertes@dealzyai.com' then raise exception 'Unexpected alert recipient'; end if;
    select * into b from dealzy_ops.email_alert_batches where id=(s->>'batch_id')::uuid;
    if b.request_id is null and (b.attempted_at is null or b.attempted_at<now()-interval '10 minutes') then
     update dealzy_ops.email_alert_batches set request_id=net.http_post(
      url:='https://api.resend.com/emails',
      headers:=jsonb_build_object('Authorization','Bearer '||k,'Content-Type','application/json','Idempotency-Key',s->>'idempotency_key'),
      body:=jsonb_build_object('from',s->>'from','to',jsonb_build_array(s->>'to'),'subject',s->>'subject','text',replace(s->>'text',E'\\n',E'\n')),
      timeout_milliseconds:=10000),attempted_at=now() where id=b.id;
    end if;
   end if;
   result:=jsonb_build_object('state',s->>'state','retired_offers',changed);
  end if;
 end if;
 insert into dealzy_ops.runs(result) values(result);
 delete from dealzy_ops.runs where created_at<now()-interval '30 days';
 return result;
end $$;
revoke execute on function dealzy_ops.tick() from public,anon,authenticated;

create or replace function public.dealzy_admin_ops_snapshot() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.dealzy_is_admin(auth.uid()) then raise exception 'forbidden'; end if;
 return jsonb_build_object('email_configured',exists(select 1 from vault.secrets where name='dealzy_ops_resend_key'),
 'scheduled',exists(select 1 from cron.job where jobname='dealzy-embedded-admin' and active),
 'interventions',coalesce((select jsonb_agg(x) from (select summary,action from dealzy_ops.current_interventions() limit 100) x),'[]'::jsonb),
 'runs',coalesce((select jsonb_agg(x) from (select created_at,result from dealzy_ops.runs order by id desc limit 20) x),'[]'::jsonb),
 'emails',coalesce((select jsonb_agg(x) from (select created_at,status,last_error from dealzy_ops.email_alert_batches order by created_at desc limit 20) x),'[]'::jsonb));
end $$;
revoke all on function public.dealzy_admin_ops_snapshot() from public,anon;
grant execute on function public.dealzy_admin_ops_snapshot() to authenticated;

create or replace function public.dealzy_admin_ops_configure(p_key text) returns jsonb language plpgsql security definer set search_path='' as $$
declare secret_id uuid;
begin
 if auth.uid() is null or not public.dealzy_is_admin(auth.uid()) or not exists(select 1 from public.dealzy_admin_users where user_id=auth.uid() and role='superadmin' and enabled) then raise exception 'forbidden'; end if;
 if p_key is null or p_key !~ '^re_[A-Za-z0-9_-]{20,200}$' then raise exception 'Invalid email key'; end if;
 select id into secret_id from vault.secrets where name='dealzy_ops_resend_key';
 if secret_id is null then perform vault.create_secret(p_key,'dealzy_ops_resend_key'); else perform vault.update_secret(secret_id,p_key); end if;
 insert into public.dealzy_admin_audit_log(user_id,action,target,details) values(auth.uid(),'assistant.email.configured','embedded-admin',jsonb_build_object('configured',true));
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.dealzy_admin_ops_configure(text) from public,anon;
grant execute on function public.dealzy_admin_ops_configure(text) to authenticated;
select cron.schedule('dealzy-embedded-admin','*/10 * * * *','select dealzy_ops.tick();');
