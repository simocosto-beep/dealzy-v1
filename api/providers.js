module.exports = async function handler(req,res){
  res.status(200).json({
    ok:true,
    providers:[
      {name:'Dealzy Demo Inventory',status:'active',kind:'fallback'},
      {name:'Browser Location',status:'active',kind:'device'},
      {name:'Price History Engine',status:'active',kind:'cloud'},
      {name:'Watch & Notification Engine',status:'active',kind:'cloud'},
      {name:'Groupon / Affiliate feed',status:'pending',kind:'affiliate'},
      {name:'CJ Affiliate',status:'pending',kind:'affiliate'},
      {name:'Skyscanner Flight Search',status:'active-clickout',kind:'travel'},
      {name:'Travel / Tickets API',status:'planned',kind:'travel'}
    ],
    liveExternalProviders:0,
    note:'Dealzy does not label fallback inventory as live external offers.'
  });
};