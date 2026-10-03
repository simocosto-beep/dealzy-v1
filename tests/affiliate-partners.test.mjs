import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const affiliates=require('../dealzy-affiliates.js');
const ids=affiliates.partners.map(p=>p.id);

test('approved catalog keeps USA and Canada tracking separate and excludes Morocco',()=>{
  const hosts=new Set(['pelago.pxf.io','easygoinc.pxf.io','kkdaygreaterchina.sjv.io','skylarkconnectllc.pxf.io']);
  const us=affiliates.forCountry('US',ids), ca=affiliates.forCountry('CA',ids);
  assert.equal(us.length,4); assert.equal(ca.length,4);
  assert.equal(new Set([...us,...ca].map(p=>p.url)).size,8);
  for(const row of [...us,...ca]){
    const url=new URL(row.url);
    assert.equal(url.protocol,'https:');
    assert.ok(hosts.has(url.hostname));
    assert.equal(url.username+url.password,'');
  }
  assert.deepEqual(affiliates.forCountry('MA',ids),[]);
  assert.deepEqual(affiliates.forCountry('US',[]),[]);
  assert.deepEqual(affiliates.forCountry('CA',['pelago']).map(p=>p.id),['pelago']);
  assert.match(affiliates.expediaUrl('US'),/usa-city-stays/);
  assert.match(affiliates.expediaUrl('CA'),/canada-city-stays/);
  assert.equal(affiliates.expediaUrl('MA'),'');
});

test('partner cards disclose commissions and preserve external-link protection',()=>{
  const html=affiliates.render('US','en',ids);
  assert.match(html,/Affiliate links: Dealzy may earn a commission/);
  assert.match(html,/American West/);
  assert.equal((html.match(/rel="sponsored noopener noreferrer"/g)||[]).length,4);
  assert.match(affiliates.render('CA','fr',ids),/Liens affiliés/);
  assert.equal(affiliates.render('MA','fr',ids),'');
});

test('providers exposes approved clickouts separately from live inventory and honors disabled providers',async()=>{
  const originalFetch=global.fetch;
  global.fetch=async()=>({ok:true,json:async()=>[{key:'providers',value:{kkday:{enabled:false}}}]});
  try{
    let body;
    await require('../api/providers.js')({method:'GET'},{setHeader(){},status(){return this;},json(value){body=value;}});
    assert.deepEqual(body.affiliatePartners,['pelago','tours4fun','esimx']);
    assert.equal(body.providers.find(p=>p.name==='KKday').status,'disabled-by-admin');
    assert.equal(body.providers.find(p=>p.name==='Pelago').kind,'affiliate-clickout');
  }finally{global.fetch=originalFetch;}
});
