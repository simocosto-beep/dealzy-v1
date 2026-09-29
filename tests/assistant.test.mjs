import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler, intentFor, safeOffer } from '../api/assistant.js';

async function call(handler, { method = 'POST', body, headers = {} } = {}) {
  let code = 200;
  let output;
  const responseHeaders = {};
  const res = {
    setHeader(name, value) { responseHeaders[name] = value; },
    status(value) { code = value; return this; },
    json(value) { output = value; return value; }
  };
  await handler({ method, body, headers: { host:'dealzy-v1.vercel.app', origin:'https://dealzy-v1.vercel.app', ...headers } }, res);
  return { code, output, responseHeaders };
}

test('assistant needs a server-side key and never pretends guided search is AI chat', async () => {
  let called = false;
  const handler = createHandler({ key:() => '', search:async () => { called = true; } });
  assert.deepEqual((await call(handler, { method:'GET' })).output, { available:false });
  const result = await call(handler, { body:{ message:'Dinner tonight' } });
  assert.equal(result.code, 503);
  assert.equal(result.output.error, 'not_configured');
  assert.equal(called, false);
});

test('Gemini sees selected city and verified live offers, not GPS or account fields', async () => {
  let searchQuery, modelRequest;
  const handler = createHandler({
    key:() => 'server-key', rateLimit:() => false,
    search:async (req, res) => {
      searchQuery = req.query;
      return res.status(200).json({ ok:true, mode:'live-yelp', results:[
        { title:'Dinner for two', place:'Los Angeles', source:'Yelp', price:70, partnerUrl:'https://example.com/dinner' },
        { title:'Injected', place:'Los Angeles', source:'Yelp', price:30, partnerUrl:'javascript:alert(1)' }
      ] });
    },
    generate:async (url, options) => {
      modelRequest = { url, options };
      return { ok:true, status:200, json:async () => ({ candidates:[{ content:{ parts:[{ text:'Voici une option à Los Angeles.' }] } }] }) };
    }
  });
  const result = await call(handler, { body:{
    message:'Un restaurant à moins de 80 $', city:'Los Angeles', country:'US', locale:'fr',
    coords:{ lat:34.123456, lng:-118.123456 }, account:{ email:'secret@example.com' }
  } });
  assert.equal(result.code, 200);
  assert.equal(result.output.reply, 'Voici une option à Los Angeles.');
  assert.equal(result.output.offers[0].url, 'https://example.com/dinner');
  assert.equal(result.output.offers[1].url, null);
  assert.equal(searchQuery.category, 'Food & Drink');
  assert.equal(searchQuery.maxPrice, 80);
  assert.equal(searchQuery.city, 'Los Angeles');
  assert.match(modelRequest.url, /gemini-3\.5-flash-lite:generateContent$/);
  assert.equal(modelRequest.options.headers['x-goog-api-key'], 'server-key');
  assert.doesNotMatch(modelRequest.options.body, /34\.123456|secret@example\.com|javascript:alert/);
  assert.equal(result.output.offers.length, 2);
});

test('demo data is not presented as verified live offers; quota errors stay explicit', async () => {
  let modelRequest;
  const handler = createHandler({
    key:() => 'server-key', rateLimit:() => false,
    search:async (_req, res) => res.status(200).json({ ok:true, mode:'demo-fallback', results:[{ title:'Demo spa', price:1 }] }),
    generate:async (_url, options) => {
      modelRequest = JSON.parse(options.body);
      return { ok:true, status:200, json:async () => ({ candidates:[{ content:{ parts:[{ text:'No verified offers right now.' }] } }] }) };
    }
  });
  const result = await call(handler, { body:{ message:'Spa in Miami' } });
  assert.deepEqual(result.output.offers, []);
  assert.match(modelRequest.contents.at(-1).parts[0].text, /\[\]/);

  const quota = createHandler({ key:() => 'server-key', rateLimit:() => false,
    search:async (_req, res) => res.status(200).json({ mode:'demo-fallback' }),
    generate:async () => ({ ok:false, status:429 }) });
  assert.deepEqual(await call(quota, { body:{ message:'Dinner' } }).then(({ code, output }) => ({ code, output })),
    { code:429, output:{ error:'provider_quota' } });
});

test('input and cross-origin requests are rejected before model generation', async () => {
  const handler = createHandler({ key:() => 'server-key', rateLimit:() => false,
    generate:async () => { throw new Error('model must not be called'); } });
  assert.equal((await call(handler, { body:{ message:'x'.repeat(501) } })).code, 400);
  assert.equal((await call(handler, { body:{ message:'Hi' }, headers:{ origin:'https://evil.example' } })).code, 403);
  assert.equal((await call(handler, { body:{ message:'Hi' }, headers:{ 'content-length':'6000' } })).code, 413);
  assert.equal((await call(handler, { method:'DELETE' })).code, 405);
  assert.deepEqual(intentFor('Massage moins de 50 CA$'), { category:'Spa & Beauty', maxPrice:50 });
  assert.equal(safeOffer({ title:'X', partnerUrl:'data:text/html,hi' }, 'CAD').url, null);
});
