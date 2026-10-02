import test from 'node:test';
import assert from 'node:assert/strict';
import accessModule from '../api/_accountAccess.js';
const {accountAccess}=accessModule;

test('access requires an explicit valid authorization response', async () => {
  const originalFetch=globalThis.fetch;
  try {
    for(const body of [{},null,[],{ok:true},{ok:true,allowed:true},{ok:true,allowed:true,status:'disabled'},{ok:'true',allowed:true,status:'active'},{ok:false,allowed:true,status:'active'}]){
      globalThis.fetch=async()=>Response.json(body);
      assert.equal((await accountAccess('test-jwt')).allowed,false);
      assert.equal((await accountAccess('test-jwt')).ok,false);
    }
    globalThis.fetch=async()=>Response.json({ok:true,allowed:true,status:'active'});
    assert.equal((await accountAccess('test-jwt')).allowed,true);
    for(const status of ['disabled','blacklisted']){
      globalThis.fetch=async()=>Response.json({ok:true,allowed:false,status});
      const result=await accountAccess('test-jwt');
      assert.equal(result.ok,true);
      assert.equal(result.allowed,false);
      assert.equal(result.status,status);
    }
    globalThis.fetch=async()=>{throw new Error('offline')};
    assert.equal((await accountAccess('test-jwt')).allowed,false);
    globalThis.fetch=async()=>new Response('invalid json');
    assert.equal((await accountAccess('test-jwt')).allowed,false);
  } finally {globalThis.fetch=originalFetch;}
});
