const SUPABASE_URL='https://stkmhgeuavsidpapqvyw.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_EVDiDkczLgCmggcMxbV8tw_jQm4g9Rh';

module.exports = async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.status(200).json({
    ok:true,
    provider:'supabase',
    configured:true,
    projectRef:'stkmhgeuavsidpapqvyw',
    auth:'email-password',
    sync:'ready'
  });
};