(() => {
  "use strict";
  let runtimePublicConfig={};
  let runtimeContent={};

  function validRuntimeImage(value){
    if(!value) return '';
    try{
      const u=new URL(String(value),location.href);
      return (u.protocol==='https:'||u.protocol==='http:')?u.href:'';
    }catch(_){return ''}
  }

  function partnerHref(value){
    try{
      const url=new URL(String(value||""));
      return url.protocol==="https:"||url.protocol==="http:"?url.href:"";
    }catch(_){return "";}
  }

  function applyRuntimeContent(){
    const c=runtimeContent||{};
    const tag=document.querySelector('.brand .tag');
    if(tag&&c.brand_tagline) tag.textContent=String(c.brand_tagline);

    const hero=document.querySelector('#homeView .hero');
    const title=document.querySelector('#homeView .hero h1');
    const subtitle=document.querySelector('#homeView .hero p');
    if(title&&c.hero_title) title.textContent=String(c.hero_title);
    if(subtitle&&c.hero_subtitle) subtitle.textContent=String(c.hero_subtitle);
    if(hero){
      const img=validRuntimeImage(c.hero_image_url);
      hero.style.backgroundImage=img
        ? 'linear-gradient(135deg,rgba(21,34,74,.86),rgba(61,139,253,.36)),url("'+img.replaceAll('"','%22')+'")'
        : '';
    }

    const home=document.getElementById('homeView');
    let banner=document.getElementById('dealzyAnnouncement');
    const showBanner=!!c.announcement_enabled&&String(c.announcement_text||'').trim();
    if(showBanner&&home){
      if(!banner){
        banner=document.createElement('div');
        banner.id='dealzyAnnouncement';
        banner.style.cssText='margin:0 0 14px;padding:12px 15px;border:1px solid #dcd9ff;background:#f2f0ff;color:#4338ca;border-radius:16px;font-weight:800;box-shadow:0 6px 18px rgba(77,67,190,.08)';
        home.insertBefore(banner,home.firstChild);
      }
      banner.textContent=String(c.announcement_text).trim();
    }else if(banner){
      banner.remove();
    }

    const legal=document.querySelector('#homeView .legal');
    if(legal&&c.legal_notice) legal.textContent=String(c.legal_notice);
  }

  async function loadRuntimeContent(){
    try{
      const r=await fetch('https://stkmhgeuavsidpapqvyw.supabase.co/rest/v1/dealzy_runtime_config?select=key,value&public_read=eq.true',{
        cache:'no-store',
        signal:AbortSignal.timeout(4000),
        headers:{
          'apikey':'sb_publishable_EVDiDkczLgCmggcMxbV8tw_jQm4g9Rh',
          'Accept':'application/json'
        }
      });
      if(!r.ok) return;
      const rows=await r.json();
      const next={};
      for(const row of Array.isArray(rows)?rows:[]) next[row.key]=row.value||{};
      runtimePublicConfig=next;
      runtimeContent=runtimePublicConfig.content||{};
      applyRuntimeContent();
    }catch(_){}
  }


  const LIVE_CATEGORIES=["Food & Drink","Spa & Beauty","Things to Do","Travel"];
  const activeCategories=()=>[
    ...(seasonalPartnerUrl()?["Halloween"]:[]),
    ...LIVE_CATEGORIES,
    ...(dealzyProviderRuntime.awin?["Shopping"]:[])
  ];
  const catalog=new Map();
  let homeDeals=[];
  let homeLoading=true;
  let homeLoadSequence=0;

  let dealzyProviderRuntime={booking:true,skyscanner:true,expedia:true,awin:false,seasonalPartner:null,checkedAt:0};
  function seasonalPartnerUrl(){
    return market.country==="US"?dealzyProviderRuntime.seasonalPartner?.url||null:null;
  }

  function seasonalDealCard(url){
    const isFr=locale()==="fr";
    return '<a class="seasonalDeal" href="'+h(url)+'" target="_blank" rel="sponsored noopener noreferrer" aria-label="'+h(isFr?'Voir les costumes Halloween chez Abracadabra NYC':'Browse Halloween costumes at Abracadabra NYC')+'">'+
      '<div class="dealImg"><img src="https://abracadabranyc.com/cdn/shop/collections/scary.jpg?v=1719418547" alt="'+h(isFr?'Costumes Halloween Abracadabra NYC':'Abracadabra NYC Halloween costumes')+'" loading="lazy"><span class="badge">'+h(isFr?'Partenaire saisonnier':'Seasonal partner')+'</span></div>'+
      '<div class="dealBody"><h3>'+h(isFr?'Costumes pour Halloween':'Halloween costumes & accessories')+'</h3>'+
      '<div class="meta">Abracadabra NYC · '+h(isFr?'Boutique en ligne · États-Unis':'Online shop · United States')+'</div>'+
      '<div class="row"><small class="partnerNote">'+h(isFr?'Lien partenaire · commission possible. Prix chez le marchand.':'Partner link · we may earn a commission. Prices at merchant.')+'</small><span class="shopAction">'+h(isFr?'Voir les costumes ↗':'Browse costumes ↗')+'</span></div></div></a>';
  }

  function bindSeasonalCard(root){
    root?.querySelectorAll('.seasonalDeal').forEach(link=>{
      link.addEventListener('click',()=>trackPartnerClick({provider:'cj',source:'Abracadabra NYC',title:'Halloween costumes',externalId:'7889430'}));
    });
  }
  async function refreshDealzyProviderRuntime(force=false){
    if(!force && Date.now()-Number(dealzyProviderRuntime.checkedAt||0)<15000) return dealzyProviderRuntime;
    try{
      const r=await fetch("/api/providers",{cache:"no-store",headers:{Accept:"application/json"},signal:AbortSignal.timeout(8000)});
      if(!r.ok) throw new Error("providers");
      const data=await r.json();
      const next={booking:true,skyscanner:true,expedia:true,awin:false,seasonalPartner:null,checkedAt:Date.now()};
      for(const row of Array.isArray(data.providers)?data.providers:[]){
        const name=String(row.name||"").toLowerCase();
        const status=String(row.status||"").toLowerCase();
        const enabled=status!=="disabled-by-admin";
        if(name.includes("booking.com")) next.booking=enabled;
        if(name.includes("skyscanner")) next.skyscanner=enabled;
        if(name.includes("expedia")) next.expedia=enabled;
        if(name==="awin offers") next.awin=status==="configured";
      }
      if(data.seasonalPartner?.name==='Abracadabra NYC'&&data.seasonalPartner.countryCode==='US'){
        const url=partnerHref(data.seasonalPartner.url);
        if(url) next.seasonalPartner={url};
      }
      dealzyProviderRuntime=next;
    }catch(_){
      dealzyProviderRuntime={...dealzyProviderRuntime,seasonalPartner:null,checkedAt:Date.now()};
    }
    return dealzyProviderRuntime;
  }
  function travelRuntimeKey(kind){
    if(kind==="hotel"||kind==="car"||kind==="activity") return "booking";
    if(kind==="flight") return "skyscanner";
    return "expedia";
  }
  function travelRuntimeEnabled(kind){
    return dealzyProviderRuntime[travelRuntimeKey(kind)]!==false;
  }

  const MARKET_CITIES={
    US:[
      {value:"Miami",label:"Miami, FL"},
      {value:"New York",label:"New York, NY"},
      {value:"Los Angeles",label:"Los Angeles, CA"},
      {value:"Chicago",label:"Chicago, IL"},
      {value:"Las Vegas",label:"Las Vegas, NV"},
      {value:"Orlando",label:"Orlando, FL"},
      {value:"San Francisco",label:"San Francisco, CA"},
      {value:"Boston",label:"Boston, MA"},
      {value:"Seattle",label:"Seattle, WA"},
      {value:"Washington",label:"Washington, DC"},
      {value:"Dallas",label:"Dallas, TX"},
      {value:"Houston",label:"Houston, TX"},
      {value:"San Diego",label:"San Diego, CA"},
      {value:"Philadelphia",label:"Philadelphia, PA"},
      {value:"Atlanta",label:"Atlanta, GA"},
      {value:"New Orleans",label:"New Orleans, LA"},
      {value:"Austin",label:"Austin, TX"},
      {value:"Denver",label:"Denver, CO"},
      {value:"Nashville",label:"Nashville, TN"},
      {value:"Phoenix",label:"Phoenix, AZ"},
      {value:"Honolulu",label:"Honolulu, HI"},
      {value:"Fort Lauderdale",label:"Fort Lauderdale, FL"}
    ],
    CA:[
      {value:"Toronto",label:"Toronto, ON"},
      {value:"Montreal",label:"Montréal, QC"},
      {value:"Vancouver",label:"Vancouver, BC"},
      {value:"Calgary",label:"Calgary, AB"},
      {value:"Ottawa",label:"Ottawa, ON"},
      {value:"Edmonton",label:"Edmonton, AB"},
      {value:"Quebec City",label:"Québec City, QC"},
      {value:"Winnipeg",label:"Winnipeg, MB"},
      {value:"Halifax",label:"Halifax, NS"},
      {value:"Victoria",label:"Victoria, BC"},
      {value:"Niagara Falls",label:"Niagara Falls, ON"},
      {value:"Banff",label:"Banff, AB"},
      {value:"Kelowna",label:"Kelowna, BC"},
      {value:"Whistler",label:"Whistler, BC"},
      {value:"Mississauga",label:"Mississauga, ON"},
      {value:"Hamilton",label:"Hamilton, ON"},
      {value:"Kitchener",label:"Kitchener, ON"},
      {value:"Saskatoon",label:"Saskatoon, SK"},
      {value:"Regina",label:"Regina, SK"},
      {value:"St. John's",label:"St. John's, NL"},
      {value:"Charlottetown",label:"Charlottetown, PE"},
      {value:"Sherbrooke",label:"Sherbrooke, QC"},
      {value:"Laval",label:"Laval, QC"},
      {value:"Gatineau",label:"Gatineau, QC"},
      {value:"Trois-Rivieres",label:"Trois-Rivières, QC"},
      {value:"London",label:"London, ON"}
    ]
  };

  const ONBOARDING_INTERESTS=[
    {id:"food",label:"Food & Drink",icon:"🍽️"},
    {id:"activities",label:"Things to Do",icon:"🎟️"},
    {id:"wellness",label:"Spa & Beauty",icon:"✨"},
    {id:"travel",label:"Travel",icon:"✈️"}
  ];

  function readOnboarding(){
    try{
      const data=JSON.parse(localStorage.getItem("dealzyOnboarding")||"null");
      if(data&&typeof data==="object") return data;
    }catch(_){}
    return {completed:false,interests:[],budget:100};
  }

  function saveOnboarding(data){
    const next={
      completed:!!data.completed,
      country:data.country==="CA"?"CA":"US",
      city:String(data.city||"Miami"),
      locale:data.locale==="fr"?"fr":"en",
      interests:Array.isArray(data.interests)?data.interests.filter(Boolean).slice(0,4):[],
      budget:Math.max(10,Math.min(5000,Number(data.budget)||100)),
      updatedAt:new Date().toISOString(),
      completedAt:data.completed?(data.completedAt||new Date().toISOString()):null
    };
    localStorage.setItem("dealzyOnboarding",JSON.stringify(next));
    if(window.DealzyCloud) window.DealzyCloud.queueSync();
    return next;
  }

  function readMarket(){
    let saved=null;
    try{saved=JSON.parse(localStorage.getItem("dealzyMarket")||"null");}catch(_){}
    const country=saved&&saved.country==="CA"?"CA":"US";
    const cities=MARKET_CITIES[country];
    const savedCity=saved&&String(saved.city||"").trim();
    const city=savedCity?savedCity.slice(0,80):cities[0].value;
    return {country,city,currency:country==="CA"?"CAD":"USD"};
  }

  let market=readMarket();

  function marketCityLabel(){
    return (MARKET_CITIES[market.country].find(x=>x.value===market.city)||{}).label||market.city;
  }

  function moneyFor(value,currency){
    const n=Number(value||0);
    if(!n) return "";
    const code=currency||market.currency;
    return (code==="CAD"?"CA$":"$")+n.toFixed(0);
  }

  function tr(key,values){
    return window.DealzyI18n?window.DealzyI18n.t(key,values):String(key).replace(/\{(\w+)\}/g,(_,k)=>values&&values[k]!=null?String(values[k]):"{"+k+"}");
  }

  function locale(){
    return window.DealzyI18n?window.DealzyI18n.getLocale():(localStorage.getItem("dealzyLocale")||"en");
  }

  function coordsAllowedForMarket(coords,country){
    if(!coords) return false;
    const lat=Number(coords.lat),lng=Number(coords.lng);
    if(!Number.isFinite(lat)||!Number.isFinite(lng)) return false;
    if(country==="CA") return lat>=41&&lat<=84&&lng>=-141&&lng<=-52;
    const contiguous=lat>=24&&lat<=50&&lng>=-125&&lng<=-66;
    const alaska=lat>=51&&lat<=72&&lng>=-170&&lng<=-129;
    const hawaii=lat>=18&&lat<=23&&lng>=-161&&lng<=-154;
    return contiguous||alaska||hawaii;
  }

  const MARKET_CITY_COORDS={
    US:{
      "Miami":[25.7617,-80.1918],"New York":[40.7128,-74.0060],"Los Angeles":[34.0522,-118.2437],
      "Chicago":[41.8781,-87.6298],"Las Vegas":[36.1699,-115.1398],"Orlando":[28.5383,-81.3792],
      "San Francisco":[37.7749,-122.4194],"Boston":[42.3601,-71.0589],"Seattle":[47.6062,-122.3321],
      "Washington":[38.9072,-77.0369],"Dallas":[32.7767,-96.7970],"Houston":[29.7604,-95.3698],
      "San Diego":[32.7157,-117.1611],"Philadelphia":[39.9526,-75.1652],"Atlanta":[33.7490,-84.3880],
      "New Orleans":[29.9511,-90.0715],"Austin":[30.2672,-97.7431],"Denver":[39.7392,-104.9903],
      "Nashville":[36.1627,-86.7816],"Phoenix":[33.4484,-112.0740],"Honolulu":[21.3099,-157.8581],
      "Fort Lauderdale":[26.1224,-80.1373]
    },
    CA:{
      "Toronto":[43.6532,-79.3832],"Montreal":[45.5017,-73.5673],"Vancouver":[49.2827,-123.1207],
      "Calgary":[51.0447,-114.0719],"Ottawa":[45.4215,-75.6972],"Edmonton":[53.5461,-113.4938],
      "Quebec City":[46.8139,-71.2080],"Winnipeg":[49.8951,-97.1384],"Halifax":[44.6488,-63.5752],
      "Victoria":[48.4284,-123.3656],"Niagara Falls":[43.0896,-79.0849],"Banff":[51.1784,-115.5708],
      "Kelowna":[49.8880,-119.4960],"Whistler":[50.1163,-122.9574],"Mississauga":[43.5890,-79.6441],
      "Hamilton":[43.2557,-79.8711],"Kitchener":[43.4516,-80.4925],"Saskatoon":[52.1332,-106.6700],
      "Regina":[50.4452,-104.6189],"St. John's":[47.5615,-52.7126],"Charlottetown":[46.2382,-63.1311],
      "Sherbrooke":[45.4042,-71.8929],"Laval":[45.6066,-73.7124],"Gatineau":[45.4765,-75.7013],
      "Trois-Rivieres":[46.3430,-72.5430],"London":[42.9849,-81.2453]
    }
  };

  async function ensureMarketCityCoords(){
    if(state.coords&&coordsAllowedForMarket(state.coords,market.country)) return state.coords;

    const known=(MARKET_CITY_COORDS[market.country]||{})[market.city];
    if(known){
      state.coords={lat:known[0],lng:known[1],source:"city"};
      localStorage.setItem("dealzyCoords",JSON.stringify(state.coords));
      return state.coords;
    }

    let cache={};
    try{cache=JSON.parse(localStorage.getItem("dealzyCityGeo")||"{}")||{};}catch(_){}
    const cacheKey=market.country+"|"+market.city.toLowerCase();
    const cached=cache[cacheKey];
    if(cached&&coordsAllowedForMarket(cached,market.country)){
      state.coords={lat:Number(cached.lat),lng:Number(cached.lng),source:"city"};
      localStorage.setItem("dealzyCoords",JSON.stringify(state.coords));
      return state.coords;
    }

    try{
      const countryName=market.country==="CA"?"Canada":"United States";
      const p=new URLSearchParams({
        format:"jsonv2",
        limit:"1",
        countrycodes:market.country.toLowerCase(),
        q:market.city+", "+countryName
      });
      const response=await fetch("https://nominatim.openstreetmap.org/search?"+p.toString(),{
        headers:{Accept:"application/json"},signal:AbortSignal.timeout(5000)
      });
      if(response.ok){
        const rows=await response.json();
        const first=Array.isArray(rows)?rows[0]:null;
        const lat=first?Number(first.lat):NaN;
        const lng=first?Number(first.lon):NaN;
        const next={lat,lng};
        if(coordsAllowedForMarket(next,market.country)){
          cache[cacheKey]=next;
          localStorage.setItem("dealzyCityGeo",JSON.stringify(cache));
          state.coords={lat,lng,source:"city"};
          localStorage.setItem("dealzyCoords",JSON.stringify(state.coords));
          return state.coords;
        }
      }
    }catch(_){}
    return null;
  }

  function persistMarket(country,city,locationMode="manual"){
    const safeCountry=country==="CA"?"CA":"US";
    const safeCity=String(city||"").trim().replace(/\s+/g," ").slice(0,80)||MARKET_CITIES[safeCountry][0].value;
    market={country:safeCountry,city:safeCity,currency:safeCountry==="CA"?"CAD":"USD"};
    localStorage.setItem("dealzyMarket",JSON.stringify(market));
    localStorage.setItem("dealzyLocationMode",locationMode);
    localStorage.setItem("dealzyLocationChoice",locationMode);
    state.coords=null;
    localStorage.removeItem("dealzyCoords");
    catalog.clear();
    homeDeals=[];
    exploreCache={key:"",rows:[]};
    if(window.DealzyCloud) window.DealzyCloud.queueSync();
  }

  async function reverseGpsLocation(lat,lng){
    try{
      const p=new URLSearchParams({
        format:"jsonv2",
        lat:String(lat),
        lon:String(lng),
        zoom:"10",
        addressdetails:"1"
      });
      const response=await fetch("https://nominatim.openstreetmap.org/reverse?"+p.toString(),{
        headers:{Accept:"application/json"}
      });
      if(!response.ok) return null;
      const data=await response.json();
      const address=data&&data.address?data.address:{};
      const cc=String(address.country_code||"").toUpperCase();
      const country=cc==="CA"?"CA":cc==="US"?"US":null;
      if(!country) return {country:null,city:null,address};
      const city=String(
        address.city||address.town||address.municipality||address.village||
        address.hamlet||address.county||""
      ).trim();
      return {country,city:city||MARKET_CITIES[country][0].value,address};
    }catch(_){
      return null;
    }
  }

  async function applyGpsLocation(lat,lng,{refresh=true,silent=false}={}){
    const coords={lat:Number(lat),lng:Number(lng),source:"gps"};
    if(!Number.isFinite(coords.lat)||!Number.isFinite(coords.lng)) return null;

    const detected=await reverseGpsLocation(coords.lat,coords.lng);
    if(!detected||!detected.country){
      // Do not show US/Canada deals as nearby when the location is outside
      // those markets, or the reverse lookup cannot identify a country.
      state.coords=null;
      localStorage.removeItem("dealzyCoords");
      localStorage.setItem("dealzyLocationMode","manual");
      localStorage.removeItem("dealzyLocationChoice");
      updateMarketUI();
      if(typeof updateGeoUI==="function") updateGeoUI();
      if(!silent) toast(locale()==="fr"
        ? detected?"Position détectée. Offres disponibles aux USA et au Canada uniquement.":"Ville introuvable pour cette position. Choisissez une ville."
        : detected?"Location detected. Deals are available in the USA and Canada only.":"Could not identify this location. Choose a city.");
      return {coords,country:null,city:null,reason:detected?"outside":"lookup"};
    }

    persistMarket(detected.country,detected.city,"gps");
    state.coords=coords;
    localStorage.setItem("dealzyCoords",JSON.stringify(state.coords));
    localStorage.setItem("dealzyLocationMode","gps");

    updateMarketUI();
    if(typeof updateGeoUI==="function") updateGeoUI();
    window.dispatchEvent(new CustomEvent("dealzy:gpslocation",{detail:{
      country:detected.country,city:detected.city,lat:coords.lat,lng:coords.lng
    }}));

    if(refresh){
      await hydrateHome();
      const explore=document.getElementById("exploreView");
      if(explore&&!explore.classList.contains("hidden")) renderExplore();
    }
    if(!silent) toast((locale()==="fr"?"Position réelle : ":"Real location: ")+detected.city);
    return {coords,country:detected.country,city:detected.city};
  }

  function useRealLocation({silent=false,refresh=true}={}){
    if(!navigator.geolocation){
      if(!silent) toast(locale()==="fr"?"La géolocalisation n’est pas disponible.":"Geolocation is unavailable.");
      return Promise.resolve(null);
    }
    return new Promise(resolve=>{
      navigator.geolocation.getCurrentPosition(
        async pos=>{
          try{
            const result=await applyGpsLocation(pos.coords.latitude,pos.coords.longitude,{refresh,silent});
            resolve(result);
          }catch(_){resolve(null);}
        },
        ()=>{
          if(!silent) toast(locale()==="fr"?"Autorisation de localisation refusée.":"Location permission was not granted.");
          resolve(null);
        },
        {enableHighAccuracy:true,timeout:12000,maximumAge:120000}
      );
    });
  }

  window.DealzyLocation={
    useRealLocation,
    applyGpsLocation,
    mode:()=>localStorage.getItem("dealzyLocationMode")||"gps"
  };

  function showLocationPrompt(){
    if(document.getElementById("dealzyLocationPrompt")) return;
    const fr=locale()==="fr";
    const style=document.createElement("style");
    style.id="dealzyLocationPromptStyles";
    style.textContent=
      '.dz-location-wrap{position:fixed;inset:0;z-index:210;background:rgba(17,24,39,.58);display:grid;place-items:center;padding:18px;backdrop-filter:blur(5px)}'+
      '.dz-location-card{width:min(440px,100%);background:#fff;border-radius:25px;padding:24px;box-shadow:0 24px 70px rgba(0,0,0,.28);color:#182230}'+
      '.dz-location-card h2{font-size:24px;margin:8px 0 10px}.dz-location-card p{line-height:1.5;color:#475467;margin:0 0 15px}'+
      '.dz-location-card label{display:block;font-weight:700;font-size:13px;margin:12px 0}'+
      '.dz-location-card select{display:block;width:100%;padding:11px 12px;margin-top:6px;border:1px solid #d8dce8;border-radius:12px;background:#fff;color:#182230}'+
      '.dz-location-card button{width:100%;border:0;border-radius:13px;padding:13px;font-weight:800;cursor:pointer;margin-top:8px}'+
      '.dz-location-primary{background:#6254ef;color:#fff}.dz-location-city{background:#eef2ff;color:#5145cd}.dz-location-later{background:transparent;color:#667085}'+
      '.dz-location-status{min-height:0;font-size:13px;color:#a13a31;margin-top:9px;line-height:1.4}';
    document.head.appendChild(style);

    const wrap=document.createElement("div");
    wrap.id="dealzyLocationPrompt";
    wrap.className="dz-location-wrap";
    wrap.innerHTML='<section class="dz-location-card" role="dialog" aria-modal="true" aria-labelledby="dzLocationTitle">'+
      '<div aria-hidden="true" style="font-size:30px">📍</div>'+
      '<h2 id="dzLocationTitle">'+(fr?'Trouver des offres autour de vous':'Find deals around you')+'</h2>'+
      '<p>'+(fr?'Autorisez la position de votre appareil pour voir les offres proches de vous. Dealzy couvre actuellement les États-Unis et le Canada.':'Allow your device location to see deals nearby. Dealzy currently covers the United States and Canada.')+'</p>'+
      '<button type="button" class="dz-location-primary">'+(fr?'Utiliser ma position':'Use my location')+'</button>'+
      '<label>'+(fr?'Ou choisir un pays et une ville':'Or choose a country and city')+
        '<select id="dzLocationCountry"><option value="US">🇺🇸 '+(fr?'États-Unis':'United States')+'</option><option value="CA">🇨🇦 Canada</option></select></label>'+
      '<button type="button" class="dz-location-city">'+(fr?'Choisir une ville':'Choose a city')+'</button>'+
      '<div class="dz-location-status" role="status" aria-live="polite"></div>'+
      '<button type="button" class="dz-location-later">'+(fr?'Plus tard':'Later')+'</button>'+
      '</section>';
    document.body.appendChild(wrap);
    const primary=wrap.querySelector('.dz-location-primary');
    const status=wrap.querySelector('.dz-location-status');
    const close=()=>{document.removeEventListener('keydown',onKeydown);wrap.remove();style.remove();window.DealzyLocation.closePrompt=null;};
    const onKeydown=e=>{if(e.key==='Escape') close();};
    window.DealzyLocation.closePrompt=close;
    document.addEventListener('keydown',onKeydown);
    wrap.onclick=e=>{if(e.target===wrap) close();};
    wrap.querySelector('.dz-location-later').onclick=close;
    wrap.querySelector('.dz-location-city').onclick=()=>{
      const country=wrap.querySelector('#dzLocationCountry').value;
      persistMarket(country,MARKET_CITIES[country][0].value);
      close();
      updateMarketUI();
      hydrateHome();
      openMarketPicker('city');
    };
    primary.onclick=async()=>{
      primary.disabled=true;
      primary.textContent=fr?'Localisation en cours…':'Locating…';
      status.textContent='';
      // Calling getCurrentPosition inside this click lets the browser show
      // its native permission request in response to a user gesture.
      const result=await useRealLocation({silent:true,refresh:true});
      if(!wrap.isConnected) return;
      primary.disabled=false;
      primary.textContent=fr?'Réessayer':'Try again';
      if(result&&result.country){close();return;}
      status.textContent=result&&result.reason==='outside'
        ? (fr?'Votre position est hors des marchés disponibles. Choisissez une ville aux États-Unis ou au Canada.':'Your location is outside the available markets. Choose a US or Canadian city.')
        : result&&result.reason==='lookup'
          ? (fr?'La ville n’a pas pu être identifiée. Choisissez une ville ou réessayez.':'We could not identify the city. Choose a city or try again.')
          : (fr?'Position indisponible. Vérifiez l’autorisation de localisation dans les réglages du navigateur ou choisissez une ville.':'Location unavailable. Check browser location permission or choose a city.');
    };
    primary.focus();
  }

  async function maybeShowLocationPrompt(){
    const choice=localStorage.getItem('dealzyLocationChoice');
    if(choice==='manual') return;
    if(choice==='gps'&&navigator.permissions?.query){
      try{
        const permission=await navigator.permissions.query({name:'geolocation'});
        if(permission.state==='granted'){
          const result=await useRealLocation({silent:true,refresh:true});
          if(result&&result.country) return;
        }
      }catch(_){}
    }else if(choice==='gps') return;
    showLocationPrompt();
  }

  const h=(value)=>String(value??"").replace(/[&<>"']/g,(m)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));

  function stableId(value){
    const s=String(value||"");
    let hash=2166136261;
    for(let i=0;i<s.length;i++){
      hash^=s.charCodeAt(i);
      hash=Math.imul(hash,16777619);
    }
    return Math.abs(hash>>>0)||1;
  }

  function categoryInterestId(category){
    return {"Food & Drink":"food","Things to Do":"activities","Spa & Beauty":"wellness","Travel":"travel"}[category]||null;
  }

  function milesBetween(a,b,c,d){
    const vals=[a,b,c,d].map(Number);
    if(vals.some(x=>!Number.isFinite(x))) return null;
    const toRad=v=>v*Math.PI/180;
    const R=3958.8;
    const dLat=toRad(vals[2]-vals[0]);
    const dLng=toRad(vals[3]-vals[1]);
    const q=Math.sin(dLat/2)**2+Math.cos(toRad(vals[0]))*Math.cos(toRad(vals[2]))*Math.sin(dLng/2)**2;
    return 2*R*Math.asin(Math.sqrt(q));
  }

  function dealzyScore(d){
    const profile=readOnboarding();
    const interests=Array.isArray(profile.interests)?profile.interests:[];
    const preferredBudget=Math.max(10,Number(profile.budget)||100);
    const interestId=categoryInterestId(d.cat);
    let score=30;
    const reasons=[];

    if(interests.length&&interestId&&interests.includes(interestId)){
      score+=18;
      reasons.push(tr("Matches your interests"));
    }

    const price=Number(d.price||0);
    if(price>0){
      if(price<=preferredBudget){
        score+=12;
        reasons.push(tr("Within your preferred budget"));
      }else if(price<=preferredBudget*1.25){
        score+=5;
      }
    }else score+=2;

    const rating=Number(d.ratingValue||0);
    if(rating>=4.7){
      score+=10;
      reasons.push(tr("Strong customer rating"));
    }else if(rating>=4.4){
      score+=8;
      reasons.push(tr("Strong customer rating"));
    }else if(rating>=4.0){
      score+=5;
    }

    const reviews=Number(d.reviewCount||0);
    if(reviews>=500){
      score+=4;
      reasons.push(tr("Popular with reviewers"));
    }else if(reviews>=100){
      score+=6;
      reasons.push(tr("Popular with reviewers"));
    }else if(reviews>=20){
      score+=2;
    }

    if(state.coords&&coordsAllowedForMarket(state.coords,market.country)){
      const distance=milesBetween(state.coords.lat,state.coords.lng,d.lat,d.lng);
      if(distance!==null){
        if(distance<=3){
          score+=10;
          reasons.push(tr("Near your location"));
        }else if(distance<=10){
          score+=7;
          reasons.push(tr("Near your location"));
        }else if(distance<=25){
          score+=4;
        }
      }
    }

    if(d.img) score+=3;
    if(d.partnerUrl) score+=3;

    score=Math.max(1,Math.min(99,Math.round(score)));
    if(!reasons.length) reasons.push(tr("Relevant live provider result"));
    return {score,reasons:reasons.slice(0,4),preferredBudget};
  }

  function personalizedHome(rows){
    return (rows||[]).map((d,index)=>({d,index,s:dealzyScore(d).score}))
      .sort((a,b)=>b.s-a.s||a.index-b.index)
      .map(x=>x.d);
  }

  function orderedCategories(){
    const profile=readOnboarding();
    const interests=Array.isArray(profile.interests)?profile.interests:[];
    const available=[...cats,...(dealzyProviderRuntime.awin?[["🛍️","Shopping"]]:[])];
    const seasonal=seasonalPartnerUrl()?["🎃","Halloween"]:null;
    if(!interests.length) return seasonal?[seasonal,...available]:available;
    const priority=new Map(interests.map((id,index)=>[id,index]));
    available.sort((a,b)=>{
      const ai=priority.has(categoryInterestId(a[1]))?priority.get(categoryInterestId(a[1])):999;
      const bi=priority.has(categoryInterestId(b[1]))?priority.get(categoryInterestId(b[1])):999;
      return ai-bi;
    });
    return seasonal?[seasonal,...available]:available;
  }

  function toDeal(raw){
    const source=String(raw.source||raw.provider||"Partner");
    const price=Number(raw.price)>0?Number(raw.price):null;
    const old=price&&Number(raw.old)>price?Number(raw.old):price;
    const reviews=Number(raw.reviewCount||0);
    const rating=raw.rating?("★ "+raw.rating+(reviews?" ("+reviews.toLocaleString()+")":"")):"";
    return {
      id:stableId(raw.id||source+"|"+raw.title+"|"+raw.place),
      externalId:raw.id||null,
      title:raw.title||"Live result",
      cat:raw.category||"Things to Do",
      place:raw.place||"",
      rating,
      ratingValue:Number(raw.rating||0)||0,
      lat:Number(raw.lat)||null,
      lng:Number(raw.lng)||null,
      price,
      old,
      priceLabel:raw.priceLabel||null,
      badge:source,
      img:raw.image||"",
      text:raw.text||"",
      partnerUrl:raw.partnerUrl||null,
      source,
      provider:raw.provider||source.toLowerCase(),
      currency:raw.currency||market.currency,
      reviewCount:reviews,
      phone:raw.phone||null,
      eventDate:raw.eventDate||null,
      eventTime:raw.eventTime||null,
      live:true
    };
  }

  function remember(rows){
    rows.forEach((d)=>catalog.set(Number(d.id),d));
    return rows;
  }

  function getSavedSnapshots(){
    try{return JSON.parse(localStorage.getItem("dealzyLiveSaved")||"{}")||{};}catch(_){return {};}
  }

  function saveSnapshots(snapshots){
    localStorage.setItem("dealzyLiveSaved",JSON.stringify(snapshots||{}));
    if(window.DealzyCloud) window.DealzyCloud.queueSync();
  }

  function loadSavedIntoCatalog(){
    const saved=getSavedSnapshots();
    Object.values(saved).forEach((d)=>{if(d&&d.id!=null) catalog.set(Number(d.id),d);});
  }

  async function trackPartnerClick(d){
    try{
      const events=JSON.parse(localStorage.getItem("dealzyPartnerClicks")||"[]");
      events.push({
        provider:d.provider||d.source||"partner",
        source:d.source||"",
        title:d.title||"",
        externalId:d.externalId||null,
        market:{country:market.country,city:market.city,currency:market.currency},
        clickedAt:new Date().toISOString()
      });
      localStorage.setItem("dealzyPartnerClicks",JSON.stringify(events.slice(-200)));
      if(window.DealzyCloud) window.DealzyCloud.queueSync();
    }catch(_){}
    try{
      const session=window.DealzyCloud&&window.DealzyCloud.getSession
        ? await window.DealzyCloud.getSession()
        : null;
      const headers={
        'apikey':'sb_publishable_EVDiDkczLgCmggcMxbV8tw_jQm4g9Rh',
        'Content-Type':'application/json'
      };
      if(session&&session.access_token) headers.Authorization='Bearer '+session.access_token;
      await fetch('https://stkmhgeuavsidpapqvyw.supabase.co/rest/v1/rpc/dealzy_track_partner_click',{
        method:'POST',
        headers,
        keepalive:true,
        body:JSON.stringify({
          p_provider:String(d.provider||d.source||'partner').toLowerCase(),
          p_source:String(d.source||'').slice(0,80),
          p_title:String(d.title||'').slice(0,240),
          p_external_id:d.externalId==null?null:String(d.externalId).slice(0,160),
          p_country_code:market.country,
          p_city:market.city,
          p_currency_code:market.currency
        })
      });
    }catch(_){}
  }

  function dedupe(rows){
    const seen=new Set();
    return rows.filter((d)=>{
      const key=String(d.source||"")+"|"+String(d.externalId||d.title)+"|"+String(d.place||"");
      if(seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  let exploreCache={key:"",rows:[]};

  function readExplorePrefs(){
    try{
      const saved=JSON.parse(localStorage.getItem("dealzyExplorePrefs")||"null");
      if(saved&&typeof saved==="object"){
        return {
          sort:["best","nearest","rating","price"].includes(saved.sort)?saved.sort:"best",
          radius:[0,5,10,25,50].includes(Number(saved.radius))?Number(saved.radius):25,
          source:String(saved.source||"all").toLowerCase()
        };
      }
    }catch(_){}
    return {sort:"best",radius:25,source:"all"};
  }

  function saveExplorePrefs(next){
    localStorage.setItem("dealzyExplorePrefs",JSON.stringify(next));
    if(window.DealzyCloud) window.DealzyCloud.queueSync();
  }

  function dealDistance(d){
    if(!state.coords) return null;
    return milesBetween(state.coords.lat,state.coords.lng,d.lat,d.lng);
  }

  function exploreRequestKey(q){
    const c=state.coords&&coordsAllowedForMarket(state.coords,market.country)
      ? Number(state.coords.lat).toFixed(3)+","+Number(state.coords.lng).toFixed(3)
      : "none";
    return [market.country,market.city,state.filter,state.maxPrice||"",q||"",c].join("|");
  }

  function applyExplorePrefs(rows,prefs){
    let list=dedupe(rows||[]);
    const source=String(prefs.source||"all").toLowerCase();
    if(source!=="all"){
      list=list.filter(d=>String(d.provider||d.source||"").toLowerCase()===source);
    }

    if(Number(prefs.radius)>0&&state.coords&&coordsAllowedForMarket(state.coords,market.country)){
      list=list.filter(d=>{
        const distance=dealDistance(d);
        // Keep rows without coordinates; the radius is strict only where a
        // provider supplies geolocation.
        return distance===null||distance<=Number(prefs.radius);
      });
    }

    if(prefs.sort==="nearest"){
      list.sort((a,b)=>(dealDistance(a)??99999)-(dealDistance(b)??99999));
    }else if(prefs.sort==="rating"){
      list.sort((a,b)=>(Number(b.ratingValue)||0)-(Number(a.ratingValue)||0)||(Number(b.reviewCount)||0)-(Number(a.reviewCount)||0));
    }else if(prefs.sort==="price"){
      list.sort((a,b)=>{
        const ap=Number(a.price)>0?Number(a.price):999999;
        const bp=Number(b.price)>0?Number(b.price):999999;
        return ap-bp;
      });
    }else{
      list.sort((a,b)=>dealzyScore(b).score-dealzyScore(a).score);
    }
    return list;
  }

  function openExploreChoicePicker(kind){
    ensureMarketPickerStyles();
    const old=document.getElementById("dealzyExplorePicker");
    if(old) old.remove();

    const prefs=readExplorePrefs();
    const isFr=locale()==="fr";
    const options=kind==="sort"
      ? [
          {value:"best",label:isFr?"Meilleur":"Best"},
          {value:"nearest",label:isFr?"Plus proche":"Nearest"},
          {value:"rating",label:isFr?"Mieux noté":"Top rated"},
          {value:"price",label:isFr?"Prix bas":"Price low"}
        ]
      : [
          {value:"0",label:isFr?"Tout rayon":"Any radius"},
          {value:"5",label:"5 mi"},
          {value:"10",label:"10 mi"},
          {value:"25",label:"25 mi"},
          {value:"50",label:"50 mi"}
        ];
    const selected=kind==="sort"?prefs.sort:String(prefs.radius);

    const wrap=document.createElement("div");
    wrap.id="dealzyExplorePicker";
    wrap.className="dz-picker-wrap";
    wrap.innerHTML=
      '<section class="dz-picker-card" role="dialog" aria-modal="true">'+
        '<div class="dz-picker-head"><b>'+h(kind==="sort"?(isFr?"Trier":"Sort"):(isFr?"Rayon":"Radius"))+'</b>'+
        '<button class="dz-picker-close" aria-label="Close">×</button></div>'+
        '<div id="dzExplorePickerOptions">'+options.map(opt=>
          '<button class="dz-picker-option '+(opt.value===selected?"selected":"")+'" data-value="'+h(opt.value)+'">'+
            '<span class="dz-opt-main"><span>'+h(opt.label)+'</span></span><span class="dz-check">✓</span>'+
          '</button>'
        ).join("")+'</div>'+
      '</section>';
    document.body.appendChild(wrap);
    wrap.querySelector(".dz-picker-close").onclick=()=>wrap.remove();
    wrap.onclick=e=>{if(e.target===wrap) wrap.remove();};
    wrap.querySelectorAll("[data-value]").forEach(btn=>{
      btn.onclick=()=>{
        const next=readExplorePrefs();
        if(kind==="sort") next.sort=btn.dataset.value;
        else next.radius=Number(btn.dataset.value)||0;
        saveExplorePrefs(next);
        wrap.remove();
        renderExplore(false);
      };
    });
  }

  function exploreControlsHtml(rows,prefs,isFr){
    const counts={};
    (rows||[]).forEach(d=>{
      const key=String(d.provider||d.source||"partner").toLowerCase();
      counts[key]=(counts[key]||0)+1;
    });
    const sourceLabels={yelp:"Yelp",viator:"Viator",ticketmaster:"Ticketmaster",awin:"Awin"};
    const sourceChipStyle=(active)=>[
      "flex:0 0 auto",
      "border:1px solid "+(active?"#7768ff":"#e2e5ec"),
      "background:"+(active?"#f0eeff":"#fff"),
      "color:"+(active?"#5145cd":"#475467"),
      "border-radius:999px",
      "padding:8px 11px",
      "font:inherit",
      "font-size:12px",
      "font-weight:800",
      "white-space:nowrap",
      "box-shadow:"+(active?"0 4px 12px rgba(81,69,205,.10)":"none")
    ].join(";");
    const sourceButtons=[
      '<button data-source="all" style="'+sourceChipStyle(prefs.source==="all")+'">'+(isFr?"Toutes":"All")+' <span style="opacity:.65">· '+rows.length+'</span></button>'
    ];
    Object.entries(counts).sort((a,b)=>b[1]-a[1]).forEach(([key,n])=>{
      sourceButtons.push('<button data-source="'+h(key)+'" style="'+sourceChipStyle(prefs.source===key)+'">'+h(sourceLabels[key]||key)+' <span style="opacity:.65">· '+n+'</span></button>');
    });

    const sortLabels={best:isFr?"Meilleur":"Best",nearest:isFr?"Plus proche":"Nearest",rating:isFr?"Mieux noté":"Top rated",price:isFr?"Prix bas":"Price low"};
    const radiusLabel=Number(prefs.radius)>0?prefs.radius+" mi":(isFr?"Tout rayon":"Any radius");
    const choiceStyle="width:100%;margin-top:4px;border:1px solid #dfe3eb;border-radius:12px;padding:10px 12px;background:#fff;display:flex;align-items:center;justify-content:space-between;gap:8px;font:inherit;color:#182230;text-align:left";

    return '<div id="dzExplorePro" style="grid-column:1/-1;background:#fff;border:1px solid #e7e9f0;border-radius:20px;padding:12px;margin:0 0 10px;box-shadow:0 6px 18px rgba(17,24,39,.04)">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px"><b style="font-size:14px">'+(isFr?"Affiner les résultats":"Refine results")+'</b><button id="dzExploreRefresh" style="border:0;background:#f4f5f8;border-radius:999px;padding:7px 11px;font:inherit;font-size:12px;font-weight:800;color:#475467">↻ '+(isFr?"Actualiser":"Refresh")+'</button></div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'+
        '<label class="meta">'+(isFr?"Trier":"Sort")+'<button type="button" id="dzExploreSortBtn" style="'+choiceStyle+'"><span>'+h(sortLabels[prefs.sort]||sortLabels.best)+'</span><span>⌄</span></button></label>'+
        '<label class="meta">'+(isFr?"Rayon":"Radius")+'<button type="button" id="dzExploreRadiusBtn" style="'+choiceStyle+'"><span>'+h(radiusLabel)+'</span><span>⌄</span></button></label>'+
      '</div>'+
      '<div id="dzExploreSources" style="display:flex;gap:7px;overflow-x:auto;overflow-y:hidden;padding:9px 1px 2px;scrollbar-width:none;-webkit-overflow-scrolling:touch">'+sourceButtons.join("")+'</div>'+
    '</div>';
  }

  async function fetchLive(category,q="",limit=8){
    await ensureMarketCityCoords();
    const params=new URLSearchParams({
      category,
      limit:String(limit),
      country:market.country,
      city:market.city,
      currency:market.currency
    });
    if(q) params.set("q",q);
    if(state.maxPrice) params.set("maxPrice",String(state.maxPrice));
    if(state.coords&&coordsAllowedForMarket(state.coords,market.country)){
      params.set("lat",String(state.coords.lat));
      params.set("lng",String(state.coords.lng));
      const radius=Number(readExplorePrefs().radius)||25;
      params.set("radius",String(Math.max(1,Math.min(50,radius))));
    }
    const response=await fetch("/api/search?"+params.toString(),{
      headers:{Accept:"application/json"},
      cache:"no-store",
      signal:AbortSignal.timeout(12000)
    });
    if(!response.ok) return [];
    const data=await response.json();
    if(!data||data.mode==="demo-fallback") return [];

    let raw=Array.isArray(data.results)?data.results:[];
    const apiDestination=String(data?.query?.destination||"").trim();
    const normalizeCityName=(value)=>String(value||"")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .replace(/[^a-z0-9]+/g," ")
      .trim();
    const selectedCity=normalizeCityName(market.city);
    const returnedCity=normalizeCityName(apiDestination);
    const destinationMatches=!returnedCity ||
      returnedCity===selectedCity ||
      returnedCity.startsWith(selectedCity+" ") ||
      selectedCity.startsWith(returnedCity+" ");

    // The current public fallback API is legacy and can explicitly report Miami
    // even when the APK asked for another city. Never trust non-local provider
    // rows in that case. Yelp remains eligible because it consumes the coordinates
    // sent by the APK and supplies coordinates for each result.
    if(!destinationMatches){
      raw=raw.filter(item=>String(item.provider||item.source||"").toLowerCase()==="yelp");
    }else if(!apiDestination&&market.city.toLowerCase()!=="miami"){
      raw=raw.filter(item=>String(item.provider||item.source||"").toLowerCase()==="yelp");
    }

    let normalized=raw.map(toDeal);

    // Apply a final locality sanity check to every result that has coordinates.
    // This prevents stale/cross-city inventory from leaking into Home or Explore.
    if(state.coords&&coordsAllowedForMarket(state.coords,market.country)){
      const requestedRadius=Number(readExplorePrefs().radius)||25;
      const localityLimit=Math.max(35,Math.min(100,requestedRadius*2));
      normalized=normalized.filter(d=>{
        const distance=dealDistance(d);
        if(distance!==null) return distance<=localityLimit;
        // Coordinate-less rows (mainly Viator) are only safe when the server
        // explicitly confirms the selected destination.
        const provider=String(d.provider||d.source||"").toLowerCase();
        if(provider==="viator"||provider==="ticketmaster") return destinationMatches&&!!apiDestination;
        return true;
      });
    }

    return remember(normalized);
  }

  async function fetchCategoryBoosted(category,q="",target=12){
    const wanted=Math.max(4,Math.min(30,Number(target)||12));
    let primary=[];
    try{ primary=await fetchLive(category,q,wanted); }catch(_){ primary=[]; }

    // If a strict query returns too little, keep those matches and add popular live
    // inventory from the same category. Nothing synthetic is added here.
    if(q && primary.length<Math.min(6,wanted)){
      let broad=[];
      try{ broad=await fetchLive(category,"",wanted); }catch(_){ broad=[]; }
      primary=dedupe([...primary,...broad]);
    }
    return remember(primary.slice(0,wanted));
  }

  async function fetchMixed(q="",limitEach=10){
    await refreshDealzyProviderRuntime(false);
    const perCategory=Math.max(6,Math.min(16,Number(limitEach)||10));
    const groups=await Promise.all(
      activeCategories().filter(cat=>cat!=="Halloween").map((cat)=>fetchCategoryBoosted(cat,q,perCategory).catch(()=>[]))
    );
    const interleaved=[];
    for(let i=0;i<perCategory;i++){
      groups.forEach((group)=>{ if(group[i]) interleaved.push(group[i]); });
    }
    return remember(dedupe(interleaved).slice(0,40));
  }

  dealCard=function(d){
    const saved=state.favorites.has(d.id);
    const hasPrice=Number(d.price)>0;
    const hasDiscount=hasPrice&&Number(d.old)>Number(d.price);
    const pct=hasDiscount?Math.round((1-d.price/d.old)*100):0;
    const priceText=hasPrice?moneyFor(d.price,d.currency):(d.priceLabel||tr("Price on provider"));
    const oldText=hasDiscount?'<span class="old">'+moneyFor(d.old,d.currency)+"</span>":"";
    const saveText=hasDiscount?'<span class="save">'+h(tr("Save {pct}%",{pct}))+"</span>":'<span class="save">'+h(d.source||"Live")+"</span>";
    const scoreInfo=dealzyScore(d);
    const distance=dealDistance(d);
    const distanceText=distance!==null
      ? (distance<0.1?"<0.1 mi":distance.toFixed(distance<10?1:0)+" mi")
      : "";
    const scorePill='<span title="'+h(tr("Personalized relevance score"))+'" style="display:inline-flex;align-items:center;gap:5px;background:#f1efff;color:#5145cd;border-radius:999px;padding:6px 9px;font-size:11px;font-weight:850;margin-top:9px">✦ '+scoreInfo.score+' '+h(tr("Dealzy AI"))+'</span>';
    const bg=d.img?"background-image:url(&quot;"+h(d.img)+"&quot;)":"background:linear-gradient(135deg,#eef2ff,#f8f9fc)";
    return '<article class="deal" data-id="'+d.id+'"><div class="dealImg" style="'+bg+'"><span class="badge">'+h(d.badge||d.source||"Live")+'</span><button class="heart" data-heart="'+d.id+'" aria-label="Save">'+(saved?"♥":"♡")+'</button></div><div class="dealBody"><h3>'+h(d.title)+'</h3><div class="meta">'+h(d.place||"")+(distanceText?" · 📍 "+h(distanceText):"")+(d.rating?" · "+h(d.rating):"")+'</div>'+scorePill+'<div class="row"><div><span class="price">'+h(priceText)+"</span>"+oldText+"</div>"+saveText+"</div></div></article>";
  };

  toggleFav=function(id){
    const numeric=Number(id);
    const d=catalog.get(numeric)||deals.find((x)=>Number(x.id)===numeric);
    const snapshots=getSavedSnapshots();
    if(state.favorites.has(numeric)){
      state.favorites.delete(numeric);
      if(!state.trip.includes(numeric)) delete snapshots[String(numeric)];
    }else{
      state.favorites.add(numeric);
      if(d) snapshots[String(numeric)]=d;
    }
    localStorage.setItem("dealzyFavs",JSON.stringify([...state.favorites]));
    saveSnapshots(snapshots);
    renderProfileInsights();
    toast(tr(state.favorites.has(numeric)?"Saved to Favorites":"Removed from Favorites"));
  };

  function addDealToTrip(d){
    if(!d) return false;
    const numeric=Number(d.id);
    if(!state.trip.includes(numeric)) state.trip.push(numeric);
    localStorage.setItem("dealzyTrip",JSON.stringify(state.trip));
    const snapshots=getSavedSnapshots();
    snapshots[String(numeric)]=d;
    saveSnapshots(snapshots);
    renderTrips();
    renderProfileInsights();
    if(window.DealzyCloud) window.DealzyCloud.queueSync();
    return true;
  }

  function dealDirectionsUrl(d){
    if(Number.isFinite(Number(d.lat))&&Number.isFinite(Number(d.lng))){
      return "https://www.google.com/maps/dir/?api=1&destination="+
        encodeURIComponent(String(d.lat)+","+String(d.lng));
    }
    const query=[d.place,d.title,market.city].filter(Boolean).join(" ");
    return "https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(query);
  }

  async function shareDeal(d){
    const price=Number(d.price)>0?moneyFor(d.price,d.currency):(d.priceLabel||"");
    const shareText=[d.title,price,d.place,d.source?"via "+d.source:""].filter(Boolean).join(" · ");
    const shareData={title:d.title||"Dealzy AI",text:shareText};
    if(d.partnerUrl) shareData.url=d.partnerUrl;
    try{
      if(navigator.share){
        await navigator.share(shareData);
        return true;
      }
    }catch(e){
      if(e&&e.name==="AbortError") return false;
    }
    try{
      const text=[shareText,d.partnerUrl||""].filter(Boolean).join("\n");
      await navigator.clipboard.writeText(text);
      toast(locale()==="fr"?"Lien copié":"Link copied");
      return true;
    }catch(_){
      toast(locale()==="fr"?"Partage indisponible sur cet appareil.":"Sharing is unavailable on this device.");
      return false;
    }
  }

  function ensureDetailActions(){
    let host=document.getElementById("dealzyDetailActions");
    if(host) return host;
    host=document.createElement("div");
    host.id="dealzyDetailActions";
    host.style.cssText="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:14px 0";
    const text=document.getElementById("detailText");
    if(text) text.insertAdjacentElement("afterend",host);
    return host;
  }

  openDeal=function(id){
    const numericId=Number(id);
    const d=catalog.get(numericId)||getSavedSnapshots()[String(numericId)]||deals.find((x)=>Number(x.id)===numericId);
    if(!d) return;

    const hasPrice=Number(d.price)>0;
    const hasDiscount=hasPrice&&Number(d.old)>Number(d.price);
    const pct=hasDiscount?Math.round((1-d.price/d.old)*100):0;
    const distance=dealDistance(d);
    const distanceText=distance!==null?(distance<0.1?"<0.1 mi":distance.toFixed(distance<10?1:0)+" mi"):"";

    $("#detailHero").style.backgroundImage=d.img?'url("'+String(d.img).replace(/"/g,"%22")+'")':"none";
    $("#detailBadge").textContent=d.source||"Live";
    $("#detailTitle").textContent=d.title||"";
    $("#detailMeta").textContent=[d.place,distanceText?("📍 "+distanceText):"",d.rating].filter(Boolean).join(" · ");

    const scoreInfo=dealzyScore(d);
    let scoreBox=document.getElementById("dealzyScoreDetail");
    if(!scoreBox){
      scoreBox=document.createElement("div");
      scoreBox.id="dealzyScoreDetail";
      scoreBox.style.cssText="margin:12px 0;padding:12px 14px;border-radius:16px;background:#f8f7ff;border:1px solid #e5e1ff;color:#344054";
      $("#detailMeta").insertAdjacentElement("afterend",scoreBox);
    }
    scoreBox.innerHTML=
      '<b style="color:#5145cd">✦ '+scoreInfo.score+' '+h(tr("Dealzy AI Score"))+'</b>'+
      '<div style="font-size:12px;margin-top:5px">'+h(scoreInfo.reasons.join(" · "))+'</div>'+
      '<div style="font-size:11px;color:#667085;margin-top:5px">'+h(tr("Personalized relevance score — not a provider rating or sponsored ranking."))+'</div>';

    $("#detailPrice").textContent=hasPrice?moneyFor(d.price,d.currency):(d.priceLabel||tr("Price on provider"));
    $("#detailOld").textContent=hasDiscount?moneyFor(d.old,d.currency):"";
    $("#detailSave").textContent=hasDiscount?tr("Save {pct}%",{pct}):tr("Live partner");

    const detailBits=[];
    if(d.text) detailBits.push(d.text);
    if(d.eventDate) detailBits.push((locale()==="fr"?"Date : ":"Date: ")+d.eventDate+(d.eventTime?" · "+d.eventTime:""));
    $("#detailText").textContent=detailBits.join("\n\n");

    const actions=ensureDetailActions();
    const favorite=state.favorites.has(numericId);
    const inTrip=state.trip.includes(numericId);
    const hasPhone=!!String(d.phone||"").trim();
    const onlineOffer=String(d.provider||'').toLowerCase()==='awin';
    actions.innerHTML=
      '<button id="dzDetailFav" style="border:1px solid #e7e9f0;background:#fff;border-radius:14px;padding:12px;font-weight:800">'+(favorite?"♥ ":"♡ ")+h(locale()==="fr"?(favorite?"Favori":"Ajouter aux favoris"):(favorite?"Saved":"Save"))+'</button>'+
      '<button id="dzDetailTrip" style="border:1px solid #e7e9f0;background:#fff;border-radius:14px;padding:12px;font-weight:800">'+(inTrip?"✓ ":"✈ ")+h(locale()==="fr"?(inTrip?"Dans le voyage":"Ajouter au voyage"):(inTrip?"In trip":"Add to trip"))+'</button>'+
      (onlineOffer?'':'<button id="dzDetailDirections" style="border:1px solid #e7e9f0;background:#fff;border-radius:14px;padding:12px;font-weight:800">🗺 '+h(locale()==="fr"?"Itinéraire":"Directions")+'</button>')+
      '<button id="dzDetailShare" style="border:1px solid #e7e9f0;background:#fff;border-radius:14px;padding:12px;font-weight:800">↗ '+h(locale()==="fr"?"Partager":"Share")+'</button>'+
      (hasPhone?'<button id="dzDetailCall" style="grid-column:1/-1;border:1px solid #dfe3eb;background:#f8f9fc;border-radius:14px;padding:12px;font-weight:800">📞 '+h(locale()==="fr"?"Appeler":"Call")+'</button>':"");

    actions.querySelector("#dzDetailFav").onclick=()=>{
      toggleFav(numericId);
      openDeal(numericId);
      renderFavs();
    };
    actions.querySelector("#dzDetailTrip").onclick=()=>{
      addDealToTrip(d);
      toast(locale()==="fr"?"Ajouté au voyage":"Added to trip");
      openDeal(numericId);
    };
    const directions=actions.querySelector("#dzDetailDirections");
    if(directions) directions.onclick=()=>window.open(dealDirectionsUrl(d),"_blank","noopener,noreferrer");
    actions.querySelector("#dzDetailShare").onclick=()=>shareDeal(d);
    const call=actions.querySelector("#dzDetailCall");
    if(call) call.onclick=()=>{location.href="tel:"+String(d.phone).replace(/[^+\d]/g,"");};

    const partnerButton=$("#partnerBtn");
    const href=partnerHref(d.partnerUrl);
    partnerButton.textContent=tr("Open on {source} ↗",{source:d.source||"Partner"});
    partnerButton.href=href||"#";
    partnerButton.target=href?"_blank":"";
    partnerButton.rel=href?"noopener noreferrer":"";
    partnerButton.onclick=e=>{
      if(href) trackPartnerClick(d);
      else{
        e.preventDefault();
        toast(tr("Partner link is temporarily unavailable."));
      }
    };

    $("#detailOverlay").classList.remove("hidden");
  };

  renderFavs=function(){
    loadSavedIntoCatalog();
    const snapshots=getSavedSnapshots();
    const list=[...state.favorites].map((id)=>catalog.get(Number(id))||snapshots[String(id)]).filter(Boolean);
    $("#favoritesGrid").innerHTML=list.length?list.map(dealCard).join(""):'<div class="empty" style="grid-column:1/-1">'+h(tr("No favorites yet. Tap ♡ on a live result to save it."))+'</div>';
    bindCards($("#favoritesGrid"));
  };

  renderTrips=function(){
    loadSavedIntoCatalog();
    const snapshots=getSavedSnapshots();
    const list=state.trip.map((id)=>catalog.get(Number(id))||snapshots[String(id)]).filter(Boolean);
    $("#tripItems").innerHTML=list.length?list.map((d)=>'<div class="tripCard"><b>'+h(d.title)+'</b><div class="meta">'+h(d.place||"")+" · "+(Number(d.price)>0?moneyFor(d.price,d.currency):(d.priceLabel||"Price on provider"))+" · "+h(d.source||"Live")+"</div></div>").join(""):'<div class="empty">Your trip is empty.</div>';
  };

  function travelDateOffset(days){
    const d=new Date();
    d.setDate(d.getDate()+Number(days||0));
    const y=d.getFullYear();
    const m=String(d.getMonth()+1).padStart(2,"0");
    const day=String(d.getDate()).padStart(2,"0");
    return y+"-"+m+"-"+day;
  }

  function marketIata(){
    const map={
      "Miami":"MIA","New York":"NYC","Los Angeles":"LAX","Chicago":"CHI","Las Vegas":"LAS",
      "Orlando":"MCO","San Francisco":"SFO","Boston":"BOS","Seattle":"SEA","Washington":"WAS",
      "Dallas":"DFW","Houston":"HOU","San Diego":"SAN","Philadelphia":"PHL","Atlanta":"ATL",
      "New Orleans":"MSY","Austin":"AUS","Denver":"DEN","Nashville":"BNA","Phoenix":"PHX",
      "Honolulu":"HNL","Fort Lauderdale":"FLL",
      "Toronto":"YTO","Montreal":"YMQ","Vancouver":"YVR","Calgary":"YYC","Ottawa":"YOW",
      "Edmonton":"YEA","Quebec City":"YQB","Winnipeg":"YWG","Halifax":"YHZ","Victoria":"YVR",
      "Niagara Falls":"IAG","Banff":"YYC","Kelowna":"YLW","Whistler":"YVR","Mississauga":"YYZ",
      "Hamilton":"YHM","Kitchener":"YKF","Saskatoon":"YXE","Regina":"YQR","St. John's":"YYT",
      "Charlottetown":"YYG","Sherbrooke":"YSC","Laval":"YUL","Gatineau":"YOW",
      "Trois-Rivieres":"YUL","London":"YXU"
    };
    return map[market.city]||"";
  }

  function saveExploreTravelSearch(kind,data,summary){
    try{
      const key="dealzyTravelSearches";
      const rows=JSON.parse(localStorage.getItem(key)||"[]");
      rows.push({kind,data,summary,market:{...market},createdAt:new Date().toISOString()});
      localStorage.setItem(key,JSON.stringify(rows.slice(-30)));
      if(window.DealzyCloud) window.DealzyCloud.queueSync();
    }catch(_){}
  }

  function openExploreTravelPartner(provider,url,title){
    const href=partnerHref(url);
    if(!href){toast(tr("Partner link is temporarily unavailable."));return;}
    trackPartnerClick({
      provider:String(provider||"travel").toLowerCase(),
      source:provider||"Travel",
      title:title||provider||"Travel search",
      externalId:null
    });
    if(location.hostname==="appassets.androidplatform.net"){
      location.href=href;
      return;
    }
    const link=document.createElement("a");
    link.href=href;
    link.target="_blank";
    link.rel="noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function renderExploreTravelForm(kind){
    const host=document.getElementById("dzExploreTravelForm");
    if(!host) return;
    const isFr=locale()==="fr";
    if(!travelRuntimeEnabled(kind)){
      host.innerHTML='<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:18px;padding:14px;color:#9a3412;font-weight:750">'+
        (isFr?"Ce fournisseur est temporairement désactivé par Dealzy Admin.":"This provider is temporarily disabled by Dealzy Admin.")+
        '</div>';
      return;
    }
    const selectedCity=marketCityLabel();
    const accent='style="margin-top:12px;width:100%;border:0;border-radius:14px;padding:13px 14px;background:linear-gradient(135deg,#6d5dfc,#3d8bfd);color:white;font-weight:850;font-size:15px"';
    const inputStyle='style="width:100%;margin-top:6px;border:1px solid #dfe3eb;border-radius:13px;padding:12px;background:#fff;font:inherit"';

    if(kind==="hotel"){
      host.innerHTML=
        '<div style="background:#fff;border:1px solid #e7e9f0;border-radius:20px;padding:15px;box-shadow:0 8px 24px rgba(17,24,39,.06)">'+
          '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><b style="font-size:17px">🏨 Booking.com</b><div class="meta">'+(isFr?"Recherche d’hôtel":"Hotel search")+'</div></div><button id="dzTravelClose" style="border:0;background:#f2f4f7;border-radius:50%;width:34px;height:34px;font-size:18px">×</button></div>'+
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px">'+
            '<label class="meta" style="grid-column:1/-1">'+(isFr?"Destination":"Destination")+'<input id="dzHotelDest" '+inputStyle+' value="'+h(selectedCity)+'"></label>'+
            '<label class="meta">'+(isFr?"Arrivée":"Check-in")+'<input id="dzHotelIn" type="date" '+inputStyle+' value="'+travelDateOffset(1)+'"></label>'+
            '<label class="meta">'+(isFr?"Départ":"Check-out")+'<input id="dzHotelOut" type="date" '+inputStyle+' value="'+travelDateOffset(3)+'"></label>'+
            '<label class="meta" style="grid-column:1/-1">'+(isFr?"Voyageurs":"Guests")+'<input id="dzHotelAdults" type="number" min="1" max="10" '+inputStyle+' value="2"></label>'+
          '</div>'+
          '<button id="dzHotelGo" '+accent+'>'+(isFr?"Voir les hôtels sur Booking.com ↗":"Search Booking.com hotels ↗")+'</button>'+
        '</div>';
      host.querySelector("#dzTravelClose").onclick=()=>host.innerHTML="";
      host.querySelector("#dzHotelGo").onclick=()=>{
        const dest=host.querySelector("#dzHotelDest").value.trim();
        const cin=host.querySelector("#dzHotelIn").value;
        const cout=host.querySelector("#dzHotelOut").value;
        const adults=Math.max(1,Math.min(10,Number(host.querySelector("#dzHotelAdults").value)||2));
        if(!dest||!cin||!cout||cout<=cin){
          toast(isFr?"Vérifie la destination et les dates.":"Check destination and dates.");
          return;
        }
        const p=new URLSearchParams({ss:dest,checkin:cin,checkout:cout,group_adults:String(adults),no_rooms:"1"});
        saveExploreTravelSearch("hotel",{dest,cin,cout,adults},dest+" · "+cin+" → "+cout);
        openExploreTravelPartner("Booking.com","https://www.booking.com/searchresults.html?"+p.toString(),"Hotel search · "+dest);
      };
      return;
    }

    if(kind==="flight"){
      host.innerHTML=
        '<div style="background:#fff;border:1px solid #e7e9f0;border-radius:20px;padding:15px;box-shadow:0 8px 24px rgba(17,24,39,.06)">'+
          '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><b style="font-size:17px">✈️ Skyscanner</b><div class="meta">'+(isFr?"Comparateur de vols":"Flight search")+'</div></div><button id="dzTravelClose" style="border:0;background:#f2f4f7;border-radius:50%;width:34px;height:34px;font-size:18px">×</button></div>'+
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px">'+
            '<label class="meta">'+(isFr?"Départ (IATA)":"From (IATA)")+'<input id="dzFlightFrom" maxlength="3" autocapitalize="characters" '+inputStyle+' placeholder="JFK"></label>'+
            '<label class="meta">'+(isFr?"Destination":"To")+'<input id="dzFlightTo" maxlength="3" autocapitalize="characters" '+inputStyle+' value="'+h(marketIata())+'" placeholder="MIA"></label>'+
            '<label class="meta">'+(isFr?"Aller":"Depart")+'<input id="dzFlightOut" type="date" '+inputStyle+' value="'+travelDateOffset(7)+'"></label>'+
            '<label class="meta">'+(isFr?"Retour":"Return")+'<input id="dzFlightBack" type="date" '+inputStyle+' value="'+travelDateOffset(14)+'"></label>'+
          '</div>'+
          '<button id="dzFlightGo" '+accent+'>'+(isFr?"Comparer les vols sur Skyscanner ↗":"Compare flights on Skyscanner ↗")+'</button>'+
        '</div>';
      host.querySelector("#dzTravelClose").onclick=()=>host.innerHTML="";
      host.querySelector("#dzFlightGo").onclick=()=>{
        const origin=host.querySelector("#dzFlightFrom").value.trim().toUpperCase();
        const destination=host.querySelector("#dzFlightTo").value.trim().toUpperCase();
        const out=host.querySelector("#dzFlightOut").value;
        const back=host.querySelector("#dzFlightBack").value;
        if(!/^[A-Z]{3}$/.test(origin)||!/^[A-Z]{3}$/.test(destination)||!out||(back&&back<=out)){
          toast(isFr?"Entre des codes aéroport à 3 lettres et des dates valides.":"Enter valid 3-letter airport codes and dates.");
          return;
        }
        const p=new URLSearchParams({
          mediaPartnerId:"2850210",
          utm_term:"skyscanner_chatgpt_app_data",
          origin,
          destination,
          outboundDate:out,
          cabinclass:"economy"
        });
        if(back) p.set("inboundDate",back);
        saveExploreTravelSearch("flight",{origin,destination,out,back},origin+" → "+destination+" · "+out+(back?" → "+back:""));
        openExploreTravelPartner("Skyscanner","https://skyscanner.net/g/referrals/v1/flights/day-view?"+p.toString(),"Flight search · "+origin+" → "+destination);
      };
      return;
    }

    host.innerHTML=
      '<div style="background:#fff;border:1px solid #e7e9f0;border-radius:20px;padding:15px;box-shadow:0 8px 24px rgba(17,24,39,.06)">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><b style="font-size:17px">🧳 Expedia · Dealzy AI</b><div class="meta">'+(isFr?"Boutique voyage Dealzy":"Dealzy travel shop")+'</div></div><button id="dzTravelClose" style="border:0;background:#f2f4f7;border-radius:50%;width:34px;height:34px;font-size:18px">×</button></div>'+
        '<p class="meta" style="line-height:1.5">'+(isFr?"Hôtels, séjours et inspiration voyage via la boutique Expedia de Dealzy AI.":"Hotels, stays and travel inspiration through Dealzy AI’s Expedia shop.")+'</p>'+
        '<button id="dzExpediaGo" '+accent+'>'+(isFr?"Ouvrir Expedia Dealzy ↗":"Open Expedia Dealzy ↗")+'</button>'+
      '</div>';
    host.querySelector("#dzTravelClose").onclick=()=>host.innerHTML="";
    host.querySelector("#dzExpediaGo").onclick=()=>{
      saveExploreTravelSearch("expedia",{city:market.city},"Expedia · "+marketCityLabel());
      openExploreTravelPartner("Expedia","https://expedia.com/shop/dealzy-ai","Dealzy AI Travel Shop");
    };
  }

  renderExplore=async function(force=false){
    await refreshDealzyProviderRuntime(false);
    const root=$("#exploreGrid");
    const count=$("#resultCount");
    const q=($("#exploreQuery")?.value||"").trim();
    const isFr=locale()==="fr";
    const prefs=readExplorePrefs();

    if(state.filter==="Halloween"&&!seasonalPartnerUrl()) state.filter="All";

    $("#filters").innerHTML=["All",...activeCategories()].map((x)=>'<button class="'+(state.filter===x?"active":"")+'" data-filter="'+h(x)+'">'+h(tr(x))+"</button>").join("");
    $("#filters").querySelectorAll("button").forEach((b)=>b.onclick=()=>{state.filter=b.dataset.filter;exploreCache={key:"",rows:[]};renderExplore(true);});

    if(state.filter==="Halloween"){
      if(count) count.textContent=isFr?"1 partenaire saisonnier · États-Unis":"1 seasonal partner · United States";
      if(root){
        root.innerHTML=seasonalDealCard(seasonalPartnerUrl());
        bindSeasonalCard(root);
      }
      return;
    }

    const requestKey=exploreRequestKey(q);
    let rawList=[];
    let broadened=false;
    let includesUnknownPrice=false;

    if(!force&&exploreCache.key===requestKey&&exploreCache.rows.length){
      rawList=[...exploreCache.rows];
    }else{
      if(root) root.innerHTML='<div class="empty" style="grid-column:1/-1">'+h(tr("Loading live results…"))+'</div>';
      if(count) count.textContent=tr("Live search");
      try{
        rawList=state.filter==="All"?await fetchMixed(q,12):await fetchCategoryBoosted(state.filter,q,30);
        if(rawList.length<8&&q){
          broadened=true;
          const broad=state.filter==="All"?await fetchMixed("",12):await fetchCategoryBoosted(state.filter,"",30);
          rawList=dedupe([...rawList,...broad]);
        }
      }catch(_){
        rawList=[];
      }

      if(state.maxPrice){
        const exact=rawList.filter((d)=>Number(d.price)>0&&Number(d.price)<=state.maxPrice);
        const unknown=rawList.filter((d)=>!(Number(d.price)>0));
        includesUnknownPrice=unknown.length>0;
        rawList=dedupe([...exact,...unknown]).slice(0,40);
      }else{
        rawList=dedupe(rawList).slice(0,40);
      }
      exploreCache={key:requestKey,rows:[...rawList]};
    }

    const sourceUniverse=applyExplorePrefs(rawList,{...prefs,source:"all"}).slice(0,40);
    const list=prefs.source==="all"
      ? [...sourceUniverse]
      : sourceUniverse.filter(d=>String(d.provider||d.source||"").toLowerCase()===String(prefs.source||"").toLowerCase());
    deals.splice(0,deals.length,...list);

    if(count){
      const resultText=tr(list.length===1?"{count} live result":"{count} live results",{count:list.length});
      let suffix=" · "+marketCityLabel();
      if(state.maxPrice) suffix+=" · "+tr("under {price}",{price:moneyFor(state.maxPrice,market.currency)});
      if(Number(prefs.radius)>0) suffix+=" · "+prefs.radius+" mi";
      if(broadened) suffix+=" · "+(isFr?"recherche élargie":"broadened search");
      if(includesUnknownPrice) suffix+=" · "+(isFr?"certains prix non disponibles":"some prices unavailable");
      count.textContent=resultText+suffix;
    }

    const controls=exploreControlsHtml(sourceUniverse,prefs,isFr);
    const travelButtons=[
      dealzyProviderRuntime.booking!==false
        ? '<button type="button" data-explore-travel="hotel" style="border:1px solid #e7e9f0;background:#fff;border-radius:17px;padding:12px 8px;text-align:center;box-shadow:0 6px 18px rgba(17,24,39,.05);font:inherit;color:inherit"><div style="font-size:24px">🏨</div><b style="display:block;font-size:13px;margin-top:5px">Booking.com</b><span class="meta" style="font-size:10px">'+(isFr?"Hôtels":"Hotels")+'</span></button>'
        : '',
      dealzyProviderRuntime.skyscanner!==false
        ? '<button type="button" data-explore-travel="flight" style="border:1px solid #e7e9f0;background:#fff;border-radius:17px;padding:12px 8px;text-align:center;box-shadow:0 6px 18px rgba(17,24,39,.05);font:inherit;color:inherit"><div style="font-size:24px">✈️</div><b style="display:block;font-size:13px;margin-top:5px">Skyscanner</b><span class="meta" style="font-size:10px">'+(isFr?"Vols":"Flights")+'</span></button>'
        : '',
      dealzyProviderRuntime.expedia!==false
        ? '<button type="button" data-explore-travel="expedia" style="border:1px solid #e7e9f0;background:#fff;border-radius:17px;padding:12px 8px;text-align:center;box-shadow:0 6px 18px rgba(17,24,39,.05);font:inherit;color:inherit"><div style="font-size:24px">🧳</div><b style="display:block;font-size:13px;margin-top:5px">Expedia</b><span class="meta" style="font-size:10px">'+(isFr?"Voyage":"Travel")+'</span></button>'
        : ''
    ].filter(Boolean).join("");
    const travelCards=travelButtons
      ? '<div style="grid-column:1/-1;margin:2px 0 10px">'+
          '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px"><div><div style="font-size:17px;font-weight:850">'+(isFr?"Voyage":"Travel")+'</div><div class="meta">'+(isFr?"Réservez sans quitter Explorer":"Search travel without leaving Explore")+'</div></div></div>'+
          '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px">'+travelButtons+'</div>'+
          '<div id="dzExploreTravelForm" style="margin-top:10px"></div>'+
        '</div>'
      : '';

    if(root){
      const liveHtml=list.length
        ? list.map(dealCard).join("")
        : '<div class="empty" style="grid-column:1/-1">'+h(isFr?"Aucune offre ne correspond à ces filtres. Élargis le rayon ou choisis Toutes les sources.":"No offers match these filters. Increase the radius or choose All sources.")+'</div>';
      root.innerHTML=controls+travelCards+liveHtml;

      const sortBtn=root.querySelector("#dzExploreSortBtn");
      const radiusBtn=root.querySelector("#dzExploreRadiusBtn");
      if(sortBtn) sortBtn.onclick=()=>openExploreChoicePicker("sort");
      if(radiusBtn) radiusBtn.onclick=()=>openExploreChoicePicker("radius");
      root.querySelectorAll("#dzExploreSources [data-source]").forEach(btn=>{
        btn.onclick=()=>{
          const next=readExplorePrefs(); next.source=btn.dataset.source||"all"; saveExplorePrefs(next); renderExplore(false);
        };
      });
      const refresh=root.querySelector("#dzExploreRefresh");
      if(refresh) refresh.onclick=()=>{exploreCache={key:"",rows:[]};renderExplore(true);};

      root.querySelectorAll("[data-explore-travel]").forEach(btn=>{
        btn.onclick=()=>renderExploreTravelForm(btn.dataset.exploreTravel);
      });
      bindCards(root);
    }
    renderFavs();
    renderTrips();
  };

  renderAll=function(){
    const seasonalUrl=seasonalPartnerUrl();
    const visibleCats=orderedCategories();
    $("#cats").innerHTML=visibleCats.map((c)=>'<button class="cat" data-cat="'+h(c[1])+'"><span class="i">'+c[0]+"</span><b>"+h(tr(c[1]))+"</b></button>").join("");
    $("#cats").querySelectorAll("[data-cat]").forEach((b)=>b.onclick=()=>{state.filter=b.dataset.cat;show("explore");renderExplore();});
    const personalized=personalizedHome(homeDeals);
    const liveResults=personalized.length
      ? personalized.slice(0,12).map(dealCard).join("")
      : homeLoading
        ? '<div class="empty" style="grid-column:1/-1">'+h(tr("Loading live deals…"))+'</div>'
        : '<div class="empty" style="grid-column:1/-1">'+h(tr("No live offers available in {city} right now.",{city:marketCityLabel()}))+
          '<br><button type="button" class="pill" id="retryHomeDeals" style="margin-top:14px">'+h(tr("Try again"))+'</button></div>';
    $("#popularGrid").innerHTML=(seasonalUrl?seasonalDealCard(seasonalUrl):"")+liveResults;
    bindCards($("#popularGrid"));
    bindSeasonalCard($("#popularGrid"));
    const retry=$("#retryHomeDeals");
    if(retry) retry.onclick=()=>hydrateHome();
    if(!$("#exploreView").classList.contains("hidden")) renderExplore();
    renderFavs();
    renderTrips();
  };

  function ensureOnboardingStyles(){
    if(document.getElementById("dealzyOnboardingStyles")) return;
    const style=document.createElement("style");
    style.id="dealzyOnboardingStyles";
    style.textContent=[
      ".dz-ob-wrap{position:fixed;inset:0;z-index:160;background:rgba(17,24,39,.55);display:flex;align-items:flex-end;justify-content:center;padding:16px}",
      ".dz-ob-card{width:min(720px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:28px;padding:22px;box-shadow:0 24px 70px rgba(0,0,0,.28)}",
      ".dz-ob-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}",
      ".dz-ob-head h2{margin:0;font-size:28px}.dz-ob-head p{margin:6px 0 0;color:#667085;line-height:1.5}",
      ".dz-ob-close{border:0;background:#f2f4f7;width:40px;height:40px;border-radius:50%;font-size:20px;cursor:pointer}",
      ".dz-ob-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:18px}",
      ".dz-ob-grid label{font-size:13px;color:#667085;font-weight:700}",
      ".dz-ob-grid select,.dz-ob-grid input{display:block;width:100%;margin-top:6px;border:1px solid #dfe3eb;border-radius:13px;padding:12px;background:#fff}",
      ".dz-ob-interests{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:10px}",
      ".dz-ob-interest{border:1px solid #dfe3eb;background:#fff;border-radius:16px;padding:13px;text-align:left;cursor:pointer;font-weight:750}",
      ".dz-ob-interest.active{border-color:#6d5dfc;background:#f1efff;color:#5145cd}",
      ".dz-ob-actions{display:flex;gap:10px;margin-top:18px}.dz-ob-actions button{flex:1;border:0;border-radius:14px;padding:14px;font-weight:850;cursor:pointer}",
      ".dz-ob-primary{background:linear-gradient(135deg,#6d5dfc,#3d8bfd);color:#fff}.dz-ob-secondary{background:#f2f4f7;color:#344054}",
      ".dz-profile-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:12px 0}",
      ".dz-profile-stat{background:#f8f9fc;border:1px solid #e7e9f0;border-radius:16px;padding:12px;text-align:center}",
      ".dz-profile-stat b{display:block;font-size:22px}.dz-profile-stat span{font-size:11px;color:#667085}",
      ".dz-interest-chip{display:inline-block;padding:7px 10px;border-radius:999px;background:#f2f4f7;margin:3px;font-size:12px}",
      "@media(max-width:560px){.dz-ob-grid{grid-template-columns:1fr}.dz-ob-interests{grid-template-columns:1fr}.dz-profile-stats{grid-template-columns:repeat(3,1fr)}.dz-ob-card{padding:18px;border-radius:24px}}"
    ].join("");
    document.head.appendChild(style);
  }

  function onboardingStats(){
    let clicks=[];
    try{clicks=JSON.parse(localStorage.getItem("dealzyPartnerClicks")||"[]")}catch(_){}
    return {
      favorites:state.favorites?state.favorites.size:0,
      trips:Array.isArray(state.trip)?state.trip.length:0,
      clicks:Array.isArray(clicks)?clicks.length:0
    };
  }

  function renderProfileInsights(){
    const profile=document.getElementById("profileView");
    if(!profile) return;
    let card=document.getElementById("dealzyProfileInsights");
    if(!card){
      card=document.createElement("div");
      card.className="profileCard";
      card.id="dealzyProfileInsights";
      const trust=[...profile.querySelectorAll(".profileCard")].find(x=>/Trust & legal|Confiance et mentions légales/.test(x.querySelector("h3")?.textContent||""));
      if(trust) profile.insertBefore(card,trust);
      else profile.appendChild(card);
    }
    const ob=readOnboarding();
    const stats=onboardingStats();
    const interests=(ob.interests||[]).map(id=>ONBOARDING_INTERESTS.find(x=>x.id===id)).filter(Boolean);
    card.innerHTML=
      '<h3 style="margin-top:0">'+h(tr("Your Dealzy profile"))+'</h3>'+
      '<div class="meta">'+h(tr("Personalize Dealzy around your market, interests and preferred budget."))+'</div>'+
      '<div class="dz-profile-stats">'+
        '<div class="dz-profile-stat"><b>'+stats.favorites+'</b><span>'+h(tr("Favorites"))+'</span></div>'+
        '<div class="dz-profile-stat"><b>'+stats.trips+'</b><span>'+h(tr("Trips"))+'</span></div>'+
        '<div class="dz-profile-stat"><b>'+stats.clicks+'</b><span>'+h(tr("Partner clicks"))+'</span></div>'+
      '</div>'+
      '<div class="meta"><b>'+h(tr("Preferred budget"))+':</b> '+h(moneyFor(ob.budget||100,market.currency))+'</div>'+
      '<div class="meta" style="margin-top:6px">'+h(tr("Dealzy AI reorders your Home using these preferences plus live rating, review, price and distance signals."))+'</div>'+
      '<div style="margin:8px 0">'+(interests.length?interests.map(x=>'<span class="dz-interest-chip">'+x.icon+' '+h(tr(x.label))+'</span>').join(""):'<span class="meta">'+h(tr("No interests selected yet."))+'</span>')+'</div>'+
      '<button class="pill" id="dealzyEditProfile" style="margin-top:8px">'+h(tr("Edit preferences"))+'</button>';
    const edit=card.querySelector("#dealzyEditProfile");
    if(edit) edit.onclick=()=>showOnboarding(false);
    if(window.DealzyI18n) window.DealzyI18n.apply(card);
  }

  function showOnboarding(firstRun){
    ensureOnboardingStyles();
    const existing=document.getElementById("dealzyOnboarding");
    if(existing) existing.remove();

    const current=readOnboarding();
    const selectedCountry=current.country==="CA"?"CA":market.country;
    const selectedCity=(MARKET_CITIES[selectedCountry]||[]).some(x=>x.value===current.city)?current.city:market.city;
    const selectedLocale=current.locale==="fr"?"fr":locale();
    const selectedInterests=new Set(Array.isArray(current.interests)?current.interests:[]);
    const budget=Number(current.budget)||100;

    const wrap=document.createElement("div");
    wrap.id="dealzyOnboarding";
    wrap.className="dz-ob-wrap";
    wrap.innerHTML=
      '<section class="dz-ob-card" role="dialog" aria-modal="true" aria-label="'+h(tr("Personalize Dealzy"))+'">'+
        '<div class="dz-ob-head"><div><h2>'+h(firstRun?tr("Welcome to Dealzy"):tr("Your preferences"))+'</h2>'+
        '<p>'+h(tr("Choose your market and what you like. You can change everything later."))+'</p></div>'+
        '<button class="dz-ob-close" aria-label="'+h(tr("Close"))+'">×</button></div>'+
        '<div class="dz-ob-grid">'+
          '<label>'+h(tr("Country"))+'<select id="dzObCountry">'+
            '<option value="US" '+(selectedCountry==="US"?"selected":"")+'>🇺🇸 '+h(tr("United States"))+'</option>'+
            '<option value="CA" '+(selectedCountry==="CA"?"selected":"")+'>🇨🇦 '+h(tr("Canada"))+'</option>'+
          '</select></label>'+
          '<label>'+h(tr("City"))+'<select id="dzObCity"></select></label>'+
          '<label>'+h(tr("Language"))+'<select id="dzObLocale">'+
            '<option value="en" '+(selectedLocale==="en"?"selected":"")+'>English</option>'+
            '<option value="fr" '+(selectedLocale==="fr"?"selected":"")+'>Français</option>'+
          '</select></label>'+
          '<label>'+h(tr("Preferred budget"))+'<input id="dzObBudget" type="number" min="10" max="5000" step="10" value="'+budget+'"></label>'+
        '</div>'+
        '<h3 style="margin:18px 0 6px">'+h(tr("What are you interested in?"))+'</h3>'+
        '<div class="dz-ob-interests" id="dzObInterests">'+ONBOARDING_INTERESTS.map(x=>
          '<button type="button" class="dz-ob-interest '+(selectedInterests.has(x.id)?"active":"")+'" data-interest="'+x.id+'">'+x.icon+' '+h(tr(x.label))+'</button>'
        ).join("")+'</div>'+
        '<div class="dz-ob-actions">'+
          (!firstRun?'<button class="dz-ob-secondary" id="dzObCancel">'+h(tr("Cancel"))+'</button>':'')+
          '<button class="dz-ob-primary" id="dzObSave">'+h(firstRun?tr("Start exploring"):tr("Save preferences"))+'</button>'+
        '</div>'+
      '</section>';
    document.body.appendChild(wrap);

    const country=wrap.querySelector("#dzObCountry");
    const city=wrap.querySelector("#dzObCity");
    const lang=wrap.querySelector("#dzObLocale");
    const budgetInput=wrap.querySelector("#dzObBudget");

    const fillCities=(countryValue,preferred)=>{
      const rows=MARKET_CITIES[countryValue]||MARKET_CITIES.US;
      city.innerHTML=rows.map(x=>'<option value="'+h(x.value)+'" '+(x.value===preferred?"selected":"")+'>'+h(x.label)+'</option>').join("");
    };
    fillCities(selectedCountry,selectedCity);

    country.onchange=()=>fillCities(country.value,MARKET_CITIES[country.value][0].value);
    wrap.querySelectorAll("[data-interest]").forEach(btn=>btn.onclick=()=>btn.classList.toggle("active"));

    const close=()=>wrap.remove();
    wrap.querySelector(".dz-ob-close").onclick=close;
    wrap.addEventListener("click",e=>{if(e.target===wrap) close();});
    const onKey=e=>{if(e.key==="Escape"){document.removeEventListener("keydown",onKey);close();}};
    document.addEventListener("keydown",onKey);
    const cancel=wrap.querySelector("#dzObCancel");
    if(cancel) cancel.onclick=close;

    wrap.querySelector("#dzObSave").onclick=()=>{
      const nextCountry=country.value==="CA"?"CA":"US";
      const nextCity=city.value||MARKET_CITIES[nextCountry][0].value;
      const nextLocale=lang.value==="fr"?"fr":"en";
      const interests=[...wrap.querySelectorAll("[data-interest].active")].map(x=>x.dataset.interest);
      const nextBudget=Math.max(10,Math.min(5000,Number(budgetInput.value)||100));

      persistMarket(nextCountry,nextCity);
      const saved=saveOnboarding({
        ...current,
        completed:true,
        country:nextCountry,
        city:nextCity,
        locale:nextLocale,
        interests,
        budget:nextBudget
      });

      try{
        const prefs=JSON.parse(localStorage.getItem("dealzyToolPrefs")||"{}");
        prefs.budget=nextBudget;
        localStorage.setItem("dealzyToolPrefs",JSON.stringify(prefs));
      }catch(_){}

      if(window.DealzyI18n) window.DealzyI18n.setLocale(nextLocale);
      else localStorage.setItem("dealzyLocale",nextLocale);

      close();
      renderProfileInsights();
      updateMarketUI();
      hydrateHome();
      toast(tr("Preferences saved"));
      return saved;
    };

    if(window.DealzyI18n) window.DealzyI18n.apply(wrap);
  }

  function maybeShowFirstRunOnboarding(){
    const current=readOnboarding();
    if(current.completed) return;
    // Keep first launch non-blocking. Preferences remain available from Profile.
    setTimeout(()=>{
      if(!document.getElementById("dealzyOnboarding")&&!document.getElementById("dealzyLocationPrompt")) toast(tr("Personalize Dealzy"));
    },700);
  }

  function ensureMarketPickerStyles(){
    if(document.getElementById("dealzyMarketPickerStyles")) return;
    const style=document.createElement("style");
    style.id="dealzyMarketPickerStyles";
    style.textContent=[
      ".dz-market-grid{display:grid;gap:12px;margin-top:12px}",
      ".dz-market-label{font-size:13px;color:#667085;font-weight:700;display:block}",
      ".dz-market-field{width:100%;margin-top:7px;border:1px solid #e2e5ec;background:#fff;border-radius:16px;padding:14px 15px;display:flex;align-items:center;justify-content:space-between;gap:12px;text-align:left;font:inherit;color:#182230;box-shadow:0 3px 10px rgba(17,24,39,.03);transition:border-color .18s ease,box-shadow .18s ease,transform .12s ease}",
      ".dz-market-field:active{transform:scale(.992)}",
      ".dz-market-field .dz-value{display:flex;align-items:center;gap:9px;font-weight:650}",
      ".dz-market-field .dz-chevron{font-size:18px;color:#7b8497}",
      ".dz-picker-wrap{position:fixed;inset:0;z-index:190;background:rgba(17,24,39,.48);backdrop-filter:blur(6px);display:flex;align-items:flex-end;justify-content:center;padding:14px}",
      ".dz-picker-card{width:min(680px,100%);max-height:72vh;overflow:auto;background:#fff;border-radius:28px;padding:12px;box-shadow:0 24px 70px rgba(0,0,0,.30);animation:dzPickerUp .22s ease-out}",
      "@keyframes dzPickerUp{from{transform:translateY(26px);opacity:.7}to{transform:translateY(0);opacity:1}}",
      ".dz-picker-head{display:flex;align-items:center;justify-content:space-between;padding:8px 8px 12px 12px}",
      ".dz-picker-head b{font-size:20px}.dz-picker-close{width:38px;height:38px;border:0;border-radius:50%;background:#f2f4f7;font-size:20px}",
      ".dz-picker-option{width:100%;border:0;background:#fff;border-radius:18px;padding:14px 14px;display:flex;align-items:center;justify-content:space-between;gap:12px;text-align:left;font:inherit;color:#182230;margin:3px 0}",
      ".dz-picker-option .dz-opt-main{display:flex;align-items:center;gap:11px;font-size:16px;font-weight:650}",
      ".dz-picker-option .dz-check{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:#f2f4f7;color:transparent;font-weight:900}",
      ".dz-picker-option.selected{background:#f3f0ff;color:#5b4be7}",
      ".dz-picker-option.selected .dz-check{background:#6d5dfc;color:white}",
      ".dz-picker-option:active{transform:scale(.992)}",
      ".dz-picker-search{padding:0 8px 8px}.dz-picker-search input{width:100%;border:1px solid #dfe3eb;border-radius:16px;padding:13px 14px;font:inherit;background:#f8f9fc;outline:none}",
      ".dz-picker-search input:focus{border-color:#8b7cff;box-shadow:0 0 0 3px rgba(109,93,252,.10);background:#fff}",
      ".dz-picker-custom{margin:8px;border:1px dashed #c9c3ff;background:#f8f7ff;border-radius:16px;padding:12px 14px;color:#5145cd;font-weight:800;text-align:left;width:calc(100% - 16px)}",
      ".dz-picker-empty{padding:18px 14px;color:#667085;text-align:center}"
    ].join("");
    document.head.appendChild(style);
  }

  function closeMarketPicker(){
    const picker=document.getElementById("dealzyMarketPicker");
    if(picker) picker.remove();
  }

  function openMarketPicker(kind){
    ensureMarketPickerStyles();
    closeMarketPicker();

    let title="",options=[],selected="";
    if(kind==="country"){
      title=tr("Country");
      selected=market.country;
      options=[
        {value:"US",label:tr("United States"),icon:"🇺🇸"},
        {value:"CA",label:tr("Canada"),icon:"🇨🇦"}
      ];
    }else if(kind==="city"){
      title=tr("City");
      selected=market.city;
      options=(MARKET_CITIES[market.country]||[]).map(x=>({value:x.value,label:x.label,icon:market.country==="CA"?"🇨🇦":"🇺🇸"}));
    }else{
      title=tr("Language");
      selected=locale();
      options=[
        {value:"en",label:"English",icon:"🇺🇸"},
        {value:"fr",label:"Français",icon:"🇫🇷"}
      ];
    }

    const wrap=document.createElement("div");
    wrap.id="dealzyMarketPicker";
    wrap.className="dz-picker-wrap";
    const searchable=kind==="city";
    wrap.innerHTML=
      '<section class="dz-picker-card" role="dialog" aria-modal="true" aria-label="'+h(title)+'">'+
        '<div class="dz-picker-head"><b>'+h(title)+'</b><button class="dz-picker-close" aria-label="'+h(tr("Close"))+'">×</button></div>'+
        (searchable?'<div class="dz-picker-search"><input id="dzCitySearch" autocomplete="off" placeholder="'+h(locale()==="fr"?"Rechercher ou saisir une ville…":"Search or type a city…")+'"></div>':"")+
        '<div id="dzPickerOptions"></div>'+
      '</section>';

    document.body.appendChild(wrap);
    wrap.querySelector(".dz-picker-close").onclick=closeMarketPicker;
    wrap.onclick=e=>{if(e.target===wrap) closeMarketPicker();};

    const optionsHost=wrap.querySelector("#dzPickerOptions");
    const chooseValue=(value)=>{
      closeMarketPicker();
      if(kind==="country"){
        const nextCountry=value==="CA"?"CA":"US";
        persistMarket(nextCountry,MARKET_CITIES[nextCountry][0].value);
        updateMarketUI();
        hydrateHome();
        return;
      }
      if(kind==="city"){
        persistMarket(market.country,value);
        updateMarketUI();
        hydrateHome();
        return;
      }
      if(window.DealzyI18n) window.DealzyI18n.setLocale(value);
      else localStorage.setItem("dealzyLocale",value);
      updateMarketUI();
      renderAll();
    };

    const renderOptions=(query="")=>{
      const needle=String(query||"").trim().toLowerCase();
      const filtered=needle
        ? options.filter(opt=>(opt.label+" "+opt.value).toLowerCase().includes(needle))
        : options;

      optionsHost.innerHTML=filtered.map(opt=>'<button class="dz-picker-option '+(opt.value===selected?"selected":"")+'" data-value="'+h(opt.value)+'">'+
          '<span class="dz-opt-main"><span>'+opt.icon+'</span><span>'+h(opt.label)+'</span></span>'+
          '<span class="dz-check">✓</span></button>').join("");

      if(searchable&&needle){
        const raw=String(query||"").trim().replace(/\s+/g," ").slice(0,80);
        const exact=options.some(opt=>opt.value.toLowerCase()===raw.toLowerCase()||opt.label.toLowerCase()===raw.toLowerCase());
        if(raw.length>=2&&!exact){
          optionsHost.insertAdjacentHTML("beforeend",
            '<button class="dz-picker-custom" data-custom-city="'+h(raw)+'">＋ '+h(locale()==="fr"?'Utiliser « '+raw+' »':'Use “'+raw+'”')+'</button>');
        }else if(!filtered.length){
          optionsHost.innerHTML='<div class="dz-picker-empty">'+h(locale()==="fr"?"Aucune ville trouvée.":"No city found.")+'</div>';
        }
      }

      optionsHost.querySelectorAll(".dz-picker-option").forEach(btn=>{
        btn.onclick=()=>chooseValue(btn.dataset.value);
      });
      const custom=optionsHost.querySelector("[data-custom-city]");
      if(custom) custom.onclick=()=>chooseValue(custom.dataset.customCity);
    };

    renderOptions();

    if(searchable){
      const input=wrap.querySelector("#dzCitySearch");
      input.oninput=()=>renderOptions(input.value);
      setTimeout(()=>{try{input.focus();}catch(_){}},80);
    }
  }

  function updateMarketUI(){
    const flag=market.country==="CA"?"🇨🇦":"🇺🇸";
    const countryName=market.country==="CA"?"Canada":"United States";
    const locationBtn=document.getElementById("locationBtn");
    if(locationBtn){
      locationBtn.textContent=flag+" "+marketCityLabel();
      const gpsMode=localStorage.getItem("dealzyLocationMode")==="gps";
      locationBtn.onclick=()=>gpsMode&&window.DealzyLocation
        ? window.DealzyLocation.useRealLocation({silent:false,refresh:true})
        : show("profile");
      locationBtn.title=gpsMode
        ? (locale()==="fr"?"Actualiser ma position":"Refresh my location")
        : tr("Change market");
    }

    const popularHeading=document.getElementById("popularHeading");
    if(popularHeading){
      const customPrefix=String(runtimeContent.popular_prefix||'').trim();
      if(customPrefix) popularHeading.textContent=customPrefix+" "+market.city;
      else{
        const profile=readOnboarding();
        popularHeading.textContent=profile.completed?tr("For you in {city}",{city:market.city}):tr("Popular in {city}",{city:market.city});
      }
    }

    const geoTitle=document.getElementById("geoTitle");
    const geoSub=document.getElementById("geoSub");
    const geoButton=document.getElementById("useLocationBtn");
    const locationMode=localStorage.getItem("dealzyLocationMode")||"manual";
    if(locationMode==="manual"){
      if(geoTitle) geoTitle.textContent=locale()==="fr"?"Marché sélectionné":"Selected market";
      if(geoSub) geoSub.textContent=flag+" "+marketCityLabel();
      if(geoButton) geoButton.textContent=locale()==="fr"?"Utiliser ma position réelle":"Use my real location";
    }

    const heroBadge=document.querySelector("#homeView .hero .pill");
    if(heroBadge){
      const customBadge=String(runtimeContent.hero_badge||'').trim();
      heroBadge.textContent=customBadge||("🇺🇸 "+tr("United States")+" · 🇨🇦 "+tr("Canada")+" — LIVE");
    }

    const query=document.getElementById("aiQuery");
    if(query && !query.dataset.userEdited && document.activeElement!==query){
      const preferred=Math.max(10,Number(readOnboarding().budget)||100);
      query.value=locale()==="fr"
        ? "Dîner à "+market.city+" ce soir moins de "+moneyFor(preferred,market.currency)
        : "Date night in "+market.city+" tonight under "+moneyFor(preferred,market.currency);
      query.dataset.exampleValue=query.value;
    }

    const tripCard=document.querySelector("#tripsView .tripCard");
    if(tripCard){
      const title=tripCard.querySelector("b");
      if(title) title.textContent=tr("{city} Weekend",{city:market.city});
      const meta=tripCard.querySelector(".meta");
      if(meta) meta.textContent=tr("Create a trip by saving live deals in {city}, then group them into a simple itinerary.",{city:market.city});
    }

    document.querySelectorAll(".profileCard").forEach((card)=>{
      const heading=card.querySelector("h3");
      if(!heading||!/^(Market|Marché)$/.test(heading.textContent.trim())) return;
      const cities=MARKET_CITIES[market.country];
      const currentLocale=locale();
      ensureMarketPickerStyles();
      const currentCity=(cities.find(x=>x.value===market.city)||{}).label||market.city;
      card.innerHTML='<h3 style="margin-top:0">'+h(tr("Market"))+'</h3>'+
        '<div class="dz-market-grid">'+
          '<label class="dz-market-label">'+h(tr("Country"))+
            '<button type="button" class="dz-market-field" data-picker="country"><span class="dz-value">'+flag+' '+h(tr(countryName))+'</span><span class="dz-chevron">⌄</span></button>'+
          '</label>'+
          '<label class="dz-market-label">'+h(tr("City"))+
            '<button type="button" class="dz-market-field" data-picker="city"><span class="dz-value">'+flag+' '+h(currentCity)+'</span><span class="dz-chevron">⌄</span></button>'+
          '</label>'+
          '<label class="dz-market-label">'+h(tr("Language"))+
            '<button type="button" class="dz-market-field" data-picker="language"><span class="dz-value">'+(currentLocale==="fr"?"🇫🇷 Français":"🇺🇸 English")+'</span><span class="dz-chevron">⌄</span></button>'+
          '</label>'+
        '</div>'+
        '<button type="button" id="dzUseRealLocation" style="margin-top:12px;width:100%;border:0;border-radius:15px;padding:13px 14px;background:#eef2ff;color:#5145cd;font-weight:850;font:inherit">📍 '+h(locale()==="fr"?"Utiliser ma position réelle":"Use my real location")+'</button>'+
        '<div class="meta" style="margin-top:12px"><b>'+flag+" "+h(tr(countryName))+'</b> · '+h(market.currency)+' · '+h(tr("Live provider search"))+'</div>';

      card.querySelectorAll("[data-picker]").forEach(btn=>{
        btn.onclick=()=>openMarketPicker(btn.dataset.picker);
      });
      const realLocationBtn=card.querySelector("#dzUseRealLocation");
      if(realLocationBtn){
        realLocationBtn.onclick=()=>window.DealzyLocation&&window.DealzyLocation.useRealLocation({silent:false,refresh:true});
      }
    });

    const quickButtons=[...document.querySelectorAll("#homeView .quick button")];
    if(quickButtons[0]) quickButtons[0].textContent=tr("📍 Near me");
    if(quickButtons[1]) quickButtons[1].textContent=tr("🗓 This weekend");
    if(quickButtons[2]) quickButtons[2].textContent=locale()==="fr"
      ? "🏷 Moins de "+(market.currency==="CAD"?"50 CA$":"50 $")
      : "🏷 Under "+(market.currency==="CAD"?"CA$50":"$50");

    renderProfileInsights();
    if(window.DealzyI18n) window.DealzyI18n.apply(document);
  }

  function parseSmartQuery(q){
    const original=String(q||"").trim();
    const lower=original.toLowerCase();
    let foundCountry=null,foundCity=null;

    Object.entries(MARKET_CITIES).forEach(([country,cities])=>{
      cities.forEach(({value,label})=>{
        const variants=[value,label,value==="Montreal"?"Montréal":""].filter(Boolean);
        if(variants.some((v)=>lower.includes(v.toLowerCase()))){
          foundCountry=country;
          foundCity=value;
        }
      });
    });

    if(foundCountry&&foundCity&&(market.country!==foundCountry||market.city!==foundCity)){
      persistMarket(foundCountry,foundCity);
      updateMarketUI();
    }

    state.filter=
      /spa|massage|beauty|beauté|bien[- ]?être/.test(lower)?"Spa & Beauty":
      /restaurant|dinner|dîner|diner|food|brunch|café|cafe|manger|repas/.test(lower)?"Food & Drink":
      /hotel|hôtel|travel|trip|voyage|stay/.test(lower)?"Travel":
      /concert|event|événement|activity|activité|tour|things to do|museum|musée|cruise|boat/.test(lower)?"Things to Do":"All";

    const budget=lower.match(/(?:under|below|max|less than|moins de|sous)\s*(?:ca\$|cad|\$)?\s*(\d{1,5})/i);
    state.maxPrice=budget?Number(budget[1]):null;

    let cleaned=original
      .replace(/date night|tonight|this weekend|near me|ce soir|ce week[- ]?end|près de moi/gi," ")
      .replace(/(?:under|below|max|less than|moins de|sous)\s*(?:ca\$|cad|\$)?\s*\d{1,5}/gi," ");

    const removeInsensitive=(text,needle)=>{
      if(!needle) return text;
      let source=String(text), lower=source.toLowerCase(), target=String(needle).toLowerCase(), out="", start=0, index;
      while((index=lower.indexOf(target,start))!==-1){
        out+=source.slice(start,index)+" ";
        start=index+target.length;
      }
      return out+source.slice(start);
    };
    Object.values(MARKET_CITIES).flat().forEach(({value,label})=>{
      [value,label,value==="Montreal"?"Montréal":""].filter(Boolean).forEach((name)=>{
        cleaned=removeInsensitive(cleaned,name);
      });
    });

    cleaned=cleaned
      .replace(/(^|\s)(in|dans|a|à)(?=\s|$)/gi," ")
      .replace(/\s+/g," ")
      .trim();
    return {query:cleaned};
  }

  aiSearch=function(q){
    const parsed=parseSmartQuery(q);
    $("#exploreQuery").value=parsed.query;
    show("explore");
    renderExplore();
    toast("Dealzy AI · "+marketCityLabel()+(state.maxPrice?" · budget "+moneyFor(state.maxPrice,market.currency):""));
  };

  async function hydrateHome(){
    const requestId=++homeLoadSequence;
    homeLoading=true;
    await loadRuntimeContent();
    if(requestId!==homeLoadSequence) return;
    updateMarketUI();
    applyRuntimeContent();
    loadSavedIntoCatalog();
    deals.splice(0,deals.length);
    const popular=$("#popularGrid");
    if(popular) popular.innerHTML='<div class="empty" style="grid-column:1/-1">'+h(tr("Loading live deals…"))+'</div>';

    const familyIndex=cats.findIndex((x)=>x[1]==="Family");
    if(familyIndex>=0) cats.splice(familyIndex,1);

    const previousMaxPrice=state.maxPrice;
    state.maxPrice=null;
    let freshDeals=[];
    try{
      freshDeals=await fetchMixed("",8);
    }catch(error){
      console.warn("[Dealzy] Home offers unavailable",error);
    }finally{
      state.maxPrice=previousMaxPrice;
    }
    if(requestId!==homeLoadSequence) return;
    homeDeals=freshDeals;
    homeLoading=false;
    deals.splice(0,deals.length,...homeDeals);
    renderAll();

    document.querySelectorAll(".sectionHead span").forEach((span)=>{
      if(/Demo inventory|Sources en direct/i.test(span.textContent||"")) span.textContent=tr("Live providers");
    });
    const legal=document.querySelector("#homeView .legal");
    if(legal){
      legal.textContent=String(runtimeContent.legal_notice||'').trim()||
        tr("Live inventory is supplied by connected providers including Viator, Ticketmaster and Yelp. Travel clickouts include Expedia, Booking.com and Skyscanner. We may earn a commission on eligible partner purchases.");
    }

    document.querySelectorAll(".profileCard").forEach((card)=>{
      const heading=card.querySelector("h3");
      if(heading&&/^(Partner status|Statut des partenaires)$/.test(heading.textContent.trim())){
        const paragraph=card.querySelector("p");
        if(paragraph) paragraph.textContent=tr("Live in USA and Canada: Viator, Ticketmaster and Yelp. Expedia, Booking.com and Skyscanner are connected as travel clickouts.");
      }
    });

    // Explore is loaded only when the user opens that tab.
  }

  const exploreButton=document.getElementById("exploreSearch");
  if(exploreButton) exploreButton.onclick=()=>renderExplore();

  const exploreNav=document.querySelector('.navBtn[data-view="explore"]');
  if(exploreNav){
    exploreNav.onclick=()=>{
      show("explore");
      setTimeout(()=>renderExplore(),0);
    };
  }

  const useLoc=document.getElementById("useLocationBtn");
  if(useLoc){
    useLoc.onclick=()=>{
      if(typeof useLocation!=="function") return;
      const before=state.coords?String(state.coords.lat)+","+String(state.coords.lng):"";
      useLocation();
      let tries=0;
      const poll=setInterval(()=>{
        tries++;
        const after=state.coords?String(state.coords.lat)+","+String(state.coords.lng):"";
        if(after&&after!==before){
          clearInterval(poll);
          if(!coordsAllowedForMarket(state.coords,market.country)){
            const geoTitle=document.getElementById("geoTitle");
            const geoSub=document.getElementById("geoSub");
            if(geoTitle) geoTitle.textContent=tr("Location outside selected market");
            if(geoSub) geoSub.textContent=tr("Keeping {city} for live searches.",{city:marketCityLabel()});
            toast(tr("Location outside selected market. Keeping {city}.",{city:marketCityLabel()}));
          }
          hydrateHome();
        }else if(tries>=20){
          clearInterval(poll);
        }
      },500);
    };
  }

  document.addEventListener("dealzy:localechange",()=>{
    updateMarketUI();
    renderAll();
    if(window.DealzyI18n) window.DealzyI18n.apply(document);
  });

  const tripAdd=document.getElementById("tripAdd");
  if(tripAdd){
    tripAdd.onclick=()=>{
      const snapshots=getSavedSnapshots();
      state.trip=[...new Set([...state.trip,...state.favorites])];
      state.trip.forEach((id)=>{
        const d=catalog.get(Number(id));
        if(d) snapshots[String(id)]=d;
      });
      localStorage.setItem("dealzyTrip",JSON.stringify(state.trip));
      saveSnapshots(snapshots);
      renderTrips();
      renderProfileInsights();
      toast(tr("Favorites added to {city} Weekend",{city:market.city}));
    };
  }

  hydrateHome();
  maybeShowLocationPrompt();
  maybeShowFirstRunOnboarding();
})();
