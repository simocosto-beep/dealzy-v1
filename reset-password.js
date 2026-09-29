(()=>{
const SB_URL='https://stkmhgeuavsidpapqvyw.supabase.co';
const SB_KEY='sb_publishable_EVDiDkczLgCmggcMxbV8tw_jQm4g9Rh';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const params=new URLSearchParams(location.hash.replace(/^#/,''));
const token=params.get('access_token')||'';
const type=params.get('type')||'';
const isInvite=type==='invite';
const isRecovery=type==='recovery';

function show(msg,bad=false){
  $('#msg').innerHTML='<div class="alert '+(bad?'error':'')+'">'+esc(msg)+'</div>';
}
function invalid(){
  $('#form').classList.add('hidden');
  $('#title').textContent='Link expired or invalid';
  $('#subtitle').textContent='Request a new password reset link and try again.';
}
async function getUser(){
  const r=await fetch(SB_URL+'/auth/v1/user',{headers:{'apikey':SB_KEY,'Authorization':'Bearer '+token}});
  if(!r.ok) throw new Error('Invalid or expired link');
  return r.json();
}
async function destination(userId){
  try{
    const r=await fetch(SB_URL+'/rest/v1/dealzy_admin_users?select=role,enabled&user_id=eq.'+encodeURIComponent(userId),{
      headers:{'apikey':SB_KEY,'Authorization':'Bearer '+token}
    });
    if(!r.ok) return '/';
    const rows=await r.json();
    if(Array.isArray(rows)&&rows[0]?.enabled&&['viewer','admin','superadmin'].includes(rows[0].role)) return '/admin';
  }catch(_){}
  return '/';
}
async function save(){
  const p=$('#password').value;
  const c=$('#confirmPassword').value;
  if(p.length<12) return show('Use at least 12 characters.',true);
  if(p!==c) return show('Passwords do not match.',true);
  $('#saveBtn').disabled=true;
  try{
    const user=await getUser();
    const r=await fetch(SB_URL+'/auth/v1/user',{
      method:'PUT',
      headers:{'apikey':SB_KEY,'Authorization':'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify({password:p})
    });
    const data=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(data.msg||data.error_description||'Could not update password');
    history.replaceState(null,'',location.pathname);
    $('#form').classList.add('hidden');
    show(isInvite?'Account activated. Redirecting…':'Password updated. Redirecting…');
    const dest=await destination(user.id);
    setTimeout(()=>location.href=dest,900);
  }catch(e){
    show(e.message||'Could not update password',true);
    $('#saveBtn').disabled=false;
  }
}

if(!token||(!isInvite&&!isRecovery)){
  invalid();
}else{
  $('#title').textContent=isInvite?'Activate your Dealzy account':'Choose a new password';
  $('#subtitle').textContent=isInvite?'Set your password to finish creating your Dealzy account.':'Set a new password for your Dealzy account.';
  $('#saveBtn').onclick=save;
  $('#confirmPassword').addEventListener('keydown',e=>{if(e.key==='Enter')save()});
  getUser().catch(()=>invalid());
}
})();