import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const script=fs.readFileSync(new URL('../admin.js',import.meta.url),'utf8');
const markup=fs.readFileSync(new URL('../admin.html',import.meta.url),'utf8');
const start=script.indexOf('function exportPartnerClicksCsv(){');
const end=script.indexOf('async function fetchUsers',start);
const exportSource=script.slice(start,end);

test('partner click report stays behind the existing admin analytics view',()=>{
  assert.ok(start>-1&&end>start);
  assert.match(markup,/id="exportPartnerClicksBtn"/);
  assert.match(script,/\$\('#exportPartnerClicksBtn'\)\.onclick=exportPartnerClicksCsv/);
  assert.match(markup,/Member click trend/);
  assert.match(markup,/No guest clicks or earnings are included/);
});

test('click summary exports counts only, without individual identities or invented revenue',()=>{
  const clicks=[];
  const flashes=[];
  let exported='';
  const ctx={
    analyticsData:{partner_clicks:{
      clicks_7d:2,clicks_30d:4,
      top_providers:[{provider:'gearup',count:3},{provider:'booking.com',count:1}],
      recent_daily_clicks:[{day:'2026-10-12',count:1},{day:'2026-10-13',count:3}]
    }},
    csvCell:v=>'"'+String(v??'').replaceAll('"','""')+'"',
    Blob:class {constructor(parts){exported=parts.join('')}},
    URL:{createObjectURL:()=> 'blob:fake',revokeObjectURL:()=>{}},
    document:{body:{appendChild:()=>{}},createElement:()=>({click:()=>clicks.push(1),remove:()=>{}})},
    Date,setTimeout:()=>{},flash:(message)=>flashes.push(message)
  };
  vm.runInNewContext(exportSource+'\nexportPartnerClicksCsv();',ctx);
  assert.equal(clicks.length,1);
  assert.match(exported,/last_7_days/);
  assert.match(exported,/last_30_days/);
  assert.match(exported,/gearup/);
  assert.match(exported,/booking.com/);
  assert.match(exported,/2026-10-13/);
  assert.match(exported,/not sales, revenue or all visitor clicks/);
  assert.doesNotMatch(exported,/customer_email|payout_amount|affiliate_revenue/);
  assert.ok(flashes[0].includes('not confirmed commissions'));
});

test('javascript parses and the daily chart has an empty-data state',()=>{
  assert.doesNotThrow(()=>new vm.Script(script));
  assert.match(script,/id="partnerClicksDailyBars"|\$\('#partnerClicksDailyBars'\)/);
  assert.match(script,/No member click history available/);
  assert.match(script,/Array.isArray\(a.partner_clicks\?\.recent_daily_clicks\)/);
});
