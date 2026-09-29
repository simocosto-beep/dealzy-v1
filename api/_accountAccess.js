const BASE='https://stkmhgeuavsidpapqvyw.supabase.co';
const KEY='sb_publishable_EVDiDkczLgCmggcMxbV8tw_jQm4g9Rh';

async function accountAccess(jwt){
  if(!jwt) return {ok:false,allowed:false,status:'anonymous',error:'Missing access token'};
  try{
    const r=await fetch(BASE+'/rest/v1/rpc/dealzy_account_access',{
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
    if(!r.ok) return {ok:false,allowed:false,status:'unknown',error:data.message||data.error||('Account access check failed: '+r.status)};
    return {
      ok:data.ok!==false,
      allowed:data.allowed!==false,
      status:String(data.status||'active'),
      reason:data.reason||null
    };
  }catch(_){
    return {ok:false,allowed:false,status:'unknown',error:'Account access check unavailable'};
  }
}

async function revokeSession(jwt){
  if(!jwt) return;
  try{
    await fetch(BASE+'/auth/v1/logout?scope=global',{
      method:'POST',
      headers:{'apikey':KEY,'Authorization':'Bearer '+jwt}
    });
  }catch(_){}
}

function deniedMessage(access){
  const status=String(access&&access.status||'disabled');
  const reason=access&&access.reason?String(access.reason):'';
  const base=status==='blacklisted'?'This Dealzy account is blacklisted.':'This Dealzy account is disabled.';
  return reason?base+' '+reason:base;
}

module.exports={BASE,KEY,accountAccess,revokeSession,deniedMessage};
