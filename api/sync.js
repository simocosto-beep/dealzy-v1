function cfg(){
  return {base:(process.env.SUPABASE_URL||'').replace(/\/$/,''),key:process.env.SUPABASE_ANON_KEY||''};
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
module.exports = async function handler(req,res){
  const {base,key}=cfg(), jwt=token(req);
  if(!base||!key) return res.status(503).json({error:'Cloud sync is not configured yet.'});
  if(!jwt) return res.status(401).json({error:'Missing access token'});
  const user=await currentUser(base,key,jwt);
  if(!user||!user.id) return res.status(401).json({error:'Invalid session'});
  const headers={'Content-Type':'application/json','apikey':key,'Authorization':'Bearer '+jwt};

  if(req.method==='GET'){
    const r=await fetch(base+'/rest/v1/dealzy_user_data?user_id=eq.'+encodeURIComponent(user.id)+'&select=data,updated_at',{headers});
    const rows=await r.json();
    return res.status(r.status).json({ok:r.ok,data:Array.isArray(rows)&&rows[0]?rows[0].data:null,updated_at:Array.isArray(rows)&&rows[0]?rows[0].updated_at:null});
  }

  if(req.method==='POST'){
    const data=(req.body&&req.body.data)||{};
    const r=await fetch(base+'/rest/v1/dealzy_user_data?on_conflict=user_id',{
      method:'POST',
      headers:{...headers,'Prefer':'resolution=merge-duplicates,return=representation'},
      body:JSON.stringify({user_id:user.id,data,updated_at:new Date().toISOString()})
    });
    const rows=await r.json();
    return res.status(r.status).json({ok:r.ok,row:Array.isArray(rows)?rows[0]:rows});
  }

  return res.status(405).json({error:'Method not allowed'});
};