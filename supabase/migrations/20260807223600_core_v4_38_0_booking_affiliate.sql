-- Luvia Booking Core V0.7 · Affiliate Foundation
-- Production integration upgrade.
begin;

create table if not exists public.booking_affiliate_partners(
 id uuid primary key default gen_random_uuid(),
 partner_key text not null unique,
 name text not null,
 status text not null default 'active' check(status in ('active','paused','disabled')),
 homepage_url text,
 attribution_window_days integer not null default 30 check(attribution_window_days between 1 and 365),
 supports_deep_links boolean not null default false,
 default_commission jsonb not null default '{}'::jsonb check(jsonb_typeof(default_commission)='object'),
 metadata jsonb not null default '{}'::jsonb check(jsonb_typeof(metadata)='object'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(homepage_url is null or homepage_url ~* '^https://')
);

create table if not exists public.booking_affiliate_links(
 id uuid primary key default gen_random_uuid(),
 booking_id uuid not null references public.bookings(id) on delete cascade,
 partner_id uuid not null references public.booking_affiliate_partners(id),
 offer_id uuid references public.booking_offers(id) on delete set null,
 status text not null default 'active' check(status in ('active','expired','disabled')),
 destination_url text not null check(destination_url ~* '^https://'),
 affiliate_url text not null check(affiliate_url ~* '^https://'),
 tracking_id text not null,
 expires_at timestamptz,
 metadata jsonb not null default '{}'::jsonb check(jsonb_typeof(metadata)='object'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(partner_id,tracking_id)
);
create index if not exists booking_affiliate_links_booking_idx on public.booking_affiliate_links(booking_id,status,created_at desc);

create table if not exists public.booking_affiliate_clicks(
 id uuid primary key default gen_random_uuid(),
 booking_id uuid not null references public.bookings(id) on delete cascade,
 partner_id uuid not null references public.booking_affiliate_partners(id),
 link_id uuid not null references public.booking_affiliate_links(id) on delete cascade,
 actor_user_id uuid,
 session_key text,
 click_token uuid not null default gen_random_uuid() unique,
 clicked_at timestamptz not null default now(),
 metadata jsonb not null default '{}'::jsonb check(jsonb_typeof(metadata)='object')
);
create index if not exists booking_affiliate_clicks_booking_idx on public.booking_affiliate_clicks(booking_id,clicked_at desc);
create index if not exists booking_affiliate_clicks_partner_idx on public.booking_affiliate_clicks(partner_id,clicked_at desc);

create table if not exists public.booking_affiliate_attributions(
 id uuid primary key default gen_random_uuid(),
 booking_id uuid not null references public.bookings(id) on delete cascade,
 partner_id uuid not null references public.booking_affiliate_partners(id),
 link_id uuid references public.booking_affiliate_links(id) on delete set null,
 click_id uuid references public.booking_affiliate_clicks(id) on delete set null,
 model text not null default 'last_click' check(model in ('last_click','first_click','provider_reported','manual')),
 status text not null default 'active' check(status in ('active','superseded','expired')),
 attributed_at timestamptz not null default now(),
 expires_at timestamptz,
 metadata jsonb not null default '{}'::jsonb check(jsonb_typeof(metadata)='object'),
 created_at timestamptz not null default now()
);
create unique index if not exists booking_affiliate_one_active_attribution_uidx on public.booking_affiliate_attributions(booking_id) where status='active';
create index if not exists booking_affiliate_attributions_partner_idx on public.booking_affiliate_attributions(partner_id,attributed_at desc);

create table if not exists public.booking_affiliate_conversions(
 id uuid primary key default gen_random_uuid(),
 booking_id uuid not null references public.bookings(id) on delete cascade,
 partner_id uuid not null references public.booking_affiliate_partners(id),
 attribution_id uuid references public.booking_affiliate_attributions(id) on delete set null,
 status text not null default 'reported' check(status in ('reported','pending','approved','rejected','paid','cancelled')),
 external_reference text,
 gross_amount numeric check(gross_amount is null or gross_amount>=0),
 gross_currency text not null default 'EUR' check(char_length(gross_currency)=3),
 commission_amount numeric check(commission_amount is null or commission_amount>=0),
 commission_currency text not null default 'EUR' check(char_length(commission_currency)=3),
 commission_status text not null default 'unknown' check(commission_status in ('unknown','estimated','pending','approved','paid','rejected')),
 occurred_at timestamptz,
 metadata jsonb not null default '{}'::jsonb check(jsonb_typeof(metadata)='object'),
 raw_payload jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index if not exists booking_affiliate_conversion_external_uidx on public.booking_affiliate_conversions(partner_id,external_reference) where external_reference is not null;
create index if not exists booking_affiliate_conversions_booking_idx on public.booking_affiliate_conversions(booking_id,created_at desc);

alter table public.booking_affiliate_partners enable row level security;
alter table public.booking_affiliate_links enable row level security;
alter table public.booking_affiliate_clicks enable row level security;
alter table public.booking_affiliate_attributions enable row level security;
alter table public.booking_affiliate_conversions enable row level security;

grant select on public.booking_affiliate_partners to authenticated;
grant select on public.booking_affiliate_links,public.booking_affiliate_clicks,public.booking_affiliate_attributions,public.booking_affiliate_conversions to authenticated;
grant select,insert,update,delete on public.booking_affiliate_partners,public.booking_affiliate_links,public.booking_affiliate_clicks,public.booking_affiliate_attributions,public.booking_affiliate_conversions to service_role;

drop policy if exists booking_affiliate_partners_authenticated_select on public.booking_affiliate_partners;
create policy booking_affiliate_partners_authenticated_select on public.booking_affiliate_partners for select to authenticated using(status<>'disabled');

drop policy if exists booking_affiliate_links_trip_member_select on public.booking_affiliate_links;
create policy booking_affiliate_links_trip_member_select on public.booking_affiliate_links for select to authenticated
 using(exists(select 1 from public.bookings b where b.id=booking_id and public.luvia_booking_is_trip_member(b.trip_id)));

drop policy if exists booking_affiliate_clicks_trip_member_select on public.booking_affiliate_clicks;
create policy booking_affiliate_clicks_trip_member_select on public.booking_affiliate_clicks for select to authenticated
 using(exists(select 1 from public.bookings b where b.id=booking_id and public.luvia_booking_is_trip_member(b.trip_id)));

drop policy if exists booking_affiliate_attributions_trip_member_select on public.booking_affiliate_attributions;
create policy booking_affiliate_attributions_trip_member_select on public.booking_affiliate_attributions for select to authenticated
 using(exists(select 1 from public.bookings b where b.id=booking_id and public.luvia_booking_is_trip_member(b.trip_id)));

drop policy if exists booking_affiliate_conversions_trip_member_select on public.booking_affiliate_conversions;
create policy booking_affiliate_conversions_trip_member_select on public.booking_affiliate_conversions for select to authenticated
 using(exists(select 1 from public.bookings b where b.id=booking_id and public.luvia_booking_is_trip_member(b.trip_id)));

create or replace function public.luvia_booking_upsert_affiliate_partner(
 p_partner_key text,p_name text,p_homepage_url text default null,p_attribution_window_days integer default 30,p_supports_deep_links boolean default false,p_default_commission jsonb default '{}'::jsonb,p_metadata jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;v_key text;
begin
 v_key:=lower(trim(coalesce(p_partner_key,'')));
 if v_key='' then raise exception 'AFFILIATE_PARTNER_KEY_REQUIRED'; end if;
 if trim(coalesce(p_name,''))='' then raise exception 'AFFILIATE_PARTNER_NAME_REQUIRED'; end if;
 if p_homepage_url is not null and p_homepage_url !~* '^https://' then raise exception 'AFFILIATE_PARTNER_HTTPS_REQUIRED'; end if;
 insert into public.booking_affiliate_partners(partner_key,name,homepage_url,attribution_window_days,supports_deep_links,default_commission,metadata,updated_at)
 values(v_key,trim(p_name),nullif(trim(coalesce(p_homepage_url,'')),''),greatest(1,least(365,coalesce(p_attribution_window_days,30))),coalesce(p_supports_deep_links,false),coalesce(p_default_commission,'{}'::jsonb),coalesce(p_metadata,'{}'::jsonb),now())
 on conflict(partner_key) do update set name=excluded.name,homepage_url=excluded.homepage_url,attribution_window_days=excluded.attribution_window_days,supports_deep_links=excluded.supports_deep_links,default_commission=excluded.default_commission,metadata=booking_affiliate_partners.metadata||excluded.metadata,updated_at=now()
 returning id into v_id;
 return v_id;
end $$;
revoke all on function public.luvia_booking_upsert_affiliate_partner(text,text,text,integer,boolean,jsonb,jsonb) from public;
grant execute on function public.luvia_booking_upsert_affiliate_partner(text,text,text,integer,boolean,jsonb,jsonb) to service_role;

create or replace function public.luvia_booking_record_affiliate_link(
 p_booking_id uuid,p_partner_id uuid,p_destination_url text,p_affiliate_url text,p_tracking_id text,p_offer_id uuid default null,p_expires_at timestamptz default null,p_metadata jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path=public as $$
declare b public.bookings;p public.booking_affiliate_partners;v_id uuid;
begin
 select * into b from public.bookings where id=p_booking_id;
 if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
 select * into p from public.booking_affiliate_partners where id=p_partner_id;
 if not found or p.status<>'active' then raise exception 'AFFILIATE_PARTNER_NOT_ACTIVE'; end if;
 if trim(coalesce(p_destination_url,'')) !~* '^https://' or trim(coalesce(p_affiliate_url,'')) !~* '^https://' then raise exception 'AFFILIATE_HTTPS_URL_REQUIRED'; end if;
 if trim(coalesce(p_tracking_id,''))='' then raise exception 'AFFILIATE_TRACKING_ID_REQUIRED'; end if;
 if p_offer_id is not null and not exists(select 1 from public.booking_offers o where o.id=p_offer_id and o.booking_id=p_booking_id) then raise exception 'AFFILIATE_OFFER_BOOKING_MISMATCH'; end if;
 insert into public.booking_affiliate_links(booking_id,partner_id,offer_id,destination_url,affiliate_url,tracking_id,expires_at,metadata)
 values(p_booking_id,p_partner_id,p_offer_id,trim(p_destination_url),trim(p_affiliate_url),trim(p_tracking_id),p_expires_at,coalesce(p_metadata,'{}'::jsonb)) returning id into v_id;
 insert into public.booking_events(booking_id,trip_id,event_type,payload) values(b.id,b.trip_id,'booking.affiliate.link.created',jsonb_build_object('linkId',v_id,'partnerId',p_partner_id,'trackingId',p_tracking_id));
 return v_id;
end $$;
revoke all on function public.luvia_booking_record_affiliate_link(uuid,uuid,text,text,text,uuid,timestamptz,jsonb) from public;
grant execute on function public.luvia_booking_record_affiliate_link(uuid,uuid,text,text,text,uuid,timestamptz,jsonb) to service_role;

create or replace function public.luvia_booking_register_affiliate_click(
 p_link_id uuid,p_session_key text default null,p_model text default 'last_click',p_metadata jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path=public as $$
declare l public.booking_affiliate_links;b public.bookings;p public.booking_affiliate_partners;c public.booking_affiliate_clicks;a public.booking_affiliate_attributions;v_model text;existing public.booking_affiliate_attributions;
begin
 v_model:=lower(trim(coalesce(p_model,'last_click')));
 if v_model not in ('last_click','first_click') then raise exception 'AFFILIATE_CLICK_MODEL_INVALID'; end if;
 select * into l from public.booking_affiliate_links where id=p_link_id for update;
 if not found then raise exception 'AFFILIATE_LINK_NOT_FOUND'; end if;
 if l.status<>'active' or (l.expires_at is not null and l.expires_at<=now()) then raise exception 'AFFILIATE_LINK_NOT_ACTIVE'; end if;
 select * into b from public.bookings where id=l.booking_id;
 select * into p from public.booking_affiliate_partners where id=l.partner_id;
 if p.status<>'active' then raise exception 'AFFILIATE_PARTNER_NOT_ACTIVE'; end if;
 if auth.uid() is not null and not public.luvia_booking_is_trip_member(b.trip_id) then raise exception 'BOOKING_FORBIDDEN'; end if;
 insert into public.booking_affiliate_clicks(booking_id,partner_id,link_id,actor_user_id,session_key,metadata)
 values(b.id,p.id,l.id,auth.uid(),nullif(trim(coalesce(p_session_key,'')),''),coalesce(p_metadata,'{}'::jsonb)) returning * into c;
 select * into existing from public.booking_affiliate_attributions where booking_id=b.id and status='active' for update;
 if existing.id is null or v_model='last_click' then
  if existing.id is not null then update public.booking_affiliate_attributions set status='superseded' where id=existing.id; end if;
  insert into public.booking_affiliate_attributions(booking_id,partner_id,link_id,click_id,model,status,attributed_at,expires_at,metadata)
  values(b.id,p.id,l.id,c.id,v_model,'active',c.clicked_at,c.clicked_at+make_interval(days=>p.attribution_window_days),jsonb_build_object('source','booking_click')) returning * into a;
 else
  a:=existing;
 end if;
 insert into public.booking_events(booking_id,trip_id,actor_user_id,event_type,payload) values(b.id,b.trip_id,auth.uid(),'booking.affiliate.clicked',jsonb_build_object('clickId',c.id,'linkId',l.id,'partnerId',p.id,'attributionId',a.id,'model',v_model));
 return jsonb_build_object('clickId',c.id,'clickToken',c.click_token,'attributionId',a.id,'model',a.model,'expiresAt',a.expires_at,'affiliateUrl',l.affiliate_url,'destinationUrl',l.destination_url,'partnerId',p.id);
end $$;
revoke all on function public.luvia_booking_register_affiliate_click(uuid,text,text,jsonb) from public;
grant execute on function public.luvia_booking_register_affiliate_click(uuid,text,text,jsonb) to authenticated,service_role;

create or replace function public.luvia_booking_record_affiliate_conversion(
 p_booking_id uuid,p_partner_id uuid,p_status text,p_external_reference text,p_gross_amount numeric,p_gross_currency text,p_commission_amount numeric,p_commission_currency text,p_commission_status text,p_occurred_at timestamptz default null,p_metadata jsonb default '{}'::jsonb,p_raw_payload jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path=public as $$
declare b public.bookings;a public.booking_affiliate_attributions;v_id uuid;v_status text;v_commission_status text;
begin
 select * into b from public.bookings where id=p_booking_id;
 if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
 if not exists(select 1 from public.booking_affiliate_partners p where p.id=p_partner_id) then raise exception 'AFFILIATE_PARTNER_NOT_FOUND'; end if;
 v_status:=lower(trim(coalesce(p_status,'reported')));
 if v_status not in ('reported','pending','approved','rejected','paid','cancelled') then raise exception 'AFFILIATE_CONVERSION_STATUS_INVALID'; end if;
 v_commission_status:=lower(trim(coalesce(p_commission_status,'unknown')));
 if v_commission_status not in ('unknown','estimated','pending','approved','paid','rejected') then raise exception 'AFFILIATE_COMMISSION_STATUS_INVALID'; end if;
 if p_gross_amount is not null and p_gross_amount<0 then raise exception 'AFFILIATE_GROSS_AMOUNT_INVALID'; end if;
 if p_commission_amount is not null and p_commission_amount<0 then raise exception 'AFFILIATE_COMMISSION_AMOUNT_INVALID'; end if;
 select * into a from public.booking_affiliate_attributions where booking_id=p_booking_id and partner_id=p_partner_id and status='active' and (expires_at is null or expires_at>coalesce(p_occurred_at,now())) order by attributed_at desc limit 1;
 insert into public.booking_affiliate_conversions(booking_id,partner_id,attribution_id,status,external_reference,gross_amount,gross_currency,commission_amount,commission_currency,commission_status,occurred_at,metadata,raw_payload)
 values(p_booking_id,p_partner_id,a.id,v_status,nullif(trim(coalesce(p_external_reference,'')),''),p_gross_amount,upper(left(coalesce(nullif(trim(p_gross_currency),''),'EUR'),3)),p_commission_amount,upper(left(coalesce(nullif(trim(p_commission_currency),''),'EUR'),3)),v_commission_status,coalesce(p_occurred_at,now()),coalesce(p_metadata,'{}'::jsonb),coalesce(p_raw_payload,'{}'::jsonb)) returning id into v_id;
 update public.bookings set metadata=metadata||jsonb_build_object('affiliate',jsonb_build_object('lastConversionId',v_id,'partnerId',p_partner_id,'attributionId',a.id,'commissionStatus',v_commission_status)),updated_at=now() where id=p_booking_id;
 insert into public.booking_events(booking_id,trip_id,event_type,payload) values(b.id,b.trip_id,'booking.affiliate.conversion.reported',jsonb_build_object('conversionId',v_id,'partnerId',p_partner_id,'attributionId',a.id,'status',v_status,'grossAmount',p_gross_amount,'grossCurrency',upper(left(coalesce(nullif(trim(p_gross_currency),''),'EUR'),3)),'commissionAmount',p_commission_amount,'commissionCurrency',upper(left(coalesce(nullif(trim(p_commission_currency),''),'EUR'),3)),'commissionStatus',v_commission_status));
 return v_id;
end $$;
revoke all on function public.luvia_booking_record_affiliate_conversion(uuid,uuid,text,text,numeric,text,numeric,text,text,timestamptz,jsonb,jsonb) from public;
grant execute on function public.luvia_booking_record_affiliate_conversion(uuid,uuid,text,text,numeric,text,numeric,text,text,timestamptz,jsonb,jsonb) to service_role;

comment on table public.booking_affiliate_partners is 'Provider-neutral affiliate partner registry; no partner implementation is hard-wired into Booking Core.';
comment on table public.booking_affiliate_links is 'Per-booking affiliate/deep links with opaque tracking IDs and original destination URL.';
comment on table public.booking_affiliate_clicks is 'User/server click facts used for deterministic attribution.';
comment on table public.booking_affiliate_attributions is 'Attribution facts independent from booking lifecycle status.';
comment on table public.booking_affiliate_conversions is 'Provider-reported conversion and commission metadata; does not represent Luvia taking payment.';
comment on function public.luvia_booking_record_affiliate_conversion(uuid,uuid,text,text,numeric,text,numeric,text,text,timestamptz,jsonb,jsonb) is 'Records affiliate conversion/commission metadata without confirming/cancelling the underlying booking.';

commit;
