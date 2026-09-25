async function callSupabase(path,body){
  const base='https://stkmhgeuavsidpapqvyw.supabase.co';
  const key='sb_publishable_EVDiDkczLgCmggcMxbV8tw_jQm4g9Rh';
  const r=await fetch(base.replace(/\/$/,'')+path,{
    method:'POST',
    headers:{'Content-Type':'application/json','apikey':key,'Authorization':'Bearer '+key},
    body:JSON.stringify(body||{})
  });
  let data={}; try{data=await r.json()}catch(_){}
  return {status:r.status,data};
}

module.exports = async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  const {action,email,password,refresh_token}=req.body||{};
  let out;
  if(action==='signup') out=await callSupabase('/auth/v1/signup?redirect_to='+encodeURIComponent('https://dealzy-v1.vercel.app/'),{email,password});
  else if(action==='login') out=await callSupabase('/auth/v1/token?grant_type=password',{email,password});
  else if(action==='refresh') out=await callSupabase('/auth/v1/token?grant_type=refresh_token',{refresh_token});
  else return res.status(400).json({error:'Unknown action'});
  res.status(out.status).json(out.data);
};