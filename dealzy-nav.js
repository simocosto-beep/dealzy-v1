(() => {
  'use strict';

  let restoring = false;
  const validViews = new Set(['home','explore','favorites','trips','profile']);

  function activeView(){
    const active=document.querySelector('.navBtn.active');
    return active && validViews.has(active.dataset.view) ? active.dataset.view : 'home';
  }

  function samePath(){
    return location.pathname + location.search;
  }

  const originalShow = window.show;
  const originalOpenDeal = window.openDeal;

  if(typeof originalShow !== 'function' || typeof originalOpenDeal !== 'function'){
    console.warn('Dealzy navigation patch: core navigation not ready');
    return;
  }

  if(!history.state || !history.state.dealzy){
    history.replaceState({dealzy:true,layer:'view',view:activeView()},'',samePath());
  }

  window.show = function(view){
    const v=validViews.has(view)?view:'home';
    if(!restoring){
      const s=history.state||{};
      if(s.layer!=='view' || s.view!==v){
        history.pushState({dealzy:true,layer:'view',view:v},'',samePath());
      }
    }
    return originalShow(v);
  };

  window.openDeal = function(id){
    const view=activeView();
    if(!restoring){
      history.pushState({dealzy:true,layer:'detail',view,dealId:Number(id)},'',samePath());
    }
    return originalOpenDeal(id);
  };

  function hideDetail(){
    const el=document.getElementById('detailOverlay');
    if(el) el.classList.add('hidden');
  }

  function applyState(state){
    const s=state && state.dealzy ? state : {dealzy:true,layer:'view',view:'home'};
    restoring=true;
    try{
      hideDetail();
      const view=validViews.has(s.view)?s.view:'home';
      originalShow(view);

      const wrap=document.querySelector('.dz-sheet-wrap');
      const panel=document.getElementById('dzPanel');
      if(wrap){
        if(s.layer==='toolbox' || s.layer==='toolpanel'){
          wrap.classList.add('open');
          if(panel) panel.classList.toggle('open',s.layer==='toolpanel');
        }else{
          wrap.classList.remove('open');
          if(panel) panel.classList.remove('open');
        }
      }

      if(s.layer==='detail' && Number.isFinite(Number(s.dealId))){
        originalOpenDeal(Number(s.dealId));
      }
    }finally{
      restoring=false;
    }
  }

  window.addEventListener('popstate',e=>{
    if(e.state && e.state.dealzy){
      applyState(e.state);
    }
  });

  const closeDetail=document.getElementById('closeDetail');
  if(closeDetail){
    closeDetail.onclick=()=>{
      if(history.state && history.state.layer==='detail') history.back();
      else hideDetail();
    };
  }

  const overlay=document.getElementById('detailOverlay');
  if(overlay){
    overlay.onclick=e=>{
      if(e.target!==overlay) return;
      if(history.state && history.state.layer==='detail') history.back();
      else hideDetail();
    };
  }

  document.addEventListener('click',e=>{
    const fab=e.target.closest && e.target.closest('.dz-tools-fab');
    if(fab){
      const s=history.state||{};
      if(s.layer!=='toolbox' && s.layer!=='toolpanel'){
        history.pushState({dealzy:true,layer:'toolbox',view:activeView()},'',samePath());
      }
      return;
    }

    const tool=e.target.closest && e.target.closest('.dz-tool[data-tool]');
    if(tool){
      const s=history.state||{};
      const next={dealzy:true,layer:'toolpanel',view:activeView(),tool:tool.dataset.tool||null};
      if(s.layer==='toolpanel') history.replaceState(next,'',samePath());
      else history.pushState(next,'',samePath());
    }
  },true);
})();