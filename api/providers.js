module.exports = async function handler(req,res){
  const viatorConfigured=!!process.env.VIATOR_API_KEY;
  const ticketmasterConfigured=!!process.env.TICKETMASTER_API_KEY;
  res.status(200).json({
    ok:true,
    providers:[
      {name:'Dealzy Demo Inventory',status:'active',kind:'fallback'},
      {name:'Browser Location',status:'active',kind:'device'},
      {name:'Price History Engine',status:'active',kind:'cloud'},
      {name:'Watch & Notification Engine',status:'active',kind:'cloud'},
      {name:'Viator Experiences',status:viatorConfigured?'configured':'pending-key',kind:'affiliate-api'},
      {name:'Ticketmaster Events',status:ticketmasterConfigured?'configured':'pending-key',kind:'events-api'},
      {name:'Groupon / Affiliate feed',status:'pending',kind:'affiliate'},
      {name:'CJ Affiliate',status:'pending',kind:'affiliate'},
      {name:'Skyscanner Flight Search',status:'active-clickout',kind:'travel'},
      {name:'Booking.com Travel Search',status:'active-clickout',kind:'travel'},
      {name:'Dealzy Travel API',status:'pending-credentials',kind:'travel'}
    ],
    liveExternalProviders:(viatorConfigured?1:0)+(ticketmasterConfigured?1:0),
    note:'Configured providers are marked live in search only after a successful upstream response; demo fallback remains clearly identified.'
  });
};
