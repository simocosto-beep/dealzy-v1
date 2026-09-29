import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

test('public runtime settings load without granting visitors admin privileges', async () => {
  const db = new PGlite();
  const viewer = '00000000-0000-4000-8000-000000000010';
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create schema auth;
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      create table public.dealzy_runtime_config(key text primary key, value jsonb, public_read boolean not null);
      insert into public.dealzy_runtime_config values
        ('content', '{"hero_title":"Dealzy"}', true),
        ('private', '{"internal":true}', false);
      create function public.dealzy_is_admin(check_user uuid) returns boolean
        language sql stable security definer set search_path='public' as
        $$ select check_user = '00000000-0000-4000-8000-000000000010'::uuid $$;
      revoke execute on function public.dealzy_is_admin(uuid) from public, anon;
      grant execute on function public.dealzy_is_admin(uuid) to authenticated;
      grant usage on schema public, auth to anon, authenticated;
      grant select on public.dealzy_runtime_config to anon, authenticated;
      alter table public.dealzy_runtime_config enable row level security;
      create policy dealzy_runtime_config_public_read on public.dealzy_runtime_config
        for select to anon, authenticated
        using (public_read = true or public.dealzy_is_admin(auth.uid()));
    `);

    await db.exec('set role anon');
    await assert.rejects(() => db.query('select key from public.dealzy_runtime_config'), /permission denied for function dealzy_is_admin/);
    await db.exec('reset role');

    const migration = await readFile(new URL('../supabase/migrations/20260929224116_fix_public_runtime_config_read.sql', import.meta.url), 'utf8');
    await db.exec(migration);

    await db.exec('set role anon');
    assert.deepEqual((await db.query('select key from public.dealzy_runtime_config order by key')).rows.map(r => r.key), ['content']);
    await assert.rejects(() => db.query(`select public.dealzy_is_admin('${viewer}'::uuid)`), /permission denied for function dealzy_is_admin/);
    await db.exec('reset role');

    await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [viewer]);
    await db.exec('set role authenticated');
    assert.deepEqual((await db.query('select key from public.dealzy_runtime_config order by key')).rows.map(r => r.key), ['content', 'private']);
    await db.exec('reset role');

    await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, ['00000000-0000-4000-8000-000000000011']);
    await db.exec('set role authenticated');
    assert.deepEqual((await db.query('select key from public.dealzy_runtime_config order by key')).rows.map(r => r.key), ['content']);
    await db.exec('reset role');
  } finally {
    await db.close();
  }
});
