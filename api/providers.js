module.exports = async function handler(req,res){
  const viatorConfigured=!!process.env.VIATOR_API_KEY;
  res.status(200).json({
    ok:true,
    providers:[
      {name:'Dealzy Demo Inventory',status:'active',kind:'fallback'},
      {name:'Browser Location',status:'active',kind:'device'},
      {name:'Price History Engine',status:'active',kind:'cloud'},
      {name:'Watch & Notification Engine',status:'active',kind:'cloud'},
      {name:'Viator Experiences',status:viatorConfigured?'configured-live':'pending-key',kind:'affiliate-api'},
      {name:'Groupon / Affiliate feed',status:'pending',kind:'affiliate'},
      {name:'CJ Affiliate',status:'pending',kind:'affiliate'},
      {name:'Skyscanner Flight Search',status:'active-clickout',kind:'travel'},
      {name:'Booking.com Travel Search',status:'active-clickout',kind:'travel'},
      {name:'Dealzy Travel API',status:'pending-credentials',kind:'travel'}
    ],
    liveExternalProviders:viatorConfigured?1:0,
    note:'Dealzy labels Viator as live only when the API returns live inventory; otherwise demo fallback remains clearly identified.'
  });
};
