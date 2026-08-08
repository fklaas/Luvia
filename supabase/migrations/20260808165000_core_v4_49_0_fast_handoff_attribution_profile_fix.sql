-- Luvia v13.49.0 / Core 4.49.0
-- Fast Provider Handoff + Attribution Foundation + profile persistence hardening
begin;

create table if not exists public.booking_handoff_events (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null,
  booking_id uuid references public.bookings(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  place_type text not null,
  provider_place_id text,
  venue_name text,
  provider text not null,
  destination_url text not null,
  event_type text not null default 'clicked' check (event_type in ('clicked','opened')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists booking_handoff_events_trip_created_idx on public.booking_handoff_events(trip_id,created_at desc);
create index if not exists booking_handoff_events_provider_idx on public.booking_handoff_events(provider,created_at desc);

alter table public.booking_handoff_events enable row level security;
drop policy if exists booking_handoff_events_trip_member_select on public.booking_handoff_events;
create policy booking_handoff_events_trip_member_select on public.booking_handoff_events
for select to authenticated
using (public.luvia_booking_is_trip_member(trip_id));

grant select on public.booking_handoff_events to authenticated;
grant select,insert,update,delete on public.booking_handoff_events to service_role;

create or replace function public.luvia_booking_record_place_handoff(
  p_trip_id uuid,
  p_place_type text,
  p_provider_place_id text,
  p_venue_name text,
  p_provider text,
  p_destination_url text,
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare v_id uuid; v_url text:=trim(coalesce(p_destination_url,''));
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_trip_id is null or not public.luvia_booking_is_trip_member(p_trip_id) then raise exception 'TRIP_ACCESS_DENIED'; end if;
  if v_url !~* '^https://' then raise exception 'HANDOFF_HTTPS_URL_REQUIRED'; end if;
  if lower(trim(coalesce(p_place_type,''))) <> 'restaurant' then raise exception 'HANDOFF_PLACE_TYPE_NOT_SUPPORTED_YET'; end if;
  insert into public.booking_handoff_events(
    trip_id,actor_user_id,place_type,provider_place_id,venue_name,provider,destination_url,event_type,metadata
  ) values(
    p_trip_id,auth.uid(),'restaurant',nullif(trim(coalesce(p_provider_place_id,'')),''),nullif(trim(coalesce(p_venue_name,'')),''),
    lower(coalesce(nullif(trim(p_provider),''),'official')),v_url,'clicked',coalesce(p_metadata,'{}'::jsonb)
  ) returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.luvia_booking_record_place_handoff(uuid,text,text,text,text,text,jsonb) from public,anon;
grant execute on function public.luvia_booking_record_place_handoff(uuid,text,text,text,text,text,jsonb) to authenticated,service_role;

-- Reisekompass/profile persistence hardening. RPC is still the canonical write path,
-- but authenticated users also retain the explicit own-row privileges required by RLS.
grant usage on schema public to authenticated;
grant select,insert,update on public.user_profiles to authenticated;

alter table public.user_profiles enable row level security;
drop policy if exists user_profiles_select_own on public.user_profiles;
create policy user_profiles_select_own on public.user_profiles for select to authenticated using (auth.uid() = user_id);
drop policy if exists user_profiles_insert_own on public.user_profiles;
create policy user_profiles_insert_own on public.user_profiles for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists user_profiles_update_own on public.user_profiles;
create policy user_profiles_update_own on public.user_profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Keep the existing RPC signature but guarantee owner-context execution for the canonical save path.
alter function public.luvia_get_my_profile() security definer;
alter function public.luvia_get_my_profile() set search_path = public;
alter function public.luvia_upsert_my_profile_v2(text,text,text,text,text,text,text,text,text[],text[],text[],text[],text[],text[],text[],text[],text,text,jsonb,jsonb,integer,timestamptz,timestamptz,jsonb,text,uuid,jsonb) security definer;
alter function public.luvia_upsert_my_profile_v2(text,text,text,text,text,text,text,text,text[],text[],text[],text[],text[],text[],text[],text[],text,text,jsonb,jsonb,integer,timestamptz,timestamptz,jsonb,text,uuid,jsonb) set search_path = public;
revoke all on function public.luvia_get_my_profile() from public,anon;
revoke all on function public.luvia_upsert_my_profile_v2(text,text,text,text,text,text,text,text,text[],text[],text[],text[],text[],text[],text[],text[],text,text,jsonb,jsonb,integer,timestamptz,timestamptz,jsonb,text,uuid,jsonb) from public,anon;
grant execute on function public.luvia_get_my_profile() to authenticated;
grant execute on function public.luvia_upsert_my_profile_v2(text,text,text,text,text,text,text,text,text[],text[],text[],text[],text[],text[],text[],text[],text,text,jsonb,jsonb,integer,timestamptz,timestamptz,jsonb,text,uuid,jsonb) to authenticated;

commit;
