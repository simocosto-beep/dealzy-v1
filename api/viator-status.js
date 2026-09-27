async function checkViator(base,key){
  if(!key) return {configured:false,ok:false,upstreamStatus:null,productCount:0,message:'missing-key'};
  try{
    const r=await fetch(base+'/products/search',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Accept':'application/json;version=2.0',
        'Accept-Language':'en-US',
        'exp-api-key':key
      },
      body:JSON.stringify({
        filtering:{destination:'662'},
        sorting:{sort:'TRAVELER_RATING',order:'DESCENDING'},
        pagination:{start:1,count:3},
        currency:'USD'
      })
    });
    let payload=null,raw='';
    try{payload=await r.json()}catch(_){try{raw=await r.text()}catch(__){}}
    const count=payload&&Array.isArray(payload.products)?payload.products.length:0;
    const message=payload&&(payload.message||payload.error||payload.errorMessage||payload.code)||raw||null;
    return {
      configured:true,
      ok:r.ok&&count>0,
      upstreamStatus:r.status,
      productCount:count,
      message:message?String(message).slice(0,220):null
    };
  }catch(e){
    return {configured:true,ok:false,upstreamStatus:null,productCount:0,message:String(e&&e.message||'network-error').slice(0,220)};
  }
}

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  const sandbox=await checkViator('https://api.sandbox.viator.com/partner',process.env.VIATOR_API_KEY);
  const production=await checkViator('https://api.viator.com/partner',process.env.VIATOR_PRODUCTION_API_KEY);
  return res.status(200).json({
    ok:production.ok,
    productionReady:production.ok,
    production,
    sandbox,
    note:'Sandbox inventory is test-only and is never exposed as live Dealzy inventory.'
  });
};