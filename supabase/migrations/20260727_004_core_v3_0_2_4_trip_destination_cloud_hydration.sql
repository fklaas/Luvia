-- Luvia 11.2.4 / Core 3.0.2.4
-- Cloud-authoritative trip hydration and complete destination persistence.

alter table public.trip_settings
  add column if not exists destination_context jsonb not null default '{}'::jsonb,
  add column if not exists symbol text not null default '❤️',
  add column if not exists accent text not null default '#ee6f83',
  add column if not exists start_date date null,
  add column if not exists end_date date null;

drop function if exists public.paris_list_my_trips();
create or replace function public.paris_list_my_trips()
returns table (
  trip_id uuid, trip_name text, join_code text, member_name text, member_role text,
  created_at timestamptz, member_count bigint, photos bigint, moments bigint, expenses bigint,
  closures bigint, notes bigint, total_content bigint, is_owner boolean,
  destination_context jsonb, destination_name text, destination_country text,
  destination_country_code text, destination_place_id text, destination_formatted_address text,
  destination_latitude double precision, destination_longitude double precision,
  symbol text, accent text, start_date date, end_date date
) language sql stable security definer set search_path=public as $$
with memberships as (
 select (to_jsonb(tm)->>'trip_id')::uuid trip_id,
 coalesce(nullif(to_jsonb(tm)->>'display_name',''),nullif(to_jsonb(tm)->>'member_name',''),nullif(to_jsonb(tm)->>'name',''),'Mitreisend') member_name,
 lower(coalesce(nullif(to_jsonb(tm)->>'role',''),'member')) member_role
 from public.trip_members tm where (to_jsonb(tm)->>'user_id')::uuid=auth.uid()
)
select t.id, coalesce(s.trip_name,nullif(to_jsonb(t)->>'name',''),nullif(to_jsonb(t)->>'trip_name',''),'Unsere Reise'),
 coalesce(nullif(to_jsonb(t)->>'join_code',''),nullif(to_jsonb(t)->>'code',''),nullif(to_jsonb(t)->>'trip_code','')),
 m.member_name,m.member_role,coalesce(nullif(to_jsonb(t)->>'created_at','')::timestamptz,now()),
 (select count(*) from public.trip_members x where (to_jsonb(x)->>'trip_id')::uuid=t.id),
 (select count(*) from public.gallery_photos x where x.trip_id=t.id),
 (select count(*) from public.live_moments x where x.trip_id=t.id),
 (select count(*) from public.budget_entries x where x.trip_id=t.id),
 (select count(*) from public.day_closures x where x.trip_id=t.id),
 (select count(*) from public.day_notes x where x.trip_id=t.id),
 (select count(*) from public.gallery_photos x where x.trip_id=t.id)+(select count(*) from public.live_moments x where x.trip_id=t.id)+(select count(*) from public.budget_entries x where x.trip_id=t.id)+(select count(*) from public.day_closures x where x.trip_id=t.id)+(select count(*) from public.day_notes x where x.trip_id=t.id)+(select count(*) from public.favorites x where x.trip_id=t.id),
 public.paris_is_trip_owner(t.id),coalesce(s.destination_context,'{}'::jsonb),
 coalesce(s.destination_context->>'name',''),coalesce(s.destination_context->>'country',''),coalesce(s.destination_context->>'countryCode',''),coalesce(s.destination_context->>'placeId',''),coalesce(s.destination_context->>'formattedAddress',''),
 nullif(s.destination_context->>'latitude','')::double precision,nullif(s.destination_context->>'longitude','')::double precision,
 coalesce(s.symbol,'❤️'),coalesce(s.accent,'#ee6f83'),s.start_date,s.end_date
from memberships m join public.trips t on t.id=m.trip_id left join public.trip_settings s on s.trip_id=t.id
order by coalesce(s.updated_at,nullif(to_jsonb(t)->>'created_at','')::timestamptz,now()) desc;
$$;

create or replace function public.luvia_update_trip_details(
 p_trip_id uuid,p_trip_name text,p_destination_context jsonb,p_symbol text,p_accent text,p_start_date date,p_end_date date
) returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if not public.paris_is_trip_owner(p_trip_id) then raise exception 'Nur der Reisebesitzer darf diese Reise bearbeiten.'; end if;
 insert into public.trip_settings(trip_id,trip_name,destination_context,symbol,accent,start_date,end_date,updated_at,updated_by)
 values(p_trip_id,left(trim(coalesce(p_trip_name,'Unsere Reise')),80),coalesce(p_destination_context,'{}'::jsonb),coalesce(nullif(p_symbol,''),'❤️'),coalesce(nullif(p_accent,''),'#ee6f83'),p_start_date,p_end_date,now(),auth.uid())
 on conflict(trip_id) do update set trip_name=excluded.trip_name,destination_context=excluded.destination_context,symbol=excluded.symbol,accent=excluded.accent,start_date=excluded.start_date,end_date=excluded.end_date,updated_at=now(),updated_by=auth.uid();
 return jsonb_build_object('trip_id',p_trip_id,'destination',coalesce(p_destination_context,'{}'::jsonb));
end;$$;

revoke all on function public.paris_list_my_trips() from anon;
revoke all on function public.luvia_update_trip_details(uuid,text,jsonb,text,text,date,date) from anon;
grant execute on function public.paris_list_my_trips() to authenticated;
grant execute on function public.luvia_update_trip_details(uuid,text,jsonb,text,text,date,date) to authenticated;
notify pgrst,'reload schema';
