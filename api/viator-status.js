const BASE='https://api.viator.com/partner';

module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  const key=process.env.VIATOR_API_KEY;
  if(!key) return res.status(200).json({ok:false,configured:false,reason:'missing-key'});
  try{
    const r=await fetch(BASE+'/products/search',{
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
    let payload=null, raw='';
    try{payload=await r.json()}catch(_){try{raw=await r.text()}catch(__){}}
    const count=payload&&Array.isArray(payload.products)?payload.products.length:0;
    const message=payload&&(payload.message||payload.error||payload.errorMessage||payload.code)||raw||null;
    return res.status(200).json({
      ok:r.ok&&count>0,
      configured:true,
      upstreamStatus:r.status,
      productCount:count,
      responseType:payload?Object.keys(payload).slice(0,8):[],
      message:message?String(message).slice(0,220):null
    });
  }catch(e){
    return res.status(200).json({ok:false,configured:true,upstreamStatus:null,message:String(e&&e.message||'network-error').slice(0,220)});
  }
};
