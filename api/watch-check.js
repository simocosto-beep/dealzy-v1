const searchHandler=require('./search');
const BASE='https://stkmhgeuavsidpapqvyw.supabase.co';
const KEY='sb_publishable_EVDiDkczLgCmggcMxbV8tw_jQm4g9Rh';

function token(req){
  const h=req.headers.authorization||'';
  return h.startsWith('Bearer ')?h.slice(7):'';
}

async function getUser(jwt){
  const r=await fetch(BASE+'/auth/v1/user',{headers:{apikey:KEY,Authorization:'Bearer '+jwt}});
  if(!r.ok) return null;
  return r.json();
}

function norm(s){
  return String(s||'').trim().toLowerCase();
}

function clampNumber(value,min,max,fallback=null){
  const n=Number(value);
  if(!Number.isFinite(n)) return fallback;
  return Math.max(min,Math.min(max,n));
}

function safeCountry(value){
  return String(value||'US').toUpperCase()==='CA'?'CA':'US';
}

function safeCategory(value){
  const allowed=['All','Food & Drink','Spa & Beauty','Things to Do','Travel'];
  return allowed.includes(value)?value:'All';
}

function inferCategory(q){
  const s=norm(q);
  if(/spa|massage|beauty|wellness/.test(s)) return 'Spa & Beauty';
  if(/restaurant|dinner|food|brunch|cafe|coffee/.test(s)) return 'Food & Drink';
  if(/hotel|travel|trip|stay/.test(s)) return 'Travel';
  if(/concert|event|activity|tour|museum|cruise|boat/.test(s)) return 'Things to Do';
  return 'All';
}

function signature(deal){
  const provider=String(deal.provider||deal.source||'partner').toLowerCase();
  const id=String(deal.id||deal.externalId||deal.title||'result');
  const price=Number(deal.price)>0?Number(deal.price).toFixed(2):'na';
  return provider+':'+id+':'+price;
}

async function runLiveSearch(query){
  let payload=null,statusCode=200;
  const req={method:'GET',query};
  const res={
    setHeader(){},
    status(code){
      statusCode=code;
      return {json(body){payload=body;return body;}};
    }
  };
  await searchHandler(req,res);
  if(statusCode<200||statusCode>=300||!payload||payload.mode==='demo-fallback') return {ok:false,results:[],mode:payload&&payload.mode||'unavailable'};
  return {ok:true,results:Array.isArray(payload.results)?payload.results:[],mode:payload.mode||'live'};
}

function filterAlertResults(rows,alert){
  const max=Number(alert.max)>0?Number(alert.max):null;
  const minRating=Number(alert.minRating)>0?Number(alert.minRating):0;
  const openNow=!!alert.openNow;
  return (rows||[]).filter(d=>{
    if(max && !(Number(d.price)>0 && Number(d.price)<=max)) return false;
    if(minRating && Number(d.rating||0)<minRating) return false;
    if(openNow && d.isClosed!==false) return false;
    return true;
  });
}

async function insertNotification(jwt,userId,item){
  const headers={
    'Content-Type':'application/json',
    apikey:KEY,
    Authorization:'Bearer '+jwt,
    Prefer:'resolution=ignore-duplicates,return=minimal'
  };
  return fetch(BASE+'/rest/v1/dealzy_notifications?on_conflict=user_id,dedupe_key',{
    method:'POST',
    headers,
    body:JSON.stringify({
      user_id:userId,
      kind:item.kind,
      title:item.title,
      body:item.body,
      payload:item.payload||{},
      dedupe_key:item.dedupeKey
    })
  });
}

async function recordPrice(jwt,userId,deal){
  if(!(Number(deal.price)>0)) return;
  await fetch(BASE+'/rest/v1/dealzy_price_history',{
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      apikey:KEY,
      Authorization:'Bearer '+jwt,
      Prefer:'return=minimal'
    },
    body:JSON.stringify({
      user_id:userId,
      provider:String(deal.provider||deal.source||'partner').toLowerCase(),
      deal_key:String(deal.id||deal.externalId||deal.title||'result'),
      title:String(deal.title||'Deal'),
      price:Number(deal.price),
      old_price:Number(deal.old)>0?Number(deal.old):null,
      currency:String(deal.currency||'USD'),
      observed_at:new Date().toISOString()
    })
  });
}

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});

  const jwt=token(req);
  if(!jwt) return res.status(401).json({error:'Missing access token'});
  const user=await getUser(jwt);
  if(!user||!user.id) return res.status(401).json({error:'Invalid session'});

  const body=req.body||{};
  const market=body.market&&typeof body.market==='object'?body.market:{};
  const defaultCountry=safeCountry(market.country);
  const defaultCity=String(market.city||(defaultCountry==='CA'?'Toronto':'Miami')).slice(0,80);
  const coords=body.coords&&typeof body.coords==='object'?body.coords:null;

  const watches=Array.isArray(body.watches)?body.watches.slice(0,25):[];
  const alerts=Array.isArray(body.alerts)?body.alerts.slice(0,25):[];
  const watchMatches=[];
  const alertMatches=[];
  const newAlertMatches=[];
  const alertStates=[];
  let liveChecks=0;

  for(const watch of watches){
    const q=String(watch.name||'').trim();
    const target=clampNumber(watch.target,0.01,100000,null);
    if(!q||!target) continue;

    const country=safeCountry(watch.country||defaultCountry);
    const city=String(watch.city||defaultCity).slice(0,80);
    const search=await runLiveSearch({
      q,
      category:safeCategory(watch.category||inferCategory(q)),
      maxPrice:String(target),
      limit:'12',
      country,
      city,
      ...(coords&&Number.isFinite(Number(coords.lat))&&Number.isFinite(Number(coords.lng))?{lat:String(coords.lat),lng:String(coords.lng),radius:'25'}:{})
    });
    if(!search.ok) continue;
    liveChecks++;

    for(const deal of search.results){
      if(!(Number(deal.price)>0&&Number(deal.price)<=target)) continue;
      const item={watch,deal,mode:search.mode};
      watchMatches.push(item);
      const sig=signature(deal);
      await insertNotification(jwt,user.id,{
        kind:'price_watch',
        title:'Price target matched',
        body:String(deal.title||'Deal')+' is '+String(deal.price)+' '+String(deal.currency||'USD'),
        payload:{dealId:deal.id,provider:deal.provider||deal.source,price:deal.price,target,mode:search.mode,partnerUrl:deal.partnerUrl||null},
        dedupeKey:'watch:'+norm(q)+':'+sig
      });
      await recordPrice(jwt,user.id,deal);
    }
  }

  for(const rawAlert of alerts){
    const id=String(rawAlert.id||'alert-'+norm(rawAlert.q)).slice(0,120);
    const q=String(rawAlert.q||'').trim();
    if(!q) continue;

    const country=safeCountry(rawAlert.country||defaultCountry);
    const city=String(rawAlert.city||(country==='CA'?'Toronto':'Miami')).slice(0,80);
    const max=clampNumber(rawAlert.max,0.01,100000,null);
    const minRating=clampNumber(rawAlert.minRating,0,5,0)||0;
    const category=safeCategory(rawAlert.category||'All');
    const hasBaseline=!!rawAlert.hasBaseline;
    const seen=new Set(Array.isArray(rawAlert.seenSignatures)?rawAlert.seenSignatures.slice(-250).map(String):[]);

    const search=await runLiveSearch({
      q,
      category,
      ...(max?{maxPrice:String(max)}:{}),
      limit:'20',
      country,
      city,
      ...(coords&&Number.isFinite(Number(coords.lat))&&Number.isFinite(Number(coords.lng))?{lat:String(coords.lat),lng:String(coords.lng),radius:'25'}:{})
    });

    const current=search.ok?filterAlertResults(search.results,{max,minRating,openNow:rawAlert.openNow}):[];
    if(search.ok) liveChecks++;

    const currentSignatures=current.map(signature);
    const newlyFound=hasBaseline?current.filter(d=>!seen.has(signature(d))):[];
    current.forEach(d=>seen.add(signature(d)));

    for(const deal of current){
      alertMatches.push({alertId:id,alert:q,deal,mode:search.mode,isNew:newlyFound.includes(deal)});
    }

    for(const deal of newlyFound){
      newAlertMatches.push({alertId:id,alert:q,deal,mode:search.mode});
      const sig=signature(deal);
      const priceText=Number(deal.price)>0
        ? String(deal.price)+' '+String(deal.currency||country==='CA'?'CAD':'USD')
        : 'available on provider';
      await insertNotification(jwt,user.id,{
        kind:'deal_alert',
        title:'New Dealzy alert match',
        body:String(deal.title||'Deal')+' · '+priceText,
        payload:{
          alertId:id,
          query:q,
          category,
          city,
          country,
          dealId:deal.id,
          provider:deal.provider||deal.source,
          price:deal.price||null,
          currency:deal.currency||null,
          partnerUrl:deal.partnerUrl||null,
          mode:search.mode
        },
        dedupeKey:'alert:'+id+':'+sig
      });
      await recordPrice(jwt,user.id,deal);
    }

    alertStates.push({
      id,
      hasBaseline:true,
      seenSignatures:[...seen].slice(-250),
      lastCheckedAt:new Date().toISOString(),
      lastMatchCount:current.length,
      lastMode:search.mode,
      providerLive:search.ok
    });
  }

  return res.status(200).json({
    ok:true,
    mode:'live-provider-check',
    checked:{watches:watches.length,alerts:alerts.length,liveChecks},
    matches:watchMatches.map(m=>({
      watch:m.watch.name,
      target:m.watch.target,
      deal:{id:m.deal.id,title:m.deal.title,price:m.deal.price,currency:m.deal.currency,provider:m.deal.provider||m.deal.source}
    })),
    alertMatches:alertMatches.map(m=>({
      alertId:m.alertId,
      alert:m.alert,
      isNew:m.isNew,
      deal:{
        id:m.deal.id,
        title:m.deal.title,
        price:m.deal.price||null,
        currency:m.deal.currency||null,
        rating:m.deal.rating||null,
        provider:m.deal.provider||m.deal.source,
        partnerUrl:m.deal.partnerUrl||null
      }
    })),
    newAlertMatches:newAlertMatches.map(m=>({
      alertId:m.alertId,
      alert:m.alert,
      deal:{
        id:m.deal.id,
        title:m.deal.title,
        price:m.deal.price||null,
        currency:m.deal.currency||null,
        rating:m.deal.rating||null,
        provider:m.deal.provider||m.deal.source,
        partnerUrl:m.deal.partnerUrl||null
      }
    })),
    alertStates,
    note:'Only verified live provider results are checked; internal fallback results are ignored.'
  });
};