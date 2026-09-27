module.exports = async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.status(200).json({
    ok:true,
    service:'dealzy-api',
    version:'2.1',
    mode:'live-multi-provider',
    liveProviders:['viator','ticketmaster','yelp'],
    travelClickouts:['expedia','booking','skyscanner'],
    markets:['US','CA'],
    currencies:['USD','CAD'],
    backend:['supabase-auth','cloud-sync','rpc-v2'],
    readyFor:['additional-affiliate-adapters'],
    timestamp:new Date().toISOString()
  });
};