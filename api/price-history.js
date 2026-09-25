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

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  const jwt=token(req);
  if(!jwt) return res.status(401).json({error:'Missing access token'});
  const user=await getUser(jwt);
  if(!user||!user.id) return res.status(401).json({error:'Invalid session'});
  const headers={'Content-Type':'application/json',apikey:KEY,Authorization:'Bearer '+jwt};

  if(req.method==='GET'){
    const dealKey=String(req.query.dealKey||'').trim();
    const provider=String(req.query.provider||'').trim();
    let url=BASE+'/rest/v1/dealzy_price_history?user_id=eq.'+encodeURIComponent(user.id)+'&select=provider,deal_key,title,price,old_price,currency,source_url,observed_at&order=observed_at.desc&limit=100';
    if(dealKey) url+='&deal_key=eq.'+encodeURIComponent(dealKey);
    if(provider) url+='&provider=eq.'+encodeURIComponent(provider);
    const r=await fetch(url,{headers});
    const rows=await r.json();
    return res.status(r.status).json({ok:r.ok,history:Array.isArray(rows)?rows:[]});
  }

  if(req.method==='POST'){
    const b=req.body||{};
    const price=Number(b.price);
    if(!b.dealKey||!Number.isFinite(price)) return res.status(400).json({error:'dealKey and valid price required'});
    const row={
      user_id:user.id,
      provider:String(b.provider||'dealzy'),
      deal_key:String(b.dealKey),
      title:String(b.title||''),
      price,
      old_price:Number.isFinite(Number(b.oldPrice))?Number(b.oldPrice):null,
      currency:String(b.currency||'USD'),
      source_url:b.sourceUrl?String(b.sourceUrl):null,
      observed_at:new Date().toISOString()
    };
    const r=await fetch(BASE+'/rest/v1/dealzy_price_history',{
      method:'POST',
      headers:{...headers,Prefer:'return=representation'},
      body:JSON.stringify(row)
    });
    const rows=await r.json();
    return res.status(r.status).json({ok:r.ok,row:Array.isArray(rows)?rows[0]:rows});
  }

  return res.status(405).json({error:'Method not allowed'});
};