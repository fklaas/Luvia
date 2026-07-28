-- Core 4.0.2 / Build 13.0.2 - Timeline & GPS Visit Detection
-- Adds a canonical timeline event stream and completes visit diagnostics/realtime.
begin;

create table if not exists public.timeline_events(
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  place_id uuid references public.places(id) on delete set null,
  participant_id uuid,
  event_type text not null,
  title text not null,
  description text not null default '',
  occurred_at timestamptz not null default now(),
  source text not null default 'manual',
  is_automatic boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists timeline_events_trip_occurred_idx on public.timeline_events(trip_id,occurred_at desc);
create index if not exists timeline_events_place_idx on public.timeline_events(place_id);
create index if not exists place_visits_trip_place_idx on public.place_visits(trip_id,place_id,created_at desc);

alter table public.timeline_events enable row level security;

drop policy if exists timeline_events_trip_member_select on public.timeline_events;
create policy timeline_events_trip_member_select on public.timeline_events for select using (public.luvia_is_trip_member(trip_id));

drop policy if exists timeline_events_trip_member_write on public.timeline_events;
create policy timeline_events_trip_member_write on public.timeline_events for all using (public.luvia_is_trip_member(trip_id)) with check (public.luvia_is_trip_member(trip_id));

-- Repair Core 4.0.0 visit policies so trip owners and members both work.
drop policy if exists place_visits_trip_member_select on public.place_visits;
create policy place_visits_trip_member_select on public.place_visits for select using (public.luvia_is_trip_member(trip_id));

drop policy if exists place_visits_trip_member_write on public.place_visits;
create policy place_visits_trip_member_write on public.place_visits for all using (public.luvia_is_trip_member(trip_id)) with check (public.luvia_is_trip_member(trip_id));

-- Add tables to realtime only when they are not already members of the publication.
do $$
begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='timeline_events') then
    alter publication supabase_realtime add table public.timeline_events;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='place_visits') then
    alter publication supabase_realtime add table public.place_visits;
  end if;
end $$;

commit;
