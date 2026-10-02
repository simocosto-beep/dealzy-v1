create schema if not exists dealzy_ops;
revoke all on schema dealzy_ops from public, anon, authenticated;
create table if not exists dealzy_ops.email_alert_batches(
 id uuid primary key default gen_random_uuid(),
 recipient text not null,
 sender text not null,
 subject text not null,
 body text not null,
 event_keys text[] not null,
 status text not null default 'pending' check(status in ('pending','accepted','delivered','failed','unknown')),
 message_id text,
 created_at timestamptz not null default now(),
 accepted_at timestamptz,
 last_error text
);
alter table dealzy_ops.email_alert_batches enable row level security;
create table if not exists dealzy_ops.email_alert_events(
 event_key text primary key,
 batch_id uuid not null references dealzy_ops.email_alert_batches(id),
 created_at timestamptz not null default now()
);
alter table dealzy_ops.email_alert_events enable row level security;
revoke all on all tables in schema dealzy_ops from public, anon, authenticated;

create or replace function dealzy_ops.current_interventions()
returns table(event_key text, summary text, action text)
language sql stable security invoker set search_path='' as $fn$
 select 'provider:'||p.provider_key||':'||coalesce(p.last_success_at::text,'never')||':'||current_date::text,
 'Fournisseur signalé en erreur : '||left(p.display_name,100),
 'Dans Providers, vérifier la connexion et les quotas de ce fournisseur.'
 from public.dealzy_provider_health p
 where p.enabled and not p.healthy and p.mode not in ('pending','demo') and p.last_checked_at is not null
 union all
 select 'contract:'||c.id::text||':'||c.ends_on::text||':'||current_date::text,
 'Contrat à échéance : '||left(c.contract_name,100)||' — '||c.ends_on::text,
 case when c.ends_on<current_date then 'Dans Partners, vérifier le renouvellement ou la désactivation des offres.'
 else 'Dans Partners, décider du renouvellement avant la date indiquée.' end
 from public.dealzy_partner_contracts c
 where c.status='active' and c.ends_on<=current_date+7
 union all
 select 'sync:'||current_date::text,
 'Synchronisation : '||count(*)::text||' compte(s) avec une erreur non résolue.',
 'Dans Users & Admins, examiner les diagnostics de synchronisation. Aucune donnée personnelle n’est incluse dans cet email.'
 from public.dealzy_cloud_state cs
 where cs.last_error_at is not null and cs.last_error_at>
 greatest(coalesce(cs.last_successful_push_at,'epoch'::timestamptz),coalesce(cs.last_successful_pull_at,'epoch'::timestamptz),coalesce(cs.last_merge_at,'epoch'::timestamptz))
 having count(*)>0
$fn$;
revoke execute on function dealzy_ops.current_interventions() from public, anon, authenticated;

create or replace function dealzy_ops.prepare_email_alert()
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare b dealzy_ops.email_alert_batches%rowtype; target_email text; n integer;
keys text[]; lines text; subject_line text;
begin
 perform pg_advisory_xact_lock(hashtextextended('dealzy-ops-email',0));
 select * into b from dealzy_ops.email_alert_batches where status='pending' order by created_at limit 1;
 if found then
   if b.created_at<now()-interval '23 hours' then
     update dealzy_ops.email_alert_batches set status='unknown',last_error='Unconfirmed send beyond safe idempotency retry window' where id=b.id;
     return jsonb_build_object('state','needs_review','batch_id',b.id,'reason','Unconfirmed send; do not resend automatically.');
   end if;
   return jsonb_build_object('state','send','batch_id',b.id,'to',b.recipient,'from',b.sender,'subject',b.subject,'text',b.body,'idempotency_key','dealzy-ops-'||b.id::text);
 end if;
 select count(*),min(u.email) into n,target_email
 from public.dealzy_admin_users a join auth.users u on u.id=a.user_id
 where a.enabled and a.role='superadmin' and u.deleted_at is null and u.email is not null
 and (u.banned_until is null or u.banned_until<=now())
 and not exists(select 1 from public.dealzy_user_admin_state s where s.user_id=u.id and s.status<>'active');
 if n<>1 then return jsonb_build_object('state','needs_review','reason','Expected exactly one active superadmin recipient.'); end if;
 select array_agg(i.event_key order by i.event_key),string_agg('- '||i.summary||E'\n  Action : '||i.action,E'\n\n' order by i.event_key)
 into keys,lines from dealzy_ops.current_interventions() i
 where not exists(select 1 from dealzy_ops.email_alert_events e where e.event_key=i.event_key);
 if keys is null then return jsonb_build_object('state','no_action'); end if;
 subject_line:='Dealzy — '||array_length(keys,1)::text||' intervention(s) à vérifier';
 insert into dealzy_ops.email_alert_batches(recipient,sender,subject,body,event_keys)
 values(target_email,'alertes@dealzyai.com',subject_line,
 'Bonjour,'||E'\n\n'||'Voici les points enregistrés dans Dealzy qui demandent une vérification :'||E'\n\n'||lines||
 E'\n\n'||'Ouvrir l’administration : https://admin.dealzyai.com/admin'||
 E'\n\n'||'État relevé le '||to_char(now(),'YYYY-MM-DD HH24:MI TZ')||
 E'\n'||'Cette alerte repose sur les diagnostics enregistrés, pas sur une garantie de disponibilité des fournisseurs.'||
 E'\n'||'Un problème persistant peut faire l’objet d’un rappel quotidien. Les sources désactivées ou en candidature ne sont pas signalées comme des pannes.',keys)
 returning * into b;
 insert into dealzy_ops.email_alert_events(event_key,batch_id) select unnest(keys),b.id;
 return jsonb_build_object('state','send','batch_id',b.id,'to',b.recipient,'from',b.sender,'subject',b.subject,'text',b.body,'idempotency_key','dealzy-ops-'||b.id::text);
end
$fn$;
revoke execute on function dealzy_ops.prepare_email_alert() from public,anon,authenticated;

create or replace function dealzy_ops.record_email_accepted(p_batch uuid,p_message text)
returns boolean language plpgsql security invoker set search_path='' as $fn$
begin
 if p_message is null or length(p_message)<1 then raise exception 'message ID required'; end if;
 update dealzy_ops.email_alert_batches set status='accepted',message_id=p_message,accepted_at=now(),last_error=null
 where id=p_batch and status='pending';
 return found;
end $fn$;
revoke execute on function dealzy_ops.record_email_accepted(uuid,text) from public,anon,authenticated;
