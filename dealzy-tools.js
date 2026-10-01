/* Dealzy V1.2 — Swiss Army tools layer
   Progressive enhancement: keeps the stable V1 UI intact and adds tools without replacing core navigation.
*/
(() => {
  'use strict';
  try{
    deals.splice(0,deals.length);
    const pg=document.getElementById('popularGrid');
    if(pg) pg.innerHTML='<div class="empty" style="grid-column:1/-1">Loading live deals…</div>';
    document.querySelectorAll('.sectionHead span').forEach(s=>{
      if(/demo inventory/i.test(s.textContent||'')) s.textContent='Live providers';
    });
    const legal=document.querySelector('#homeView .legal');
    if(legal) legal.textContent='Loading verified live provider inventory…';
    document.querySelectorAll('.profileCard').forEach(card=>{
      const h=card.querySelector('h3');
      if(h&&h.textContent.trim()==='Partner status'){
        const p=card.querySelector('p');
        if(p) p.textContent='Checking live partner sources…';
      }
    });
  }catch(_){}
  const startDealzyLive=()=>{
    if(document.querySelector('script[data-dealzy-live]')) return;
    const liveScript=document.createElement('script');
    liveScript.src='/dealzy-live.js?v=20261001-awin1';
    liveScript.defer=true;
    liveScript.dataset.dealzyLive='1';
    document.head.appendChild(liveScript);
  };
  const i18nScript=document.createElement('script');
  i18nScript.src='/dealzy-i18n.js?v=20261001-awin1';
  i18nScript.defer=true;
  i18nScript.onload=startDealzyLive;
  i18nScript.onerror=startDealzyLive;
  document.head.appendChild(i18nScript);


  async function bootstrapSupabaseSession(){
    try{
      const hash=location.hash||'';
      if(!hash.includes('access_token=')) return;
      const p=new URLSearchParams(hash.replace(/^#/,''));
      const access_token=p.get('access_token');
      const refresh_token=p.get('refresh_token');
      const expires_in=Number(p.get('expires_in')||3600);
      const token_type=p.get('token_type')||'bearer';
      if(!access_token) return;
      let user=null;
      try{
        const r=await fetch('https://stkmhgeuavsidpapqvyw.supabase.co/auth/v1/user',{
          headers:{
            'apikey':'sb_publishable_EVDiDkczLgCmggcMxbV8tw_jQm4g9Rh',
            'Authorization':'Bearer '+access_token
          }
        });
        if(r.ok) user=await r.json();
      }catch(_){}
      localStorage.setItem('dealzyCloudSession',JSON.stringify({
        access_token,refresh_token,expires_in,token_type,user,
        confirmedAt:new Date().toISOString()
      }));
      history.replaceState(null,'',location.pathname+location.search);
      setTimeout(()=>{
        const t=document.getElementById('toast');
        if(t){t.textContent='Email confirmed · My Dealzy is connected';t.classList.remove('hidden');setTimeout(()=>t.classList.add('hidden'),2800);}
      },400);
    }catch(_){}
  }
  bootstrapSupabaseSession();

  const TOOL_CSS = `
  .dz-tools-fab{position:fixed;right:18px;bottom:92px;z-index:60;border:0;border-radius:999px;padding:12px 16px;background:linear-gradient(135deg,#6d5dfc,#3d8bfd);color:#fff;font-weight:850;box-shadow:0 14px 34px rgba(75,71,224,.32);cursor:pointer}
  .dz-sheet-wrap{position:fixed;inset:0;background:rgba(17,24,39,.45);z-index:120;display:none;align-items:flex-end;justify-content:center}
  .dz-sheet-wrap.open{display:flex}
  .dz-sheet{width:min(760px,100%);max-height:88vh;overflow:auto;background:#f8f9fc;border-radius:28px 28px 0 0;padding:18px;box-shadow:0 -18px 55px rgba(0,0,0,.22)}
  .dz-sheet-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
  .dz-sheet-head h2{margin:0;font-size:25px}
  .dz-close{border:0;background:#fff;width:40px;height:40px;border-radius:50%;font-size:20px;box-shadow:0 5px 16px rgba(0,0,0,.08)}
  .dz-tools-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
  .dz-tool{background:#fff;border:1px solid #e7e9f0;border-radius:20px;padding:16px;text-align:left;cursor:pointer;min-height:112px}
  .dz-tool b{display:block;font-size:16px;margin:7px 0 4px}.dz-tool span{display:block;font-size:12px;color:#667085;line-height:1.4}.dz-tool .emoji{font-size:24px}
  .dz-panel{margin-top:14px;background:#fff;border:1px solid #e7e9f0;border-radius:20px;padding:16px;display:none}
  .dz-panel.open{display:block}.dz-panel h3{margin:0 0 12px}.dz-form{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .dz-form label{font-size:12px;color:#667085}.dz-form input,.dz-form select{width:100%;margin-top:5px;border:1px solid #dfe3eb;border-radius:12px;padding:11px;background:#fff}
  .dz-action{margin-top:12px;border:0;border-radius:13px;padding:12px 14px;background:#111827;color:white;font-weight:800;cursor:pointer}
  .dz-action.alt{background:#eef2ff;color:#5145cd}.dz-result{margin-top:12px;padding:12px;border-radius:14px;background:#f7f8fb;color:#344054;line-height:1.55}
  .dz-compare-row{display:grid;grid-template-columns:1.5fr repeat(3,1fr);gap:6px;align-items:center;padding:9px 0;border-bottom:1px solid #eef0f4;font-size:12px}
  .dz-compare-row:last-child{border-bottom:0}.dz-provider{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid #eef0f4}.dz-status{font-size:11px;font-weight:800;border-radius:999px;padding:5px 8px;background:#f2f4f7;color:#667085}
  .dz-status.live{background:#ecfdf3;color:#027a48}.dz-small{font-size:12px;color:#667085;line-height:1.55}.dz-chip{display:inline-block;padding:6px 9px;border-radius:999px;background:#f2f4f7;margin:3px;font-size:12px}
  .dz-install-card{display:flex;align-items:center;gap:12px;margin-bottom:14px;padding:14px 16px;border-radius:20px;background:linear-gradient(115deg,#4436c7,#357fdf);color:#fff;box-shadow:0 9px 24px rgba(68,54,199,.18)}
  .dz-install-card img{width:42px;height:42px;border-radius:11px}.dz-install-card .dz-install-copy{flex:1;min-width:0}.dz-install-card b{display:block;font-size:16px}.dz-install-card small{display:block;opacity:.9;line-height:1.35;margin-top:3px}
  .dz-install-card button,.dz-install-profile button{border:0;border-radius:12px;padding:10px 14px;background:#fff;color:#4338ca;font-weight:800;cursor:pointer}
  .dz-install-card .dz-install-dismiss{padding:5px 8px;background:transparent;color:#fff;font-size:20px;line-height:1}
  .dz-install-profile button{background:#eef2ff}.dz-install-guide{position:fixed;inset:0;z-index:220;display:grid;place-items:center;padding:18px;background:rgba(17,24,39,.55);backdrop-filter:blur(5px)}
  .dz-install-guide section{width:min(430px,100%);background:#fff;border-radius:24px;padding:24px;box-shadow:0 24px 70px rgba(0,0,0,.28);color:#182230}
  .dz-install-guide h2{font-size:23px;margin:0 0 12px}.dz-install-guide p,.dz-install-guide li{line-height:1.5;color:#475467}.dz-install-guide ol{padding-left:22px}.dz-install-guide button{width:100%;border:0;border-radius:13px;padding:12px;background:#6254ef;color:#fff;font-weight:800;cursor:pointer}
  @media(max-width:560px){.dz-install-card{display:grid;grid-template-columns:42px 1fr 28px}.dz-install-card .dz-install-copy{grid-column:2}.dz-install-card .dz-install-dismiss{grid-column:3;grid-row:1}.dz-install-card .dz-install-action{grid-column:2/4;width:100%}}
  @media(max-width:560px){.dz-tools-grid{grid-template-columns:1fr 1fr}.dz-sheet{padding:14px}.dz-form{grid-template-columns:1fr}.dz-tools-fab{right:12px;bottom:88px}}
  `;


  let dzRuntimeProviders={booking:true,skyscanner:true,expedia:true,checkedAt:0};
  async function loadDzRuntimeProviders(force=false){
    if(!force && Date.now()-Number(dzRuntimeProviders.checkedAt||0)<15000) return dzRuntimeProviders;
    try{
      const r=await fetch('/api/providers',{cache:'no-store',headers:{'Accept':'application/json'}});
      if(!r.ok) throw new Error('providers');
      const data=await r.json();
      const next={booking:true,skyscanner:true,expedia:true,checkedAt:Date.now()};
      for(const row of Array.isArray(data.providers)?data.providers:[]){
        const name=String(row.name||'').toLowerCase();
        const enabled=String(row.status||'').toLowerCase()!=='disabled-by-admin';
        if(name.includes('booking.com')) next.booking=enabled;
        if(name.includes('skyscanner')) next.skyscanner=enabled;
        if(name.includes('expedia')) next.expedia=enabled;
      }
      dzRuntimeProviders=next;
    }catch(_){
      dzRuntimeProviders={...dzRuntimeProviders,checkedAt:Date.now()};
    }
    return dzRuntimeProviders;
  }

  const CLOUD_KEYS=['dealzyFavs','dealzyTrip','dealzyCoords','dealzyMarket','dealzyLocale','dealzyOnboarding','dealzyLiveSaved','dealzyPartnerClicks','dealzyToolPrefs','dealzyAlerts','dealzyLocalProfile','dealzyPriceWatch','dealzyCoupons','dealzyTravelSearches','dealzyExplorePrefs'];
  let cloudTimer=null;

  async function getCloudSession(){
    let session=null;
    try{session=JSON.parse(localStorage.getItem('dealzyCloudSession')||'null')}catch(_){}
    if(!session) return null;
    if(session.expires_at && Date.now()/1000 < Number(session.expires_at)-60) return session;
    if(session.refresh_token){
      try{
        const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'refresh',refresh_token:session.refresh_token})});
        const fresh=await r.json();
        if((r.status===401||r.status===403)){
          localStorage.removeItem('dealzyCloudSession');
          localStorage.setItem('dealzyAccountAccessError',String(fresh.error||fresh.message||'Your Dealzy account is unavailable.'));
          return null;
        }
        if(r.ok && fresh.access_token){
          fresh.expires_at=Math.floor(Date.now()/1000)+Number(fresh.expires_in||3600);
          localStorage.removeItem('dealzyAccountAccessError');
          localStorage.setItem('dealzyCloudSession',JSON.stringify(fresh));
          return fresh;
        }
      }catch(_){}
    }
    return session.access_token?session:null;
  }

  function cloudBundle(){
    const out={};
    CLOUD_KEYS.forEach(k=>{const v=localStorage.getItem(k); if(v!==null) out[k]=v;});
    return out;
  }

  async function pushCloudNow(){
    const session=await getCloudSession();
    if(!session||!session.access_token) return false;
    try{
      const r=await fetch('/api/sync',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token},body:JSON.stringify({data:cloudBundle()})});
      return r.ok;
    }catch(_){return false}
  }

  function queueCloudSync(){
    clearTimeout(cloudTimer);
    cloudTimer=setTimeout(()=>pushCloudNow(),900);
  }
  window.DealzyCloud={queueSync:queueCloudSync,pushNow:pushCloudNow,getSession:getCloudSession};

  const stateKey = 'dealzyToolPrefs';
  const prefs = JSON.parse(localStorage.getItem(stateKey) || '{"budget":100,"radius":10,"category":"All"}');
  const alertsKey = 'dealzyAlerts';
  const alerts = JSON.parse(localStorage.getItem(alertsKey) || '[]');

  const style = document.createElement('style');
  style.textContent = TOOL_CSS;
  document.head.appendChild(style);

  const fab = document.createElement('button');
  fab.className = 'dz-tools-fab';
  fab.type = 'button';
  fab.textContent = '⚡ Super App';
  fab.setAttribute('aria-label','Open Dealzy Super App');
  document.body.appendChild(fab);

  const wrap = document.createElement('div');
  wrap.className = 'dz-sheet-wrap';
  wrap.innerHTML = `
    <section class="dz-sheet" role="dialog" aria-modal="true" aria-label="Dealzy toolbox">
      <div class="dz-sheet-head">
        <div><h2>Dealzy Super App</h2><div class="dz-small">Discover, compare, plan, track, save and organize everything from one place.</div></div>
        <button class="dz-close" type="button" aria-label="Close">×</button>
      </div>
      <div class="dz-tools-grid">
        <button class="dz-tool" data-tool="compare"><span class="emoji">⚖️</span><b>Smart Compare</b><span>Compare your saved deals side by side.</span></button>
        <button class="dz-tool" data-tool="budget"><span class="emoji">🎯</span><b>Budget Finder</b><span>Find options that fit your category and budget.</span></button>
        <button class="dz-tool" data-tool="savings"><span class="emoji">💸</span><b>Savings Calculator</b><span>See discount percentage and money saved.</span></button>
        <button class="dz-tool" data-tool="alerts"><span class="emoji">🔔</span><b>Deal Alerts</b><span>Save a watch rule for future matching deals.</span></button>
        <button class="dz-tool" data-tool="notifications"><span class="emoji">📬</span><b>Notifications</b><span>See price-watch matches and Dealzy alerts.</span></button>
        <button class="dz-tool" data-tool="search"><span class="emoji">✨</span><b>Provider Search</b><span>Search through the Dealzy server gateway.</span></button>
        <button class="dz-tool" data-tool="nearby"><span class="emoji">🗺️</span><b>Nearby Map</b><span>Open a map centered on your current location.</span></button>
        <button class="dz-tool" data-tool="account"><span class="emoji">👤</span><b>My Dealzy</b><span>Account, password, orders and user management.</span></button>
        <button class="dz-tool" data-tool="planner"><span class="emoji">🧠</span><b>Smart Planner</b><span>Build a mini plan around your budget and party size.</span></button>
        <button class="dz-tool" data-tool="travel"><span class="emoji">🧳</span><b>Travel Hub</b><span>Hotels, flights, cars and things to do in one place.</span></button>
        <button class="dz-tool" data-tool="watch"><span class="emoji">📉</span><b>Price Watch</b><span>Save products or deals you want to monitor.</span></button>
        <button class="dz-tool" data-tool="coupons"><span class="emoji">🎟️</span><b>Coupon Vault</b><span>Keep promo codes and expiry dates in one place.</span></button>
        <button class="dz-tool" data-tool="backup"><span class="emoji">💾</span><b>Backup & Restore</b><span>Export or restore your local Dealzy data.</span></button>
        <button class="dz-tool" data-tool="split"><span class="emoji">🧾</span><b>Split & Tip</b><span>Split a bill and calculate tips instantly.</span></button>
        <button class="dz-tool" data-tool="providers"><span class="emoji">🔌</span><b>Sources</b><span>See which deal providers are active or pending.</span></button>
        <button class="dz-tool" data-tool="app"><span class="emoji">📲</span><b>App & Share</b><span>Install Dealzy or share it with someone.</span></button>
      </div>
      <div id="dzPanel" class="dz-panel"></div>
    </section>`;
  document.body.appendChild(wrap);
  if(window.DealzyI18n) window.DealzyI18n.apply(wrap);

  const panel = wrap.querySelector('#dzPanel');
  const close = () => { wrap.classList.remove('open'); panel.classList.remove('open'); };
  fab.onclick = () => wrap.classList.add('open');
  wrap.querySelector('.dz-close').onclick = close;
  wrap.onclick = e => { if (e.target === wrap) close(); };
  document.addEventListener('dealzy:localechange',()=>{if(window.DealzyI18n) window.DealzyI18n.apply(wrap);});

  function getDeals(){
    try {
      const current=Array.isArray(deals)?deals:[];
      const saved=JSON.parse(localStorage.getItem('dealzyLiveSaved')||'{}');
      const snapshots=Object.values(saved||{});
      const byId=new Map();
      [...current,...snapshots].forEach(d=>{if(d&&d.id!=null) byId.set(Number(d.id),d);});
      return [...byId.values()];
    } catch (_) { return []; }
  }
  function getFavorites(){
    try { return state && state.favorites ? [...state.favorites] : JSON.parse(localStorage.getItem('dealzyFavs')||'[]'); } catch (_) { return []; }
  }
  function money(v,currencyOverride){
    let currency=currencyOverride||'USD';
    if(!currencyOverride){
      try{currency=(JSON.parse(localStorage.getItem('dealzyMarket')||'null')||{}).currency||'USD';}catch(_){}
    }
    const symbol=currency==='CAD'?'CA'+String.fromCharCode(36):String.fromCharCode(36);
    return symbol+Number(v||0).toFixed(0);
  }
  async function recordPartnerClick(provider,title,extra){
    let market={country:'US',city:'Miami',currency:'USD'};
    try{
      try{market={...market,...(JSON.parse(localStorage.getItem('dealzyMarket')||'null')||{})};}catch(_){}
      const events=JSON.parse(localStorage.getItem('dealzyPartnerClicks')||'[]');
      events.push({
        provider:String(provider||'Partner'),
        title:title||'',
        market,
        source:(extra&&extra.source)||'clickout',
        externalId:(extra&&extra.externalId)||null,
        clickedAt:new Date().toISOString()
      });
      localStorage.setItem('dealzyPartnerClicks',JSON.stringify(events.slice(-500)));
      queueCloudSync();
    }catch(_){}
    try{
      const session=await getCloudSession();
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
          p_provider:String(provider||'partner').toLowerCase(),
          p_source:String((extra&&extra.source)||'clickout').slice(0,80),
          p_title:String(title||'').slice(0,240),
          p_external_id:(extra&&extra.externalId)!=null?String(extra.externalId).slice(0,160):null,
          p_country_code:market.country,
          p_city:market.city,
          p_currency_code:market.currency
        })
      });
    }catch(_){}
  }

  function partnerClickStats(){
    let events=[];
    try{events=JSON.parse(localStorage.getItem('dealzyPartnerClicks')||'[]')}catch(_){}
    const counts={};
    events.forEach(e=>{
      const key=String(e.provider||'Partner');
      counts[key]=(counts[key]||0)+1;
    });
    return {total:events.length,counts,last:events.length?events[events.length-1]:null};
  }
  function esc(s){ return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function showPanel(html){
    panel.innerHTML = html;
    panel.classList.add('open');
    if(window.DealzyI18n) window.DealzyI18n.apply(panel);
    panel.scrollIntoView({behavior:'smooth',block:'nearest'});
  }

  function compareTool(){
    const all = getDeals();
    const fav = getFavorites().map(id => all.find(d=>d.id===id)).filter(Boolean).slice(0,3);
    if(!fav.length){
      showPanel('<h3>⚖️ Smart Compare</h3><div class="dz-result">Save at least one deal with ♡, then come back here. Dealzy will compare up to three saved offers.</div>');
      return;
    }
    const cols = fav.map(d=>'<div><b>'+esc(d.title)+'</b></div>').join('');
    const row = (label,fn)=>'<div class="dz-compare-row"><b>'+label+'</b>'+fav.map(d=>'<div>'+fn(d)+'</div>').join('')+'</div>';
    showPanel('<h3>⚖️ Smart Compare</h3><div class="dz-compare-row"><b>Deal</b>'+cols+'</div>'+
      row('Price',d=>'<b>'+(Number(d.price)>0?money(d.price,d.currency):esc(d.priceLabel||'Price on provider'))+'</b>')+
      row('You save',d=>(Number(d.old)>Number(d.price)&&Number(d.price)>0)?money(d.old-d.price,d.currency):'—')+
      row('Discount',d=>(Number(d.old)>Number(d.price)&&Number(d.price)>0)?Math.round((1-d.price/d.old)*100)+'%':'—')+
      row('Rating',d=>esc(d.rating||'—'))+
      '<div class="dz-small" style="margin-top:10px">Comparison is factual and based on the current deal data. Partner terms may change.</div>');
  }

  function budgetTool(){
    const cats = ['All','Food & Drink','Things to Do','Spa & Beauty','Travel'];
    showPanel(`<h3>🎯 Budget Finder</h3>
      <div class="dz-form">
        <label>Maximum budget<input id="dzBudget" type="number" min="1" value="${Number(prefs.budget)||100}"></label>
        <label>Category<select id="dzCategory">${cats.map(c=>'<option '+(prefs.category===c?'selected':'')+'>'+c+'</option>').join('')}</select></label>
        <label>Radius (miles)<select id="dzRadius">${[5,10,25,50].map(r=>'<option '+(Number(prefs.radius)===r?'selected':'')+'>'+r+'</option>').join('')}</select></label>
      </div>
      <button class="dz-action" id="dzFind">Find deals</button>
      <div id="dzBudgetResult"></div>`);
    panel.querySelector('#dzFind').onclick=()=>{
      prefs.budget=Number(panel.querySelector('#dzBudget').value)||100;
      prefs.category=panel.querySelector('#dzCategory').value;
      prefs.radius=Number(panel.querySelector('#dzRadius').value)||10;
      localStorage.setItem(stateKey,JSON.stringify(prefs)); queueCloudSync();
      const list=getDeals().filter(d=>(prefs.category==='All'||d.cat===prefs.category)&&Number(d.price)>0&&Number(d.price)<=prefs.budget).sort((a,b)=>a.price-b.price);
      panel.querySelector('#dzBudgetResult').innerHTML='<div class="dz-result">'+(list.length?list.map(d=>'<div style="margin:6px 0"><b>'+esc(d.title)+'</b> · '+money(d.price,d.currency)+' · '+esc(d.place)+'</div>').join(''):'No current live result matches this budget.')+'</div>';
    };
  }

  function savingsTool(){
    showPanel(`<h3>💸 Savings Calculator</h3>
      <div class="dz-form">
        <label>Original price<input id="dzOld" type="number" min="0" value="120"></label>
        <label>Deal price<input id="dzNow" type="number" min="0" value="59"></label>
      </div>
      <button class="dz-action" id="dzCalc">Calculate savings</button>
      <div id="dzSavingsResult"></div>`);
    panel.querySelector('#dzCalc').onclick=()=>{
      const old=Number(panel.querySelector('#dzOld').value), now=Number(panel.querySelector('#dzNow').value);
      if(!(old>0)||now<0){ panel.querySelector('#dzSavingsResult').innerHTML='<div class="dz-result">Enter valid prices.</div>'; return; }
      const saved=Math.max(0,old-now), pct=Math.round(saved/old*100);
      panel.querySelector('#dzSavingsResult').innerHTML='<div class="dz-result"><b>You save '+money(saved)+'</b> · '+pct+'% off.</div>';
    };
  }

  function alertsTool(){
    showPanel(`<h3>🔔 Deal Alerts</h3>
      <div class="dz-form">
        <label>Keywords<input id="dzAlertQ" placeholder="spa, dinner, cruise"></label>
        <label>Max price<input id="dzAlertPrice" type="number" min="1" value="75"></label>
      </div>
      <button class="dz-action" id="dzSaveAlert">Save alert</button>
      <div class="dz-result"><b>${alerts.length} saved alert${alerts.length===1?'':'s'}</b><br>${alerts.length?alerts.map(a=>'<span class="dz-chip">'+esc(a.q)+' ≤ '+money(a.max)+'</span>').join(''):'No alerts yet.'}</div>
      <div class="dz-small" style="margin-top:9px">V1.2 stores alert rules on this device. Server notifications will activate when live providers and user accounts are connected.</div>`);
    panel.querySelector('#dzSaveAlert').onclick=()=>{
      const q=panel.querySelector('#dzAlertQ').value.trim(), max=Number(panel.querySelector('#dzAlertPrice').value)||75;
      if(!q) return;
      alerts.push({q,max,createdAt:new Date().toISOString()});
      localStorage.setItem(alertsKey,JSON.stringify(alerts)); queueCloudSync();
      alertsTool();
    };
  }

  function getCoords(){
    try{
      if(typeof state!=='undefined' && state.coords) return state.coords;
      return JSON.parse(localStorage.getItem('dealzyCoords')||'null');
    }catch(_){ return null; }
  }

  function nearbyTool(){
    const coords=getCoords();
    if(!coords){
      showPanel('<h3>🗺️ Nearby Map</h3><div class="dz-result">Location is not enabled yet. Close the toolbox and tap “Use my location” on Home first.</div>');
      return;
    }
    const lat=Number(coords.lat), lng=Number(coords.lng);
    const delta=.03;
    const bbox=[lng-delta,lat-delta,lng+delta,lat+delta].join(',');
    const src='https://www.openstreetmap.org/export/embed.html?bbox='+encodeURIComponent(bbox)+'&layer=mapnik&marker='+encodeURIComponent(lat+','+lng);
    showPanel('<h3>🗺️ Nearby Map</h3><div class="dz-small">Centered on your current location. Live deal pins will appear here when provider coordinates are available.</div><iframe title="Dealzy nearby map" src="'+src+'" style="width:100%;height:340px;border:0;border-radius:16px;margin-top:12px" loading="lazy"></iframe><div class="dz-result"><b>Radius preference:</b> '+esc(prefs.radius||10)+' miles<br><span class="dz-small">Dealzy stores only the optional browser coordinate locally in this build.</span></div>');
  }

  async function accountTool(){
    const profileKey='dealzyLocalProfile';
    const sessionKey='dealzyCloudSession';
    const SB_URL='https://stkmhgeuavsidpapqvyw.supabase.co';
    const SB_KEY='sb_publishable_EVDiDkczLgCmggcMxbV8tw_jQm4g9Rh';
    const profile=JSON.parse(localStorage.getItem(profileKey)||'{"name":"","email":""}');
    let configured=false;
    try{const r=await fetch('/api/cloud-status',{cache:'no-store'});const d=await r.json();configured=!!d.configured;}catch(_){}

    if(!configured){
      showPanel('<h3>👤 My Dealzy</h3>'+
        '<div class="dz-form">'+
          '<label>Display name<input id="dzName" value="'+esc(profile.name||'')+'" placeholder="Your name"></label>'+
          '<label>Email<input id="dzEmail" type="email" value="'+esc(profile.email||'')+'" placeholder="you@example.com"></label>'+
        '</div>'+
        '<button class="dz-action" id="dzSaveProfile">Save on this device</button>'+
        '<div class="dz-result"><b>Cloud sync is not connected.</b></div>');
      panel.querySelector('#dzSaveProfile').onclick=()=>{
        const name=panel.querySelector('#dzName').value.trim();
        const email=panel.querySelector('#dzEmail').value.trim();
        localStorage.setItem(profileKey,JSON.stringify({name,email,updatedAt:new Date().toISOString()}));
        accountTool();
      };
      return;
    }

    let session=await getCloudSession();

    const authHeaders=(token)=>({
      'apikey':SB_KEY,
      'Authorization':'Bearer '+token,
      'Content-Type':'application/json'
    });

    const sb=async(path,opts={})=>{
      const token=(session&&session.access_token)||'';
      const r=await fetch(SB_URL+path,{...opts,headers:{...authHeaders(token),...(opts.headers||{})}});
      let data=null;
      const txt=await r.text();
      try{data=txt?JSON.parse(txt):null}catch(_){data=txt}
      if(!r.ok){
        const msg=(data&&typeof data==='object'&&(data.message||data.msg||data.error_description||data.error))||('HTTP '+r.status);
        throw new Error(String(msg));
      }
      return data;
    };

    const rpc=(name,body)=>sb('/rest/v1/rpc/'+name,{method:'POST',body:JSON.stringify(body||{})});

    const adminAction=async(payload)=>{
      const r=await fetch(SB_URL+'/functions/v1/dealzy-admin-user-auth',{
        method:'POST',
        headers:authHeaders(session.access_token),
        body:JSON.stringify(payload||{})
      });
      const txt=await r.text();
      let data={};try{data=txt?JSON.parse(txt):{}}catch(_){data={error:txt}}
      if(!r.ok||data.ok===false) throw new Error(String(data.error||data.message||('HTTP '+r.status)));
      return data;
    };

    if(!session||!session.access_token){
      const accessError=localStorage.getItem('dealzyAccountAccessError')||'';
      showPanel('<h3>👤 My Dealzy</h3>'+
        (accessError?'<div class="dz-result"><b>Account unavailable</b><br><span class="dz-small">'+esc(accessError)+'</span></div>':'')+
        '<div class="dz-form">'+
          '<label>Email<input id="dzCloudEmail" type="email" value="'+esc(profile.email||'')+'" placeholder="you@example.com"></label>'+
          '<label>Password<input id="dzCloudPassword" type="password" minlength="6" placeholder="Your password"></label>'+
        '</div>'+
        '<button class="dz-action" id="dzLogin">Sign in</button>'+
        '<button class="dz-action alt" id="dzSignup">Create account</button>'+
        '<button class="dz-action alt" id="dzForgot">Forgot password</button>'+
        '<div id="dzAuthStatus" class="dz-small" style="margin-top:10px">Dealzy Cloud account.</div>');

      const authRun=async action=>{
        const email=panel.querySelector('#dzCloudEmail').value.trim();
        const password=panel.querySelector('#dzCloudPassword').value;
        const out=panel.querySelector('#dzAuthStatus');
        if(!email||(!password&&action!=='forgot')){out.textContent='Enter your email'+(action==='forgot'?'.':' and password.');return}
        try{
          if(action==='forgot'){
            out.textContent='Sending reset email…';
            const r=await fetch(SB_URL+'/auth/v1/recover?redirect_to='+encodeURIComponent('https://dealzyai.com/'),{
              method:'POST',
              headers:{'apikey':SB_KEY,'Content-Type':'application/json'},
              body:JSON.stringify({email})
            });
            let d={};try{d=await r.json()}catch(_){}
            if(!r.ok) throw new Error(d.msg||d.error_description||'Reset email failed');
            out.textContent='Reset email sent. Open the link, then change your password in My Dealzy.';
            return;
          }
          out.textContent=action==='login'?'Signing in…':'Creating account…';
          const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,email,password})});
          const d=await r.json();
          if(!r.ok) throw new Error(d.msg||d.message||d.error_description||d.error||'Authentication failed');
          if(d.access_token){
            d.expires_at=Math.floor(Date.now()/1000)+Number(d.expires_in||3600);
            localStorage.removeItem('dealzyAccountAccessError');
            localStorage.setItem(sessionKey,JSON.stringify(d));
            localStorage.setItem(profileKey,JSON.stringify({...profile,email,updatedAt:new Date().toISOString()}));
            accountTool();
          }else{
            out.textContent='Account created. Confirm your email, then sign in.';
          }
        }catch(e){out.textContent=e.message||'Authentication failed'}
      };
      panel.querySelector('#dzLogin').onclick=()=>authRun('login');
      panel.querySelector('#dzSignup').onclick=()=>authRun('signup');
      panel.querySelector('#dzForgot').onclick=()=>authRun('forgot');
      return;
    }

    let me,profileRow,adminRows,orders;
    try{
      me=await sb('/auth/v1/user',{method:'GET'});
      const uid=me.id;
      [profileRow,adminRows,orders]=await Promise.all([
        sb('/rest/v1/dealzy_profiles?select=display_name,country_code,currency_code,home_city&user_id=eq.'+encodeURIComponent(uid)+'&limit=1',{method:'GET'}),
        sb('/rest/v1/dealzy_admin_users?select=role,enabled&user_id=eq.'+encodeURIComponent(uid)+'&limit=1',{method:'GET'}),
        sb('/rest/v1/dealzy_orders?select=id,provider,external_order_id,kind,title,status,amount,currency_code,booked_at,created_at&user_id=eq.'+encodeURIComponent(uid)+'&order=created_at.desc&limit=50',{method:'GET'})
      ]);
    }catch(e){
      if(/401|jwt|token|session/i.test(String(e.message||''))){
        localStorage.removeItem(sessionKey);
        return accountTool();
      }
      showPanel('<h3>👤 My Dealzy</h3><div class="dz-result">'+esc(e.message||'Could not load account')+'</div>');
      return;
    }

    const pr=(Array.isArray(profileRow)&&profileRow[0])||{};
    const admin=(Array.isArray(adminRows)&&adminRows[0])||null;
    const role=admin&&admin.enabled?String(admin.role||'user'):'user';
    const canManage=role==='admin'||role==='superadmin';
    const isSuperadmin=role==='superadmin';
    const displayName=pr.display_name||me.user_metadata?.display_name||me.user_metadata?.full_name||me.user_metadata?.name||'';
    const orderRows=Array.isArray(orders)?orders:[];

    const orderHtml=orderRows.length?orderRows.map(o=>{
      const when=o.booked_at||o.created_at;
      const amount=o.amount==null?'—':money(Number(o.amount),o.currency_code||'USD');
      return '<div class="dz-result" style="margin:8px 0">'+
        '<b>'+esc(o.title||o.kind||'Order')+'</b><br>'+
        '<span class="dz-small">'+esc(o.provider||'Dealzy')+' · '+esc(o.status||'pending')+' · '+esc(amount)+'</span><br>'+
        '<span class="dz-small">'+esc(when?new Date(when).toLocaleString():'')+(o.external_order_id?' · #'+esc(o.external_order_id):'')+'</span>'+
      '</div>';
    }).join(''):'<div class="dz-result">No Dealzy orders or bookings yet.</div>';

    showPanel('<h3>👤 My Dealzy</h3>'+
      '<div class="dz-result"><b>Connected account</b><br><span class="dz-small">'+esc(me.email||me.phone||'Signed in')+' · '+esc(role.toUpperCase())+'</span></div>'+
      '<h3 style="margin-top:18px">Profile</h3>'+
      '<div class="dz-form">'+
        '<label>Name<input id="dzAccountName" value="'+esc(displayName)+'" placeholder="Your name"></label>'+
        '<label>Email<input id="dzAccountEmail" type="email" value="'+esc(me.email||'')+'"></label>'+
        '<label>Phone<input id="dzAccountPhone" value="'+esc(me.phone||'')+'" placeholder="+1…"></label>'+
      '</div>'+
      '<button class="dz-action" id="dzAccountSave">Save profile</button>'+
      '<div id="dzAccountProfileStatus"></div>'+
      '<h3 style="margin-top:18px">Password</h3>'+
      '<div class="dz-form">'+
        '<label>New password<input id="dzNewPassword" type="password" minlength="8" placeholder="Minimum 8 characters"></label>'+
        '<label>Confirm password<input id="dzConfirmPassword" type="password" minlength="8" placeholder="Repeat password"></label>'+
      '</div>'+
      '<button class="dz-action" id="dzChangePassword">Change password</button>'+
      '<div id="dzPasswordStatus"></div>'+
      '<h3 style="margin-top:18px">Order history</h3>'+orderHtml+
      (canManage?'<h3 style="margin-top:18px">User management</h3>'+
        '<div class="dz-small">Manage Dealzy users directly inside the app: activate, disable, blacklist, edit identity, orders and roles.</div>'+
        '<div class="dz-form" style="margin-top:10px"><label>Search users<input id="dzUserSearch" placeholder="name, email or phone"></label></div>'+
        '<button class="dz-action alt" id="dzFindUsers">Search users</button>'+
        '<div id="dzUsersResult"></div>':'')+
      '<h3 style="margin-top:18px">Cloud</h3>'+
      '<button class="dz-action alt" id="dzSyncUp">Sync this device → Cloud</button>'+
      '<button class="dz-action alt" id="dzSyncDown">Restore Cloud → this device</button>'+
      '<button class="dz-action alt" id="dzLogout">Sign out</button>'+
      '<div id="dzSyncStatus"></div>');

    panel.querySelector('#dzAccountSave').onclick=async()=>{
      const status=panel.querySelector('#dzAccountProfileStatus');
      const name=panel.querySelector('#dzAccountName').value.trim();
      const email=panel.querySelector('#dzAccountEmail').value.trim();
      const phone=panel.querySelector('#dzAccountPhone').value.trim();
      status.innerHTML='<div class="dz-result">Saving…</div>';
      try{
        const authPatch={data:{...(me.user_metadata||{}),display_name:name,full_name:name,name}};
        if(email&&email!==me.email) authPatch.email=email;
        if(phone&&phone!==(me.phone||'')) authPatch.phone=phone;
        const updated=await sb('/auth/v1/user',{method:'PUT',body:JSON.stringify(authPatch)});
        await sb('/rest/v1/dealzy_profiles?on_conflict=user_id',{
          method:'POST',
          headers:{'Prefer':'resolution=merge-duplicates,return=minimal'},
          body:JSON.stringify({user_id:me.id,display_name:name||null,updated_at:new Date().toISOString()})
        });
        session.user=updated||session.user;
        localStorage.setItem(sessionKey,JSON.stringify(session));
        localStorage.setItem(profileKey,JSON.stringify({name,email:updated?.email||email,phone:updated?.phone||phone,updatedAt:new Date().toISOString()}));
        status.innerHTML='<div class="dz-result"><b>Profile updated.</b><br><span class="dz-small">Email or phone changes may require verification.</span></div>';
      }catch(e){status.innerHTML='<div class="dz-result">'+esc(e.message||'Update failed')+'</div>'}
    };

    panel.querySelector('#dzChangePassword').onclick=async()=>{
      const out=panel.querySelector('#dzPasswordStatus');
      const p=panel.querySelector('#dzNewPassword').value;
      const c=panel.querySelector('#dzConfirmPassword').value;
      if(p.length<8){out.innerHTML='<div class="dz-result">Use at least 8 characters.</div>';return}
      if(p!==c){out.innerHTML='<div class="dz-result">Passwords do not match.</div>';return}
      out.innerHTML='<div class="dz-result">Updating password…</div>';
      try{
        await sb('/auth/v1/user',{method:'PUT',body:JSON.stringify({password:p})});
        panel.querySelector('#dzNewPassword').value='';
        panel.querySelector('#dzConfirmPassword').value='';
        out.innerHTML='<div class="dz-result"><b>Password changed.</b></div>';
      }catch(e){out.innerHTML='<div class="dz-result">'+esc(e.message||'Password update failed')+'</div>'}
    };

    const syncStatus=panel.querySelector('#dzSyncStatus');
    panel.querySelector('#dzSyncUp').onclick=async()=>{
      syncStatus.innerHTML='<div class="dz-result">Syncing…</div>';
      try{
        const r=await fetch('/api/sync',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token},body:JSON.stringify({data:cloudBundle()})});
        const d=await r.json();
        if(!r.ok) throw new Error(d.error||'Sync failed');
        syncStatus.innerHTML='<div class="dz-result"><b>Cloud sync complete.</b></div>';
      }catch(e){syncStatus.innerHTML='<div class="dz-result">'+esc(e.message||'Sync failed')+'</div>'}
    };
    panel.querySelector('#dzSyncDown').onclick=async()=>{
      syncStatus.innerHTML='<div class="dz-result">Restoring…</div>';
      try{
        const r=await fetch('/api/sync',{headers:{'Authorization':'Bearer '+session.access_token}});
        const d=await r.json();
        if(!r.ok) throw new Error(d.error||'Restore failed');
        if(d.data) Object.entries(d.data).forEach(([k,v])=>localStorage.setItem(k,String(v)));
        syncStatus.innerHTML='<div class="dz-result"><b>Cloud data restored.</b> Reload Dealzy to apply it.</div>';
      }catch(e){syncStatus.innerHTML='<div class="dz-result">'+esc(e.message||'Restore failed')+'</div>'}
    };
    panel.querySelector('#dzLogout').onclick=()=>{localStorage.removeItem(sessionKey);accountTool();};

    if(canManage){
      const resultBox=panel.querySelector('#dzUsersResult');

      const loadUserDetail=async uid=>{
        resultBox.innerHTML='<div class="dz-result">Loading user…</div>';
        try{
          const d=await rpc('dealzy_admin_user_detail',{target_user:uid});
          const u=d.user||{};
          const protectedUser=!!u.protected_superadmin;
          const targetOrders=Array.isArray(d.orders)?d.orders:[];
          const targetOrderHtml=targetOrders.length?targetOrders.slice(0,20).map(o=>
            '<div class="dz-small" style="padding:7px 0;border-bottom:1px solid #eef0f4">'+
            '<b>'+esc(o.title||o.kind||'Order')+'</b> · '+esc(o.provider||'')+' · '+esc(o.status||'')+
            (o.amount!=null?' · '+esc(money(Number(o.amount),o.currency_code||'USD')):'')+
            '</div>'
          ).join(''):'<div class="dz-small">No orders.</div>';

          resultBox.innerHTML='<div class="dz-result">'+
            '<b>'+esc(u.display_name||u.email||'Dealzy user')+'</b><br>'+
            '<span class="dz-small">'+esc(u.email||'')+(u.phone?' · '+esc(u.phone):'')+' · '+esc(String(u.status||'active').toUpperCase())+' · '+esc(String(u.role||'user').toUpperCase())+'</span>'+
            (protectedUser?'<br><span class="dz-small"><b>Protected superadmin</b></span>':'')+
            '</div>'+
            '<div class="dz-form" style="margin-top:10px">'+
              '<label>Name<input id="dzTargetName" value="'+esc(u.display_name||'')+'"></label>'+
              '<label>Email<input id="dzTargetEmail" type="email" value="'+esc(u.email||'')+'"></label>'+
              '<label>Phone<input id="dzTargetPhone" value="'+esc(u.phone||'')+'"></label>'+
              '<label>Status<select id="dzTargetStatus">'+['active','disabled','blacklisted'].map(x=>'<option '+(String(u.status||'active')===x?'selected':'')+'>'+x+'</option>').join('')+'</select></label>'+
              '<label>Reason<input id="dzTargetReason" value="'+esc(u.status_reason||'')+'" placeholder="Optional reason"></label>'+
              (isSuperadmin?'<label>Role<select id="dzTargetRole">'+['user','viewer','admin'].map(x=>'<option '+(String(u.role||'user')===x?'selected':'')+'>'+x+'</option>').join('')+'</select></label>':'')+
            '</div>'+
            '<button class="dz-action" id="dzTargetSave" '+(protectedUser?'disabled':'')+'>Save user</button>'+
            (isSuperadmin&&!protectedUser?'<div class="dz-form" style="margin-top:10px"><label>Set new password<input id="dzTargetPassword" type="password" minlength="12" placeholder="12+ chars, upper/lower/number"></label></div><button class="dz-action alt" id="dzTargetSetPassword">Set password</button>':'')+
            '<div id="dzTargetStatusBox"></div>'+
            '<h3 style="margin-top:16px">User orders</h3>'+targetOrderHtml+
            '<button class="dz-action alt" id="dzBackUsers">← Back to users</button>';

          panel.querySelector('#dzBackUsers').onclick=()=>loadUsers(panel.querySelector('#dzUserSearch')?.value||'');

          if(!protectedUser){
            panel.querySelector('#dzTargetSave').onclick=async()=>{
              const out=panel.querySelector('#dzTargetStatusBox');
              out.innerHTML='<div class="dz-result">Saving user…</div>';
              try{
                const identity={
                  action:'update_identity',
                  target_user:uid,
                  display_name:panel.querySelector('#dzTargetName').value.trim(),
                  email:panel.querySelector('#dzTargetEmail').value.trim(),
                  phone:panel.querySelector('#dzTargetPhone').value.trim()
                };
                await adminAction(identity);
                await adminAction({
                  action:'set_status',
                  target_user:uid,
                  status:panel.querySelector('#dzTargetStatus').value,
                  reason:panel.querySelector('#dzTargetReason').value.trim()
                });
                if(isSuperadmin&&panel.querySelector('#dzTargetRole')){
                  await rpc('dealzy_superadmin_set_staff',{target_user:uid,new_role:panel.querySelector('#dzTargetRole').value});
                }
                out.innerHTML='<div class="dz-result"><b>User updated.</b></div>';
                setTimeout(()=>loadUserDetail(uid),500);
              }catch(e){out.innerHTML='<div class="dz-result">'+esc(e.message||'User update failed')+'</div>'}
            };

            if(isSuperadmin&&panel.querySelector('#dzTargetSetPassword')){
              panel.querySelector('#dzTargetSetPassword').onclick=async()=>{
                const out=panel.querySelector('#dzTargetStatusBox');
                const password=panel.querySelector('#dzTargetPassword').value;
                out.innerHTML='<div class="dz-result">Updating password…</div>';
                try{
                  await adminAction({action:'set_password',target_user:uid,password});
                  panel.querySelector('#dzTargetPassword').value='';
                  out.innerHTML='<div class="dz-result"><b>Password changed for this user.</b></div>';
                }catch(e){out.innerHTML='<div class="dz-result">'+esc(e.message||'Password update failed')+'</div>'}
              };
            }
          }
        }catch(e){
          resultBox.innerHTML='<div class="dz-result">'+esc(e.message||'Could not load user')+'</div>';
        }
      };

      const loadUsers=async query=>{
        resultBox.innerHTML='<div class="dz-result">Loading users…</div>';
        try{
          const data=await rpc('dealzy_admin_users_page',{search_text:String(query||''),status_filter:'all',role_filter:'all',page_size:30,page_offset:0});
          const rows=Array.isArray(data.rows)?data.rows:[];
          resultBox.innerHTML='<div class="dz-small" style="margin:8px 0"><b>'+Number(data.total||rows.length)+' user'+(Number(data.total||rows.length)===1?'':'s')+'</b></div>'+
            (rows.length?rows.map(u=>
              '<button class="dz-tool" data-dz-user="'+esc(u.user_id)+'" style="width:100%;min-height:auto;margin:7px 0">'+
                '<b>'+esc(u.display_name||u.email||'Dealzy user')+'</b>'+
                '<span>'+esc(u.email||'')+(u.phone?' · '+esc(u.phone):'')+'</span>'+
                '<span>'+esc(String(u.account_status||'active').toUpperCase())+' · '+esc(String(u.admin_role||'user').toUpperCase())+'</span>'+
              '</button>'
            ).join(''):'<div class="dz-result">No users found.</div>');
          resultBox.querySelectorAll('[data-dz-user]').forEach(b=>b.onclick=()=>loadUserDetail(b.getAttribute('data-dz-user')));
        }catch(e){
          resultBox.innerHTML='<div class="dz-result">'+esc(e.message||'Could not load users')+'</div>';
        }
      };

      panel.querySelector('#dzFindUsers').onclick=()=>loadUsers(panel.querySelector('#dzUserSearch').value.trim());
      panel.querySelector('#dzUserSearch').addEventListener('keydown',e=>{if(e.key==='Enter')loadUsers(e.target.value.trim())});
      loadUsers('');
    }
  }

  function plannerTool(){
    const cats=['All','Food & Drink','Things to Do','Spa & Beauty','Travel','Family'];
    showPanel(`<h3>🧠 Smart Planner</h3>
      <div class="dz-form">
        <label>Total budget<input id="dzPlanBudget" type="number" min="1" value="150"></label>
        <label>People<input id="dzPlanPeople" type="number" min="1" value="2"></label>
        <label>Category<select id="dzPlanCat">${cats.map(x=>'<option>'+x+'</option>').join('')}</select></label>
      </div>
      <button class="dz-action" id="dzBuildPlan">Build plan</button>
      <div id="dzPlanResult"></div>`);
    panel.querySelector('#dzBuildPlan').onclick=()=>{
      const budget=Number(panel.querySelector('#dzPlanBudget').value)||150;
      const people=Math.max(1,Number(panel.querySelector('#dzPlanPeople').value)||1);
      const cat=panel.querySelector('#dzPlanCat').value;
      const rows=getDeals().filter(d=>(cat==='All'||d.cat===cat)&&d.price<=budget).sort((a,b)=>(b.old-b.price)-(a.old-a.price));
      let remaining=budget, picked=[];
      for(const d of rows){ if(d.price<=remaining){picked.push(d); remaining-=d.price;} }
      panel.querySelector('#dzPlanResult').innerHTML='<div class="dz-result">'+(
        picked.length
          ? '<b>Suggested plan for '+people+' people</b><br>'+picked.map(d=>'• '+esc(d.title)+' · '+money(d.price)).join('<br>')+'<br><br><b>Total '+money(budget-remaining)+'</b> · Remaining '+money(remaining)
          : 'No current deal fits this plan yet.'
      )+'</div>';
    };
  }

  async function checkPriceWatches(showResult=true){
    const session=await getCloudSession();
    let watches=[];
    try{watches=JSON.parse(localStorage.getItem('dealzyPriceWatch')||'[]')}catch(_){}
    if(!session||!session.access_token||!watches.length) return {ok:false,reason:'not-ready'};
    try{
      const r=await fetch('/api/watch-check',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token},
        body:JSON.stringify({watches})
      });
      const d=await r.json();
      if(showResult){
        showPanel('<h3>📉 Price Watch</h3><div class="dz-result"><b>'+((d.matches||[]).length)+' match'+((d.matches||[]).length===1?'':'es')+'</b><br>'+
          ((d.matches||[]).length?(d.matches||[]).map(x=>esc(x.deal.title)+' · '+money(x.deal.price)+' ≤ '+money(x.target)).join('<br>'):'No watched price target matched the current provider inventory.')+
          '</div><div class="dz-small" style="margin-top:9px">Current check mode: '+esc(d.mode||'unknown')+'. Only verified provider results are presented as live partner offers.</div>');
      }
      return d;
    }catch(_){return {ok:false,reason:'api-error'}}
  }

  async function travelTool(){
    const runtime=await loadDzRuntimeProviders(false);
    const key='dealzyTravelSearches';
    let saved=[];
    try{saved=JSON.parse(localStorage.getItem(key)||'[]')}catch(_){}
    const recent=saved.slice(-5).reverse();

    showPanel(`<h3>🧳 Travel Hub</h3>
      <div class="dz-small">Plan hotels, flights, cars and things to do. Dealzy saves your search details privately and opens official providers when public API access is not yet available.</div>

      ${runtime.expedia!==false?'<div class="dz-result" style="margin:12px 0"><b>Expedia · Dealzy AI Travel Shop</b><br><span class="dz-small">Hotels, packages and travel inspiration through Dealzy\'s official Expedia creator shop.</span><br><a class="dz-action" id="dzExpediaShop" href="https://expedia.com/shop/dealzy-ai" target="_blank" rel="noopener noreferrer sponsored" style="display:inline-block;text-decoration:none;margin-top:9px">Open Expedia Dealzy Shop</a></div>':''}

      <div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0">
        ${runtime.booking!==false?'<button class="dz-action alt" data-travel-tab="hotel">🏨 Hotels</button><button class="dz-action alt" data-travel-tab="car">🚗 Cars</button><button class="dz-action alt" data-travel-tab="activity">🎟️ Things to do</button>':''}
        ${runtime.skyscanner!==false?'<button class="dz-action alt" data-travel-tab="flight">✈️ Flights</button>':''}
      </div>

      <div id="dzTravelForm"></div>

      <div class="dz-result">
        <b>Recent travel searches</b><br>
        ${recent.length?recent.map(x=>'<div style="margin:7px 0">'+esc((x.kind||'travel').toUpperCase())+' · '+esc(x.summary||'Saved search')+'</div>').join(''):'No saved travel searches yet.'}
      </div>

      <div class="dz-small" style="margin-top:10px">
        Expedia is connected through Dealzy's official Travel Creator Shop. Booking.com and Skyscanner remain provider clickouts. External prices are never presented as native Dealzy inventory unless returned by an approved live API.
      </div>`);

    const form=panel.querySelector('#dzTravelForm');
    const expediaLink=panel.querySelector('#dzExpediaShop');
    if(expediaLink) expediaLink.onclick=()=>recordPartnerClick('Expedia','Dealzy AI Travel Shop');

    const saveSearch=(kind,data,summary)=>{
      saved.push({kind,data,summary,createdAt:new Date().toISOString()});
      localStorage.setItem(key,JSON.stringify(saved.slice(-30)));
      queueCloudSync();
    };

    const renderHotel=()=>{
      if(runtime.booking===false){form.innerHTML='<div class="dz-result">Booking.com is temporarily disabled by Dealzy Admin.</div>';return;}
      form.innerHTML=`
        <div class="dz-form">
          <label>Destination<input id="dzHotelDest" placeholder="Miami"></label>
          <label>Adults<input id="dzHotelAdults" type="number" min="1" value="2"></label>
          <label>Check-in<input id="dzHotelIn" type="date"></label>
          <label>Check-out<input id="dzHotelOut" type="date"></label>
        </div>
        <button class="dz-action" id="dzHotelGo">Open Booking.com</button>`;
      form.querySelector('#dzHotelGo').onclick=()=>{
        const dest=form.querySelector('#dzHotelDest').value.trim();
        const adults=Math.max(1,Number(form.querySelector('#dzHotelAdults').value)||2);
        const cin=form.querySelector('#dzHotelIn').value;
        const cout=form.querySelector('#dzHotelOut').value;
        if(!dest||!cin||!cout){showPanel('<h3>🏨 Hotels</h3><div class="dz-result">Enter destination, check-in and check-out dates.</div>');return}
        saveSearch('hotel',{dest,adults,cin,cout},dest+' · '+cin+' → '+cout);
        const p=new URLSearchParams({ss:dest,checkin:cin,checkout:cout,group_adults:String(adults),no_rooms:'1'});
        recordPartnerClick('Booking.com','Hotel search · '+dest);
        window.open('https://www.booking.com/searchresults.html?'+p.toString(),'_blank','noopener,noreferrer');
      };
    };

    const renderFlight=()=>{
      if(runtime.skyscanner===false){form.innerHTML='<div class="dz-result">Skyscanner is temporarily disabled by Dealzy Admin.</div>';return;}
      form.innerHTML=`
        <div class="dz-form">
          <label>From (IATA)<input id="dzFlightFrom" maxlength="3" placeholder="MIA"></label>
          <label>To (IATA)<input id="dzFlightTo" maxlength="3" placeholder="NYC"></label>
          <label>Depart<input id="dzFlightOut" type="date"></label>
          <label>Return<input id="dzFlightBack" type="date"></label>
        </div>
        <button class="dz-action" id="dzFlightGo">Open Skyscanner</button>`;
      form.querySelector('#dzFlightGo').onclick=()=>{
        const o=form.querySelector('#dzFlightFrom').value.trim().toUpperCase();
        const d=form.querySelector('#dzFlightTo').value.trim().toUpperCase();
        const out=form.querySelector('#dzFlightOut').value;
        const back=form.querySelector('#dzFlightBack').value;
        if(!/^[A-Z]{3}$/.test(o)||!/^[A-Z]{3}$/.test(d)||!out){showPanel('<h3>✈️ Flights</h3><div class="dz-result">Enter valid 3-letter airport/city codes and a departure date.</div>');return}
        saveSearch('flight',{origin:o,destination:d,out,back},o+' → '+d+' · '+out+(back?' → '+back:''));
        const p=new URLSearchParams({mediaPartnerId:'2850210',utm_term:'skyscanner_chatgpt_app_data',origin:o,destination:d,outboundDate:out,cabinclass:'economy'});
        if(back) p.set('inboundDate',back);
        recordPartnerClick('Skyscanner','Flight search · '+o+' → '+d);
        window.open('https://skyscanner.net/g/referrals/v1/flights/day-view?'+p.toString(),'_blank','noopener,noreferrer');
      };
    };

    const renderCar=()=>{
      if(runtime.booking===false){form.innerHTML='<div class="dz-result">Booking.com is temporarily disabled by Dealzy Admin.</div>';return;}
      form.innerHTML=`
        <div class="dz-form">
          <label>Pick-up location<input id="dzCarPlace" placeholder="Miami Airport"></label>
          <label>Pick-up date<input id="dzCarIn" type="date"></label>
          <label>Drop-off date<input id="dzCarOut" type="date"></label>
          <label>Driver age<input id="dzCarAge" type="number" min="19" max="99" value="30"></label>
        </div>
        <button class="dz-action" id="dzCarGo">Open Booking.com Cars</button>`;
      form.querySelector('#dzCarGo').onclick=()=>{
        const place=form.querySelector('#dzCarPlace').value.trim();
        const cin=form.querySelector('#dzCarIn').value;
        const cout=form.querySelector('#dzCarOut').value;
        const age=Math.max(19,Number(form.querySelector('#dzCarAge').value)||30);
        if(!place||!cin||!cout){showPanel('<h3>🚗 Cars</h3><div class="dz-result">Enter pick-up location and rental dates.</div>');return}
        saveSearch('car',{place,cin,cout,age},place+' · '+cin+' → '+cout);
        recordPartnerClick('Booking.com','Car search · '+place);
        window.open('https://www.booking.com/cars/','_blank','noopener,noreferrer');
      };
    };

    const renderActivity=()=>{
      if(runtime.booking===false){form.innerHTML='<div class="dz-result">Booking.com is temporarily disabled by Dealzy Admin.</div>';return;}
      form.innerHTML=`
        <div class="dz-form">
          <label>Destination<input id="dzActDest" placeholder="Miami"></label>
          <label>Date<input id="dzActDate" type="date"></label>
        </div>
        <button class="dz-action" id="dzActGo">Open Booking.com Attractions</button>`;
      form.querySelector('#dzActGo').onclick=()=>{
        const dest=form.querySelector('#dzActDest').value.trim();
        const date=form.querySelector('#dzActDate').value;
        if(!dest||!date){showPanel('<h3>🎟️ Things to do</h3><div class="dz-result">Enter destination and date.</div>');return}
        saveSearch('activity',{dest,date},dest+' · '+date);
        recordPartnerClick('Booking.com','Attractions · '+dest);
        window.open('https://www.booking.com/attractions/','_blank','noopener,noreferrer');
      };
    };

    panel.querySelectorAll('[data-travel-tab]').forEach(b=>b.onclick=()=>{
      ({hotel:renderHotel,flight:renderFlight,car:renderCar,activity:renderActivity}[b.dataset.travelTab]||renderHotel)();
    });
    if(runtime.booking!==false) renderHotel();
    else if(runtime.skyscanner!==false) renderFlight();
    else form.innerHTML='<div class="dz-result">Travel clickout providers are temporarily disabled by Dealzy Admin.</div>';
  }

  function watchTool(){
    const key='dealzyPriceWatch';
    let items=JSON.parse(localStorage.getItem(key)||'[]');
    showPanel(`<h3>📉 Price Watch</h3>
      <div class="dz-form">
        <label>Item / deal<input id="dzWatchName" placeholder="Hotel, headphones, spa…"></label>
        <label>Target price<input id="dzWatchPrice" type="number" min="0" placeholder="99"></label>
      </div>
      <button class="dz-action" id="dzWatchSave">Add watch</button>
      <button class="dz-action alt" id="dzWatchCheck">Check prices now</button>
      <div class="dz-result"><b>${items.length} watch${items.length===1?'':'es'}</b><br>${items.length?items.map((x,i)=>'<span class="dz-chip">'+esc(x.name)+' ≤ '+money(x.target)+' <button data-del-watch="'+i+'" style="border:0;background:none;cursor:pointer">×</button></span>').join(''):'Nothing watched yet.'}</div>
      <div class="dz-small" style="margin-top:9px">Price observations are stored in your private cloud history and can use verified live sources as they are available.</div>`);
    panel.querySelector('#dzWatchSave').onclick=()=>{
      const name=panel.querySelector('#dzWatchName').value.trim();
      const target=Number(panel.querySelector('#dzWatchPrice').value)||0;
      if(!name) return;
      items.push({name,target,createdAt:new Date().toISOString()});
      localStorage.setItem(key,JSON.stringify(items)); queueCloudSync(); watchTool();
    };
    panel.querySelector('#dzWatchCheck').onclick=()=>checkPriceWatches(true);
    panel.querySelectorAll('[data-del-watch]').forEach(b=>b.onclick=()=>{
      items.splice(Number(b.dataset.delWatch),1); localStorage.setItem(key,JSON.stringify(items)); queueCloudSync(); watchTool();
    });
  }

  async function notificationsTool(){
    const session=await getCloudSession();
    if(!session||!session.access_token){
      showPanel('<h3>📬 Notifications</h3><div class="dz-result">Sign in to My Dealzy to use your private notification center.</div>');
      return;
    }
    showPanel('<h3>📬 Notifications</h3><div class="dz-result">Loading…</div>');
    try{
      const r=await fetch('/api/notifications',{headers:{'Authorization':'Bearer '+session.access_token}});
      const d=await r.json();
      const rows=d.notifications||[];
      showPanel('<h3>📬 Notifications</h3><div class="dz-result">'+
        (rows.length?rows.map(n=>'<div style="padding:8px 0;border-bottom:1px solid #e9ecf2"><b>'+esc(n.title)+'</b><br>'+esc(n.body)+'<br><span class="dz-small">'+new Date(n.created_at).toLocaleString()+'</span></div>').join(''):'No notifications yet.')+
        '</div><button class="dz-action alt" id="dzNotifRefresh">Refresh</button>');
      const b=panel.querySelector('#dzNotifRefresh'); if(b) b.onclick=notificationsTool;
    }catch(_){
      showPanel('<h3>📬 Notifications</h3><div class="dz-result">Notification service is temporarily unavailable.</div>');
    }
  }

  function couponsTool(){
    const key='dealzyCoupons';
    let items=JSON.parse(localStorage.getItem(key)||'[]');
    showPanel(`<h3>🎟️ Coupon Vault</h3>
      <div class="dz-form">
        <label>Store / brand<input id="dzCouponStore" placeholder="Store name"></label>
        <label>Code<input id="dzCouponCode" placeholder="SAVE20"></label>
        <label>Expiry<input id="dzCouponExpiry" type="date"></label>
      </div>
      <button class="dz-action" id="dzCouponSave">Save coupon</button>
      <div class="dz-result">${items.length?items.map((x,i)=>'<div style="margin:7px 0"><b>'+esc(x.store)+'</b> · <code>'+esc(x.code)+'</code>'+(x.expiry?' · expires '+esc(x.expiry):'')+' <button data-del-coupon="'+i+'" style="border:0;background:none;cursor:pointer">×</button></div>').join(''):'No saved coupons yet.'}</div>`);
    panel.querySelector('#dzCouponSave').onclick=()=>{
      const store=panel.querySelector('#dzCouponStore').value.trim();
      const code=panel.querySelector('#dzCouponCode').value.trim();
      const expiry=panel.querySelector('#dzCouponExpiry').value;
      if(!store||!code) return;
      items.push({store,code,expiry,createdAt:new Date().toISOString()});
      localStorage.setItem(key,JSON.stringify(items)); queueCloudSync(); couponsTool();
    };
    panel.querySelectorAll('[data-del-coupon]').forEach(b=>b.onclick=()=>{
      items.splice(Number(b.dataset.delCoupon),1); localStorage.setItem(key,JSON.stringify(items)); queueCloudSync(); couponsTool();
    });
  }

  function backupTool(){
    showPanel(`<h3>💾 Backup & Restore</h3>
      <button class="dz-action" id="dzExport">Export my Dealzy data</button>
      <button class="dz-action alt" id="dzImport">Restore from backup</button>
      <input id="dzImportFile" type="file" accept="application/json" style="display:none">
      <div class="dz-small" style="margin-top:10px">Exports only Dealzy data stored locally in this browser. It does not include passwords or payment data.</div>`);
    panel.querySelector('#dzExport').onclick=()=>{
      const keys=['dealzyFavs','dealzyTrip','dealzyCoords','dealzyMarket','dealzyLocale','dealzyOnboarding','dealzyLiveSaved','dealzyPartnerClicks','dealzyToolPrefs','dealzyAlerts','dealzyLocalProfile','dealzyPriceWatch','dealzyCoupons','dealzyTravelSearches'];
      const data={version:1,exportedAt:new Date().toISOString(),data:{}};
      keys.forEach(k=>{const v=localStorage.getItem(k); if(v!==null) data.data[k]=v;});
      const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='dealzy-backup.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    };
    const file=panel.querySelector('#dzImportFile');
    panel.querySelector('#dzImport').onclick=()=>file.click();
    file.onchange=async()=>{
      const f=file.files&&file.files[0]; if(!f) return;
      try{
        const parsed=JSON.parse(await f.text());
        if(!parsed||!parsed.data) throw new Error('bad');
        Object.entries(parsed.data).forEach(([k,v])=>localStorage.setItem(k,String(v)));
        showPanel('<h3>💾 Backup & Restore</h3><div class="dz-result"><b>Backup restored.</b><br>Reload Dealzy to apply the restored data.</div>');
      }catch(_){showPanel('<h3>💾 Backup & Restore</h3><div class="dz-result">This file is not a valid Dealzy backup.</div>')}
    };
  }

  function splitTool(){
    showPanel(`<h3>🧾 Split & Tip</h3>
      <div class="dz-form">
        <label>Bill amount<input id="dzBill" type="number" min="0" step="0.01" value="100"></label>
        <label>Tip %<input id="dzTip" type="number" min="0" step="1" value="20"></label>
        <label>People<input id="dzPeople" type="number" min="1" step="1" value="2"></label>
      </div>
      <button class="dz-action" id="dzSplit">Calculate</button>
      <div id="dzSplitResult"></div>`);
    panel.querySelector('#dzSplit').onclick=()=>{
      const bill=Number(panel.querySelector('#dzBill').value)||0;
      const tipPct=Number(panel.querySelector('#dzTip').value)||0;
      const people=Math.max(1,Number(panel.querySelector('#dzPeople').value)||1);
      const tip=bill*(tipPct/100), total=bill+tip, each=total/people;
      panel.querySelector('#dzSplitResult').innerHTML='<div class="dz-result"><b>Total '+money(total)+'</b><br>Tip '+money(tip)+' · '+people+' people · <b>'+money(each)+' each</b></div>';
    };
  }

  function providerSearchTool(){
    showPanel(`<h3>✨ Provider Search</h3>
      <div class="dz-form">
        <label>What are you looking for?<input id="dzProviderQ" placeholder="restaurant, spa, concert, cruise"></label>
        <label>Category
          <select id="dzProviderCategory">
            <option value="All">Activities & events · Ticketmaster / Viator</option>
            <option value="Food & Drink">Food & Drink · Yelp</option>
            <option value="Spa & Beauty">Spa & Beauty · Yelp</option>
            <option value="Things to Do">Things to Do · Ticketmaster / Viator</option>
            <option value="Travel">Travel & experiences · Viator</option>
          </select>
        </label>
        <label>Maximum price<input id="dzProviderMax" type="number" min="1" placeholder="Optional"></label>
      </div>
      <button class="dz-action" id="dzProviderGo">Search Dealzy</button>
      <div id="dzProviderResult"></div>
      <div class="dz-small" style="margin-top:9px">Dealzy combines verified live sources. Yelp places without an exact price are shown as places, not fake deals.</div>`);
    panel.querySelector('#dzProviderGo').onclick=async()=>{
      const q=panel.querySelector('#dzProviderQ').value.trim();
      const category=panel.querySelector('#dzProviderCategory').value;
      const max=Number(panel.querySelector('#dzProviderMax').value)||0;
      const out=panel.querySelector('#dzProviderResult');
      out.innerHTML='<div class="dz-result">Searching live sources…</div>';
      try{
        let market={country:'US',city:'Miami',currency:'USD'};
        try{market={...market,...(JSON.parse(localStorage.getItem('dealzyMarket')||'null')||{})};}catch(_){}
        const p=new URLSearchParams({q,category,country:market.country||'US',city:market.city||'Miami'});
        if(max) p.set('maxPrice',String(max));
        const coords=getCoords();
        if(coords){p.set('lat',String(coords.lat));p.set('lng',String(coords.lng));p.set('radius',String(prefs.radius||10));}
        const r=await fetch('/api/search?'+p.toString(),{headers:{'Accept':'application/json'}});
        if(!r.ok) throw new Error('search failed');
        const data=await r.json();
        const providerNames=(data.providers||[]).filter(x=>x.status==='live').map(x=>x.name);
        const modeLabel=data.mode==='demo-fallback'?'No live provider result':(providerNames.length?'Live · '+providerNames.join(' + '):'Live source');
        const liveResults=data.mode==='demo-fallback'?[]:(data.results||[]);
        const rows=liveResults.map(d=>{
          const hasPrice=Number(d.price)>0;
          const priceText=hasPrice?money(d.price):(d.priceLabel?esc(d.priceLabel):'Price on provider');
          const rating=d.rating?('⭐ '+esc(d.rating)+(d.reviewCount?' ('+esc(d.reviewCount)+')':'')):'';
          const meta=[priceText,esc(d.place||''),rating].filter(Boolean).join(' · ');
          const dealBits=[];
          if(Number(d.savings)>0) dealBits.push('Save '+money(d.savings));
          if(Number(d.discountPct)>0) dealBits.push(d.discountPct+'% off');
          const source=esc(d.source||d.provider||data.mode||'Dealzy');
          const action=d.partnerUrl?'<a href="'+esc(d.partnerUrl)+'" target="_blank" rel="noopener noreferrer" class="dz-action alt" data-track-provider="'+source+'" data-track-title="'+esc(d.title)+'" style="display:inline-block;margin-top:8px;text-decoration:none">Open on '+source+'</a>':'';
          return '<div class="dz-result" style="margin:8px 0"><b>'+esc(d.title)+'</b><br><span class="dz-small">'+meta+'</span><br><span class="dz-small"><b>'+source+'</b>'+(dealBits.length?' · '+dealBits.join(' · '):'')+'</span>'+action+'</div>';
        }).join('');
        out.innerHTML='<div class="dz-small" style="margin:10px 0"><b>'+esc(modeLabel)+'</b> · '+(data.count||0)+' result'+((data.count||0)===1?'':'s')+'</div>'+
          (rows||'<div class="dz-result">No matching result found.</div>');
        out.querySelectorAll('[data-track-provider]').forEach(a=>{
          a.addEventListener('click',()=>recordPartnerClick(
            a.getAttribute('data-track-provider')||'Partner',
            a.getAttribute('data-track-title')||'Provider result',
            {source:'provider-search'}
          ));
        });
      }catch(_){out.innerHTML='<div class="dz-result">Dealzy search API is temporarily unavailable. Please try again shortly.</div>'}
    };
  }

  async function providersTool(){
    showPanel('<h3>🔌 Deal Sources</h3><div id="dzSources"><div class="dz-result">Checking sources…</div></div>');
    const box=panel.querySelector('#dzSources');
    try{
      const r=await fetch('/api/providers',{cache:'no-store'});
      if(!r.ok) throw new Error('providers unavailable');
      const data=await r.json();
      const rows=(data.providers||[]).filter(x=>x.name!=='Dealzy Demo Inventory').map(x=>{
        const status=String(x.status||'unknown');
        const isLive=/active|configured|live/i.test(status)&&!/pending/i.test(status);
        const label=status.replace(/-/g,' ').toUpperCase();
        const note={
          'affiliate-api':'Experiences / activities API',
          'events-api':'Concerts, sports & events API',
          'local-places-api':'Restaurants, spa & local places API',
          'travel':'Travel source / clickout',
          'fallback':'Internal safety fallback',
          'cloud':'Dealzy cloud engine',
          'device':'Device capability'
        }[x.kind]||String(x.kind||'Provider');
        return '<div class="dz-provider"><div><b>'+esc(x.name)+'</b><div class="dz-small">'+esc(note)+'</div></div><span class="dz-status '+(isLive?'live':'')+'">'+esc(label)+'</span></div>';
      }).join('');
      const stats=partnerClickStats();
      const statRows=Object.entries(stats.counts).sort((a,b)=>b[1]-a[1]).map(([name,count])=>
        '<span class="dz-chip">'+esc(name)+' · '+count+'</span>'
      ).join('');
      box.innerHTML=
        '<div class="dz-result" style="margin-bottom:12px"><b>Partner click analytics</b><br>'+
        '<span class="dz-small">'+stats.total+' tracked click'+(stats.total===1?'':'s')+' on this Dealzy profile.</span><br>'+
        (statRows||'<span class="dz-small">No partner clicks tracked yet.</span>')+
        '</div>'+rows+
        '<div class="dz-small" style="margin-top:10px">'+esc(data.note||'Dealzy only marks live upstream results as live.')+'</div>';
    }catch(_){
      box.innerHTML='<div class="dz-result">Source status is temporarily unavailable.</div>';
    }
  }

  let deferredInstall = null;
  let installedThisSession = false;
  const installFr=()=>window.DealzyI18n?.getLocale()==='fr';
  const isInstalled=()=>installedThisSession||window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true;

  function closeInstallGuide(){
    const guide=document.getElementById('dealzyInstallGuide');
    if(guide) guide.remove();
    document.removeEventListener('keydown',onInstallGuideKeydown);
  }
  function onInstallGuideKeydown(e){if(e.key==='Escape') closeInstallGuide();}

  function openInstallGuide(){
    closeInstallGuide();
    wrap.classList.remove('open');
    panel.classList.remove('open');
    const fr=installFr();
    const ua=navigator.userAgent||'';
    const ios=/iPhone|iPad|iPod/i.test(ua);
    const android=/Android/i.test(ua);
    const embedded=/; wv\)|Instagram|FBAN|FBAV/i.test(ua);
    const steps=ios
      ? (fr?['Ouvrez Dealzy dans Safari.','Touchez Partager, puis « Sur l’écran d’accueil ».','Touchez Ajouter.']:['Open Dealzy in Safari.','Tap Share, then “Add to Home Screen”.','Tap Add.'])
      : android
        ? (fr?[...(embedded?['Ouvrez cette page dans Chrome.']:[]),'Dans Chrome, touchez le menu ⋮.','Choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil ».']:[...(embedded?['Open this page in Chrome.']:[]),'In Chrome, tap the ⋮ menu.','Choose “Install app” or “Add to Home screen”.'])
        : (fr?['Ouvrez le menu de votre navigateur.','Choisissez « Installer Dealzy » ou « Ajouter à l’écran d’accueil ».']:['Open your browser menu.','Choose “Install Dealzy” or “Add to Home screen”.']);
    const guide=document.createElement('div');
    guide.id='dealzyInstallGuide';
    guide.className='dz-install-guide';
    guide.innerHTML='<section role="dialog" aria-modal="true" aria-labelledby="dzInstallGuideTitle">'+
      '<h2 id="dzInstallGuideTitle">'+(fr?'Installer Dealzy':'Install Dealzy')+'</h2>'+
      '<p>'+(fr?'Ajoutez Dealzy à votre écran d’accueil pour y accéder comme une application.':'Add Dealzy to your home screen to open it like an app.')+'</p>'+
      '<ol>'+steps.map(step=>'<li>'+esc(step)+'</li>').join('')+'</ol>'+
      '<button type="button">'+(fr?'Compris':'Got it')+'</button></section>';
    document.body.appendChild(guide);
    guide.querySelector('button').onclick=closeInstallGuide;
    guide.onclick=e=>{if(e.target===guide) closeInstallGuide();};
    document.addEventListener('keydown',onInstallGuideKeydown);
    guide.querySelector('button').focus();
  }

  async function requestInstall(){
    if(isInstalled()) return;
    if(!deferredInstall){openInstallGuide();return;}
    const prompt=deferredInstall;
    deferredInstall=null;
    try{
      await prompt.prompt();
      const choice=await prompt.userChoice;
      if(choice?.outcome==='accepted'){
        installedThisSession=true;
        renderInstallCtas();
      }
    }catch(_){openInstallGuide();}
  }

  function renderInstallCtas(){
    const oldHome=document.getElementById('dealzyInstallCard');
    const oldProfile=document.getElementById('dealzyInstallProfile');
    if(oldHome) oldHome.remove();
    if(oldProfile) oldProfile.remove();
    if(isInstalled()) return;
    const fr=installFr();
    const home=document.getElementById('homeView');
    let dismissed=false;
    try{dismissed=sessionStorage.getItem('dealzyInstallDismissed')==='1';}catch(_){}
    if(home&&!dismissed){
      const card=document.createElement('section');
      card.id='dealzyInstallCard';
      card.className='dz-install-card';
      card.setAttribute('aria-label',fr?'Installer Dealzy':'Install Dealzy');
      card.innerHTML='<img src="/icon-192.png" alt="" aria-hidden="true">'+
        '<div class="dz-install-copy"><b>'+(fr?'Dealzy sur votre téléphone':'Dealzy on your phone')+'</b><small>'+(fr?'Un accès direct depuis votre écran d’accueil.':'One tap from your home screen.')+'</small></div>'+
        '<button type="button" class="dz-install-action">'+(fr?'Installer':'Install')+'</button>'+
        '<button type="button" class="dz-install-dismiss" aria-label="'+(fr?'Plus tard':'Later')+'">×</button>';
      home.querySelector('.hero')?.insertAdjacentElement('beforebegin',card);
      card.querySelector('.dz-install-action').onclick=requestInstall;
      card.querySelector('.dz-install-dismiss').onclick=()=>{
        try{sessionStorage.setItem('dealzyInstallDismissed','1');}catch(_){}
        card.remove();
      };
    }
    const profile=document.getElementById('profileView');
    const accountCard=profile?.querySelector('.profileCard');
    if(accountCard){
      const card=document.createElement('div');
      card.id='dealzyInstallProfile';
      card.className='profileCard dz-install-profile';
      card.innerHTML='<h3 style="margin-top:0">'+(fr?'Installer Dealzy':'Install Dealzy')+'</h3><p class="meta">'+
        (fr?'Retrouvez Dealzy depuis l’écran d’accueil de votre téléphone.':'Open Dealzy from your phone’s home screen.')+'</p>'+
        '<button type="button">'+(fr?'Installer sur mon appareil':'Install on my device')+'</button>';
      accountCard.insertAdjacentElement('afterend',card);
      card.querySelector('button').onclick=requestInstall;
    }
  }

  window.DealzyInstall={request:requestInstall,openGuide:openInstallGuide,closeGuide:closeInstallGuide};
  window.addEventListener('beforeinstallprompt',e=>{
    e.preventDefault();
    deferredInstall=e;
    renderInstallCtas();
  });
  window.addEventListener('appinstalled',()=>{
    deferredInstall=null;
    installedThisSession=true;
    closeInstallGuide();
    renderInstallCtas();
  });
  document.addEventListener('dealzy:localechange',renderInstallCtas);
  renderInstallCtas();

  async function appTool(){
    showPanel(`<h3>📲 App & Share</h3>
      ${isInstalled()?'<div class="dz-result">'+(installFr()?'Dealzy est déjà installée sur cet appareil.':'Dealzy is already installed on this device.')+'</div>':'<button class="dz-action" id="dzInstall">Install Dealzy</button>'}
      <button class="dz-action alt" id="dzShare">Share Dealzy</button>
      <div class="dz-small" style="margin-top:10px">Install availability depends on your browser. Dealzy includes an offline app shell and live provider connectivity.</div>`);
    const install=panel.querySelector('#dzInstall');
    if(install) install.onclick=requestInstall;
    panel.querySelector('#dzShare').onclick=async()=>{
      let market={country:'US',city:'Miami'};
      try{market={...market,...(JSON.parse(localStorage.getItem('dealzyMarket')||'null')||{})};}catch(_){}
      const isFr=window.DealzyI18n&&window.DealzyI18n.getLocale()==='fr';
      const data={
        title:'Dealzy AI',
        text:isFr
          ? 'Dealzy AI · offres et voyages en direct aux États-Unis et au Canada · '+market.city
          : 'Dealzy AI · live deals and travel across the USA and Canada · '+market.city,
        url:location.href
      };
      if(navigator.share){try{await navigator.share(data)}catch(_){}}
      else {try{await navigator.clipboard.writeText(location.href); showPanel('<h3>📲 App & Share</h3><div class="dz-result">Dealzy link copied.</div>')}catch(_){}}
    };
  }

  wrap.querySelectorAll('[data-tool]').forEach(btn=>btn.onclick=()=>{
    const t=btn.dataset.tool;
    ({compare:compareTool,budget:budgetTool,savings:savingsTool,alerts:alertsTool,notifications:notificationsTool,search:providerSearchTool,nearby:nearbyTool,account:accountTool,planner:plannerTool,travel:travelTool,watch:watchTool,coupons:couponsTool,backup:backupTool,split:splitTool,providers:providersTool,app:appTool}[t]||(()=>{}))();
  });
  window.DealzyOpenAccount=()=>{wrap.classList.add('open');accountTool();};
  const dealzyAccountBtn=document.getElementById('openDealzyAccount');
  if(dealzyAccountBtn) dealzyAccountBtn.onclick=window.DealzyOpenAccount;

  // Quietly check saved watches after the app settles. This creates in-app notifications only when a signed-in user has watches.
  setTimeout(()=>checkPriceWatches(false),3500);

  // PWA shell registration.
  if('serviceWorker' in navigator){
    window.addEventListener('load',async()=>{
      try{
        const reg=await navigator.serviceWorker.register('/sw.js?v=20261001-awin1');
        await reg.update();
      }catch(_){}
    });
  }
})();
