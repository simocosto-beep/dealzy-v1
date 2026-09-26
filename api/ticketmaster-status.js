module.exports=async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  const key=process.env.TICKETMASTER_API_KEY;
  if(!key) return res.status(200).json({ok:false,configured:false,reason:'missing-key'});
  try{
    const p=new URLSearchParams({apikey:key,countryCode:'US',city:'Miami',size:'1',sort:'date,asc'});
    const r=await fetch('https://app.ticketmaster.com/discovery/v2/events.json?'+p.toString(),{headers:{Accept:'application/json'}});
    let data=null,raw='';
    try{data=await r.json()}catch(_){try{raw=await r.text()}catch(__){}}
    const events=data?._embedded?.events||[];
    const fault=data?.fault?.faultstring||data?.errors?.[0]?.detail||raw||null;
    return res.status(200).json({
      ok:r.ok,
      configured:true,
      upstreamStatus:r.status,
      eventCount:events.length,
      sampleEvent:events[0]?.name||null,
      message:fault?String(fault).slice(0,220):null
    });
  }catch(e){
    return res.status(200).json({ok:false,configured:true,upstreamStatus:null,message:String(e?.message||'network-error').slice(0,220)});
  }
};