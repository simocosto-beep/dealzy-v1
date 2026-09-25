function cfg(){
  return {base:'https://stkmhgeuavsidpapqvyw.supabase.co',key:'sb_publishable_EVDiDkczLgCmggcMxbV8tw_jQm4g9Rh'};
}
function token(req){
  const h=req.headers.authorization||'';
  return h.startsWith('Bearer ')?h.slice(7):'';
}
async function currentUser(base,key,jwt){
  const r=await fetch(base+'/auth/v1/user',{headers:{apikey:key,Authorization:'Bearer '+jwt}});
  if(!r.ok) return null;
  return await r.json();
}
function parseStored(v,fallback){
  if(v===undefined||v===null) return fallback;
  if(typeof v!=='string') return v;
  try{return JSON.parse(v)}catch(_){return fallback}
}
async function upsert(base,table,onConflict,rows,headers){
  if(!rows.length) return {ok:true,table,count:0};
  const r=await fetch(base+'/rest/v1/'+table+'?on_conflict='+encodeURIComponent(onConflict),{
    method:'POST',
    headers:{...headers,'Prefer':'resolution=merge-duplicates,return=minimal'},
    body:JSON.stringify(rows)
  });
  return {ok:r.ok,table,status:r.status,count:r.ok?rows.length:0};
}
function keyOf(prefix,x,i){
  const raw=(x&&x.createdAt)||[x&&x.q,x&&x.name,x&&x.store,x&&x.kind,i].filter(Boolean).join('|')||String(i);
  return prefix+':'+String(raw).slice(0,180);
}
async function syncStructured(base,userId,data,headers){
  const results=[];

  const profile=parseStored(data.dealzyLocalProfile,{})||{};
  results.push(await upsert(base,'dealzy_profiles','user_id',[{
    user_id:userId,
    display_name:String(profile.name||'').slice(0,120)||null,
    updated_at:new Date().toISOString()
  }],headers));

  const favs=parseStored(data.dealzyFavs,[]);
  results.push(await upsert(base,'dealzy_saved_deals','user_id,deal_key',
    (Array.isArray(favs)?favs:[]).map(id=>({
      user_id:userId,
      deal_key:String(id),
      deal_data:{source:'local-favorite'}
    })),headers));

  const alerts=parseStored(data.dealzyAlerts,[]);
  results.push(await upsert(base,'dealzy_alerts','user_id,client_key',
    (Array.isArray(alerts)?alerts:[]).filter(x=>x&&x.q).map((x,i)=>({
      user_id:userId,
      client_key:keyOf('alert',x,i),
      query:String(x.q),
      max_price:Number.isFinite(Number(x.max))?Number(x.max):null,
      radius_miles:null,
      enabled:true
    })),headers));

  const watches=parseStored(data.dealzyPriceWatch,[]);
  results.push(await upsert(base,'dealzy_price_watches','user_id,client_key',
    (Array.isArray(watches)?watches:[]).filter(x=>x&&x.name).map((x,i)=>({
      user_id:userId,
      client_key:keyOf('watch',x,i),
      title:String(x.name),
      target_price:Number.isFinite(Number(x.target))?Number(x.target):null,
      source_url:x.sourceUrl?String(x.sourceUrl):null,
      enabled:true
    })),headers));

  const coupons=parseStored(data.dealzyCoupons,[]);
  results.push(await upsert(base,'dealzy_coupons','user_id,client_key',
    (Array.isArray(coupons)?coupons:[]).filter(x=>x&&x.store&&x.code).map((x,i)=>({
      user_id:userId,
      client_key:keyOf('coupon',x,i),
      merchant:String(x.store),
      code:String(x.code),
      expires_on:x.expiry||null,
      notes:null
    })),headers));

  const travel=parseStored(data.dealzyTravelSearches,[]);
  results.push(await upsert(base,'dealzy_travel_searches','user_id,client_key',
    (Array.isArray(travel)?travel:[]).filter(x=>x&&x.kind).slice(-30).map((x,i)=>({
      user_id:userId,
      client_key:keyOf('travel',x,i),
      kind:String(x.kind),
      search_data:{...(x.data||{}),summary:x.summary||null,createdAt:x.createdAt||null}
    })),headers));

  return {ok:results.every(x=>x.ok),results};
}

module.exports = async function handler(req,res){
  const {base,key}=cfg(), jwt=token(req);
  if(!jwt) return res.status(401).json({error:'Missing access token'});
  const user=await currentUser(base,key,jwt);
  if(!user||!user.id) return res.status(401).json({error:'Invalid session'});
  const headers={'Content-Type':'application/json','apikey':key,'Authorization':'Bearer '+jwt};

  if(req.method==='GET'){
    const r=await fetch(base+'/rest/v1/dealzy_user_data?user_id=eq.'+encodeURIComponent(user.id)+'&select=data,updated_at',{headers});
    const rows=await r.json();
    return res.status(r.status).json({
      ok:r.ok,
      data:Array.isArray(rows)&&rows[0]?rows[0].data:null,
      updated_at:Array.isArray(rows)&&rows[0]?rows[0].updated_at:null,
      storage:'legacy-compatible'
    });
  }

  if(req.method==='POST'){
    const data=(req.body&&req.body.data)||{};
    const r=await fetch(base+'/rest/v1/dealzy_user_data?on_conflict=user_id',{
      method:'POST',
      headers:{...headers,'Prefer':'resolution=merge-duplicates,return=representation'},
      body:JSON.stringify({user_id:user.id,data,updated_at:new Date().toISOString()})
    });
    const rows=await r.json();
    if(!r.ok) return res.status(r.status).json({ok:false,error:'Cloud sync failed'});

    let structured={ok:false,results:[]};
    try{structured=await syncStructured(base,user.id,data,headers)}
    catch(_){structured={ok:false,error:'Structured sync failed'}}

    return res.status(200).json({
      ok:true,
      row:Array.isArray(rows)?rows[0]:rows,
      structured,
      storage:'hybrid-normalized'
    });
  }

  return res.status(405).json({error:'Method not allowed'});
};