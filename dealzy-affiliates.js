/* Approved affiliate links, updated 2026-10-06. Country destinations stay separate where available. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.DealzyAffiliates=api;
})(typeof window!=='undefined'?window:this,function(){
  'use strict';
  const partners=[
    {id:'pelago',name:'Pelago',icon:'🎟️',label:{en:'Activities & experiences',fr:'Activités et expériences'},urls:{US:'https://pelago.pxf.io/4ajAW1',CA:'https://pelago.pxf.io/6k51gN'}},
    {id:'tours4fun',name:'Tours4fun',icon:'🏞️',label:{en:'Tours & day trips',fr:'Circuits et excursions'},urls:{US:'https://easygoinc.pxf.io/B5o9P4',CA:'https://easygoinc.pxf.io/gRk7G0'}},
    {id:'kkday',name:'KKday',icon:'🎡',label:{en:'Attractions & experiences',fr:'Attractions et expériences'},urls:{US:'https://kkdaygreaterchina.sjv.io/xJDv5O',CA:'https://kkdaygreaterchina.sjv.io/KB3GXz'}},
    {id:'esimx',name:'eSIMX',icon:'📱',label:{en:'Travel eSIM data plans',fr:'Forfaits eSIM pour voyager'},urls:{US:'https://skylarkconnectllc.pxf.io/4ajAmG',CA:'https://skylarkconnectllc.pxf.io/yZQvby'}},
    {id:'airzlink',name:'AirZlink eSIM',icon:'🌐',label:{en:'Global travel eSIM — 200+ countries & regions',fr:'eSIM voyage mondiale — plus de 200 pays et régions'},urls:{US:'https://airzlinkesimapp.pxf.io/c/7851126/3872333/48402',CA:'https://airzlinkesimapp.pxf.io/c/7851126/3872333/48402'}},
    {id:'gearup',name:'GearUP for Mobile',icon:'🎮',label:{en:'Mobile gaming network booster',fr:'Accélérateur réseau pour jeux mobiles'},urls:{US:'https://gearupapp.pxf.io/c/7851126/3931528/53368',CA:'https://gearupapp.pxf.io/c/7851126/3931528/53368'}},
    {id:'magicstory',name:'Magic Story',icon:'📚',label:{en:'Personalized children’s books — 45% off first subscription book',fr:'Livres personnalisés pour enfants — 45 % sur le premier livre avec abonnement'},urls:{US:'https://www.tkqlhce.com/click-101895085-17360114'},evergreen:{US:'https://www.tkqlhce.com/click-101895085-17360179'}}
  ];
  const expedia={US:'https://www.expedia.com/shop/dealzy-ai/usa-city-stays-dealzy-ai',CA:'https://www.expedia.com/shop/dealzy-ai/canada-city-stays-dealzy-ai'};

  const booking={
    id:'booking',
    name:'Booking.com',
    icon:'🏨',
    label:{en:'Hotels & stays',fr:'Hôtels et hébergements'},
    evergreen:'https://www.jdoqocy.com/click-101895085-15734710',
    deepLinkBase:'https://www.tkqlhce.com/click-101895085-15734710'
  };
  function bookingUrl(destination='https://www.booking.com'){
    const target=String(destination||'https://www.booking.com');
    return booking.deepLinkBase+'?url='+encodeURIComponent(target);
  }
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function forCountry(country,enabledIds=[]){
    if(country!=='US'&&country!=='CA') return [];
    return partners.filter(p=>enabledIds.includes(p.id)&&/^https:\/\//.test(p.urls[country]||'')).map(p=>({...p,url:p.urls[country],country}));
  }
  function render(country,locale,enabledIds,travelOnly=false){
    const rows=forCountry(country,enabledIds).filter(p=>!travelOnly||!['gearup','magicstory'].includes(p.id));
    if(!rows.length) return '';
    const fr=locale==='fr';
    const place=country==='CA'?'Canada':fr?'États-Unis':'United States';
    return '<section class="affiliateSection" aria-label="'+(fr?'Partenaires voyage':'Travel partners')+'"><div class="affiliateHeading"><h3>'+(fr?'Encore plus à découvrir':'More to explore')+'</h3><span>'+place+'</span></div><p class="affiliateDisclosure">'+(fr?'Liens affiliés : Dealzy peut recevoir une commission. Prix, disponibilité et réservation chez le partenaire.':'Affiliate links: Dealzy may earn a commission. Check prices, availability and book with the partner.')+'</p><div class="affiliateGrid">'+rows.map(p=>{
      const description=p.id==='tours4fun'&&country==='US'?(fr?'Circuits dans l’Ouest américain':'Tours in the American West'):p.label[fr?'fr':'en'];
      return '<a class="affiliateCard" data-affiliate-partner="'+p.id+'" href="'+escape(p.url)+'" target="_blank" rel="sponsored noopener noreferrer"><span aria-hidden="true">'+p.icon+'</span><div><b>'+p.name+'</b><small>'+description+'</small></div><span class="affiliateArrow" aria-hidden="true">↗</span></a>';
    }).join('')+'</div></section>';
  }
  function bind(root,onClick){
    root?.querySelectorAll('[data-affiliate-partner]').forEach(link=>{
      const p=partners.find(row=>row.id===link.dataset.affiliatePartner);
      if(p) link.onclick=()=>onClick(p);
    });
  }
  return {partners,forCountry,render,bind,booking,bookingUrl,expediaUrl:country=>expedia[country]||''};
});
