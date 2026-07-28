-- Core 4.1.3 Live Day Companion persistence foundation
create table if not exists public.live_day_snapshots(
 id uuid primary key default gen_random_uuid(), trip_id uuid not null, user_id uuid not null default auth.uid(), day date not null, companion_status text not null, snapshot jsonb not null default '{}'::jsonb, generated_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(trip_id,user_id,day)
);
create table if not exists public.location_samples(
 id uuid primary key default gen_random_uuid(), trip_id uuid not null, user_id uuid not null default auth.uid(), recorded_at timestamptz not null default now(), latitude double precision not null, longitude double precision not null, accuracy_m double precision, speed_mps double precision, heading_deg double precision, source text not null default 'browser', metadata jsonb not null default '{}'::jsonb
);
create table if not exists public.live_day_decisions(
 id uuid primary key default gen_random_uuid(), trip_id uuid not null, user_id uuid not null default auth.uid(), day date not null, decision_type text not null, place_id uuid, schedule_event_id text, decision jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists live_day_snapshots_trip_day_idx on public.live_day_snapshots(trip_id,day);
create index if not exists location_samples_trip_time_idx on public.location_samples(trip_id,recorded_at desc);
create index if not exists live_day_decisions_trip_day_idx on public.live_day_decisions(trip_id,day,created_at desc);
alter table public.live_day_snapshots enable row level security; alter table public.location_samples enable row level security; alter table public.live_day_decisions enable row level security;
drop policy if exists live_day_snapshots_member on public.live_day_snapshots; create policy live_day_snapshots_member on public.live_day_snapshots for all using(public.luvia_is_trip_member(trip_id)) with check(public.luvia_is_trip_member(trip_id) and user_id=auth.uid());
drop policy if exists location_samples_member on public.location_samples; create policy location_samples_member on public.location_samples for all using(public.luvia_is_trip_member(trip_id) and user_id=auth.uid()) with check(public.luvia_is_trip_member(trip_id) and user_id=auth.uid());
drop policy if exists live_day_decisions_member on public.live_day_decisions; create policy live_day_decisions_member on public.live_day_decisions for all using(public.luvia_is_trip_member(trip_id)) with check(public.luvia_is_trip_member(trip_id) and user_id=auth.uid());
