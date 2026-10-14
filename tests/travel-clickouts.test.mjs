import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const affiliates=createRequire(import.meta.url)('../dealzy-affiliates.js');
const tools=fs.readFileSync(new URL('../dealzy-tools.js',import.meta.url),'utf8');

test('ordinary flight search preserves route, dates and market without third-party attribution',()=>{
  const trip={origin:' jfk ',destination:'mia',out:'2026-11-10'};
  const oneWay=new URL(affiliates.flightUrl(trip));
  assert.equal(oneWay.origin,'https://www.skyscanner.net');
  assert.equal(oneWay.pathname,'/transport/flights/JFK/MIA/20261110');
  const roundTrip=new URL(affiliates.flightUrl({...trip,back:'2026-11-12',country:'CA',locale:'fr'}));
  assert.equal(roundTrip.pathname,'/transport/flights/JFK/MIA/20261110/20261112');
  assert.equal(roundTrip.searchParams.get('currency'),'CAD');
  assert.equal(roundTrip.searchParams.get('locale'),'fr-CA');
  assert.deepEqual([...roundTrip.searchParams.keys()].sort(),['adults','cabinclass','currency','locale','market']);
  for(const invalid of [{out:'2026-02-30'},{back:'2026-11-09'},{back:'2026-11-10'},{origin:'JFK/abc'},{destination:'JFK'},{out:''}]){
    assert.equal(affiliates.flightUrl({...trip,...invalid}),'');
  }
});

function trackingHarness(session,history='[]'){
  const values=new Map([['dealzyMarket',JSON.stringify({country:'CA',city:'Toronto',currency:'CAD'})],['dealzyPartnerClicks',history]]);
  if(session) values.set('dealzyCloudSession',JSON.stringify(session));
  const requests=[];
  const context=vm.createContext({localStorage:{getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)},queueCloudSync(){},fetch:(url,options)=>{requests.push({url,...options});return Promise.resolve({ok:true});},Date});
  const start=tools.indexOf('  function recordPartnerClick(');
  const end=tools.indexOf('  function partnerClickStats()',start);
  assert.ok(start>=0&&end>start);
  vm.runInContext(tools.slice(start,end),context);
  return {requests,values,click:()=>context.recordPartnerClick('airzlink','AirZlink eSIM · CA',{source:'travel-hub'})};
}

test('Travel Hub guests retain local history without unauthenticated RPC requests',()=>{
  const h=trackingHarness();h.click();
  assert.equal(h.requests.length,0);
  assert.equal(JSON.parse(h.values.get('dealzyPartnerClicks'))[0].provider,'airzlink');
});

test('member attribution starts synchronously before navigation and tolerates corrupt local history',()=>{
  for(const history of ['[]','{}']){
    const h=trackingHarness({access_token:'local-test-token',expires_at:Date.now()/1000+3600},history);
    h.click();
    assert.equal(h.requests.length,1);
    assert.equal(h.requests[0].keepalive,true);
    assert.equal(h.requests[0].headers.Authorization,'Bearer local-test-token');
    const body=JSON.parse(h.requests[0].body);
    assert.equal(body.p_provider,'airzlink');
    assert.equal(body.p_source,'travel-hub');
    assert.equal(body.p_country_code,'CA');
  }
  const expired=trackingHarness({access_token:'expired-local-test-token',expires_at:Date.now()/1000-1});
  expired.click();assert.equal(expired.requests.length,0);
});

test('Travel Hub rejects reversed dates without destroying the form and opens a valid search',()=>{
  const nodes=Object.fromEntries(Object.entries({dzFlightFrom:'YYZ',dzFlightTo:'MIA',dzFlightOut:'2026-11-10',dzFlightBack:'2026-11-09',dzFlightGo:''}).map(([key,value])=>['#'+key,{value}]));
  const opened=[],alerts=[],saved=[];
  const context=vm.createContext({runtime:{skyscanner:true},market:{country:'CA'},form:{innerHTML:'',querySelector:key=>nodes[key]},saveSearch:(...args)=>saved.push(args),recordPartnerClick(){},DealzyAffiliates:affiliates,window:{open:url=>opened.push(url)},alert:message=>alerts.push(message)});
  const start=tools.indexOf('    const renderFlight=()=>{');
  vm.runInContext(tools.slice(start,tools.indexOf('    const renderCar=()=>{',start))+'\nrenderFlight();',context);
  nodes['#dzFlightGo'].onclick();
  assert.equal(alerts.length,1);assert.equal(opened.length,0);assert.equal(saved.length,0);
  assert.match(context.form.innerHTML,/dzFlightFrom/);
  nodes['#dzFlightBack'].value='2026-11-12';
  nodes['#dzFlightGo'].onclick();
  assert.equal(saved.length,1);
  assert.equal(new URL(opened[0]).pathname,'/transport/flights/YYZ/MIA/20261110/20261112');
});
