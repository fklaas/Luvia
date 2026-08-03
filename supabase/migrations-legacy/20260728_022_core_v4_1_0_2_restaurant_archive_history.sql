begin;

create or replace function public.luvia_remove_restaurant_from_trip(p_trip_id uuid,p_trip_place_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_count integer;
begin
  if auth.uid() is null or not public.luvia_is_trip_member(p_trip_id,auth.uid()) then raise exception 'TRIP_ACCESS_DENIED'; end if;
  update public.trip_places set status='archived',is_favorite=false,planned_date=null,planned_time=null,updated_at=now()
  where id=p_trip_place_id and trip_id=p_trip_id and module_key='restaurants' and status<>'archived';
  get diagnostics v_count=row_count;
  return v_count>0;
end;$$;

create or replace function public.luvia_clear_restaurants(p_trip_id uuid,p_scope text default 'saved')
returns integer language plpgsql security definer set search_path=public as $$
declare v_count integer;
begin
  if auth.uid() is null or not public.luvia_is_trip_member(p_trip_id,auth.uid()) then raise exception 'TRIP_ACCESS_DENIED'; end if;
  if p_scope='favorites' then
    update public.trip_places set is_favorite=false,updated_at=now() where trip_id=p_trip_id and module_key='restaurants' and is_favorite=true and status<>'archived';
  elsif p_scope='saved' then
    update public.trip_places set status='archived',planned_date=null,planned_time=null,updated_at=now()
    where trip_id=p_trip_id and module_key='restaurants' and is_favorite=false and status<>'archived';
  else raise exception 'INVALID_SCOPE'; end if;
  get diagnostics v_count=row_count; return v_count;
end;$$;

create or replace function public.luvia_list_archived_restaurant_entities(p_trip_id uuid)
returns jsonb language sql stable security definer set search_path=public as $$
  select case when auth.uid() is null or not public.luvia_is_trip_member(p_trip_id,auth.uid()) then '[]'::jsonb
  else coalesce(jsonb_agg(jsonb_build_object(
    'place',to_jsonb(p),'tripPlace',to_jsonb(tp),'restaurant',to_jsonb(r),
    'history',coalesce((select jsonb_agg(to_jsonb(h) order by h.event_at desc) from public.place_lifecycle_history h where h.trip_place_id=tp.id),'[]'::jsonb)
  ) order by tp.updated_at desc),'[]'::jsonb) end
  from public.trip_places tp join public.places p on p.id=tp.place_id join public.restaurants r on r.trip_place_id=tp.id
  where tp.trip_id=p_trip_id and tp.module_key='restaurants' and tp.status='archived';
$$;

grant execute on function public.luvia_remove_restaurant_from_trip(uuid,uuid) to authenticated;
grant execute on function public.luvia_clear_restaurants(uuid,text) to authenticated;
grant execute on function public.luvia_list_archived_restaurant_entities(uuid) to authenticated;
commit;
