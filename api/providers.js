module.exports = async function handler(req,res){
  const viatorSandboxConfigured=!!process.env.VIATOR_API_KEY;
  const viatorProductionConfigured=!!process.env.VIATOR_PRODUCTION_API_KEY;
  const ticketmasterConfigured=!!process.env.TICKETMASTER_API_KEY;
  const yelpConfigured=!!process.env.YELP_API_KEY;
  res.status(200).json({
    ok:true,
    providers:[
      {name:'Dealzy Demo Inventory',status:'active',kind:'fallback'},
      {name:'Browser Location',status:'active',kind:'device'},
      {name:'Price History Engine',status:'active',kind:'cloud'},
      {name:'Watch & Notification Engine',status:'active',kind:'cloud'},
      {name:'Viator Experiences',status:viatorProductionConfigured?'production-ready':(viatorSandboxConfigured?'sandbox-ready':'pending-key'),kind:'affiliate-api'},
      {name:'Ticketmaster Events',status:ticketmasterConfigured?'configured':'pending-key',kind:'events-api'},
      {name:'Yelp Places',status:yelpConfigured?'configured':'pending-key',kind:'local-places-api'},
      {name:'Groupon / Affiliate feed',status:'pending',kind:'affiliate'},
      {name:'CJ Affiliate',status:'pending',kind:'affiliate'},
      {name:'Skyscanner Flight Search',status:'active-clickout',kind:'travel'},
      {name:'Booking.com Travel Search',status:'active-clickout',kind:'travel'},
      {name:'Expedia Dealzy Travel Shop',status:'active-affiliate-clickout',kind:'travel'},
      {name:'Dealzy Travel API',status:'pending-credentials',kind:'travel'}
    ],
    liveExternalProviders:(viatorProductionConfigured?1:0)+(ticketmasterConfigured?1:0)+(yelpConfigured?1:0),
    note:'Viator sandbox credentials are test-only and never shown as live inventory. Production Viator results require VIATOR_PRODUCTION_API_KEY.'
  });
};
