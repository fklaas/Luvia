begin;
alter table if exists public.trip_places drop constraint if exists trip_places_status_check;
alter table if exists public.trip_places add constraint trip_places_status_check check (status in ('idea','discovered','saved','favorite','planned','reserved','selected','booked','checked_in','checked_out','visited','rated','rejected','archived'));
create index if not exists trip_places_trip_module_status_idx on public.trip_places (trip_id,module_key,status) where status <> 'archived';
create index if not exists trip_schedule_events_trip_date_idx on public.trip_schedule_events (trip_id,event_date,start_time);
create index if not exists trip_schedule_events_trip_source_key_idx on public.trip_schedule_events (trip_id,source_key) where source_key is not null;
create index if not exists timeline_events_trip_occurred_idx on public.timeline_events (trip_id,occurred_at desc);
commit;
