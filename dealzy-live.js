(() => {
  "use strict";

  const LIVE_CATEGORIES=["Food & Drink","Spa & Beauty","Things to Do","Travel"];
  const catalog=new Map();
  let homeDeals=[];

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
    const params=new URLSearchParams({category,limit:String(limit)});
    if(q) params.set("q",q);
    if(state.maxPrice) params.set("maxPrice",String(state.maxPrice));
    if(state.coords){
      params.set("lat",String(state.coords.lat));
      params.set("lng",String(state.coords.lng));
      params.set("radius","20");
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
    return remember(dedupe(groups.flat()));
  }

  dealCard=function(d){
    const saved=state.favorites.has(d.id);
    const hasPrice=Number(d.price)>0;
    const hasDiscount=hasPrice&&Number(d.old)>Number(d.price);
    const pct=hasDiscount?Math.round((1-d.price/d.old)*100):0;
    const priceText=hasPrice?"$"+Number(d.price).toFixed(0):(d.priceLabel||"Price on provider");
    const oldText=hasDiscount?'<span class="old">$'+Number(d.old).toFixed(0)+"</span>":"";
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
    $("#detailPrice").textContent=hasPrice?"$"+Number(d.price).toFixed(0):(d.priceLabel||"Price on provider");
    $("#detailOld").textContent=hasDiscount?"$"+Number(d.old).toFixed(0):"";
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
    $("#tripItems").innerHTML=list.length?list.map((d)=>'<div class="tripCard"><b>'+h(d.title)+'</b><div class="meta">'+h(d.place||"")+" · "+(Number(d.price)>0?"$"+Number(d.price).toFixed(0):(d.priceLabel||"Price on provider"))+" · "+h(d.source||"Live")+"</div></div>").join(""):'<div class="empty">Your trip is empty.</div>';
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

    if(count) count.textContent=list.length+" live result"+(list.length===1?"":"s")+(state.maxPrice?" · under $"+state.maxPrice:"");
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

  async function hydrateHome(){
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

    document.querySelectorAll(".profileCard").forEach((card)=>{
      const heading=card.querySelector("h3");
      if(heading&&heading.textContent.trim()==="Partner status"){
        const paragraph=card.querySelector("p");
        if(paragraph) paragraph.textContent="Live sources: Viator, Ticketmaster and Yelp. Expedia, Booking.com and Skyscanner are connected as travel clickouts.";
      }
    });
  }

  const exploreButton=document.getElementById("exploreSearch");
  if(exploreButton) exploreButton.onclick=()=>renderExplore();

  hydrateHome();
})();