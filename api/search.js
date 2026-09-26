const deals = require('./_demoDeals');

const VIATOR_BASE='https://api.viator.com/partner';
const VIATOR_MIAMI_DESTINATION='662';

function normalizeViator(row){
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
    place:'Miami, FL',
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
    currency:(row.pricing&&row.pricing.currency)||'USD',
    savings:Math.max(0,old-price),
    discountPct:old?Math.round((1-price/old)*100):0,
    flags:Array.isArray(row.flags)?row.flags:[]
  };
}

async function searchViator({q,maxPrice,limit}){
  const key=process.env.VIATOR_API_KEY;
  if(!key) return {ok:false,reason:'not-configured',results:[]};

  const body={
    filtering:{destination:VIATOR_MIAMI_DESTINATION},
    sorting:{sort:'TRAVELER_RATING',order:'DESCENDING'},
    pagination:{start:1,count:Math.min(50,Math.max(limit*3,12))},
    currency:'USD'
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
  let rows=Array.isArray(data.products)?data.products.map(normalizeViator):[];
  if(q){
    const needle=q.toLowerCase();
    rows=rows.filter(d=>(d.title+' '+d.text).toLowerCase().includes(needle));
  }
  if(maxPrice) rows=rows.filter(d=>d.price>0&&d.price<=maxPrice);
  rows=rows.slice(0,limit);
  return {ok:true,results:rows,total:Number(data.totalCount||rows.length)};
}


function bestTicketmasterImage(images){
  if(!Array.isArray(images)||!images.length) return '';
  return [...images].sort((a,b)=>(Number(b.width||0)*Number(b.height||0))-(Number(a.width||0)*Number(a.height||0)))[0]?.url||'';
}

function normalizeTicketmaster(row){
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
    currency:pr.currency||'USD',
    savings:0,
    discountPct:0,
    eventDate:localDate||null,
    eventTime:localTime||null
  };
}

async function ticketmasterRequest({q,limit}){
  const key=process.env.TICKETMASTER_API_KEY;
  if(!key) return {ok:false,reason:'not-configured',results:[]};
  const p=new URLSearchParams({
    apikey:key,
    countryCode:'US',
    city:'Miami',
    size:String(Math.min(20,Math.max(1,limit))),
    sort:'date,asc'
  });
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
  return {ok:true,results:events.map(normalizeTicketmaster),total:Number(data?.page?.totalElements||events.length)};
}

async function searchTicketmaster({q,maxPrice,limit}){
  let live=await ticketmasterRequest({q,limit:Math.max(limit*2,10)});
  if(live.ok && !live.results.length && q) live=await ticketmasterRequest({q:'',limit:Math.max(limit*2,10)});
  if(!live.ok) return live;
  let rows=live.results;
  if(maxPrice) rows=rows.filter(d=>!d.price||d.price<=maxPrice);
  return {...live,results:rows.slice(0,limit)};
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
  const wantsLive=demo.category==='All'||demo.category==='Things to Do'||demo.category==='Travel';
  const liveRows=[];
  const liveProviders=[];

  if(wantsLive){
    try{
      const tm=await searchTicketmaster({q:demo.q,maxPrice:demo.maxPrice,limit:demo.limit});
      if(tm.ok && tm.results.length){
        liveRows.push(...tm.results);
        liveProviders.push({name:'ticketmaster',status:'live'});
      }
    }catch(_){}
    try{
      const viator=await searchViator({q:demo.q,maxPrice:demo.maxPrice,limit:demo.limit});
      if(viator.ok && viator.results.length){
        liveRows.push(...viator.results);
        liveProviders.push({name:'viator',status:'live'});
      }
    }catch(_){}
  }

  if(liveRows.length){
    const results=liveRows.slice(0,demo.limit);
    return res.status(200).json({
      ok:true,
      mode:liveProviders.length>1?'live-multi-provider':'live-'+liveProviders[0].name,
      query:{q:demo.q,category:demo.category,maxPrice:demo.maxPrice||null,limit:demo.limit,destination:'Miami'},
      count:results.length,
      providers:liveProviders,
      results,
      generatedAt:new Date().toISOString()
    });
  }

  return res.status(200).json({
    ok:true,
    mode:'demo-fallback',
    query:{q:demo.q,category:demo.category,maxPrice:demo.maxPrice||null,limit:demo.limit,lat:demo.hasCoords?demo.lat:null,lng:demo.hasCoords?demo.lng:null,radius:demo.radius||null},
    count:demo.rows.length,
    providers:[
      {name:'demo',status:'active'},
      {name:'ticketmaster',status:process.env.TICKETMASTER_API_KEY?'configured':'not-configured'},
      {name:'viator',status:process.env.VIATOR_API_KEY?'configured':'not-configured'}
    ],
    results:demo.rows,
    generatedAt:new Date().toISOString()
  });
};
