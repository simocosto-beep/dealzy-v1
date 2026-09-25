/* Dealzy provider registry — normalized provider layer */
(() => {
  'use strict';
  const providers = new Map();

  function normalize(raw, source='unknown'){
    return {
      id: raw.id ?? source+'-'+Math.random().toString(36).slice(2),
      title: raw.title ?? 'Untitled deal',
      category: raw.category ?? raw.cat ?? 'Other',
      place: raw.place ?? raw.location ?? '',
      lat: raw.lat ?? null,
      lng: raw.lng ?? null,
      price: Number(raw.price ?? 0),
      old: Number(raw.old ?? raw.originalPrice ?? raw.price ?? 0),
      rating: raw.rating ?? '',
      image: raw.image ?? '',
      text: raw.text ?? raw.description ?? '',
      partnerUrl: raw.partnerUrl ?? null,
      source
    };
  }

  window.DealzyProviders = {
    register(name, adapter){ providers.set(name,adapter); },
    list(){ return [...providers.keys()]; },
    async search(query,ctx={}){
      const results = await Promise.allSettled([...providers].map(async ([name,p]) => {
        if(!p || typeof p.search!=='function') return [];
        const rows = await p.search(query,ctx);
        return (rows||[]).map(x=>normalize(x,name));
      }));
      return results.flatMap(r=>r.status==='fulfilled'?r.value:[]);
    },
    normalize
  };

  // Stable fallback inventory. Real providers can be added without changing UI code.
  window.DealzyProviders.register('demo',{
    async search(){
      try { return Array.isArray(deals) ? deals : []; } catch(_) { return []; }
    }
  });
})();