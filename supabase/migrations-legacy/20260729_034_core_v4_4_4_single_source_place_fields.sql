begin;

create or replace function public.luvia_upsert_trip_place_fields(
  p_trip_id uuid,
  p_trip_place_id uuid,
  p_place_id uuid,
  p_place_type text,
  p_fields jsonb
) returns public.trip_place_data
language plpgsql
security invoker
set search_path = public
as $$
declare
  result public.trip_place_data;
begin
  insert into public.trip_place_data(trip_id,trip_place_id,place_id,place_type,fields,updated_at)
  values(p_trip_id,p_trip_place_id,p_place_id,p_place_type,coalesce(p_fields,'{}'::jsonb),now())
  on conflict(trip_place_id) do update set
    place_id=coalesce(excluded.place_id,public.trip_place_data.place_id),
    place_type=excluded.place_type,
    fields=public.trip_place_data.fields || excluded.fields,
    updated_at=now()
  returning * into result;
  return result;
end;
$$;

grant execute on function public.luvia_upsert_trip_place_fields(uuid,uuid,uuid,text,jsonb) to authenticated;

-- Existing accommodation data is migrated once into the universal single source.
insert into public.trip_place_data(trip_id,trip_place_id,place_id,place_type,fields,updated_at)
select tp.trip_id,a.trip_place_id,tp.place_id,'accommodation',jsonb_strip_nulls(jsonb_build_object(
  'check_in_at',a.check_in_at,
  'check_out_at',a.check_out_at,
  'guest_count',a.guest_count,
  'room_count',a.room_count,
  'booking_number',a.booking_number,
  'booking_provider',a.booking_provider,
  'is_trip_base',a.is_trip_base,
  'notes',a.notes,
  'place_name',p.name
)),now()
from public.accommodations a
join public.trip_places tp on tp.id=a.trip_place_id
join public.places p on p.id=tp.place_id
on conflict(trip_place_id) do update set
  fields=public.trip_place_data.fields || excluded.fields,
  updated_at=now();

-- Accommodation date fields now have exactly one authoritative storage location.
delete from public.trip_schedule_events
where entity_type='accommodation'
   or source_key like 'accommodation:%';

create index if not exists trip_place_data_trip_updated_idx
  on public.trip_place_data(trip_id,updated_at desc);

comment on table public.trip_place_data is
  'Authoritative trip-specific field store for every Place type. UI, timeline and modules read the same cloud rows.';
comment on column public.trip_place_data.fields is
  'Single source for all user-entered Place fields, including every Place date and time field.';

commit;
