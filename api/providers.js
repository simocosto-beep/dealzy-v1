module.exports = async function handler(req,res){
  res.status(200).json({
    ok:true,
    providers:[
      {name:'Dealzy Demo Inventory',status:'active',kind:'fallback'},
      {name:'Browser Location',status:'active',kind:'device'},
      {name:'Groupon / Affiliate feed',status:'pending',kind:'affiliate'},
      {name:'CJ Affiliate',status:'pending',kind:'affiliate'},
      {name:'Travel / Tickets',status:'planned',kind:'travel'}
    ]
  });
};