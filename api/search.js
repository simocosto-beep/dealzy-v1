const deals = require('./_demoDeals');

module.exports = async function handler(req,res){
  res.setHeader('Cache-Control','s-maxage=60, stale-while-revalidate=300');
  const q=String(req.query.q||'').trim().toLowerCase();
  const category=String(req.query.category||'All');
  const maxPrice=Number(req.query.maxPrice||0);
  const limit=Math.max(1,Math.min(50,Number(req.query.limit||20)));
  const rows=deals.filter(d=>{
    const hay=(d.title+' '+d.category+' '+d.place+' '+d.text).toLowerCase();
    return (category==='All'||d.category===category) && (!maxPrice||d.price<=maxPrice) && (!q||hay.includes(q));
  }).slice(0,limit).map(d=>({...d,savings:Math.max(0,d.old-d.price),discountPct:d.old?Math.round((1-d.price/d.old)*100):0}));
  res.status(200).json({
    ok:true,
    mode:'demo-fallback',
    query:{q,category,maxPrice:maxPrice||null,limit},
    count:rows.length,
    providers:[{name:'demo',status:'active'}],
    results:rows,
    generatedAt:new Date().toISOString()
  });
};