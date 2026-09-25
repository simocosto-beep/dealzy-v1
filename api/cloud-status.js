module.exports = async function handler(req,res){
  const configured=Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
  res.setHeader('Cache-Control','no-store');
  res.status(200).json({ok:true,provider:'supabase',configured});
};