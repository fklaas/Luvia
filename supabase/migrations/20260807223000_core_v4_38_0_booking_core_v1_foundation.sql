-- Luvia Core 4.38.0 · Booking Core V1 Production Foundation
begin;
create extension if not exists pgcrypto;

do $$
begin
  if to_regclass('public.trips') is null then
    raise exception 'BOOKING_CORE_REQUIRES_PUBLIC_TRIPS';
  end if;
end $$;

create or replace function public.luvia_booking_is_trip_member(p_trip_id uuid)
returns boolean
language sql stable security definer set search_path=public
as $$
  select auth.uid() is not null and public.luvia_is_trip_member(p_trip_id,auth.uid());
$$;
revoke all on function public.luvia_booking_is_trip_member(uuid) from public;
grant execute on function public.luvia_booking_is_trip_member(uuid) to authenticated,service_role;

create table if not exists public.bookings(
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  trip_place_id uuid references public.trip_places(id) on delete set null,
  place_id uuid references public.places(id) on delete set null,
  requested_by uuid default auth.uid(),
  booking_type text not null check(booking_type in ('restaurant','hotel','activity','event','transport','rental','other')),
  status text not null default 'draft' check(status in ('draft','ready','requested','awaiting_reply','needs_action','confirmed','declined','cancelled','failed')),
  channel text not null default 'manual' check(channel in ('email','api','affiliate','external_link','manual')),
  provider text,
  provider_reference text,
  title text not null,
  start_at timestamptz,
  end_at timestamptz,
  party_size integer not null default 1 check(party_size>0 and party_size<=1000),
  participant_ids jsonb not null default '[]'::jsonb check(jsonb_typeof(participant_ids)='array'),
  currency text not null default 'EUR' check(char_length(currency)=3),
  amount numeric check(amount is null or amount>=0),
  confirmation_number text,
  cancellation_deadline timestamptz,
  contact jsonb not null default '{}'::jsonb,
  request jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  confirmed_at timestamptz,
  cancelled_at timestamptz
);
create index if not exists bookings_trip_start_idx on public.bookings(trip_id,start_at);
create index if not exists bookings_trip_status_idx on public.bookings(trip_id,status,updated_at desc);
create index if not exists bookings_provider_reference_idx on public.bookings(provider,provider_reference) where provider_reference is not null;

create table if not exists public.booking_messages(
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  direction text not null check(direction in ('outbound','inbound','system')),
  channel text not null default 'email',
  sender text,
  recipient text,
  subject text,
  body_text text,
  provider_message_id text,
  provider_thread_id text,
  delivery_status text,
  raw_payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists booking_messages_booking_created_idx on public.booking_messages(booking_id,created_at);

create table if not exists public.booking_provider_links(
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  provider text not null,
  channel text not null check(channel in ('email','api','affiliate','external_link','manual')),
  external_id text,
  external_url text,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(booking_id,provider,channel)
);

create table if not exists public.booking_events(
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  actor_user_id uuid,
  event_type text not null,
  from_status text,
  to_status text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists booking_events_booking_created_idx on public.booking_events(booking_id,created_at desc);
create index if not exists booking_events_trip_created_idx on public.booking_events(trip_id,created_at desc);

alter table public.bookings enable row level security;
alter table public.booking_messages enable row level security;
alter table public.booking_provider_links enable row level security;
alter table public.booking_events enable row level security;

grant select,insert,update,delete on public.bookings,public.booking_messages,public.booking_provider_links to authenticated;
grant select on public.booking_events to authenticated;
grant select,insert,update,delete on public.bookings,public.booking_messages,public.booking_provider_links,public.booking_events to service_role;

drop policy if exists bookings_trip_member_select on public.bookings;
drop policy if exists bookings_trip_member_insert on public.bookings;
drop policy if exists bookings_trip_member_update on public.bookings;
drop policy if exists bookings_trip_member_delete on public.bookings;
create policy bookings_trip_member_select on public.bookings for select to authenticated using(public.luvia_booking_is_trip_member(trip_id));
create policy bookings_trip_member_insert on public.bookings for insert to authenticated with check(public.luvia_booking_is_trip_member(trip_id) and (requested_by is null or requested_by=auth.uid()));
create policy bookings_trip_member_update on public.bookings for update to authenticated using(public.luvia_booking_is_trip_member(trip_id)) with check(public.luvia_booking_is_trip_member(trip_id));
create policy bookings_trip_member_delete on public.bookings for delete to authenticated using(public.luvia_booking_is_trip_member(trip_id));

drop policy if exists booking_messages_trip_member_select on public.booking_messages;
drop policy if exists booking_messages_trip_member_insert on public.booking_messages;
drop policy if exists booking_messages_trip_member_update on public.booking_messages;
drop policy if exists booking_messages_trip_member_delete on public.booking_messages;
create policy booking_messages_trip_member_select on public.booking_messages for select to authenticated using(exists(select 1 from public.bookings b where b.id=booking_id and public.luvia_booking_is_trip_member(b.trip_id)));
create policy booking_messages_trip_member_insert on public.booking_messages for insert to authenticated with check(exists(select 1 from public.bookings b where b.id=booking_id and public.luvia_booking_is_trip_member(b.trip_id)));
create policy booking_messages_trip_member_update on public.booking_messages for update to authenticated using(exists(select 1 from public.bookings b where b.id=booking_id and public.luvia_booking_is_trip_member(b.trip_id))) with check(exists(select 1 from public.bookings b where b.id=booking_id and public.luvia_booking_is_trip_member(b.trip_id)));
create policy booking_messages_trip_member_delete on public.booking_messages for delete to authenticated using(exists(select 1 from public.bookings b where b.id=booking_id and public.luvia_booking_is_trip_member(b.trip_id)));

drop policy if exists booking_provider_links_trip_member_all on public.booking_provider_links;
create policy booking_provider_links_trip_member_all on public.booking_provider_links for all to authenticated using(exists(select 1 from public.bookings b where b.id=booking_id and public.luvia_booking_is_trip_member(b.trip_id))) with check(exists(select 1 from public.bookings b where b.id=booking_id and public.luvia_booking_is_trip_member(b.trip_id)));

drop policy if exists booking_events_trip_member_select on public.booking_events;
create policy booking_events_trip_member_select on public.booking_events for select to authenticated using(public.luvia_booking_is_trip_member(trip_id));

create or replace function public.luvia_booking_transition_allowed(p_from text,p_to text)
returns boolean language sql immutable as $$
 select p_from=p_to or case p_from
  when 'draft' then p_to in ('ready','cancelled')
  when 'ready' then p_to in ('requested','cancelled','failed')
  when 'requested' then p_to in ('awaiting_reply','confirmed','declined','needs_action','cancelled','failed')
  when 'awaiting_reply' then p_to in ('confirmed','declined','needs_action','cancelled','failed')
  when 'needs_action' then p_to in ('requested','awaiting_reply','confirmed','declined','cancelled','failed')
  when 'confirmed' then p_to in ('cancelled','needs_action')
  when 'declined' then p_to in ('ready','cancelled')
  when 'failed' then p_to in ('ready','cancelled')
  else false end;
$$;
grant execute on function public.luvia_booking_transition_allowed(text,text) to authenticated,service_role;

create or replace function public.luvia_transition_booking(p_booking_id uuid,p_status text,p_patch jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_booking public.bookings; v_old text;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into v_booking from public.bookings where id=p_booking_id for update;
 if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
 if not public.luvia_booking_is_trip_member(v_booking.trip_id) then raise exception 'TRIP_ACCESS_DENIED'; end if;
 if p_status not in ('draft','ready','requested','awaiting_reply','needs_action','confirmed','declined','cancelled','failed') then raise exception 'INVALID_BOOKING_STATUS'; end if;
 if not public.luvia_booking_transition_allowed(v_booking.status,p_status) then raise exception 'INVALID_BOOKING_TRANSITION: % -> %',v_booking.status,p_status; end if;
 v_old:=v_booking.status;
 update public.bookings set
  status=p_status,
  provider=coalesce(nullif(p_patch->>'provider',''),provider),
  provider_reference=coalesce(nullif(p_patch->>'provider_reference',''),provider_reference),
  channel=coalesce(nullif(p_patch->>'channel',''),channel),
  confirmation_number=coalesce(nullif(p_patch->>'confirmation_number',''),confirmation_number),
  metadata=metadata||coalesce(p_patch->'metadata','{}'::jsonb),
  confirmed_at=case when p_status='confirmed' then coalesce(confirmed_at,now()) else confirmed_at end,
  cancelled_at=case when p_status='cancelled' then coalesce(cancelled_at,now()) else cancelled_at end,
  updated_at=now()
 where id=p_booking_id returning * into v_booking;
 insert into public.booking_events(booking_id,trip_id,actor_user_id,event_type,from_status,to_status,payload)
 values(v_booking.id,v_booking.trip_id,auth.uid(),'booking.'||p_status,v_old,p_status,coalesce(p_patch,'{}'::jsonb));
 return to_jsonb(v_booking);
end $$;
grant execute on function public.luvia_transition_booking(uuid,text,jsonb) to authenticated,service_role;

comment on function public.luvia_booking_is_trip_member(uuid) is 'Booking Core production access seam delegating to Luvia canonical trip membership.';
commit;
