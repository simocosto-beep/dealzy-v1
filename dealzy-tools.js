/* Dealzy V1.2 — Swiss Army tools layer
   Progressive enhancement: keeps the stable V1 UI intact and adds tools without replacing core navigation.
*/
(() => {
  'use strict';

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
  @media(max-width:560px){.dz-tools-grid{grid-template-columns:1fr 1fr}.dz-sheet{padding:14px}.dz-form{grid-template-columns:1fr}.dz-tools-fab{right:12px;bottom:88px}}
  `;

  const CLOUD_KEYS=['dealzyFavs','dealzyTrip','dealzyCoords','dealzyToolPrefs','dealzyAlerts','dealzyLocalProfile','dealzyPriceWatch','dealzyCoupons','dealzyTravelSearches'];
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
        if(r.ok && fresh.access_token){
          fresh.expires_at=Math.floor(Date.now()/1000)+Number(fresh.expires_in||3600);
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
        <button class="dz-tool" data-tool="account"><span class="emoji">👤</span><b>My Dealzy</b><span>Manage your local profile and sync readiness.</span></button>
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
      localStorage.setItem(stateKey,JSON.stringify(prefs)); queueCloudSync();
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
    const profile=JSON.parse(localStorage.getItem(profileKey)||'{"name":"","email":""}');
    const session=JSON.parse(localStorage.getItem(sessionKey)||'null');
    let configured=false;
    try{const r=await fetch('/api/cloud-status',{cache:'no-store'}); const s=await r.json(); configured=!!s.configured;}catch(_){}
    if(!configured){
      showPanel(`<h3>👤 My Dealzy</h3>
        <div class="dz-form">
          <label>Display name<input id="dzName" value="${esc(profile.name||'')}" placeholder="Your name"></label>
          <label>Email<input id="dzEmail" type="email" value="${esc(profile.email||'')}" placeholder="you@example.com"></label>
        </div>
        <button class="dz-action" id="dzSaveProfile">Save on this device</button>
        <div class="dz-result"><b>Cloud sync: ready but not connected</b><br><span class="dz-small">Supabase support is built into Dealzy. Once the cloud project is connected, this screen will switch to real signup/login and sync.</span></div>`);
      panel.querySelector('#dzSaveProfile').onclick=()=>{
        const name=panel.querySelector('#dzName').value.trim();
        const email=panel.querySelector('#dzEmail').value.trim();
        localStorage.setItem(profileKey,JSON.stringify({name,email,updatedAt:new Date().toISOString()}));
        accountTool();
      };
      return;
    }

    if(session&&session.access_token){
      showPanel(`<h3>👤 My Dealzy</h3>
        <div class="dz-result"><b>Cloud account connected</b><br><span class="dz-small">${esc(session.user&&session.user.email?session.user.email:(profile.email||'Signed in'))}</span></div>
        <button class="dz-action" id="dzSyncUp">Sync this device → Cloud</button>
        <button class="dz-action alt" id="dzSyncDown">Restore Cloud → this device</button>
        <button class="dz-action alt" id="dzLogout">Sign out</button>
        <div id="dzSyncStatus"></div>`);
      const status=panel.querySelector('#dzSyncStatus');
      const bundle=()=>{
        const keys=['dealzyFavs','dealzyTrip','dealzyCoords','dealzyToolPrefs','dealzyAlerts','dealzyLocalProfile','dealzyPriceWatch','dealzyCoupons','dealzyTravelSearches'];
        const out={}; keys.forEach(k=>{const v=localStorage.getItem(k); if(v!==null) out[k]=v;}); return out;
      };
      panel.querySelector('#dzSyncUp').onclick=async()=>{
        status.innerHTML='<div class="dz-result">Syncing…</div>';
        try{
          const r=await fetch('/api/sync',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token},body:JSON.stringify({data:bundle()})});
          const d=await r.json(); if(!r.ok) throw new Error(d.error||'Sync failed');
          status.innerHTML='<div class="dz-result"><b>Cloud sync complete.</b><br><span class="dz-small">'+(d.structured&&d.structured.ok?'Structured Supabase tables updated.':'Legacy backup saved; structured sync partially pending.')+'</span></div>';
        }catch(e){status.innerHTML='<div class="dz-result">'+esc(e.message||'Sync failed')+'</div>'}
      };
      panel.querySelector('#dzSyncDown').onclick=async()=>{
        status.innerHTML='<div class="dz-result">Restoring…</div>';
        try{
          const r=await fetch('/api/sync',{headers:{'Authorization':'Bearer '+session.access_token}});
          const d=await r.json(); if(!r.ok) throw new Error(d.error||'Restore failed');
          if(d.data) Object.entries(d.data).forEach(([k,v])=>localStorage.setItem(k,String(v)));
          status.innerHTML='<div class="dz-result"><b>Cloud data restored.</b> Reload Dealzy to apply it.</div>';
        }catch(e){status.innerHTML='<div class="dz-result">'+esc(e.message||'Restore failed')+'</div>'}
      };
      panel.querySelector('#dzLogout').onclick=()=>{localStorage.removeItem(sessionKey); accountTool();};
      return;
    }

    showPanel(`<h3>👤 My Dealzy</h3>
      <div class="dz-form">
        <label>Email<input id="dzCloudEmail" type="email" value="${esc(profile.email||'')}" placeholder="you@example.com"></label>
        <label>Password<input id="dzCloudPassword" type="password" minlength="6" placeholder="Minimum 6 characters"></label>
      </div>
      <button class="dz-action" id="dzLogin">Sign in</button>
      <button class="dz-action alt" id="dzSignup">Create account</button>
      <div id="dzAuthStatus" class="dz-small" style="margin-top:10px">Cloud sync is available on this deployment.</div>`);
    const run=async action=>{
      const email=panel.querySelector('#dzCloudEmail').value.trim(), password=panel.querySelector('#dzCloudPassword').value;
      const out=panel.querySelector('#dzAuthStatus');
      if(!email||!password){out.textContent='Enter your email and password.';return}
      out.textContent=action==='login'?'Signing in…':'Creating account…';
      try{
        const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,email,password})});
        const d=await r.json();
        if(!r.ok) throw new Error(d.msg||d.message||d.error_description||d.error||'Authentication failed');
        if(d.access_token){
          localStorage.setItem(sessionKey,JSON.stringify(d));
          localStorage.setItem(profileKey,JSON.stringify({...profile,email,updatedAt:new Date().toISOString()}));
          accountTool();
        }else{
          out.textContent='Account created. Confirm the email, then return to Dealzy and tap Sign in. If the confirmation page shows localhost, the account can still be confirmed.';
        }
      }catch(e){out.textContent=e.message||'Authentication failed'}
    };
    panel.querySelector('#dzLogin').onclick=()=>run('login');
    panel.querySelector('#dzSignup').onclick=()=>run('signup');
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
          '</div><div class="dz-small" style="margin-top:9px">Current check mode: '+esc(d.mode||'unknown')+'. Demo results are never presented as live partner offers.</div>');
      }
      return d;
    }catch(_){return {ok:false,reason:'api-error'}}
  }

  function travelTool(){
    const key='dealzyTravelSearches';
    let saved=[];
    try{saved=JSON.parse(localStorage.getItem(key)||'[]')}catch(_){}
    const recent=saved.slice(-5).reverse();

    showPanel(`<h3>🧳 Travel Hub</h3>
      <div class="dz-small">Plan hotels, flights, cars and things to do. Dealzy saves your search details privately and opens the official provider when public API access is not yet available.</div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0">
        <button class="dz-action alt" data-travel-tab="hotel">🏨 Hotels</button>
        <button class="dz-action alt" data-travel-tab="flight">✈️ Flights</button>
        <button class="dz-action alt" data-travel-tab="car">🚗 Cars</button>
        <button class="dz-action alt" data-travel-tab="activity">🎟️ Things to do</button>
      </div>

      <div id="dzTravelForm"></div>

      <div class="dz-result">
        <b>Recent travel searches</b><br>
        ${recent.length?recent.map(x=>'<div style="margin:7px 0">'+esc((x.kind||'travel').toUpperCase())+' · '+esc(x.summary||'Saved search')+'</div>').join(''):'No saved travel searches yet.'}
      </div>

      <div class="dz-small" style="margin-top:10px">
        Booking.com accommodation data and Skyscanner flight data have been validated through connected providers in ChatGPT. Dealzy's public website still waits for its own official API/affiliate credentials, so external prices are never presented as native Dealzy live inventory yet.
      </div>`);

    const form=panel.querySelector('#dzTravelForm');

    const saveSearch=(kind,data,summary)=>{
      saved.push({kind,data,summary,createdAt:new Date().toISOString()});
      localStorage.setItem(key,JSON.stringify(saved.slice(-30)));
      queueCloudSync();
    };

    const renderHotel=()=>{
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
        window.open('https://www.booking.com/searchresults.html?'+p.toString(),'_blank','noopener,noreferrer');
      };
    };

    const renderFlight=()=>{
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
        window.open('https://skyscanner.net/g/referrals/v1/flights/day-view?'+p.toString(),'_blank','noopener,noreferrer');
      };
    };

    const renderCar=()=>{
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
        window.open('https://www.booking.com/cars/','_blank','noopener,noreferrer');
      };
    };

    const renderActivity=()=>{
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
        window.open('https://www.booking.com/attractions/','_blank','noopener,noreferrer');
      };
    };

    panel.querySelectorAll('[data-travel-tab]').forEach(b=>b.onclick=()=>{
      ({hotel:renderHotel,flight:renderFlight,car:renderCar,activity:renderActivity}[b.dataset.travelTab]||renderHotel)();
    });
    renderHotel();
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
      <div class="dz-small" style="margin-top:9px">Price observations are now stored in your private cloud history. The checker currently labels fallback inventory clearly; approved live feeds can plug into the same engine later.</div>`);
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
      const keys=['dealzyFavs','dealzyTrip','dealzyCoords','dealzyToolPrefs','dealzyAlerts','dealzyLocalProfile','dealzyPriceWatch','dealzyCoupons','dealzyTravelSearches'];
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
    ({compare:compareTool,budget:budgetTool,savings:savingsTool,alerts:alertsTool,notifications:notificationsTool,search:providerSearchTool,nearby:nearbyTool,account:accountTool,planner:plannerTool,travel:travelTool,watch:watchTool,coupons:couponsTool,backup:backupTool,split:splitTool,providers:providersTool,app:appTool}[t]||(()=>{}))();
  });

  // Quietly check saved watches after the app settles. This creates in-app notifications only when a signed-in user has watches.
  setTimeout(()=>checkPriceWatches(false),3500);

  // PWA shell registration.
  if('serviceWorker' in navigator){
    window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
  }
})();