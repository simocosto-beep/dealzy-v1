begin;
update public.dealzy_provider_health set mode='live',enabled=true,healthy=false,last_checked_at=now(),display_name='Audit fixture provider',last_error_message='SECRET-TEST-MUST-NOT-EMAIL' where provider_key='dealzy-demo';
do $test$ declare first jsonb; again jsonb; next_batch jsonb; begin
 first:=dealzy_ops.prepare_email_alert();
 if first->>'state'<>'send' then raise exception 'Expected queued email'; end if;
 if first->>'from'<>'alertes@dealzyai.com' then raise exception 'Wrong sender'; end if;
 if position('Audit fixture provider' in first->>'text')=0 then raise exception 'Missing intervention'; end if;
 if position('SECRET-TEST-MUST-NOT-EMAIL' in first->>'text')>0 then raise exception 'Raw error leaked'; end if;
 again:=dealzy_ops.prepare_email_alert();
 if first->>'batch_id'<>again->>'batch_id' or first->>'idempotency_key'<>again->>'idempotency_key' then raise exception 'Retry duplication'; end if;
 if not dealzy_ops.record_email_accepted((first->>'batch_id')::uuid,'test-message') then raise exception 'Could not record acceptance'; end if;
 next_batch:=dealzy_ops.prepare_email_alert();
 if next_batch->>'state'<>'no_action' then raise exception 'Repeated email for same daily incident'; end if;
end $test$;
set local role anon;
do $test$ begin
 begin perform dealzy_ops.prepare_email_alert(); raise exception 'Anonymous queue access'; exception when insufficient_privilege then null; end;
end $test$;
select 'PASS: issue detection, redaction, retry identity, daily suppression, anonymous denial' result;
rollback;