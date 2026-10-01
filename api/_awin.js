const AWIN_API='https://api.awin.com';
const CACHE_MS=15*60*1000;
const cache=new Map();

function safePartnerUrl(value){
  try{
    const url=new URL(String(value||''));
    return url.protocol==='https:'?url.href:null;
  }catch(_){return null;}
}

function activeForMarket(offer,countryCode,now=Date.now()){
  if(!offer||offer.advertiser?.joined!==true) return false;
  if(!offer.promotionId||!String(offer.title||'').trim()) return false;
  if(!safePartnerUrl(offer.urlTracking)) return false;
  const start=Date.parse(offer.startDate||'');
  const end=Date.parse(offer.endDate||'');
  if(!Number.isFinite(start)||!Number.isFinite(end)||start>now||end<now) return false;
  const regions=offer.regions||{};
  return regions.all===true || (Array.isArray(regions.list)&&regions.list.some(region=>region.countryCode===countryCode));
}

function normalizeOffer(offer,countryCode,currency){
  const code=offer.type==='voucher'?String(offer.voucher?.code||'').trim():'';
  const advertiser=String(offer.advertiser?.name||'Merchant').trim();
  return {
    id:'awin-'+String(offer.promotionId),
    title:String(offer.title||'Partner offer').trim(),
    category:'Shopping',
    place:advertiser+' · Online',
    lat:null,lng:null,price:null,old:null,
    priceLabel:code?'Code '+code:'Promotion',
    rating:'',image:'',
    text:[offer.description,code?'Code: '+code:'',offer.terms].filter(Boolean).join('\n\n').slice(0,1600),
    partnerUrl:safePartnerUrl(offer.urlTracking),
    source:'Awin',provider:'awin',currency,
    savings:0,discountPct:0,
    validUntil:offer.endDate||null,
    countryCode
  };
}

function offerRows(data){
  if(Array.isArray(data)) return data;
  for(const value of [data?.promotions,data?.offers,data?.results,data?.data,data?.data?.promotions]){
    if(Array.isArray(value)) return value;
    if(Array.isArray(value?.items)) return value.items;
  }
  return [];
}

async function fetchMarket(countryCode,{fetchImpl=fetch,now=Date.now()}={}){
  const publisherId=String(process.env.AWIN_PUBLISHER_ID||'');
  const token=String(process.env.AWIN_ACCESS_TOKEN||'');
  if(!/^\d+$/.test(publisherId)||!token) return {ok:false,reason:'not-configured',results:[]};

  const cached=cache.get(countryCode);
  if(cached&&now-cached.at<CACHE_MS) return cached.value;
  if(cached?.promise) return cached.promise;

  const promise=(async()=>{
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),6000);
    try{
      const response=await fetchImpl(AWIN_API+'/publisher/'+publisherId+'/promotions',{
        method:'POST',
        headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json','Accept':'application/json'},
        body:JSON.stringify({filters:{membership:'joined',regionCodes:[countryCode],status:'active',type:'all'},pagination:{page:1,pageSize:100}}),
        signal:controller.signal
      });
      if(!response.ok) return {ok:false,reason:'http-'+response.status,results:[]};
      const rows=offerRows(await response.json());
      const result={ok:true,results:rows.filter(row=>activeForMarket(row,countryCode,now))};
      cache.set(countryCode,{at:now,value:result});
      return result;
    }catch(_){return {ok:false,reason:'unavailable',results:[]};}
    finally{clearTimeout(timer);}
  })();
  cache.set(countryCode,{at:0,promise});
  return promise;
}

async function searchAwin({q='',maxPrice=0,limit=20,countryCode='US',currency='USD',fetchImpl,now}={}){
  if(maxPrice) return {ok:true,results:[]}; // Awin offers have no verified price for a budget filter.
  const response=await fetchMarket(countryCode,{fetchImpl,now});
  if(!response.ok) return response;
  const needle=String(q||'').trim().toLowerCase();
  const rows=response.results.filter(row=>!needle||[
    row.title,row.description,row.advertiser?.name,row.voucher?.code
  ].some(value=>String(value||'').toLowerCase().includes(needle)));
  return {ok:true,results:rows.slice(0,Math.max(1,Math.min(40,limit))).map(row=>normalizeOffer(row,countryCode,currency)),total:rows.length};
}

module.exports={searchAwin,activeForMarket,normalizeOffer,safePartnerUrl};
