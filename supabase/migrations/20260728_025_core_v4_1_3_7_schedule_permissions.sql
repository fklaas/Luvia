-- Luvia Core 4.1.3.7 · Build 13.1.3.7
-- Repair API privileges for the universal schedule table.
begin;

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.trip_schedule_events to authenticated;
grant select, insert, update, delete on table public.trip_schedule_events to service_role;

grant execute on function public.luvia_list_schedule_events(uuid) to authenticated;
grant execute on function public.luvia_upsert_schedule_event(uuid,jsonb) to authenticated;
grant execute on function public.luvia_delete_schedule_event(uuid,text) to authenticated;

-- Keep RLS authoritative; grants only allow PostgREST to reach the policies.
alter table public.trip_schedule_events enable row level security;

commit;
