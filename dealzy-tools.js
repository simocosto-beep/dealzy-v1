/* Dealzy V1.2 — Swiss Army tools layer
   Progressive enhancement: keeps the stable V1 UI intact and adds tools without replacing core navigation.
*/
(() => {
  'use strict';

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
  @media(max-width:560px){.dz-tools-grid{grid-template-columns:1fr 1fr}.dz-sheet{padding:14px}.dz-form{grid-template-columns:1fr}.dz-tools-fab{right:12px;bottom:88px}}
  `;

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
  fab.textContent = '🧰 Tools';
  fab.setAttribute('aria-label','Open Dealzy tools');
  document.body.appendChild(fab);

  const wrap = document.createElement('div');
  wrap.className = 'dz-sheet-wrap';
  wrap.innerHTML = `
    <section class="dz-sheet" role="dialog" aria-modal="true" aria-label="Dealzy toolbox">
      <div class="dz-sheet-head">
        <div><h2>Dealzy Toolbox</h2><div class="dz-small">Compare, plan, save and get alerts from one place.</div></div>
        <button class="dz-close" type="button" aria-label="Close">×</button>
      </div>
      <div class="dz-tools-grid">
        <button class="dz-tool" data-tool="compare"><span class="emoji">⚖️</span><b>Smart Compare</b><span>Compare your saved deals side by side.</span></button>
        <button class="dz-tool" data-tool="budget"><span class="emoji">🎯</span><b>Budget Finder</b><span>Find options that fit your category and budget.</span></button>
        <button class="dz-tool" data-tool="savings"><span class="emoji">💸</span><b>Savings Calculator</b><span>See discount percentage and money saved.</span></button>
        <button class="dz-tool" data-tool="alerts"><span class="emoji">🔔</span><b>Deal Alerts</b><span>Save a watch rule for future matching deals.</span></button>
        <button class="dz-tool" data-tool="search"><span class="emoji">✨</span><b>Provider Search</b><span>Search through the Dealzy server gateway.</span></button>
        <button class="dz-tool" data-tool="nearby"><span class="emoji">🗺️</span><b>Nearby Map</b><span>Open a map centered on your current location.</span></button>
        <button class="dz-tool" data-tool="account"><span class="emoji">👤</span><b>My Dealzy</b><span>Manage your local profile and sync readiness.</span></button>
        <button class="dz-tool" data-tool="split"><span class="emoji">🧾</span><b>Split & Tip</b><span>Split a bill and calculate tips instantly.</span></button>
        <button class="dz-tool" data-tool="providers"><span class="emoji">🔌</span><b>Sources</b><span>See which deal providers are active or pending.</span></button>
        <button class="dz-tool" data-tool="app"><span class="emoji">📲</span><b>App & Share</b><span>Install Dealzy or share it with someone.</span></button>
      </div>
      <div id="dzPanel" class="dz-panel"></div>
    </section>`;
  document.body.appendChild(wrap);

  const panel = wrap.querySelector('#dzPanel');
  const close = () => { wrap.classList.remove('open'); panel.classList.remove('open'); };
  fab.onclick = () => wrap.classList.add('open');
  wrap.querySelector('.dz-close').onclick = close;
  wrap.onclick = e => { if (e.target === wrap) close(); };

  function getDeals(){
    try { return Array.isArray(deals) ? deals : []; } catch (_) { return []; }
  }
  function getFavorites(){
    try { return state && state.favorites ? [...state.favorites] : JSON.parse(localStorage.getItem('dealzyFavs')||'[]'); } catch (_) { return []; }
  }
  function money(v){ return '$'+Number(v||0).toFixed(0); }
  function esc(s){ return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function showPanel(html){ panel.innerHTML = html; panel.classList.add('open'); panel.scrollIntoView({behavior:'smooth',block:'nearest'}); }

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
      row('Price',d=>'<b>'+money(d.price)+'</b>')+
      row('You save',d=>money(d.old-d.price))+
      row('Discount',d=>Math.round((1-d.price/d.old)*100)+'%')+
      row('Rating',d=>esc(d.rating||'—'))+
      '<div class="dz-small" style="margin-top:10px">Comparison is factual and based on the current deal data. Partner terms may change.</div>');
  }

  function budgetTool(){
    const cats = ['All','Food & Drink','Things to Do','Spa & Beauty','Travel','Family'];
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
      localStorage.setItem(stateKey,JSON.stringify(prefs));
      const list=getDeals().filter(d=>(prefs.category==='All'||d.cat===prefs.category)&&d.price<=prefs.budget).sort((a,b)=>a.price-b.price);
      panel.querySelector('#dzBudgetResult').innerHTML='<div class="dz-result">'+(list.length?list.map(d=>'<div style="margin:6px 0"><b>'+esc(d.title)+'</b> · '+money(d.price)+' · '+esc(d.place)+'</div>').join(''):'No current demo deal matches this budget.')+'</div>';
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
      localStorage.setItem(alertsKey,JSON.stringify(alerts));
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

  function accountTool(){
    const key='dealzyLocalProfile';
    const profile=JSON.parse(localStorage.getItem(key)||'{"name":"","email":""}');
    showPanel(`<h3>👤 My Dealzy</h3>
      <div class="dz-form">
        <label>Display name<input id="dzName" value="${esc(profile.name||'')}" placeholder="Your name"></label>
        <label>Email<input id="dzEmail" type="email" value="${esc(profile.email||'')}" placeholder="you@example.com"></label>
      </div>
      <button class="dz-action" id="dzSaveProfile">Save on this device</button>
      <div class="dz-result"><b>Cloud sync: not connected yet</b><br><span class="dz-small">Favorites, trips and alerts currently stay on this browser. This profile is a local foundation only; no fake cloud account is created.</span></div>`);
    panel.querySelector('#dzSaveProfile').onclick=()=>{
      const name=panel.querySelector('#dzName').value.trim();
      const email=panel.querySelector('#dzEmail').value.trim();
      localStorage.setItem(key,JSON.stringify({name,email,updatedAt:new Date().toISOString()}));
      showPanel('<h3>👤 My Dealzy</h3><div class="dz-result"><b>Saved locally.</b><br>Your profile foundation is ready. Cloud authentication will be connected as a separate backend step.</div>');
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
        <label>What are you looking for?<input id="dzProviderQ" placeholder="dinner, spa, cruise"></label>
        <label>Maximum price<input id="dzProviderMax" type="number" min="1" value="100"></label>
      </div>
      <button class="dz-action" id="dzProviderGo">Search Dealzy</button>
      <div id="dzProviderResult"></div>
      <div class="dz-small" style="margin-top:9px">This uses Dealzy's provider gateway. It currently returns the verified demo fallback until approved live sources are connected.</div>`);
    panel.querySelector('#dzProviderGo').onclick=async()=>{
      const q=panel.querySelector('#dzProviderQ').value.trim();
      const max=Number(panel.querySelector('#dzProviderMax').value)||0;
      const out=panel.querySelector('#dzProviderResult');
      out.innerHTML='<div class="dz-result">Searching…</div>';
      try{
        const p=new URLSearchParams({q});
        if(max) p.set('maxPrice',String(max));
        const coords=getCoords();
        if(coords){p.set('lat',String(coords.lat));p.set('lng',String(coords.lng));p.set('radius',String(prefs.radius||10));}
        const r=await fetch('/api/search?'+p.toString(),{headers:{'Accept':'application/json'}});
        if(!r.ok) throw new Error('search failed');
        const data=await r.json();
        out.innerHTML='<div class="dz-result">'+(data.results&&data.results.length
          ? data.results.map(d=>'<div style="margin:8px 0"><b>'+esc(d.title)+'</b> · '+money(d.price)+' · '+esc(d.place||'')+(d.distanceMiles!=null?' · '+d.distanceMiles.toFixed(1)+' mi away':'')+'<br><span class="dz-small">Save '+money(d.savings||0)+' · '+(d.discountPct||0)+'% off · '+esc(d.source||data.mode||'Dealzy')+'</span></div>').join('')
          : 'No matching deal found.')+'</div>';
      }catch(_){out.innerHTML='<div class="dz-result">Dealzy search API is temporarily unavailable. The main app still works with local fallback data.</div>'}
    };
  }

  async function providersTool(){
    let api='CHECKING';
    try{const r=await fetch('/api/health',{cache:'no-store'}); const h=await r.json(); api=h&&h.ok?'ACTIVE':'OFFLINE';}catch(_){api='OFFLINE'}
    showPanel(`<h3>🔌 Deal Sources</h3>
      <div class="dz-provider"><div><b>Dealzy Demo Inventory</b><div class="dz-small">Current fallback dataset</div></div><span class="dz-status live">ACTIVE</span></div>
      <div class="dz-provider"><div><b>Dealzy Search API</b><div class="dz-small">Server-side provider gateway</div></div><span class="dz-status ${api==='ACTIVE'?'live':''}">${api}</span></div>
      <div class="dz-provider"><div><b>Browser Location</b><div class="dz-small">Used with user permission</div></div><span class="dz-status live">ACTIVE</span></div>
      <div class="dz-provider"><div><b>Groupon / Affiliate feed</b><div class="dz-small">Adapter ready; credentials required</div></div><span class="dz-status">PENDING</span></div>
      <div class="dz-provider"><div><b>CJ Affiliate</b><div class="dz-small">Adapter slot prepared</div></div><span class="dz-status">PENDING</span></div>
      <div class="dz-provider"><div><b>Travel / Tickets providers</b><div class="dz-small">Planned provider modules</div></div><span class="dz-status">NEXT</span></div>
      <div class="dz-small" style="margin-top:10px">Dealzy will keep a unified result model so new providers can be added without redesigning the app.</div>`);
  }

  let deferredInstall = null;
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;});
  async function appTool(){
    showPanel(`<h3>📲 App & Share</h3>
      <button class="dz-action" id="dzInstall">Install Dealzy</button>
      <button class="dz-action alt" id="dzShare">Share Dealzy</button>
      <div class="dz-small" style="margin-top:10px">Install availability depends on your browser. Dealzy V1.3 also includes an offline app shell.</div>`);
    panel.querySelector('#dzInstall').onclick=async()=>{
      if(deferredInstall){deferredInstall.prompt();try{await deferredInstall.userChoice}catch(_){} deferredInstall=null;}
      else showPanel('<h3>📲 Install Dealzy</h3><div class="dz-result">Use your browser menu → “Add to Home screen” or “Install app”.</div>');
    };
    panel.querySelector('#dzShare').onclick=async()=>{
      const data={title:'Dealzy AI',text:'Amazing Deals. Smarter Choices.',url:location.href};
      if(navigator.share){try{await navigator.share(data)}catch(_){}}
      else {try{await navigator.clipboard.writeText(location.href); showPanel('<h3>📲 App & Share</h3><div class="dz-result">Dealzy link copied.</div>')}catch(_){}}
    };
  }

  wrap.querySelectorAll('[data-tool]').forEach(btn=>btn.onclick=()=>{
    const t=btn.dataset.tool;
    ({compare:compareTool,budget:budgetTool,savings:savingsTool,alerts:alertsTool,search:providerSearchTool,nearby:nearbyTool,account:accountTool,split:splitTool,providers:providersTool,app:appTool}[t]||(()=>{}))();
  });

  // PWA shell registration.
  if('serviceWorker' in navigator){
    window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
  }
})();