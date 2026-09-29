const {accountAccess,deniedMessage}=require('./_accountAccess');
const SUPABASE_URL='https://stkmhgeuavsidpapqvyw.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_EVDiDkczLgCmggcMxbV8tw_jQm4g9Rh';

async function requireAdmin(req){
  const auth=String(req.headers.authorization||'');
  if(!auth.startsWith('Bearer ')) throw Object.assign(new Error('unauthorized'),{status:401});
  const token=auth.slice(7).trim();

  const userRes=await fetch(SUPABASE_URL+'/auth/v1/user',{
    headers:{'apikey':SUPABASE_PUBLISHABLE_KEY,'Authorization':'Bearer '+token}
  });
  if(!userRes.ok) throw Object.assign(new Error('unauthorized'),{status:401});
  const user=await userRes.json();

  const access=await accountAccess(token);
  if(!access.ok) throw Object.assign(new Error(access.error||'account access unavailable'),{status:503});
  if(!access.allowed) throw Object.assign(new Error(deniedMessage(access)),{status:403});

  const adminRes=await fetch(
    SUPABASE_URL+'/rest/v1/dealzy_admin_users?select=role,enabled&user_id=eq.'+encodeURIComponent(user.id)+'&limit=1',
    {headers:{'apikey':SUPABASE_PUBLISHABLE_KEY,'Authorization':'Bearer '+token,'Accept':'application/json'}}
  );
  if(!adminRes.ok) throw Object.assign(new Error('forbidden'),{status:403});
  const rows=await adminRes.json();
  const admin=rows&&rows[0];
  if(!admin||!admin.enabled||!['superadmin','admin','viewer'].includes(admin.role)){
    throw Object.assign(new Error('forbidden'),{status:403});
  }
  return {user,admin};
}

async function stripeGet(path,params={}){
  const key=process.env.STRIPE_SECRET_KEY;
  if(!key) return null;
  const qs=new URLSearchParams();
  for(const [k,v] of Object.entries(params)){
    if(v!==undefined&&v!==null&&v!=='') qs.append(k,String(v));
  }
  const url='https://api.stripe.com/v1/'+path+(qs.size?'?'+qs.toString():'');
  const r=await fetch(url,{headers:{'Authorization':'Bearer '+key,'Accept':'application/json'}});
  const data=await r.json().catch(()=>({}));
  if(!r.ok){
    const msg=data&&data.error&&data.error.message?data.error.message:'Stripe request failed';
    throw Object.assign(new Error(msg),{status:502});
  }
  return data;
}

function amount(v){return Number(v||0)/100}
function unix(v){return v?new Date(Number(v)*1000).toISOString():null}

async function stripeAdmin(req,res){
  try{
    await requireAdmin(req);
    if(req.method!=='GET') return res.status(405).json({ok:false,error:'Method not allowed'});

    if(!process.env.STRIPE_SECRET_KEY){
      return res.status(200).json({
        ok:true,
        configured:false,
        mode:'not-connected',
        message:'Stripe is not connected to the Dealzy production environment.'
      });
    }

    const [balance,charges,customers,subscriptions,refunds,disputes]=await Promise.all([
      stripeGet('balance'),
      stripeGet('charges',{limit:20}),
      stripeGet('customers',{limit:20}),
      stripeGet('subscriptions',{limit:20,status:'all'}),
      stripeGet('refunds',{limit:20}),
      stripeGet('disputes',{limit:20})
    ]);

    const payments=(charges?.data||[]).map(x=>({
      id:x.id,
      amount:amount(x.amount),
      amount_refunded:amount(x.amount_refunded),
      currency:String(x.currency||'').toUpperCase(),
      status:x.status||'',
      paid:!!x.paid,
      refunded:!!x.refunded,
      disputed:!!x.disputed,
      customer:typeof x.customer==='string'?x.customer:null,
      email:x.billing_details?.email||x.receipt_email||null,
      name:x.billing_details?.name||null,
      description:x.description||null,
      created_at:unix(x.created),
      receipt_url:x.receipt_url||null
    }));
    const customerRows=(customers?.data||[]).map(x=>({
      id:x.id,email:x.email||null,name:x.name||null,phone:x.phone||null,
      currency:x.currency?String(x.currency).toUpperCase():null,created_at:unix(x.created)
    }));
    const subscriptionRows=(subscriptions?.data||[]).map(x=>({
      id:x.id,customer:typeof x.customer==='string'?x.customer:null,status:x.status||'',
      currency:x.currency?String(x.currency).toUpperCase():null,
      amount:amount(x.items?.data?.[0]?.price?.unit_amount),
      interval:x.items?.data?.[0]?.price?.recurring?.interval||null,
      current_period_end:unix(x.items?.data?.[0]?.current_period_end||x.current_period_end),
      cancel_at_period_end:!!x.cancel_at_period_end,created_at:unix(x.created)
    }));
    const refundRows=(refunds?.data||[]).map(x=>({
      id:x.id,payment_intent:typeof x.payment_intent==='string'?x.payment_intent:null,
      charge:typeof x.charge==='string'?x.charge:null,amount:amount(x.amount),
      currency:String(x.currency||'').toUpperCase(),status:x.status||'',reason:x.reason||null,
      created_at:unix(x.created)
    }));
    const disputeRows=(disputes?.data||[]).map(x=>({
      id:x.id,charge:typeof x.charge==='string'?x.charge:null,amount:amount(x.amount),
      currency:String(x.currency||'').toUpperCase(),status:x.status||'',reason:x.reason||null,
      created_at:unix(x.created)
    }));
    const available=(balance?.available||[]).map(x=>({currency:String(x.currency||'').toUpperCase(),amount:amount(x.amount)}));
    const pending=(balance?.pending||[]).map(x=>({currency:String(x.currency||'').toUpperCase(),amount:amount(x.amount)}));

    return res.status(200).json({
      ok:true,configured:true,mode:'live',
      summary:{
        available,pending,recent_payments:payments.length,customers:customerRows.length,
        active_subscriptions:subscriptionRows.filter(x=>x.status==='active'||x.status==='trialing').length,
        refunds:refundRows.length,disputes:disputeRows.length
      },
      payments,customers:customerRows,subscriptions:subscriptionRows,refunds:refundRows,disputes:disputeRows,
      generated_at:new Date().toISOString()
    });
  }catch(e){
    const status=Number(e&&e.status)||500;
    return res.status(status).json({ok:false,error:status>=500?'Stripe admin unavailable':String(e.message||'Request failed')});
  }
}

module.exports = async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(String(req.query?.view||'')==='stripe') return stripeAdmin(req,res);
  return res.status(200).json({
    ok:true,
    provider:'supabase',
    configured:true,
    projectRef:'stkmhgeuavsidpapqvyw',
    auth:'email-password',
    sync:'ready'
  });
};
