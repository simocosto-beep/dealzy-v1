const BASE='https://stkmhgeuavsidpapqvyw.supabase.co';
const KEY='sb_publishable_EVDiDkczLgCmggcMxbV8tw_jQm4g9Rh';

function token(req){
  const h=req.headers.authorization||'';
  return h.startsWith('Bearer ')?h.slice(7):'';
}

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET') return res.status(405).json({ok:false,error:'Method not allowed'});
  const jwt=token(req);
  if(!jwt) return res.status(401).json({ok:false,error:'Missing access token'});
  try{
    const r=await fetch(BASE+'/rest/v1/rpc/dealzy_app_bootstrap',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'apikey':KEY,
        'Authorization':'Bearer '+jwt
      },
      body:'{}'
    });
    let data={};
    try{data=await r.json()}catch(_){}
    if(!r.ok) return res.status(r.status).json({ok:false,error:data&&data.message?data.message:'Bootstrap failed'});
    return res.status(200).json({ok:true,bootstrap:data});
  }catch(_){
    return res.status(503).json({ok:false,error:'Cloud backend unavailable'});
  }
};
