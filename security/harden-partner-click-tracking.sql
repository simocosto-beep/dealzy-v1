-- Applied to Dealzy on 2026-10-02 by migration harden_partner_click_tracking.
CREATE OR REPLACE FUNCTION public.dealzy_track_partner_click(p_provider text, p_source text DEFAULT NULL::text, p_title text DEFAULT NULL::text, p_external_id text DEFAULT NULL::text, p_country_code text DEFAULT NULL::text, p_city text DEFAULT NULL::text, p_currency_code text DEFAULT NULL::text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_provider text := lower(trim(coalesce(p_provider,'')));
  v_id bigint;
begin
  if auth.uid() is null or not public.dealzy_current_account_is_active() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  -- Serialize checks for the same account, including concurrent requests.
  perform pg_advisory_xact_lock(hashtextextended('dealzy-click:' || auth.uid()::text, 0));
  if (select count(*) from public.dealzy_partner_clicks
      where user_id = auth.uid() and created_at > now() - interval '1 minute') >= 60 then
    raise exception 'click rate limit exceeded' using errcode = 'P0001';
  end if;
  if v_provider = '' or length(v_provider) > 40 then
    raise exception 'invalid provider';
  end if;

  if v_provider not in (
    'yelp','viator','ticketmaster','booking','booking.com',
    'skyscanner','expedia','travel','partner','google maps'
  ) then
    v_provider := 'partner';
  end if;

  insert into public.dealzy_partner_clicks(
    user_id,provider,source,title,external_id,country_code,city,currency_code
  )
  values(
    auth.uid(),
    v_provider,
    nullif(left(trim(coalesce(p_source,'')),80),''),
    nullif(left(trim(coalesce(p_title,'')),240),''),
    nullif(left(trim(coalesce(p_external_id,'')),160),''),
    case when upper(trim(coalesce(p_country_code,''))) in ('US','CA')
      then upper(trim(p_country_code)) else null end,
    nullif(left(trim(coalesce(p_city,'')),120),''),
    case when upper(trim(coalesce(p_currency_code,''))) in ('USD','CAD')
      then upper(trim(p_currency_code)) else null end
  )
  returning id into v_id;

  return v_id;
end;
$function$;

REVOKE EXECUTE ON FUNCTION public.dealzy_track_partner_click(text,text,text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dealzy_track_partner_click(text,text,text,text,text,text,text) TO authenticated;
CREATE INDEX IF NOT EXISTS dealzy_partner_clicks_user_created_idx ON public.dealzy_partner_clicks(user_id,created_at);
