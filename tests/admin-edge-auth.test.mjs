import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

let handler;
globalThis.Deno = {
  env: { get: key => ({
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_ANON_KEY: 'public-key',
    SUPABASE_SERVICE_ROLE_KEY: 'server-key',
  })[key] },
  serve: fn => { handler = fn; },
};
globalThis.__createClient = () => ({ auth: { admin: { inviteUserByEmail: async () => { throw new Error('Unexpected invite'); } } } });

const bundled = await build({
  entryPoints: [new URL('../supabase/functions/dealzy-admin-user-auth/index.ts', import.meta.url).pathname],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
  plugins: [{
    name: 'mock-edge-imports',
    setup(bundle) {
      bundle.onResolve({ filter: /^jsr:/ }, () => ({ path: 'runtime', namespace: 'mock' }));
      bundle.onResolve({ filter: /^npm:@supabase\/supabase-js/ }, () => ({ path: 'client', namespace: 'mock' }));
      bundle.onLoad({ filter: /.*/, namespace: 'mock' }, args => ({
        contents: args.path === 'client' ? 'export const createClient = globalThis.__createClient;' : '',
        loader: 'js',
      }));
    },
  }],
});
await import('data:text/javascript;base64,' + Buffer.from(bundled.outputFiles[0].text).toString('base64'));

const caller = '00000000-0000-4000-8000-000000000001';
const target = '00000000-0000-4000-8000-000000000002';

async function invoke({ callerRole='superadmin', targetRole='user', callerStatus='active', action='set_status', payload={} }) {
  const writes = [];
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async (input, init={}) => {
    const url = new URL(input);
    const path = url.pathname;
    if (path === '/auth/v1/user') return Response.json({ id: caller });
    if (path === '/rest/v1/dealzy_admin_users' && init.method !== 'POST') {
      return Response.json([{ role: url.searchParams.get('user_id') === `eq.${caller}` ? callerRole : targetRole, enabled: true }]);
    }
    if (path === '/rest/v1/dealzy_user_admin_state' && init.method !== 'POST') {
      return Response.json(callerStatus === 'active' ? [] : [{ status: callerStatus }]);
    }
    if (path === `/auth/v1/admin/users/${target}` && init.method === 'GET') {
      return Response.json({ id: target, email: 'target@example.test', user_metadata: {} });
    }
    if (['PUT','POST'].includes(init.method)) {
      writes.push({ path, method: init.method, body: JSON.parse(init.body) });
      return Response.json({ id: target }, { status: 200 });
    }
    throw new Error(`Unexpected request ${path}`);
  };
  try {
    const response = await handler(new Request('https://example.supabase.co/functions/v1/dealzy-admin-user-auth', {
      method: 'POST',
      headers: { Authorization: 'Bearer caller-jwt', 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, target_user: target, status: 'disabled', ...payload }),
    }));
    return { status: response.status, body: await response.json(), writes };
  } finally {
    globalThis.fetch = oldFetch;
  }
}

test('the deployed handler refuses all mutations of another superadmin', async () => {
  for (const action of ['set_status','update_identity','set_password','send_password_reset']) {
    const result = await invoke({ targetRole:'superadmin', action });
    assert.equal(result.status, 403, action);
    assert.deepEqual(result.writes, [], action);
  }
});

test('admin cannot modify staff and disabled admin cannot call actions', async () => {
  const staff = await invoke({ callerRole:'admin', targetRole:'viewer' });
  assert.equal(staff.status, 403);
  assert.deepEqual(staff.writes, []);
  const disabled = await invoke({ callerRole:'admin', callerStatus:'disabled' });
  assert.equal(disabled.status, 403);
  assert.deepEqual(disabled.writes, []);
});

test('allowed status changes update Auth, controls and audit with the target ID', async () => {
  const result = await invoke({ callerRole:'admin' });
  assert.equal(result.status, 200);
  assert.deepEqual(result.writes.map(w=>w.path), [
    `/auth/v1/admin/users/${target}`,
    '/rest/v1/dealzy_user_admin_state',
    '/rest/v1/dealzy_user_controls',
    '/rest/v1/dealzy_admin_audit_log',
  ]);
  assert.equal(result.writes.at(-1).body.details.target_user_id, target);
});
