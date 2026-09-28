(()=>{
const SB_URL='https://stkmhgeuavsidpapqvyw.supabase.co';
const SB_KEY='sb_publishable_EVDiDkczLgCmggcMxbV8tw_jQm4g9Rh';
const SESSION_KEY='dealzy_admin_session_v1';
let session=null, admin=null, config={};

const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const authHeaders=()=>({'apikey':SB_KEY,'Authorization':'Bearer '+session.access_token,'Content-Type':'application/json'});
const flash=(msg,bad=false)=>{$('#flash').innerHTML='<div class="alert '+(bad?'error':'')+'">'+esc(msg)+'</div>';setTimeout(()=>{$('#flash').innerHTML=''},3500)};

async function api(path,opts={}){
  const r=await fetch(SB_URL+path,{...opts,headers:{...authHeaders(),...(opts.headers||{})}});
  if(r.status===401){logout();throw new Error('Session expired');}
  if(!r.ok){const t=await r.text();throw new Error(t||('HTTP '+r.status));}
  if(r.status===204) return null;
  const t=await r.text(); return t?JSON.parse(t):null;
}
async function login(){
  $('#loginMsg').innerHTML='';
  const email=$('#email').value.trim(), password=$('#password').value;
  if(!email||!password) return $('#loginMsg').innerHTML='<div class="alert error">Email and password required.</div>';
  $('#loginBtn').disabled=true;
  try{
    const r=await fetch(SB_URL+'/auth/v1/token?grant_type=password',{method:'POST',headers:{'apikey':SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    const data=await r.json();
    if(!r.ok||!data.access_token) throw new Error(data.error_description||data.msg||'Login failed');
    session=data;
    localStorage.setItem(SESSION_KEY,JSON.stringify(session));
    await boot();
  }catch(e){$('#loginMsg').innerHTML='<div class="alert error">'+esc(e.message)+'</div>'}
  finally{$('#loginBtn').disabled=false}
}
function logout(){localStorage.removeItem(SESSION_KEY);session=null;location.reload()}

async function boot(){
  try{
    const rows=await api('/rest/v1/dealzy_admin_users?select=role,enabled&user_id=eq.'+encodeURIComponent(session.user.id));
    if(!rows||!rows[0]||!rows[0].enabled) throw new Error('This account is not an administrator.');
    admin=rows[0];
    $('#loginView').classList.add('hidden');$('#adminView').classList.remove('hidden');
    $('#adminRole').textContent=admin.role;
    await loadAll();
  }catch(e){
    localStorage.removeItem(SESSION_KEY);
    $('#loginView').classList.remove('hidden');$('#adminView').classList.add('hidden');
    $('#loginMsg').innerHTML='<div class="alert error">'+esc(e.message)+'</div>';
  }
}

async function loadAll(){
  const [cfgRows,stats,health,audit]=await Promise.all([
    api('/rest/v1/dealzy_runtime_config?select=key,value,updated_at&order=key.asc'),
    api('/rest/v1/rpc/dealzy_admin_dashboard_stats',{method:'POST',body:'{}'}),
    api('/rest/v1/dealzy_provider_health?select=provider_key,display_name,mode,enabled,healthy,last_checked_at,last_latency_ms,last_error_message&order=provider_key.asc'),
    api('/rest/v1/dealzy_admin_audit_log?select=id,action,target,created_at&order=created_at.desc&limit=20')
  ]);
  config={}; for(const row of cfgRows||[]) config[row.key]=row.value||{};
  renderStats(stats||{});renderControls();renderHealth(health||[]);renderAudit(audit||[]);
}
function renderStats(s){
  $('#stUsers').textContent=s.users??0;$('#stSaved').textContent=s.saved_deals??0;$('#stTrips').textContent=s.trips??0;$('#stSearches').textContent=s.searches??0;
}
function controlCard(key,label,desc,checked,group){
  return '<div class="control"><div><b>'+esc(label)+'</b><small>'+esc(desc)+'</small></div><label class="switch"><input type="checkbox" data-group="'+esc(group)+'" data-key="'+esc(key)+'" '+(checked?'checked':'')+'><span class="slider"></span></label></div>';
}
function renderControls(){
  const app=config.app||{}, markets=config.markets||{}, providers=config.providers||{}, categories=config.categories||{};
  $('#maintenanceToggle').checked=!!app.maintenance;
  $('#prodState').innerHTML='<i class="dot '+(app.maintenance?'off':'')+'"></i> '+(app.maintenance?'MAINTENANCE':'LIVE');
  $('#maintenancePanel').classList.toggle('maintenance',!!app.maintenance);
  $('#markets').innerHTML=[
    controlCard('US','United States','USD · production',markets.US?.enabled!==false,'markets'),
    controlCard('CA','Canada','CAD · production',markets.CA?.enabled!==false,'markets')
  ].join('');
  const defs=[['yelp','Yelp','Food, restaurants, spa & beauty'],['ticketmaster','Ticketmaster','Events and activities'],['viator','Viator','Experiences and tours'],['booking','Booking.com','Travel clickout'],['skyscanner','Skyscanner','Flight clickout'],['expedia','Expedia','Travel affiliate shop']];
  $('#providers').innerHTML=defs.map(([k,l,d])=>controlCard(k,l,d,providers[k]?.enabled!==false,'providers')).join('');
  const cats=['Food & Drink','Things to Do','Spa & Beauty','Travel'];
  $('#categories').innerHTML=cats.map(k=>controlCard(k,k,'Visible and searchable',categories[k]?.enabled!==false,'categories')).join('');
  document.querySelectorAll('input[data-group]').forEach(el=>el.onchange=()=>setToggle(el.dataset.group,el.dataset.key,el.checked));
}
function renderHealth(rows){
  $('#healthRows').innerHTML=rows.length?rows.map(r=>'<tr><td><b>'+esc(r.display_name||r.provider_key)+'</b></td><td><span class="pill">'+esc(r.mode)+'</span></td><td><span class="pill '+(r.healthy?'ok':'bad')+'">'+(r.healthy?'Healthy':'Issue')+'</span></td><td>'+esc(r.last_latency_ms==null?'—':r.last_latency_ms+' ms')+'</td><td>'+esc(r.last_checked_at?new Date(r.last_checked_at).toLocaleString():'—')+'</td></tr>').join(''):'<tr><td colspan="5" class="sub">No health data yet.</td></tr>';
}
function renderAudit(rows){
  $('#auditRows').innerHTML=rows.length?rows.map(r=>'<tr><td>'+esc(new Date(r.created_at).toLocaleString())+'</td><td>'+esc(r.action)+'</td><td>'+esc(r.target)+'</td></tr>').join(''):'<tr><td colspan="3" class="sub">No admin changes yet.</td></tr>';
}
async function saveConfig(key,value){
  await api('/rest/v1/rpc/dealzy_admin_set_runtime_config',{method:'POST',body:JSON.stringify({config_key:key,config_value:value})});
  config[key]=value;
}
async function setToggle(group,key,enabled){
  try{
    const next=structuredClone(config[group]||{});
    next[key]={...(next[key]||{}),enabled};
    await saveConfig(group,next);flash(key+' '+(enabled?'enabled':'disabled'));
    await loadAll();
  }catch(e){flash(e.message,true);await loadAll()}
}
async function setMaintenance(enabled){
  try{
    const next={...(config.app||{}),maintenance:enabled};
    await saveConfig('app',next);flash(enabled?'Maintenance enabled':'Dealzy is live');
    await loadAll();
  }catch(e){flash(e.message,true);await loadAll()}
}

$('#loginBtn').onclick=login;$('#password').addEventListener('keydown',e=>{if(e.key==='Enter')login()});
$('#logoutBtn').onclick=logout;$('#refreshBtn').onclick=()=>loadAll().catch(e=>flash(e.message,true));
$('#maintenanceToggle').onchange=e=>setMaintenance(e.target.checked);
try{session=JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch(_){}
if(session?.access_token&&session?.user?.id) boot();
})();