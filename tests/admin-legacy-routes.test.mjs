import test from 'node:test';
import assert from 'node:assert/strict';

const handlers = [];
globalThis.Deno = {
  env: { get: key => ({ SUPABASE_URL: 'https://example.supabase.co', SUPABASE_ANON_KEY: 'public-key' })[key] },
  serve: fn => handlers.push(fn),
};
await import('../supabase/functions/dealzy-admin-users/index.ts');
await import('../supabase/functions/dealzy-admin-user-action/index.ts');
const [users, account] = handlers;

const request = (body, authenticated = true) => new Request('https://example.test/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: 'Bearer user-jwt' } : {}) },
  body: JSON.stringify(body),
});

test('legacy routes refuse missing JWT and unknown actions', async () => {
  assert.equal((await users(request({ action: 'set_role', user_id: 'target' }, false))).status, 401);
  assert.equal((await account(request({ action: 'update_profile', user_id: 'target' }, false))).status, 401);
  assert.equal((await users(request({ action: 'delete_user', user_id: 'target' }))).status, 400);
});

test('legacy role change uses the checked RPC and caller JWT', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'https://example.supabase.co/rest/v1/rpc/dealzy_superadmin_set_staff');
      assert.equal(options.headers.Authorization, 'Bearer user-jwt');
      assert.deepEqual(JSON.parse(options.body), { target_user: 'target', new_role: 'viewer' });
      return Response.json({ ok: true });
    };
    assert.equal((await users(request({ action: 'set_role', user_id: 'target', role: 'viewer' }))).status, 200);
  } finally { globalThis.fetch = originalFetch; }
});

test('legacy profile change delegates to the protected user-auth function', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, 'https://example.supabase.co/functions/v1/dealzy-admin-user-auth');
      assert.equal(options.headers.Authorization, 'Bearer user-jwt');
      assert.deepEqual(JSON.parse(options.body), {
        action: 'update_identity', user_id: 'target', target_user: 'target', display_name: 'Name',
      });
      return Response.json({ ok: false, error: 'Protected superadmin account' }, { status: 403 });
    };
    const result = await account(request({ action: 'update_profile', user_id: 'target', display_name: 'Name' }));
    assert.equal(result.status, 403);
    assert.equal((await result.json()).error, 'Protected superadmin account');
  } finally { globalThis.fetch = originalFetch; }
});
