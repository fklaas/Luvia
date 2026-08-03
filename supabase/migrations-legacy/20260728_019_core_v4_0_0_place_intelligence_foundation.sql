-- Core 4.0.0 / Build 13.0.0 - Place Intelligence Foundation
-- Extends the existing canonical places and trip_places tables without duplicating restaurant entities.
begin;
alter table if exists public.places add column if not exists primary_type text not null default 'custom';
alter table if exists public.places add column if not exists roles text[] not null default '{}'::text[];
alter table if exists public.places add column if not exists capabilities text[] not null default '{}'::text[];
alter table if exists public.places add column if not exists source text not null default 'local';
alter table if exists public.places add column if not exists source_id text;
alter table if exists public.places add column if not exists metadata jsonb not null default '{}'::jsonb;
create index if not exists places_primary_type_idx on public.places(primary_type);
create index if not exists places_roles_gin_idx on public.places using gin(roles);
create unique index if not exists places_source_identity_uidx on public.places(source,source_id) where source_id is not null;
alter table if exists public.places drop constraint if exists places_primary_type_check;
alter table if exists public.places add constraint places_primary_type_check check(primary_type in ('restaurant','accommodation','attraction','photo_spot','activity','shopping','nature','family','mobility','transit','custom'));
update public.places p
set primary_type = 'restaurant'
from public.trip_places tp
join public.restaurants r on r.trip_place_id = tp.id
where p.id = tp.place_id
  and p.primary_type = 'custom';
create table if not exists public.place_visits(
 id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade, place_id uuid not null references public.places(id) on delete cascade, participant_id uuid, state text not null default 'nearby' check(state in ('nearby','arrived','stay_detected','visited','left')), arrived_at timestamptz, left_at timestamptz, duration_seconds integer, gps_accuracy_meters numeric, minimum_distance_meters numeric, detection_source text not null default 'gps', is_automatic boolean not null default true, is_confirmed boolean not null default false, correction jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.place_visits enable row level security;
drop policy if exists place_visits_trip_member_select on public.place_visits;
create policy place_visits_trip_member_select on public.place_visits for select using (exists(select 1 from public.trip_members tm where tm.trip_id=place_visits.trip_id and tm.user_id=auth.uid()));
drop policy if exists place_visits_trip_member_write on public.place_visits;
create policy place_visits_trip_member_write on public.place_visits for all using (exists(select 1 from public.trip_members tm where tm.trip_id=place_visits.trip_id and tm.user_id=auth.uid())) with check (exists(select 1 from public.trip_members tm where tm.trip_id=place_visits.trip_id and tm.user_id=auth.uid()));
commit;
