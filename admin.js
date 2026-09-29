(()=>{
const SB_URL='https://stkmhgeuavsidpapqvyw.supabase.co';
const SB_KEY='sb_publishable_EVDiDkczLgCmggcMxbV8tw_jQm4g9Rh';
const SESSION_KEY='dealzy_admin_session_v1';
const ADMIN_URL='https://dealzy-v1.vercel.app/admin';
let session=null, admin=null, config={}, users=[], selectedUser=null, selectedUserDetail=null, commercial={summary:{},partners:[],contracts:[],deals:[],transactions:[],coupons:[]}, stripeData=null;
let userPage={offset:0,size:20,total:0,hasMore:false};
let orders=[], selectedOrder=null, orderPage={offset:0,size:25,total:0,hasMore:false};
let notificationCampaigns=[];
let currentAdminPage='overview';

const ADMIN_PAGES={
  overview:{title:'Overview',subtitle:'Dealzy at a glance.'},
  analytics:{title:'Analytics',subtitle:'Usage, engagement and commerce trends.'},
  users:{title:'Users & Admins',subtitle:'Accounts, access, status and user history.'},
  orders:{title:'Orders & Bookings',subtitle:'Confirmed order records linked to Dealzy users.'},
  notifications:{title:'Notifications',subtitle:'Send in-app messages and review recent campaigns.'},
  providers:{title:'Providers',subtitle:'Live inventory sources and provider health.'},
  markets:{title:'Markets & Categories',subtitle:'Control where and what Dealzy serves.'},
  payments:{title:'Payments',subtitle:'Stripe payments, customers, subscriptions, refunds and disputes.'},
  partners:{title:'Partners',subtitle:'Partners and commercial contracts.'},
  deals:{title:'Deals',subtitle:'Direct Dealzy offers and partner deals.'},
  billing:{title:'Billing',subtitle:'Billing records, refunds, credits and coupons.'},
  system:{title:'System',subtitle:'Maintenance mode and admin activity.'}
};

function showAdminPage(page,{remember=true}={}){
  if(!ADMIN_PAGES[page]) page='overview';
  if(admin?.role==='viewer'&&page==='users') page='overview';
  currentAdminPage=page;

  document.querySelectorAll('[data-admin-page]').forEach(el=>{
    el.classList.toggle('hidden',el.dataset.adminPage!==page);
  });
  document.querySelectorAll('[data-admin-tab]').forEach(btn=>{
    const hideUsers=btn.dataset.adminTab==='users'&&admin?.role==='viewer';
    btn.classList.toggle('hidden',hideUsers);
    btn.classList.toggle('active',btn.dataset.adminTab===page);
    btn.setAttribute('aria-selected',btn.dataset.adminTab===page?'true':'false');
  });

  const meta=ADMIN_PAGES[page];
  if($('#adminPageTitle')) $('#adminPageTitle').textContent=meta.title;
  if($('#adminPageSubtitle')) $('#adminPageSubtitle').textContent=meta.subtitle;
  if(remember){try{localStorage.setItem('dealzy_admin_page_v1',page)}catch(_){}}
  window.scrollTo({top:0,behavior:'auto'});
  if(page==='notifications'&&session?.access_token){
    loadAdminNotifications().catch(e=>flash(e.message,true));
  }
}

function initAdminNav(){
  document.querySelectorAll('[data-admin-tab]').forEach(btn=>{
    btn.onclick=()=>showAdminPage(btn.dataset.adminTab);
  });
  let wanted='overview';
  try{wanted=localStorage.getItem('dealzy_admin_page_v1')||'overview'}catch(_){}
  showAdminPage(wanted,{remember:false});
}

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

function moneyList(rows){
  if(!Array.isArray(rows)||!rows.length) return '—';
  return rows.map(x=>Number(x.amount||0).toFixed(2)+' '+esc(x.currency||'')).join(' · ');
}

function stripeRow(title,meta,extra=''){
  return '<div class="history-row"><div class="user-top"><div><b>'+esc(title)+'</b><div class="sub">'+meta+'</div></div>'+extra+'</div></div>';
}

async function loadStripe(){
  const r=await fetch('/api/cloud-status?view=stripe',{
    method:'GET',
    headers:{'Authorization':'Bearer '+session.access_token,'Accept':'application/json'},
    cache:'no-store'
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok||data.ok===false) throw new Error(data.error||('Stripe HTTP '+r.status));
  stripeData=data;
  renderStripe(data);
  return data;
}

function renderStripe(data){
  const configured=!!data?.configured;
  $('#stripeStatus').textContent=configured?'LIVE':'Not connected';
  $('#stripeStatus').className='pill '+(configured?'ok':'bad');

  if(!configured){
    $('#stripeNotice').innerHTML='<div class="alert">Stripe is not connected yet. Add the Stripe secret key to the Dealzy production environment; the key is never shown in this dashboard.</div>';
    $('#stripeStats').innerHTML=[
      miniStat('Available','—'),miniStat('Pending','—'),miniStat('Payments','—'),miniStat('Subscriptions','—')
    ].join('');
    ['stripePayments','stripeCustomers','stripeSubscriptions','stripeRefunds','stripeDisputes'].forEach(id=>$('#'+id).innerHTML='<div class="sub">Connect Stripe to load live data.</div>');
    return;
  }

  $('#stripeNotice').innerHTML='';
  const s=data.summary||{};
  $('#stripeStats').innerHTML=[
    miniStat('Available',moneyList(s.available)),
    miniStat('Pending',moneyList(s.pending)),
    miniStat('Recent payments',s.recent_payments||0),
    miniStat('Active subscriptions',s.active_subscriptions||0),
    miniStat('Customers',s.customers||0),
    miniStat('Refunds',s.refunds||0),
    miniStat('Disputes',s.disputes||0)
  ].join('');

  $('#stripePayments').innerHTML=(data.payments||[]).length?(data.payments||[]).map(p=>
    stripeRow((p.amount||0).toFixed(2)+' '+esc(p.currency||''),esc(p.name||p.email||p.customer||'Stripe payment')+' · '+esc(p.status||'')+' · '+esc(p.created_at?new Date(p.created_at).toLocaleString():''),
      p.receipt_url?'<a class="btn btn-ghost" target="_blank" rel="noopener" href="'+esc(p.receipt_url)+'">Receipt</a>':'')
  ).join(''):'<div class="sub">No recent Stripe payments.</div>';

  $('#stripeCustomers').innerHTML=(data.customers||[]).length?(data.customers||[]).map(c=>
    stripeRow(c.name||c.email||c.id,esc(c.email||'')+(c.phone?' · '+esc(c.phone):'')+' · '+esc(c.created_at?new Date(c.created_at).toLocaleDateString():''))
  ).join(''):'<div class="sub">No Stripe customers.</div>';

  $('#stripeSubscriptions').innerHTML=(data.subscriptions||[]).length?(data.subscriptions||[]).map(su=>
    stripeRow(su.id,esc(su.status||'')+' · '+Number(su.amount||0).toFixed(2)+' '+esc(su.currency||'')+(su.interval?' / '+esc(su.interval):'')+(su.cancel_at_period_end?' · cancels at period end':''))
  ).join(''):'<div class="sub">No Stripe subscriptions.</div>';

  $('#stripeRefunds').innerHTML=(data.refunds||[]).length?(data.refunds||[]).map(r=>
    stripeRow((r.amount||0).toFixed(2)+' '+esc(r.currency||''),esc(r.status||'')+(r.reason?' · '+esc(r.reason):'')+' · '+esc(r.created_at?new Date(r.created_at).toLocaleString():''))
  ).join(''):'<div class="sub">No recent refunds.</div>';

  $('#stripeDisputes').innerHTML=(data.disputes||[]).length?(data.disputes||[]).map(d=>
    stripeRow((d.amount||0).toFixed(2)+' '+esc(d.currency||''),esc(d.status||'')+(d.reason?' · '+esc(d.reason):'')+' · '+esc(d.created_at?new Date(d.created_at).toLocaleString():''))
  ).join(''):'<div class="sub">No disputes.</div>';
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
  const isSelf=selectedUser===session?.user?.id;
  const targetRole=String(u.role||'user');
  const targetIsStaff=['superadmin','admin','viewer'].includes(targetRole);
  const callerIsSuperadmin=admin?.role==='superadmin';
  const callerIsAdmin=admin?.role==='admin';

  const canEditIdentity=
    (callerIsSuperadmin&&(!protectedAccount||isSelf)) ||
    (callerIsAdmin&&(!targetIsStaff||isSelf));
  const canEditRole=callerIsSuperadmin&&!protectedAccount;
  const canEditStatus=
    (callerIsSuperadmin&&!protectedAccount) ||
    (callerIsAdmin&&!targetIsStaff&&!isSelf);
  const canResetPassword=canEditIdentity;
  const canSetPassword=callerIsSuperadmin&&(!protectedAccount||isSelf);

  ['editUserName','editUserEmail','editUserPhone','saveUserIdentityBtn']
    .forEach(id=>{const el=$('#'+id); if(el) el.disabled=!canEditIdentity;});

  ['editUserRole','saveUserRoleBtn']
    .forEach(id=>{const el=$('#'+id); if(el) el.disabled=!canEditRole;});

  ['editUserStatus','editUserReason','editUserNotes','saveUserStatusBtn']
    .forEach(id=>{const el=$('#'+id); if(el) el.disabled=!canEditStatus;});

  if($('#sendUserResetBtn')) $('#sendUserResetBtn').disabled=!canResetPassword;
  if($('#directPasswordWrap')) $('#directPasswordWrap').classList.toggle('hidden',!canSetPassword);
  ['directUserPassword','directUserPasswordConfirm','setUserPasswordBtn']
    .forEach(id=>{const el=$('#'+id);if(el) el.disabled=!canSetPassword;});
  if($('#directUserPassword')) $('#directUserPassword').value='';
  if($('#directUserPasswordConfirm')) $('#directUserPasswordConfirm').value='';

  if(admin?.role==='viewer') modalMsg('Viewer access is read only.');
  else if(protectedAccount&&isSelf) modalMsg('Your superadmin role and account status are protected. You can update your identity and request a password reset.');
  else if(protectedAccount) modalMsg('Protected superadmin account. Changes are locked.');
  else if(callerIsAdmin&&targetIsStaff&&!isSelf) modalMsg('Admins can view staff accounts but can only modify normal users.');
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

  const adminHistory=detail?.admin_history||[];
  $('#userAdminHistory').innerHTML=adminHistory.length?adminHistory.map(h=>{
    const details=h.details||{};
    const extra=details.status?(' · '+details.status):details.role?(' · '+details.role):'';
    return '<div class="history-row"><b>'+esc(h.action||'Admin action')+'</b><div class="sub">'+esc(h.created_at?new Date(h.created_at).toLocaleString():'')+esc(extra)+'</div></div>';
  }).join(''):'<div class="sub">No recorded admin actions for this account.</div>';
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
  if(!selectedUser||!['superadmin','admin'].includes(admin?.role)) return;
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
  if(!selectedUser||!['superadmin','admin'].includes(admin?.role)) return;
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

async function sendSelectedReset(){
  if(!selectedUser||!['superadmin','admin'].includes(admin?.role)) return;
  try{
    await adminEdge('send_password_reset',{target_user:selectedUser});
    modalMsg('Password reset email sent.');
  }catch(e){modalMsg(e.message,true)}
}

async function setSelectedPassword(){
  if(!selectedUser||admin?.role!=='superadmin') return modalMsg('Superadmin required.',true);
  const password=$('#directUserPassword').value;
  const confirmPassword=$('#directUserPasswordConfirm').value;
  if(password.length<12) return modalMsg('Password must contain at least 12 characters.',true);
  if(password.length>128) return modalMsg('Password is too long.',true);
  if(!/[a-z]/.test(password)||!/[A-Z]/.test(password)||!/[0-9]/.test(password)){
    return modalMsg('Use at least one uppercase letter, one lowercase letter and one number.',true);
  }
  if(password!==confirmPassword) return modalMsg('Passwords do not match.',true);

  const email=selectedUserDetail?.user?.email||'this user';
  if(!confirm('Replace the password for '+email+'?')) return;

  $('#setUserPasswordBtn').disabled=true;
  try{
    await adminEdge('set_password',{target_user:selectedUser,password});
    $('#directUserPassword').value='';
    $('#directUserPasswordConfirm').value='';
    modalMsg('Password changed successfully.');
    await refreshSelectedUser();
  }catch(e){
    modalMsg(e.message,true);
  }finally{
    if($('#setUserPasswordBtn')) $('#setUserPasswordBtn').disabled=admin?.role!=='superadmin';
  }
}

function openInviteUserModal(){
  if(admin?.role!=='superadmin') return flash('Superadmin required.',true);
  $('#inviteUserEmail').value='';
  $('#inviteUserName').value='';
  $('#inviteUserRole').value='user';
  $('#inviteUserMsg').innerHTML='';
  $('#inviteUserModal').classList.remove('hidden');
  setTimeout(()=>$('#inviteUserEmail').focus(),0);
}

function closeInviteUserModal(){
  $('#inviteUserModal').classList.add('hidden');
  $('#inviteUserMsg').innerHTML='';
}

async function inviteUser(){
  if(admin?.role!=='superadmin') return;
  const email=$('#inviteUserEmail').value.trim();
  const display_name=$('#inviteUserName').value.trim();
  const role=$('#inviteUserRole').value;
  if(!email) return $('#inviteUserMsg').innerHTML='<div class="alert error">Email is required.</div>';
  $('#sendInviteUserBtn').disabled=true;
  $('#inviteUserMsg').innerHTML='<div class="alert">Sending invitation…</div>';
  try{
    await adminEdge('invite_user',{email,display_name,role});
    $('#inviteUserMsg').innerHTML='<div class="alert">Invitation sent successfully.</div>';
    users=await fetchUsers($('#userSearch').value||'');
    renderUsers(users);
    setTimeout(closeInviteUserModal,900);
  }catch(e){
    $('#inviteUserMsg').innerHTML='<div class="alert error">'+esc(e.message)+'</div>';
  }finally{
    $('#sendInviteUserBtn').disabled=false;
  }
}

function csvCell(v){
  const s=String(v??'');
  return '"'+s.replaceAll('"','""')+'"';
}

async function exportUsersCsv(){
  if(admin?.role==='viewer') return flash('Viewer access is read only.',true);
  try{
    flash('Preparing user export…');
    const search=$('#userSearch').value||'';
    const all=[];
    for(let offset=0;offset<5000;offset+=100){
      const page=await api('/rest/v1/rpc/dealzy_admin_list_users',{
        method:'POST',
        body:JSON.stringify({search_text:String(search),page_size:100,page_offset:offset})
      });
      all.push(...(page||[]));
      if(!page||page.length<100) break;
    }
    const headers=['user_id','display_name','email','phone','status','role','email_confirmed','created_at','last_sign_in_at'];
    const lines=[headers.map(csvCell).join(',')];
    for(const row of all){
      lines.push([
        row.user_id,row.display_name,row.email,row.phone,row.account_status||'active',
        userRoleLabel(row),row.email_confirmed?'yes':'no',row.created_at,row.last_sign_in_at
      ].map(csvCell).join(','));
    }
    const blob=new Blob(['\ufeff'+lines.join('\n')],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download='dealzy-users-'+new Date().toISOString().slice(0,10)+'.csv';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),5000);
    flash(all.length+' users exported.');
  }catch(e){flash(e.message,true)}
}


function val(id){const el=$('#'+id);return el?el.value:''}
function numOrNull(id){const v=val(id);return v===''?null:Number(v)}
function isoOrNull(id){const v=val(id);return v?new Date(v).toISOString():null}
function dateOrNull(id){const v=val(id);return v||null}

async function loadCommercial(){
  commercial=await api('/rest/v1/rpc/dealzy_admin_commercial_snapshot',{method:'POST',body:'{}'})||commercial;
  renderCommercial();
  return commercial;
}

function partnerOptions(includeEmpty=true){
  const rows=commercial.partners||[];
  return (includeEmpty?'<option value="">Select partner</option>':'')+
    rows.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+' · '+esc(p.business_type)+'</option>').join('');
}
function contractOptions(partnerId='',includeEmpty=true){
  const rows=(commercial.contracts||[]).filter(c=>!partnerId||c.partner_id===partnerId);
  return (includeEmpty?'<option value="">Select contract</option>':'')+
    rows.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.contract_name)+' · '+esc(c.effective_status)+'</option>').join('');
}
function bindCommercialSelects(){
  ['ccPartner','cdPartner','ctPartner','applyCouponPartner'].forEach(id=>{const el=$('#'+id);if(el){const old=el.value;el.innerHTML=partnerOptions(true);if([...el.options].some(o=>o.value===old))el.value=old;}});
  const pairs=[['cdPartner','cdContract'],['ctPartner','ctContract'],['applyCouponPartner','applyCouponContract']];
  for(const [p,c] of pairs){
    const pe=$('#'+p), ce=$('#'+c); if(!pe||!ce) continue;
    const update=()=>{const old=ce.value;ce.innerHTML=contractOptions(pe.value,true);if([...ce.options].some(o=>o.value===old))ce.value=old;};
    pe.onchange=update;update();
  }
}

function effectiveMoney(v){return Number(v||0).toFixed(2)}
function commercialRow(title,meta,actions=''){
  return '<div class="history-row"><div class="user-top"><div><b>'+esc(title)+'</b><div class="sub">'+meta+'</div></div>'+actions+'</div></div>';
}
function renderCommercial(){
  const s=commercial.summary||{};
  $('#commercialStats').innerHTML=[
    miniStat('Partners',s.partners||0),
    miniStat('Active contracts',s.active_contracts||0),
    miniStat('Expiring ≤30d',s.expiring_30d||0),
    miniStat('Live direct deals',s.live_direct_deals||0),
    miniStat('Payments',effectiveMoney(s.payments_total||0)),
    miniStat('Refunds',effectiveMoney(s.refunds_total||0)),
    miniStat('Credits',effectiveMoney(s.credits_total||0)),
    miniStat('Active coupons',s.active_coupons||0)
  ].join('');
  bindCommercialSelects();

  const canWrite=admin?.role!=='viewer';
  document.querySelectorAll('.commercial-write').forEach(el=>el.disabled=!canWrite);

  $('#commercialPartners').innerHTML=(commercial.partners||[]).length?(commercial.partners||[]).map(p=>{
    const a=canWrite?'<select class="select" data-partner-status="'+esc(p.id)+'"><option '+(p.status==='active'?'selected':'')+'>active</option><option '+(p.status==='inactive'?'selected':'')+'>inactive</option><option '+(p.status==='blacklisted'?'selected':'')+'>blacklisted</option></select>':'<span class="pill">'+esc(p.status)+'</span>';
    return commercialRow(p.name,esc(p.partner_type)+' · '+esc(p.business_type)+' · '+esc(p.city||'')+' · '+esc(p.contract_count||0)+' contracts · '+esc(p.deal_count||0)+' deals',a);
  }).join(''):'<div class="sub">No commercial partners yet.</div>';

  $('#commercialContracts').innerHTML=(commercial.contracts||[]).length?(commercial.contracts||[]).map(c=>{
    const end=c.ends_on?new Date(c.ends_on+'T00:00:00').toLocaleDateString():'No expiry';
    const a=canWrite?'<select class="select" data-contract-status="'+esc(c.id)+'"><option '+(c.status==='active'?'selected':'')+'>active</option><option '+(c.status==='paused'?'selected':'')+'>paused</option><option '+(c.status==='cancelled'?'selected':'')+'>cancelled</option><option '+(c.status==='expired'?'selected':'')+'>expired</option><option '+(c.status==='draft'?'selected':'')+'>draft</option></select>':'<span class="pill">'+esc(c.effective_status)+'</span>';
    return commercialRow(c.contract_name,esc(c.partner_name)+' · '+esc(c.effective_status)+' · ends '+esc(end)+' · '+esc(effectiveMoney(c.amount))+' '+esc(c.currency_code)+' · '+esc(c.billing_status),a);
  }).join(''):'<div class="sub">No contracts yet.</div>';

  $('#commercialDeals').innerHTML=(commercial.deals||[]).length?(commercial.deals||[]).map(d=>{
    const state=d.live_now?'<span class="pill ok">LIVE</span>':'<span class="pill bad">OFF</span>';
    const a=canWrite?state+' <button class="btn btn-ghost" data-deal-toggle="'+esc(d.id)+'" data-active="'+(d.active?'1':'0')+'">'+(d.active?'Disable':'Enable')+'</button>':state;
    return commercialRow(d.title,esc(d.partner_name)+' · '+esc(d.category)+' · '+esc(d.city)+' · '+esc(effectiveMoney(d.price))+' '+esc(d.currency_code),a);
  }).join(''):'<div class="sub">No direct deals yet.</div>';

  $('#commercialTransactions').innerHTML=(commercial.transactions||[]).length?(commercial.transactions||[]).map(t=>
    commercialRow((t.transaction_type||'transaction').toUpperCase(),esc(t.partner_name||'')+' · '+esc(t.contract_name||'')+' · '+esc(effectiveMoney(t.amount))+' '+esc(t.currency_code)+' · '+esc(t.payment_method||'')+' · '+esc(t.occurred_at?new Date(t.occurred_at).toLocaleString():''))
  ).join(''):'<div class="sub">No billing transactions yet.</div>';

  $('#commercialCoupons').innerHTML=(commercial.coupons||[]).length?(commercial.coupons||[]).map(c=>{
    const benefit=c.discount_type==='free'?'100% free':c.discount_type==='percent'?esc(c.discount_value)+'%':esc(effectiveMoney(c.discount_value))+' '+esc(c.currency_code);
    return commercialRow(c.code,benefit+' · '+esc(c.free_months||0)+' free months · '+esc(c.use_count||0)+(c.max_uses?'/'+esc(c.max_uses):'')+' uses · '+(c.active?'active':'inactive'));
  }).join(''):'<div class="sub">No coupons yet.</div>';

  document.querySelectorAll('[data-partner-status]').forEach(el=>el.onchange=()=>setCommercialPartnerStatus(el.dataset.partnerStatus,el.value));
  document.querySelectorAll('[data-contract-status]').forEach(el=>el.onchange=()=>setCommercialContractStatus(el.dataset.contractStatus,el.value));
  document.querySelectorAll('[data-deal-toggle]').forEach(el=>el.onclick=()=>setCommercialDealActive(el.dataset.dealToggle,el.dataset.active!=='1'));
}

async function commercialRpc(name,payload){
  if(admin?.role==='viewer') throw new Error('Viewer access is read only.');
  const out=await api('/rest/v1/rpc/'+name,{method:'POST',body:JSON.stringify(payload)});
  await loadCommercial();
  return out;
}
async function createCommercialPartner(){
  try{
    await commercialRpc('dealzy_admin_create_partner',{
      p_name:val('cpName'),p_partner_type:val('cpPartnerType'),p_business_type:val('cpBusinessType'),p_provider_key:val('cpProviderKey'),
      p_country_code:val('cpCountry'),p_city:val('cpCity'),p_contact_name:'',p_contact_email:val('cpEmail'),p_contact_phone:val('cpPhone'),
      p_website_url:val('cpWebsite'),p_commission_type:val('cpCommissionType'),p_commission_value:numOrNull('cpCommissionValue'),
      p_currency_code:'USD',p_notes:val('cpNotes')
    });
    flash('Partner created.');
    ['cpName','cpProviderKey','cpCity','cpEmail','cpPhone','cpWebsite','cpCommissionValue','cpNotes'].forEach(id=>{$('#'+id).value=''});
  }catch(e){flash(e.message,true)}
}
async function createCommercialContract(){
  try{
    if(!val('ccPartner')) throw new Error('Select a partner.');
    await commercialRpc('dealzy_admin_create_contract',{
      p_partner_id:val('ccPartner'),p_contract_name:val('ccName'),p_contract_type:val('ccType'),p_starts_on:dateOrNull('ccStart'),
      p_duration_months:numOrNull('ccMonths'),p_ends_on:dateOrNull('ccEnd'),p_amount:numOrNull('ccAmount')||0,
      p_currency_code:val('ccCurrency'),p_auto_disable:$('#ccAutoDisable').checked,p_notes:val('ccNotes')
    });
    flash('Contract created.');
  }catch(e){flash(e.message,true)}
}
async function createCommercialDeal(){
  try{
    if(!val('cdPartner')) throw new Error('Select a partner.');
    if(!val('cdTitle')||!val('cdCity')) throw new Error('Deal title and city are required.');
    await commercialRpc('dealzy_admin_create_direct_deal',{
      p_partner_id:val('cdPartner'),p_contract_id:val('cdContract')||null,p_title:val('cdTitle'),p_description:val('cdDescription'),
      p_category:val('cdCategory'),p_country_code:val('cdCountry'),p_city:val('cdCity'),p_address:val('cdAddress'),
      p_price:numOrNull('cdPrice'),p_old_price:numOrNull('cdOldPrice'),p_currency_code:val('cdCurrency'),
      p_image_url:val('cdImage'),p_partner_url:val('cdUrl'),p_starts_at:isoOrNull('cdStart'),p_ends_at:isoOrNull('cdEnd'),
      p_featured:val('cdFeatured')==='true'
    });
    flash('Direct deal published.');
  }catch(e){flash(e.message,true)}
}
async function recordCommercialTransaction(){
  try{
    if(!val('ctPartner')) throw new Error('Select a partner.');
    if(numOrNull('ctAmount')===null) throw new Error('Amount is required.');
    await commercialRpc('dealzy_admin_record_transaction',{
      p_partner_id:val('ctPartner'),p_contract_id:val('ctContract')||null,p_transaction_type:val('ctType'),p_amount:numOrNull('ctAmount'),
      p_currency_code:val('ctCurrency'),p_payment_method:val('ctMethod'),p_external_reference:val('ctReference'),p_notes:val('ctNotes'),p_occurred_at:null
    });
    flash('Transaction recorded.');
  }catch(e){flash(e.message,true)}
}
async function createCommercialCoupon(){
  try{
    await commercialRpc('dealzy_admin_create_commercial_coupon',{
      p_code:val('couponCode'),p_description:val('couponDescription'),p_discount_type:val('couponType'),p_discount_value:numOrNull('couponValue')||0,
      p_free_months:numOrNull('couponMonths')||0,p_currency_code:'USD',p_starts_at:isoOrNull('couponStart'),p_ends_at:isoOrNull('couponEnd'),
      p_max_uses:numOrNull('couponMaxUses'),p_scope:'contract'
    });
    flash('Coupon created.');
  }catch(e){flash(e.message,true)}
}
async function applyCommercialCoupon(){
  try{
    if(!val('applyCouponPartner')||!val('applyCouponContract')) throw new Error('Select partner and contract.');
    await commercialRpc('dealzy_apply_commercial_coupon',{
      p_code:val('applyCouponCode'),p_partner_id:val('applyCouponPartner'),p_contract_id:val('applyCouponContract')
    });
    flash('Coupon applied.');
  }catch(e){flash(e.message,true)}
}
async function setCommercialPartnerStatus(id,status){try{await commercialRpc('dealzy_admin_set_partner_status',{p_partner_id:id,p_status:status});flash('Partner '+status+'.')}catch(e){flash(e.message,true);await loadCommercial()}}
async function setCommercialContractStatus(id,status){try{await commercialRpc('dealzy_admin_set_contract_status',{p_contract_id:id,p_status:status});flash('Contract '+status+'.')}catch(e){flash(e.message,true);await loadCommercial()}}
async function setCommercialDealActive(id,active){try{await commercialRpc('dealzy_admin_set_deal_active',{p_deal_id:id,p_active:active});flash(active?'Deal enabled.':'Deal disabled.')}catch(e){flash(e.message,true);await loadCommercial()}}

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
  if((type==='recovery'||type==='invite')&&access_token){
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
    if($('#inviteUserBtn')) $('#inviteUserBtn').classList.toggle('hidden',admin.role!=='superadmin');
    if($('#newOrderBtn')) $('#newOrderBtn').disabled=admin.role==='viewer';
    initAdminNav();
    await loadAll();
    loadStripe().catch(e=>{
      $('#stripeStatus').textContent='Error';
      $('#stripeStatus').className='pill bad';
      $('#stripeNotice').innerHTML='<div class="alert error">'+esc(e.message)+'</div>';
    });
  }catch(e){
    localStorage.removeItem(SESSION_KEY);
    $('#loginView').classList.remove('hidden');$('#adminView').classList.add('hidden');
    $('#loginMsg').innerHTML='<div class="alert error">'+esc(e.message)+'</div>';
  }
}

async function loadAll(){
  const [cfgRows,stats,health,audit,analytics,userRows,commercialData,orderRows]=await Promise.all([
    api('/rest/v1/dealzy_runtime_config?select=key,value,updated_at&order=key.asc'),
    api('/rest/v1/rpc/dealzy_admin_dashboard_stats',{method:'POST',body:'{}'}),
    api('/rest/v1/dealzy_provider_health?select=provider_key,display_name,mode,enabled,healthy,last_checked_at,last_latency_ms,last_error_message&order=provider_key.asc'),
    api('/rest/v1/dealzy_admin_audit_log?select=id,action,target,created_at&order=created_at.desc&limit=20'),
    api('/rest/v1/rpc/dealzy_admin_analytics_snapshot',{method:'POST',body:'{}'}),
    fetchUsers($('#userSearch')?.value||''),
    api('/rest/v1/rpc/dealzy_admin_commercial_snapshot',{method:'POST',body:'{}'}),
    fetchOrders($('#orderSearch')?.value||'')
  ]);
  config={}; for(const row of cfgRows||[]) config[row.key]=row.value||{};
  users=userRows||[];
  commercial=commercialData||commercial;
  orders=orderRows||[];
  analyticsData=analytics||{};renderStats(stats||{});renderAnalytics(analyticsData);renderControls();renderHealth(health||[]);renderAudit(audit||[]);renderUsers(users);renderCommercial();renderOrders(orders);
  showAdminPage(currentAdminPage,{remember:false});
}
function renderStats(s){
  $('#stUsers').textContent=s.users??0;$('#stSaved').textContent=s.saved_deals??0;$('#stTrips').textContent=s.trips??0;$('#stSearches').textContent=s.searches??0;
}

function renderAnalytics(a){
  const n=v=>Number(v||0).toLocaleString();
  const money=v=>Number(v||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
  if($('#anActive7')) $('#anActive7').textContent=n(a.active_7d);
  if($('#anUsers7')) $('#anUsers7').textContent=n(a.users_7d)+' new users';
  if($('#anSearches7')) $('#anSearches7').textContent=n(a.searches_7d);
  if($('#anSearches30')) $('#anSearches30').textContent=n(a.searches_30d)+' in 30d';
  if($('#anSaved')) $('#anSaved').textContent=n(a.saved_total);
  if($('#anSaved7')) $('#anSaved7').textContent=n(a.saved_7d)+' saved in 7d';
  if($('#anOrders')) $('#anOrders').textContent=n(a.orders_total);
  if($('#anOrders30')) $('#anOrders30').textContent=n(a.orders_30d)+' in 30d';
  if($('#anActive30')) $('#anActive30').textContent=n(a.active_30d)+' active 30d';
  if($('#anOrdersConfirmed')) $('#anOrdersConfirmed').textContent=n(a.orders_confirmed);
  if($('#anOrderValue')) $('#anOrderValue').textContent=money(a.orders_value)+' recorded';
  if($('#anTrips')) $('#anTrips').textContent=n(a.trips_total);
  if($('#anUsersTotal')) $('#anUsersTotal').textContent=n(a.users_total);

  const daily=Array.isArray(a.recent_daily_searches)?a.recent_daily_searches:[];
  const max=Math.max(1,...daily.map(x=>Number(x.count||0)));
  if($('#analyticsBars')){
    $('#analyticsBars').innerHTML=daily.length?daily.map(x=>{
      const h=Math.max(3,Math.round((Number(x.count||0)/max)*170));
      const label=x.day?new Date(x.day+'T00:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'}):'';
      return '<div class="analytics-bar-wrap" title="'+esc(label)+' · '+esc(x.count||0)+'"><div class="analytics-bar" style="height:'+h+'px"></div><div class="analytics-bar-label">'+esc(label)+'</div></div>';
    }).join(''):'<div class="sub">No search activity yet.</div>';
  }

  const ranks=(id,rows,key)=>{
    const el=$(id); if(!el) return;
    el.innerHTML=Array.isArray(rows)&&rows.length?rows.map((x,i)=>
      '<div class="analytics-rank"><span class="pill">'+(i+1)+'</span><span class="analytics-rank-name">'+esc(x[key]||'—')+'</span><span class="analytics-rank-count">'+n(x.count)+'</span></div>'
    ).join(''):'<div class="sub">No data yet.</div>';
  };
  ranks('#analyticsTopSearches',a.top_searches,'query');
  ranks('#analyticsTopCategories',a.top_categories,'category');
}

async function fetchUsers(search='',opts={}){
  if(admin?.role==='viewer') return [];
  if(opts.reset) userPage.offset=0;
  const data=await api('/rest/v1/rpc/dealzy_admin_users_page',{
    method:'POST',
    body:JSON.stringify({
      search_text:String(search||''),
      status_filter:$('#userStatusFilter')?.value||'all',
      role_filter:$('#userRoleFilter')?.value||'all',
      page_size:userPage.size,
      page_offset:userPage.offset
    })
  })||{};
  userPage.total=Number(data.total||0);
  userPage.hasMore=!!data.has_more;
  userPage.offset=Number(data.page_offset??userPage.offset);
  userPage.size=Number(data.page_size||userPage.size);
  return Array.isArray(data.rows)?data.rows:[];
}

function userRoleLabel(row){
  if(row.admin_enabled&&row.admin_role==='superadmin') return 'Superadmin';
  if(row.admin_enabled&&row.admin_role==='admin') return 'Admin';
  if(row.admin_enabled&&row.admin_role==='viewer') return 'Viewer';
  return 'User';
}

function renderUsers(rows){
  $('#userCountBadge').textContent=userPage.total+' total';
  renderUserPager(rows||[]);
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

function renderUserPager(rows){
  const prev=$('#userPrevBtn'), next=$('#userNextBtn'), info=$('#userPageInfo');
  if(!prev||!next||!info) return;
  const start=userPage.total?userPage.offset+1:0;
  const end=Math.min(userPage.offset+(rows?.length||0),userPage.total);
  info.textContent=userPage.total?('Showing '+start+'–'+end+' of '+userPage.total):'No users';
  prev.disabled=userPage.offset<=0;
  next.disabled=!userPage.hasMore;
}

async function reloadUsers(reset=false){
  try{
    users=await fetchUsers($('#userSearch')?.value||'',{reset});
    renderUsers(users);
  }catch(e){flash(e.message,true)}
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


async function resolveNotificationUser(email){
  const needle=String(email||'').trim().toLowerCase();
  if(!needle) throw new Error('Enter a user email.');
  const data=await api('/rest/v1/rpc/dealzy_admin_users_page',{
    method:'POST',
    body:JSON.stringify({
      search_text:needle,
      status_filter:'all',
      role_filter:'all',
      page_size:50,
      page_offset:0
    })
  })||{};
  const rows=Array.isArray(data.rows)?data.rows:[];
  const exact=rows.find(x=>String(x.email||'').toLowerCase()===needle);
  if(!exact) throw new Error('No Dealzy user found with that email.');
  return exact;
}

function notificationAudienceLabel(row){
  const scope=String(row.scope||'');
  if(scope==='country') return row.country==='CA'?'Canada':'USA';
  if(scope==='user') return 'One user';
  return 'All users';
}

function renderNotificationHistory(rows){
  notificationCampaigns=Array.isArray(rows)?rows:[];
  if(!$('#notificationHistory')) return;
  $('#notificationHistory').innerHTML=notificationCampaigns.length
    ? notificationCampaigns.map(n=>
        '<div class="history-row"><div class="user-top"><div><b>'+esc(n.title||'Notification')+'</b>'+
        '<div class="sub">'+esc(notificationAudienceLabel(n))+' · '+esc(n.recipients||0)+' recipient'+(Number(n.recipients||0)===1?'':'s')+'</div></div>'+
        '<span class="pill">'+esc(n.sent_at?new Date(n.sent_at).toLocaleString():'')+'</span></div>'+
        '<div class="sub" style="margin-top:7px">'+esc(n.body||'')+'</div></div>'
      ).join('')
    : '<div class="sub">No admin notification campaigns yet.</div>';
}

async function loadAdminNotifications(){
  const rows=await api('/rest/v1/rpc/dealzy_admin_notification_history',{
    method:'POST',
    body:JSON.stringify({limit_count:50})
  });
  renderNotificationHistory(rows||[]);
  const readonly=admin?.role==='viewer';
  ['notificationScope','notificationUserEmail','notificationKind','notificationTitle','notificationBody','sendNotificationBtn']
    .forEach(id=>{const el=$('#'+id);if(el) el.disabled=readonly;});
}

function syncNotificationScope(){
  const scope=$('#notificationScope')?.value||'all';
  if($('#notificationUserWrap')) $('#notificationUserWrap').classList.toggle('hidden',scope!=='user');
}

async function sendAdminNotification(){
  if(admin?.role==='viewer') return flash('Viewer access is read only.',true);
  const scopeChoice=$('#notificationScope').value;
  const title=$('#notificationTitle').value.trim();
  const body=$('#notificationBody').value.trim();
  if(!title||!body){
    $('#notificationMsg').innerHTML='<div class="alert error">Title and message are required.</div>';
    return;
  }

  let target_scope='all', target_country=null, target_user=null;
  if(scopeChoice==='country-us'){target_scope='country';target_country='US';}
  else if(scopeChoice==='country-ca'){target_scope='country';target_country='CA';}
  else if(scopeChoice==='user'){
    target_scope='user';
    const row=await resolveNotificationUser($('#notificationUserEmail').value);
    target_user=row.user_id;
  }

  const audience=scopeChoice==='all'?'ALL Dealzy users':
    scopeChoice==='country-us'?'USA users':
    scopeChoice==='country-ca'?'Canada users':
    $('#notificationUserEmail').value.trim();

  if(!confirm('Send this notification to '+audience+'?')) return;

  $('#sendNotificationBtn').disabled=true;
  $('#notificationMsg').innerHTML='<div class="alert">Sending…</div>';
  try{
    const result=await api('/rest/v1/rpc/dealzy_admin_send_notification',{
      method:'POST',
      body:JSON.stringify({
        target_scope,
        target_user,
        target_country,
        notification_kind:$('#notificationKind').value,
        notification_title:title,
        notification_body:body,
        notification_payload:{}
      })
    });
    $('#notificationMsg').innerHTML='<div class="alert">Sent to '+esc(result?.recipients||0)+' recipient'+(Number(result?.recipients||0)===1?'':'s')+'.</div>';
    $('#notificationTitle').value='';
    $('#notificationBody').value='';
    await loadAdminNotifications();
  }catch(e){
    $('#notificationMsg').innerHTML='<div class="alert error">'+esc(e.message)+'</div>';
  }finally{
    $('#sendNotificationBtn').disabled=admin?.role==='viewer';
  }
}

function messageSelectedUser(){
  if(!selectedUserDetail?.user) return;
  const u=selectedUserDetail.user;
  closeUserModal();
  showAdminPage('notifications');
  $('#notificationScope').value='user';
  syncNotificationScope();
  $('#notificationUserEmail').value=u.email||'';
  $('#notificationTitle').focus();
}

async function fetchOrders(search='',opts={}){
  if(opts.reset) orderPage.offset=0;
  const data=await api('/rest/v1/rpc/dealzy_admin_orders_page',{
    method:'POST',
    body:JSON.stringify({
      search_text:String(search||''),
      status_filter:$('#orderStatusFilter')?.value||'all',
      provider_filter:$('#orderProviderFilter')?.value||'all',
      page_size:orderPage.size,
      page_offset:orderPage.offset
    })
  })||{};
  orderPage.total=Number(data.total||0);
  orderPage.hasMore=!!data.has_more;
  orderPage.offset=Number(data.page_offset??orderPage.offset);
  orderPage.size=Number(data.page_size||orderPage.size);
  return Array.isArray(data.rows)?data.rows:[];
}

function orderStatusPill(status){
  const s=String(status||'pending').toLowerCase();
  const good=['confirmed','completed'].includes(s);
  const bad=['cancelled','failed','refunded'].includes(s);
  return '<span class="pill '+(good?'ok':bad?'bad':'')+'">'+esc(s)+'</span>';
}

function renderOrderPager(rows){
  const prev=$('#orderPrevBtn'), next=$('#orderNextBtn'), info=$('#orderPageInfo');
  if(!prev||!next||!info) return;
  const start=orderPage.total?orderPage.offset+1:0;
  const end=Math.min(orderPage.offset+(rows?.length||0),orderPage.total);
  info.textContent=orderPage.total?('Showing '+start+'–'+end+' of '+orderPage.total):'No orders';
  prev.disabled=orderPage.offset<=0;
  next.disabled=!orderPage.hasMore;
}

function renderOrders(rows){
  if($('#orderCountBadge')) $('#orderCountBadge').textContent=orderPage.total+' total';
  renderOrderPager(rows||[]);
  if(!rows||!rows.length){
    $('#orderRows').innerHTML='<div class="sub">No recorded orders yet. Partner clicks are not treated as orders.</div>';
    return;
  }
  $('#orderRows').innerHTML=rows.map(o=>{
    const customer=o.display_name||o.user_email||'Dealzy user';
    const amount=o.amount==null?'—':Number(o.amount).toFixed(2)+' '+(o.currency_code||'');
    const when=o.booked_at?new Date(o.booked_at).toLocaleString():(o.created_at?new Date(o.created_at).toLocaleString():'—');
    const refund=o.refund_amount==null||Number(o.refund_amount)<=0?'':(' · Refunded '+Number(o.refund_amount).toFixed(2)+' '+(o.currency_code||''));
    return '<div class="user-card">'+
      '<div class="user-top"><div><div class="user-name">'+esc(o.title||o.kind||'Order')+'</div><div class="user-email">'+esc(customer)+' · '+esc(o.user_email||'')+'</div></div><div class="user-meta">'+orderStatusPill(o.status)+'<span class="pill">'+esc(o.provider||'manual')+'</span></div></div>'+
      '<div class="sub" style="margin-top:10px">'+esc(o.external_order_id||'No external reference')+' · '+esc(amount)+' · '+esc(when)+esc(refund)+'</div>'+
      '<div class="user-actions"><button class="btn btn-ghost" data-order-edit="'+esc(o.id)+'">Manage</button><button class="btn btn-ghost" data-order-user="'+esc(o.user_id)+'">Open user</button></div>'+
    '</div>';
  }).join('');
  document.querySelectorAll('[data-order-edit]').forEach(el=>el.onclick=()=>{
    const row=orders.find(x=>String(x.id)===String(el.dataset.orderEdit));
    if(row) openOrderModal(row);
  });
  document.querySelectorAll('[data-order-user]').forEach(el=>el.onclick=()=>openUserModal(el.dataset.orderUser));
}

async function reloadOrders(reset=false){
  try{
    orders=await fetchOrders($('#orderSearch')?.value||'',{reset});
    renderOrders(orders);
  }catch(e){flash(e.message,true)}
}

function localDateTimeInput(value){
  if(!value) return '';
  const d=new Date(value);
  if(Number.isNaN(d.getTime())) return '';
  const pad=n=>String(n).padStart(2,'0');
  return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes());
}

function syncOrderAdvancedFields(){
  const status=$('#orderStatus')?.value||'confirmed';
  const refunded=status==='refunded';
  const cancelled=status==='cancelled';
  if($('#orderRefundWrap')) $('#orderRefundWrap').style.opacity=refunded?'1':'.82';
  if($('#orderCancelWrap')) $('#orderCancelWrap').style.opacity=(refunded||cancelled)?'1':'.82';
}

async function loadOrderEvents(orderId){
  const box=$('#orderHistoryBox'), host=$('#orderHistory');
  if(!box||!host) return;
  if(!orderId){
    box.classList.add('hidden');
    host.innerHTML='';
    return;
  }
  box.classList.remove('hidden');
  host.innerHTML='<div class="sub">Loading history…</div>';
  try{
    const rows=await api('/rest/v1/rpc/dealzy_admin_order_events',{
      method:'POST',
      body:JSON.stringify({target_order:orderId})
    })||[];
    host.innerHTML=Array.isArray(rows)&&rows.length?rows.map(e=>{
      const status=[e.old_status,e.new_status].filter(Boolean).join(' → ');
      const amount=e.amount==null?'':(' · '+Number(e.amount).toFixed(2)+' '+esc(e.currency_code||''));
      const note=e.note?'<div class="sub">'+esc(e.note)+'</div>':'';
      return '<div class="history-row"><b>'+esc(String(e.event_type||'event').replaceAll('_',' '))+'</b>'+
        '<div class="sub">'+esc(e.created_at?new Date(e.created_at).toLocaleString():'')+(status?' · '+esc(status):'')+esc(amount)+'</div>'+note+'</div>';
    }).join(''):'<div class="sub">No order changes recorded yet.</div>';
  }catch(e){
    host.innerHTML='<div class="alert error">'+esc(e.message)+'</div>';
  }
}

function csvCell(value){
  const s=String(value??'');
  return '"'+s.replaceAll('"','""')+'"';
}

async function exportOrdersCsv(){
  try{
    const rows=await api('/rest/v1/rpc/dealzy_admin_orders_export',{
      method:'POST',
      body:JSON.stringify({
        search_text:$('#orderSearch')?.value||'',
        status_filter:$('#orderStatusFilter')?.value||'all',
        provider_filter:$('#orderProviderFilter')?.value||'all'
      })
    })||[];
    const headers=['id','customer_email','customer_name','provider','external_reference','kind','title','status','amount','currency','refund_amount','booked_at','refunded_at','cancelled_at','cancellation_reason','notes','created_at','updated_at'];
    const lines=[headers.join(',')];
    for(const r of Array.isArray(rows)?rows:[]){
      lines.push([
        r.id,r.user_email,r.display_name,r.provider,r.external_order_id,r.kind,r.title,r.status,
        r.amount,r.currency_code,r.refund_amount,r.booked_at,r.refunded_at,r.cancelled_at,
        r.cancellation_reason,r.notes,r.created_at,r.updated_at
      ].map(csvCell).join(','));
    }
    const blob=new Blob(['\ufeff'+lines.join('\n')],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download='dealzy-orders-'+new Date().toISOString().slice(0,10)+'.csv';
    document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
    flash('Orders CSV exported.');
  }catch(e){flash(e.message,true)}
}

function openOrderModal(row=null){
  selectedOrder=row||null;
  $('#orderModalTitle').textContent=row?'Manage order':'Record order';
  $('#orderModalMsg').innerHTML='';
  $('#orderUserEmail').value=row?.user_email||'';
  $('#orderProvider').value=row?.provider||'manual';
  $('#orderExternalId').value=row?.external_order_id||'';
  $('#orderKind').value=['booking','activity','hotel','flight','car','restaurant','other'].includes(row?.kind)?row.kind:'booking';
  $('#orderTitle').value=row?.title||'';
  $('#orderStatus').value=['pending','confirmed','completed','cancelled','refunded','failed'].includes(row?.status)?row.status:'confirmed';
  $('#orderAmount').value=row?.amount==null?'':row.amount;
  $('#orderCurrency').value=row?.currency_code==='CAD'?'CAD':'USD';
  $('#orderBookedAt').value=localDateTimeInput(row?.booked_at||new Date().toISOString());
  $('#orderRefundAmount').value=row?.refund_amount==null?'':row.refund_amount;
  $('#orderCancellationReason').value=row?.cancellation_reason||'';
  $('#orderNotes').value=row?.notes||'';
  const readonly=admin?.role==='viewer';
  ['orderUserEmail','orderProvider','orderExternalId','orderKind','orderTitle','orderStatus','orderAmount','orderCurrency','orderBookedAt','orderRefundAmount','orderCancellationReason','orderNotes','saveOrderBtn']
    .forEach(id=>{const el=$('#'+id);if(el) el.disabled=readonly;});
  syncOrderAdvancedFields();
  $('#orderModal').classList.remove('hidden');
  loadOrderEvents(row?.id||null);
}

function closeOrderModal(){
  selectedOrder=null;
  $('#orderModal').classList.add('hidden');
  $('#orderModalMsg').innerHTML='';
  if($('#orderHistory')) $('#orderHistory').innerHTML='';
  if($('#orderHistoryBox')) $('#orderHistoryBox').classList.add('hidden');
}

async function saveOrder(){
  if(admin?.role==='viewer') return;
  const email=$('#orderUserEmail').value.trim();
  if(!email) return $('#orderModalMsg').innerHTML='<div class="alert error">Customer email is required.</div>';
  const amountRaw=$('#orderAmount').value;
  const bookedRaw=$('#orderBookedAt').value;
  $('#saveOrderBtn').disabled=true;
  try{
    await api('/rest/v1/rpc/dealzy_admin_save_order_v2',{
      method:'POST',
      body:JSON.stringify({
        order_id:selectedOrder?.id||null,
        target_user:selectedOrder?.user_id||null,
        target_email:email,
        provider_value:$('#orderProvider').value.trim()||'manual',
        external_order_value:$('#orderExternalId').value.trim()||null,
        kind_value:$('#orderKind').value,
        title_value:$('#orderTitle').value.trim()||null,
        status_value:$('#orderStatus').value,
        amount_value:amountRaw===''?null:Number(amountRaw),
        currency_value:$('#orderCurrency').value,
        booked_at_value:bookedRaw?new Date(bookedRaw).toISOString():null,
        notes_value:$('#orderNotes').value.trim()||null,
        refund_amount_value:$('#orderRefundAmount').value===''?null:Number($('#orderRefundAmount').value),
        cancellation_reason_value:$('#orderCancellationReason').value.trim()||null,
        metadata_value:selectedOrder?.metadata||{}
      })
    });
    $('#orderModalMsg').innerHTML='<div class="alert">Order saved.</div>';
    await reloadOrders(false);
    setTimeout(closeOrderModal,650);
  }catch(e){
    $('#orderModalMsg').innerHTML='<div class="alert error">'+esc(e.message)+'</div>';
  }finally{
    $('#saveOrderBtn').disabled=admin?.role==='viewer';
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


$('#notificationScope').onchange=syncNotificationScope;
$('#sendNotificationBtn').onclick=()=>sendAdminNotification().catch(e=>{
  $('#notificationMsg').innerHTML='<div class="alert error">'+esc(e.message)+'</div>';
  $('#sendNotificationBtn').disabled=admin?.role==='viewer';
});
$('#refreshNotificationsBtn').onclick=()=>loadAdminNotifications().catch(e=>flash(e.message,true));
$('#messageUserBtn').onclick=messageSelectedUser;
syncNotificationScope();

$('#refreshStripeBtn').onclick=()=>loadStripe().catch(e=>flash(e.message,true));
document.querySelectorAll('[data-refresh-commercial]').forEach(btn=>btn.onclick=()=>loadCommercial().catch(e=>flash(e.message,true)));
$('#createPartnerBtn').onclick=createCommercialPartner;
$('#createContractBtn').onclick=createCommercialContract;
$('#createDirectDealBtn').onclick=createCommercialDeal;
$('#recordTransactionBtn').onclick=recordCommercialTransaction;
$('#createCouponBtn').onclick=createCommercialCoupon;
$('#applyCouponBtn').onclick=applyCommercialCoupon;
$('#newOrderBtn').onclick=()=>openOrderModal(null);
$('#exportOrdersBtn').onclick=exportOrdersCsv;
$('#orderStatus').onchange=syncOrderAdvancedFields;
$('#closeOrderModal').onclick=closeOrderModal;
$('#orderModal').addEventListener('click',e=>{if(e.target===$('#orderModal')) closeOrderModal()});
$('#saveOrderBtn').onclick=saveOrder;
$('#orderSearchBtn').onclick=()=>reloadOrders(true);
$('#orderSearch').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();reloadOrders(true)}});
$('#orderStatusFilter').onchange=()=>reloadOrders(true);
$('#orderProviderFilter').onchange=()=>reloadOrders(true);
$('#orderPrevBtn').onclick=()=>{orderPage.offset=Math.max(0,orderPage.offset-orderPage.size);reloadOrders(false)};
$('#orderNextBtn').onclick=()=>{if(!orderPage.hasMore)return;orderPage.offset+=orderPage.size;reloadOrders(false)};
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
$('#inviteUserBtn').onclick=openInviteUserModal;
$('#exportUsersBtn').onclick=exportUsersCsv;
$('#closeInviteUserModal').onclick=closeInviteUserModal;
$('#inviteUserModal').addEventListener('click',e=>{if(e.target===$('#inviteUserModal')) closeInviteUserModal()});
$('#sendInviteUserBtn').onclick=inviteUser;
$('#saveUserIdentityBtn').onclick=saveSelectedIdentity;
$('#saveUserRoleBtn').onclick=saveSelectedRole;
$('#saveUserStatusBtn').onclick=saveSelectedStatus;
$('#sendUserResetBtn').onclick=sendSelectedReset;
$('#setUserPasswordBtn').onclick=setSelectedPassword;
$('#userSearchBtn').onclick=()=>reloadUsers(true);
$('#userSearch').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();reloadUsers(true)}});
$('#userStatusFilter').onchange=()=>reloadUsers(true);
$('#userRoleFilter').onchange=()=>reloadUsers(true);
$('#userPrevBtn').onclick=()=>{userPage.offset=Math.max(0,userPage.offset-userPage.size);reloadUsers(false)};
$('#userNextBtn').onclick=()=>{if(!userPage.hasMore)return;userPage.offset+=userPage.size;reloadUsers(false)};
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