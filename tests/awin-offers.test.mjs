import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {activeForMarket,searchAwin,safePartnerUrl}=require('../api/_awin.js');
const now=Date.parse('2026-10-01T12:00:00Z');
const offer={
  promotionId:42,type:'voucher',title:'20% off museum tickets',
  description:'Tickets for selected dates',terms:'Valid on eligible visits',
  advertiser:{id:7,name:'Example Museum',joined:true},
  startDate:'2026-09-01T00:00:00.000',endDate:'2026-11-01T00:00:00.000',
  regions:{all:false,list:[{countryCode:'US',name:'United States'}]},
  urlTracking:'https://www.awin1.com/cread.php?awinmid=7&awinaffid=8',
  voucher:{code:'SAVE20'}
};

test('only active, joined, tracked offers in the requested market are eligible',()=>{
  assert.equal(activeForMarket(offer,'US',now),true);
  assert.equal(activeForMarket(offer,'CA',now),false);
  assert.equal(activeForMarket({...offer,advertiser:{...offer.advertiser,joined:false}},'US',now),false);
  assert.equal(activeForMarket({...offer,endDate:'2026-09-30T00:00:00.000'},'US',now),false);
  assert.equal(activeForMarket({...offer,urlTracking:'javascript:alert(1)'},'US',now),false);
  assert.equal(safePartnerUrl('http://example.com'),null);
});

test('search uses publisher credentials server side and never invents a price',async()=>{
  const previousId=process.env.AWIN_PUBLISHER_ID;
  const previousToken=process.env.AWIN_ACCESS_TOKEN;
  process.env.AWIN_PUBLISHER_ID='12345';
  process.env.AWIN_ACCESS_TOKEN='test-secret';
  try{
    let requests=0;
    const fetchImpl=async(url,options)=>{
      requests++;
      assert.equal(url,'https://api.awin.com/publisher/12345/promotions');
      assert.equal(options.headers.Authorization,'Bearer test-secret');
      assert.deepEqual(JSON.parse(options.body).filters,{membership:'joined',regionCodes:['US'],status:'active',type:'all'});
      return {ok:true,json:async()=>({promotions:[offer,{...offer,promotionId:43,advertiser:{...offer.advertiser,joined:false}}]})};
    };
    const response=await searchAwin({q:'SAVE20',countryCode:'US',currency:'USD',now,fetchImpl});
    assert.equal(requests,1);
    assert.equal(response.total,1);
    assert.equal(response.results[0].provider,'awin');
    assert.equal(response.results[0].price,null);
    assert.equal(response.results[0].old,null);
    assert.equal(response.results[0].discountPct,0);
    assert.equal(response.results[0].priceLabel,'Code SAVE20');
    assert.equal(response.results[0].partnerUrl,offer.urlTracking);
    const cached=await searchAwin({q:'museum',countryCode:'US',currency:'USD',now:now+1000,fetchImpl});
    assert.equal(cached.results.length,1);
    assert.equal(requests,1);
    const budget=await searchAwin({maxPrice:50,countryCode:'US',currency:'USD',now,fetchImpl});
    assert.deepEqual(budget.results,[]);
    assert.equal(requests,1);
  }finally{
    if(previousId===undefined) delete process.env.AWIN_PUBLISHER_ID;
    else process.env.AWIN_PUBLISHER_ID=previousId;
    if(previousToken===undefined) delete process.env.AWIN_ACCESS_TOKEN;
    else process.env.AWIN_ACCESS_TOKEN=previousToken;
  }
});
