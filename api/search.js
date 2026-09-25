const deals = require('./_demoDeals');

module.exports = async function handler(req,res){
  res.setHeader('Cache-Control','s-maxage=60, stale-while-revalidate=300');
  const q=String(req.query.q||'').trim().toLowerCase();
  const category=String(req.query.category||'All');
  const maxPrice=Number(req.query.maxPrice||0);
  const limit=Math.max(1,Math.min(50,Number(req.query.limit||20)));
  const lat=Number(req.query.lat), lng=Number(req.query.lng), radius=Number(req.query.radius||0);
  const hasCoords=Number.isFinite(lat)&&Number.isFinite(lng);
  const toRad=v=>v*Math.PI/180;
  const distanceMiles=(a,b,c,d)=>{
    const R=3958.8, dLat=toRad(c-a), dLng=toRad(d-b);
    const x=Math.sin(dLat/2)**2+Math.cos(toRad(a))*Math.cos(toRad(c))*Math.sin(dLng/2)**2;
    return 2*R*Math.asin(Math.sqrt(x));
  };
  const rows=deals.map(d=>{
    const distance=hasCoords && Number.isFinite(d.lat) && Number.isFinite(d.lng) ? distanceMiles(lat,lng,d.lat,d.lng) : null;
    return {...d,distanceMiles:distance};
  }).filter(d=>{
    const hay=(d.title+' '+d.category+' '+d.place+' '+d.text).toLowerCase();
    return (category==='All'||d.category===category) &&
      (!maxPrice||d.price<=maxPrice) &&
      (!q||hay.includes(q)) &&
      (!radius||d.distanceMiles===null||d.distanceMiles<=radius);
  }).sort((a,b)=>{
    if(a.distanceMiles===null && b.distanceMiles===null) return a.price-b.price;
    if(a.distanceMiles===null) return 1;
    if(b.distanceMiles===null) return -1;
    return a.distanceMiles-b.distanceMiles;
  }).slice(0,limit).map(d=>({...d,savings:Math.max(0,d.old-d.price),discountPct:d.old?Math.round((1-d.price/d.old)*100):0}));
  res.status(200).json({
    ok:true,
    mode:'demo-fallback',
    query:{q,category,maxPrice:maxPrice||null,limit,lat:hasCoords?lat:null,lng:hasCoords?lng:null,radius:radius||null},
    count:rows.length,
    providers:[{name:'demo',status:'active'}],
    results:rows,
    generatedAt:new Date().toISOString()
  });
};