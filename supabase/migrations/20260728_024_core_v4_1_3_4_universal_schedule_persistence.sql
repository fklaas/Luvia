-- Luvia Core 4.1.3.4 · Build 13.1.3.4
-- Universal persistent schedule events for all place modules.
begin;

create table if not exists public.trip_schedule_events (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_key text not null,
  entity_type text not null default 'place',
  place_id uuid null references public.places(id) on delete set null,
  trip_place_id uuid null references public.trip_places(id) on delete set null,
  provider_place_id text null,
  title text not null,
  event_date date not null,
  start_time time not null,
  end_time time null,
  duration_minutes integer not null default 60 check (duration_minutes between 5 and 1440),
  lifecycle_status text not null default 'planned',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, source_key)
);

create index if not exists trip_schedule_events_trip_date_idx on public.trip_schedule_events(trip_id,event_date,start_time);
create index if not exists trip_schedule_events_trip_place_idx on public.trip_schedule_events(trip_place_id);
create index if not exists trip_schedule_events_place_idx on public.trip_schedule_events(place_id);

alter table public.trip_schedule_events enable row level security;
drop policy if exists trip_schedule_events_member_select on public.trip_schedule_events;
create policy trip_schedule_events_member_select on public.trip_schedule_events for select using (public.luvia_is_trip_member(trip_id,auth.uid()));
drop policy if exists trip_schedule_events_member_insert on public.trip_schedule_events;
create policy trip_schedule_events_member_insert on public.trip_schedule_events for insert with check (public.luvia_is_trip_member(trip_id,auth.uid()) and user_id=auth.uid());
drop policy if exists trip_schedule_events_member_update on public.trip_schedule_events;
create policy trip_schedule_events_member_update on public.trip_schedule_events for update using (public.luvia_is_trip_member(trip_id,auth.uid())) with check (public.luvia_is_trip_member(trip_id,auth.uid()));
drop policy if exists trip_schedule_events_member_delete on public.trip_schedule_events;
create policy trip_schedule_events_member_delete on public.trip_schedule_events for delete using (public.luvia_is_trip_member(trip_id,auth.uid()));

create or replace function public.luvia_list_schedule_events(p_trip_id uuid)
returns setof public.trip_schedule_events language sql security definer set search_path=public as $$
  select e.* from public.trip_schedule_events e
  where e.trip_id=p_trip_id and public.luvia_is_trip_member(p_trip_id,auth.uid())
  order by e.event_date,e.start_time,e.created_at;
$$;

create or replace function public.luvia_upsert_schedule_event(p_trip_id uuid,p_event jsonb)
returns public.trip_schedule_events language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_result public.trip_schedule_events; v_source_key text;
begin
  if v_user is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  if not public.luvia_is_trip_member(p_trip_id,v_user) then raise exception using errcode='42501',message='NOT_AUTHORIZED'; end if;
  v_source_key:=coalesce(nullif(p_event->>'sourceKey',''),nullif(p_event->>'tripPlaceId',''),nullif(p_event->>'placeId',''),nullif(p_event->>'providerPlaceId',''));
  if v_source_key is null then raise exception using errcode='22023',message='SCHEDULE_SOURCE_KEY_REQUIRED'; end if;
  insert into public.trip_schedule_events(trip_id,user_id,source_key,entity_type,place_id,trip_place_id,provider_place_id,title,event_date,start_time,end_time,duration_minutes,lifecycle_status,metadata)
  values(p_trip_id,v_user,v_source_key,coalesce(nullif(p_event->>'entityType',''),'place'),case when coalesce(p_event->>'placeId','') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then (p_event->>'placeId')::uuid else null end,case when coalesce(p_event->>'tripPlaceId','') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then (p_event->>'tripPlaceId')::uuid else null end,nullif(p_event->>'providerPlaceId',''),coalesce(nullif(p_event->>'title',''),'Ort'),(p_event->>'date')::date,(p_event->>'time')::time,nullif(p_event->>'endTime','')::time,coalesce(nullif(p_event->>'durationMinutes','')::integer,60),coalesce(nullif(p_event->>'lifecycleStatus',''),'planned'),coalesce(p_event->'metadata','{}'::jsonb))
  on conflict(trip_id,source_key) do update set entity_type=excluded.entity_type,place_id=coalesce(excluded.place_id,public.trip_schedule_events.place_id),trip_place_id=coalesce(excluded.trip_place_id,public.trip_schedule_events.trip_place_id),provider_place_id=coalesce(excluded.provider_place_id,public.trip_schedule_events.provider_place_id),title=excluded.title,event_date=excluded.event_date,start_time=excluded.start_time,end_time=excluded.end_time,duration_minutes=excluded.duration_minutes,lifecycle_status=excluded.lifecycle_status,metadata=public.trip_schedule_events.metadata||excluded.metadata,updated_at=now()
  returning * into v_result;
  return v_result;
end;$$;

create or replace function public.luvia_delete_schedule_event(p_trip_id uuid,p_source_key text)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if not public.luvia_is_trip_member(p_trip_id,auth.uid()) then raise exception using errcode='42501',message='NOT_AUTHORIZED'; end if;
  delete from public.trip_schedule_events where trip_id=p_trip_id and source_key=p_source_key;
  return found;
end;$$;

grant execute on function public.luvia_list_schedule_events(uuid) to authenticated;
grant execute on function public.luvia_upsert_schedule_event(uuid,jsonb) to authenticated;
grant execute on function public.luvia_delete_schedule_event(uuid,text) to authenticated;
commit;
