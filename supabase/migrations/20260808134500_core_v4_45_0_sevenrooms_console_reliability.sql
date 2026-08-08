-- Luvia Core 4.45.0 · Build 13.45.0
-- SevenRooms adapter metadata + production permission repair for schedule/collaboration.
begin;

update public.booking_provider_capabilities
set metadata=metadata||jsonb_build_object(
  'adapter',jsonb_build_object(
    'version','1.0.0',
    'foundationReady',true,
    'venueReferenceType','provider_venue_reference',
    'reservationReferenceType','provider_reservation_reference',
    'publicApiSurface','restaurant_booking_api_and_channel_management',
    'authContract','partner_contract_required',
    'liveTransportEnabled',false,
    'statusContract','unified_provenance_v1',
    'statusWebhookPubliclyVerified',false,
    'statusPollingPubliclyVerified',false,
    'partnerApplicationRequired',true
  )
)
where provider_id='sevenrooms';

-- Root-cause repair: PostgREST/realtime must be allowed to reach RLS-protected
-- schedule and collaboration resources for authenticated trip members.
grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.trip_schedule_events to authenticated;
grant select, insert, update, delete on table public.trip_schedule_events to service_role;
grant select on table public.trip_activity_events to authenticated;
grant select, insert, update, delete on table public.trip_activity_events to service_role;
grant select, insert, update, delete on table public.trip_presence to authenticated;
grant select, insert, update, delete on table public.trip_presence to service_role;

alter table public.trip_schedule_events enable row level security;
alter table public.trip_activity_events enable row level security;
alter table public.trip_presence enable row level security;

-- Reassert the canonical trip-member policies. These are idempotent and keep RLS authoritative.
drop policy if exists trip_schedule_events_member_select on public.trip_schedule_events;
create policy trip_schedule_events_member_select on public.trip_schedule_events
  for select to authenticated using (public.luvia_is_trip_member(trip_id,auth.uid()));
drop policy if exists trip_schedule_events_member_insert on public.trip_schedule_events;
create policy trip_schedule_events_member_insert on public.trip_schedule_events
  for insert to authenticated with check (public.luvia_is_trip_member(trip_id,auth.uid()) and user_id=auth.uid());
drop policy if exists trip_schedule_events_member_update on public.trip_schedule_events;
create policy trip_schedule_events_member_update on public.trip_schedule_events
  for update to authenticated using (public.luvia_is_trip_member(trip_id,auth.uid()))
  with check (public.luvia_is_trip_member(trip_id,auth.uid()));
drop policy if exists trip_schedule_events_member_delete on public.trip_schedule_events;
create policy trip_schedule_events_member_delete on public.trip_schedule_events
  for delete to authenticated using (public.luvia_is_trip_member(trip_id,auth.uid()));

drop policy if exists "trip members read activity" on public.trip_activity_events;
create policy "trip members read activity" on public.trip_activity_events
  for select to authenticated using (public.luvia_is_trip_member(trip_id));
drop policy if exists "trip members read presence" on public.trip_presence;
create policy "trip members read presence" on public.trip_presence
  for select to authenticated using (public.luvia_is_trip_member(trip_id));
drop policy if exists "users manage own presence" on public.trip_presence;
create policy "users manage own presence" on public.trip_presence
  for all to authenticated using (user_id=auth.uid() and public.luvia_is_trip_member(trip_id))
  with check (user_id=auth.uid() and public.luvia_is_trip_member(trip_id));

-- Repair RPC execution privileges used by the current browser collaboration/schedule clients.
grant execute on function public.luvia_list_schedule_events(uuid) to authenticated;
grant execute on function public.luvia_upsert_schedule_event(uuid,jsonb) to authenticated;
grant execute on function public.luvia_delete_schedule_event(uuid,text) to authenticated;
grant execute on function public.luvia_list_trip_activity(uuid,integer) to authenticated;
grant execute on function public.luvia_presence_heartbeat(uuid,text,text,text,jsonb) to authenticated;
grant execute on function public.luvia_presence_leave(uuid,text) to authenticated;
grant execute on function public.luvia_list_trip_presence(uuid) to authenticated;
grant execute on function public.luvia_record_trip_activity(uuid,text,text,text,text,text,jsonb) to authenticated;

commit;
