-- Luvia Core 4.4.0 – Place Experience Core Consolidation
-- Idempotent compatibility migration for the universal place lifecycle.

begin;

alter table if exists public.trip_places
  drop constraint if exists trip_places_status_check;

alter table if exists public.trip_places
  add constraint trip_places_status_check check (
    status in (
      'idea','discovered','saved','favorite','planned','reserved','selected','booked',
      'checked_in','checked_out','visited','rated','rejected','archived'
    )
  );

create index if not exists trip_places_trip_type_status_idx
  on public.trip_places (trip_id, place_type, status)
  where status <> 'archived';

create index if not exists trip_places_trip_favorite_idx
  on public.trip_places (trip_id, is_favorite)
  where is_favorite = true and status <> 'archived';

comment on constraint trip_places_status_check on public.trip_places is
  'Universal lifecycle accepted by the Place Experience Core. Type adapters expose only meaningful states.';

commit;
