import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../dealzy-live.js',import.meta.url),'utf8');
const section=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));

test('French dinner search uses restaurants and preserves city and budget',()=>{
  const context=vm.createContext({market:{country:'CA',city:'Toronto'},state:{},MARKET_CITIES:{CA:[{value:'Toronto',label:'Toronto, ON'}]},persistMarket(){},updateMarketUI(){}});
  vm.runInContext(section('  function parseSmartQuery(', '  aiSearch=function'),context);
  const result=vm.runInContext('parseSmartQuery("Dîner à Toronto ce soir moins de CA$100")',context);
  assert.equal(result.query,'restaurants');
  assert.equal(context.state.filter,'Food & Drink');
  assert.equal(context.state.maxPrice,100);
});

test('late response from old market cannot populate the catalog',async()=>{
  let finish;
  const response=new Promise(resolve=>finish=resolve);
  const remembered=[];
  const context=vm.createContext({marketRevision:0,market:{country:'US',city:'Miami',currency:'USD'},state:{maxPrice:null},ensureMarketCityCoords:async()=>{},URLSearchParams,AbortSignal,fetch:()=>response,remember:rows=>{remembered.push(...rows);return rows;},toDeal:x=>x});
  vm.runInContext(section('  async function fetchLive(', '  async function fetchCategoryBoosted('),context);
  const pending=vm.runInContext('fetchLive("Food & Drink")',context);
  await Promise.resolve();
  context.marketRevision=1;
  context.market={country:'CA',city:'Toronto',currency:'CAD'};
  finish({ok:true,json:async()=>({query:{destination:'Miami'},results:[{title:'Miami restaurant'}]})});
  const result=await pending;
  assert.equal(result.length,0);
  assert.deepEqual(remembered,[]);
});

test('explore shows loading immediately and ignores superseded provider initialization',async()=>{
  const grid={innerHTML:''},count={textContent:''};
  let finish;
  const context=vm.createContext({exploreLoadSequence:0,marketRevision:0,renderExplore:null,$:selector=>selector==='#exploreGrid'?grid:count,h:x=>x,tr:x=>x,refreshDealzyProviderRuntime:()=>new Promise(resolve=>finish=resolve)});
  vm.runInContext(section('  renderExplore=async function(', '  renderAll=function('),context);
  const pending=vm.runInContext('renderExplore()',context);
  assert.match(grid.innerHTML,/Loading live results/);
  assert.equal(count.textContent,'Live search');
  context.exploreLoadSequence++;
  grid.innerHTML='New search';
  finish();
  await pending;
  assert.equal(grid.innerHTML,'New search');
});

test('missing provider coordinates stay unknown instead of becoming (0, 0)',()=>{
  const context=vm.createContext({});
  vm.runInContext(section('  function milesBetween(', '  function dealzyScore('),context);
  for(const missing of [null,undefined,'',' ']){
    context.missing=missing;
    assert.equal(vm.runInContext('milesBetween(45.5,-73.5,missing,missing)',context),null);
  }
  assert.equal(vm.runInContext('milesBetween(0,0,0,0)',context),0);
  assert.equal(vm.runInContext('milesBetween(45.5,-73.5,91,0)',context),null);
});

test('offers without coordinates survive only when their destination is confirmed',async()=>{
  let destination='Montreal';
  const context=vm.createContext({marketRevision:0,market:{country:'CA',city:'Montreal',currency:'CAD'},state:{coords:{lat:45.5,lng:-73.5}},ensureMarketCityCoords:async()=>{},coordsAllowedForMarket:()=>true,readExplorePrefs:()=>({radius:25}),URLSearchParams,AbortSignal,fetch:async()=>({ok:true,json:async()=>({query:{destination},results:[{id:'known-city',provider:'viator',title:'Activity',lat:null,lng:null}]})}),toDeal:x=>x,remember:x=>x});
  vm.runInContext(section('  function milesBetween(', '  function dealzyScore('),context);
  vm.runInContext(section('  function dealDistance(', '  function exploreRequestKey('),context);
  vm.runInContext(section('  async function fetchLive(', '  async function fetchCategoryBoosted('),context);
  assert.equal((await vm.runInContext('fetchLive("Things to Do")',context)).length,1);
  destination='Miami';
  assert.equal((await vm.runInContext('fetchLive("Things to Do")',context)).length,0);
});
