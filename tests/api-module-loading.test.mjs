import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

test('all deployed API entry points load as callable functions', () => {
  for (const route of [
    'assistant', 'auth', 'bootstrap', 'cloud-status', 'notifications',
    'price-history', 'providers', 'recommend', 'search', 'sync',
    'viator-status', 'watch-check'
  ]) {
    assert.equal(typeof require(`../api/${route}.js`), 'function', route);
  }
});

test('the shared cloud-status endpoint serves the public health route', async () => {
  const handler = require('../api/cloud-status.js');
  let status;
  let body;
  await handler({ query:{ view:'health' } }, {
    setHeader() {},
    status(value) { status = value; return this; },
    json(value) { body = value; return this; }
  });
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.service, 'dealzy-api');
});
