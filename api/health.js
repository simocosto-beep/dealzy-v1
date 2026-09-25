module.exports = async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.status(200).json({
    ok:true,
    service:'dealzy-api',
    version:'1.3',
    mode:'demo-fallback',
    liveProviders:[],
    readyFor:['affiliate-adapters','accounts','server-alerts'],
    timestamp:new Date().toISOString()
  });
};