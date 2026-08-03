-- Luvia 11.2.11 / Core 3.0.2.11
-- Complete cloud trip profile: destination and travel dates are durable database fields.

alter table public.trip_settings
  add column if not exists destination_context jsonb not null default '{}'::jsonb,
  add column if not exists symbol text not null default '❤️',
  add column if not exists accent text not null default '#ee6f83',
  add column if not exists start_date date null,
  add column if not exists end_date date null;

-- Ensure every existing trip has a settings row and backfill any historical columns
-- that may still exist on public.trips.
insert into public.trip_settings(trip_id,trip_name,destination_context,symbol,accent,start_date,end_date,updated_at)
select t.id,
       coalesce(nullif(to_jsonb(t)->>'trip_name',''),nullif(to_jsonb(t)->>'name',''),'Unsere Reise'),
       jsonb_strip_nulls(jsonb_build_object(
         'name',coalesce(nullif(to_jsonb(t)->>'destination_name',''),nullif(to_jsonb(t)->>'destination',''),nullif(to_jsonb(t)->>'city','')),
         'country',coalesce(nullif(to_jsonb(t)->>'destination_country',''),nullif(to_jsonb(t)->>'country','')),
         'countryCode',coalesce(nullif(to_jsonb(t)->>'destination_country_code',''),nullif(to_jsonb(t)->>'country_code','')),
         'placeId',coalesce(nullif(to_jsonb(t)->>'destination_place_id',''),nullif(to_jsonb(t)->>'place_id','')),
         'formattedAddress',coalesce(nullif(to_jsonb(t)->>'destination_formatted_address',''),nullif(to_jsonb(t)->>'formatted_address','')),
         'latitude',nullif(coalesce(to_jsonb(t)->>'destination_latitude',to_jsonb(t)->>'latitude'),'')::double precision,
         'longitude',nullif(coalesce(to_jsonb(t)->>'destination_longitude',to_jsonb(t)->>'longitude'),'')::double precision
       )),
       coalesce(nullif(to_jsonb(t)->>'symbol',''),'❤️'),
       coalesce(nullif(to_jsonb(t)->>'accent',''),'#ee6f83'),
       nullif(coalesce(to_jsonb(t)->>'start_date',to_jsonb(t)->>'startDate'),'')::date,
       nullif(coalesce(to_jsonb(t)->>'end_date',to_jsonb(t)->>'endDate','') ,'')::date,
       now()
from public.trips t
on conflict(trip_id) do nothing;

create or replace function public.luvia_save_trip_profile(
 p_trip_id uuid,p_trip_name text,p_destination_context jsonb,p_symbol text,p_accent text,p_start_date date,p_end_date date
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
 cleaned jsonb; merged jsonb;
begin
 if not public.paris_is_trip_owner(p_trip_id) then raise exception 'NOT_TRIP_OWNER'; end if;
 select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) into cleaned
 from jsonb_each(coalesce(p_destination_context,'{}'::jsonb))
 where value <> 'null'::jsonb and not(jsonb_typeof(value)='string' and btrim(value #>> '{}')='');
 select coalesce(destination_context,'{}'::jsonb)||cleaned into merged from public.trip_settings where trip_id=p_trip_id;
 merged:=coalesce(merged,cleaned,'{}'::jsonb);
 insert into public.trip_settings(trip_id,trip_name,destination_context,symbol,accent,start_date,end_date,updated_at,updated_by)
 values(p_trip_id,left(trim(coalesce(nullif(p_trip_name,''),'Unsere Reise')),80),merged,coalesce(nullif(p_symbol,''),'❤️'),coalesce(nullif(p_accent,''),'#ee6f83'),p_start_date,p_end_date,now(),auth.uid())
 on conflict(trip_id) do update set
  trip_name=excluded.trip_name,destination_context=excluded.destination_context,symbol=excluded.symbol,accent=excluded.accent,
  start_date=excluded.start_date,end_date=excluded.end_date,updated_at=now(),updated_by=auth.uid();
 return jsonb_build_object('trip_id',p_trip_id,'trip_name',p_trip_name,'destination',merged,'symbol',p_symbol,'accent',p_accent,'start_date',p_start_date,'end_date',p_end_date);
end $$;

-- Compatibility alias: all existing callers still reach the same central profile write.
create or replace function public.luvia_update_trip_details(
 p_trip_id uuid,p_trip_name text,p_destination_context jsonb,p_symbol text,p_accent text,p_start_date date,p_end_date date
) returns jsonb language sql security definer set search_path=public as $$
 select public.luvia_save_trip_profile(p_trip_id,p_trip_name,p_destination_context,p_symbol,p_accent,p_start_date,p_end_date);
$$;

revoke all on function public.luvia_save_trip_profile(uuid,text,jsonb,text,text,date,date) from anon;
grant execute on function public.luvia_save_trip_profile(uuid,text,jsonb,text,text,date,date) to authenticated;
revoke all on function public.luvia_update_trip_details(uuid,text,jsonb,text,text,date,date) from anon;
grant execute on function public.luvia_update_trip_details(uuid,text,jsonb,text,text,date,date) to authenticated;
notify pgrst,'reload schema';
