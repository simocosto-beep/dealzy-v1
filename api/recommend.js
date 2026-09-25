const deals = require('./_demoDeals');

function parseIntent(q=''){
  const t=String(q).toLowerCase();
  const m=t.match(/(?:under|below|max|less than)\s*\$?\s*(\d{1,4})/);
  const maxPrice=m?Number(m[1]):0;
  let category='All';
  if(/spa|massage|wellness|beauty/.test(t)) category='Spa & Beauty';
  else if(/dinner|food|restaurant|brunch|lunch|breakfast/.test(t)) category='Food & Drink';
  else if(/family|kids|children/.test(t)) category='Family';
  else if(/hotel|travel|stay|weekend away/.test(t)) category='Travel';
  else if(/boat|cruise|activity|things to do|adventure|event/.test(t)) category='Things to Do';
  return {maxPrice,category};
}

module.exports = async function handler(req,res){
  const q=String(req.query.q||'').trim();
  const intent=parseIntent(q);
  const rows=deals
    .filter(d=>(intent.category==='All'||d.category===intent.category)&&(!intent.maxPrice||d.price<=intent.maxPrice))
    .map(d=>({...d,savings:Math.max(0,d.old-d.price),discountPct:d.old?Math.round((1-d.price/d.old)*100):0}))
    .sort((a,b)=>(b.savings-a.savings)||(a.price-b.price))
    .slice(0,5);
  res.status(200).json({ok:true,mode:'demo-fallback',intent,count:rows.length,results:rows});
};