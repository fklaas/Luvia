-- Core 4.2.0.2 / Build 13.2.0.2
-- Universal Place Verification & Backend Stabilization
begin;

-- REST access must be granted in addition to RLS policies. Without these
-- grants PostgREST returns 403 before the policies can be evaluated.
grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.timeline_events to authenticated;
grant select, insert, update, delete on table public.place_visits to authenticated;
grant select, insert, update, delete on table public.trip_schedule_events to authenticated;
grant select on table public.places to authenticated;
grant select, insert, update, delete on table public.trip_places to authenticated;
grant select, insert, update, delete on table public.restaurants to authenticated;

alter table public.timeline_events enable row level security;
alter table public.place_visits enable row level security;

-- Recreate policies idempotently so older databases receive the current
-- membership contract as well.
drop policy if exists timeline_events_trip_member_select on public.timeline_events;
create policy timeline_events_trip_member_select
on public.timeline_events for select to authenticated
using (public.luvia_is_trip_member(trip_id));

drop policy if exists timeline_events_trip_member_write on public.timeline_events;
create policy timeline_events_trip_member_write
on public.timeline_events for all to authenticated
using (public.luvia_is_trip_member(trip_id))
with check (public.luvia_is_trip_member(trip_id));

drop policy if exists place_visits_trip_member_select on public.place_visits;
create policy place_visits_trip_member_select
on public.place_visits for select to authenticated
using (public.luvia_is_trip_member(trip_id));

drop policy if exists place_visits_trip_member_write on public.place_visits;
create policy place_visits_trip_member_write
on public.place_visits for all to authenticated
using (public.luvia_is_trip_member(trip_id))
with check (public.luvia_is_trip_member(trip_id));

-- Keep the verification RPC deliberately read-only. It allows the frontend
-- diagnostics to prove grants, membership and cloud reachability in one call.
create or replace function public.luvia_verify_place_backend(p_trip_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if not public.luvia_is_trip_member(p_trip_id) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  return jsonb_build_object(
    'tripId', p_trip_id,
    'timelineEvents', (select count(*) from public.timeline_events where trip_id=p_trip_id),
    'placeVisits', (select count(*) from public.place_visits where trip_id=p_trip_id),
    'scheduleEvents', (select count(*) from public.trip_schedule_events where trip_id=p_trip_id),
    'tripPlaces', (select count(*) from public.trip_places where trip_id=p_trip_id),
    'verifiedAt', now()
  );
end;
$$;
grant execute on function public.luvia_verify_place_backend(uuid) to authenticated;

commit;
