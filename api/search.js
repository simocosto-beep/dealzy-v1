const deals = require('./_demoDeals');

const DEALZY_SUPABASE_URL='https://stkmhgeuavsidpapqvyw.supabase.co';
const DEALZY_SUPABASE_KEY='sb_publishable_EVDiDkczLgCmggcMxbV8tw_jQm4g9Rh';
let dealzyRuntimeCache={at:0,data:{}};

async function getDealzyRuntimeConfig(){
  if(Date.now()-dealzyRuntimeCache.at<15000) return dealzyRuntimeCache.data;
  try{
    const r=await fetch(DEALZY_SUPABASE_URL+'/rest/v1/dealzy_runtime_config?select=key,value&public_read=eq.true',{
      headers:{'apikey':DEALZY_SUPABASE_KEY,'Accept':'application/json'}
    });
    if(!r.ok) throw new Error('runtime-config-'+r.status);
    const rows=await r.json();
    const data={};
    for(const row of Array.isArray(rows)?rows:[]) data[row.key]=row.value||{};
    dealzyRuntimeCache={at:Date.now(),data};
    return data;
  }catch(_){
    return dealzyRuntimeCache.data||{};
  }
}

function runtimeEnabled(group,key,defaultValue=true){
  const row=group&&group[key];
  if(!row||typeof row!=='object'||typeof row.enabled!=='boolean') return defaultValue;
  return row.enabled;
}


const VIATOR_BASE='https://api.viator.com/partner';
const VIATOR_MIAMI_DESTINATION='662';
let viatorDestinationsCache=null;
let viatorDestinationsCacheAt=0;

function normalizePlaceName(value){
  return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
}

async function resolveViatorDestination(city,key){
  if(!city) return VIATOR_MIAMI_DESTINATION;
  if(normalizePlaceName(city)==='miami') return VIATOR_MIAMI_DESTINATION;
  try{
    if(!viatorDestinationsCache || Date.now()-viatorDestinationsCacheAt>21600000){
      const r=await fetch(VIATOR_BASE+'/destinations',{
        headers:{
          'Accept':'application/json;version=2.0',
          'Accept-Language':'en-US',
          'exp-api-key':key
        }
      });
      if(!r.ok) return null;
      const data=await r.json();
      const rows=Array.isArray(data)?data:(Array.isArray(data.destinations)?data.destinations:(Array.isArray(data.data)?data.data:[]));
      viatorDestinationsCache=rows;
      viatorDestinationsCacheAt=Date.now();
    }
    const needle=normalizePlaceName(city);
    const exact=viatorDestinationsCache.find(x=>normalizePlaceName(x.name)===needle && String(x.type||'').toUpperCase()==='CITY')
      ||viatorDestinationsCache.find(x=>normalizePlaceName(x.name)===needle)
      ||viatorDestinationsCache.find(x=>normalizePlaceName(x.name).includes(needle) && String(x.type||'').toUpperCase()==='CITY');
    return exact ? String(exact.destinationId||exact.id||'') || null : null;
  }catch(_){
    return null;
  }
}

function normalizeViator(row,{city='Miami',countryCode='US',currency='USD'}={}){
  const summary=row && row.pricing && row.pricing.summary ? row.pricing.summary : {};
  const price=Number(summary.fromPrice||0);
  const old=Number(summary.fromPriceBeforeDiscount||price||0);
  const image=Array.isArray(row.images)&&row.images[0]&&Array.isArray(row.images[0].variants)
    ? [...row.images[0].variants].sort((a,b)=>(b.width||0)-(a.width||0))[0]?.url||''
    : '';
  const reviews=row.reviews||{};
  return {
    id:'viator-'+String(row.productCode||row.code||Math.random().toString(36).slice(2)),
    title:row.title||'Viator experience',
    category:'Things to Do',
    place:city+', '+countryCode,
    lat:null,
    lng:null,
    price,
    old,
    rating:reviews.combinedAverageRating||'',
    reviewCount:reviews.totalReviews||0,
    image,
    text:row.description||row.shortDescription||'',
    partnerUrl:row.productUrl||null,
    source:'Viator',
    provider:'viator',
    currency:(row.pricing&&row.pricing.currency)||currency,
    savings:Math.max(0,old-price),
    discountPct:old?Math.round((1-price/old)*100):0,
    flags:Array.isArray(row.flags)?row.flags:[]
  };
}

async function searchViator({q,maxPrice,limit,city='Miami',countryCode='US',currency='USD'}){
  const key=process.env.VIATOR_PRODUCTION_API_KEY;
  if(!key) return {ok:false,reason:'production-key-not-configured',results:[]};

  const destination=await resolveViatorDestination(city,key);
  if(!destination) return {ok:false,reason:'destination-not-found',results:[]};

  const body={
    filtering:{destination},
    sorting:{sort:'TRAVELER_RATING',order:'DESCENDING'},
    pagination:{start:1,count:Math.min(50,Math.max(limit*3,12))},
    currency
  };

  const r=await fetch(VIATOR_BASE+'/products/search',{
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'Accept':'application/json;version=2.0',
      'Accept-Language':'en-US',
      'exp-api-key':key
    },
    body:JSON.stringify(body)
  });

  if(!r.ok){
    let msg='';
    try{msg=await r.text()}catch(_){}
    return {ok:false,reason:'http-'+r.status,error:msg.slice(0,180),results:[]};
  }

  const data=await r.json();
  const allRows=Array.isArray(data.products)?data.products.map(row=>normalizeViator(row,{city,countryCode,currency})):[];
  let rows=allRows;
  if(q){
    const needle=q.toLowerCase();
    const exact=allRows.filter(d=>(d.title+' '+d.text).toLowerCase().includes(needle));
    rows=exact.length>=Math.min(6,limit)
      ? exact
      : [...exact,...allRows.filter(d=>!exact.some(x=>x.id===d.id))];
  }
  if(maxPrice) rows=rows.filter(d=>d.price>0&&d.price<=maxPrice);
  rows=rows.slice(0,limit);
  return {ok:true,results:rows,total:Number(data.totalCount||rows.length)};
}


function bestTicketmasterImage(images){
  if(!Array.isArray(images)||!images.length) return '';
  return [...images].sort((a,b)=>(Number(b.width||0)*Number(b.height||0))-(Number(a.width||0)*Number(a.height||0)))[0]?.url||'';
}

function normalizeTicketmaster(row,defaultCurrency='USD'){
  const venue=row?._embedded?.venues?.[0]||{};
  const pr=Array.isArray(row.priceRanges)&&row.priceRanges.length?row.priceRanges[0]:{};
  const min=Number(pr.min||0), max=Number(pr.max||min||0);
  const localDate=row?.dates?.start?.localDate||'';
  const localTime=row?.dates?.start?.localTime||'';
  const classification=row?.classifications?.[0]?.segment?.name||'Event';
  return {
    id:'ticketmaster-'+String(row.id||Math.random().toString(36).slice(2)),
    title:row.name||'Ticketmaster event',
    category:'Things to Do',
    place:[venue.name,venue.city?.name,venue.state?.stateCode].filter(Boolean).join(' • '),
    lat:Number(venue.location?.latitude)||null,
    lng:Number(venue.location?.longitude)||null,
    price:min,
    old:max||min,
    rating:'',
    image:bestTicketmasterImage(row.images),
    text:[classification,localDate,localTime].filter(Boolean).join(' · '),
    partnerUrl:row.url||null,
    source:'Ticketmaster',
    provider:'ticketmaster',
    currency:pr.currency||defaultCurrency,
    savings:0,
    discountPct:0,
    eventDate:localDate||null,
    eventTime:localTime||null
  };
}

async function ticketmasterRequest({q,limit,city='Miami',countryCode='US',currency='USD',lat=null,lng=null,radius=25}){
  const key=process.env.TICKETMASTER_API_KEY;
  if(!key) return {ok:false,reason:'not-configured',results:[]};
  const p=new URLSearchParams({
    apikey:key,
    countryCode,
    size:String(Math.min(20,Math.max(1,limit))),
    sort:'date,asc'
  });
  if(Number.isFinite(lat)&&Number.isFinite(lng)){
    p.set('latlong',String(lat)+','+String(lng));
    p.set('radius',String(Math.max(1,Math.min(100,Number(radius)||25))));
    p.set('unit','miles');
  }else{
    p.set('city',city);
  }
  if(q) p.set('keyword',q);
  const r=await fetch('https://app.ticketmaster.com/discovery/v2/events.json?'+p.toString(),{
    headers:{'Accept':'application/json'}
  });
  if(!r.ok){
    let msg='';
    try{msg=await r.text()}catch(_){}
    return {ok:false,reason:'http-'+r.status,error:msg.slice(0,180),results:[]};
  }
  const data=await r.json();
  const events=data?._embedded?.events||[];
  return {ok:true,results:events.map(row=>normalizeTicketmaster(row,currency)),total:Number(data?.page?.totalElements||events.length)};
}

async function searchTicketmaster({q,maxPrice,limit,city='Miami',countryCode='US',currency='USD',lat=null,lng=null,radius=25}){
  let live=await ticketmasterRequest({q,limit:Math.max(limit*2,12),city,countryCode,currency,lat,lng,radius});
  if(!live.ok) return live;
  let rows=live.results||[];
  if(q && rows.length<Math.min(6,limit)){
    const broad=await ticketmasterRequest({q:'',limit:Math.max(limit*2,16),city,countryCode,currency,lat,lng,radius});
    if(broad.ok){
      const seen=new Set(rows.map(x=>x.id));
      rows=[...rows,...broad.results.filter(x=>!seen.has(x.id))];
    }
  }
  if(maxPrice) rows=rows.filter(d=>!d.price||d.price<=maxPrice);
  return {...live,results:rows.slice(0,limit)};
}


function yelpCategory(category){
  if(category==='Food & Drink') return 'restaurants,food,coffee';
  if(category==='Spa & Beauty') return 'spas,beautysvc';
  return '';
}

function normalizeYelp(row,category,currency='USD'){
  const loc=row.location||{};
  const coords=row.coordinates||{};
  return {
    id:'yelp-'+String(row.id||Math.random().toString(36).slice(2)),
    title:row.name||'Yelp place',
    category:category||'Local',
    place:[loc.address1,loc.city,loc.state].filter(Boolean).join(' • '),
    lat:Number(coords.latitude)||null,
    lng:Number(coords.longitude)||null,
    price:null,
    old:null,
    priceLabel:row.price||null,
    rating:Number(row.rating||0)||'',
    reviewCount:Number(row.review_count||0),
    image:row.image_url||'',
    text:Array.isArray(row.categories)?row.categories.map(x=>x.title).filter(Boolean).join(' · '):'',
    partnerUrl:row.url||null,
    source:'Yelp',
    provider:'yelp',
    currency,
    savings:0,
    discountPct:0,
    phone:row.display_phone||null,
    countryCode:loc.country||null,
    isClosed:!!row.is_closed
  };
}

async function searchYelp({q,category,limit,lat,lng,city='Miami',countryCode='US',currency='USD'}){
  const key=process.env.YELP_API_KEY;
  if(!key) return {ok:false,reason:'not-configured',results:[]};
  const categories=yelpCategory(category);
  if(!categories) return {ok:false,reason:'unsupported-category',results:[]};

  const params=new URLSearchParams({
    limit:String(Math.min(50,Math.max(1,limit))),
    categories,
    sort_by:'best_match'
  });
  if(q) params.set('term',q);
  if(Number.isFinite(lat)&&Number.isFinite(lng)){
    params.set('latitude',String(lat));
    params.set('longitude',String(lng));
    params.set('radius','16000');
  }else{
    params.set('location',city+', '+countryCode);
  }

  const r=await fetch('https://api.yelp.com/v3/businesses/search?'+params.toString(),{
    headers:{'Accept':'application/json','Authorization':'Bearer '+key}
  });
  if(!r.ok){
    let msg='';
    try{msg=await r.text()}catch(_){}
    return {ok:false,reason:'http-'+r.status,error:msg.slice(0,180),results:[]};
  }
  const data=await r.json();
  let rows=Array.isArray(data.businesses)
    ? data.businesses.map(x=>normalizeYelp(x,category,currency)).filter(x=>!x.countryCode||x.countryCode===countryCode)
    : [];

  if(q && rows.length<Math.min(8,limit)){
    const broadParams=new URLSearchParams(params);
    broadParams.delete('term');
    broadParams.set('limit',String(Math.min(50,Math.max(12,limit))));
    try{
      const broadResponse=await fetch('https://api.yelp.com/v3/businesses/search?'+broadParams.toString(),{
        headers:{'Accept':'application/json','Authorization':'Bearer '+key}
      });
      if(broadResponse.ok){
        const broadData=await broadResponse.json();
        const broadRows=Array.isArray(broadData.businesses)
          ? broadData.businesses.map(x=>normalizeYelp(x,category,currency)).filter(x=>!x.countryCode||x.countryCode===countryCode)
          : [];
        const seen=new Set(rows.map(x=>x.id));
        rows=[...rows,...broadRows.filter(x=>!seen.has(x.id))];
      }
    }catch(_){}
  }

  return {ok:true,results:rows.slice(0,limit),total:Number(data.total||rows.length)};
}

function coordinatesAllowed(countryCode,lat,lng){
  if(!Number.isFinite(lat)||!Number.isFinite(lng)) return false;
  if(countryCode==='CA') return lat>=41&&lat<=84&&lng>=-141&&lng<=-52;
  const contiguous=lat>=24&&lat<=50&&lng>=-125&&lng<=-66;
  const alaska=lat>=51&&lat<=72&&lng>=-170&&lng<=-129;
  const hawaii=lat>=18&&lat<=23&&lng>=-161&&lng<=-154;
  return contiguous||alaska||hawaii;
}

function demoSearch(req){
  const q=String(req.query.q||'').trim().toLowerCase();
  const category=String(req.query.category||'All');
  const maxPrice=Number(req.query.maxPrice||0);
  const limit=Math.max(1,Math.min(50,Number(req.query.limit||20)));
  const lat=Number(req.query.lat), lng=Number(req.query.lng), radius=Number(req.query.radius||0);
  const hasCoords=Number.isFinite(lat)&&Number.isFinite(lng);
  const toRad=v=>v*Math.PI/180;
  const distanceMiles=(a,b,c,d)=>{
    const R=3958.8, dLat=toRad(c-a), dLng=toRad(d-b);
    const x=Math.sin(dLat/2)**2+Math.cos(toRad(a))*Math.cos(toRad(c))*Math.sin(dLng/2)**2;
    return 2*R*Math.asin(Math.sqrt(x));
  };
  const rows=deals.map(d=>{
    const distance=hasCoords && Number.isFinite(d.lat) && Number.isFinite(d.lng) ? distanceMiles(lat,lng,d.lat,d.lng) : null;
    return {...d,distanceMiles:distance};
  }).filter(d=>{
    const hay=(d.title+' '+d.category+' '+d.place+' '+d.text).toLowerCase();
    return (category==='All'||d.category===category) &&
      (!maxPrice||d.price<=maxPrice) &&
      (!q||hay.includes(q)) &&
      (!radius||d.distanceMiles===null||d.distanceMiles<=radius);
  }).sort((a,b)=>{
    if(a.distanceMiles===null && b.distanceMiles===null) return a.price-b.price;
    if(a.distanceMiles===null) return 1;
    if(b.distanceMiles===null) return -1;
    return a.distanceMiles-b.distanceMiles;
  }).slice(0,limit).map(d=>({...d,savings:Math.max(0,d.old-d.price),discountPct:d.old?Math.round((1-d.price/d.old)*100):0}));
  return {rows,q,category,maxPrice,limit,lat,lng,radius,hasCoords};
}

module.exports = async function handler(req,res){
  res.setHeader('Cache-Control','s-maxage=60, stale-while-revalidate=300');
  if(req.method!=='GET') return res.status(405).json({ok:false,error:'Method not allowed'});

  const demo=demoSearch(req);
  const requestedCountry=String(req.query.country||'US').toUpperCase();
  const countryCode=requestedCountry==='CA'?'CA':'US';
  const defaultCity=countryCode==='CA'?'Toronto':'Miami';
  const city=String(req.query.city||defaultCity).trim().slice(0,80)||defaultCity;
  const currency=countryCode==='CA'?'CAD':'USD';

  const runtime=await getDealzyRuntimeConfig();
  const appConfig=runtime.app||{};
  const marketConfig=runtime.markets||{};
  const providerConfig=runtime.providers||{};
  const categoryConfig=runtime.categories||{};

  if(appConfig.maintenance===true){
    return res.status(200).json({
      ok:false,
      maintenance:true,
      mode:'maintenance',
      message:String(appConfig.maintenance_message||'Dealzy is temporarily under maintenance.'),
      query:{q:demo.q,category:demo.category,destination:city,country:countryCode,currency},
      count:0,
      providers:[],
      results:[],
      generatedAt:new Date().toISOString()
    });
  }

  if(!runtimeEnabled(marketConfig,countryCode,true)){
    return res.status(200).json({
      ok:false,
      marketDisabled:true,
      mode:'market-disabled',
      message:'This market is temporarily unavailable.',
      query:{q:demo.q,category:demo.category,destination:city,country:countryCode,currency},
      count:0,
      providers:[],
      results:[],
      generatedAt:new Date().toISOString()
    });
  }

  if(demo.category!=='All' && !runtimeEnabled(categoryConfig,demo.category,true)){
    return res.status(200).json({
      ok:false,
      categoryDisabled:true,
      mode:'category-disabled',
      message:'This category is temporarily unavailable.',
      query:{q:demo.q,category:demo.category,destination:city,country:countryCode,currency},
      count:0,
      providers:[],
      results:[],
      generatedAt:new Date().toISOString()
    });
  }

  const safeHasCoords=demo.hasCoords&&coordinatesAllowed(countryCode,demo.lat,demo.lng);
  const safeLat=safeHasCoords?demo.lat:null;
  const safeLng=safeHasCoords?demo.lng:null;
  const wantsTicketmaster=(demo.category==='All'||demo.category==='Things to Do')&&runtimeEnabled(providerConfig,'ticketmaster',true);
  const wantsViator=(demo.category==='All'||demo.category==='Things to Do'||demo.category==='Travel')&&runtimeEnabled(providerConfig,'viator',true);
  const wantsYelp=(demo.category==='Food & Drink'||demo.category==='Spa & Beauty')&&runtimeEnabled(providerConfig,'yelp',true);
  const liveRows=[];
  const liveProviders=[];

  if(wantsYelp){
    try{
      const yelp=await searchYelp({
        q:demo.q,
        category:demo.category,
        limit:Math.min(40,Math.max(demo.limit,24)),
        lat:safeLat,
        lng:safeLng,
        city,
        countryCode,
        currency
      });
      if(yelp.ok && yelp.results.length){
        liveRows.push(...yelp.results);
        liveProviders.push({name:'yelp',status:'live'});
      }
    }catch(_){}
  }

  if(wantsTicketmaster){
    try{
      const tm=await searchTicketmaster({
        q:demo.q,maxPrice:demo.maxPrice,limit:Math.min(40,Math.max(demo.limit,24)),city,countryCode,currency,
        lat:safeLat,
        lng:safeLng,
        radius:safeHasCoords?(demo.radius||25):25
      });
      if(tm.ok && tm.results.length){
        liveRows.push(...tm.results);
        liveProviders.push({name:'ticketmaster',status:'live'});
      }
    }catch(_){}
  }
  if(wantsViator){
    try{
      const viator=await searchViator({q:demo.q,maxPrice:demo.maxPrice,limit:Math.min(40,Math.max(demo.limit,24)),city,countryCode,currency});
      if(viator.ok && viator.results.length){
        if(demo.category==='Travel') liveRows.unshift(...viator.results);
        else liveRows.push(...viator.results);
        liveProviders.push({name:'viator',status:'live'});
      }
    }catch(_){}
  }

  if(liveRows.length){
    const seen=new Set();
    const results=liveRows.filter(row=>{
      const key=String(row.provider||row.source||'')+'|'+String(row.id||row.title||'');
      if(seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0,demo.limit);
    return res.status(200).json({
      ok:true,
      mode:liveProviders.length>1?'live-multi-provider':'live-'+liveProviders[0].name,
      query:{q:demo.q,category:demo.category,maxPrice:demo.maxPrice||null,limit:demo.limit,destination:city,country:countryCode,currency,geolocationApplied:safeHasCoords},
      count:results.length,
      providers:liveProviders,
      results,
      generatedAt:new Date().toISOString()
    });
  }

  return res.status(200).json({
    ok:true,
    mode:'demo-fallback',
    query:{q:demo.q,category:demo.category,maxPrice:demo.maxPrice||null,limit:demo.limit,lat:safeLat,lng:safeLng,radius:safeHasCoords?(demo.radius||null):null,destination:city,country:countryCode,currency,geolocationApplied:safeHasCoords},
    count:demo.rows.length,
    providers:[
      {name:'demo',status:'active'},
      {name:'ticketmaster',status:process.env.TICKETMASTER_API_KEY?'configured':'not-configured'},
      {name:'viator',status:process.env.VIATOR_PRODUCTION_API_KEY?'configured-production':'sandbox-only'},
      {name:'yelp',status:process.env.YELP_API_KEY?'configured':'not-configured'}
    ],
    results:demo.rows,
    generatedAt:new Date().toISOString()
  });
};
