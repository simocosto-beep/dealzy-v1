/* Dealzy pictograms. Native, two-tone vectors; no external icon font or requests. */
(function(root){
  'use strict';
  const art={
    discover:'<circle cx="16" cy="16" r="11.5"/><path class="iconWash" d="m22 10-3.5 8.5L10 22l3.5-8.5Z"/><path class="iconAccent" d="m22 10-3.5 8.5L10 22l3.5-8.5Z"/><path d="m15 17 2-2"/>',
    search:'<circle class="iconWash" cx="13.5" cy="13.5" r="9"/><circle cx="13.5" cy="13.5" r="9"/><path class="iconAccent" d="m20 20 7 7"/><path d="M9 13.5a4.5 4.5 0 0 1 4.5-4.5"/>',
    heart:'<path class="iconWash" d="M16 27 5.3 16.6C-.7 10.5 8.2 1.7 14.1 7.6L16 9.5l1.9-1.9c5.9-5.9 14.8 2.9 8.8 9Z"/><path d="M16 27 5.3 16.6C-.7 10.5 8.2 1.7 14.1 7.6L16 9.5l1.9-1.9c5.9-5.9 14.8 2.9 8.8 9Z"/><path class="iconAccent" d="m20 20-4 4"/>',
    suitcase:'<rect class="iconWash" x="6" y="9" width="20" height="18" rx="5"/><rect x="6" y="9" width="20" height="18" rx="5"/><path d="M12 9V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3M11 28v1m10-1v1"/><path class="iconAccent" d="M12 14v8m8-8v8"/>',
    profile:'<circle class="iconWash" cx="16" cy="10" r="5"/><circle cx="16" cy="10" r="5"/><path d="M6 28v-3a10 10 0 0 1 20 0v3"/><path class="iconAccent" d="M11 22c3 2.5 7 2.5 10 0"/>',
    friends:'<path class="iconWash" d="M4 8h8l2 9H3Zm16 0h8l1 9H18Z"/><path d="m3 4 2 13a4 4 0 0 0 8-1L11 3M21 3l-2 13a4 4 0 0 0 8 1l2-13M9 21l1 7m-4 1 8-2m9-6-1 7m-4-1 8 2"/><path class="iconAccent" d="m4 11 8-1m8 0 8 1M16 3v3"/>',
    family:'<circle cx="10" cy="9" r="4"/><circle cx="23" cy="10" r="3"/><path d="M3 26v-4a7 7 0 0 1 10-6m11 1c4 .5 5 3 5 6v3"/><circle class="iconWash" cx="17" cy="18" r="3"/><circle class="iconAccent" cx="17" cy="18" r="3"/><path class="iconAccent" d="M12 28v-2a5 5 0 0 1 10 0v2"/>',
    nature:'<circle class="iconWash" cx="23" cy="8" r="4"/><circle class="iconAccent" cx="23" cy="8" r="3"/><path d="m3 25 10-17 10 17H3Zm17-6 4-7 7 13h-8M10 14l3 3 3-3"/><path class="iconAccent" d="M9 29h14"/>',
    dining:'<path d="M6 4v7a4 4 0 0 0 8 0V4M10 4v24M26 28V4c-5 2-7 8-7 14h7"/><path class="iconAccent" d="M6 9h8m8 9h4"/>',
    ticket:'<path class="iconWash" d="M4 7h24v7a3 3 0 0 0 0 6v5H4v-5a3 3 0 0 0 0-6Z"/><path d="M4 7h24v7a3 3 0 0 0 0 6v5H4v-5a3 3 0 0 0 0-6Z"/><path class="iconAccent" d="M21 8v3m0 4v3m0 4v2m-7-12 1.3 2.6 2.7.4-2 2 .5 2.8L14 17.5l-2.5 1.3L12 16l-2-2 2.7-.4Z"/>',
    wellness:'<path class="iconWash" d="M16 24C7 24 3 17 4 11c7 0 12 5 12 13Zm0 0c9 0 13-7 12-13-7 0-12 5-12 13Z"/><path d="M16 24C7 24 3 17 4 11c7 0 12 5 12 13Zm0 0c9 0 13-7 12-13-7 0-12 5-12 13ZM8 28h16"/><path class="iconAccent" d="M11 13c0-5 5-10 5-10s5 5 5 10"/>',
    plane:'<path class="iconWash" d="m3 14 25-10-9 25-5-11Z"/><path d="m3 14 25-10-9 25-5-11Z"/><path class="iconAccent" d="m14 18 9-9M5 23l-2 4m7-2-2 4"/>',
    hotel:'<rect class="iconWash" x="7" y="5" width="18" height="24" rx="3"/><rect x="7" y="5" width="18" height="24" rx="3"/><path d="M13 29v-7h6v7M12 11h1m6 0h1m-8 6h1m6 0h1"/><path class="iconAccent" d="M13 5V2h6v3"/>',
    phone:'<rect x="8" y="3" width="16" height="26" rx="4"/><path d="M13 6h6m-5 19h4"/><path class="iconAccent" d="M11 13a8 8 0 0 1 10 0m-7 3a3.5 3.5 0 0 1 4 0m-2 3h.01"/>',
    globe:'<circle cx="16" cy="16" r="12"/><ellipse class="iconWash" cx="16" cy="16" rx="5" ry="12"/><ellipse cx="16" cy="16" rx="5" ry="12"/><path class="iconAccent" d="M5 11h22M5 21h22"/>',
    game:'<path class="iconWash" d="M10 10h12c5 0 9 14 5 16-3 2-6-4-8-4h-6c-2 0-5 6-8 4-4-2 0-16 5-16Z"/><path d="M10 10h12c5 0 9 14 5 16-3 2-6-4-8-4h-6c-2 0-5 6-8 4-4-2 0-16 5-16ZM16 10V7l3-3"/><path class="iconAccent" d="M8 16h6m-3-3v6m11-4h.01m3 4h.01"/>',
    book:'<path class="iconWash" d="M16 8c-4-3-8-3-12-2v20c5-1 8 0 12 2 4-2 7-3 12-2V6c-4-1-8-1-12 2Z"/><path d="M16 8c-4-3-8-3-12-2v20c5-1 8 0 12 2 4-2 7-3 12-2V6c-4-1-8-1-12 2ZM16 8v20"/><path class="iconAccent" d="m8 12 4 1m-4 5 4 1m8-5 4-1m-4 7 4-1"/>',
    spark:'<path class="iconWash" d="m14 4 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z"/><path class="iconAccent" d="m14 4 3 8 8 3-8 3-3 8-3-8-8-3 8-3ZM25 3v5m-2.5-2.5h5"/>',
    tools:'<rect class="iconWash" x="4" y="10" width="24" height="18" rx="4"/><rect x="4" y="10" width="24" height="18" rx="4"/><path d="M11 10V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3M4 18h24"/><path class="iconAccent" d="M13 17v4h6v-4"/>',
    arrow:'<path d="M7 25 25 7M8 7h17v17"/>',
    compare:'<path d="M16 3v24M5 8h22M9 8 4 20h10L9 8Zm14 0-5 12h10L23 8Z"/><path class="iconAccent" d="M10 28h12M4 20c2 5 8 5 10 0m4 0c2 5 8 5 10 0"/>',
    target:'<circle cx="16" cy="16" r="12"/><circle class="iconWash" cx="16" cy="16" r="7"/><circle cx="16" cy="16" r="7"/><path class="iconAccent" d="m16 16 11-11m-4 0h4v4"/>',
    coins:'<ellipse cx="12" cy="8" rx="8" ry="4"/><path d="M4 8v6c0 5 16 5 16 0V8M4 14v6c0 3 7 4 12 3"/><path class="iconAccent" d="M16 18c0-5 13-5 13 0v6c0 5-13 5-13 0v-6Zm0 0c0 5 13 5 13 0"/>',
    bell:'<path class="iconWash" d="M6 23h20l-3-5v-7a7 7 0 0 0-14 0v7Z"/><path d="M6 23h20l-3-5v-7a7 7 0 0 0-14 0v7ZM13 28h6"/><path class="iconAccent" d="M4 9c0-3 1-5 3-7m18 0c2 2 3 4 3 7"/>',
    map:'<path class="iconWash" d="m12 6 8 4v18l-8-4Z"/><path d="m3 9 9-3 8 4 9-3v18l-9 3-8-4-9 3V9ZM12 6v18m8-14v18"/><path class="iconAccent" d="m7 14 2-1m6 3 2 1m6 0 2-1"/>',
    chart:'<path d="M5 4v24h24"/><path class="iconAccent" d="m10 11 6 6 5-3 7 8m-6 0h6v-6"/>',
    cloud:'<path class="iconWash" d="M8 25a6 6 0 0 1-1-12 9 9 0 0 1 18-1 6.5 6.5 0 0 1-1 13Z"/><path d="M8 25a6 6 0 0 1-1-12 9 9 0 0 1 18-1 6.5 6.5 0 0 1-1 13"/><path class="iconAccent" d="M16 17v13m-4-9 4-4 4 4"/>',
    receipt:'<path d="M7 29V4l3 2 3-2 3 2 3-2 3 2 3-2v25l-3-2-3 2-3-2-3 2-3-2Z"/><path class="iconAccent" d="M11 12h10m-10 5h10m-10 5h5"/>',
    link:'<path d="m13 8 3-3a7 7 0 0 1 10 10l-3 3M19 24l-3 3A7 7 0 0 1 6 17l3-3"/><path class="iconAccent" d="m11 21 10-10"/>',
    halloween:'<path d="M16 9c-9-5-16 6-11 15 2 4 7 5 11 3 4 2 9 1 11-3 5-9-2-20-11-15Zm0 0c-1-5 3-7 5-7"/><path class="iconAccent" d="m9 16 3-3 2 4Zm9 1 2-4 3 3ZM11 22c3 3 7 3 10 0"/>'
  };
  const categoryNames={'Food & Drink':'dining','Things to Do':'ticket','Spa & Beauty':'wellness','Travel':'plane','Halloween':'halloween'};
  const partnerNames={booking:'hotel',expedia:'plane',pelago:'ticket',tours4fun:'nature',kkday:'ticket',esimx:'phone',airzlink:'globe',gearup:'game',magicstory:'book'};
  function svg(name){return '<svg class="dzIcon" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+(art[name]||art.spark)+'</svg>';}
  root.DealzyIcons={svg,category:name=>svg(categoryNames[name]),partner:id=>svg(partnerNames[id])};
})(typeof window!=='undefined'?window:globalThis);
