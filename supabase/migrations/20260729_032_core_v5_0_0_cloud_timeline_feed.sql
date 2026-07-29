begin;
create index if not exists trip_schedule_events_trip_date_idx on public.trip_schedule_events(trip_id,event_date,start_time);
create index if not exists trip_schedule_events_trip_source_key_idx on public.trip_schedule_events(trip_id,source_key);
create index if not exists timeline_events_trip_occurred_idx on public.timeline_events(trip_id,occurred_at desc);
create index if not exists place_visits_trip_arrived_idx on public.place_visits(trip_id,arrived_at,left_at);
do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='trip_schedule_events') then alter publication supabase_realtime add table public.trip_schedule_events; end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='place_visits') then alter publication supabase_realtime add table public.place_visits; end if;
end $$;
comment on table public.timeline_events is 'Cloud event stream used by Luvia Timeline Core 5. Schedule and GPS visits remain authoritative in their cloud tables.';
commit;
