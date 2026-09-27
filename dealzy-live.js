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
    const bg=d.img?"background-image:url(&quot;"+h(d.img)+"&quot;)":"background:linear-gradient(135deg,#eef2ff,#f8f9fc)";
    return '<article class="deal" data-id="'+d.id+'"><div class="dealImg" style="'+bg+'"><span class="badge">'+h(d.badge||d.source||"Live")+'</span><button class="heart" data-heart="'+d.id+'" aria-label="Save">'+(saved?"♥":"♡")+'</button></div><div class="dealBody"><h3>'+h(d.title)+'</h3><div class="meta">'+h(d.place||"")+(d.rating?" · "+h(d.rating):"")+'</div><div class="row"><div><span class="price">'+h(priceText)+"</span>"+oldText+"</div>"+saveText+"</div></div></article>";
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
    $("#cats").innerHTML=cats.map((c)=>'<button class="cat" data-cat="'+h(c[1])+'"><span class="i">'+c[0]+"</span><b>"+h(tr(c[1]))+"</b></button>").join("");
    $("#cats").querySelectorAll("[data-cat]").forEach((b)=>b.onclick=()=>{state.filter=b.dataset.cat;show("explore");renderExplore();});
    $("#popularGrid").innerHTML=homeDeals.length?homeDeals.slice(0,8).map(dealCard).join(""):'<div class="empty" style="grid-column:1/-1">'+h(tr("Loading live deals…"))+'</div>';
    bindCards($("#popularGrid"));
    if(!$("#exploreView").classList.contains("hidden")) renderExplore();
    renderFavs();
    renderTrips();
  };

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
    if(popularHeading) popularHeading.textContent=tr("Popular in {city}",{city:market.city});

    const heroBadge=document.querySelector("#homeView .hero .pill");
    if(heroBadge) heroBadge.textContent="🇺🇸 "+tr("United States")+" · 🇨🇦 "+tr("Canada")+" — LIVE";

    const query=document.getElementById("aiQuery");
    if(query && (!query.dataset.marketTouched || /Miami|Toronto|Montreal|Montréal|Vancouver|Calgary|Ottawa|New York|Los Angeles|Chicago|Las Vegas/i.test(query.value))){
      query.value=locale()==="fr"
        ? "Dîner à "+market.city+" ce soir moins de "+(market.currency==="CAD"?"CA$100":"$100")
        : "Date night in "+market.city+" tonight under "+(market.currency==="CAD"?"CA$100":"$100");
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

    cleaned=cleaned.replace(/\b(in|à|a|dans)\b/gi," ").replace(/\s+/g," ").trim();
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

    try{
      homeDeals=await fetchMixed("",4);
    }catch(_){
      homeDeals=[];
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

    // Preload Explore with live data so the hidden legacy grid can never reappear when the tab is opened.
    await renderExplore();
  }

  const exploreButton=document.getElementById("exploreSearch");
  if(exploreButton) exploreButton.onclick=()=>renderExplore();

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
      toast(tr("Favorites added to {city} Weekend",{city:market.city}));
    };
  }

  hydrateHome();
})();