-- Execute inside a rollback transaction after loading embedded-admin-ops.sql.
do $$
declare bid uuid:=gen_random_uuid(); mid uuid:=gen_random_uuid(); s jsonb; expired_id uuid:=gen_random_uuid(); future_id uuid:=gen_random_uuid(); partner_id uuid;
begin
 if has_function_privilege('anon','dealzy_ops.tick()','EXECUTE') or has_function_privilege('authenticated','dealzy_ops.tick()','EXECUTE') then raise exception 'worker exposed'; end if;
 begin perform public.dealzy_admin_ops_snapshot(); raise exception 'unauthenticated read allowed'; exception when others then if sqlerrm<>'forbidden' then raise; end if; end;
 begin perform public.dealzy_admin_ops_configure('re_invalid'); raise exception 'unauthenticated configuration allowed'; exception when others then if sqlerrm<>'forbidden' then raise; end if; end;
 insert into public.dealzy_commercial_partners(name,status) values('Synthetic worker test','active') returning id into partner_id;
 insert into public.dealzy_direct_deals(id,partner_id,title,country_code,city,active,ends_at) values(expired_id,partner_id,'Synthetic expiry test','US','New York',true,now()-interval '1 day'),(future_id,partner_id,'Synthetic future test','US','New York',true,now()+interval '1 day');
 perform dealzy_ops.tick();
 if exists(select 1 from public.dealzy_direct_deals where id=expired_id and active) then raise exception 'expired offer still active'; end if;
 if not exists(select 1 from public.dealzy_direct_deals where id=future_id and active) then raise exception 'future offer changed'; end if;
 if not exists(select 1 from public.dealzy_admin_audit_log where target=expired_id::text and action='assistant.offer.expired') then raise exception 'missing audit'; end if;
 insert into dealzy_ops.email_alert_batches(id,recipient,sender,subject,body,event_keys,request_id,attempted_at)
 values(bid,'simocosto@gmail.com','alertes@dealzyai.com','Test','Test',array['test'], -900001,now());
 insert into net._http_response(id,status_code,content) values(-900001,200,jsonb_build_object('id',mid)::text);
 perform dealzy_ops.tick();
 if not exists(select 1 from dealzy_ops.email_alert_batches where id=bid and status='accepted' and message_id=mid::text) then raise exception 'send acceptance missing'; end if;
 if exists(select 1 from dealzy_ops.email_alert_batches where id=bid and status='delivered') then raise exception 'false delivery'; end if;
 insert into dealzy_ops.email_alert_batches(recipient,sender,subject,body,event_keys,request_id,attempted_at)
 values('simocosto@gmail.com','alertes@dealzyai.com','Test','Test',array['test2'],-900002,now());
 insert into net._http_response(id,status_code,content) values(-900002,200,'{}');
 s:=dealzy_ops.tick();
 if s->>'state'<>'needs_review' then raise exception 'uncertain send not blocked'; end if;
end $$;
