-- Core 4.3.1.2 / Build 13.3.1.2 - Accommodation parity and lifecycle compatibility
begin;
alter table public.trip_places drop constraint if exists trip_places_status_check;
alter table public.trip_places add constraint trip_places_status_check check(status in ('idea','planned','reserved','visited','dismissed','archived'));
create index if not exists trip_places_trip_type_status_idx on public.trip_places(trip_id,status,updated_at desc);

create or replace function public.luvia_list_place_entities(p_trip_id uuid,p_primary_type text default null,p_role text default null,p_status text default null) returns jsonb language sql stable security definer set search_path=public as $$
select case when auth.uid() is null or not public.luvia_is_trip_member(p_trip_id) then '[]'::jsonb else coalesce(jsonb_agg(jsonb_build_object('place',to_jsonb(p),'tripPlace',to_jsonb(tp),'extension',case when p.primary_type='restaurant' then (select to_jsonb(r) from public.restaurants r where r.trip_place_id=tp.id) when p.primary_type='accommodation' then (select to_jsonb(a) from public.accommodations a where a.trip_place_id=tp.id) else null end) order by tp.position,tp.created_at),'[]'::jsonb) end
from public.trip_places tp join public.places p on p.id=tp.place_id
where tp.trip_id=p_trip_id
and ((p_status='archived' and tp.status='archived') or (coalesce(p_status,'')<>'archived' and tp.status<>'archived'))
and (p_primary_type is null or p.primary_type=p_primary_type)
and (p_role is null or p_role=any(p.roles))
and (p_status is null or tp.status=p_status)
$$;
grant execute on function public.luvia_list_place_entities(uuid,text,text,text) to authenticated;
commit;
