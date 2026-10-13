/* Day/night ambiance. This tiny head script sets the palette before first paint. */
(() => {
  'use strict';
  const root=document.documentElement;
  let preference='auto';
  try{const saved=localStorage.getItem('dealzyTheme');if(['day','night','auto'].includes(saved))preference=saved;}catch(_){}
  const french=()=>window.DealzyI18n?.getLocale()==='fr';
  const resolve=()=>{if(preference!=='auto')return preference;const hour=new Date().getHours();return hour>=7&&hour<19?'day':'night';};
  function sync(announce=false){
    const theme=resolve(),night=theme==='night',fr=french();
    root.dataset.theme=theme;
    root.dataset.themePreference=preference;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',night?'#081b20':'#123c32');
    const toggle=document.getElementById('dzThemeToggle');
    if(toggle){
      const label=night?(fr?'Activer le mode jour':'Switch to day mode'):(fr?'Activer le mode nuit':'Switch to night mode');
      toggle.setAttribute('aria-label',label);
      toggle.setAttribute('aria-pressed',String(night));
      toggle.title=label;
    }
    document.querySelectorAll('[data-dz-theme-auto]').forEach(button=>{
      button.textContent=fr?'Ambiance automatique':'Automatic ambiance';
      button.setAttribute('aria-pressed',String(preference==='auto'));
      button.title=fr?'Jour de 7 h à 19 h, selon l’heure de votre appareil':'Day from 7 am to 7 pm, using your device time';
    });
    const caption=document.querySelector('.photoCaption>span:last-child');
    if(caption)caption.textContent=night?(fr?'Un peu plus près des étoiles':'A little closer to the stars'):(fr?'Un peu plus près du soleil':'A little closer to the sunshine');
    const photograph=document.querySelector('.heroPhoto>img');
    if(photograph?.getAttribute('src')?.includes('escape-horizon.webp'))photograph.alt=night?(fr?'Une voyageuse face à un lac de montagne sous un ciel étoilé':'A traveler overlooking a mountain lake beneath a starry sky'):(fr?'Une voyageuse contemple un lac de montagne au soleil couchant':'A traveler overlooking a mountain lake at sunset');
    const status=document.getElementById('dzThemeStatus');
    if(announce&&status)status.textContent=fr?(night?'Mode nuit activé':'Mode jour activé'):(night?'Night mode on':'Day mode on');
  }
  function set(value){
    if(!['day','night','auto'].includes(value))return;
    preference=value;
    try{localStorage.setItem('dealzyTheme',value);}catch(_){}
    sync(true);
  }
  sync();
  function init(){
    document.getElementById('dzThemeToggle')?.addEventListener('click',()=>set(resolve()==='night'?'day':'night'));
    document.querySelectorAll('[data-dz-theme-auto]').forEach(button=>button.addEventListener('click',()=>set('auto')));
    document.addEventListener('dealzy:localechange',()=>sync());
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});
    window.addEventListener('storage',event=>{
      if(event.key==='dealzyTheme'||event.key===null){
        preference=['day','night','auto'].includes(event.newValue)?event.newValue:'auto';sync();
      }
    });
    // No network or geolocation; hidden documents skip the local time check.
    setInterval(()=>{if(preference==='auto'&&!document.hidden)sync();},60000);
    sync();
  }
  window.DealzyTheme={get:()=>({theme:resolve(),preference}),set};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
