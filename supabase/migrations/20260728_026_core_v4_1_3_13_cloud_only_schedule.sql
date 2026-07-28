-- Luvia Core 4.1.3.13 · Build 13.1.3.13
-- Cloud-only authoritative schedule, canonical identity indexes and realtime.
begin;

alter table public.trip_schedule_events
  add column if not exists revision bigint not null default 1;

-- Keep the newest cloud row for each canonical place identity before adding uniqueness.
with ranked as (
  select id,row_number() over(partition by trip_id,provider_place_id order by updated_at desc,created_at desc,id desc) as rn
  from public.trip_schedule_events where provider_place_id is not null
)
delete from public.trip_schedule_events e using ranked r where e.id=r.id and r.rn>1;

with ranked as (
  select id,row_number() over(partition by trip_id,trip_place_id order by updated_at desc,created_at desc,id desc) as rn
  from public.trip_schedule_events where trip_place_id is not null
)
delete from public.trip_schedule_events e using ranked r where e.id=r.id and r.rn>1;

create unique index if not exists trip_schedule_events_trip_provider_unique
  on public.trip_schedule_events(trip_id, provider_place_id)
  where provider_place_id is not null;

create unique index if not exists trip_schedule_events_trip_trip_place_unique
  on public.trip_schedule_events(trip_id, trip_place_id)
  where trip_place_id is not null;

create or replace function public.luvia_touch_schedule_event()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.revision := coalesce(old.revision,0)+1;
  return new;
end;$$;

drop trigger if exists trip_schedule_events_touch on public.trip_schedule_events;
create trigger trip_schedule_events_touch before update on public.trip_schedule_events
for each row execute function public.luvia_touch_schedule_event();

do $$ begin
  alter publication supabase_realtime add table public.trip_schedule_events;
exception when duplicate_object then null;
end $$;

commit;
