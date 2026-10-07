import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const affiliates=require('../dealzy-affiliates.js');
const ids=affiliates.partners.map(p=>p.id);

test('approved catalog keeps USA and Canada tracking separate and excludes Morocco',()=>{
  const hosts=new Set(['pelago.pxf.io','easygoinc.pxf.io','kkdaygreaterchina.sjv.io','skylarkconnectllc.pxf.io','airzlinkesimapp.pxf.io','gearupapp.pxf.io','www.tkqlhce.com']);
  const us=affiliates.forCountry('US',ids), ca=affiliates.forCountry('CA',ids);
  assert.equal(us.length,7); assert.equal(ca.length,6);
  assert.ok(!ca.some(p=>p.id==='magicstory'));
  assert.equal(new Set([...us,...ca].map(p=>p.url)).size,11);
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
  assert.equal((html.match(/rel="sponsored noopener noreferrer"/g)||[]).length,7);
  assert.match(affiliates.render('CA','fr',ids),/Liens affiliés/);
  assert.equal(affiliates.render('MA','fr',ids),'');
});

test('providers exposes approved clickouts separately from live inventory and honors disabled providers',async()=>{
  const originalFetch=global.fetch;
  global.fetch=async()=>({ok:true,json:async()=>[{key:'providers',value:{kkday:{enabled:false}}}]});
  try{
    let body;
    await require('../api/providers.js')({method:'GET'},{setHeader(){},status(){return this;},json(value){body=value;}});
    assert.deepEqual(body.affiliatePartners,['pelago','tours4fun','esimx','airzlink','gearup','magicstory']);
    assert.equal(body.providers.find(p=>p.name==='KKday').status,'disabled-by-admin');
    assert.equal(body.providers.find(p=>p.name==='Pelago').kind,'affiliate-clickout');
  }finally{global.fetch=originalFetch;}
});


test('travel catalog excludes unrelated products and unsupported destinations',()=>{
  for(const country of ['US','CA']){
    const html=affiliates.render(country,'fr',ids,true);
    assert.doesNotMatch(html,/gearup|magicstory|undefined|href=""/);
    assert.match(html,/pelago/);
  }
});

test('Booking CJ link preserves destination, dates and guests',()=>{
  const target='https://www.booking.com/searchresults.html?ss=Montr%C3%A9al&checkin=2026-11-10&checkout=2026-11-12&group_adults=2&no_rooms=1';
  const tracked=new URL(affiliates.bookingUrl(target));
  assert.equal(tracked.hostname,'www.tkqlhce.com');
  assert.equal(tracked.pathname,'/click-101895085-15734710');
  assert.equal(tracked.searchParams.get('url'),target);
});

test('Travel Hub hotel submission opens the affiliate URL and rejects reversed dates',async()=>{
  const fs=await import('node:fs');
  const vm=await import('node:vm');
  const source=fs.readFileSync(new URL('../dealzy-tools.js',import.meta.url),'utf8');
  const start=source.indexOf('    const renderHotel=()=>{');
  const end=source.indexOf('    const renderFlight=()=>{',start);
  const nodes=Object.fromEntries(Object.entries({dzHotelDest:'Toronto',dzHotelAdults:'2',dzHotelIn:'2026-11-10',dzHotelOut:'2026-11-12',dzHotelGo:''}).map(([key,value])=>['#'+key,{value}]));
  const opened=[],clicks=[],alerts=[];
  const context=vm.createContext({runtime:{booking:true},market:{city:'Toronto',country:'CA'},esc:x=>x,form:{innerHTML:'',querySelector:key=>nodes[key]},showPanel(){},saveSearch(){},recordPartnerClick:(...args)=>clicks.push(args),URLSearchParams,DealzyAffiliates:affiliates,window:{open:url=>opened.push(url)},alert:message=>alerts.push(message)});
  vm.runInContext(source.slice(start,end)+'\nrenderHotel();',context);
  nodes['#dzHotelGo'].onclick();
  assert.equal(new URL(opened[0]).hostname,'www.tkqlhce.com');
  assert.match(new URL(opened[0]).searchParams.get('url'),/ss=Toronto/);
  assert.equal(clicks.length,1);
  nodes['#dzHotelOut'].value='2026-11-09';
  nodes['#dzHotelGo'].onclick();
  assert.equal(opened.length,1);
  assert.equal(alerts.length,1);
});
