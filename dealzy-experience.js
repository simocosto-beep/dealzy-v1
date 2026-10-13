/* Warm experience UI: uses the existing market, search and navigation functions. */
(() => {
  'use strict';
  const doc=document, body=doc.body;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const isFrench=()=>window.DealzyI18n?.getLocale()==='fr';
  const languageButton=doc.getElementById('dzLocaleToggle');
  const motionButton=doc.getElementById('dzMotionToggle');
  const query=doc.getElementById('aiQuery');
  const dock=doc.getElementById('dzHelperDock');
  ['.dz-ai-fab','.dz-tools-fab'].forEach(selector=>{const button=doc.querySelector(selector);if(button&&dock)dock.appendChild(button);});
  doc.querySelectorAll('[data-dz-utility]').forEach(button=>button.addEventListener('click',()=>doc.querySelector(button.dataset.dzUtility==='assistant'?'.dz-ai-fab':'.dz-tools-fab')?.click()));
  let paused=false;
  try{paused=localStorage.getItem('dealzyMotionPaused')==='true';}catch(_){}

  function syncMotion(){
    const stopped=paused||reduced.matches;
    body.classList.toggle('dz-motion-paused',stopped);
    body.classList.toggle('dz-motion-ready',!stopped);
    if(motionButton){
      motionButton.textContent=stopped?'▷':'Ⅱ';
      motionButton.setAttribute('aria-pressed',String(stopped));
      motionButton.setAttribute('aria-label',stopped?(isFrench()?'Reprendre les animations':'Resume animations'):(isFrench()?'Mettre les animations en pause':'Pause animations'));
      // The system preference takes priority and can only be changed on the device.
      motionButton.hidden=reduced.matches;
    }
  }
  function syncMarket(){
    let market=window.DealzyMarket?.get();
    if(!market){try{market=JSON.parse(localStorage.getItem('dealzyMarket')||'null');}catch(_){}}
    const city=market?.city||'Miami';
    doc.getElementById('dzSearchCity').textContent=city==='Montreal'?'Montréal':city;
    const budgetButton=doc.querySelector('.quick button:last-child');
    if(budgetButton) budgetButton.textContent=isFrench()?`Moins de ${market?.currency==='CAD'?'50 CA$':'50 $'}`:`Under ${market?.currency==='CAD'?'CA$50':'$50'}`;
    if(languageButton){languageButton.textContent=isFrench()?'EN':'FR';languageButton.setAttribute('aria-label',isFrench()?'Switch to English':'Passer en français');}
    syncMotion();
  }
  function navigate(view){
    show(view);
    if(view==='explore') renderExplore();
    syncNav();
  }
  function syncNav(){
    const view=currentDealzyView();
    doc.querySelectorAll('.desktopNav [data-dz-view]').forEach(button=>{
      const active=button.dataset.dzView===view;
      button.classList.toggle('is-current',active);
      active?button.setAttribute('aria-current','page'):button.removeAttribute('aria-current');
    });
    doc.querySelectorAll('#bottomNav .navBtn').forEach(button=>{
      button.dataset.view===view?button.setAttribute('aria-current','page'):button.removeAttribute('aria-current');
    });
  }
  doc.querySelectorAll('[data-dz-view]').forEach(button=>button.addEventListener('click',()=>navigate(button.dataset.dzView)));
  doc.querySelectorAll('[data-dz-category]').forEach(button=>button.addEventListener('click',()=>{
    state.filter=button.dataset.dzCategory;state.maxPrice=null;
    doc.getElementById('exploreQuery').value='';navigate('explore');
  }));
  doc.querySelectorAll('[data-dz-query]').forEach(button=>button.addEventListener('click',()=>{
    query.value=button.dataset.dzQuery;query.dataset.userEdited='true';
    aiSearch(query.value);syncNav();
  }));
  doc.querySelectorAll('[data-dz-top]').forEach(button=>button.addEventListener('click',()=>window.scrollTo({top:0,behavior:reduced.matches?'instant':'smooth'})));
  doc.getElementById('dzSearchWhere')?.addEventListener('click',()=>{
    if(window.DealzyMarket) window.DealzyMarket.openPicker('city');
    else navigate('profile');
  });
  languageButton?.addEventListener('click',()=>{
    if(window.DealzyI18n) window.DealzyI18n.setLocale(isFrench()?'en':'fr');
  });
  motionButton?.addEventListener('click',()=>{
    paused=!paused;try{localStorage.setItem('dealzyMotionPaused',String(paused));}catch(_){}syncMotion();
  });
  reduced.addEventListener('change',syncMotion);
  doc.addEventListener('visibilitychange',()=>body.classList.toggle('dz-page-hidden',doc.hidden));
  doc.addEventListener('dealzy:localechange',syncMarket);
  doc.addEventListener('dealzy:marketchange',syncMarket);
  // Observe only view visibility, not the entire document or changing offer content.
  if('MutationObserver' in window){
    const navObserver=new MutationObserver(syncNav);
    ['home','explore','favorites','trips','profile'].forEach(view=>navObserver.observe(doc.getElementById(view+'View'),{attributes:true,attributeFilter:['class']}));
  }
  if('IntersectionObserver' in window){
    const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting){entry.target.classList.add('is-visible');revealObserver.unobserve(entry.target);}
    }),{threshold:.08});
    doc.querySelectorAll('.dz-reveal').forEach(element=>revealObserver.observe(element));
    const hero=doc.querySelector('.heroVisual');
    const motionObserver=new IntersectionObserver(entries=>entries.forEach(entry=>entry.target.classList.toggle('is-offscreen',!entry.isIntersecting)),{threshold:0});
    if(hero) motionObserver.observe(hero);
  }
  // Escape and focus restoration work for the existing detail sheet as well.
  let detailOrigin=null;
  doc.addEventListener('click',event=>{if(event.target.closest('.deal')&&!event.target.closest('[data-heart]'))detailOrigin=event.target.closest('.deal');});
  doc.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    const overlay=doc.getElementById('detailOverlay');
    if(!overlay.classList.contains('hidden')){overlay.classList.add('hidden');detailOrigin?.focus();}
  });
  syncMarket();syncNav();
})();
