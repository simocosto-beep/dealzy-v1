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
    const r=await fetch(BASE+'/rest/v1/dealzy_notifications?user_id=eq.'+encodeURIComponent(user.id)+'&select=id,kind,title,body,payload,read_at,created_at&order=created_at.desc&limit=50',{headers});
    const rows=await r.json();
    return res.status(r.status).json({ok:r.ok,notifications:Array.isArray(rows)?rows:[]});
  }

  if(req.method==='PATCH'){
    const id=String((req.body&&req.body.id)||'');
    if(!id) return res.status(400).json({error:'Missing notification id'});
    const r=await fetch(BASE+'/rest/v1/dealzy_notifications?id=eq.'+encodeURIComponent(id)+'&user_id=eq.'+encodeURIComponent(user.id),{
      method:'PATCH',headers:{...headers,Prefer:'return=minimal'},body:JSON.stringify({read_at:new Date().toISOString()})
    });
    return res.status(r.status).json({ok:r.ok});
  }

  return res.status(405).json({error:'Method not allowed'});
};