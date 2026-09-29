const SUPABASE_URL='https://stkmhgeuavsidpapqvyw.supabase.co';
const SUPABASE_KEY='sb_publishable_EVDiDkczLgCmggcMxbV8tw_jQm4g9Rh';

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET') return res.status(405).json({ok:false,error:'Method not allowed'});
  try{
    const r=await fetch(SUPABASE_URL+'/rest/v1/dealzy_runtime_config?select=key,value&public_read=eq.true',{
      headers:{apikey:SUPABASE_KEY,Accept:'application/json'}
    });
    if(!r.ok) throw new Error('Supabase '+r.status);
    const rows=await r.json();
    const config={};
    for(const row of Array.isArray(rows)?rows:[]) config[row.key]=row.value||{};
    return res.status(200).json({ok:true,config,generatedAt:new Date().toISOString()});
  }catch(e){
    return res.status(200).json({ok:false,config:{},error:'Runtime config unavailable'});
  }
};
