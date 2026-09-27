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
      {value:"Ottawa",label:"Ottawa, ON"}
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

  function persistMarket(country,city){
    market={country,city,currency:country==="CA"?"CAD":"USD"};
    localStorage.setItem("dealzyMarket",JSON.stringify(market));
    state.coords=null;
    localStorage.removeItem("dealzyCoords");
    catalog.clear();
    homeDeals=[];
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
      currency:raw.currency||market.currency,
      live:true
    };
  }

  function remember(rows){
    rows.forEach((d)=>catalog.set(Number(d.id),d));
    return rows;
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
    const priceText=hasPrice?moneyFor(d.price,d.currency):(d.priceLabel||"Price on provider");
    const oldText=hasDiscount?'<span class="old">'+moneyFor(d.old,d.currency)+"</span>":"";
    const saveText=hasDiscount?'<span class="save">Save '+pct+"%</span>":'<span class="save">'+h(d.source||"Live")+"</span>";
    const bg=d.img?"background-image:url(&quot;"+h(d.img)+"&quot;)":"background:linear-gradient(135deg,#eef2ff,#f8f9fc)";
    return '<article class="deal" data-id="'+d.id+'"><div class="dealImg" style="'+bg+'"><span class="badge">'+h(d.badge||d.source||"Live")+'</span><button class="heart" data-heart="'+d.id+'" aria-label="Save">'+(saved?"♥":"♡")+'</button></div><div class="dealBody"><h3>'+h(d.title)+'</h3><div class="meta">'+h(d.place||"")+(d.rating?" · "+h(d.rating):"")+'</div><div class="row"><div><span class="price">'+h(priceText)+"</span>"+oldText+"</div>"+saveText+"</div></div></article>";
  };

  openDeal=function(id){
    const numericId=Number(id);
    const d=catalog.get(numericId)||deals.find((x)=>Number(x.id)===numericId);
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
    $("#detailSave").textContent=hasDiscount?"Save "+pct+"%":"Live partner";
    $("#detailText").textContent=d.text||"";
    $("#partnerBtn").textContent="Open on "+(d.source||"Partner")+" ↗";
    $("#partnerBtn").onclick=()=>{
      if(d.partnerUrl) window.open(d.partnerUrl,"_blank","noopener,noreferrer");
      else toast("Partner link is temporarily unavailable.");
    };
    $("#detailOverlay").classList.remove("hidden");
  };

  renderFavs=function(){
    const list=[...state.favorites].map((id)=>catalog.get(Number(id))).filter(Boolean);
    $("#favoritesGrid").innerHTML=list.length?list.map(dealCard).join(""):'<div class="empty" style="grid-column:1/-1">No favorites yet. Tap ♡ on a live result to save it.</div>';
    bindCards($("#favoritesGrid"));
  };

  renderTrips=function(){
    const list=state.trip.map((id)=>catalog.get(Number(id))).filter(Boolean);
    $("#tripItems").innerHTML=list.length?list.map((d)=>'<div class="tripCard"><b>'+h(d.title)+'</b><div class="meta">'+h(d.place||"")+" · "+(Number(d.price)>0?moneyFor(d.price,d.currency):(d.priceLabel||"Price on provider"))+" · "+h(d.source||"Live")+"</div></div>").join(""):'<div class="empty">Your trip is empty.</div>';
  };

  renderExplore=async function(){
    const root=$("#exploreGrid");
    const count=$("#resultCount");
    const q=($("#exploreQuery")?.value||"").trim();

    $("#filters").innerHTML=["All",...LIVE_CATEGORIES].map((x)=>'<button class="'+(state.filter===x?"active":"")+'" data-filter="'+h(x)+'">'+h(x)+"</button>").join("");
    $("#filters").querySelectorAll("button").forEach((b)=>b.onclick=()=>{state.filter=b.dataset.filter;renderExplore();});

    if(root) root.innerHTML='<div class="empty" style="grid-column:1/-1">Loading live results…</div>';
    if(count) count.textContent="Live search";

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

    if(count) count.textContent=list.length+" live result"+(list.length===1?"":"s")+" · "+marketCityLabel()+(state.maxPrice?" · under "+moneyFor(state.maxPrice,market.currency):"");
    if(root){
      root.innerHTML=list.length?list.map(dealCard).join(""):'<div class="empty" style="grid-column:1/-1">No live provider result found right now. Try another category or search.</div>';
      bindCards(root);
    }
    renderFavs();
    renderTrips();
  };

  renderAll=function(){
    $("#cats").innerHTML=cats.map((c)=>'<button class="cat" data-cat="'+h(c[1])+'"><span class="i">'+c[0]+"</span><b>"+h(c[1])+"</b></button>").join("");
    $("#cats").querySelectorAll("[data-cat]").forEach((b)=>b.onclick=()=>{state.filter=b.dataset.cat;show("explore");renderExplore();});
    $("#popularGrid").innerHTML=homeDeals.length?homeDeals.slice(0,8).map(dealCard).join(""):'<div class="empty" style="grid-column:1/-1">Loading live deals…</div>';
    bindCards($("#popularGrid"));
    if(!$("#exploreView").classList.contains("hidden")) renderExplore();
    renderFavs();
    renderTrips();
  };

  function updateMarketUI(){
    const flag=market.country==="CA"?"🇨🇦":"🇺🇸";
    const countryName=market.country==="CA"?"Canada":"United States";
    const locationBtn=document.getElementById("locationBtn");
    if(locationBtn) locationBtn.textContent=flag+" "+marketCityLabel();

    const popularHeading=document.querySelector("#homeView .section:nth-of-type(2) .sectionHead h2");
    if(popularHeading) popularHeading.textContent="Popular in "+market.city;

    const heroBadge=document.querySelector("#homeView .hero .pill");
    if(heroBadge) heroBadge.textContent="🇺🇸 United States · 🇨🇦 Canada — LIVE";

    const query=document.getElementById("aiQuery");
    if(query && (!query.dataset.marketTouched || /Miami|Toronto|Montreal|Montréal|Vancouver|Calgary|Ottawa|New York|Los Angeles|Chicago|Las Vegas/i.test(query.value))){
      query.value="Date night in "+market.city+" tonight under "+(market.currency==="CAD"?"CA$100":"$100");
      query.dataset.marketTouched="1";
    }

    const tripCard=document.querySelector("#tripsView .tripCard");
    if(tripCard){
      const title=tripCard.querySelector("b");
      if(title) title.textContent=market.city+" Weekend";
      const meta=tripCard.querySelector(".meta");
      if(meta) meta.textContent="Create a trip by saving live deals in "+market.city+", then group them into a simple itinerary.";
    }

    document.querySelectorAll(".profileCard").forEach((card)=>{
      const heading=card.querySelector("h3");
      if(!heading||heading.textContent.trim()!=="Market") return;
      const cities=MARKET_CITIES[market.country];
      card.innerHTML='<h3 style="margin-top:0">Market</h3>'+
        '<div class="dz-form" style="margin-top:8px">'+
          '<label>Country<select id="dzMarketCountry">'+
            '<option value="US" '+(market.country==="US"?"selected":"")+'>🇺🇸 United States</option>'+
            '<option value="CA" '+(market.country==="CA"?"selected":"")+'>🇨🇦 Canada</option>'+
          '</select></label>'+
          '<label>City<select id="dzMarketCity">'+cities.map(x=>'<option value="'+h(x.value)+'" '+(x.value===market.city?"selected":"")+'>'+h(x.label)+'</option>').join("")+'</select></label>'+
        '</div>'+
        '<div class="meta" style="margin-top:10px"><b>'+flag+" "+h(countryName)+'</b> · '+h(market.currency)+' · live provider search</div>';

      const countrySelect=card.querySelector("#dzMarketCountry");
      const citySelect=card.querySelector("#dzMarketCity");

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
    });
  }

  async function hydrateHome(){
    updateMarketUI();
    deals.splice(0,deals.length);
    const popular=$("#popularGrid");
    if(popular) popular.innerHTML='<div class="empty" style="grid-column:1/-1">Loading live deals…</div>';

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
      if(/Demo inventory/i.test(span.textContent||"")) span.textContent="Live providers";
    });
    const legal=document.querySelector("#homeView .legal");
    if(legal&&/demo inventory/i.test(legal.textContent||"")){
      legal.textContent="Live inventory is supplied by connected providers including Viator, Ticketmaster and Yelp. Travel clickouts include Expedia, Booking.com and Skyscanner. We may earn a commission on eligible partner purchases.";
    }

    document.querySelectorAll(".profileCard").forEach((card)=>{
      const heading=card.querySelector("h3");
      if(heading&&heading.textContent.trim()==="Partner status"){
        const paragraph=card.querySelector("p");
        if(paragraph) paragraph.textContent="Live in USA and Canada: Viator, Ticketmaster and Yelp. Expedia, Booking.com and Skyscanner are connected as travel clickouts.";
      }
    });

    // Preload Explore with live data so the hidden legacy grid can never reappear when the tab is opened.
    await renderExplore();
  }

  const exploreButton=document.getElementById("exploreSearch");
  if(exploreButton) exploreButton.onclick=()=>renderExplore();

  hydrateHome();
})();