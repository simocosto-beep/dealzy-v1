
const DEALZY_SUPABASE_URL='https://stkmhgeuavsidpapqvyw.supabase.co';
const DEALZY_SUPABASE_KEY='sb_publishable_EVDiDkczLgCmggcMxbV8tw_jQm4g9Rh';
let dealzyRuntimeCache={at:0,data:{}};

async function getDealzyRuntimeConfig(){
  if(Date.now()-dealzyRuntimeCache.at<15000) return dealzyRuntimeCache.data;
  try{
    const r=await fetch(DEALZY_SUPABASE_URL+'/rest/v1/dealzy_runtime_config?select=key,value&public_read=eq.true',{
      headers:{'apikey':DEALZY_SUPABASE_KEY,'Accept':'application/json'}
    });
    if(!r.ok) throw new Error('runtime-config-'+r.status);
    const rows=await r.json();
    const data={};
    for(const row of Array.isArray(rows)?rows:[]) data[row.key]=row.value||{};
    dealzyRuntimeCache={at:Date.now(),data};
    return data;
  }catch(_){
    return dealzyRuntimeCache.data||{};
  }
}

function runtimeEnabled(group,key,defaultValue=true){
  const row=group&&group[key];
  if(!row||typeof row!=='object'||typeof row.enabled!=='boolean') return defaultValue;
  return row.enabled;
}

module.exports = async function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({ok:false,error:'Method not allowed'});
  const viatorSandboxConfigured=!!process.env.VIATOR_API_KEY;
  const viatorProductionConfigured=!!process.env.VIATOR_PRODUCTION_API_KEY;
  const ticketmasterConfigured=!!process.env.TICKETMASTER_API_KEY;
  const yelpConfigured=!!process.env.YELP_API_KEY;
  const awinConfigured=!!(process.env.AWIN_ACCESS_TOKEN&&/^\d+$/.test(String(process.env.AWIN_PUBLISHER_ID||'')));
  const runtime=await getDealzyRuntimeConfig();
  const app=runtime.app||{};
  const p=runtime.providers||{};
  const markets=runtime.markets||{};

  const status=(key,configured,activeStatus='configured')=>{
    if(!runtimeEnabled(p,key,true)) return 'disabled-by-admin';
    return configured?activeStatus:'pending-key';
  };

  res.setHeader('Cache-Control','no-store');
  res.status(200).json({
    ok:true,
    maintenance:app.maintenance===true,
    providers:[
      {name:'Dealzy Demo Inventory',status:'active',kind:'fallback'},
      {name:'Browser Location',status:'active',kind:'device'},
      {name:'Price History Engine',status:'active',kind:'cloud'},
      {name:'Watch & Notification Engine',status:'active',kind:'cloud'},
      {name:'Viator Experiences',status:!runtimeEnabled(p,'viator',true)?'disabled-by-admin':(viatorProductionConfigured?'production-ready':(viatorSandboxConfigured?'sandbox-ready':'pending-key')),kind:'affiliate-api'},
      {name:'Ticketmaster Events',status:status('ticketmaster',ticketmasterConfigured),kind:'events-api'},
      {name:'Yelp Places',status:status('yelp',yelpConfigured),kind:'local-places-api'},
      {name:'Groupon / Affiliate feed',status:'pending',kind:'affiliate'},
      {name:'CJ Affiliate',status:'pending',kind:'affiliate'},
      {name:'Awin Offers',status:status('awin',awinConfigured),kind:'affiliate-promotions'},
      {name:'Skyscanner Flight Search',status:runtimeEnabled(p,'skyscanner',true)?'active-clickout':'disabled-by-admin',kind:'travel'},
      {name:'Booking.com Travel Search',status:runtimeEnabled(p,'booking',true)?'active-clickout':'disabled-by-admin',kind:'travel'},
      {name:'Expedia Dealzy Travel Shop',status:runtimeEnabled(p,'expedia',true)?'active-affiliate-clickout':'disabled-by-admin',kind:'travel'},
      {name:'Dealzy Travel API',status:'pending-credentials',kind:'travel'}
    ],
    liveExternalProviders:
      (runtimeEnabled(p,'viator',true)&&viatorProductionConfigured?1:0)+
      (runtimeEnabled(p,'ticketmaster',true)&&ticketmasterConfigured?1:0)+
      (runtimeEnabled(p,'yelp',true)&&yelpConfigured?1:0)+
      (runtimeEnabled(p,'awin',true)&&awinConfigured?1:0),
    markets:[
      ...(runtimeEnabled(markets,'US',true)?['US']:[]),
      ...(runtimeEnabled(markets,'CA',true)?['CA']:[])
    ],
    currencies:['USD','CAD'],
    runtimeControl:true,
    note:'Provider and market availability is controlled by Dealzy Admin.'
  });
};
