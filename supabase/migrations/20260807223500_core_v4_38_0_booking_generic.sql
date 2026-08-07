-- Luvia Booking Core V0.6 · Hotel & Generic Booking Foundation
-- Production integration upgrade.
begin;

create table if not exists public.booking_profiles(
 id uuid primary key default gen_random_uuid(),
 booking_id uuid not null unique references public.bookings(id) on delete cascade,
 booking_type text not null check(booking_type in ('restaurant','hotel','activity','event','transport','rental','other')),
 schema_version text not null default '0.6.0',
 details jsonb not null default '{}'::jsonb check(jsonb_typeof(details)='object'),
 guests jsonb not null default '{}'::jsonb check(jsonb_typeof(guests)='object'),
 preferences jsonb not null default '{}'::jsonb check(jsonb_typeof(preferences)='object'),
 constraints jsonb not null default '{}'::jsonb check(jsonb_typeof(constraints)='object'),
 computed jsonb not null default '{}'::jsonb check(jsonb_typeof(computed)='object'),
 validation_status text not null default 'pending' check(validation_status in ('pending','valid','invalid')),
 validation_errors jsonb not null default '[]'::jsonb check(jsonb_typeof(validation_errors)='array'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.booking_offers(
 id uuid primary key default gen_random_uuid(),
 booking_id uuid not null references public.bookings(id) on delete cascade,
 provider text,
 channel text not null default 'manual' check(channel in ('email','api','affiliate','external_link','manual')),
 status text not null default 'received' check(status in ('received','selected','rejected','expired','superseded')),
 offer_kind text not null default 'quote' check(offer_kind in ('quote','availability','rate','ticket','fare','rental_rate','other')),
 amount numeric check(amount is null or amount>=0),
 currency text not null default 'EUR' check(char_length(currency)=3),
 valid_until timestamptz,
 availability_start timestamptz,
 availability_end timestamptz,
 external_url text,
 external_reference text,
 summary text,
 terms jsonb not null default '{}'::jsonb check(jsonb_typeof(terms)='object'),
 cancellation jsonb not null default '{}'::jsonb check(jsonb_typeof(cancellation)='object'),
 components jsonb not null default '[]'::jsonb check(jsonb_typeof(components)='array'),
 raw_payload jsonb not null default '{}'::jsonb,
 metadata jsonb not null default '{}'::jsonb,
 received_at timestamptz not null default now(),
 selected_at timestamptz,
 selected_by uuid,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create index if not exists booking_offers_booking_status_idx on public.booking_offers(booking_id,status,received_at desc);
create unique index if not exists booking_offers_one_selected_uidx on public.booking_offers(booking_id) where status='selected';

alter table public.booking_profiles enable row level security;
alter table public.booking_offers enable row level security;

grant select,insert,update,delete on public.booking_profiles,public.booking_offers to authenticated;
grant select,insert,update,delete on public.booking_profiles,public.booking_offers to service_role;

drop policy if exists booking_profiles_trip_member_all on public.booking_profiles;
create policy booking_profiles_trip_member_all on public.booking_profiles for all to authenticated
 using(exists(select 1 from public.bookings b where b.id=booking_id and public.luvia_booking_is_trip_member(b.trip_id)))
 with check(exists(select 1 from public.bookings b where b.id=booking_id and public.luvia_booking_is_trip_member(b.trip_id)));

drop policy if exists booking_offers_trip_member_select on public.booking_offers;
create policy booking_offers_trip_member_select on public.booking_offers for select to authenticated
 using(exists(select 1 from public.bookings b where b.id=booking_id and public.luvia_booking_is_trip_member(b.trip_id)));

create or replace function public.luvia_booking_nights(p_start timestamptz,p_end timestamptz)
returns integer language sql immutable as $$
 select case when p_start is null or p_end is null or p_end<=p_start then null
 else ceil(extract(epoch from (p_end-p_start))/86400.0)::integer end
$$;

create or replace function public.luvia_booking_validate_profile(p_booking_id uuid,p_details jsonb default '{}'::jsonb,p_guests jsonb default '{}'::jsonb)
returns jsonb language plpgsql stable set search_path=public as $$
declare b public.bookings;errs jsonb:='[]'::jsonb;adults integer;children integer;infants integer;guest_count integer;n integer;
begin
 select * into b from public.bookings where id=p_booking_id;
 if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
 adults:=greatest(0,coalesce((p_guests->>'adults')::integer,0));
 children:=greatest(0,coalesce((p_guests->>'children')::integer,0));
 infants:=greatest(0,coalesce((p_guests->>'infants')::integer,0));
 guest_count:=adults+children+infants;
 if guest_count>0 and guest_count<>b.party_size then errs:=errs||jsonb_build_array('GUEST_COUNT_MISMATCH'); end if;
 if b.booking_type='hotel' then
  if b.start_at is null then errs:=errs||jsonb_build_array('HOTEL_CHECKIN_REQUIRED'); end if;
  if b.end_at is null then errs:=errs||jsonb_build_array('HOTEL_CHECKOUT_REQUIRED'); end if;
  n:=public.luvia_booking_nights(b.start_at,b.end_at);
  if b.start_at is not null and b.end_at is not null and n is null then errs:=errs||jsonb_build_array('HOTEL_DATE_RANGE_INVALID'); end if;
  if adults<1 then errs:=errs||jsonb_build_array('HOTEL_ADULT_REQUIRED'); end if;
 elsif b.booking_type='transport' then
  if nullif(trim(coalesce(p_details->>'origin','')),'') is null then errs:=errs||jsonb_build_array('TRANSPORT_ORIGIN_REQUIRED'); end if;
  if nullif(trim(coalesce(p_details->>'destination','')),'') is null then errs:=errs||jsonb_build_array('TRANSPORT_DESTINATION_REQUIRED'); end if;
 elsif b.booking_type='rental' then
  if nullif(trim(coalesce(p_details->>'pickupLocation',p_details->>'pickup_location','')),'') is null then errs:=errs||jsonb_build_array('RENTAL_PICKUP_LOCATION_REQUIRED'); end if;
  if nullif(trim(coalesce(p_details->>'dropoffLocation',p_details->>'dropoff_location','')),'') is null then errs:=errs||jsonb_build_array('RENTAL_DROPOFF_LOCATION_REQUIRED'); end if;
 end if;
 return jsonb_build_object('valid',jsonb_array_length(errs)=0,'errors',errs,'bookingType',b.booking_type,'computed',jsonb_build_object('nights',public.luvia_booking_nights(b.start_at,b.end_at),'guestCount',guest_count));
exception when invalid_text_representation then
 return jsonb_build_object('valid',false,'errors',jsonb_build_array('PROFILE_NUMERIC_FORMAT_INVALID'),'bookingType',coalesce(b.booking_type,'other'),'computed','{}'::jsonb);
end $$;

create or replace function public.luvia_booking_set_profile(
 p_booking_id uuid,p_details jsonb default '{}'::jsonb,p_guests jsonb default '{}'::jsonb,p_preferences jsonb default '{}'::jsonb,p_constraints jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path=public as $$
declare b public.bookings;v jsonb;p public.booking_profiles;
begin
 select * into b from public.bookings where id=p_booking_id for update;
 if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
 if auth.uid() is not null and not public.luvia_booking_is_trip_member(b.trip_id) then raise exception 'BOOKING_FORBIDDEN'; end if;
 v:=public.luvia_booking_validate_profile(p_booking_id,coalesce(p_details,'{}'::jsonb),coalesce(p_guests,'{}'::jsonb));
 insert into public.booking_profiles(booking_id,booking_type,details,guests,preferences,constraints,computed,validation_status,validation_errors,updated_at)
 values(p_booking_id,b.booking_type,coalesce(p_details,'{}'::jsonb),coalesce(p_guests,'{}'::jsonb),coalesce(p_preferences,'{}'::jsonb),coalesce(p_constraints,'{}'::jsonb),coalesce(v->'computed','{}'::jsonb),case when (v->>'valid')::boolean then 'valid' else 'invalid' end,coalesce(v->'errors','[]'::jsonb),now())
 on conflict(booking_id) do update set booking_type=excluded.booking_type,details=excluded.details,guests=excluded.guests,preferences=excluded.preferences,constraints=excluded.constraints,computed=excluded.computed,validation_status=excluded.validation_status,validation_errors=excluded.validation_errors,updated_at=now()
 returning * into p;
 update public.bookings set metadata=metadata||jsonb_build_object('profile',jsonb_build_object('version','0.6.0','validationStatus',p.validation_status,'computed',p.computed)),updated_at=now() where id=p_booking_id;
 insert into public.booking_events(booking_id,trip_id,actor_user_id,event_type,payload) values(b.id,b.trip_id,auth.uid(),'booking.profile.updated',jsonb_build_object('validationStatus',p.validation_status,'validationErrors',p.validation_errors,'computed',p.computed));
 return to_jsonb(p);
end $$;
revoke all on function public.luvia_booking_set_profile(uuid,jsonb,jsonb,jsonb,jsonb) from public;
grant execute on function public.luvia_booking_set_profile(uuid,jsonb,jsonb,jsonb,jsonb) to authenticated,service_role;

create or replace function public.luvia_booking_record_offer(
 p_booking_id uuid,p_provider text,p_channel text,p_offer_kind text,p_amount numeric,p_currency text,p_valid_until timestamptz,p_external_url text,p_external_reference text,p_summary text,
 p_terms jsonb default '{}'::jsonb,p_cancellation jsonb default '{}'::jsonb,p_components jsonb default '[]'::jsonb,p_raw_payload jsonb default '{}'::jsonb,p_metadata jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path=public as $$
declare b public.bookings;v_id uuid;
begin
 select * into b from public.bookings where id=p_booking_id;
 if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
 if p_channel not in ('email','api','affiliate','external_link','manual') then raise exception 'INVALID_BOOKING_CHANNEL'; end if;
 if p_offer_kind not in ('quote','availability','rate','ticket','fare','rental_rate','other') then raise exception 'INVALID_OFFER_KIND'; end if;
 insert into public.booking_offers(booking_id,provider,channel,offer_kind,amount,currency,valid_until,external_url,external_reference,summary,terms,cancellation,components,raw_payload,metadata)
 values(p_booking_id,nullif(trim(coalesce(p_provider,'')),''),p_channel,p_offer_kind,p_amount,upper(left(coalesce(nullif(trim(p_currency),''),'EUR'),3)),p_valid_until,nullif(trim(coalesce(p_external_url,'')),''),nullif(trim(coalesce(p_external_reference,'')),''),nullif(trim(coalesce(p_summary,'')),''),coalesce(p_terms,'{}'::jsonb),coalesce(p_cancellation,'{}'::jsonb),coalesce(p_components,'[]'::jsonb),coalesce(p_raw_payload,'{}'::jsonb),coalesce(p_metadata,'{}'::jsonb)) returning id into v_id;
 insert into public.booking_events(booking_id,trip_id,event_type,payload) values(b.id,b.trip_id,'booking.offer.received',jsonb_build_object('offerId',v_id,'provider',p_provider,'channel',p_channel,'offerKind',p_offer_kind,'amount',p_amount,'currency',upper(left(coalesce(nullif(trim(p_currency),''),'EUR'),3))));
 return v_id;
end $$;
revoke all on function public.luvia_booking_record_offer(uuid,text,text,text,numeric,text,timestamptz,text,text,text,jsonb,jsonb,jsonb,jsonb,jsonb) from public;
grant execute on function public.luvia_booking_record_offer(uuid,text,text,text,numeric,text,timestamptz,text,text,text,jsonb,jsonb,jsonb,jsonb,jsonb) to service_role;

create or replace function public.luvia_booking_select_offer(p_booking_id uuid,p_offer_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare b public.bookings;o public.booking_offers;
begin
 select * into b from public.bookings where id=p_booking_id for update;
 if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
 if auth.uid() is not null and not public.luvia_booking_is_trip_member(b.trip_id) then raise exception 'BOOKING_FORBIDDEN'; end if;
 select * into o from public.booking_offers where id=p_offer_id and booking_id=p_booking_id for update;
 if not found then raise exception 'OFFER_NOT_FOUND'; end if;
 if o.status in ('expired','rejected','superseded') then raise exception 'OFFER_NOT_SELECTABLE'; end if;
 update public.booking_offers set status='superseded',updated_at=now() where booking_id=p_booking_id and status='selected' and id<>p_offer_id;
 update public.booking_offers set status='selected',selected_at=now(),selected_by=auth.uid(),updated_at=now() where id=p_offer_id returning * into o;
 update public.bookings set amount=coalesce(o.amount,amount),currency=coalesce(o.currency,currency),provider=coalesce(o.provider,provider),provider_reference=coalesce(o.external_reference,provider_reference),metadata=metadata||jsonb_build_object('selectedOffer',jsonb_build_object('id',o.id,'amount',o.amount,'currency',o.currency,'provider',o.provider,'externalUrl',o.external_url)),updated_at=now() where id=p_booking_id;
 insert into public.booking_events(booking_id,trip_id,actor_user_id,event_type,payload) values(b.id,b.trip_id,auth.uid(),'booking.offer.selected',jsonb_build_object('offerId',o.id,'amount',o.amount,'currency',o.currency,'provider',o.provider));
 return to_jsonb(o);
end $$;
revoke all on function public.luvia_booking_select_offer(uuid,uuid) from public;
grant execute on function public.luvia_booking_select_offer(uuid,uuid) to authenticated,service_role;

comment on table public.booking_profiles is 'Type-specific booking request profile without fragmenting the core booking model.';
comment on table public.booking_offers is 'Generic offers/quotes/rates for hotel, activity, event, transport, rental and other booking types.';
comment on function public.luvia_booking_select_offer(uuid,uuid) is 'Explicit user/service selection of an offer; selection does not itself confirm the booking.';

commit;
