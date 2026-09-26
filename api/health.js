module.exports = async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.status(200).json({
    ok:true,
    service:'dealzy-api',
    version:'2.0',
    mode:'cloud-v2-demo-fallback',
    liveProviders:[],
    backend:['supabase-auth','cloud-sync','rpc-v2'],
    readyFor:['affiliate-adapters','approved-live-providers'],
    timestamp:new Date().toISOString()
  });
};
