import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '../api/_moderation.js';
import { createHandler as createAssistant } from '../api/assistant.js';

const id = '11111111-2222-3333-4444-555555555555';
const dealId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const draft = {
  title: 'Dinner for two', description: 'Contact person@example.com or +1 212 555 1234',
  category: 'Food & Drink', country_code: 'US', city: 'Miami', price: 70,
  old_price: 100, currency_code: 'USD', partner_url: 'https://merchant.example/path?token=secret'
};

function response(status, value) { return { ok: status >= 200 && status < 300, status, json: async () => value }; }

async function call(handler, body, authorization = 'Bearer valid') {
  let status = 200, payload;
  await handler({ method: 'POST', headers: { authorization }, body }, {
    setHeader() {},
    status(value) { status = value; return this; },
    json(value) { payload = value; return value; }
  }, body);
  return { status, payload };
}

function mockRequest({ role = 'admin', enabled = true, model = { risk: 'low', summary: 'À examiner.', concerns: [], suggested_edits: [] }, stored = draft } = {}) {
  const calls = [];
  const request = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (url.endsWith('/auth/v1/user')) return response(200, { id });
    if (url.includes('/dealzy_admin_users?')) return response(200, [{ role, enabled }]);
    if (url.includes('/dealzy_direct_deals?')) return response(200, stored ? [stored] : []);
    if (url.includes('generativelanguage.googleapis.com')) return response(200, { candidates: [{ content: { parts: [{ text: JSON.stringify(model) }] } }] });
    throw new Error('Unexpected outbound request');
  };
  return { calls, request };
}

test('moderation refuses visitors, viewers and disabled admins before contacting Gemini', async () => {
  const untrusted = mockRequest();
  const handler = createHandler({ request: untrusted.request, key: () => 'secret', rateLimit: () => false });
  assert.equal((await call(handler, { source: 'draft', deal: draft }, '')).status, 401);
  assert.equal(untrusted.calls.length, 0);
  for (const state of [{ role: 'viewer' }, { role: 'admin', enabled: false }]) {
    const mock = mockRequest(state);
    const denied = await call(createHandler({ request: mock.request, key: () => 'secret', rateLimit: () => false }), { source: 'draft', deal: draft });
    assert.equal(denied.status, 403);
    assert.equal(mock.calls.some(call => call.url.includes('generativelanguage')), false);
  }
});

test('draft sends only public fields, removes contacts and query tokens, and cannot write to Supabase', async () => {
  const mock = mockRequest();
  const handler = createHandler({ request: mock.request, key: () => 'secret', rateLimit: () => false });
  const result = await call(handler, { source: 'draft', deal: { ...draft, private_note: 'do-not-send', account: { email: 'account@example.com' } } });
  assert.equal(result.status, 200);
  assert.equal(result.payload.assessment.risk, 'low');
  const modelCall = mock.calls.find(call => call.url.includes('generativelanguage'));
  assert.equal(modelCall.options.headers['x-goog-api-key'], 'secret');
  assert.doesNotMatch(modelCall.options.body, /do-not-send|person@example|account@example|token=secret|212 555 1234/);
  assert.match(modelCall.options.body, /merchant\.example/);
  assert.equal(mock.calls.some(call => call.url.includes('/rest/v1/') && call.options.method && call.options.method !== 'GET'), false);
});

test('existing deal is loaded from the database by ID; client-provided fields are ignored', async () => {
  const mock = mockRequest({ stored: { ...draft, title: 'Stored deal', old_price: 20, currency_code: 'CAD' } });
  const handler = createHandler({ request: mock.request, key: () => 'secret', rateLimit: () => false });
  const result = await call(handler, { source: 'existing', deal_id: dealId, deal: { title: 'Forged client title' } });
  assert.equal(result.status, 200);
  assert.equal(result.payload.assessment.risk, 'high');
  assert.ok(result.payload.checks.length >= 2);
  const modelBody = mock.calls.find(call => call.url.includes('generativelanguage')).options.body;
  assert.match(modelBody, /Stored deal/);
  assert.doesNotMatch(modelBody, /Forged client title/);
  assert.match(mock.calls.find(call => call.url.includes('/dealzy_direct_deals?')).url, /id=eq\.aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/);
});

test('missing key, quota and malformed output never produce a moderation verdict', async () => {
  const mock = mockRequest();
  assert.deepEqual(await call(createHandler({ request: mock.request, key: () => '', rateLimit: () => false }), { source: 'draft', deal: draft }),
    { status: 503, payload: { error: 'not_configured' } });
  assert.equal(mock.calls.some(call => call.url.includes('generativelanguage')), false);
  const exhausted = createHandler({ request: mock.request, key: () => 'secret', rateLimit: () => true });
  assert.equal((await call(exhausted, { source: 'draft', deal: draft })).status, 429);
  const invalid = mockRequest({ model: { risk: 'approved', summary: 'Publish', concerns: [], suggested_edits: [] } });
  const invalidResult = await call(createHandler({ request: invalid.request, key: () => 'secret', rateLimit: () => false }), { source: 'draft', deal: draft });
  assert.deepEqual(invalidResult, { status: 503, payload: { error: 'invalid_model_output' } });
});

test('assistant routes moderation without running public chat or search', async () => {
  let routed = false;
  const handler = createAssistant({
    search: () => { throw new Error('search must not be called'); },
    moderate: (_req, res, body) => { routed = body.source === 'draft'; return res.status(200).json({ ok: true }); }
  });
  let code, output;
  await handler({ method: 'POST', body: { action: 'moderate_deal', source: 'draft' }, headers: { host: 'admin.dealzyai.com', origin: 'https://admin.dealzyai.com' } }, {
    setHeader() {}, status(value) { code = value; return this; }, json(value) { output = value; return value; }
  });
  assert.equal(routed, true);
  assert.equal(code, 200);
  assert.deepEqual(output, { ok: true });
});
