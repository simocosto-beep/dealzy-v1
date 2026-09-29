-- Public settings must be readable without evaluating admin-only functions.
-- Keep private settings visible to signed-in staff through a separate policy.
drop policy if exists dealzy_runtime_config_public_read on public.dealzy_runtime_config;
create policy dealzy_runtime_config_public_read on public.dealzy_runtime_config
  for select to anon, authenticated
  using (public_read = true);

drop policy if exists dealzy_runtime_config_admin_read on public.dealzy_runtime_config;
create policy dealzy_runtime_config_admin_read on public.dealzy_runtime_config
  for select to authenticated
  using (public.dealzy_is_admin(auth.uid()));
