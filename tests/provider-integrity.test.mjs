import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../api/search.js',import.meta.url),'utf8');
function load(fetch=async()=>{throw new Error('Unexpected request');}){
  const ctx={require:()=>({}),module:{exports:{}},process:{env:{TICKETMASTER_API_KEY:'test'}},URL,URLSearchParams,fetch};
  vm.createContext(ctx);vm.runInContext(source,ctx);return ctx;
}
test('ticket ranges never become discounts and missing prices remain unknown',()=>{
 const ctx=load();
 const row=ctx.normalizeTicketmaster({id:'range',priceRanges:[{min:25,max:150,currency:'USD'}]});
 assert.equal(row.price,25);assert.equal(row.old,25);assert.equal(row.discountPct,0);
 for(const min of [undefined,null,'','invalid',-1]) assert.equal(ctx.normalizeTicketmaster({priceRanges:[{min}]}).price,null);
 assert.equal(ctx.normalizeTicketmaster({priceRanges:[{min:0}]}).price,0);
});
test('event search requests future events and rejects expired/canceled responses',async()=>{
 let requested;
 const ctx=load(async url=>{requested=new URL(url);return {ok:true,json:async()=>({_embedded:{events:[
  {id:'past',dates:{start:{dateTime:'2000-01-01T00:00:00Z'}}},
  {id:'future',dates:{start:{dateTime:'2099-01-01T00:00:00Z'}}},
  {id:'canceled',dates:{status:{code:'canceled'},start:{dateTime:'2099-01-01T00:00:00Z'}}}
 ]}})}});
 const before=Date.now();const result=await ctx.ticketmasterRequest({limit:10});
 assert.ok(Date.parse(requested.searchParams.get('startDateTime'))>=before-1000);
 assert.deepEqual(Array.from(result.results,r=>r.id),['ticketmaster-future']);
});
test('budget does not certify unknown or excessive ticket prices',async()=>{
 const ctx=load(async()=>({ok:true,json:async()=>({_embedded:{events:[
  {id:'unknown'},{id:'within',priceRanges:[{min:20}]},{id:'over',priceRanges:[{min:80}]},{id:'free',priceRanges:[{min:0}]}
 ]}})}));
 const result=await ctx.searchTicketmaster({q:'',limit:10,maxPrice:25});
 assert.deepEqual(Array.from(result.results,r=>r.id),['ticketmaster-within','ticketmaster-free']);
});
test('Yelp categories are trimmed and deduplicated',()=>{
 const row=load().normalizeYelp({categories:[{title:'Italian'},{title:' Italian '},{title:'Bars'},{title:''}]},'Food & Drink');
 assert.equal(row.text,'Italian · Bars');
});
