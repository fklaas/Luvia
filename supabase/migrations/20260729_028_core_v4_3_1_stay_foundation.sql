-- Core 4.3.1 / Build 13.3.1 - Stay Core & Accommodation Data Foundation
begin;
create table if not exists public.accommodations(
  trip_place_id uuid primary key references public.trip_places(id) on delete cascade,
  accommodation_type text not null default 'other',
  check_in_at timestamptz,
  check_out_at timestamptz,
  guest_count integer not null default 1 check(guest_count>0),
  room_count integer not null default 1 check(room_count>0),
  category_stars numeric,
  amenities jsonb not null default '{}'::jsonb,
  parking jsonb not null default '{}'::jsonb,
  breakfast jsonb not null default '{}'::jsonb,
  family_friendly boolean,
  accessibility jsonb not null default '{}'::jsonb,
  pets jsonb not null default '{}'::jsonb,
  room_notes text,
  is_trip_base boolean not null default false,
  booking_status text,
  booking_number text,
  booking_provider text,
  booking_date date,
  total_price numeric,
  currency text default 'EUR',
  cancellation_deadline timestamptz,
  payment_status text,
  booking_contact jsonb not null default '{}'::jsonb,
  document_reference text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.accommodations enable row level security;
grant select,insert,update,delete on public.accommodations to authenticated;
drop policy if exists accommodations_trip_member_select on public.accommodations;
create policy accommodations_trip_member_select on public.accommodations for select to authenticated using(exists(select 1 from public.trip_places tp where tp.id=trip_place_id and public.luvia_is_trip_member(tp.trip_id)));
drop policy if exists accommodations_trip_member_write on public.accommodations;
create policy accommodations_trip_member_write on public.accommodations for all to authenticated using(exists(select 1 from public.trip_places tp where tp.id=trip_place_id and public.luvia_is_trip_member(tp.trip_id))) with check(exists(select 1 from public.trip_places tp where tp.id=trip_place_id and public.luvia_is_trip_member(tp.trip_id)));
create or replace function public.luvia_upsert_accommodation(p_trip_id uuid,p_trip_place_id uuid,p_status text,p_accommodation jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if not public.luvia_is_trip_member(p_trip_id) then raise exception 'NOT_AUTHORIZED'; end if;
 update public.trip_places set status=coalesce(nullif(p_status,''),status),user_notes=coalesce(p_accommodation->>'notes',user_notes),updated_at=now() where id=p_trip_place_id and trip_id=p_trip_id;
 if not found then raise exception 'TRIP_PLACE_NOT_FOUND'; end if;
 if coalesce((p_accommodation->>'isTripBase')::boolean,false) then update public.accommodations a set is_trip_base=false,updated_at=now() from public.trip_places tp where a.trip_place_id=tp.id and tp.trip_id=p_trip_id and a.trip_place_id<>p_trip_place_id; end if;
 insert into public.accommodations(trip_place_id,accommodation_type,check_in_at,check_out_at,guest_count,room_count,is_trip_base,booking_status,booking_number,booking_provider,booking_date,total_price,currency,cancellation_deadline,payment_status,booking_contact,document_reference,notes,amenities,parking,breakfast,family_friendly,accessibility,pets,room_notes,metadata,updated_at)
 values(p_trip_place_id,coalesce(nullif(p_accommodation->>'accommodationType',''),'other'),nullif(p_accommodation->>'checkInAt','')::timestamptz,nullif(p_accommodation->>'checkOutAt','')::timestamptz,coalesce((p_accommodation->>'guestCount')::int,1),coalesce((p_accommodation->>'roomCount')::int,1),coalesce((p_accommodation->>'isTripBase')::boolean,false),nullif(p_accommodation->>'bookingStatus',''),nullif(p_accommodation->>'bookingNumber',''),nullif(p_accommodation->>'bookingProvider',''),nullif(p_accommodation->>'bookingDate','')::date,nullif(p_accommodation->>'totalPrice','')::numeric,coalesce(nullif(p_accommodation->>'currency',''),'EUR'),nullif(p_accommodation->>'cancellationDeadline','')::timestamptz,nullif(p_accommodation->>'paymentStatus',''),coalesce(p_accommodation->'bookingContact','{}'),nullif(p_accommodation->>'documentReference',''),nullif(p_accommodation->>'notes',''),coalesce(p_accommodation->'amenities','{}'),coalesce(p_accommodation->'parking','{}'),coalesce(p_accommodation->'breakfast','{}'),(p_accommodation->>'familyFriendly')::boolean,coalesce(p_accommodation->'accessibility','{}'),coalesce(p_accommodation->'pets','{}'),nullif(p_accommodation->>'roomNotes',''),coalesce(p_accommodation->'metadata','{}'),now())
 on conflict(trip_place_id) do update set accommodation_type=excluded.accommodation_type,check_in_at=excluded.check_in_at,check_out_at=excluded.check_out_at,guest_count=excluded.guest_count,room_count=excluded.room_count,is_trip_base=excluded.is_trip_base,booking_status=excluded.booking_status,booking_number=excluded.booking_number,booking_provider=excluded.booking_provider,booking_date=excluded.booking_date,total_price=excluded.total_price,currency=excluded.currency,cancellation_deadline=excluded.cancellation_deadline,payment_status=excluded.payment_status,booking_contact=excluded.booking_contact,document_reference=excluded.document_reference,notes=excluded.notes,amenities=excluded.amenities,parking=excluded.parking,breakfast=excluded.breakfast,family_friendly=excluded.family_friendly,accessibility=excluded.accessibility,pets=excluded.pets,room_notes=excluded.room_notes,metadata=public.accommodations.metadata||excluded.metadata,updated_at=now();
 return(select jsonb_build_object('place',to_jsonb(p),'tripPlace',to_jsonb(tp),'extension',to_jsonb(a)) from public.trip_places tp join public.places p on p.id=tp.place_id join public.accommodations a on a.trip_place_id=tp.id where tp.id=p_trip_place_id);
end$$;
grant execute on function public.luvia_upsert_accommodation(uuid,uuid,text,jsonb) to authenticated;
create or replace function public.luvia_list_place_entities(p_trip_id uuid,p_primary_type text default null,p_role text default null,p_status text default null) returns jsonb language sql stable security definer set search_path=public as $$select case when auth.uid() is null or not public.luvia_is_trip_member(p_trip_id) then '[]'::jsonb else coalesce(jsonb_agg(jsonb_build_object('place',to_jsonb(p),'tripPlace',to_jsonb(tp),'extension',case when p.primary_type='restaurant' then (select to_jsonb(r) from public.restaurants r where r.trip_place_id=tp.id) when p.primary_type='accommodation' then (select to_jsonb(a) from public.accommodations a where a.trip_place_id=tp.id) else null end) order by tp.position,tp.created_at),'[]'::jsonb) end from public.trip_places tp join public.places p on p.id=tp.place_id where tp.trip_id=p_trip_id and tp.status<>'archived' and (p_primary_type is null or p.primary_type=p_primary_type) and (p_role is null or p_role=any(p.roles)) and (p_status is null or tp.status=p_status)$$;
commit;
