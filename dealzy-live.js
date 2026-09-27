(() => {
  "use strict";

  const LIVE_CATEGORIES=["Food & Drink","Spa & Beauty","Things to Do","Travel"];
  const catalog=new Map();
  let homeDeals=[];

  const MARKET_CITIES={
    US:[
      {value:"Miami",label:"Miami, FL"},
      {value:"New York",label:"New York, NY"},
      {value:"Los Angeles",label:"Los Angeles, CA"},
      {value:"Chicago",label:"Chicago, IL"},
      {value:"Las Vegas",label:"Las Vegas, NV"}
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
      {value:"Banff",label:"Banff, AB"}
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
    const city=saved&&cities.some(x=>x.value===saved.city)?saved.city:cities[0].value;
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

  function persistMarket(country,city){
    market={country,city,currency:country==="CA"?"CAD":"USD"};
    localStorage.setItem("dealzyMarket",JSON.stringify(market));
    state.coords=null;
    localStorage.removeItem("dealzyCoords");
    catalog.clear();
    homeDeals=[];
    if(window.DealzyCloud) window.DealzyCloud.queueSync();
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
    if(!interests.length) return [...cats];
    const priority=new Map(interests.map((id,index)=>[id,index]));
    return [...cats].sort((a,b)=>{
      const ai=priority.has(categoryInterestId(a[1]))?priority.get(categoryInterestId(a[1])):999;
      const bi=priority.has(categoryInterestId(b[1]))?priority.get(categoryInterestId(b[1])):999;
      return ai-bi;
    });
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

  function trackPartnerClick(d){
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

  async function fetchLive(category,q="",limit=8){
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
      params.set("radius","25");
    }
    const response=await fetch("/api/search?"+params.toString(),{
      headers:{Accept:"application/json"},
      cache:"no-store"
    });
    if(!response.ok) return [];
    const data=await response.json();
    if(!data||data.mode==="demo-fallback") return [];
    return remember((data.results||[]).map(toDeal));
  }

  async function fetchMixed(q="",limitEach=5){
    const groups=await Promise.all(LIVE_CATEGORIES.map((cat)=>fetchLive(cat,q,limitEach).catch(()=>[])));
    const interleaved=[];
    for(let i=0;i<limitEach;i++){
      groups.forEach((group)=>{ if(group[i]) interleaved.push(group[i]); });
    }
    return remember(dedupe(interleaved));
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
    const scorePill='<span title="'+h(tr("Personalized relevance score"))+'" style="display:inline-flex;align-items:center;gap:5px;background:#f1efff;color:#5145cd;border-radius:999px;padding:6px 9px;font-size:11px;font-weight:850;margin-top:9px">✦ '+scoreInfo.score+' '+h(tr("Dealzy AI"))+'</span>';
    const bg=d.img?"background-image:url(&quot;"+h(d.img)+"&quot;)":"background:linear-gradient(135deg,#eef2ff,#f8f9fc)";
    return '<article class="deal" data-id="'+d.id+'"><div class="dealImg" style="'+bg+'"><span class="badge">'+h(d.badge||d.source||"Live")+'</span><button class="heart" data-heart="'+d.id+'" aria-label="Save">'+(saved?"♥":"♡")+'</button></div><div class="dealBody"><h3>'+h(d.title)+'</h3><div class="meta">'+h(d.place||"")+(d.rating?" · "+h(d.rating):"")+'</div>'+scorePill+'<div class="row"><div><span class="price">'+h(priceText)+"</span>"+oldText+"</div>"+saveText+"</div></div></article>";
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

  openDeal=function(id){
    const numericId=Number(id);
    const d=catalog.get(numericId)||getSavedSnapshots()[String(numericId)]||deals.find((x)=>Number(x.id)===numericId);
    if(!d) return;
    const hasPrice=Number(d.price)>0;
    const hasDiscount=hasPrice&&Number(d.old)>Number(d.price);
    const pct=hasDiscount?Math.round((1-d.price/d.old)*100):0;
    $("#detailHero").style.backgroundImage=d.img?'url("'+String(d.img).replace(/"/g,"%22")+'")':"none";
    $("#detailBadge").textContent=d.source||"Live";
    $("#detailTitle").textContent=d.title||"";
    $("#detailMeta").textContent=[d.place,d.rating].filter(Boolean).join(" · ");
    const scoreInfo=dealzyScore(d);
    let scoreBox=document.getElementById("dealzyScoreDetail");
    if(!scoreBox){
      scoreBox=document.createElement("div");
      scoreBox.id="dealzyScoreDetail";
      scoreBox.style.cssText="margin:12px 0;padding:12px 14px;border-radius:16px;background:#f8f7ff;border:1px solid #e5e1ff;color:#344054";
      $("#detailMeta").insertAdjacentElement("afterend",scoreBox);
    }
    scoreBox.innerHTML='<b style="color:#5145cd">✦ '+scoreInfo.score+' '+h(tr("Dealzy AI Score"))+'</b><div style="font-size:12px;margin-top:5px">'+h(scoreInfo.reasons.join(" · "))+'</div><div style="font-size:11px;color:#667085;margin-top:5px">'+h(tr("Personalized relevance score — not a provider rating or sponsored ranking."))+'</div>';
    $("#detailPrice").textContent=hasPrice?moneyFor(d.price,d.currency):(d.priceLabel||"Price on provider");
    $("#detailOld").textContent=hasDiscount?moneyFor(d.old,d.currency):"";
    $("#detailSave").textContent=hasDiscount?tr("Save {pct}%",{pct}):tr("Live partner");
    $("#detailText").textContent=d.text||"";
    $("#partnerBtn").textContent=tr("Open on {source} ↗",{source:d.source||"Partner"});
    $("#partnerBtn").onclick=()=>{
      if(d.partnerUrl){
        trackPartnerClick(d);
        window.open(d.partnerUrl,"_blank","noopener,noreferrer");
      }else toast(tr("Partner link is temporarily unavailable."));
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

  renderExplore=async function(){
    const root=$("#exploreGrid");
    const count=$("#resultCount");
    const q=($("#exploreQuery")?.value||"").trim();

    $("#filters").innerHTML=["All",...LIVE_CATEGORIES].map((x)=>'<button class="'+(state.filter===x?"active":"")+'" data-filter="'+h(x)+'">'+h(tr(x))+"</button>").join("");
    $("#filters").querySelectorAll("button").forEach((b)=>b.onclick=()=>{state.filter=b.dataset.filter;renderExplore();});

    if(root) root.innerHTML='<div class="empty" style="grid-column:1/-1">'+h(tr("Loading live results…"))+'</div>';
    if(count) count.textContent=tr("Live search");

    let list=[];
    try{
      list=state.filter==="All"?await fetchMixed(q,6):await fetchLive(state.filter,q,18);
    }catch(_){
      list=[];
    }

    if(state.maxPrice){
      list=list.filter((d)=>Number(d.price)>0&&Number(d.price)<=state.maxPrice);
    }
    deals.splice(0,deals.length,...dedupe(list));

    if(count){
      const resultText=tr(list.length===1?"{count} live result":"{count} live results",{count:list.length});
      count.textContent=resultText+" · "+marketCityLabel()+(state.maxPrice?" · "+tr("under {price}",{price:moneyFor(state.maxPrice,market.currency)}):"");
    }
    if(root){
      root.innerHTML=list.length?list.map(dealCard).join(""):'<div class="empty" style="grid-column:1/-1">'+h(tr("No live provider result found right now. Try another category or search."))+'</div>';
      bindCards(root);
    }
    renderFavs();
    renderTrips();
  };

  renderAll=function(){
    const visibleCats=orderedCategories();
    $("#cats").innerHTML=visibleCats.map((c)=>'<button class="cat" data-cat="'+h(c[1])+'"><span class="i">'+c[0]+"</span><b>"+h(tr(c[1]))+"</b></button>").join("");
    $("#cats").querySelectorAll("[data-cat]").forEach((b)=>b.onclick=()=>{state.filter=b.dataset.cat;show("explore");renderExplore();});
    const personalized=personalizedHome(homeDeals);
    $("#popularGrid").innerHTML=personalized.length?personalized.slice(0,8).map(dealCard).join(""):'<div class="empty" style="grid-column:1/-1">'+h(tr("Loading live deals…"))+'</div>';
    bindCards($("#popularGrid"));
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
      if(!document.getElementById("dealzyOnboarding")) toast(tr("Personalize Dealzy"));
    },700);
  }

  function updateMarketUI(){
    const flag=market.country==="CA"?"🇨🇦":"🇺🇸";
    const countryName=market.country==="CA"?"Canada":"United States";
    const locationBtn=document.getElementById("locationBtn");
    if(locationBtn){
      locationBtn.textContent=flag+" "+marketCityLabel();
      locationBtn.onclick=()=>show("profile");
      locationBtn.title=tr("Change market");
    }

    const popularHeading=document.querySelector("#homeView .section:nth-of-type(2) .sectionHead h2");
    if(popularHeading){
      const profile=readOnboarding();
      popularHeading.textContent=profile.completed?tr("For you in {city}",{city:market.city}):tr("Popular in {city}",{city:market.city});
    }

    const heroBadge=document.querySelector("#homeView .hero .pill");
    if(heroBadge) heroBadge.textContent="🇺🇸 "+tr("United States")+" · 🇨🇦 "+tr("Canada")+" — LIVE";

    const query=document.getElementById("aiQuery");
    if(query && (!query.dataset.marketTouched || /Miami|Toronto|Montreal|Montréal|Vancouver|Calgary|Ottawa|New York|Los Angeles|Chicago|Las Vegas/i.test(query.value))){
      const preferred=Math.max(10,Number(readOnboarding().budget)||100);
      query.value=locale()==="fr"
        ? "Dîner à "+market.city+" ce soir moins de "+moneyFor(preferred,market.currency)
        : "Date night in "+market.city+" tonight under "+moneyFor(preferred,market.currency);
      query.dataset.marketTouched="1";
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
      card.innerHTML='<h3 style="margin-top:0">'+h(tr("Market"))+'</h3>'+
        '<div class="dz-form" style="margin-top:8px">'+
          '<label>'+h(tr("Country"))+'<select id="dzMarketCountry">'+
            '<option value="US" '+(market.country==="US"?"selected":"")+'>🇺🇸 '+h(tr("United States"))+'</option>'+
            '<option value="CA" '+(market.country==="CA"?"selected":"")+'>🇨🇦 '+h(tr("Canada"))+'</option>'+
          '</select></label>'+
          '<label>'+h(tr("City"))+'<select id="dzMarketCity">'+cities.map(x=>'<option value="'+h(x.value)+'" '+(x.value===market.city?"selected":"")+'>'+h(x.label)+'</option>').join("")+'</select></label>'+
          '<label>'+h(tr("Language"))+'<select id="dzMarketLanguage">'+
            '<option value="en" '+(currentLocale==="en"?"selected":"")+'>English</option>'+
            '<option value="fr" '+(currentLocale==="fr"?"selected":"")+'>Français</option>'+
          '</select></label>'+
        '</div>'+
        '<div class="meta" style="margin-top:10px"><b>'+flag+" "+h(tr(countryName))+'</b> · '+h(market.currency)+' · '+h(tr("Live provider search"))+'</div>';

      const countrySelect=card.querySelector("#dzMarketCountry");
      const citySelect=card.querySelector("#dzMarketCity");
      const languageSelect=card.querySelector("#dzMarketLanguage");

      countrySelect.onchange=()=>{
        const nextCountry=countrySelect.value==="CA"?"CA":"US";
        persistMarket(nextCountry,MARKET_CITIES[nextCountry][0].value);
        updateMarketUI();
        hydrateHome();
      };
      citySelect.onchange=()=>{
        persistMarket(market.country,citySelect.value);
        updateMarketUI();
        hydrateHome();
      };
      languageSelect.onchange=()=>{
        if(window.DealzyI18n) window.DealzyI18n.setLocale(languageSelect.value);
        else localStorage.setItem("dealzyLocale",languageSelect.value);
        updateMarketUI();
        renderAll();
      };
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
    updateMarketUI();
    loadSavedIntoCatalog();
    deals.splice(0,deals.length);
    const popular=$("#popularGrid");
    if(popular) popular.innerHTML='<div class="empty" style="grid-column:1/-1">'+h(tr("Loading live deals…"))+'</div>';

    const familyIndex=cats.findIndex((x)=>x[1]==="Family");
    if(familyIndex>=0) cats.splice(familyIndex,1);

    const previousMaxPrice=state.maxPrice;
    state.maxPrice=null;
    try{
      homeDeals=await fetchMixed("",4);
    }catch(_){
      homeDeals=[];
    }finally{
      state.maxPrice=previousMaxPrice;
    }
    deals.splice(0,deals.length,...homeDeals);
    renderAll();

    document.querySelectorAll(".sectionHead span").forEach((span)=>{
      if(/Demo inventory|Sources en direct/i.test(span.textContent||"")) span.textContent=tr("Live providers");
    });
    const legal=document.querySelector("#homeView .legal");
    if(legal){
      legal.textContent=tr("Live inventory is supplied by connected providers including Viator, Ticketmaster and Yelp. Travel clickouts include Expedia, Booking.com and Skyscanner. We may earn a commission on eligible partner purchases.");
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
  maybeShowFirstRunOnboarding();
})();