-- Database-level authorization test. Run only through a trusted database connection.
-- All fixtures and changes are rolled back; this does not test browser login or JWT issuance.
begin;
select set_config('dealzy.test_a',gen_random_uuid()::text,true),set_config('dealzy.test_b',gen_random_uuid()::text,true);
insert into auth.users(id,email,role,aud,created_at,updated_at) values
(current_setting('dealzy.test_a')::uuid,'audit-a-'||current_setting('dealzy.test_a')||'@example.invalid','authenticated','authenticated',now(),now()),
(current_setting('dealzy.test_b')::uuid,'audit-b-'||current_setting('dealzy.test_b')||'@example.invalid','authenticated','authenticated',now(),now());
insert into public.dealzy_profiles(user_id,display_name) values(current_setting('dealzy.test_a')::uuid,'Security fixture A'),(current_setting('dealzy.test_b')::uuid,'Security fixture B');
insert into public.dealzy_user_data(user_id,data) values(current_setting('dealzy.test_a')::uuid,'{"audit":"A"}'),(current_setting('dealzy.test_b')::uuid,'{"audit":"B"}');
set local role authenticated;
do $test$
declare own_id uuid; other_id uuid; n integer;
begin
for own_id in select unnest(array[current_setting('dealzy.test_a')::uuid,current_setting('dealzy.test_b')::uuid]) loop
other_id:=case when own_id=current_setting('dealzy.test_a')::uuid then current_setting('dealzy.test_b')::uuid else current_setting('dealzy.test_a')::uuid end;
perform set_config('request.jwt.claims',jsonb_build_object('sub',own_id,'role','authenticated')::text,true);
if not public.dealzy_current_account_is_active() then raise exception 'fixture not active'; end if;
if (select count(*) from public.dealzy_profiles)<>1 then raise exception 'profile isolation failed'; end if;
if (select count(*) from public.dealzy_user_data)<>1 then raise exception 'user data isolation failed'; end if;
update public.dealzy_profiles set display_name='Own change allowed' where user_id=own_id;
get diagnostics n=row_count; if n<>1 then raise exception 'own update failed'; end if;
update public.dealzy_profiles set display_name='Unauthorized change' where user_id=other_id;
get diagnostics n=row_count; if n<>0 then raise exception 'cross update allowed'; end if;
delete from public.dealzy_profiles where user_id=other_id;
get diagnostics n=row_count; if n<>0 then raise exception 'cross delete allowed'; end if;
begin
update public.dealzy_profiles set user_id=other_id where user_id=own_id;
raise exception 'ownership reassignment allowed';
exception when insufficient_privilege then null;
end;
begin
insert into public.dealzy_admin_users(user_id,role) values(own_id,'superadmin');
raise exception 'self promotion allowed';
exception when insufficient_privilege then null;
end;
begin
perform public.dealzy_admin_dashboard_stats();
raise exception 'admin rpc allowed';
exception when insufficient_privilege then null;
when raise_exception then if SQLERRM not ilike '%forbidden%' then raise; end if;
end;
end loop;
end $test$;
reset role;
insert into public.dealzy_user_admin_state(user_id,status) values(current_setting('dealzy.test_a')::uuid,'disabled');
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('dealzy.test_a'),'role','authenticated')::text,true);
set local role authenticated;
do $test$ begin
if public.dealzy_current_account_is_active() then raise exception 'disabled account active'; end if;
if exists(select 1 from public.dealzy_profiles) then raise exception 'disabled profile access allowed'; end if;
if exists(select 1 from public.dealzy_user_data) then raise exception 'disabled data access allowed'; end if;
end $test$;
select 'PASS: two-account read/write isolation, ownership reassignment, self promotion, admin RPC, disabled account' as result;
rollback;