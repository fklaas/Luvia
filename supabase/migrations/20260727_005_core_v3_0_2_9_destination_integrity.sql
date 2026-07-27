-- Luvia Core 3.0.2.9: destination integrity
-- Existing destination fields are preserved unless the user submits a non-empty replacement.

create or replace function public.luvia_update_trip_details(
 p_trip_id uuid,p_trip_name text,p_destination_context jsonb,p_symbol text,p_accent text,p_start_date date,p_end_date date
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  cleaned_destination jsonb;
  merged_destination jsonb;
begin
  if not public.paris_is_trip_owner(p_trip_id) then raise exception 'NOT_TRIP_OWNER'; end if;

  select coalesce(jsonb_object_agg(key,value),'{}'::jsonb)
    into cleaned_destination
    from jsonb_each(coalesce(p_destination_context,'{}'::jsonb))
   where value <> 'null'::jsonb
     and not (jsonb_typeof(value)='string' and btrim(value #>> '{}')='');

  select coalesce(destination_context,'{}'::jsonb) || cleaned_destination
    into merged_destination
    from public.trip_settings
   where trip_id=p_trip_id;

  merged_destination:=coalesce(merged_destination,cleaned_destination,'{}'::jsonb);

  insert into public.trip_settings(trip_id,trip_name,destination_context,symbol,accent,start_date,end_date,updated_at,updated_by)
  values(p_trip_id,left(trim(coalesce(p_trip_name,'Unsere Reise')),80),merged_destination,coalesce(nullif(p_symbol,''),'❤️'),coalesce(nullif(p_accent,''),'#ee6f83'),p_start_date,p_end_date,now(),auth.uid())
  on conflict(trip_id) do update set
    trip_name=excluded.trip_name,
    destination_context=excluded.destination_context,
    symbol=excluded.symbol,accent=excluded.accent,start_date=excluded.start_date,end_date=excluded.end_date,updated_at=now(),updated_by=auth.uid();

  return jsonb_build_object('trip_id',p_trip_id,'destination',merged_destination);
end $$;

revoke all on function public.luvia_update_trip_details(uuid,text,jsonb,text,text,date,date) from anon;
grant execute on function public.luvia_update_trip_details(uuid,text,jsonb,text,text,date,date) to authenticated;
