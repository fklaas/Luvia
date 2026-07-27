-- Luvia Core V3.5.1 · Build 11.7.1
-- Restaurant Workspace: complete editable lifecycle, reservation and memory metadata.
begin;


create or replace function public.luvia_list_restaurant_entities(p_trip_id uuid)
returns jsonb
language sql stable security definer set search_path=public as $$
  select case when auth.uid() is null or not public.luvia_is_trip_member(p_trip_id,auth.uid()) then '[]'::jsonb
  else coalesce(jsonb_agg(jsonb_build_object(
    'place',to_jsonb(p),'tripPlace',to_jsonb(tp),'restaurant',to_jsonb(r),
    'history',coalesce((select jsonb_agg(to_jsonb(h) order by h.event_at desc) from public.place_lifecycle_history h where h.trip_place_id=tp.id),'[]'::jsonb)
  ) order by tp.position,tp.created_at),'[]'::jsonb) end
  from public.trip_places tp join public.places p on p.id=tp.place_id join public.restaurants r on r.trip_place_id=tp.id
  where tp.trip_id=p_trip_id and tp.module_key='restaurants' and tp.status<>'archived';
$$;
grant execute on function public.luvia_list_restaurant_entities(uuid) to authenticated;

create or replace function public.luvia_update_restaurant_lifecycle(
  p_trip_id uuid,
  p_trip_place_id uuid,
  p_status text,
  p_patch jsonb default '{}'::jsonb
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_user uuid:=auth.uid(); v_current text; v_place uuid; v_restaurant uuid; v_result jsonb;
  v_allowed text[]:=array['discovered','saved','favorited','planned','reserved','visited','rated','memory','travel_book'];
  v_metadata jsonb;
begin
  if v_user is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  if not public.luvia_is_trip_member(p_trip_id,v_user) then raise exception using errcode='42501',message='NOT_AUTHORIZED'; end if;
  if not (p_status=any(v_allowed)) then raise exception using errcode='22023',message='LIFECYCLE_STATUS_INVALID'; end if;
  select tp.lifecycle_status,tp.place_id,r.id,r.metadata into v_current,v_place,v_restaurant,v_metadata
  from public.trip_places tp join public.restaurants r on r.trip_place_id=tp.id
  where tp.id=p_trip_place_id and tp.trip_id=p_trip_id and tp.module_key='restaurants' for update;
  if v_place is null then raise exception using errcode='P0002',message='RESTAURANT_NOT_FOUND'; end if;

  update public.trip_places set
    lifecycle_status=p_status,
    status=case when p_status in ('discovered','saved','favorited') then 'idea' when p_status in ('planned','reserved') then 'planned' else 'visited' end,
    is_favorite=case when p_patch ? 'isFavorite' then coalesce((p_patch->>'isFavorite')::boolean,false) when p_status in ('favorited','planned','reserved','visited','rated','memory','travel_book') then true else is_favorite end,
    planned_date=case when p_patch ? 'plannedDate' then nullif(p_patch->>'plannedDate','')::date else planned_date end,
    planned_time=case when p_patch ? 'plannedTime' then nullif(p_patch->>'plannedTime','')::time else planned_time end,
    visited_at=case when p_patch ? 'visitedAt' then nullif(p_patch->>'visitedAt','')::timestamptz when p_status in ('visited','rated','memory','travel_book') then coalesce(visited_at,now()) else visited_at end,
    memory_status=case when p_patch ? 'memoryStatus' then coalesce(nullif(p_patch->>'memoryStatus',''),'none') when p_status in ('memory','travel_book') then 'created' else memory_status end,
    travel_book_status=case when p_patch ? 'travelBookStatus' then coalesce(nullif(p_patch->>'travelBookStatus',''),'none') when p_status='travel_book' then 'linked' else travel_book_status end,
    user_notes=case when p_patch ? 'notes' then nullif(p_patch->>'notes','') else user_notes end,
    updated_at=now()
  where id=p_trip_place_id;

  update public.restaurants set
    reservation_status=case when p_patch ? 'reservationStatus' then coalesce(nullif(p_patch->>'reservationStatus',''),'none') when p_status='reserved' then 'confirmed' else reservation_status end,
    reservation_date=case when p_patch ? 'reservationDate' then nullif(p_patch->>'reservationDate','')::date else reservation_date end,
    reservation_time=case when p_patch ? 'reservationTime' then nullif(p_patch->>'reservationTime','')::time else reservation_time end,
    reservation_name=case when p_patch ? 'reservationName' then nullif(p_patch->>'reservationName','') else reservation_name end,
    confirmation_number=case when p_patch ? 'confirmationNumber' then nullif(p_patch->>'confirmationNumber','') else confirmation_number end,
    reservation_url=case when p_patch ? 'reservationUrl' then nullif(p_patch->>'reservationUrl','') else reservation_url end,
    reservation_notes=case when p_patch ? 'reservationNotes' then nullif(p_patch->>'reservationNotes','') else reservation_notes end,
    visited=p_status in ('visited','rated','memory','travel_book'),
    personal_rating=case when p_patch ? 'personalRating' then nullif(p_patch->>'personalRating','')::smallint else personal_rating end,
    personal_notes=case when p_patch ? 'personalNotes' then nullif(p_patch->>'personalNotes','') else personal_notes end,
    recommended_visit_time=case when p_patch ? 'recommendedVisitTime' then nullif(p_patch->>'recommendedVisitTime','')::time else recommended_visit_time end,
    recommendation_reason=case when p_patch ? 'recommendationReason' then nullif(p_patch->>'recommendationReason','') else recommendation_reason end,
    match_score=case when p_patch ? 'matchScore' then nullif(p_patch->>'matchScore','')::smallint else match_score end,
    metadata=coalesce(v_metadata,'{}'::jsonb)||coalesce(p_patch->'metadata','{}'::jsonb),
    recommendation_metadata=recommendation_metadata||coalesce(p_patch->'recommendationMetadata','{}'::jsonb),updated_at=now()
  where id=v_restaurant;

  if v_current is distinct from p_status then
    insert into public.place_lifecycle_history(trip_id,trip_place_id,place_id,module_key,from_status,to_status,actor_user_id,metadata)
    values(p_trip_id,p_trip_place_id,v_place,'restaurants',v_current,p_status,v_user,coalesce(p_patch->'metadata','{}'::jsonb));
  end if;
  if to_regclass('public.trip_activity_events') is not null then
    insert into public.trip_activity_events(trip_id,actor_user_id,event_type,title,body,entity_type,entity_id,metadata)
    values(p_trip_id,v_user,'restaurant.updated','Restaurant aktualisiert',case when v_current is distinct from p_status then 'Status: '||p_status else 'Planung und Vermerke wurden bearbeitet' end,'restaurant',p_trip_place_id::text,jsonb_build_object('from',v_current,'to',p_status));
  end if;
  select jsonb_build_object('place',to_jsonb(p),'tripPlace',to_jsonb(tp),'restaurant',to_jsonb(r),
    'history',coalesce((select jsonb_agg(to_jsonb(h) order by h.event_at desc) from public.place_lifecycle_history h where h.trip_place_id=tp.id),'[]'::jsonb)) into v_result
  from public.trip_places tp join public.places p on p.id=tp.place_id join public.restaurants r on r.trip_place_id=tp.id where tp.id=p_trip_place_id;
  return v_result;
end;$$;
grant execute on function public.luvia_update_restaurant_lifecycle(uuid,uuid,text,jsonb) to authenticated;
commit;
