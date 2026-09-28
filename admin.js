(()=>{
const SB_URL='https://stkmhgeuavsidpapqvyw.supabase.co';
const SB_KEY='sb_publishable_EVDiDkczLgCmggcMxbV8tw_jQm4g9Rh';
const SESSION_KEY='dealzy_admin_session_v1';
const ADMIN_URL='https://dealzy-v1.vercel.app/admin';
let session=null, admin=null, config={}, users=[], selectedUser=null, selectedUserDetail=null;

const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const authHeaders=()=>({'apikey':SB_KEY,'Authorization':'Bearer '+session.access_token,'Content-Type':'application/json'});
const flash=(msg,bad=false)=>{$('#flash').innerHTML='<div class="alert '+(bad?'error':'')+'">'+esc(msg)+'</div>';setTimeout(()=>{$('#flash').innerHTML=''},3500)};
const modalMsg=(msg,bad=false)=>{$('#userModalMsg').innerHTML=msg?'<div class="alert '+(bad?'error':'')+'">'+esc(msg)+'</div>':''};

async function api(path,opts={}){
  const r=await fetch(SB_URL+path,{...opts,headers:{...authHeaders(),...(opts.headers||{})}});
  if(r.status===401){logout();throw new Error('Session expired');}
  if(!r.ok){const t=await r.text();throw new Error(t||('HTTP '+r.status));}
  if(r.status===204) return null;
  const t=await r.text(); return t?JSON.parse(t):null;
}

async function adminEdge(action,payload={}){
  const r=await fetch(SB_URL+'/functions/v1/dealzy-admin-user-auth',{
    method:'POST',
    headers:{
      'apikey':SB_KEY,
      'Authorization':'Bearer '+session.access_token,
      'Content-Type':'application/json'
    },
    body:JSON.stringify({action,...payload})
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok||data.ok===false) throw new Error(data.error||('HTTP '+r.status));
  return data;
}

async function fetchUserDetail(userId){
  return api('/rest/v1/rpc/dealzy_admin_user_detail',{
    method:'POST',
    body:JSON.stringify({target_user:userId})
  });
}

function miniStat(label,value){
  return '<div class="mini-stat"><span class="sub">'+esc(label)+'</span><b>'+esc(value??0)+'</b></div>';
}

function renderUserDetail(detail){
  const u=detail?.user||{}, c=detail?.counts||{};
  selectedUserDetail=detail;
  $('#modalUserSubtitle').textContent=[u.display_name,u.email].filter(Boolean).join(' · ');
  $('#editUserName').value=u.display_name||'';
  $('#editUserEmail').value=u.email||'';
  $('#editUserPhone').value=u.phone||'';
  $('#editUserRole').value=['admin','viewer'].includes(u.role)?u.role:'user';
  $('#editUserStatus').value=u.status||'active';
  $('#editUserReason').value=u.status_reason||'';
  $('#editUserNotes').value=u.notes||'';

  const protectedAccount=!!u.protected_superadmin;
  const writable=admin?.role==='superadmin'&&!protectedAccount;
  ['editUserName','editUserEmail','editUserPhone','editUserRole','editUserStatus','editUserReason','editUserNotes','editUserPassword',
   'saveUserIdentityBtn','saveUserRoleBtn','saveUserStatusBtn','setUserPasswordBtn','sendUserResetBtn']
    .forEach(id=>{const el=$('#'+id); if(el) el.disabled=!writable;});

  if(protectedAccount) modalMsg('Protected superadmin account. Sensitive changes are disabled here.');
  else modalMsg('');

  $('#userDetailStats').innerHTML=[
    miniStat('Saved deals',c.saved_deals),
    miniStat('Trips',c.trips),
    miniStat('Searches',c.searches),
    miniStat('Travel searches',c.travel_searches),
    miniStat('Alerts',c.alerts),
    miniStat('Orders',c.orders),
    miniStat('Booked items',c.booked_trip_items)
  ].join('');

  const orders=detail?.orders||[];
  $('#userOrders').innerHTML=orders.length?orders.map(o=>{
    const money=o.amount==null?'—':(o.amount+' '+(o.currency_code||''));
    return '<div class="history-row"><b>'+esc(o.title||o.kind||'Order')+'</b><div class="sub">'+esc(o.provider||'')+' · '+esc(o.status||'')+' · '+esc(money)+'</div><div class="sub">'+esc(o.external_order_id||'')+' '+esc(o.booked_at?new Date(o.booked_at).toLocaleString():'')+'</div></div>';
  }).join(''):'<div class="sub">No recorded orders yet.</div>';

  const booked=detail?.booked_items||[];
  $('#userBookedItems').innerHTML=booked.length?booked.map(o=>{
    const title=o.item_data?.title||o.deal_key||o.item_type||'Booked item';
    const money=o.estimated_cost==null?'—':String(o.estimated_cost);
    return '<div class="history-row"><b>'+esc(title)+'</b><div class="sub">'+esc(o.item_type||'')+' · Cost '+esc(money)+'</div><div class="sub">'+esc(o.starts_at?new Date(o.starts_at).toLocaleString():'')+'</div></div>';
  }).join(''):'<div class="sub">No booked trip items.</div>';

  const travel=detail?.recent_travel||[];
  $('#userTravelActivity').innerHTML=travel.length?travel.map(o=>{
    const data=o.search_data||{};
    const summary=data.destination||data.city||data.query||data.origin||'Travel search';
    return '<div class="history-row"><b>'+esc(o.kind||'Travel')+'</b><div class="sub">'+esc(o.provider||'')+' · '+esc(summary)+'</div><div class="sub">'+esc(o.created_at?new Date(o.created_at).toLocaleString():'')+'</div></div>';
  }).join(''):'<div class="sub">No recent travel activity.</div>';
}

async function openUserModal(userId){
  try{
    selectedUser=userId;
    $('#userModal').classList.remove('hidden');
    modalMsg('Loading…');
    const detail=await fetchUserDetail(userId);
    renderUserDetail(detail);
  }catch(e){
    modalMsg(e.message,true);
  }
}

function closeUserModal(){
  $('#userModal').classList.add('hidden');
  selectedUser=null;selectedUserDetail=null;
  modalMsg('');
}

async function refreshSelectedUser(){
  if(!selectedUser) return;
  const detail=await fetchUserDetail(selectedUser);
  renderUserDetail(detail);
  users=await fetchUsers($('#userSearch').value||'');
  renderUsers(users);
}

async function saveSelectedIdentity(){
  if(!selectedUser||admin?.role!=='superadmin') return;
  try{
    modalMsg('Saving…');
    await adminEdge('update_identity',{
      target_user:selectedUser,
      display_name:$('#editUserName').value.trim(),
      email:$('#editUserEmail').value.trim(),
      phone:$('#editUserPhone').value.trim()
    });
    modalMsg('Identity updated.');
    await refreshSelectedUser();
  }catch(e){modalMsg(e.message,true)}
}

async function saveSelectedRole(){
  if(!selectedUser||admin?.role!=='superadmin') return;
  try{
    await api('/rest/v1/rpc/dealzy_superadmin_set_staff',{
      method:'POST',
      body:JSON.stringify({target_user:selectedUser,new_role:$('#editUserRole').value})
    });
    modalMsg('Role updated.');
    await refreshSelectedUser();
  }catch(e){modalMsg(e.message,true)}
}

async function saveSelectedStatus(){
  if(!selectedUser||admin?.role!=='superadmin') return;
  const status=$('#editUserStatus').value;
  const word=status==='active'?'reactivate':status==='blacklisted'?'blacklist':'disable';
  if(!confirm('Confirm: '+word+' this user?')) return;
  try{
    await adminEdge('set_status',{
      target_user:selectedUser,
      status,
      reason:$('#editUserReason').value.trim(),
      notes:$('#editUserNotes').value.trim()
    });
    modalMsg('Account status updated.');
    await refreshSelectedUser();
  }catch(e){modalMsg(e.message,true)}
}

async function setSelectedPassword(){
  if(!selectedUser||admin?.role!=='superadmin') return;
  const password=$('#editUserPassword').value;
  if(password.length<12) return modalMsg('Temporary password must be at least 12 characters.',true);
  if(!confirm('Set a new password for this user? Their current password will stop working.')) return;
  try{
    await adminEdge('set_password',{target_user:selectedUser,password});
    $('#editUserPassword').value='';
    modalMsg('Password changed.');
  }catch(e){modalMsg(e.message,true)}
}

async function sendSelectedReset(){
  if(!selectedUser||admin?.role!=='superadmin') return;
  try{
    await adminEdge('send_password_reset',{target_user:selectedUser});
    modalMsg('Password reset email sent.');
  }catch(e){modalMsg(e.message,true)}
}

async function requestPasswordReset(){
  const email=$('#resetEmail').value.trim();
  if(!email){
    $('#loginMsg').innerHTML='<div class="alert error">Enter your email first.</div>';
    return;
  }
  $('#sendResetBtn').disabled=true;
  try{
    const r=await fetch(SB_URL+'/auth/v1/recover?redirect_to='+encodeURIComponent(ADMIN_URL),{
      method:'POST',
      headers:{'apikey':SB_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({email})
    });
    let data={}; try{data=await r.json()}catch(_){}
    if(!r.ok) throw new Error(data.msg||data.error_description||'Could not send reset email');
    $('#loginMsg').innerHTML='<div class="alert">Reset email sent. Check your inbox and spam folder.</div>';
  }catch(e){
    $('#loginMsg').innerHTML='<div class="alert error">'+esc(e.message)+'</div>';
  }finally{
    $('#sendResetBtn').disabled=false;
  }
}

function readRecoverySession(){
  const hash=new URLSearchParams(location.hash.replace(/^#/,''));
  const access_token=hash.get('access_token');
  const refresh_token=hash.get('refresh_token');
  const type=hash.get('type');
  if(type==='recovery'&&access_token){
    return {access_token,refresh_token,type};
  }
  return null;
}

async function saveRecoveredPassword(){
  const p=$('#newPassword').value;
  const c=$('#confirmPassword').value;
  if(p.length<8){
    $('#resetMsg').innerHTML='<div class="alert error">Use at least 8 characters.</div>';
    return;
  }
  if(p!==c){
    $('#resetMsg').innerHTML='<div class="alert error">Passwords do not match.</div>';
    return;
  }
  const recovery=readRecoverySession();
  if(!recovery?.access_token){
    $('#resetMsg').innerHTML='<div class="alert error">Reset link is invalid or expired.</div>';
    return;
  }
  $('#savePasswordBtn').disabled=true;
  try{
    const r=await fetch(SB_URL+'/auth/v1/user',{
      method:'PUT',
      headers:{'apikey':SB_KEY,'Authorization':'Bearer '+recovery.access_token,'Content-Type':'application/json'},
      body:JSON.stringify({password:p})
    });
    const data=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(data.msg||data.error_description||'Could not update password');
    history.replaceState(null,'',location.pathname);
    $('#resetMsg').innerHTML='<div class="alert">Password updated. You can sign in now.</div>';
    setTimeout(()=>location.reload(),900);
  }catch(e){
    $('#resetMsg').innerHTML='<div class="alert error">'+esc(e.message)+'</div>';
  }finally{
    $('#savePasswordBtn').disabled=false;
  }
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
    $('#usersPanel').classList.toggle('hidden',admin.role==='viewer');
    await loadAll();
  }catch(e){
    localStorage.removeItem(SESSION_KEY);
    $('#loginView').classList.remove('hidden');$('#adminView').classList.add('hidden');
    $('#loginMsg').innerHTML='<div class="alert error">'+esc(e.message)+'</div>';
  }
}

async function loadAll(){
  const [cfgRows,stats,health,audit,userRows]=await Promise.all([
    api('/rest/v1/dealzy_runtime_config?select=key,value,updated_at&order=key.asc'),
    api('/rest/v1/rpc/dealzy_admin_dashboard_stats',{method:'POST',body:'{}'}),
    api('/rest/v1/dealzy_provider_health?select=provider_key,display_name,mode,enabled,healthy,last_checked_at,last_latency_ms,last_error_message&order=provider_key.asc'),
    api('/rest/v1/dealzy_admin_audit_log?select=id,action,target,created_at&order=created_at.desc&limit=20'),
    fetchUsers($('#userSearch')?.value||'')
  ]);
  config={}; for(const row of cfgRows||[]) config[row.key]=row.value||{};
  users=userRows||[];
  renderStats(stats||{});renderControls();renderHealth(health||[]);renderAudit(audit||[]);renderUsers(users);
}
function renderStats(s){
  $('#stUsers').textContent=s.users??0;$('#stSaved').textContent=s.saved_deals??0;$('#stTrips').textContent=s.trips??0;$('#stSearches').textContent=s.searches??0;
}

async function fetchUsers(search=''){
  if(admin?.role==='viewer') return [];
  return api('/rest/v1/rpc/dealzy_admin_list_users',{
    method:'POST',
    body:JSON.stringify({search_text:String(search||''),page_size:50,page_offset:0})
  });
}

function userRoleLabel(row){
  if(row.admin_enabled&&row.admin_role==='superadmin') return 'Superadmin';
  if(row.admin_enabled&&row.admin_role==='admin') return 'Admin';
  if(row.admin_enabled&&row.admin_role==='viewer') return 'Viewer';
  return 'User';
}

function renderUsers(rows){
  $('#userCountBadge').textContent=(rows||[]).length+' shown';
  if(!rows||!rows.length){
    $('#userRows').innerHTML='<div class="sub">No users found.</div>';
    return;
  }
  $('#userRows').innerHTML=rows.map(row=>{
    const role=userRoleLabel(row);
    const display=row.display_name||row.email||row.phone||'Dealzy user';
    const created=row.created_at?new Date(row.created_at).toLocaleDateString():'—';
    const last=row.last_sign_in_at?new Date(row.last_sign_in_at).toLocaleString():'Never';
    const status=row.account_status||((row.auth_banned||row.account_disabled)?'disabled':'active');
    const statusClass=status==='active'?'ok':'bad';
    const statusLabel=status==='blacklisted'?'Blacklisted':status==='disabled'?'Disabled':'Active';
    const badges=[
      '<span class="pill '+statusClass+'">'+statusLabel+'</span>',
      '<span class="pill '+(row.admin_role==='superadmin'?'protected':'')+'">'+esc(role)+'</span>',
      row.email_confirmed?'<span class="pill ok">Email verified</span>':'<span class="pill">Email unverified</span>',
      row.is_self?'<span class="pill protected">You</span>':''
    ].join('');
    return '<div class="user-card">'+
      '<div class="user-top"><div><div class="user-name">'+esc(display)+'</div><div class="user-email">'+esc(row.email||'')+(row.phone?' · '+esc(row.phone):'')+'</div></div><div class="user-meta">'+badges+'</div></div>'+
      '<div class="sub" style="margin-top:10px">Joined '+esc(created)+' · Last sign-in '+esc(last)+(row.status_reason?' · '+esc(row.status_reason):'')+'</div>'+
      '<div class="user-actions"><button class="btn btn-ghost" data-user-manage="'+esc(row.user_id)+'">Manage</button></div>'+
    '</div>';
  }).join('');
  document.querySelectorAll('[data-user-manage]').forEach(el=>el.onclick=()=>openUserModal(el.dataset.userManage));
}
async function changeUserRole(userId,role){
  if(admin?.role!=='superadmin') return flash('Superadmin required.',true);
  try{
    await api('/rest/v1/rpc/dealzy_superadmin_set_staff',{
      method:'POST',
      body:JSON.stringify({target_user:userId,new_role:role})
    });
    flash('User role updated.');
    users=await fetchUsers($('#userSearch').value||'');
    renderUsers(users);
  }catch(e){
    flash(e.message,true);
    users=await fetchUsers($('#userSearch').value||'');
    renderUsers(users);
  }
}

async function changeUserDisabled(userId,isDisabled){
  if(admin?.role!=='superadmin') return flash('Superadmin required.',true);
  const action=isDisabled?'enable':'disable';
  if(!confirm('Are you sure you want to '+action+' this account?')) return;
  try{
    await api('/rest/v1/rpc/dealzy_superadmin_set_user_disabled',{
      method:'POST',
      body:JSON.stringify({target_user:userId,disabled:!isDisabled})
    });
    flash('Account '+(isDisabled?'enabled':'disabled')+'.');
    users=await fetchUsers($('#userSearch').value||'');
    renderUsers(users);
  }catch(e){
    flash(e.message,true);
    users=await fetchUsers($('#userSearch').value||'');
    renderUsers(users);
  }
}
function controlCard(key,label,desc,checked,group){
  const canManage=admin&&admin.role!=='viewer';
  return '<div class="control '+(canManage?'':'readonly')+'"><div><b>'+esc(label)+'</b><small>'+esc(desc)+'</small></div><label class="switch"><input type="checkbox" data-group="'+esc(group)+'" data-key="'+esc(key)+'" '+(checked?'checked':'')+' '+(canManage?'':'disabled')+'><span class="slider"></span></label></div>';
}
function renderControls(){
  const app=config.app||{}, markets=config.markets||{}, providers=config.providers||{}, categories=config.categories||{};
  $('#maintenanceToggle').checked=!!app.maintenance;
  $('#maintenanceToggle').disabled=admin?.role==='viewer';
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
  if(admin?.role==='viewer') return flash('Viewer access is read only.',true);
  try{
    const next=structuredClone(config[group]||{});
    next[key]={...(next[key]||{}),enabled};
    await saveConfig(group,next);flash(key+' '+(enabled?'enabled':'disabled'));
    await loadAll();
  }catch(e){flash(e.message,true);await loadAll()}
}
async function setMaintenance(enabled){
  if(admin?.role==='viewer') return flash('Viewer access is read only.',true);
  try{
    const next={...(config.app||{}),maintenance:enabled};
    await saveConfig('app',next);flash(enabled?'Maintenance enabled':'Dealzy is live');
    await loadAll();
  }catch(e){flash(e.message,true);await loadAll()}
}

$('#loginBtn').onclick=login;
$('#forgotBtn').onclick=()=>{
  $('#resetEmail').value=$('#email').value.trim();
  $('#loginMsg').innerHTML='';
  $('#signInMode').classList.add('hidden');
  $('#resetRequest').classList.remove('hidden');
  setTimeout(()=>$('#resetEmail').focus(),0);
};
$('#backToLoginBtn').onclick=()=>{
  $('#email').value=$('#resetEmail').value.trim();
  $('#loginMsg').innerHTML='';
  $('#resetRequest').classList.add('hidden');
  $('#signInMode').classList.remove('hidden');
  setTimeout(()=>$('#email').focus(),0);
};
$('#sendResetBtn').onclick=requestPasswordReset;
$('#savePasswordBtn').onclick=saveRecoveredPassword;
$('#closeUserModal').onclick=closeUserModal;
$('#userModal').addEventListener('click',e=>{if(e.target===$('#userModal')) closeUserModal()});
$('#saveUserIdentityBtn').onclick=saveSelectedIdentity;
$('#saveUserRoleBtn').onclick=saveSelectedRole;
$('#saveUserStatusBtn').onclick=saveSelectedStatus;
$('#setUserPasswordBtn').onclick=setSelectedPassword;
$('#sendUserResetBtn').onclick=sendSelectedReset;
$('#userSearchBtn').onclick=async()=>{try{users=await fetchUsers($('#userSearch').value||'');renderUsers(users)}catch(e){flash(e.message,true)}};
$('#userSearch').addEventListener('keydown',async e=>{if(e.key==='Enter'){e.preventDefault();try{users=await fetchUsers($('#userSearch').value||'');renderUsers(users)}catch(err){flash(err.message,true)}}});
$('#password').addEventListener('keydown',e=>{if(e.key==='Enter')login()});
$('#logoutBtn').onclick=logout;$('#refreshBtn').onclick=()=>loadAll().catch(e=>flash(e.message,true));
$('#maintenanceToggle').onchange=e=>setMaintenance(e.target.checked);

const recovery=readRecoverySession();
if(recovery){
  $('#loginView').classList.add('hidden');
  $('#adminView').classList.add('hidden');
  $('#resetView').classList.remove('hidden');
}else{
  try{session=JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch(_){}
  if(session?.access_token&&session?.user?.id) boot();
}
})();