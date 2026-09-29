
(function(){
  'use strict';
  var SB='https://stkmhgeuavsidpapqvyw.supabase.co';
  var KEY='sb_publishable_EVDiDkczLgCmggcMxbV8tw_jQm4g9Rh';
  var FN=SB+'/functions/v1/dealzy-admin-user-auth';
  var SESSION_KEY='dealzyCloudSession';
  var PROFILE_KEY='dealzyLocalProfile';
  function q(s,r){return (r||document).querySelector(s)}
  function qa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
  function read(k,f){try{return JSON.parse(localStorage.getItem(k)||'null')||f}catch(e){return f}}
  function session(){return read(SESSION_KEY,null)}
  function saveSession(s){localStorage.setItem(SESSION_KEY,JSON.stringify(s))}
  function money(v,c){var n=Number(v||0);if(!n)return '—';return (c==='CAD'?'CA$':'$')+n.toFixed(2)}
  function headers(s,json){var h={'apikey':KEY,'Authorization':'Bearer '+s.access_token};if(json)h['Content-Type']='application/json';return h}
  async function sb(s,path,opt){
    opt=opt||{};
    var h=Object.assign({},headers(s,opt.body!==undefined),opt.headers||{});
    var r=await fetch(SB+path,Object.assign({},opt,{headers:h}));
    var t=await r.text(),d=null;try{d=t?JSON.parse(t):null}catch(e){d=t}
    if(r.status===401){localStorage.removeItem(SESSION_KEY);throw new Error('Session expired. Sign in again.')}
    if(!r.ok){throw new Error((d&&typeof d==='object'&&(d.message||d.msg||d.error_description||d.error))||('Request failed: '+r.status))}
    return d
  }
  async function rpc(s,name,args){return sb(s,'/rest/v1/rpc/'+encodeURIComponent(name),{method:'POST',body:JSON.stringify(args||{})})}
  async function edge(s,payload){
    var r=await fetch(FN,{method:'POST',headers:{'apikey':KEY,'Authorization':'Bearer '+s.access_token,'Content-Type':'application/json'},body:JSON.stringify(payload)});
    var d=await r.json().catch(function(){return {}});
    if(!r.ok)throw new Error(d.error||d.message||('Admin action failed: '+r.status));
    return d
  }

  var st=document.createElement('style');
  st.textContent='.dza-wrap{position:fixed;inset:0;background:rgba(17,24,39,.5);z-index:160;display:none;align-items:flex-end;justify-content:center}.dza-wrap.open{display:flex}.dza-sheet{width:min(760px,100%);max-height:94vh;overflow:auto;background:#f8f9fc;border-radius:28px 28px 0 0;padding:18px;box-shadow:0 -18px 55px rgba(0,0,0,.22)}.dza-head{display:flex;justify-content:space-between;gap:12px;align-items:center}.dza-head h2{margin:0}.dza-close{width:40px;height:40px;border:0;border-radius:50%;background:#fff;font-size:20px}.dza-card{background:#fff;border:1px solid #e7e9f0;border-radius:18px;padding:15px;margin-top:12px}.dza-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.dza-grid label{font-size:12px;color:#667085}.dza-grid input,.dza-grid select{width:100%;margin-top:5px;border:1px solid #dfe3eb;border-radius:12px;padding:11px;background:#fff}.dza-btn{border:0;border-radius:12px;padding:11px 14px;background:#111827;color:#fff;font-weight:800;margin:10px 8px 0 0}.dza-btn.alt{background:#eef2ff;color:#5145cd}.dza-btn.bad{background:#b42318}.dza-small{font-size:12px;color:#667085;line-height:1.5}.dza-chip{display:inline-block;padding:5px 8px;border-radius:999px;background:#eef0f7;margin:3px;font-size:11px;font-weight:800}.dza-row{border-top:1px solid #eef0f4;padding:10px 0}.dza-msg{margin-top:8px;font-size:12px;color:#475467}.dza-search{display:flex;gap:8px}.dza-search input{flex:1;border:1px solid #dfe3eb;border-radius:12px;padding:11px}@media(max-width:560px){.dza-sheet{padding:14px}.dza-grid{grid-template-columns:1fr}.dza-search{display:block}.dza-search .dza-btn{width:100%}}';
  document.head.appendChild(st);

  var wrap=document.createElement('div');
  wrap.className='dza-wrap';
  wrap.innerHTML='<section class="dza-sheet" role="dialog" aria-modal="true"><div class="dza-head"><div><h2>My Dealzy</h2><div class="dza-small">Account, password, orders and users.</div></div><button class="dza-close" type="button">×</button></div><div id="dzaBody"></div></section>';
  document.body.appendChild(wrap);
  var body=q('#dzaBody',wrap);
  function open(){wrap.classList.add('open');render()}
  function close(){wrap.classList.remove('open')}
  q('.dza-close',wrap).onclick=close;
  wrap.onclick=function(e){if(e.target===wrap)close()};

  function orderHtml(rows){
    rows=Array.isArray(rows)?rows:[];
    if(!rows.length)return '<div class="dza-card">No Dealzy orders or reservations yet.</div>';
    return rows.map(function(o){
      var dt=o.booked_at||o.created_at;
      return '<div class="dza-card"><b>'+esc(o.title||o.kind||'Order')+'</b><br><span class="dza-small">'+esc(o.provider||'Dealzy')+' · '+esc(o.status||'pending')+' · '+esc(money(o.amount,o.currency_code||'USD'))+'</span><br><span class="dza-small">'+esc(dt?new Date(dt).toLocaleString():'—')+(o.external_order_id?' · #'+esc(o.external_order_id):'')+'</span></div>'
    }).join('')
  }

  async function currentData(s){
    var uid=s.user&&s.user.id;
    var tasks=[
      sb(s,'/auth/v1/user',{method:'GET'}),
      uid?sb(s,'/rest/v1/dealzy_profiles?select=display_name,user_id&user_id=eq.'+encodeURIComponent(uid)+'&limit=1',{method:'GET'}):Promise.resolve([]),
      rpc(s,'dealzy_account_access',{}),
      sb(s,'/rest/v1/dealzy_orders?select=id,provider,external_order_id,kind,title,status,amount,currency_code,booked_at,created_at&order=created_at.desc&limit=50',{method:'GET'}),
      uid?sb(s,'/rest/v1/dealzy_admin_users?select=role,enabled&user_id=eq.'+encodeURIComponent(uid)+'&limit=1',{method:'GET'}).catch(function(){return []}):Promise.resolve([])
    ];
    var a=await Promise.all(tasks);
    return {user:a[0]||{},profile:Array.isArray(a[1])?(a[1][0]||{}):{},access:a[2]||{},orders:Array.isArray(a[3])?a[3]:[],admin:Array.isArray(a[4])?(a[4][0]||null):null}
  }

  async function saveOwn(s,d){
    var msg=q('#dzaOwnMsg',body),name=q('#dzaName',body).value.trim().slice(0,120),email=q('#dzaEmail',body).value.trim(),phone=q('#dzaPhone',body).value.trim();
    if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){msg.textContent='Enter a valid email.';return}
    msg.textContent='Saving…';
    try{
      var patch={},u=d.user||{},meta=u.user_metadata||{};
      if(email!==String(u.email||''))patch.email=email;
      if(phone&&phone!==String(u.phone||''))patch.phone=phone;
      if(name!==String(d.profile.display_name||meta.display_name||meta.full_name||''))patch.data=Object.assign({},meta,{display_name:name,full_name:name,name:name});
      var updated=u;
      if(Object.keys(patch).length)updated=await sb(s,'/auth/v1/user',{method:'PUT',body:JSON.stringify(patch)});
      if(s.user&&s.user.id)await sb(s,'/rest/v1/dealzy_profiles?on_conflict=user_id',{method:'POST',headers:{'Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({user_id:s.user.id,display_name:name||null,updated_at:new Date().toISOString()})});
      var ns=Object.assign({},s,{user:(updated&&updated.id)?updated:Object.assign({},s.user||{},{email:email,phone:phone})});
      saveSession(ns);localStorage.setItem(PROFILE_KEY,JSON.stringify({name:name,email:email,phone:phone,updatedAt:new Date().toISOString()}));
      msg.textContent='Account updated.';setTimeout(render,600)
    }catch(e){msg.textContent=e.message||'Update failed'}
  }

  async function changeOwnPassword(s){
    var msg=q('#dzaPwMsg',body),p=q('#dzaPw',body).value,c=q('#dzaPw2',body).value;
    if(p.length<8){msg.textContent='Use at least 8 characters.';return}
    if(p!==c){msg.textContent='Passwords do not match.';return}
    msg.textContent='Updating…';
    try{await sb(s,'/auth/v1/user',{method:'PUT',body:JSON.stringify({password:p})});q('#dzaPw',body).value='';q('#dzaPw2',body).value='';msg.textContent='Password updated.'}catch(e){msg.textContent=e.message||'Password update failed'}
  }

  async function usersList(s,role,query){
    body.innerHTML='<div class="dza-card"><b>Users & Admins</b><div class="dza-search" style="margin-top:10px"><input id="dzaUserQ" value="'+esc(query||'')+'" placeholder="Search name, email or phone"><button class="dza-btn" id="dzaUserSearch">Search</button></div><button class="dza-btn alt" id="dzaBackAccount">← My account</button><div id="dzaUsers"><div class="dza-small">Loading users…</div></div></div>';
    q('#dzaBackAccount',body).onclick=render;
    var run=async function(){
      var box=q('#dzaUsers',body),v=q('#dzaUserQ',body).value.trim();box.innerHTML='<div class="dza-small">Loading users…</div>';
      try{
        var d=await rpc(s,'dealzy_admin_users_page',{search_text:v,status_filter:'all',role_filter:'all',page_size:50,page_offset:0});
        var rows=Array.isArray(d&&d.rows)?d.rows:[];
        box.innerHTML='<div class="dza-small" style="margin-top:10px"><b>'+Number(d&&d.total||rows.length)+' user(s)</b></div>'+rows.map(function(u){
          return '<div class="dza-row"><b>'+esc(u.display_name||u.email||'User')+'</b><br><span class="dza-small">'+esc(u.email||'')+(u.phone?' · '+esc(u.phone):'')+'</span><br><span class="dza-chip">'+esc(u.account_status||'active')+'</span><span class="dza-chip">'+esc(u.admin_role||'user')+'</span>'+(u.is_protected_superadmin?'<span class="dza-chip">protected</span>':'')+'<br><button class="dza-btn alt" data-user="'+esc(u.user_id)+'">Manage</button></div>'
        }).join('');
        qa('[data-user]',box).forEach(function(b){b.onclick=function(){userDetail(s,role,b.getAttribute('data-user'))}})
      }catch(e){box.innerHTML='<div class="dza-card">'+esc(e.message||'Could not load users')+'</div>'}
    };
    q('#dzaUserSearch',body).onclick=run;
    q('#dzaUserQ',body).addEventListener('keydown',function(e){if(e.key==='Enter')run()});
    run()
  }

  async function userDetail(s,role,id){
    body.innerHTML='<div class="dza-card">Loading user…</div>';
    try{
      var d=await rpc(s,'dealzy_admin_user_detail',{target_user:id}),u=d.user||{},counts=d.counts||{};
      var protectedAcc=!!u.protected_superadmin,canStatus=!u.is_self&&!protectedAcc,canRole=role==='superadmin'&&!u.is_self&&!protectedAcc,canPw=role==='superadmin';
      body.innerHTML='<div class="dza-card"><button class="dza-btn alt" id="dzaBackUsers">← Users</button><h3>'+esc(u.display_name||u.email||'User')+'</h3><div class="dza-small">'+esc(u.email||'')+(u.phone?' · '+esc(u.phone):'')+'</div><span class="dza-chip">'+esc(u.status||'active')+'</span><span class="dza-chip">'+esc(u.role||'user')+'</span>'+(protectedAcc?'<span class="dza-chip">protected superadmin</span>':'')+'</div>'+
      '<div class="dza-card"><b>Identity</b><div class="dza-grid" style="margin-top:8px"><label>Name<input id="dzaAName" value="'+esc(u.display_name||'')+'"></label><label>Email<input id="dzaAEmail" type="email" value="'+esc(u.email||'')+'"></label><label>Phone<input id="dzaAPhone" type="tel" value="'+esc(u.phone||'')+'"></label></div><button class="dza-btn" id="dzaASave">Save identity</button><div class="dza-msg" id="dzaAIdMsg"></div></div>'+
      (canStatus?'<div class="dza-card"><b>Account status</b><div class="dza-grid" style="margin-top:8px"><label>Reason<input id="dzaAReason" value="'+esc(u.status_reason||'')+'"></label><label>Internal notes<input id="dzaANotes" value="'+esc(u.notes||'')+'"></label></div><button class="dza-btn alt" data-st="active">Activate</button><button class="dza-btn alt" data-st="disabled">Disable</button><button class="dza-btn bad" data-st="blacklisted">Blacklist</button><div class="dza-msg" id="dzaAStMsg"></div></div>':'')+
      (canRole?'<div class="dza-card"><b>Role</b><div class="dza-grid"><label>Access<select id="dzaARole"><option value="user">user</option><option value="viewer">viewer</option><option value="admin">admin</option></select></label></div><button class="dza-btn alt" id="dzaARoleSave">Update role</button><div class="dza-msg" id="dzaARoleMsg"></div></div>':'')+
      (canPw?'<div class="dza-card"><b>Password</b><div class="dza-grid"><label>New password<input id="dzaAPw" type="password" placeholder="12+ chars, upper/lower/number"></label></div><button class="dza-btn" id="dzaAPwSave">Set password</button><div class="dza-msg" id="dzaAPwMsg"></div></div>':'')+
      '<div class="dza-card"><b>Order history</b><div class="dza-small">'+Number(counts.orders||0)+' order(s) · '+Number(counts.booked_trip_items||0)+' booked trip item(s)</div></div>'+orderHtml(d.orders||[]);
      q('#dzaBackUsers',body).onclick=function(){usersList(s,role,'')};
      q('#dzaASave',body).onclick=async function(){var m=q('#dzaAIdMsg',body);m.textContent='Saving…';try{await edge(s,{action:'update_identity',target_user:id,display_name:q('#dzaAName',body).value.trim(),email:q('#dzaAEmail',body).value.trim(),phone:q('#dzaAPhone',body).value.trim()});m.textContent='Identity updated.';setTimeout(function(){userDetail(s,role,id)},500)}catch(e){m.textContent=e.message||'Update failed'}};
      qa('[data-st]',body).forEach(function(b){b.onclick=async function(){var stv=b.getAttribute('data-st');if(stv!=='active'&&!confirm('Change this account to '+stv+'?'))return;var m=q('#dzaAStMsg',body);m.textContent='Updating…';try{await edge(s,{action:'set_status',target_user:id,status:stv,reason:q('#dzaAReason',body).value.trim(),notes:q('#dzaANotes',body).value.trim()});m.textContent='Status updated.';setTimeout(function(){userDetail(s,role,id)},500)}catch(e){m.textContent=e.message||'Update failed'}}});
      var rs=q('#dzaARole',body);if(rs){rs.value=String(u.role||'user');q('#dzaARoleSave',body).onclick=async function(){var m=q('#dzaARoleMsg',body);m.textContent='Updating…';try{await rpc(s,'dealzy_superadmin_set_staff',{target_user:id,new_role:rs.value});m.textContent='Role updated.';setTimeout(function(){userDetail(s,role,id)},500)}catch(e){m.textContent=e.message||'Role update failed'}}}
      var ps=q('#dzaAPwSave',body);if(ps)ps.onclick=async function(){var p=q('#dzaAPw',body).value,m=q('#dzaAPwMsg',body);if(p.length<12){m.textContent='Use at least 12 characters.';return}if(!/[a-z]/.test(p)||!/[A-Z]/.test(p)||!/[0-9]/.test(p)){m.textContent='Include upper-case, lower-case and a number.';return}if(!confirm('Set a new password for this user?'))return;m.textContent='Updating…';try{await edge(s,{action:'set_password',target_user:id,password:p});q('#dzaAPw',body).value='';m.textContent='Password updated.'}catch(e){m.textContent=e.message||'Password update failed'}}
    }catch(e){body.innerHTML='<div class="dza-card"><button class="dza-btn alt" id="dzaBackUsers">← Users</button><div>'+esc(e.message||'Could not load user')+'</div></div>';q('#dzaBackUsers',body).onclick=function(){usersList(s,role,'')}}
  }

  async function signedIn(s){
    body.innerHTML='<div class="dza-card">Loading account…</div>';
    try{
      var d=await currentData(s),u=d.user||{},meta=u.user_metadata||{},name=d.profile.display_name||meta.display_name||meta.full_name||'',role=d.admin&&d.admin.enabled?String(d.admin.role||''):'';
      body.innerHTML='<div class="dza-card"><b>'+esc(name||u.email||'Dealzy account')+'</b><br><span class="dza-small">'+esc(u.email||'')+(u.phone?' · '+esc(u.phone):'')+'</span><br><span class="dza-chip">'+esc(d.access.status||'active')+'</span>'+(role?'<span class="dza-chip">'+esc(role)+'</span>':'')+'</div>'+
      '<div class="dza-card"><b>My account</b><div class="dza-grid" style="margin-top:8px"><label>Name<input id="dzaName" value="'+esc(name)+'"></label><label>Email<input id="dzaEmail" type="email" value="'+esc(u.email||'')+'"></label><label>Phone<input id="dzaPhone" type="tel" value="'+esc(u.phone||'')+'"></label></div><button class="dza-btn" id="dzaSave">Save account</button><div class="dza-msg" id="dzaOwnMsg"></div></div>'+
      '<div class="dza-card"><b>Change password</b><div class="dza-grid" style="margin-top:8px"><label>New password<input id="dzaPw" type="password"></label><label>Confirm password<input id="dzaPw2" type="password"></label></div><button class="dza-btn" id="dzaPwBtn">Change password</button><div class="dza-msg" id="dzaPwMsg"></div></div>'+
      '<div class="dza-card"><b>Order history</b><div class="dza-small">'+d.orders.length+' order(s)</div></div>'+orderHtml(d.orders)+
      ((role==='admin'||role==='superadmin')?'<div class="dza-card"><b>Admin tools</b><div class="dza-small">Activate, disable, blacklist, edit users and view their orders.</div><button class="dza-btn" id="dzaUsersBtn">Users & Admins</button></div>':'')+
      '<div class="dza-card"><button class="dza-btn alt" id="dzaLogout">Sign out</button></div>';
      q('#dzaSave',body).onclick=function(){saveOwn(s,d)};
      q('#dzaPwBtn',body).onclick=function(){changeOwnPassword(s)};
      var ub=q('#dzaUsersBtn',body);if(ub)ub.onclick=function(){usersList(s,role,'')};
      q('#dzaLogout',body).onclick=function(){localStorage.removeItem(SESSION_KEY);render()}
    }catch(e){body.innerHTML='<div class="dza-card">'+esc(e.message||'Could not load account')+'</div><button class="dza-btn alt" id="dzaLogout">Sign out</button>';var b=q('#dzaLogout',body);if(b)b.onclick=function(){localStorage.removeItem(SESSION_KEY);render()}}
  }

  function signedOut(){
    var p=read(PROFILE_KEY,{name:'',email:''});
    body.innerHTML='<div class="dza-card"><b>Sign in to My Dealzy</b><div class="dza-grid" style="margin-top:8px"><label>Email<input id="dzaLoginEmail" type="email" value="'+esc(p.email||'')+'"></label><label>Password<input id="dzaLoginPw" type="password"></label></div><button class="dza-btn" id="dzaLogin">Sign in</button><button class="dza-btn alt" id="dzaSignup">Create account</button><div class="dza-msg" id="dzaAuthMsg"></div></div>';
    async function go(action){
      var m=q('#dzaAuthMsg',body),email=q('#dzaLoginEmail',body).value.trim(),pw=q('#dzaLoginPw',body).value;if(!email||!pw){m.textContent='Enter email and password.';return}m.textContent=action==='login'?'Signing in…':'Creating account…';
      try{var r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:action,email:email,password:pw})}),d=await r.json();if(!r.ok)throw new Error(d.error||d.msg||d.message||d.error_description||'Authentication failed');if(d.access_token){d.expires_at=Math.floor(Date.now()/1000)+Number(d.expires_in||3600);saveSession(d);localStorage.setItem(PROFILE_KEY,JSON.stringify(Object.assign({},p,{email:email,updatedAt:new Date().toISOString()})));render()}else m.textContent='Account created. Confirm your email, then sign in.'}catch(e){m.textContent=e.message||'Authentication failed'}
    }
    q('#dzaLogin',body).onclick=function(){go('login')};q('#dzaSignup',body).onclick=function(){go('signup')}
  }

  function render(){var s=session();if(s&&s.access_token)signedIn(s);else signedOut()}
  window.DealzyAccount={open:open,close:close,render:render};

  function bind(){
    var p=q('#openDealzyAccount');if(p)p.onclick=open;
    var t=q('[data-tool="account"]');if(t)t.onclick=open
  }
  bind();setTimeout(bind,500);setTimeout(bind,1600);
})();
