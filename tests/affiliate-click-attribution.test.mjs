import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const migration=fs.readFileSync(new URL('../supabase/migrations/20261014011800_expand_affiliate_click_provider_allowlist.sql',import.meta.url),'utf8');
const live=fs.readFileSync(new URL('../dealzy-live.js',import.meta.url),'utf8');
const admin=fs.readFileSync(new URL('../admin.html',import.meta.url),'utf8');

test('affiliate click RPC preserves its authenticated-only and rate-limited boundary',()=>{
  assert.match(migration,/dealzy_current_account_is_active\(\)/);
  assert.match(migration,/auth\.uid\(\) is null/);
  assert.match(migration,/pg_advisory_xact_lock/);
  assert.match(migration,/>= 60 then/);
  for(const partner of ['pelago','tours4fun','kkday','esimx','airzlink','gearup','magicstory','cj','abracadabra']){
    assert.ok(migration.includes("'"+partner+"'"),partner+' must be individually attributed');
  }
  assert.doesNotMatch(migration,/grant\s+execute\s+on\s+function[^;]*\s+to\s+anon/i);
});

test('outbound affiliate click tracking is initiated before navigation',()=>{
  assert.doesNotThrow(()=>new vm.Script(live,{filename:'dealzy-live.js'}));
  assert.match(live,/function trackPartnerClick\(d\)/);
  assert.match(live,/localStorage\.getItem\("dealzyCloudSession"\)/);
  assert.match(live,/keepalive:true/);
  assert.match(live,/dealzyPartnerClicks/);
  assert.doesNotMatch(live,/async function trackPartnerClick\(d\)/);
});

test('admin analytics state member-only clicks are not affiliate commissions',()=>{
  assert.match(admin,/Member partner clicks/);
  assert.match(admin,/signed-in members only/);
  assert.match(admin,/not sales or confirmed affiliate commissions/);
});
