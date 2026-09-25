const deals=require('./_demoDeals');
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
function norm(s){return String(s||'').trim().toLowerCase();}

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  const jwt=token(req);
  if(!jwt) return res.status(401).json({error:'Missing access token'});
  const user=await getUser(jwt);
  if(!user||!user.id) return res.status(401).json({error:'Invalid session'});

  const watches=Array.isArray(req.body&&req.body.watches)?req.body.watches:[];
  const matches=[];
  for(const w of watches){
    const q=norm(w.name);
    const target=Number(w.target||0);
    if(!q||!target) continue;
    const found=deals.filter(d=>norm(d.title+' '+d.category+' '+d.place+' '+d.text).includes(q) && Number(d.price)<=target);
    for(const d of found){
      matches.push({watch:w,deal:d,mode:'demo-fallback'});
    }
  }

  const headers={'Content-Type':'application/json',apikey:KEY,Authorization:'Bearer '+jwt,Prefer:'resolution=ignore-duplicates,return=minimal'};
  for(const m of matches){
    const dedupe='watch:'+norm(m.watch.name)+':'+String(m.deal.id)+':'+String(m.deal.price);
    await fetch(BASE+'/rest/v1/dealzy_notifications?on_conflict=user_id,dedupe_key',{
      method:'POST',
      headers,
      body:JSON.stringify({
        user_id:user.id,
        kind:'price_watch',
        title:'Price target matched',
        body:m.deal.title+' is '+String(m.deal.price)+' USD',
        payload:{dealId:m.deal.id,price:m.deal.price,target:m.watch.target,mode:m.mode},
        dedupe_key:dedupe
      })
    });
    await fetch(BASE+'/rest/v1/dealzy_price_history',{
      method:'POST',
      headers:{'Content-Type':'application/json',apikey:KEY,Authorization:'Bearer '+jwt,Prefer:'return=minimal'},
      body:JSON.stringify({
        user_id:user.id,provider:'demo',deal_key:String(m.deal.id),title:m.deal.title,
        price:m.deal.price,old_price:m.deal.old,currency:'USD',observed_at:new Date().toISOString()
      })
    });
  }

  return res.status(200).json({
    ok:true,
    mode:'demo-fallback',
    checked:watches.length,
    matches:matches.map(m=>({watch:m.watch.name,target:m.watch.target,deal:{id:m.deal.id,title:m.deal.title,price:m.deal.price}})),
    note:'Live provider checks will use the same endpoint once an approved provider is connected.'
  });
};