begin;

create or replace function public.luvia_remove_restaurant_from_trip(p_trip_id uuid,p_trip_place_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_count integer;
begin
  if auth.uid() is null or not public.luvia_is_trip_member(p_trip_id,auth.uid()) then raise exception 'TRIP_ACCESS_DENIED'; end if;
  delete from public.trip_places where id=p_trip_place_id and trip_id=p_trip_id and module_key='restaurants';
  get diagnostics v_count=row_count;
  return v_count>0;
end;$$;

create or replace function public.luvia_clear_restaurants(p_trip_id uuid,p_scope text default 'saved')
returns integer language plpgsql security definer set search_path=public as $$
declare v_count integer;
begin
  if auth.uid() is null or not public.luvia_is_trip_member(p_trip_id,auth.uid()) then raise exception 'TRIP_ACCESS_DENIED'; end if;
  if p_scope='favorites' then
    update public.trip_places set is_favorite=false,updated_at=now() where trip_id=p_trip_id and module_key='restaurants' and is_favorite=true;
  elsif p_scope='saved' then
    delete from public.trip_places where trip_id=p_trip_id and module_key='restaurants' and is_favorite=false;
  else
    raise exception 'INVALID_SCOPE';
  end if;
  get diagnostics v_count=row_count;
  return v_count;
end;$$;

grant execute on function public.luvia_remove_restaurant_from_trip(uuid,uuid) to authenticated;
grant execute on function public.luvia_clear_restaurants(uuid,text) to authenticated;

commit;
