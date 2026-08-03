-- Luvia Core V2.12.3 – Secure Restaurant Import Service
-- Wiederholt ausführbar. Führt Place-, TripPlace- und Restaurant-Upsert atomar aus.

create or replace function public.luvia_import_restaurant_entity(
  p_trip_id uuid,
  p_place jsonb,
  p_trip_place jsonb default '{}'::jsonb,
  p_restaurant jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user_id uuid := auth.uid();
  v_place_id uuid;
  v_trip_place_id uuid;
  v_restaurant_id uuid;
  v_place_created boolean := false;
  v_trip_place_created boolean := false;
  v_restaurant_created boolean := false;
  v_provider text := coalesce(nullif(p_place->>'provider',''),'google-places');
  v_provider_place_id text := nullif(p_place->>'provider_place_id','');
  v_module_key text := coalesce(nullif(p_trip_place->>'module_key',''),'restaurants');
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception using errcode='42501', message='AUTH_REQUIRED';
  end if;
  if not public.luvia_is_trip_member(p_trip_id) then
    raise exception using errcode='42501', message='NOT_AUTHORIZED';
  end if;
  if v_provider_place_id is null or nullif(p_place->>'name','') is null then
    raise exception using errcode='22023', message='PLACE_IMPORT_INVALID';
  end if;
  if v_module_key <> 'restaurants' then
    raise exception using errcode='22023', message='MODULE_KEY_INVALID';
  end if;

  select id into v_place_id
  from public.places
  where provider=v_provider and provider_place_id=v_provider_place_id;

  if v_place_id is null then
    insert into public.places(
      provider,provider_place_id,name,address,latitude,longitude,maps_url,website,phone,
      rating,rating_count,price_level,categories,attributes,opening_hours,raw_provider_data,
      source_updated_at,created_at,updated_at
    ) values (
      v_provider,v_provider_place_id,p_place->>'name',nullif(p_place->>'address',''),
      nullif(p_place->>'latitude','')::double precision,nullif(p_place->>'longitude','')::double precision,
      nullif(p_place->>'maps_url',''),nullif(p_place->>'website',''),nullif(p_place->>'phone',''),
      nullif(p_place->>'rating','')::numeric,nullif(p_place->>'rating_count','')::integer,
      nullif(p_place->>'price_level','')::integer,
      coalesce(array(select jsonb_array_elements_text(coalesce(p_place->'categories','[]'::jsonb))),'{}'::text[]),
      coalesce(p_place->'attributes','{}'::jsonb),coalesce(p_place->'opening_hours','[]'::jsonb),
      coalesce(p_place->'raw_provider_data','{}'::jsonb),
      coalesce(nullif(p_place->>'source_updated_at','')::timestamptz,now()),now(),now()
    ) returning id into v_place_id;
    v_place_created := true;
  else
    update public.places set
      name=coalesce(nullif(p_place->>'name',''),name),
      address=coalesce(nullif(p_place->>'address',''),address),
      latitude=coalesce(nullif(p_place->>'latitude','')::double precision,latitude),
      longitude=coalesce(nullif(p_place->>'longitude','')::double precision,longitude),
      maps_url=coalesce(nullif(p_place->>'maps_url',''),maps_url),
      website=coalesce(nullif(p_place->>'website',''),website),
      phone=coalesce(nullif(p_place->>'phone',''),phone),
      rating=coalesce(nullif(p_place->>'rating','')::numeric,rating),
      rating_count=coalesce(nullif(p_place->>'rating_count','')::integer,rating_count),
      price_level=coalesce(nullif(p_place->>'price_level','')::integer,price_level),
      categories=case when jsonb_array_length(coalesce(p_place->'categories','[]'::jsonb))>0 then array(select jsonb_array_elements_text(p_place->'categories')) else categories end,
      attributes=coalesce(p_place->'attributes',attributes),
      opening_hours=coalesce(p_place->'opening_hours',opening_hours),
      raw_provider_data=coalesce(p_place->'raw_provider_data',raw_provider_data),
      source_updated_at=coalesce(nullif(p_place->>'source_updated_at','')::timestamptz,now()),
      updated_at=now()
    where id=v_place_id;
  end if;

  select id into v_trip_place_id from public.trip_places
  where trip_id=p_trip_id and place_id=v_place_id and module_key='restaurants';

  if v_trip_place_id is null then
    insert into public.trip_places(
      trip_id,place_id,module_key,status,position,is_favorite,user_notes,custom_name,
      custom_description,custom_symbol,planned_date,planned_time,created_by,sync_status,created_at,updated_at
    ) values (
      p_trip_id,v_place_id,'restaurants',coalesce(nullif(p_trip_place->>'status',''),'idea'),
      coalesce(nullif(p_trip_place->>'position','')::integer,0),coalesce((p_trip_place->>'is_favorite')::boolean,false),
      nullif(p_trip_place->>'user_notes',''),nullif(p_trip_place->>'custom_name',''),
      nullif(p_trip_place->>'custom_description',''),nullif(p_trip_place->>'custom_symbol',''),
      nullif(p_trip_place->>'planned_date','')::date,nullif(p_trip_place->>'planned_time','')::time,
      v_user_id,'synced',now(),now()
    ) returning id into v_trip_place_id;
    v_trip_place_created := true;
  end if;

  select id into v_restaurant_id from public.restaurants where trip_place_id=v_trip_place_id;
  if v_restaurant_id is null then
    insert into public.restaurants(
      trip_place_id,reservation_date,reservation_time,reservation_status,reservation_name,
      confirmation_number,reservation_url,reservation_notes,menu_status,menu_url,
      personal_rating,visited,metadata,created_at,updated_at
    ) values (
      v_trip_place_id,nullif(p_restaurant->>'reservation_date','')::date,
      nullif(p_restaurant->>'reservation_time','')::time,
      coalesce(nullif(p_restaurant->>'reservation_status',''),'idea'),nullif(p_restaurant->>'reservation_name',''),
      nullif(p_restaurant->>'confirmation_number',''),nullif(p_restaurant->>'reservation_url',''),
      nullif(p_restaurant->>'reservation_notes',''),coalesce(nullif(p_restaurant->>'menu_status',''),'not_checked'),
      nullif(p_restaurant->>'menu_url',''),nullif(p_restaurant->>'personal_rating','')::smallint,
      coalesce((p_restaurant->>'visited')::boolean,false),coalesce(p_restaurant->'metadata','{}'::jsonb),now(),now()
    ) returning id into v_restaurant_id;
    v_restaurant_created := true;
  end if;

  select jsonb_build_object(
    'place',to_jsonb(p),'tripPlace',to_jsonb(tp),'restaurant',to_jsonb(r),
    'created',jsonb_build_object('place',v_place_created,'tripPlace',v_trip_place_created,'restaurant',v_restaurant_created),
    'alreadyAdded',not v_trip_place_created
  ) into v_result
  from public.places p
  join public.trip_places tp on tp.id=v_trip_place_id
  join public.restaurants r on r.id=v_restaurant_id
  where p.id=v_place_id;
  return v_result;
end;
$$;

create or replace function public.luvia_list_restaurant_entities(p_trip_id uuid)
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select case when auth.uid() is null or not public.luvia_is_trip_member(p_trip_id) then
    '[]'::jsonb
  else coalesce(jsonb_agg(jsonb_build_object('place',to_jsonb(p),'tripPlace',to_jsonb(tp),'restaurant',to_jsonb(r)) order by tp.position,tp.created_at),'[]'::jsonb) end
  from public.trip_places tp
  join public.places p on p.id=tp.place_id
  join public.restaurants r on r.trip_place_id=tp.id
  where tp.trip_id=p_trip_id and tp.module_key='restaurants' and tp.status<>'archived';
$$;

grant execute on function public.luvia_import_restaurant_entity(uuid,jsonb,jsonb,jsonb) to authenticated;
grant execute on function public.luvia_list_restaurant_entities(uuid) to authenticated;

create or replace function public.luvia_restaurant_import_status()
returns jsonb language sql stable security definer set search_path=public as $$
select jsonb_build_object(
  'ready',to_regprocedure('public.luvia_import_restaurant_entity(uuid,jsonb,jsonb,jsonb)') is not null,
  'version','2.12.3',
  'importFunction',to_regprocedure('public.luvia_import_restaurant_entity(uuid,jsonb,jsonb,jsonb)') is not null,
  'listFunction',to_regprocedure('public.luvia_list_restaurant_entities(uuid)') is not null
);
$$;
grant execute on function public.luvia_restaurant_import_status() to authenticated;
