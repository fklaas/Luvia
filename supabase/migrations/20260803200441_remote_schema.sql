


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."create_trip_with_code"("trip_name" "text", "trip_code" "text", "owner_name" "text" DEFAULT 'Fabian'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  new_trip_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Anmeldung erforderlich';
  end if;

  insert into public.trips (code, name, owner)
  values (upper(trim(trip_code)), trim(trip_name), auth.uid())
  returning id into new_trip_id;

  insert into public.trip_members (trip_id, user_id, display_name)
  values (
    new_trip_id,
    auth.uid(),
    coalesce(nullif(trim(owner_name), ''), 'Fabian')
  );

  return new_trip_id;
end;
$$;


ALTER FUNCTION "public"."create_trip_with_code"("trip_name" "text", "trip_code" "text", "owner_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_trip_member"("check_trip_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.trip_members tm
    where tm.trip_id = check_trip_id
      and tm.user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_trip_member"("check_trip_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."join_trip_by_code"("join_code" "text", "member_name" "text" DEFAULT 'Reisemitglied'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  found_trip_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Anmeldung erforderlich';
  end if;

  select id into found_trip_id
  from public.trips
  where upper(code) = upper(trim(join_code));

  if found_trip_id is null then
    raise exception 'Reisecode nicht gefunden';
  end if;

  insert into public.trip_members (trip_id, user_id, display_name)
  values (
    found_trip_id,
    auth.uid(),
    coalesce(nullif(trim(member_name), ''), 'Reisemitglied')
  )
  on conflict (trip_id, user_id)
  do update set display_name = excluded.display_name;

  return found_trip_id;
end;
$$;


ALTER FUNCTION "public"."join_trip_by_code"("join_code" "text", "member_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_activity_member_joined_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare v_trip uuid;v_user uuid;v_name text;
begin
  v_trip:=nullif(to_jsonb(new)->>'trip_id','')::uuid;
  v_user:=nullif(to_jsonb(new)->>'user_id','')::uuid;
  v_name:=coalesce(nullif(to_jsonb(new)->>'display_name',''),nullif(to_jsonb(new)->>'member_name',''),nullif(to_jsonb(new)->>'name',''),'Eine Person');
  if v_trip is not null then
    insert into public.trip_activity_events(trip_id,actor_user_id,event_type,title,body,entity_type,entity_id,metadata)
    values(v_trip,v_user,'member.joined',v_name||' ist der Reise beigetreten',null,'member',coalesce(v_user::text,new.id::text),jsonb_build_object('actorName',v_name));
  end if;
  return new;
end $$;


ALTER FUNCTION "public"."luvia_activity_member_joined_trigger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_clear_restaurants"("p_trip_id" "uuid", "p_scope" "text" DEFAULT 'saved'::"text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."luvia_clear_restaurants"("p_trip_id" "uuid", "p_scope" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_core_v2_database_status"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare result jsonb; begin
  if auth.uid() is null then raise exception 'Anmeldung erforderlich'; end if;
  select jsonb_build_object(
    'version','2.1.0-database-foundation',
    'ready',true,
    'tables',jsonb_build_object(
      'destinations',to_regclass('public.destinations') is not null,
      'trip_preferences',to_regclass('public.trip_preferences') is not null,
      'places',to_regclass('public.places') is not null,
      'trip_places',to_regclass('public.trip_places') is not null,
      'restaurants',to_regclass('public.restaurants') is not null,
      'generated_content',to_regclass('public.generated_content') is not null,
      'media',to_regclass('public.media') is not null,
      'recommendations',to_regclass('public.recommendations') is not null,
      'user_activity_events',to_regclass('public.user_activity_events') is not null,
      'automation_jobs',to_regclass('public.automation_jobs') is not null
    ),
    'module_count',(select count(*) from public.modules),
    'checked_at',now()
  ) into result;
  return result;
end $$;


ALTER FUNCTION "public"."luvia_core_v2_database_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_core_v2_permission_status"("p_trip_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_uid uuid := auth.uid();
  v_trip uuid := p_trip_id;
  v_member boolean := false;
begin
  if v_uid is null then
    raise exception 'Anmeldung erforderlich';
  end if;

  if v_trip is not null then
    v_member := public.luvia_is_trip_member(v_trip);
  end if;

  return jsonb_build_object(
    'version','2.2.1-permissions-fix',
    'authenticated',true,
    'user_id',v_uid,
    'trip_id',v_trip,
    'is_trip_member',v_member,
    'trip_preferences',jsonb_build_object(
      'select',has_table_privilege(v_uid::text,'public.trip_preferences','SELECT'),
      'insert',has_table_privilege(v_uid::text,'public.trip_preferences','INSERT'),
      'update',has_table_privilege(v_uid::text,'public.trip_preferences','UPDATE'),
      'delete',has_table_privilege(v_uid::text,'public.trip_preferences','DELETE')
    ),
    'checked_at',now()
  );
end;
$$;


ALTER FUNCTION "public"."luvia_core_v2_permission_status"("p_trip_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_decide_recommendation"("p_id" "uuid", "p_trip_id" "uuid", "p_status" "text", "p_reason" "text" DEFAULT NULL::"text", "p_action" "text" DEFAULT NULL::"text", "p_context" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare v_row public.recommendation_instances;
begin
 if auth.uid() is null or not public.luvia_is_trip_member(p_trip_id,auth.uid()) then raise exception 'TRIP_ACCESS_DENIED';end if;
 update public.recommendation_instances set status=p_status,decision_reason=p_reason,converted_action=p_action,updated_at=now(),context_snapshot=context_snapshot||jsonb_build_object('decisionContext',p_context) where id=p_id and trip_id=p_trip_id and user_id=auth.uid() returning * into v_row;
 if v_row.id is null then raise exception 'RECOMMENDATION_NOT_FOUND';end if;
 return to_jsonb(v_row);
end $$;


ALTER FUNCTION "public"."luvia_decide_recommendation"("p_id" "uuid", "p_trip_id" "uuid", "p_status" "text", "p_reason" "text", "p_action" "text", "p_context" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_delete_schedule_event"("p_trip_id" "uuid", "p_source_key" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not public.luvia_is_trip_member(p_trip_id,auth.uid()) then raise exception using errcode='42501',message='NOT_AUTHORIZED'; end if;
  delete from public.trip_schedule_events where trip_id=p_trip_id and source_key=p_source_key;
  return found;
end;$$;


ALTER FUNCTION "public"."luvia_delete_schedule_event"("p_trip_id" "uuid", "p_source_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_ensure_user_profile"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  auth_row auth.users%rowtype;
  bundle jsonb;
  completed_at timestamptz;
  preference_updated_at timestamptz;
begin
  select * into auth_row from auth.users where id = p_user_id;
  if auth_row.id is null then return; end if;
  bundle := public.luvia_preferences_from_metadata(auth_row.raw_user_meta_data);
  completed_at := public.luvia_safe_timestamptz(bundle->>'preferences_completed_at');
  preference_updated_at := coalesce(public.luvia_safe_timestamptz(bundle->>'preferences_updated_at'), completed_at, now());
  insert into public.user_profiles(
    user_id,display_name,first_name,last_name,dietary_preferences,travel_interests,travel_styles,
    activity_preferences,entertainment_preferences,dining_preferences,mobility_preferences,atmosphere_preferences,
    travel_pace,budget_preference,family_preferences,accessibility_preferences,preference_schema_version,
    preferences_completed_at,preferences_updated_at,travel_preferences,updated_at
  ) values (
    auth_row.id,
    coalesce(nullif(auth_row.raw_user_meta_data->>'display_name',''),nullif(auth_row.raw_user_meta_data->>'full_name',''),split_part(auth_row.email,'@',1)),
    nullif(auth_row.raw_user_meta_data->>'first_name',''),nullif(auth_row.raw_user_meta_data->>'last_name',''),
    public.luvia_jsonb_text_array(bundle->'dietary_preferences'),public.luvia_jsonb_text_array(bundle->'travel_interests'),public.luvia_jsonb_text_array(bundle->'travel_styles'),
    public.luvia_jsonb_text_array(bundle->'activity_preferences'),public.luvia_jsonb_text_array(bundle->'entertainment_preferences'),public.luvia_jsonb_text_array(bundle->'dining_preferences'),public.luvia_jsonb_text_array(bundle->'mobility_preferences'),public.luvia_jsonb_text_array(bundle->'atmosphere_preferences'),
    case when bundle->>'travel_pace' in ('relaxed','balanced','active') then bundle->>'travel_pace' else 'balanced' end,
    case when bundle->>'budget_preference' in ('low','medium','premium') then bundle->>'budget_preference' else 'medium' end,
    public.luvia_jsonb_object(bundle->'family_preferences'),public.luvia_jsonb_object(bundle->'accessibility_preferences'),
    greatest(public.luvia_safe_integer(bundle->>'preference_schema_version',3),3),completed_at,preference_updated_at,
    '{}'::jsonb,now()
  ) on conflict(user_id) do nothing;
end;
$$;


ALTER FUNCTION "public"."luvia_ensure_user_profile"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_finalize_trip_creation"("p_trip_id" "uuid", "p_trip_name" "text", "p_destination_context" "jsonb", "p_symbol" "text", "p_accent" "text", "p_start_date" "date", "p_end_date" "date") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
 v_claimed boolean;
begin
 select public.paris_claim_unowned_trip(p_trip_id) into v_claimed;
 if not coalesce(v_claimed,false) then raise exception 'TRIP_OWNER_ASSIGNMENT_FAILED'; end if;
 return public.luvia_save_trip_profile(p_trip_id,p_trip_name,p_destination_context,p_symbol,p_accent,p_start_date,p_end_date);
end;
$$;


ALTER FUNCTION "public"."luvia_finalize_trip_creation"("p_trip_id" "uuid", "p_trip_name" "text", "p_destination_context" "jsonb", "p_symbol" "text", "p_accent" "text", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_first_nonempty_text_array"("p_first" "text"[], "p_second" "text"[], "p_third" "text"[]) RETURNS "text"[]
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
  select case
    when coalesce(cardinality(p_first),0) > 0 then p_first
    when coalesce(cardinality(p_second),0) > 0 then p_second
    when coalesce(cardinality(p_third),0) > 0 then p_third
    else '{}'::text[]
  end;
$$;


ALTER FUNCTION "public"."luvia_first_nonempty_text_array"("p_first" "text"[], "p_second" "text"[], "p_third" "text"[]) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "user_id" "uuid" NOT NULL,
    "display_name" "text",
    "first_name" "text",
    "last_name" "text",
    "avatar_url" "text",
    "avatar_color" "text" DEFAULT '#ee6f83'::"text" NOT NULL,
    "language" "text" DEFAULT 'de'::"text" NOT NULL,
    "timezone" "text",
    "home_location" "text",
    "dietary_preferences" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "travel_preferences" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "theme_mode" "text" DEFAULT 'system'::"text" NOT NULL,
    "active_trip_id" "uuid",
    "settings" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "travel_interests" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "travel_styles" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "activity_preferences" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "entertainment_preferences" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "dining_preferences" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "mobility_preferences" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "atmosphere_preferences" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "travel_pace" "text" DEFAULT 'balanced'::"text" NOT NULL,
    "budget_preference" "text" DEFAULT 'medium'::"text" NOT NULL,
    "family_preferences" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "accessibility_preferences" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "preference_schema_version" integer DEFAULT 3 NOT NULL,
    "preferences_completed_at" timestamp with time zone,
    "preferences_updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_profiles_budget_preference_check" CHECK (("budget_preference" = ANY (ARRAY['low'::"text", 'medium'::"text", 'premium'::"text"]))),
    CONSTRAINT "user_profiles_theme_mode_check" CHECK (("theme_mode" = ANY (ARRAY['light'::"text", 'dark'::"text", 'system'::"text"]))),
    CONSTRAINT "user_profiles_travel_pace_check" CHECK (("travel_pace" = ANY (ARRAY['relaxed'::"text", 'balanced'::"text", 'active'::"text"])))
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_get_my_profile"() RETURNS SETOF "public"."user_profiles"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public.luvia_ensure_user_profile(uid);
  return query select * from public.user_profiles where user_id = uid;
end;
$$;


ALTER FUNCTION "public"."luvia_get_my_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_get_trip_modules"("p_trip_id" "uuid") RETURNS TABLE("modules" "jsonb", "settings" "jsonb")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not public.luvia_is_trip_member(p_trip_id) then raise exception 'Kein Zugriff auf diese Reise.'; end if;
  return query select s.modules,s.settings from public.trip_module_settings s where s.trip_id=p_trip_id;
end;
$$;


ALTER FUNCTION "public"."luvia_get_trip_modules"("p_trip_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_handle_new_auth_user_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  perform public.luvia_ensure_user_profile(new.id);
  return new;
end;
$$;


ALTER FUNCTION "public"."luvia_handle_new_auth_user_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_import_place_entity"("p_trip_id" "uuid", "p_place" "jsonb", "p_trip_place" "jsonb" DEFAULT '{}'::"jsonb", "p_extension" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare v_user uuid:=auth.uid();v_place uuid;v_tp uuid;v_created_place boolean:=false;v_created_tp boolean:=false;v_provider text:=coalesce(nullif(p_place->>'provider',''),'google-places');v_provider_id text:=nullif(p_place->>'provider_place_id','');v_type text:=coalesce(nullif(p_place->>'primary_type',''),'custom');
begin
 if v_user is null then raise exception 'AUTH_REQUIRED'; end if;if not public.luvia_is_trip_member(p_trip_id) then raise exception 'NOT_AUTHORIZED';end if;
 if v_provider_id is null or nullif(p_place->>'name','') is null then raise exception 'PLACE_IMPORT_INVALID';end if;
 select id into v_place from public.places where (provider=v_provider and provider_place_id=v_provider_id) or (source=coalesce(nullif(p_place->>'source',''),'google_places') and source_id=coalesce(nullif(p_place->>'source_id',''),v_provider_id)) limit 1;
 if v_place is null then
  insert into public.places(provider,provider_place_id,name,address,latitude,longitude,maps_url,website,phone,rating,rating_count,price_level,categories,attributes,opening_hours,raw_provider_data,source_updated_at,primary_type,roles,capabilities,source,source_id,metadata,created_at,updated_at)
  values(v_provider,v_provider_id,p_place->>'name',nullif(p_place->>'address',''),nullif(p_place->>'latitude','')::double precision,nullif(p_place->>'longitude','')::double precision,nullif(p_place->>'maps_url',''),nullif(p_place->>'website',''),nullif(p_place->>'phone',''),nullif(p_place->>'rating','')::numeric,nullif(p_place->>'rating_count','')::integer,nullif(p_place->>'price_level','')::integer,coalesce(array(select jsonb_array_elements_text(coalesce(p_place->'categories','[]'))),'{}'),coalesce(p_place->'attributes','{}'),coalesce(p_place->'opening_hours','[]'),coalesce(p_place->'raw_provider_data','{}'),now(),v_type,coalesce(array(select jsonb_array_elements_text(coalesce(p_place->'roles','[]'))),'{}'),coalesce(array(select jsonb_array_elements_text(coalesce(p_place->'capabilities','[]'))),'{}'),coalesce(nullif(p_place->>'source',''),'google_places'),coalesce(nullif(p_place->>'source_id',''),v_provider_id),coalesce(p_place->'metadata','{}'),now(),now()) returning id into v_place;v_created_place:=true;
 else update public.places set name=coalesce(nullif(p_place->>'name',''),name),address=coalesce(nullif(p_place->>'address',''),address),latitude=coalesce(nullif(p_place->>'latitude','')::double precision,latitude),longitude=coalesce(nullif(p_place->>'longitude','')::double precision,longitude),primary_type=v_type,roles=coalesce(array(select jsonb_array_elements_text(coalesce(p_place->'roles','[]'))),roles),metadata=metadata||coalesce(p_place->'metadata','{}'),updated_at=now() where id=v_place;end if;
 select id into v_tp from public.trip_places where trip_id=p_trip_id and place_id=v_place limit 1;
 if v_tp is null then insert into public.trip_places(trip_id,place_id,module_key,status,position,is_favorite,user_notes,custom_name,custom_description,custom_symbol,planned_date,planned_time,created_by,sync_status,created_at,updated_at)
 values(p_trip_id,v_place,'places',coalesce(nullif(p_trip_place->>'status',''),'idea'),coalesce(nullif(p_trip_place->>'position','')::int,0),coalesce((p_trip_place->>'isFavorite')::boolean,false),nullif(p_trip_place->>'userNotes',''),nullif(p_trip_place->>'customName',''),nullif(p_trip_place->>'customDescription',''),nullif(p_trip_place->>'customSymbol',''),nullif(p_trip_place->>'plannedDate','')::date,nullif(p_trip_place->>'plannedTime','')::time,v_user,'synced',now(),now()) returning id into v_tp;v_created_tp:=true;end if;
 if v_type='restaurant' then insert into public.restaurants(trip_place_id,reservation_status,reservation_date,reservation_time,reservation_name,reservation_url,reservation_notes,metadata,created_at,updated_at) values(v_tp,coalesce(nullif(p_extension->>'reservationStatus',''),'idea'),nullif(p_extension->>'reservationDate','')::date,nullif(p_extension->>'reservationTime','')::time,nullif(p_extension->>'reservationName',''),nullif(p_extension->>'reservationUrl',''),nullif(p_extension->>'reservationNotes',''),coalesce(p_extension->'metadata','{}'),now(),now()) on conflict(trip_place_id) do update set updated_at=now(); end if;
 return (select jsonb_build_object('place',to_jsonb(p),'tripPlace',to_jsonb(tp),'extension',case when v_type='restaurant' then (select to_jsonb(r) from public.restaurants r where r.trip_place_id=v_tp) else p_extension end,'created',jsonb_build_object('place',v_created_place,'tripPlace',v_created_tp),'alreadyAdded',not v_created_tp) from public.places p join public.trip_places tp on tp.id=v_tp where p.id=v_place);
end$$;


ALTER FUNCTION "public"."luvia_import_place_entity"("p_trip_id" "uuid", "p_place" "jsonb", "p_trip_place" "jsonb", "p_extension" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_import_restaurant_entity"("p_trip_id" "uuid", "p_place" "jsonb", "p_trip_place" "jsonb" DEFAULT '{}'::"jsonb", "p_restaurant" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."luvia_import_restaurant_entity"("p_trip_id" "uuid", "p_place" "jsonb", "p_trip_place" "jsonb", "p_restaurant" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_is_trip_admin"("p_trip_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public.trip_members tm
    where (to_jsonb(tm)->>'trip_id')::uuid=p_trip_id
      and (to_jsonb(tm)->>'user_id')::uuid=auth.uid()
      and lower(coalesce(to_jsonb(tm)->>'role','member')) in ('owner','admin')
  ) or exists (
    select 1 from public.trips t
    where t.id=p_trip_id and nullif(to_jsonb(t)->>'owner_id','')::uuid=auth.uid()
  );
$$;


ALTER FUNCTION "public"."luvia_is_trip_admin"("p_trip_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_is_trip_member"("p_trip_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public.trip_members tm
    where (to_jsonb(tm)->>'trip_id')::uuid = p_trip_id
      and (to_jsonb(tm)->>'user_id')::uuid = auth.uid()
  ) or exists (
    select 1 from public.trips t
    where t.id=p_trip_id and nullif(to_jsonb(t)->>'owner_id','')::uuid=auth.uid()
  );
$$;


ALTER FUNCTION "public"."luvia_is_trip_member"("p_trip_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_is_trip_member"("p_trip_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists(
    select 1 from public.trip_members tm
    where nullif(to_jsonb(tm)->>'trip_id','')::uuid=p_trip_id
      and nullif(to_jsonb(tm)->>'user_id','')::uuid=p_user_id
  );
$$;


ALTER FUNCTION "public"."luvia_is_trip_member"("p_trip_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_join_trip_by_code"("p_join_code" "text", "p_display_name" "text") RETURNS TABLE("trip_id" "uuid", "member_id" "uuid", "member_role" "text", "already_member" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  v_trip uuid;
  v_member uuid;
  v_existing boolean:=false;
  v_code text:=public.luvia_normalize_join_code(p_join_code);
  v_name text:=left(trim(coalesce(p_display_name,'')),80);
  v_name_col text;
  v_role_col text;
  v_joined_col text;
  v_columns text:='trip_id,user_id';
  v_values text:='$1,$2';
  v_position integer:=3;
  v_sql text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(v_code)<5 then raise exception 'INVALID_INVITE_CODE'; end if;
  if v_name='' then raise exception 'DISPLAY_NAME_REQUIRED'; end if;

  execute $q$select t.id from public.trips t where public.luvia_normalize_join_code(coalesce(to_jsonb(t)->>'join_code',to_jsonb(t)->>'code',to_jsonb(t)->>'trip_code'))=$1 limit 1$q$
    into v_trip using v_code;
  if v_trip is null then raise exception 'INVITE_NOT_FOUND'; end if;

  select tm.id,true into v_member,v_existing
  from public.trip_members tm
  where nullif(to_jsonb(tm)->>'trip_id','')::uuid=v_trip
    and nullif(to_jsonb(tm)->>'user_id','')::uuid=auth.uid()
  limit 1;

  select case
    when exists(select 1 from information_schema.columns where table_schema='public' and table_name='trip_members' and column_name='display_name') then 'display_name'
    when exists(select 1 from information_schema.columns where table_schema='public' and table_name='trip_members' and column_name='member_name') then 'member_name'
    when exists(select 1 from information_schema.columns where table_schema='public' and table_name='trip_members' and column_name='name') then 'name'
  end into v_name_col;

  select case
    when exists(select 1 from information_schema.columns where table_schema='public' and table_name='trip_members' and column_name='role') then 'role'
    when exists(select 1 from information_schema.columns where table_schema='public' and table_name='trip_members' and column_name='member_role') then 'member_role'
  end into v_role_col;

  select case
    when exists(select 1 from information_schema.columns where table_schema='public' and table_name='trip_members' and column_name='joined_at') then 'joined_at'
    when exists(select 1 from information_schema.columns where table_schema='public' and table_name='trip_members' and column_name='created_at') then 'created_at'
  end into v_joined_col;

  if not coalesce(v_existing,false) then
    if v_name_col is not null then v_columns:=v_columns||','||quote_ident(v_name_col);v_values:=v_values||',$'||v_position;v_position:=v_position+1;end if;
    if v_role_col is not null then v_columns:=v_columns||','||quote_ident(v_role_col);v_values:=v_values||',$'||v_position;v_position:=v_position+1;end if;
    if v_joined_col is not null then v_columns:=v_columns||','||quote_ident(v_joined_col);v_values:=v_values||',now()';end if;
    v_sql:='insert into public.trip_members('||v_columns||') values('||v_values||') returning id';
    if v_name_col is not null and v_role_col is not null then execute v_sql into v_member using v_trip,auth.uid(),v_name,'member';
    elsif v_name_col is not null then execute v_sql into v_member using v_trip,auth.uid(),v_name;
    elsif v_role_col is not null then execute v_sql into v_member using v_trip,auth.uid(),'member';
    else execute v_sql into v_member using v_trip,auth.uid();
    end if;
  elsif v_name_col is not null then
    execute format('update public.trip_members set %I=$1 where id=$2',v_name_col) using v_name,v_member;
  end if;

  return query select v_trip,v_member,
    coalesce((select coalesce(nullif(to_jsonb(tm)->>'role',''),nullif(to_jsonb(tm)->>'member_role',''),'member') from public.trip_members tm where tm.id=v_member),'member'),
    coalesce(v_existing,false);
end $_$;


ALTER FUNCTION "public"."luvia_join_trip_by_code"("p_join_code" "text", "p_display_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_jsonb_object"("p_value" "jsonb") RETURNS "jsonb"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
  select case when jsonb_typeof(coalesce(p_value, '{}'::jsonb)) = 'object'
    then coalesce(p_value, '{}'::jsonb)
    else '{}'::jsonb
  end;
$$;


ALTER FUNCTION "public"."luvia_jsonb_object"("p_value" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_jsonb_text_array"("p_value" "jsonb") RETURNS "text"[]
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
  select coalesce(array(
    select distinct btrim(value)
    from jsonb_array_elements_text(
      case when jsonb_typeof(coalesce(p_value, '[]'::jsonb)) = 'array'
        then coalesce(p_value, '[]'::jsonb)
        else '[]'::jsonb
      end
    ) as values(value)
    where btrim(value) <> ''
    order by btrim(value)
  ), '{}'::text[]);
$$;


ALTER FUNCTION "public"."luvia_jsonb_text_array"("p_value" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_list_archived_restaurant_entities"("p_trip_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select case when auth.uid() is null or not public.luvia_is_trip_member(p_trip_id,auth.uid()) then '[]'::jsonb
  else coalesce(jsonb_agg(jsonb_build_object(
    'place',to_jsonb(p),'tripPlace',to_jsonb(tp),'restaurant',to_jsonb(r),
    'history',coalesce((select jsonb_agg(to_jsonb(h) order by h.event_at desc) from public.place_lifecycle_history h where h.trip_place_id=tp.id),'[]'::jsonb)
  ) order by tp.updated_at desc),'[]'::jsonb) end
  from public.trip_places tp join public.places p on p.id=tp.place_id join public.restaurants r on r.trip_place_id=tp.id
  where tp.trip_id=p_trip_id and tp.module_key='restaurants' and tp.status='archived';
$$;


ALTER FUNCTION "public"."luvia_list_archived_restaurant_entities"("p_trip_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_list_place_entities"("p_trip_id" "uuid", "p_primary_type" "text" DEFAULT NULL::"text", "p_role" "text" DEFAULT NULL::"text", "p_status" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
select case when auth.uid() is null or not public.luvia_is_trip_member(p_trip_id) then '[]'::jsonb else coalesce(jsonb_agg(jsonb_build_object('place',to_jsonb(p),'tripPlace',to_jsonb(tp),'extension',case when p.primary_type='restaurant' then (select to_jsonb(r) from public.restaurants r where r.trip_place_id=tp.id) when p.primary_type='accommodation' then (select to_jsonb(a) from public.accommodations a where a.trip_place_id=tp.id) else null end) order by tp.position,tp.created_at),'[]'::jsonb) end
from public.trip_places tp join public.places p on p.id=tp.place_id
where tp.trip_id=p_trip_id
and ((p_status='archived' and tp.status='archived') or (coalesce(p_status,'')<>'archived' and tp.status<>'archived'))
and (p_primary_type is null or p.primary_type=p_primary_type)
and (p_role is null or p_role=any(p.roles))
and (p_status is null or tp.status=p_status)
$$;


ALTER FUNCTION "public"."luvia_list_place_entities"("p_trip_id" "uuid", "p_primary_type" "text", "p_role" "text", "p_status" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recommendation_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recommendation_id" "uuid" NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "event_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "recommendation_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['shown'::"text", 'clicked'::"text", 'accepted'::"text", 'dismissed'::"text", 'hidden'::"text", 'saved'::"text", 'removed_later'::"text", 'rated_positive'::"text", 'rated_negative'::"text"])))
);


ALTER TABLE "public"."recommendation_events" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_list_recommendation_events"("p_trip_id" "uuid", "p_limit" integer DEFAULT 200) RETURNS SETOF "public"."recommendation_events"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
 select * from public.recommendation_events where trip_id=p_trip_id and public.luvia_is_trip_member(p_trip_id,auth.uid()) order by created_at desc limit greatest(1,least(coalesce(p_limit,200),1000));
$$;


ALTER FUNCTION "public"."luvia_list_recommendation_events"("p_trip_id" "uuid", "p_limit" integer) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recommendation_instances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "module_key" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "text",
    "recommendation_type" "text" DEFAULT 'for-you'::"text" NOT NULL,
    "context_snapshot" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "score" numeric(5,2),
    "score_components" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "reasons" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "warnings" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "suggested_date" "date",
    "suggested_time" time without time zone,
    "expires_at" timestamp with time zone,
    "status" "text" DEFAULT 'generated'::"text" NOT NULL,
    "decision_reason" "text",
    "converted_action" "text",
    "engine_version" "text" DEFAULT '3.6.0'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "candidate_source" "text",
    "constraints" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "group_match" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "rule_version" "text" DEFAULT 'foundation-1'::"text" NOT NULL
);


ALTER TABLE "public"."recommendation_instances" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_list_recommendations"("p_trip_id" "uuid", "p_module" "text" DEFAULT NULL::"text", "p_limit" integer DEFAULT 100) RETURNS SETOF "public"."recommendation_instances"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
 select * from public.recommendation_instances where trip_id=p_trip_id and public.luvia_is_trip_member(p_trip_id,auth.uid()) and (p_module is null or module_key=p_module) order by created_at desc limit greatest(1,least(coalesce(p_limit,100),500));
$$;


ALTER FUNCTION "public"."luvia_list_recommendations"("p_trip_id" "uuid", "p_module" "text", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_list_restaurant_entities"("p_trip_id" "uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select case when auth.uid() is null or not public.luvia_is_trip_member(p_trip_id,auth.uid()) then '[]'::jsonb
  else coalesce(jsonb_agg(jsonb_build_object(
    'place',to_jsonb(p),'tripPlace',to_jsonb(tp),'restaurant',to_jsonb(r),
    'history',coalesce((select jsonb_agg(to_jsonb(h) order by h.event_at desc) from public.place_lifecycle_history h where h.trip_place_id=tp.id),'[]'::jsonb)
  ) order by tp.position,tp.created_at),'[]'::jsonb) end
  from public.trip_places tp join public.places p on p.id=tp.place_id join public.restaurants r on r.trip_place_id=tp.id
  where tp.trip_id=p_trip_id and tp.module_key='restaurants' and tp.status<>'archived';
$$;


ALTER FUNCTION "public"."luvia_list_restaurant_entities"("p_trip_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trip_schedule_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "source_key" "text" NOT NULL,
    "entity_type" "text" DEFAULT 'place'::"text" NOT NULL,
    "place_id" "uuid",
    "trip_place_id" "uuid",
    "provider_place_id" "text",
    "title" "text" NOT NULL,
    "event_date" "date" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone,
    "duration_minutes" integer DEFAULT 60 NOT NULL,
    "lifecycle_status" "text" DEFAULT 'planned'::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "revision" bigint DEFAULT 1 NOT NULL,
    CONSTRAINT "trip_schedule_events_duration_minutes_check" CHECK ((("duration_minutes" >= 5) AND ("duration_minutes" <= 1440)))
);


ALTER TABLE "public"."trip_schedule_events" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_list_schedule_events"("p_trip_id" "uuid") RETURNS SETOF "public"."trip_schedule_events"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select e.* from public.trip_schedule_events e
  where e.trip_id=p_trip_id and public.luvia_is_trip_member(p_trip_id,auth.uid())
  order by e.event_date,e.start_time,e.created_at;
$$;


ALTER FUNCTION "public"."luvia_list_schedule_events"("p_trip_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_list_trip_activity"("p_trip_id" "uuid", "p_limit" integer DEFAULT 30) RETURNS TABLE("id" "uuid", "trip_id" "uuid", "actor_user_id" "uuid", "actor_name" "text", "event_type" "text", "title" "text", "body" "text", "entity_type" "text", "entity_id" "text", "metadata" "jsonb", "created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select e.id,e.trip_id,e.actor_user_id,
    coalesce(
      (select coalesce(nullif(to_jsonb(tm)->>'display_name',''),nullif(to_jsonb(tm)->>'member_name',''),nullif(to_jsonb(tm)->>'name',''))
       from public.trip_members tm
       where nullif(to_jsonb(tm)->>'trip_id','')::uuid=e.trip_id and nullif(to_jsonb(tm)->>'user_id','')::uuid=e.actor_user_id limit 1),
      nullif(e.metadata->>'actorName',''),'Luvia'
    ),e.event_type,e.title,e.body,e.entity_type,e.entity_id,e.metadata,e.created_at
  from public.trip_activity_events e
  where e.trip_id=p_trip_id and public.luvia_is_trip_member(p_trip_id,auth.uid())
  order by e.created_at desc
  limit greatest(1,least(coalesce(p_limit,30),100));
$$;


ALTER FUNCTION "public"."luvia_list_trip_activity"("p_trip_id" "uuid", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_list_trip_members"("p_trip_id" "uuid") RETURNS TABLE("id" "uuid", "user_id" "uuid", "display_name" "text", "role" "text", "joined_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
 select tm.id,
   nullif(to_jsonb(tm)->>'user_id','')::uuid,
   coalesce(nullif(to_jsonb(tm)->>'display_name',''),nullif(to_jsonb(tm)->>'member_name',''),nullif(to_jsonb(tm)->>'name',''),'Mitreisende Person'),
   coalesce(nullif(to_jsonb(tm)->>'role',''),nullif(to_jsonb(tm)->>'member_role',''),'member'),
   coalesce(nullif(to_jsonb(tm)->>'joined_at','')::timestamptz,nullif(to_jsonb(tm)->>'created_at','')::timestamptz,now())
 from public.trip_members tm
 where nullif(to_jsonb(tm)->>'trip_id','')::uuid=p_trip_id
 and public.luvia_is_trip_member(p_trip_id,auth.uid())
 order by coalesce(nullif(to_jsonb(tm)->>'joined_at','')::timestamptz,nullif(to_jsonb(tm)->>'created_at','')::timestamptz,now()),tm.id;
$$;


ALTER FUNCTION "public"."luvia_list_trip_members"("p_trip_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_list_trip_presence"("p_trip_id" "uuid") RETURNS TABLE("user_id" "uuid", "display_name" "text", "status" "text", "current_view" "text", "last_seen_at" timestamp with time zone, "device_count" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select p.user_id,
    coalesce(max(p.display_name),
      (select coalesce(nullif(to_jsonb(tm)->>'display_name',''),nullif(to_jsonb(tm)->>'member_name',''),nullif(to_jsonb(tm)->>'name',''),'Mitreisende Person')
       from public.trip_members tm where nullif(to_jsonb(tm)->>'trip_id','')::uuid=p_trip_id and nullif(to_jsonb(tm)->>'user_id','')::uuid=p.user_id limit 1)),
    case when max(p.last_seen_at)>now()-interval '90 seconds' then 'online' when max(p.last_seen_at)>now()-interval '15 minutes' then 'away' else 'offline' end,
    (array_agg(p.current_view order by p.last_seen_at desc))[1],max(p.last_seen_at),count(*)
  from public.trip_presence p
  where p.trip_id=p_trip_id and public.luvia_is_trip_member(p_trip_id,auth.uid())
  group by p.user_id
  order by max(p.last_seen_at) desc;
$$;


ALTER FUNCTION "public"."luvia_list_trip_presence"("p_trip_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_normalize_join_code"("p_code" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select upper(regexp_replace(coalesce(p_code,''),'[^A-Za-z0-9]','','g'));
$$;


ALTER FUNCTION "public"."luvia_normalize_join_code"("p_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_preferences_from_metadata"("p_meta" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
declare
  prefs jsonb := public.luvia_jsonb_object(coalesce(p_meta->'luvia_preferences', p_meta->'travel_preferences', '{}'::jsonb));
  travel jsonb;
begin
  travel := public.luvia_jsonb_object(coalesce(prefs->'travelPreferences', prefs->'travel_preferences', prefs));
  return jsonb_build_object(
    'dietary_preferences', coalesce(prefs->'dietaryPreferences', prefs->'dietary_preferences', travel->'dietary', '[]'::jsonb),
    'travel_interests', coalesce(prefs->'travelInterests', prefs->'travel_interests', travel->'interests', '[]'::jsonb),
    'travel_styles', coalesce(prefs->'travelStyles', prefs->'travel_styles', travel->'travelStyles', travel->'travel_styles', '[]'::jsonb),
    'activity_preferences', coalesce(prefs->'activityPreferences', prefs->'activity_preferences', travel->'activityPreferences', travel->'activity_preferences', '[]'::jsonb),
    'entertainment_preferences', coalesce(prefs->'entertainmentPreferences', prefs->'entertainment_preferences', travel->'entertainmentPreferences', travel->'entertainment_preferences', '[]'::jsonb),
    'dining_preferences', coalesce(prefs->'diningPreferences', prefs->'dining_preferences', travel->'diningPreferences', travel->'dining_preferences', '[]'::jsonb),
    'mobility_preferences', coalesce(prefs->'mobilityPreferences', prefs->'mobility_preferences', travel->'mobilityPreferences', travel->'mobility_preferences', '[]'::jsonb),
    'atmosphere_preferences', coalesce(prefs->'atmospherePreferences', prefs->'atmosphere_preferences', travel->'atmospherePreferences', travel->'atmosphere_preferences', '[]'::jsonb),
    'travel_pace', coalesce(prefs->>'travelPace', prefs->>'travel_pace', travel->>'pace', 'balanced'),
    'budget_preference', coalesce(prefs->>'budgetPreference', prefs->>'budget_preference', travel->>'budget', 'medium'),
    'family_preferences', coalesce(prefs->'familyPreferences', prefs->'family_preferences', travel->'familyPreferences', travel->'family_preferences', '{}'::jsonb),
    'accessibility_preferences', coalesce(prefs->'accessibilityPreferences', prefs->'accessibility_preferences', travel->'accessibilityPreferences', travel->'accessibility_preferences', jsonb_build_object('needs', coalesce(travel->'accessibilityNeeds', travel->'accessibility_needs', '[]'::jsonb))),
    'preference_schema_version', coalesce(prefs->>'preferenceSchemaVersion', prefs->>'preference_schema_version', travel->>'preferenceVersion', travel->>'preference_version', '3'),
    'preferences_completed_at', coalesce(prefs->>'preferencesCompletedAt', prefs->>'preferences_completed_at', travel->>'onboardingCompletedAt', travel->>'onboarding_completed_at', p_meta->>'onboarding_completed_at'),
    'preferences_updated_at', coalesce(prefs->>'preferencesUpdatedAt', prefs->>'preferences_updated_at', travel->>'preferencesUpdatedAt', travel->>'preferences_updated_at')
  );
end;
$$;


ALTER FUNCTION "public"."luvia_preferences_from_metadata"("p_meta" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_presence_heartbeat"("p_trip_id" "uuid", "p_device_id" "text", "p_display_name" "text" DEFAULT NULL::"text", "p_current_view" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS timestamp with time zone
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare v_now timestamptz:=now();
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.luvia_is_trip_member(p_trip_id,auth.uid()) then raise exception 'TRIP_ACCESS_DENIED'; end if;
  insert into public.trip_presence(trip_id,user_id,device_id,display_name,status,current_view,last_seen_at,metadata)
  values(p_trip_id,auth.uid(),left(coalesce(nullif(trim(p_device_id),''),'browser'),120),nullif(left(trim(coalesce(p_display_name,'')),80),''),'online',nullif(left(trim(coalesce(p_current_view,'')),80),''),v_now,coalesce(p_metadata,'{}'::jsonb))
  on conflict(trip_id,user_id,device_id) do update set display_name=excluded.display_name,status='online',current_view=excluded.current_view,last_seen_at=v_now,metadata=excluded.metadata;
  return v_now;
end $$;


ALTER FUNCTION "public"."luvia_presence_heartbeat"("p_trip_id" "uuid", "p_device_id" "text", "p_display_name" "text", "p_current_view" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_presence_leave"("p_trip_id" "uuid", "p_device_id" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if auth.uid() is null then return; end if;
  update public.trip_presence set status='away',last_seen_at=now()
  where trip_id=p_trip_id and user_id=auth.uid() and device_id=left(coalesce(nullif(trim(p_device_id),''),'browser'),120);
end $$;


ALTER FUNCTION "public"."luvia_presence_leave"("p_trip_id" "uuid", "p_device_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_preview_trip_invite"("p_join_code" "text") RETURNS TABLE("trip_id" "uuid", "trip_name" "text", "destination_name" "text", "symbol" "text", "accent" "text", "member_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare v_code text:=public.luvia_normalize_join_code(p_join_code);
begin
  if length(v_code)<5 then return; end if;
  return query execute $q$
    select t.id,
      coalesce(nullif(to_jsonb(t)->>'trip_name',''),nullif(to_jsonb(t)->>'title',''),'Unsere Reise'),
      coalesce(nullif(to_jsonb(t)->'destination_context'->>'name',''),nullif(to_jsonb(t)->>'destination_name',''),'Gemeinsames Reiseziel'),
      coalesce(nullif(to_jsonb(t)->>'symbol',''),'❤️'),
      coalesce(nullif(to_jsonb(t)->>'accent',''),'#ee6f83'),
      (select count(*) from public.trip_members tm where (to_jsonb(tm)->>'trip_id')::uuid=t.id)
    from public.trips t
    where public.luvia_normalize_join_code(coalesce(to_jsonb(t)->>'join_code',to_jsonb(t)->>'code',to_jsonb(t)->>'trip_code'))=$1
    limit 1
  $q$ using v_code;
end $_$;


ALTER FUNCTION "public"."luvia_preview_trip_invite"("p_join_code" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_learning_signals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "trip_id" "uuid",
    "scope_key" "text" DEFAULT 'global'::"text" NOT NULL,
    "signal_key" "text" NOT NULL,
    "category" "text" DEFAULT 'general'::"text" NOT NULL,
    "value" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "confidence" numeric(4,3) DEFAULT 0.500 NOT NULL,
    "evidence_count" integer DEFAULT 1 NOT NULL,
    "source_summary" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'inferred'::"text" NOT NULL,
    "first_observed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_observed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ai_learning_signals_confidence_check" CHECK ((("confidence" >= (0)::numeric) AND ("confidence" <= (1)::numeric))),
    CONSTRAINT "ai_learning_signals_evidence_count_check" CHECK (("evidence_count" >= 1)),
    CONSTRAINT "ai_learning_signals_status_check" CHECK (("status" = ANY (ARRAY['inferred'::"text", 'confirmed'::"text", 'dismissed'::"text"])))
);


ALTER TABLE "public"."ai_learning_signals" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_learning_signals" IS 'Evidence-backed, user-owned inferred or confirmed signals. Never replaces explicit user_profiles preferences.';



CREATE OR REPLACE FUNCTION "public"."luvia_record_ai_learning_signal"("p_trip_id" "uuid", "p_scope_key" "text", "p_signal_key" "text", "p_category" "text", "p_value" "jsonb", "p_confidence" numeric, "p_source_summary" "jsonb", "p_status" "text" DEFAULT 'inferred'::"text") RETURNS "public"."ai_learning_signals"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
declare
  v_uid uuid := auth.uid();
  v_result public.ai_learning_signals;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if coalesce(trim(p_signal_key), '') = '' then
    raise exception 'SIGNAL_KEY_REQUIRED' using errcode = '22023';
  end if;
  if coalesce(p_status, 'inferred') not in ('inferred','confirmed','dismissed') then
    raise exception 'INVALID_SIGNAL_STATUS' using errcode = '22023';
  end if;

  insert into public.ai_learning_signals (
    user_id, trip_id, scope_key, signal_key, category, value, confidence,
    evidence_count, source_summary, status, first_observed_at, last_observed_at
  ) values (
    v_uid,
    p_trip_id,
    coalesce(nullif(trim(p_scope_key), ''), 'global'),
    trim(p_signal_key),
    coalesce(nullif(trim(p_category), ''), 'general'),
    coalesce(p_value, '{}'::jsonb),
    greatest(0, least(1, coalesce(p_confidence, 0.5))),
    1,
    coalesce(p_source_summary, '{}'::jsonb),
    coalesce(p_status, 'inferred'),
    now(),
    now()
  )
  on conflict (user_id, scope_key, signal_key)
  do update set
    trip_id = coalesce(excluded.trip_id, ai_learning_signals.trip_id),
    category = excluded.category,
    value = excluded.value,
    confidence = greatest(ai_learning_signals.confidence, excluded.confidence),
    evidence_count = ai_learning_signals.evidence_count + 1,
    source_summary = excluded.source_summary,
    status = case
      when ai_learning_signals.status = 'confirmed' and excluded.status = 'inferred' then 'confirmed'
      else excluded.status
    end,
    last_observed_at = now(),
    updated_at = now()
  returning * into v_result;

  return v_result;
end;
$$;


ALTER FUNCTION "public"."luvia_record_ai_learning_signal"("p_trip_id" "uuid", "p_scope_key" "text", "p_signal_key" "text", "p_category" "text", "p_value" "jsonb", "p_confidence" numeric, "p_source_summary" "jsonb", "p_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_record_place_recommendation_feedback"("p_trip_id" "uuid", "p_place_id" "uuid", "p_provider_place_id" "text", "p_decision" "text", "p_match_score" smallint, "p_reasons" "jsonb", "p_context" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare v_id uuid; begin
 if auth.uid() is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
 if not public.luvia_is_trip_member(p_trip_id) then raise exception using errcode='42501',message='NOT_AUTHORIZED'; end if;
 insert into public.place_recommendation_feedback(trip_id,place_id,provider_place_id,decision,match_score,reasons,context,actor_user_id)
 values(p_trip_id,p_place_id,nullif(p_provider_place_id,''),p_decision,p_match_score,coalesce(p_reasons,'[]'::jsonb),coalesce(p_context,'{}'::jsonb),auth.uid()) returning id into v_id;
 return v_id;
end;$$;


ALTER FUNCTION "public"."luvia_record_place_recommendation_feedback"("p_trip_id" "uuid", "p_place_id" "uuid", "p_provider_place_id" "text", "p_decision" "text", "p_match_score" smallint, "p_reasons" "jsonb", "p_context" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_record_recommendation_event"("p_event" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare v_id uuid:=coalesce(nullif(p_event->>'id','')::uuid,gen_random_uuid());v_trip uuid:=nullif(p_event->>'tripId','')::uuid;v_rec uuid:=nullif(p_event->>'recommendationId','')::uuid;
begin
 if auth.uid() is null or v_trip is null or not public.luvia_is_trip_member(v_trip,auth.uid()) then raise exception 'TRIP_ACCESS_DENIED';end if;
 insert into public.recommendation_events(id,recommendation_id,trip_id,user_id,module_key,entity_type,entity_id,event_type,event_data)
 values(v_id,v_rec,v_trip,auth.uid(),coalesce(nullif(p_event->>'module',''),'places'),nullif(p_event->>'entityType',''),nullif(p_event->>'entityId',''),coalesce(nullif(p_event->>'eventType',''),'unknown'),coalesce(p_event->'data','{}'::jsonb));
 return v_id;
end $$;


ALTER FUNCTION "public"."luvia_record_recommendation_event"("p_event" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_record_trip_activity"("p_trip_id" "uuid", "p_event_type" "text", "p_title" "text", "p_body" "text" DEFAULT NULL::"text", "p_entity_type" "text" DEFAULT NULL::"text", "p_entity_id" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.luvia_is_trip_member(p_trip_id,auth.uid()) then raise exception 'TRIP_ACCESS_DENIED'; end if;
  if nullif(trim(p_event_type),'') is null or nullif(trim(p_title),'') is null then raise exception 'ACTIVITY_DATA_REQUIRED'; end if;
  insert into public.trip_activity_events(trip_id,actor_user_id,event_type,title,body,entity_type,entity_id,metadata)
  values(p_trip_id,auth.uid(),left(trim(p_event_type),80),left(trim(p_title),180),nullif(left(trim(coalesce(p_body,'')),500),''),nullif(left(trim(coalesce(p_entity_type,'')),80),''),nullif(left(trim(coalesce(p_entity_id,'')),160),''),coalesce(p_metadata,'{}'::jsonb))
  returning id into v_id;
  return v_id;
end $$;


ALTER FUNCTION "public"."luvia_record_trip_activity"("p_trip_id" "uuid", "p_event_type" "text", "p_title" "text", "p_body" "text", "p_entity_type" "text", "p_entity_id" "text", "p_metadata" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_remove_place_from_trip"("p_trip_id" "uuid", "p_trip_place_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$begin if not public.luvia_is_trip_member(p_trip_id) then raise exception 'NOT_AUTHORIZED';end if;update public.trip_places set status='archived',updated_at=now() where id=p_trip_place_id and trip_id=p_trip_id;return found;end$$;


ALTER FUNCTION "public"."luvia_remove_place_from_trip"("p_trip_id" "uuid", "p_trip_place_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_remove_restaurant_from_trip"("p_trip_id" "uuid", "p_trip_place_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare v_count integer;
begin
  if auth.uid() is null or not public.luvia_is_trip_member(p_trip_id,auth.uid()) then raise exception 'TRIP_ACCESS_DENIED'; end if;
  update public.trip_places set status='archived',is_favorite=false,planned_date=null,planned_time=null,updated_at=now()
  where id=p_trip_place_id and trip_id=p_trip_id and module_key='restaurants' and status<>'archived';
  get diagnostics v_count=row_count;
  return v_count>0;
end;$$;


ALTER FUNCTION "public"."luvia_remove_restaurant_from_trip"("p_trip_id" "uuid", "p_trip_place_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_reset_recommendation_learning"("p_trip_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 delete from public.recommendation_memory where user_id=auth.uid() and (p_trip_id is null or (scope_type='trip' and scope_id=p_trip_id::text));
end $$;


ALTER FUNCTION "public"."luvia_reset_recommendation_learning"("p_trip_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_restaurant_entity_schema_status"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'ready',
      to_regclass('public.places') is not null
      and to_regclass('public.trip_places') is not null
      and to_regclass('public.restaurants') is not null
      and exists(select 1 from information_schema.columns where table_schema='public' and table_name='trip_places' and column_name='planned_date')
      and exists(select 1 from information_schema.columns where table_schema='public' and table_name='trip_places' and column_name='planned_time')
      and exists(select 1 from information_schema.columns where table_schema='public' and table_name='restaurants' and column_name='reservation_name')
      and exists(select 1 from information_schema.columns where table_schema='public' and table_name='restaurants' and column_name='reservation_url')
      and exists(select 1 from information_schema.columns where table_schema='public' and table_name='restaurants' and column_name='reservation_notes')
      and exists(select 1 from information_schema.columns where table_schema='public' and table_name='restaurants' and column_name='menu_url'),
    'version','2.12.2',
    'tables',jsonb_build_object(
      'places',to_regclass('public.places') is not null,
      'trip_places',to_regclass('public.trip_places') is not null,
      'restaurants',to_regclass('public.restaurants') is not null
    ),
    'columns',jsonb_build_object(
      'trip_places.planned_date',exists(select 1 from information_schema.columns where table_schema='public' and table_name='trip_places' and column_name='planned_date'),
      'trip_places.planned_time',exists(select 1 from information_schema.columns where table_schema='public' and table_name='trip_places' and column_name='planned_time'),
      'restaurants.reservation_name',exists(select 1 from information_schema.columns where table_schema='public' and table_name='restaurants' and column_name='reservation_name'),
      'restaurants.reservation_url',exists(select 1 from information_schema.columns where table_schema='public' and table_name='restaurants' and column_name='reservation_url'),
      'restaurants.reservation_notes',exists(select 1 from information_schema.columns where table_schema='public' and table_name='restaurants' and column_name='reservation_notes'),
      'restaurants.menu_url',exists(select 1 from information_schema.columns where table_schema='public' and table_name='restaurants' and column_name='menu_url')
    ),
    'constraints',jsonb_build_object(
      'places_provider_identity',exists(select 1 from pg_constraint where conrelid='public.places'::regclass and contype='u' and pg_get_constraintdef(oid) ilike '%provider%provider_place_id%'),
      'trip_place_identity',exists(select 1 from pg_constraint where conrelid='public.trip_places'::regclass and contype='u' and pg_get_constraintdef(oid) ilike '%trip_id%place_id%module_key%'),
      'restaurant_per_trip_place',exists(select 1 from pg_constraint where conrelid='public.restaurants'::regclass and contype='u' and pg_get_constraintdef(oid) ilike '%trip_place_id%')
    ),
    'rls',jsonb_build_object(
      'places',(select relrowsecurity from pg_class where oid='public.places'::regclass),
      'trip_places',(select relrowsecurity from pg_class where oid='public.trip_places'::regclass),
      'restaurants',(select relrowsecurity from pg_class where oid='public.restaurants'::regclass)
    ),
    'checked_at',now()
  ) into result;
  return result;
end;
$$;


ALTER FUNCTION "public"."luvia_restaurant_entity_schema_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_restaurant_import_status"() RETURNS "jsonb"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
select jsonb_build_object(
  'ready',to_regprocedure('public.luvia_import_restaurant_entity(uuid,jsonb,jsonb,jsonb)') is not null,
  'version','2.12.3',
  'importFunction',to_regprocedure('public.luvia_import_restaurant_entity(uuid,jsonb,jsonb,jsonb)') is not null,
  'listFunction',to_regprocedure('public.luvia_list_restaurant_entities(uuid)') is not null
);
$$;


ALTER FUNCTION "public"."luvia_restaurant_import_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_safe_integer"("p_value" "text", "p_default" integer DEFAULT 0) RETURNS integer
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
begin
  if nullif(btrim(coalesce(p_value, '')), '') is null then return p_default; end if;
  return p_value::integer;
exception when others then
  return p_default;
end;
$$;


ALTER FUNCTION "public"."luvia_safe_integer"("p_value" "text", "p_default" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_safe_timestamptz"("p_value" "text") RETURNS timestamp with time zone
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
begin
  if nullif(btrim(coalesce(p_value, '')), '') is null then return null; end if;
  return p_value::timestamptz;
exception when others then
  return null;
end;
$$;


ALTER FUNCTION "public"."luvia_safe_timestamptz"("p_value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_save_trip_profile"("p_trip_id" "uuid", "p_trip_name" "text", "p_destination_context" "jsonb", "p_symbol" "text", "p_accent" "text", "p_start_date" "date", "p_end_date" "date") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
 cleaned jsonb;
 merged jsonb;
 v_owner boolean;
begin
 select public.paris_is_trip_owner(p_trip_id) into v_owner;
 if not v_owner then select public.paris_claim_unowned_trip(p_trip_id) into v_owner; end if;
 if not coalesce(v_owner,false) then raise exception 'NOT_TRIP_OWNER'; end if;

 select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) into cleaned
 from jsonb_each(coalesce(p_destination_context,'{}'::jsonb))
 where value <> 'null'::jsonb
   and not(jsonb_typeof(value)='string' and btrim(value #>> '{}')='');

 select coalesce(destination_context,'{}'::jsonb)||cleaned into merged
 from public.trip_settings where trip_id=p_trip_id;
 merged:=coalesce(merged,cleaned,'{}'::jsonb);

 insert into public.trip_settings(trip_id,trip_name,destination_context,symbol,accent,start_date,end_date,updated_at,updated_by)
 values(p_trip_id,left(trim(coalesce(nullif(p_trip_name,''),'Unsere Reise')),80),merged,
        coalesce(nullif(p_symbol,''),'❤️'),coalesce(nullif(p_accent,''),'#ee6f83'),
        p_start_date,p_end_date,now(),auth.uid())
 on conflict(trip_id) do update set
  trip_name=excluded.trip_name,
  destination_context=excluded.destination_context,
  symbol=excluded.symbol,
  accent=excluded.accent,
  start_date=excluded.start_date,
  end_date=excluded.end_date,
  updated_at=now(),
  updated_by=auth.uid();

 return jsonb_build_object('trip_id',p_trip_id,'trip_name',p_trip_name,'destination',merged,
   'symbol',p_symbol,'accent',p_accent,'start_date',p_start_date,'end_date',p_end_date,'is_owner',true);
end;
$$;


ALTER FUNCTION "public"."luvia_save_trip_profile"("p_trip_id" "uuid", "p_trip_name" "text", "p_destination_context" "jsonb", "p_symbol" "text", "p_accent" "text", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_set_trip_modules"("p_trip_id" "uuid", "p_modules" "jsonb", "p_settings" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not public.paris_is_trip_owner(p_trip_id) then raise exception 'Nur der Reisebesitzer darf Module ändern.'; end if;
  insert into public.trip_module_settings(trip_id,modules,settings,updated_at,updated_by)
  values(p_trip_id,coalesce(p_modules,'[]'::jsonb),coalesce(p_settings,'{}'::jsonb),now(),auth.uid())
  on conflict(trip_id) do update set modules=excluded.modules,settings=excluded.settings,updated_at=now(),updated_by=auth.uid();
  return jsonb_build_object('saved',true,'trip_id',p_trip_id);
end;
$$;


ALTER FUNCTION "public"."luvia_set_trip_modules"("p_trip_id" "uuid", "p_modules" "jsonb", "p_settings" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin new.updated_at = now(); return new; end; $$;


ALTER FUNCTION "public"."luvia_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_store_recommendation"("p_item" "jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare v_id uuid:=coalesce(nullif(p_item->>'id','')::uuid,gen_random_uuid());v_trip uuid:=nullif(p_item->>'tripId','')::uuid;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if v_trip is null or not public.luvia_is_trip_member(v_trip,auth.uid()) then raise exception 'TRIP_ACCESS_DENIED';end if;
 insert into public.recommendation_instances(id,trip_id,user_id,module_key,entity_type,entity_id,recommendation_type,context_snapshot,score,score_components,reasons,warnings,suggested_date,suggested_time,expires_at,status,engine_version,candidate_source,constraints,group_match,rule_version)
 values(v_id,v_trip,auth.uid(),coalesce(nullif(p_item->>'module',''),'places'),coalesce(nullif(p_item->>'entityType',''),'place'),nullif(p_item->>'entityId',''),coalesce(nullif(p_item->>'recommendationType',''),'for-you'),coalesce(p_item->'contextSnapshot','{}'::jsonb),nullif(p_item->>'score','')::numeric,coalesce(p_item->'scoreComponents','[]'::jsonb),coalesce(p_item->'reasons','[]'::jsonb),coalesce(p_item->'warnings','[]'::jsonb),nullif(p_item->>'suggestedDate','')::date,nullif(p_item->>'suggestedTime','')::time,nullif(p_item->>'expiresAt','')::timestamptz,coalesce(nullif(p_item->>'status',''),'generated'),'3.7.0',nullif(p_item->>'candidateSource',''),coalesce(p_item->'constraints','{}'::jsonb),coalesce(p_item->'groupMatch','{}'::jsonb),coalesce(nullif(p_item->>'ruleVersion',''),'foundation-1'))
 on conflict(id) do update set score=excluded.score,score_components=excluded.score_components,reasons=excluded.reasons,warnings=excluded.warnings,context_snapshot=excluded.context_snapshot,expires_at=excluded.expires_at,status=excluded.status,candidate_source=excluded.candidate_source,constraints=excluded.constraints,group_match=excluded.group_match,rule_version=excluded.rule_version,engine_version='3.7.0',updated_at=now();
 return v_id;
end $$;


ALTER FUNCTION "public"."luvia_store_recommendation"("p_item" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_sync_profile_preference_compatibility"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  new.dietary_preferences := coalesce(new.dietary_preferences, '{}'::text[]);
  new.travel_interests := coalesce(new.travel_interests, '{}'::text[]);
  new.travel_styles := coalesce(new.travel_styles, '{}'::text[]);
  new.activity_preferences := coalesce(new.activity_preferences, '{}'::text[]);
  new.entertainment_preferences := coalesce(new.entertainment_preferences, '{}'::text[]);
  new.dining_preferences := coalesce(new.dining_preferences, '{}'::text[]);
  new.mobility_preferences := coalesce(new.mobility_preferences, '{}'::text[]);
  new.atmosphere_preferences := coalesce(new.atmosphere_preferences, '{}'::text[]);
  new.family_preferences := public.luvia_jsonb_object(new.family_preferences);
  new.accessibility_preferences := public.luvia_jsonb_object(new.accessibility_preferences);
  new.preference_schema_version := greatest(coalesce(new.preference_schema_version,3),3);
  new.travel_pace := case when new.travel_pace in ('relaxed','balanced','active') then new.travel_pace else 'balanced' end;
  new.budget_preference := case when new.budget_preference in ('low','medium','premium') then new.budget_preference else 'medium' end;
  if tg_op = 'INSERT' then
    new.preferences_updated_at := coalesce(new.preferences_updated_at, now());
  elsif row(
    new.dietary_preferences,new.travel_interests,new.travel_styles,new.activity_preferences,
    new.entertainment_preferences,new.dining_preferences,new.mobility_preferences,new.atmosphere_preferences,
    new.travel_pace,new.budget_preference,new.family_preferences,new.accessibility_preferences,new.preferences_completed_at
  ) is distinct from row(
    old.dietary_preferences,old.travel_interests,old.travel_styles,old.activity_preferences,
    old.entertainment_preferences,old.dining_preferences,old.mobility_preferences,old.atmosphere_preferences,
    old.travel_pace,old.budget_preference,old.family_preferences,old.accessibility_preferences,old.preferences_completed_at
  ) then
    new.preferences_updated_at := now();
  end if;
  new.updated_at := now();
  new.travel_preferences := public.luvia_jsonb_object(new.travel_preferences) || jsonb_build_object(
    'pace', new.travel_pace,
    'budget', new.budget_preference,
    'interests', to_jsonb(new.travel_interests),
    'travelStyles', to_jsonb(new.travel_styles),
    'activityPreferences', to_jsonb(new.activity_preferences),
    'entertainmentPreferences', to_jsonb(new.entertainment_preferences),
    'diningPreferences', to_jsonb(new.dining_preferences),
    'mobilityPreferences', to_jsonb(new.mobility_preferences),
    'atmospherePreferences', to_jsonb(new.atmosphere_preferences),
    'accessibilityNeeds', coalesce(new.accessibility_preferences->'needs','[]'::jsonb),
    'familyPreferences', new.family_preferences,
    'accessibilityPreferences', new.accessibility_preferences,
    'onboardingCompletedAt', to_jsonb(new.preferences_completed_at),
    'preferencesUpdatedAt', to_jsonb(new.preferences_updated_at),
    'preferenceVersion', new.preference_schema_version
  );
  return new;
end;
$$;


ALTER FUNCTION "public"."luvia_sync_profile_preference_compatibility"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_touch_ai_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."luvia_touch_ai_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_touch_schedule_event"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at := now();
  new.revision := coalesce(old.revision,0)+1;
  return new;
end;$$;


ALTER FUNCTION "public"."luvia_touch_schedule_event"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_update_place_lifecycle"("p_trip_id" "uuid", "p_trip_place_id" "uuid", "p_status" "text", "p_patch" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$begin if not public.luvia_is_trip_member(p_trip_id) then raise exception 'NOT_AUTHORIZED';end if;update public.trip_places set status=p_status,is_favorite=coalesce((p_patch->>'isFavorite')::boolean,is_favorite),planned_date=case when p_patch?'plannedDate' then nullif(p_patch->>'plannedDate','')::date else planned_date end,planned_time=case when p_patch?'plannedTime' then nullif(p_patch->>'plannedTime','')::time else planned_time end,user_notes=coalesce(p_patch->>'userNotes',user_notes),updated_at=now() where id=p_trip_place_id and trip_id=p_trip_id;return(select jsonb_build_object('place',to_jsonb(p),'tripPlace',to_jsonb(tp)) from public.trip_places tp join public.places p on p.id=tp.place_id where tp.id=p_trip_place_id);end$$;


ALTER FUNCTION "public"."luvia_update_place_lifecycle"("p_trip_id" "uuid", "p_trip_place_id" "uuid", "p_status" "text", "p_patch" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_update_restaurant_lifecycle"("p_trip_id" "uuid", "p_trip_place_id" "uuid", "p_status" "text", "p_patch" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
    reservation_status=case
      when p_patch ? 'reservationStatus' and nullif(p_patch->>'reservationStatus','') in ('idea','requested','reserved','confirmed','cancelled','visited') then nullif(p_patch->>'reservationStatus','')
      when p_status='reserved' then 'confirmed'
      else reservation_status
    end,
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


ALTER FUNCTION "public"."luvia_update_restaurant_lifecycle"("p_trip_id" "uuid", "p_trip_place_id" "uuid", "p_status" "text", "p_patch" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_update_trip_details"("p_trip_id" "uuid", "p_trip_name" "text", "p_destination_context" "jsonb", "p_symbol" "text", "p_accent" "text", "p_start_date" "date", "p_end_date" "date") RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
 select public.luvia_save_trip_profile(p_trip_id,p_trip_name,p_destination_context,p_symbol,p_accent,p_start_date,p_end_date);
$$;


ALTER FUNCTION "public"."luvia_update_trip_details"("p_trip_id" "uuid", "p_trip_name" "text", "p_destination_context" "jsonb", "p_symbol" "text", "p_accent" "text", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_upsert_accommodation"("p_trip_id" "uuid", "p_trip_place_id" "uuid", "p_status" "text", "p_accommodation" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 if not public.luvia_is_trip_member(p_trip_id) then raise exception 'NOT_AUTHORIZED'; end if;
 update public.trip_places set status=coalesce(nullif(p_status,''),status),user_notes=coalesce(p_accommodation->>'notes',user_notes),updated_at=now() where id=p_trip_place_id and trip_id=p_trip_id;
 if not found then raise exception 'TRIP_PLACE_NOT_FOUND'; end if;
 if coalesce((p_accommodation->>'isTripBase')::boolean,false) then update public.accommodations a set is_trip_base=false,updated_at=now() from public.trip_places tp where a.trip_place_id=tp.id and tp.trip_id=p_trip_id and a.trip_place_id<>p_trip_place_id; end if;
 insert into public.accommodations(trip_place_id,accommodation_type,check_in_at,check_out_at,guest_count,room_count,is_trip_base,booking_status,booking_number,booking_provider,booking_date,total_price,currency,cancellation_deadline,payment_status,booking_contact,document_reference,notes,amenities,parking,breakfast,family_friendly,accessibility,pets,room_notes,metadata,updated_at)
 values(p_trip_place_id,coalesce(nullif(p_accommodation->>'accommodationType',''),'other'),nullif(p_accommodation->>'checkInAt','')::timestamptz,nullif(p_accommodation->>'checkOutAt','')::timestamptz,coalesce((p_accommodation->>'guestCount')::int,1),coalesce((p_accommodation->>'roomCount')::int,1),coalesce((p_accommodation->>'isTripBase')::boolean,false),nullif(p_accommodation->>'bookingStatus',''),nullif(p_accommodation->>'bookingNumber',''),nullif(p_accommodation->>'bookingProvider',''),nullif(p_accommodation->>'bookingDate','')::date,nullif(p_accommodation->>'totalPrice','')::numeric,coalesce(nullif(p_accommodation->>'currency',''),'EUR'),nullif(p_accommodation->>'cancellationDeadline','')::timestamptz,nullif(p_accommodation->>'paymentStatus',''),coalesce(p_accommodation->'bookingContact','{}'),nullif(p_accommodation->>'documentReference',''),nullif(p_accommodation->>'notes',''),coalesce(p_accommodation->'amenities','{}'),coalesce(p_accommodation->'parking','{}'),coalesce(p_accommodation->'breakfast','{}'),(p_accommodation->>'familyFriendly')::boolean,coalesce(p_accommodation->'accessibility','{}'),coalesce(p_accommodation->'pets','{}'),nullif(p_accommodation->>'roomNotes',''),coalesce(p_accommodation->'metadata','{}'),now())
 on conflict(trip_place_id) do update set accommodation_type=excluded.accommodation_type,check_in_at=excluded.check_in_at,check_out_at=excluded.check_out_at,guest_count=excluded.guest_count,room_count=excluded.room_count,is_trip_base=excluded.is_trip_base,booking_status=excluded.booking_status,booking_number=excluded.booking_number,booking_provider=excluded.booking_provider,booking_date=excluded.booking_date,total_price=excluded.total_price,currency=excluded.currency,cancellation_deadline=excluded.cancellation_deadline,payment_status=excluded.payment_status,booking_contact=excluded.booking_contact,document_reference=excluded.document_reference,notes=excluded.notes,amenities=excluded.amenities,parking=excluded.parking,breakfast=excluded.breakfast,family_friendly=excluded.family_friendly,accessibility=excluded.accessibility,pets=excluded.pets,room_notes=excluded.room_notes,metadata=public.accommodations.metadata||excluded.metadata,updated_at=now();
 return(select jsonb_build_object('place',to_jsonb(p),'tripPlace',to_jsonb(tp),'extension',to_jsonb(a)) from public.trip_places tp join public.places p on p.id=tp.place_id join public.accommodations a on a.trip_place_id=tp.id where tp.id=p_trip_place_id);
end$$;


ALTER FUNCTION "public"."luvia_upsert_accommodation"("p_trip_id" "uuid", "p_trip_place_id" "uuid", "p_status" "text", "p_accommodation" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_upsert_my_profile"("p_display_name" "text" DEFAULT NULL::"text", "p_first_name" "text" DEFAULT NULL::"text", "p_last_name" "text" DEFAULT NULL::"text", "p_avatar_url" "text" DEFAULT NULL::"text", "p_avatar_color" "text" DEFAULT '#ee6f83'::"text", "p_language" "text" DEFAULT 'de'::"text", "p_timezone" "text" DEFAULT NULL::"text", "p_home_location" "text" DEFAULT NULL::"text", "p_dietary_preferences" "jsonb" DEFAULT '[]'::"jsonb", "p_travel_preferences" "jsonb" DEFAULT '{}'::"jsonb", "p_theme_mode" "text" DEFAULT 'system'::"text", "p_active_trip_id" "uuid" DEFAULT NULL::"uuid", "p_settings" "jsonb" DEFAULT '{}'::"jsonb") RETURNS SETOF "public"."user_profiles"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  return query select * from public.luvia_upsert_my_profile_v2(
    p_display_name,p_first_name,p_last_name,p_avatar_url,p_avatar_color,p_language,p_timezone,p_home_location,
    public.luvia_jsonb_text_array(p_dietary_preferences),
    public.luvia_jsonb_text_array(p_travel_preferences->'interests'),
    public.luvia_jsonb_text_array(coalesce(p_travel_preferences->'travelStyles',p_travel_preferences->'travel_styles')),
    public.luvia_jsonb_text_array(coalesce(p_travel_preferences->'activityPreferences',p_travel_preferences->'activity_preferences')),
    public.luvia_jsonb_text_array(coalesce(p_travel_preferences->'entertainmentPreferences',p_travel_preferences->'entertainment_preferences')),
    public.luvia_jsonb_text_array(coalesce(p_travel_preferences->'diningPreferences',p_travel_preferences->'dining_preferences')),
    public.luvia_jsonb_text_array(coalesce(p_travel_preferences->'mobilityPreferences',p_travel_preferences->'mobility_preferences')),
    public.luvia_jsonb_text_array(coalesce(p_travel_preferences->'atmospherePreferences',p_travel_preferences->'atmosphere_preferences')),
    coalesce(p_travel_preferences->>'pace','balanced'),coalesce(p_travel_preferences->>'budget','medium'),
    public.luvia_jsonb_object(coalesce(p_travel_preferences->'familyPreferences',p_travel_preferences->'family_preferences')),
    public.luvia_jsonb_object(coalesce(p_travel_preferences->'accessibilityPreferences',p_travel_preferences->'accessibility_preferences',jsonb_build_object('needs',coalesce(p_travel_preferences->'accessibilityNeeds','[]'::jsonb)))),
    greatest(public.luvia_safe_integer(p_travel_preferences->>'preferenceVersion',3),3),
    public.luvia_safe_timestamptz(coalesce(p_travel_preferences->>'onboardingCompletedAt',p_travel_preferences->>'onboarding_completed_at')),
    now(),p_travel_preferences,p_theme_mode,p_active_trip_id,p_settings
  );
end;
$$;


ALTER FUNCTION "public"."luvia_upsert_my_profile"("p_display_name" "text", "p_first_name" "text", "p_last_name" "text", "p_avatar_url" "text", "p_avatar_color" "text", "p_language" "text", "p_timezone" "text", "p_home_location" "text", "p_dietary_preferences" "jsonb", "p_travel_preferences" "jsonb", "p_theme_mode" "text", "p_active_trip_id" "uuid", "p_settings" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_upsert_my_profile_v2"("p_display_name" "text" DEFAULT NULL::"text", "p_first_name" "text" DEFAULT NULL::"text", "p_last_name" "text" DEFAULT NULL::"text", "p_avatar_url" "text" DEFAULT NULL::"text", "p_avatar_color" "text" DEFAULT '#ee6f83'::"text", "p_language" "text" DEFAULT 'de'::"text", "p_timezone" "text" DEFAULT NULL::"text", "p_home_location" "text" DEFAULT NULL::"text", "p_dietary_preferences" "text"[] DEFAULT '{}'::"text"[], "p_travel_interests" "text"[] DEFAULT '{}'::"text"[], "p_travel_styles" "text"[] DEFAULT '{}'::"text"[], "p_activity_preferences" "text"[] DEFAULT '{}'::"text"[], "p_entertainment_preferences" "text"[] DEFAULT '{}'::"text"[], "p_dining_preferences" "text"[] DEFAULT '{}'::"text"[], "p_mobility_preferences" "text"[] DEFAULT '{}'::"text"[], "p_atmosphere_preferences" "text"[] DEFAULT '{}'::"text"[], "p_travel_pace" "text" DEFAULT 'balanced'::"text", "p_budget_preference" "text" DEFAULT 'medium'::"text", "p_family_preferences" "jsonb" DEFAULT '{}'::"jsonb", "p_accessibility_preferences" "jsonb" DEFAULT '{}'::"jsonb", "p_preference_schema_version" integer DEFAULT 3, "p_preferences_completed_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_preferences_updated_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_legacy_travel_preferences" "jsonb" DEFAULT '{}'::"jsonb", "p_theme_mode" "text" DEFAULT 'system'::"text", "p_active_trip_id" "uuid" DEFAULT NULL::"uuid", "p_settings" "jsonb" DEFAULT '{}'::"jsonb") RETURNS SETOF "public"."user_profiles"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  insert into public.user_profiles(
    user_id,display_name,first_name,last_name,avatar_url,avatar_color,language,timezone,home_location,
    dietary_preferences,travel_interests,travel_styles,activity_preferences,entertainment_preferences,
    dining_preferences,mobility_preferences,atmosphere_preferences,travel_pace,budget_preference,
    family_preferences,accessibility_preferences,preference_schema_version,preferences_completed_at,
    preferences_updated_at,travel_preferences,theme_mode,active_trip_id,settings,updated_at
  ) values (
    uid,nullif(btrim(p_display_name),''),nullif(btrim(p_first_name),''),nullif(btrim(p_last_name),''),nullif(btrim(p_avatar_url),''),
    coalesce(nullif(p_avatar_color,''),'#ee6f83'),coalesce(nullif(p_language,''),'de'),nullif(btrim(p_timezone),''),nullif(btrim(p_home_location),''),
    coalesce(p_dietary_preferences,'{}'::text[]),coalesce(p_travel_interests,'{}'::text[]),coalesce(p_travel_styles,'{}'::text[]),
    coalesce(p_activity_preferences,'{}'::text[]),coalesce(p_entertainment_preferences,'{}'::text[]),coalesce(p_dining_preferences,'{}'::text[]),
    coalesce(p_mobility_preferences,'{}'::text[]),coalesce(p_atmosphere_preferences,'{}'::text[]),
    case when p_travel_pace in ('relaxed','balanced','active') then p_travel_pace else 'balanced' end,
    case when p_budget_preference in ('low','medium','premium') then p_budget_preference else 'medium' end,
    public.luvia_jsonb_object(p_family_preferences),public.luvia_jsonb_object(p_accessibility_preferences),greatest(coalesce(p_preference_schema_version,3),3),
    p_preferences_completed_at,coalesce(p_preferences_updated_at,now()),public.luvia_jsonb_object(p_legacy_travel_preferences),
    case when p_theme_mode in ('light','dark','system') then p_theme_mode else 'system' end,p_active_trip_id,public.luvia_jsonb_object(p_settings),now()
  )
  on conflict(user_id) do update set
    display_name=excluded.display_name,first_name=excluded.first_name,last_name=excluded.last_name,avatar_url=excluded.avatar_url,
    avatar_color=excluded.avatar_color,language=excluded.language,timezone=excluded.timezone,home_location=excluded.home_location,
    dietary_preferences=excluded.dietary_preferences,travel_interests=excluded.travel_interests,travel_styles=excluded.travel_styles,
    activity_preferences=excluded.activity_preferences,entertainment_preferences=excluded.entertainment_preferences,dining_preferences=excluded.dining_preferences,
    mobility_preferences=excluded.mobility_preferences,atmosphere_preferences=excluded.atmosphere_preferences,travel_pace=excluded.travel_pace,
    budget_preference=excluded.budget_preference,family_preferences=excluded.family_preferences,accessibility_preferences=excluded.accessibility_preferences,
    preference_schema_version=excluded.preference_schema_version,preferences_completed_at=excluded.preferences_completed_at,
    preferences_updated_at=excluded.preferences_updated_at,travel_preferences=excluded.travel_preferences,theme_mode=excluded.theme_mode,
    active_trip_id=excluded.active_trip_id,settings=excluded.settings,updated_at=now();
  return query select * from public.user_profiles where user_id = uid;
end;
$$;


ALTER FUNCTION "public"."luvia_upsert_my_profile_v2"("p_display_name" "text", "p_first_name" "text", "p_last_name" "text", "p_avatar_url" "text", "p_avatar_color" "text", "p_language" "text", "p_timezone" "text", "p_home_location" "text", "p_dietary_preferences" "text"[], "p_travel_interests" "text"[], "p_travel_styles" "text"[], "p_activity_preferences" "text"[], "p_entertainment_preferences" "text"[], "p_dining_preferences" "text"[], "p_mobility_preferences" "text"[], "p_atmosphere_preferences" "text"[], "p_travel_pace" "text", "p_budget_preference" "text", "p_family_preferences" "jsonb", "p_accessibility_preferences" "jsonb", "p_preference_schema_version" integer, "p_preferences_completed_at" timestamp with time zone, "p_preferences_updated_at" timestamp with time zone, "p_legacy_travel_preferences" "jsonb", "p_theme_mode" "text", "p_active_trip_id" "uuid", "p_settings" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_upsert_schedule_event"("p_trip_id" "uuid", "p_event" "jsonb") RETURNS "public"."trip_schedule_events"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare v_user uuid:=auth.uid(); v_result public.trip_schedule_events; v_source_key text;
begin
  if v_user is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  if not public.luvia_is_trip_member(p_trip_id,v_user) then raise exception using errcode='42501',message='NOT_AUTHORIZED'; end if;
  v_source_key:=coalesce(nullif(p_event->>'sourceKey',''),nullif(p_event->>'tripPlaceId',''),nullif(p_event->>'placeId',''),nullif(p_event->>'providerPlaceId',''));
  if v_source_key is null then raise exception using errcode='22023',message='SCHEDULE_SOURCE_KEY_REQUIRED'; end if;
  insert into public.trip_schedule_events(trip_id,user_id,source_key,entity_type,place_id,trip_place_id,provider_place_id,title,event_date,start_time,end_time,duration_minutes,lifecycle_status,metadata)
  values(p_trip_id,v_user,v_source_key,coalesce(nullif(p_event->>'entityType',''),'place'),case when coalesce(p_event->>'placeId','') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then (p_event->>'placeId')::uuid else null end,case when coalesce(p_event->>'tripPlaceId','') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then (p_event->>'tripPlaceId')::uuid else null end,nullif(p_event->>'providerPlaceId',''),coalesce(nullif(p_event->>'title',''),'Ort'),(p_event->>'date')::date,(p_event->>'time')::time,nullif(p_event->>'endTime','')::time,coalesce(nullif(p_event->>'durationMinutes','')::integer,60),coalesce(nullif(p_event->>'lifecycleStatus',''),'planned'),coalesce(p_event->'metadata','{}'::jsonb))
  on conflict(trip_id,source_key) do update set entity_type=excluded.entity_type,place_id=coalesce(excluded.place_id,public.trip_schedule_events.place_id),trip_place_id=coalesce(excluded.trip_place_id,public.trip_schedule_events.trip_place_id),provider_place_id=coalesce(excluded.provider_place_id,public.trip_schedule_events.provider_place_id),title=excluded.title,event_date=excluded.event_date,start_time=excluded.start_time,end_time=excluded.end_time,duration_minutes=excluded.duration_minutes,lifecycle_status=excluded.lifecycle_status,metadata=public.trip_schedule_events.metadata||excluded.metadata,updated_at=now()
  returning * into v_result;
  return v_result;
end;$_$;


ALTER FUNCTION "public"."luvia_upsert_schedule_event"("p_trip_id" "uuid", "p_event" "jsonb") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trip_place_data" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "trip_place_id" "uuid" NOT NULL,
    "place_id" "uuid",
    "place_type" "text" NOT NULL,
    "fields" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."trip_place_data" OWNER TO "postgres";


COMMENT ON TABLE "public"."trip_place_data" IS 'Authoritative trip-specific field store for every Place type. UI, timeline and modules read the same cloud rows.';



COMMENT ON COLUMN "public"."trip_place_data"."fields" IS 'Single source for all user-entered Place fields, including every Place date and time field.';



CREATE OR REPLACE FUNCTION "public"."luvia_upsert_trip_place_fields"("p_trip_id" "uuid", "p_trip_place_id" "uuid", "p_place_id" "uuid", "p_place_type" "text", "p_fields" "jsonb") RETURNS "public"."trip_place_data"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."luvia_upsert_trip_place_fields"("p_trip_id" "uuid", "p_trip_place_id" "uuid", "p_place_id" "uuid", "p_place_type" "text", "p_fields" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."luvia_verify_place_backend"("p_trip_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."luvia_verify_place_backend"("p_trip_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."paris_add_member_activity"("p_trip_id" "uuid", "p_member_name" "text", "p_activity_key" "text", "p_activity_text" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not public.paris_is_trip_member(p_trip_id) then raise exception 'Kein Zugriff auf diese Reise.'; end if;
  insert into public.paris_member_activity_feed(trip_id,user_id,member_name,activity_key,activity_text)
  values(p_trip_id,auth.uid(),left(trim(p_member_name),60),left(p_activity_key,40),left(p_activity_text,180));
  delete from public.paris_member_activity_feed where trip_id=p_trip_id and created_at < now()-interval '24 hours';
  return jsonb_build_object('saved',true);
end;$$;


ALTER FUNCTION "public"."paris_add_member_activity"("p_trip_id" "uuid", "p_member_name" "text", "p_activity_key" "text", "p_activity_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."paris_claim_unowned_trip"("p_trip_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  v_uid uuid := auth.uid();
  v_members integer := 0;
  v_has_role boolean := false;
  v_column text;
begin
  if v_uid is null or p_trip_id is null then return false; end if;
  if public.paris_is_trip_owner(p_trip_id) then return true; end if;

  if not exists (
    select 1 from public.trip_members tm
    where nullif(to_jsonb(tm)->>'trip_id','')::uuid=p_trip_id
      and nullif(to_jsonb(tm)->>'user_id','')::uuid=v_uid
  ) then return false; end if;

  select count(*) into v_members from public.trip_members tm
  where nullif(to_jsonb(tm)->>'trip_id','')::uuid=p_trip_id;
  if v_members<>1 then return false; end if;

  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='trip_members' and column_name='role'
  ) into v_has_role;
  if v_has_role then
    execute $q$update public.trip_members tm set role=$1
      where nullif(to_jsonb(tm)->>'trip_id','')::uuid=$2
        and nullif(to_jsonb(tm)->>'user_id','')::uuid=$3$q$
      using 'owner',p_trip_id,v_uid;
  end if;

  foreach v_column in array array['owner_id','created_by','user_id'] loop
    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='trips' and column_name=v_column
    ) then
      execute format('update public.trips set %I=coalesce(%I,$1) where id=$2',v_column,v_column)
        using v_uid,p_trip_id;
    end if;
  end loop;

  -- Sole-member ownership remains valid even when the legacy tables expose
  -- neither a role column nor a dedicated owner column.
  return public.paris_is_trip_owner(p_trip_id);
end;
$_$;


ALTER FUNCTION "public"."paris_claim_unowned_trip"("p_trip_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."paris_delete_empty_trip"("p_trip_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
declare
  v_total bigint := 0;
  v_table text;
  v_count bigint;
begin
  if not public.paris_is_trip_owner(p_trip_id) then
    raise exception 'Nur der Reisebesitzer darf diese Reise löschen.';
  end if;

  foreach v_table in array array[
    'gallery_photos','live_moments','budget_entries','day_closures','day_notes',
    'favorites','reminders','reminder_completions','phrase_favorites','custom_phrases'
  ] loop
    if to_regclass('public.' || v_table) is not null then
      execute format('select count(*) from public.%I where trip_id = $1', v_table)
        into v_count using p_trip_id;
      v_total := v_total + coalesce(v_count,0);
    end if;
  end loop;

  if v_total > 0 then
    raise exception 'Diese Reise enthält noch % Einträge und wurde aus Sicherheitsgründen nicht gelöscht.', v_total;
  end if;

  delete from public.trip_settings where trip_id = p_trip_id;
  delete from public.trip_members tm where (to_jsonb(tm)->>'trip_id')::uuid = p_trip_id;
  delete from public.trips where id = p_trip_id;
  return jsonb_build_object('deleted', true, 'trip_id', p_trip_id);
end;
$_$;


ALTER FUNCTION "public"."paris_delete_empty_trip"("p_trip_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."paris_delete_trip"("p_trip_id" "uuid", "p_confirmation" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'storage'
    AS $_$
declare
  v_table text;
  v_tables text[] := array[
    'restaurant_visits','trip_place_details','trip_places','restaurant_entries',
    'reminder_completions','custom_reminders','reminder_status','reminders',
    'phrase_favorites','custom_phrases','favorites','day_notes','daily_member_stats',
    'day_closures','budget_entries','budget_settings','live_moment_status','live_moments',
    'gallery_photos','paris_member_activity_feed','paris_member_locations',
    'paris_member_presence','paris_member_profiles','trip_preferences','trip_settings'
  ];
begin
  if p_confirmation is distinct from 'LÖSCHEN' then raise exception 'Bestätigung fehlt.'; end if;
  if not public.paris_is_trip_owner(p_trip_id) then
    raise exception 'Nur der Reisebesitzer darf diese Reise endgültig löschen.';
  end if;

  foreach v_table in array v_tables loop
    if to_regclass('public.' || v_table) is not null then
      begin
        execute format('delete from public.%I where trip_id = $1', v_table) using p_trip_id;
      exception when undefined_column then null;
      end;
    end if;
  end loop;

  if to_regclass('storage.objects') is not null then
    delete from storage.objects where bucket_id='paris-gallery' and name like p_trip_id::text || '/%';
  end if;
  if to_regclass('public.trip_members') is not null then
    delete from public.trip_members tm where nullif(to_jsonb(tm)->>'trip_id','')::uuid=p_trip_id;
  end if;
  delete from public.trips where id=p_trip_id;
  return jsonb_build_object('deleted',true,'trip_id',p_trip_id);
end;
$_$;


ALTER FUNCTION "public"."paris_delete_trip"("p_trip_id" "uuid", "p_confirmation" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."paris_is_trip_member"("p_trip_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public.trip_members tm
    where (to_jsonb(tm)->>'trip_id')::uuid=p_trip_id
      and (to_jsonb(tm)->>'user_id')::uuid=auth.uid()
  );
$$;


ALTER FUNCTION "public"."paris_is_trip_member"("p_trip_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."paris_is_trip_owner"("p_trip_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_uid uuid := auth.uid();
  v_result boolean := false;
  v_member boolean := false;
  v_member_count integer := 0;
begin
  if v_uid is null or p_trip_id is null then return false; end if;

  if to_regclass('public.trips') is not null then
    select exists (
      select 1 from public.trips t
      where t.id=p_trip_id and (
        nullif(to_jsonb(t)->>'owner_id','')::uuid=v_uid or
        nullif(to_jsonb(t)->>'created_by','')::uuid=v_uid or
        nullif(to_jsonb(t)->>'user_id','')::uuid=v_uid
      )
    ) into v_result;
    if v_result then return true; end if;
  end if;

  if to_regclass('public.trip_members') is not null then
    select exists (
      select 1 from public.trip_members tm
      where nullif(to_jsonb(tm)->>'trip_id','')::uuid=p_trip_id
        and nullif(to_jsonb(tm)->>'user_id','')::uuid=v_uid
    ) into v_member;
    if not v_member then return false; end if;

    select exists (
      select 1 from public.trip_members tm
      where nullif(to_jsonb(tm)->>'trip_id','')::uuid=p_trip_id
        and nullif(to_jsonb(tm)->>'user_id','')::uuid=v_uid
        and lower(coalesce(nullif(to_jsonb(tm)->>'role',''),'member')) in ('owner','admin','creator')
    ) into v_result;
    if v_result then return true; end if;

    select count(*) into v_member_count
    from public.trip_members tm
    where nullif(to_jsonb(tm)->>'trip_id','')::uuid=p_trip_id;

    -- In installations without a role column, the only member is necessarily
    -- the creator/owner. This also repairs legacy create_trip_with_code schemas.
    if v_member_count=1 then return true; end if;
  end if;

  return false;
end;
$$;


ALTER FUNCTION "public"."paris_is_trip_owner"("p_trip_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."paris_leave_trip"("p_trip_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if public.paris_is_trip_owner(p_trip_id) then
    raise exception 'Der Reisebesitzer kann die Reise nicht verlassen. Übertrage zuerst die Besitzerrolle oder lösche die Reise.';
  end if;
  delete from public.trip_members tm
  where (to_jsonb(tm)->>'trip_id')::uuid = p_trip_id
    and (to_jsonb(tm)->>'user_id')::uuid = auth.uid();
  return jsonb_build_object('left', true, 'trip_id', p_trip_id);
end;
$$;


ALTER FUNCTION "public"."paris_leave_trip"("p_trip_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."paris_list_activity_events"("p_trip_id" "uuid", "p_limit" integer DEFAULT 100) RETURNS TABLE("id" bigint, "user_id" "uuid", "member_name" "text", "activity_key" "text", "activity_text" "text", "event_type" "text", "category" "text", "icon" "text", "metadata" "jsonb", "aggregate_key" "text", "event_count" integer, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
 select a.id,a.user_id,a.member_name,a.activity_key,a.activity_text,a.event_type,a.category,a.icon,a.metadata,a.aggregate_key,a.event_count,a.created_at,a.updated_at
 from public.paris_member_activity_feed a
 where a.trip_id=p_trip_id and public.paris_is_trip_member(p_trip_id) and a.updated_at>now()-interval '24 hours'
 order by a.updated_at desc limit greatest(1,least(coalesce(p_limit,100),250));
$$;


ALTER FUNCTION "public"."paris_list_activity_events"("p_trip_id" "uuid", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."paris_list_member_activity"("p_trip_id" "uuid", "p_limit" integer DEFAULT 30) RETURNS TABLE("id" bigint, "user_id" "uuid", "member_name" "text", "activity_key" "text", "activity_text" "text", "created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
 select a.id,a.user_id,a.member_name,a.activity_key,a.activity_text,a.created_at from public.paris_member_activity_feed a
 where a.trip_id=p_trip_id and public.paris_is_trip_member(p_trip_id) and a.created_at>now()-interval '24 hours'
 order by a.created_at desc limit greatest(1,least(coalesce(p_limit,30),100));
$$;


ALTER FUNCTION "public"."paris_list_member_activity"("p_trip_id" "uuid", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."paris_list_my_trips"() RETURNS TABLE("trip_id" "uuid", "trip_name" "text", "join_code" "text", "member_name" "text", "member_role" "text", "created_at" timestamp with time zone, "member_count" bigint, "photos" bigint, "moments" bigint, "expenses" bigint, "closures" bigint, "notes" bigint, "total_content" bigint, "is_owner" boolean, "destination_context" "jsonb", "destination_name" "text", "destination_country" "text", "destination_country_code" "text", "destination_place_id" "text", "destination_formatted_address" "text", "destination_latitude" double precision, "destination_longitude" double precision, "symbol" "text", "accent" "text", "start_date" "date", "end_date" "date")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."paris_list_my_trips"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."paris_list_participants"("p_trip_id" "uuid") RETURNS TABLE("user_id" "uuid", "member_name" "text", "member_role" "text", "avatar_data" "text", "avatar_color" "text", "location_sharing" boolean, "device_type" "text", "platform" "text", "last_seen_at" timestamp with time zone, "last_sync_at" timestamp with time zone, "activity_key" "text", "activity_text" "text", "activity_at" timestamp with time zone, "latitude" double precision, "longitude" double precision, "accuracy" double precision, "heading" double precision, "speed" double precision, "place_label" "text", "location_updated_at" timestamp with time zone, "photos" bigint, "moments" bigint, "steps_today" bigint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
 if not public.paris_is_trip_member(p_trip_id) then raise exception 'Kein Zugriff auf diese Reise.'; end if;
 return query
 with members as (
   select (to_jsonb(tm)->>'user_id')::uuid uid,
     coalesce(nullif(to_jsonb(tm)->>'display_name',''),nullif(to_jsonb(tm)->>'member_name',''),nullif(to_jsonb(tm)->>'name',''),'Mitreisend') nm,
     lower(coalesce(nullif(to_jsonb(tm)->>'role',''),'member')) rl
   from public.trip_members tm where (to_jsonb(tm)->>'trip_id')::uuid=p_trip_id
 ), latest_presence as (
   select distinct on (x.user_id) x.* from public.paris_member_presence x where x.trip_id=p_trip_id order by x.user_id,x.last_seen_at desc
 )
 select m.uid,coalesce(mp.member_name,m.nm),m.rl,mp.avatar_data,coalesce(mp.avatar_color,'#e76f91'),coalesce(mp.location_sharing,false),
   pr.device_type,pr.platform,pr.last_seen_at,pr.last_sync_at,pr.activity_key,pr.activity_text,pr.activity_at,
   case when coalesce(mp.location_sharing,false) then ml.latitude end,
   case when coalesce(mp.location_sharing,false) then ml.longitude end,
   case when coalesce(mp.location_sharing,false) then ml.accuracy end,
   case when coalesce(mp.location_sharing,false) then ml.heading end,
   case when coalesce(mp.location_sharing,false) then ml.speed end,
   case when coalesce(mp.location_sharing,false) then ml.place_label end,
   case when coalesce(mp.location_sharing,false) then ml.updated_at end,
   (select count(*) from public.gallery_photos g where g.trip_id=p_trip_id and g.created_by=m.uid),
   (select count(*) from public.live_moments lm where lm.trip_id=p_trip_id and nullif(to_jsonb(lm)->>'created_by','')::uuid=m.uid),
   coalesce((select max((to_jsonb(ds)->>'steps')::bigint) from public.daily_member_stats ds where (to_jsonb(ds)->>'trip_id')::uuid=p_trip_id and coalesce(to_jsonb(ds)->>'member_name','')=coalesce(mp.member_name,m.nm) and coalesce(to_jsonb(ds)->>'trip_day','')=to_char(current_date,'YYYY-MM-DD')),0)
 from members m left join public.paris_member_profiles mp on mp.trip_id=p_trip_id and mp.user_id=m.uid
 left join latest_presence pr on pr.user_id=m.uid left join public.paris_member_locations ml on ml.trip_id=p_trip_id and ml.user_id=m.uid
 order by case when m.rl in ('owner','admin') then 0 else 1 end,coalesce(mp.member_name,m.nm);
end;$$;


ALTER FUNCTION "public"."paris_list_participants"("p_trip_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."paris_rename_trip"("p_trip_id" "uuid", "p_name" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare v_name text;
begin
  if not public.paris_is_trip_owner(p_trip_id) then
    raise exception 'Nur der Reisebesitzer darf diese Reise umbenennen.';
  end if;
  v_name := left(trim(coalesce(p_name,'')), 80);
  if length(v_name) < 2 then raise exception 'Bitte einen gültigen Reisenamen eingeben.'; end if;
  insert into public.trip_settings(trip_id, trip_name, updated_at, updated_by)
  values (p_trip_id, v_name, now(), auth.uid())
  on conflict (trip_id) do update set trip_name=excluded.trip_name, updated_at=now(), updated_by=auth.uid();
  return v_name;
end;
$$;


ALTER FUNCTION "public"."paris_rename_trip"("p_trip_id" "uuid", "p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."paris_track_event"("p_trip_id" "uuid", "p_member_name" "text", "p_event_type" "text", "p_category" "text", "p_activity_text" "text", "p_icon" "text" DEFAULT NULL::"text", "p_metadata" "jsonb" DEFAULT '{}'::"jsonb", "p_aggregate_key" "text" DEFAULT NULL::"text", "p_aggregate_window_seconds" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare existing_id bigint;
begin
  if not public.paris_is_trip_member(p_trip_id) then raise exception 'Kein Zugriff auf diese Reise.'; end if;
  if p_aggregate_key is not null and coalesce(p_aggregate_window_seconds,0)>0 then
    select id into existing_id from public.paris_member_activity_feed
    where trip_id=p_trip_id and user_id=auth.uid() and aggregate_key=left(p_aggregate_key,120)
      and updated_at > now()-(greatest(1,least(p_aggregate_window_seconds,300))||' seconds')::interval
    order by updated_at desc limit 1 for update;
  end if;
  if existing_id is not null then
    update public.paris_member_activity_feed set
      activity_text=left(p_activity_text,220),event_count=event_count+1,updated_at=now(),
      metadata=coalesce(metadata,'{}'::jsonb)||coalesce(p_metadata,'{}'::jsonb),icon=coalesce(p_icon,icon)
    where id=existing_id;
  else
    insert into public.paris_member_activity_feed(trip_id,user_id,member_name,activity_key,activity_text,event_type,category,icon,metadata,aggregate_key,event_count,created_at,updated_at)
    values(p_trip_id,auth.uid(),left(trim(p_member_name),60),left(coalesce(p_category,'general'),40),left(p_activity_text,220),left(p_event_type,80),left(coalesce(p_category,'general'),40),left(coalesce(p_icon,'•'),12),coalesce(p_metadata,'{}'::jsonb),left(p_aggregate_key,120),1,now(),now());
  end if;
  delete from public.paris_member_activity_feed where trip_id=p_trip_id and updated_at < now()-interval '24 hours';
  return jsonb_build_object('saved',true,'aggregated',existing_id is not null,'id',coalesce(existing_id,currval(pg_get_serial_sequence('public.paris_member_activity_feed','id'))));
end;$$;


ALTER FUNCTION "public"."paris_track_event"("p_trip_id" "uuid", "p_member_name" "text", "p_event_type" "text", "p_category" "text", "p_activity_text" "text", "p_icon" "text", "p_metadata" "jsonb", "p_aggregate_key" "text", "p_aggregate_window_seconds" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."paris_update_member_location"("p_trip_id" "uuid", "p_member_name" "text", "p_latitude" double precision, "p_longitude" double precision, "p_accuracy" double precision DEFAULT NULL::double precision, "p_heading" double precision DEFAULT NULL::double precision, "p_speed" double precision DEFAULT NULL::double precision, "p_place_label" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare sharing boolean;
begin
  if not public.paris_is_trip_member(p_trip_id) then raise exception 'Kein Zugriff auf diese Reise.'; end if;
  select location_sharing into sharing from public.paris_member_profiles where trip_id=p_trip_id and user_id=auth.uid();
  if coalesce(sharing,false)=false then raise exception 'Standortfreigabe ist deaktiviert.'; end if;
  insert into public.paris_member_locations(trip_id,user_id,member_name,latitude,longitude,accuracy,heading,speed,place_label,updated_at)
  values(p_trip_id,auth.uid(),left(trim(p_member_name),60),p_latitude,p_longitude,p_accuracy,p_heading,p_speed,left(coalesce(p_place_label,''),180),now())
  on conflict(trip_id,user_id) do update set member_name=excluded.member_name,latitude=excluded.latitude,longitude=excluded.longitude,
    accuracy=excluded.accuracy,heading=excluded.heading,speed=excluded.speed,place_label=excluded.place_label,updated_at=now();
  return jsonb_build_object('saved',true);
end;$$;


ALTER FUNCTION "public"."paris_update_member_location"("p_trip_id" "uuid", "p_member_name" "text", "p_latitude" double precision, "p_longitude" double precision, "p_accuracy" double precision, "p_heading" double precision, "p_speed" double precision, "p_place_label" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."paris_update_presence"("p_trip_id" "uuid", "p_device_id" "text", "p_member_name" "text", "p_device_type" "text", "p_platform" "text", "p_activity_key" "text" DEFAULT NULL::"text", "p_activity_text" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not public.paris_is_trip_member(p_trip_id) then raise exception 'Kein Zugriff auf diese Reise.'; end if;
  insert into public.paris_member_presence(trip_id,user_id,device_id,member_name,device_type,platform,activity_key,activity_text,activity_at,last_seen_at,last_sync_at)
  values(p_trip_id,auth.uid(),left(p_device_id,100),left(trim(p_member_name),60),left(p_device_type,40),left(coalesce(p_platform,''),100),p_activity_key,p_activity_text,case when p_activity_text is null then null else now() end,now(),now())
  on conflict(trip_id,user_id,device_id) do update set member_name=excluded.member_name,device_type=excluded.device_type,
    platform=excluded.platform,activity_key=coalesce(excluded.activity_key,public.paris_member_presence.activity_key),
    activity_text=coalesce(excluded.activity_text,public.paris_member_presence.activity_text),
    activity_at=case when excluded.activity_text is null then public.paris_member_presence.activity_at else now() end,
    last_seen_at=now(),last_sync_at=now(),is_visible=true;
  return jsonb_build_object('saved',true,'at',now());
end;$$;


ALTER FUNCTION "public"."paris_update_presence"("p_trip_id" "uuid", "p_device_id" "text", "p_member_name" "text", "p_device_type" "text", "p_platform" "text", "p_activity_key" "text", "p_activity_text" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."paris_upsert_member_profile"("p_trip_id" "uuid", "p_member_name" "text", "p_avatar_data" "text" DEFAULT NULL::"text", "p_avatar_color" "text" DEFAULT '#e76f91'::"text", "p_location_sharing" boolean DEFAULT false) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not public.paris_is_trip_member(p_trip_id) then raise exception 'Kein Zugriff auf diese Reise.'; end if;
  insert into public.paris_member_profiles(trip_id,user_id,member_name,avatar_data,avatar_color,location_sharing,updated_at)
  values(p_trip_id,auth.uid(),left(trim(p_member_name),60),p_avatar_data,left(coalesce(p_avatar_color,'#e76f91'),20),p_location_sharing,now())
  on conflict(trip_id,user_id) do update set member_name=excluded.member_name,
    avatar_data=coalesce(excluded.avatar_data,public.paris_member_profiles.avatar_data),
    avatar_color=excluded.avatar_color,location_sharing=excluded.location_sharing,updated_at=now();
  return jsonb_build_object('saved',true);
end;$$;


ALTER FUNCTION "public"."paris_upsert_member_profile"("p_trip_id" "uuid", "p_member_name" "text", "p_avatar_data" "text", "p_avatar_color" "text", "p_location_sharing" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."accommodations" (
    "trip_place_id" "uuid" NOT NULL,
    "accommodation_type" "text" DEFAULT 'other'::"text" NOT NULL,
    "check_in_at" timestamp with time zone,
    "check_out_at" timestamp with time zone,
    "guest_count" integer DEFAULT 1 NOT NULL,
    "room_count" integer DEFAULT 1 NOT NULL,
    "category_stars" numeric,
    "amenities" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "parking" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "breakfast" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "family_friendly" boolean,
    "accessibility" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "pets" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "room_notes" "text",
    "is_trip_base" boolean DEFAULT false NOT NULL,
    "booking_status" "text",
    "booking_number" "text",
    "booking_provider" "text",
    "booking_date" "date",
    "total_price" numeric,
    "currency" "text" DEFAULT 'EUR'::"text",
    "cancellation_deadline" timestamp with time zone,
    "payment_status" "text",
    "booking_contact" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "document_reference" "text",
    "notes" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "accommodations_guest_count_check" CHECK (("guest_count" > 0)),
    CONSTRAINT "accommodations_room_count_check" CHECK (("room_count" > 0))
);


ALTER TABLE "public"."accommodations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_action_proposals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "trip_id" "uuid",
    "capability" "text" NOT NULL,
    "action_type" "text" NOT NULL,
    "action_payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "explanation" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "decided_at" timestamp with time zone,
    "executed_at" timestamp with time zone,
    "error_text" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ai_action_proposals_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'accepted'::"text", 'rejected'::"text", 'executed'::"text", 'failed'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."ai_action_proposals" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_action_proposals" IS 'AI-generated drafts. User confirmation is required before execution through Luvia Core commands.';



CREATE TABLE IF NOT EXISTS "public"."ai_interaction_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "trip_id" "uuid",
    "capability" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "entity_type" "text",
    "entity_id" "text",
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ai_interaction_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "trip_id" "uuid",
    "task_type" "text" NOT NULL,
    "model" "text",
    "input_tokens" integer DEFAULT 0 NOT NULL,
    "output_tokens" integer DEFAULT 0 NOT NULL,
    "estimated_cost" numeric(12,6) DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."ai_usage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_usage_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "capability" "text" NOT NULL,
    "provider" "text" DEFAULT 'openai'::"text" NOT NULL,
    "model" "text" NOT NULL,
    "tier" "text" NOT NULL,
    "request_id" "text",
    "input_tokens" integer DEFAULT 0 NOT NULL,
    "output_tokens" integer DEFAULT 0 NOT NULL,
    "total_tokens" integer DEFAULT 0 NOT NULL,
    "cached_tokens" integer DEFAULT 0 NOT NULL,
    "latency_ms" integer DEFAULT 0 NOT NULL,
    "success" boolean DEFAULT true NOT NULL,
    "error_code" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ai_usage_events_cached_tokens_check" CHECK (("cached_tokens" >= 0)),
    CONSTRAINT "ai_usage_events_input_tokens_check" CHECK (("input_tokens" >= 0)),
    CONSTRAINT "ai_usage_events_latency_ms_check" CHECK (("latency_ms" >= 0)),
    CONSTRAINT "ai_usage_events_output_tokens_check" CHECK (("output_tokens" >= 0)),
    CONSTRAINT "ai_usage_events_total_tokens_check" CHECK (("total_tokens" >= 0))
);


ALTER TABLE "public"."ai_usage_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."ai_usage_events" IS 'Server-written AI request telemetry without prompts or raw private context.';



CREATE TABLE IF NOT EXISTS "public"."automation_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "pipeline" "text" NOT NULL,
    "status" "text" DEFAULT 'idle'::"text" NOT NULL,
    "input" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "result" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "error" "jsonb",
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "automation_jobs_status_check" CHECK (("status" = ANY (ARRAY['idle'::"text", 'loading'::"text", 'processing'::"text", 'ready'::"text", 'needs_confirmation'::"text", 'partial'::"text", 'failed'::"text", 'offline'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."automation_jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."automation_steps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "step_key" "text" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'idle'::"text" NOT NULL,
    "input" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "result" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "error" "jsonb",
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone
);


ALTER TABLE "public"."automation_steps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."budget_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "created_by" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "title" "text" NOT NULL,
    "category" "text" NOT NULL,
    "amount_cents" integer NOT NULL,
    "currency" "text" DEFAULT 'EUR'::"text" NOT NULL,
    "paid_by" "uuid",
    "notes" "text",
    "expense_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "budget_entries_amount_nonnegative" CHECK (("amount_cents" >= 0)),
    CONSTRAINT "budget_entries_category_not_blank" CHECK (("length"(TRIM(BOTH FROM "category")) > 0)),
    CONSTRAINT "budget_entries_currency_format" CHECK (("currency" ~ '^[A-Z]{3}$'::"text")),
    CONSTRAINT "budget_entries_title_not_blank" CHECK (("length"(TRIM(BOTH FROM "title")) > 0))
);


ALTER TABLE "public"."budget_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."budget_settings" (
    "trip_id" "uuid" NOT NULL,
    "budget_limit_cents" integer DEFAULT 60000 NOT NULL,
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "budget_settings_limit_nonnegative" CHECK (("budget_limit_cents" >= 0))
);


ALTER TABLE "public"."budget_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."co_selection_aggregates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "destination_id" "uuid",
    "entity_type_a" "text" NOT NULL,
    "entity_id_a" "uuid" NOT NULL,
    "entity_type_b" "text" NOT NULL,
    "entity_id_b" "uuid" NOT NULL,
    "traveler_segment" "text" DEFAULT 'all'::"text" NOT NULL,
    "selection_count" integer DEFAULT 0 NOT NULL,
    "sample_size" integer DEFAULT 0 NOT NULL,
    "confidence" numeric(4,3) DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "co_selection_aggregates_confidence_check" CHECK ((("confidence" >= (0)::numeric) AND ("confidence" <= (1)::numeric)))
);


ALTER TABLE "public"."co_selection_aggregates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."custom_phrases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "created_by" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "german_text" "text" NOT NULL,
    "french_text" "text" NOT NULL,
    "pronunciation" "text",
    "category" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "custom_phrases_french_not_blank" CHECK (("length"(TRIM(BOTH FROM "french_text")) > 0)),
    CONSTRAINT "custom_phrases_german_not_blank" CHECK (("length"(TRIM(BOTH FROM "german_text")) > 0))
);


ALTER TABLE "public"."custom_phrases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."custom_reminders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "created_by" "uuid",
    "title" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "custom_reminders_title_check" CHECK ((("char_length"(TRIM(BOTH FROM "title")) >= 1) AND ("char_length"(TRIM(BOTH FROM "title")) <= 120)))
);


ALTER TABLE "public"."custom_reminders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_member_stats" (
    "trip_id" "uuid" NOT NULL,
    "trip_day" "date" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "steps" integer,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "member_name" "text" NOT NULL,
    CONSTRAINT "daily_member_stats_steps_nonnegative" CHECK ((("steps" IS NULL) OR ("steps" >= 0)))
);


ALTER TABLE "public"."daily_member_stats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."day_closures" (
    "trip_id" "uuid" NOT NULL,
    "trip_day" "date" NOT NULL,
    "best_moment" "text",
    "most_magical_moment" "text",
    "lasting_memory" "text",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "shared_note" "text",
    "favorite_photo_id" "text",
    "day_rating" smallint,
    "food_rating" smallint,
    "field_meta" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "day_closures_food_rating_range" CHECK ((("food_rating" IS NULL) OR (("food_rating" >= 1) AND ("food_rating" <= 5)))),
    CONSTRAINT "day_closures_rating_range" CHECK ((("day_rating" IS NULL) OR (("day_rating" >= 1) AND ("day_rating" <= 5))))
);


ALTER TABLE "public"."day_closures" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."day_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid",
    "created_by" "uuid" NOT NULL,
    "day" "text",
    "note" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."day_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."derived_user_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "preference_key" "text" NOT NULL,
    "preference_value" "jsonb" NOT NULL,
    "confidence" numeric(4,3) DEFAULT 0.5 NOT NULL,
    "evidence_count" integer DEFAULT 1 NOT NULL,
    "evidence" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "first_detected_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_detected_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "derived_user_preferences_confidence_check" CHECK ((("confidence" >= (0)::numeric) AND ("confidence" <= (1)::numeric))),
    CONSTRAINT "derived_user_preferences_evidence_count_check" CHECK (("evidence_count" >= 0)),
    CONSTRAINT "derived_user_preferences_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'rejected'::"text", 'confirmed'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."derived_user_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."destinations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider" "text" DEFAULT 'manual'::"text" NOT NULL,
    "provider_place_id" "text",
    "name" "text" NOT NULL,
    "display_name" "text",
    "country" "text",
    "country_code" "text",
    "latitude" double precision,
    "longitude" double precision,
    "timezone" "text",
    "currency" "text",
    "language_codes" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "search_radius_meters" integer DEFAULT 30000 NOT NULL,
    "source_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "destinations_search_radius_meters_check" CHECK ((("search_radius_meters" >= 1000) AND ("search_radius_meters" <= 200000)))
);


ALTER TABLE "public"."destinations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."favorites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid",
    "created_by" "uuid" NOT NULL,
    "type" "text",
    "reference" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."favorites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gallery_photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "created_by" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "storage_path" "text" NOT NULL,
    "caption" "text",
    "is_favorite" boolean DEFAULT false NOT NULL,
    "is_polaroid" boolean DEFAULT false NOT NULL,
    "taken_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "original_filename" "text",
    "mime_type" "text",
    "file_size" bigint,
    "description" "text",
    CONSTRAINT "gallery_photos_file_size_nonnegative" CHECK ((("file_size" IS NULL) OR ("file_size" >= 0)))
);


ALTER TABLE "public"."gallery_photos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."generated_content" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid",
    "task_type" "text" NOT NULL,
    "content" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "model" "text",
    "prompt_version" "text",
    "confidence" numeric(4,3),
    "source_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'ready'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "generated_content_confidence_check" CHECK ((("confidence" >= (0)::numeric) AND ("confidence" <= (1)::numeric))),
    CONSTRAINT "generated_content_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'processing'::"text", 'ready'::"text", 'rejected'::"text", 'superseded'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."generated_content" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."live_day_decisions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "day" "date" NOT NULL,
    "decision_type" "text" NOT NULL,
    "place_id" "uuid",
    "schedule_event_id" "text",
    "decision" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."live_day_decisions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."live_day_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "day" "date" NOT NULL,
    "companion_status" "text" NOT NULL,
    "snapshot" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "generated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."live_day_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."live_moment_status" (
    "trip_id" "uuid" NOT NULL,
    "moment_key" "text" NOT NULL,
    "triggered_at" timestamp with time zone,
    "triggered_by" "uuid",
    "seen_at" timestamp with time zone,
    "seen_by" "uuid",
    "collected_at" timestamp with time zone,
    "collected_by" "uuid",
    "is_favorite" boolean DEFAULT false NOT NULL,
    "linked_photo_id" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "live_moment_collected_requires_trigger" CHECK ((("collected_at" IS NULL) OR ("triggered_at" IS NOT NULL))),
    CONSTRAINT "live_moment_seen_requires_trigger" CHECK ((("seen_at" IS NULL) OR ("triggered_at" IS NOT NULL))),
    CONSTRAINT "live_moment_status_key_not_blank" CHECK (("length"(TRIM(BOTH FROM "moment_key")) > 0))
);


ALTER TABLE "public"."live_moment_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."live_moments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid",
    "created_by" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "latitude" double precision,
    "longitude" double precision,
    "place" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."live_moments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."location_samples" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "latitude" double precision NOT NULL,
    "longitude" double precision NOT NULL,
    "accuracy_m" double precision,
    "speed_mps" double precision,
    "heading_deg" double precision,
    "source" "text" DEFAULT 'browser'::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."location_samples" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "module_key" "text",
    "entity_type" "text",
    "entity_id" "uuid",
    "type" "text" NOT NULL,
    "purpose" "text",
    "source" "text" DEFAULT 'user_upload'::"text" NOT NULL,
    "original_name" "text",
    "mime_type" "text",
    "storage_path" "text",
    "remote_url" "text",
    "page_count" integer,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "media_source_check" CHECK (("source" = ANY (ARRAY['user_upload'::"text", 'remote_url'::"text", 'provider'::"text", 'generated'::"text"]))),
    CONSTRAINT "media_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'ready'::"text", 'failed'::"text", 'deleted'::"text"]))),
    CONSTRAINT "media_type_check" CHECK (("type" = ANY (ARRAY['image'::"text", 'pdf'::"text", 'video'::"text", 'audio'::"text", 'document'::"text"])))
);


ALTER TABLE "public"."media" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media_pages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "media_id" "uuid" NOT NULL,
    "page_number" integer NOT NULL,
    "preview_path" "text",
    "width" integer,
    "height" integer,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "media_pages_page_number_check" CHECK (("page_number" > 0))
);


ALTER TABLE "public"."media_pages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."modules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "module_key" "text" NOT NULL,
    "name" "text" NOT NULL,
    "version" integer DEFAULT 2 NOT NULL,
    "category" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "schema_version" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."modules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."paris_member_activity_feed" (
    "id" bigint NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "member_name" "text" NOT NULL,
    "activity_key" "text" NOT NULL,
    "activity_text" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "event_type" "text",
    "category" "text",
    "icon" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "aggregate_key" "text",
    "event_count" integer DEFAULT 1 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."paris_member_activity_feed" OWNER TO "postgres";


ALTER TABLE "public"."paris_member_activity_feed" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."paris_member_activity_feed_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."paris_member_locations" (
    "trip_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "member_name" "text" NOT NULL,
    "latitude" double precision NOT NULL,
    "longitude" double precision NOT NULL,
    "accuracy" double precision,
    "heading" double precision,
    "speed" double precision,
    "place_label" "text",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."paris_member_locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."paris_member_presence" (
    "trip_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "device_id" "text" NOT NULL,
    "member_name" "text" NOT NULL,
    "device_type" "text" DEFAULT 'Web'::"text" NOT NULL,
    "platform" "text",
    "activity_key" "text",
    "activity_text" "text",
    "activity_at" timestamp with time zone,
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_sync_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_visible" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."paris_member_presence" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."paris_member_profiles" (
    "trip_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "member_name" "text" NOT NULL,
    "avatar_data" "text",
    "avatar_color" "text" DEFAULT '#e76f91'::"text" NOT NULL,
    "location_sharing" boolean DEFAULT false NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."paris_member_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."phrase_favorites" (
    "trip_id" "uuid" NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "phrase_key" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "phrase_favorites_key_not_blank" CHECK (("length"(TRIM(BOTH FROM "phrase_key")) > 0))
);


ALTER TABLE "public"."phrase_favorites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."place_lifecycle_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "trip_place_id" "uuid" NOT NULL,
    "place_id" "uuid" NOT NULL,
    "module_key" "text" NOT NULL,
    "from_status" "text",
    "to_status" "text" NOT NULL,
    "actor_user_id" "uuid",
    "event_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."place_lifecycle_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."place_recommendation_feedback" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "place_id" "uuid",
    "provider_place_id" "text",
    "module_key" "text" DEFAULT 'restaurants'::"text" NOT NULL,
    "decision" "text" NOT NULL,
    "match_score" smallint,
    "reasons" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "context" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "actor_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "place_recommendation_feedback_decision_check" CHECK (("decision" = ANY (ARRAY['shown'::"text", 'opened'::"text", 'accepted'::"text", 'rejected'::"text", 'saved'::"text", 'favorited'::"text", 'planned'::"text", 'reserved'::"text", 'visited'::"text"]))),
    CONSTRAINT "place_recommendation_feedback_match_score_check" CHECK ((("match_score" IS NULL) OR (("match_score" >= 0) AND ("match_score" <= 100))))
);


ALTER TABLE "public"."place_recommendation_feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."place_visits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "place_id" "uuid" NOT NULL,
    "participant_id" "uuid",
    "state" "text" DEFAULT 'nearby'::"text" NOT NULL,
    "arrived_at" timestamp with time zone,
    "left_at" timestamp with time zone,
    "duration_seconds" integer,
    "gps_accuracy_meters" numeric,
    "minimum_distance_meters" numeric,
    "detection_source" "text" DEFAULT 'gps'::"text" NOT NULL,
    "is_automatic" boolean DEFAULT true NOT NULL,
    "is_confirmed" boolean DEFAULT false NOT NULL,
    "correction" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "place_visits_state_check" CHECK (("state" = ANY (ARRAY['nearby'::"text", 'arrived'::"text", 'stay_detected'::"text", 'visited'::"text", 'left'::"text"])))
);


ALTER TABLE "public"."place_visits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."places" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider" "text" DEFAULT 'manual'::"text" NOT NULL,
    "provider_place_id" "text",
    "name" "text" NOT NULL,
    "address" "text",
    "latitude" double precision,
    "longitude" double precision,
    "maps_url" "text",
    "website" "text",
    "phone" "text",
    "rating" numeric(3,2),
    "rating_count" integer,
    "price_level" integer,
    "categories" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "attributes" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "opening_hours" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "raw_provider_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "source_updated_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "primary_type" "text" DEFAULT 'custom'::"text" NOT NULL,
    "roles" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "capabilities" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "source" "text" DEFAULT 'local'::"text" NOT NULL,
    "source_id" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "places_primary_type_check" CHECK (("primary_type" = ANY (ARRAY['restaurant'::"text", 'accommodation'::"text", 'attraction'::"text", 'photo_spot'::"text", 'activity'::"text", 'shopping'::"text", 'nature'::"text", 'family'::"text", 'mobility'::"text", 'transit'::"text", 'cycling_route'::"text", 'custom'::"text"])))
);


ALTER TABLE "public"."places" OWNER TO "postgres";


COMMENT ON CONSTRAINT "places_primary_type_check" ON "public"."places" IS 'Kanonische Luvia-Place-Typen einschließlich cycling_route ab Core 4.11.0.';



CREATE TABLE IF NOT EXISTS "public"."popularity_aggregates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "destination_id" "uuid",
    "module_key" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid",
    "traveler_segment" "text" DEFAULT 'all'::"text" NOT NULL,
    "selection_count" integer DEFAULT 0 NOT NULL,
    "favorite_count" integer DEFAULT 0 NOT NULL,
    "completion_count" integer DEFAULT 0 NOT NULL,
    "positive_rating_count" integer DEFAULT 0 NOT NULL,
    "negative_rating_count" integer DEFAULT 0 NOT NULL,
    "sample_size" integer DEFAULT 0 NOT NULL,
    "popularity_score" numeric(8,5) DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."popularity_aggregates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."provider_cache" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider" "text" NOT NULL,
    "cache_key" "text" NOT NULL,
    "response" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone,
    "request_cost" numeric(12,6)
);


ALTER TABLE "public"."provider_cache" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recommendation_memory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "scope_type" "text" DEFAULT 'user'::"text" NOT NULL,
    "scope_id" "text" DEFAULT 'global'::"text" NOT NULL,
    "module_key" "text" DEFAULT 'places'::"text" NOT NULL,
    "memory_key" "text" NOT NULL,
    "memory_value" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "confidence" numeric(5,4) DEFAULT 0 NOT NULL,
    "sample_count" integer DEFAULT 0 NOT NULL,
    "rule_version" "text" DEFAULT 'foundation-1'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."recommendation_memory" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recommendation_settings" (
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "personalization" boolean DEFAULT true NOT NULL,
    "use_location" boolean DEFAULT true NOT NULL,
    "learning" boolean DEFAULT true NOT NULL,
    "debug" boolean DEFAULT false NOT NULL,
    "max_distance_meters" integer DEFAULT 30000 NOT NULL,
    "minimum_score" numeric(5,2) DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."recommendation_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recommendations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "module_key" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid",
    "recommendation_type" "text" NOT NULL,
    "reason_code" "text",
    "reason_text" "text",
    "score" numeric(8,5) DEFAULT 0 NOT NULL,
    "source" "text" DEFAULT 'rules'::"text" NOT NULL,
    "status" "text" DEFAULT 'new'::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone,
    CONSTRAINT "recommendations_status_check" CHECK (("status" = ANY (ARRAY['new'::"text", 'shown'::"text", 'opened'::"text", 'accepted'::"text", 'dismissed'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."recommendations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reminder_status" (
    "trip_id" "uuid" NOT NULL,
    "reminder_key" "text" NOT NULL,
    "is_completed" boolean DEFAULT false NOT NULL,
    "completed_by" "uuid",
    "completed_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "reminder_status_completion_consistent" CHECK (((("is_completed" = true) AND ("completed_at" IS NOT NULL)) OR (("is_completed" = false) AND ("completed_at" IS NULL) AND ("completed_by" IS NULL)))),
    CONSTRAINT "reminder_status_key_not_blank" CHECK (("length"(TRIM(BOTH FROM "reminder_key")) > 0))
);


ALTER TABLE "public"."reminder_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."restaurants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_place_id" "uuid" NOT NULL,
    "reservation_date" "date",
    "reservation_time" time without time zone,
    "reservation_status" "text" DEFAULT 'idea'::"text" NOT NULL,
    "confirmation_number" "text",
    "menu_status" "text" DEFAULT 'not_checked'::"text" NOT NULL,
    "personal_rating" smallint,
    "visited" boolean DEFAULT false NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reservation_name" "text",
    "reservation_url" "text",
    "reservation_notes" "text",
    "menu_url" "text",
    "personal_notes" "text",
    "recommended_visit_time" time without time zone,
    "recommendation_reason" "text",
    "match_score" smallint,
    "recommendation_metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    CONSTRAINT "restaurants_match_score_check" CHECK ((("match_score" IS NULL) OR (("match_score" >= 0) AND ("match_score" <= 100)))),
    CONSTRAINT "restaurants_menu_status_check" CHECK (("menu_status" = ANY (ARRAY['not_checked'::"text", 'searching'::"text", 'found'::"text", 'needs_upload'::"text", 'ready'::"text", 'failed'::"text"]))),
    CONSTRAINT "restaurants_personal_rating_check" CHECK ((("personal_rating" IS NULL) OR (("personal_rating" >= 1) AND ("personal_rating" <= 5)))),
    CONSTRAINT "restaurants_reservation_status_check" CHECK (("reservation_status" = ANY (ARRAY['idea'::"text", 'requested'::"text", 'reserved'::"text", 'confirmed'::"text", 'cancelled'::"text", 'visited'::"text"])))
);


ALTER TABLE "public"."restaurants" OWNER TO "postgres";


COMMENT ON COLUMN "public"."restaurants"."reservation_name" IS 'Name, auf den die Reservierung läuft. Nutzerdaten.';



COMMENT ON COLUMN "public"."restaurants"."reservation_url" IS 'Reservierungs- oder Verwaltungslink. Nutzerdaten.';



COMMENT ON COLUMN "public"."restaurants"."reservation_notes" IS 'Persönliche Hinweise zur Reservierung. Nutzerdaten.';



COMMENT ON COLUMN "public"."restaurants"."menu_url" IS 'Vom Nutzer oder Luvia bestätigter Link zur Speisekarte.';



CREATE TABLE IF NOT EXISTS "public"."timeline_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "place_id" "uuid",
    "participant_id" "uuid",
    "event_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "occurred_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source" "text" DEFAULT 'manual'::"text" NOT NULL,
    "is_automatic" boolean DEFAULT false NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."timeline_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."timeline_events" IS 'Cloud event stream used by Luvia Timeline Core 5. Schedule and GPS visits remain authoritative in their cloud tables.';



CREATE TABLE IF NOT EXISTS "public"."trip_activity_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "actor_user_id" "uuid",
    "event_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text",
    "entity_type" "text",
    "entity_id" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."trip_activity_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trip_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid",
    "user_id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "display_name" "text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."trip_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trip_module_settings" (
    "trip_id" "uuid" NOT NULL,
    "modules" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "settings" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid"
);


ALTER TABLE "public"."trip_module_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trip_modules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "module_id" "uuid" NOT NULL,
    "enabled" boolean DEFAULT true NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "settings" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."trip_modules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trip_places" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "place_id" "uuid" NOT NULL,
    "module_key" "text" NOT NULL,
    "status" "text" DEFAULT 'idea'::"text" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "is_favorite" boolean DEFAULT false NOT NULL,
    "user_notes" "text",
    "custom_name" "text",
    "custom_description" "text",
    "custom_symbol" "text",
    "created_by" "uuid",
    "sync_status" "text" DEFAULT 'synced'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "planned_date" "date",
    "planned_time" time without time zone,
    "lifecycle_status" "text" DEFAULT 'discovered'::"text" NOT NULL,
    "visited_at" timestamp with time zone,
    "memory_status" "text" DEFAULT 'none'::"text" NOT NULL,
    "travel_book_status" "text" DEFAULT 'none'::"text" NOT NULL,
    CONSTRAINT "trip_places_lifecycle_status_check" CHECK (("lifecycle_status" = ANY (ARRAY['discovered'::"text", 'saved'::"text", 'favorited'::"text", 'planned'::"text", 'reserved'::"text", 'visited'::"text", 'rated'::"text", 'memory'::"text", 'travel_book'::"text"]))),
    CONSTRAINT "trip_places_memory_status_check" CHECK (("memory_status" = ANY (ARRAY['none'::"text", 'candidate'::"text", 'created'::"text"]))),
    CONSTRAINT "trip_places_status_check" CHECK (("status" = ANY (ARRAY['idea'::"text", 'discovered'::"text", 'saved'::"text", 'favorite'::"text", 'favorited'::"text", 'planned'::"text", 'reserved'::"text", 'selected'::"text", 'booked'::"text", 'checked_in'::"text", 'checked_out'::"text", 'visited'::"text", 'rated'::"text", 'rejected'::"text", 'dismissed'::"text", 'archived'::"text", 'memory'::"text", 'travel_book'::"text"]))),
    CONSTRAINT "trip_places_sync_status_check" CHECK (("sync_status" = ANY (ARRAY['synced'::"text", 'pending_upload'::"text", 'pending_update'::"text", 'conflict'::"text", 'failed'::"text", 'local_only'::"text"]))),
    CONSTRAINT "trip_places_travel_book_status_check" CHECK (("travel_book_status" = ANY (ARRAY['none'::"text", 'candidate'::"text", 'linked'::"text"])))
);


ALTER TABLE "public"."trip_places" OWNER TO "postgres";


COMMENT ON COLUMN "public"."trip_places"."planned_date" IS 'Vom Nutzer gepflegter geplanter Reisetag. Darf nicht durch Provider-Synchronisierung überschrieben werden.';



COMMENT ON COLUMN "public"."trip_places"."planned_time" IS 'Vom Nutzer gepflegte geplante Uhrzeit. Darf nicht durch Provider-Synchronisierung überschrieben werden.';



COMMENT ON CONSTRAINT "trip_places_status_check" ON "public"."trip_places" IS 'Universal Place lifecycle. New clients write canonical states; legacy aliases remain readable during migration.';



CREATE TABLE IF NOT EXISTS "public"."trip_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "preference_key" "text" NOT NULL,
    "preference_value" "jsonb" NOT NULL,
    "source" "text" DEFAULT 'user'::"text" NOT NULL,
    "confidence" numeric(4,3) DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "trip_preferences_confidence_check" CHECK ((("confidence" >= (0)::numeric) AND ("confidence" <= (1)::numeric))),
    CONSTRAINT "trip_preferences_source_check" CHECK (("source" = ANY (ARRAY['user'::"text", 'onboarding'::"text", 'behavior_inference'::"text", 'ai_inference'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."trip_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trip_presence" (
    "trip_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "device_id" "text" NOT NULL,
    "display_name" "text",
    "status" "text" DEFAULT 'online'::"text" NOT NULL,
    "current_view" "text",
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."trip_presence" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trip_settings" (
    "trip_id" "uuid" NOT NULL,
    "trip_name" "text" DEFAULT 'Paris · Unser erster Hochzeitstag'::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid",
    "destination_context" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "symbol" "text" DEFAULT '❤️'::"text" NOT NULL,
    "accent" "text" DEFAULT '#ee6f83'::"text" NOT NULL,
    "start_date" "date",
    "end_date" "date"
);


ALTER TABLE "public"."trip_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."trips" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "owner" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "destination_id" "uuid",
    "trip_type" "text",
    "accent_color" "text",
    "intelligence_version" integer DEFAULT 2 NOT NULL,
    "sync_status" "text" DEFAULT 'synced'::"text" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."trips" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_activity_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "trip_id" "uuid",
    "module_key" "text",
    "entity_type" "text",
    "entity_id" "uuid",
    "event_type" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "consent_scope" "text" DEFAULT 'functional'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_activity_events_consent_scope_check" CHECK (("consent_scope" = ANY (ARRAY['functional'::"text", 'analytics'::"text", 'recommendations'::"text"])))
);


ALTER TABLE "public"."user_activity_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_content_overrides" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid",
    "field_name" "text" NOT NULL,
    "value" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_content_overrides" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."visited_places" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "trip_id" "uuid",
    "created_by" "uuid" NOT NULL,
    "place" "text",
    "visited_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."visited_places" OWNER TO "postgres";


ALTER TABLE ONLY "public"."accommodations"
    ADD CONSTRAINT "accommodations_pkey" PRIMARY KEY ("trip_place_id");



ALTER TABLE ONLY "public"."ai_action_proposals"
    ADD CONSTRAINT "ai_action_proposals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_interaction_events"
    ADD CONSTRAINT "ai_interaction_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_learning_signals"
    ADD CONSTRAINT "ai_learning_signals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_learning_signals"
    ADD CONSTRAINT "ai_learning_signals_user_id_scope_key_signal_key_key" UNIQUE ("user_id", "scope_key", "signal_key");



ALTER TABLE ONLY "public"."ai_usage_events"
    ADD CONSTRAINT "ai_usage_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_usage"
    ADD CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."automation_jobs"
    ADD CONSTRAINT "automation_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."automation_steps"
    ADD CONSTRAINT "automation_steps_job_id_step_key_key" UNIQUE ("job_id", "step_key");



ALTER TABLE ONLY "public"."automation_steps"
    ADD CONSTRAINT "automation_steps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."budget_entries"
    ADD CONSTRAINT "budget_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."budget_settings"
    ADD CONSTRAINT "budget_settings_pkey" PRIMARY KEY ("trip_id");



ALTER TABLE ONLY "public"."co_selection_aggregates"
    ADD CONSTRAINT "co_selection_aggregates_destination_id_entity_type_a_entity_key" UNIQUE ("destination_id", "entity_type_a", "entity_id_a", "entity_type_b", "entity_id_b", "traveler_segment");



ALTER TABLE ONLY "public"."co_selection_aggregates"
    ADD CONSTRAINT "co_selection_aggregates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."custom_phrases"
    ADD CONSTRAINT "custom_phrases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."custom_reminders"
    ADD CONSTRAINT "custom_reminders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_member_stats"
    ADD CONSTRAINT "daily_member_stats_pkey" PRIMARY KEY ("trip_id", "trip_day", "member_name");



ALTER TABLE ONLY "public"."day_closures"
    ADD CONSTRAINT "day_closures_pkey" PRIMARY KEY ("trip_id", "trip_day");



ALTER TABLE ONLY "public"."day_notes"
    ADD CONSTRAINT "day_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."derived_user_preferences"
    ADD CONSTRAINT "derived_user_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."derived_user_preferences"
    ADD CONSTRAINT "derived_user_preferences_user_id_preference_key_key" UNIQUE ("user_id", "preference_key");



ALTER TABLE ONLY "public"."destinations"
    ADD CONSTRAINT "destinations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."destinations"
    ADD CONSTRAINT "destinations_provider_provider_place_id_key" UNIQUE ("provider", "provider_place_id");



ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gallery_photos"
    ADD CONSTRAINT "gallery_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gallery_photos"
    ADD CONSTRAINT "gallery_photos_storage_path_key" UNIQUE ("storage_path");



ALTER TABLE ONLY "public"."generated_content"
    ADD CONSTRAINT "generated_content_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."live_day_decisions"
    ADD CONSTRAINT "live_day_decisions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."live_day_snapshots"
    ADD CONSTRAINT "live_day_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."live_day_snapshots"
    ADD CONSTRAINT "live_day_snapshots_trip_id_user_id_day_key" UNIQUE ("trip_id", "user_id", "day");



ALTER TABLE ONLY "public"."live_moment_status"
    ADD CONSTRAINT "live_moment_status_pkey" PRIMARY KEY ("trip_id", "moment_key");



ALTER TABLE ONLY "public"."live_moments"
    ADD CONSTRAINT "live_moments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."location_samples"
    ADD CONSTRAINT "location_samples_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_pages"
    ADD CONSTRAINT "media_pages_media_id_page_number_key" UNIQUE ("media_id", "page_number");



ALTER TABLE ONLY "public"."media_pages"
    ADD CONSTRAINT "media_pages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media"
    ADD CONSTRAINT "media_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_module_key_key" UNIQUE ("module_key");



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."paris_member_activity_feed"
    ADD CONSTRAINT "paris_member_activity_feed_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."paris_member_locations"
    ADD CONSTRAINT "paris_member_locations_pkey" PRIMARY KEY ("trip_id", "user_id");



ALTER TABLE ONLY "public"."paris_member_presence"
    ADD CONSTRAINT "paris_member_presence_pkey" PRIMARY KEY ("trip_id", "user_id", "device_id");



ALTER TABLE ONLY "public"."paris_member_profiles"
    ADD CONSTRAINT "paris_member_profiles_pkey" PRIMARY KEY ("trip_id", "user_id");



ALTER TABLE ONLY "public"."phrase_favorites"
    ADD CONSTRAINT "phrase_favorites_pkey" PRIMARY KEY ("trip_id", "user_id", "phrase_key");



ALTER TABLE ONLY "public"."place_lifecycle_history"
    ADD CONSTRAINT "place_lifecycle_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."place_recommendation_feedback"
    ADD CONSTRAINT "place_recommendation_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."place_visits"
    ADD CONSTRAINT "place_visits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."places"
    ADD CONSTRAINT "places_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."places"
    ADD CONSTRAINT "places_provider_provider_place_id_key" UNIQUE ("provider", "provider_place_id");



ALTER TABLE ONLY "public"."popularity_aggregates"
    ADD CONSTRAINT "popularity_aggregates_destination_id_module_key_entity_type_key" UNIQUE ("destination_id", "module_key", "entity_type", "entity_id", "traveler_segment");



ALTER TABLE ONLY "public"."popularity_aggregates"
    ADD CONSTRAINT "popularity_aggregates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."provider_cache"
    ADD CONSTRAINT "provider_cache_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."provider_cache"
    ADD CONSTRAINT "provider_cache_provider_cache_key_key" UNIQUE ("provider", "cache_key");



ALTER TABLE ONLY "public"."recommendation_events"
    ADD CONSTRAINT "recommendation_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recommendation_instances"
    ADD CONSTRAINT "recommendation_instances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recommendation_memory"
    ADD CONSTRAINT "recommendation_memory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recommendation_memory"
    ADD CONSTRAINT "recommendation_memory_user_id_scope_type_scope_id_module_ke_key" UNIQUE ("user_id", "scope_type", "scope_id", "module_key", "memory_key");



ALTER TABLE ONLY "public"."recommendation_settings"
    ADD CONSTRAINT "recommendation_settings_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."recommendations"
    ADD CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reminder_status"
    ADD CONSTRAINT "reminder_status_pkey" PRIMARY KEY ("trip_id", "reminder_key");



ALTER TABLE ONLY "public"."restaurants"
    ADD CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."restaurants"
    ADD CONSTRAINT "restaurants_trip_place_id_key" UNIQUE ("trip_place_id");



ALTER TABLE ONLY "public"."timeline_events"
    ADD CONSTRAINT "timeline_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_activity_events"
    ADD CONSTRAINT "trip_activity_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_members"
    ADD CONSTRAINT "trip_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_members"
    ADD CONSTRAINT "trip_members_trip_id_user_id_key" UNIQUE ("trip_id", "user_id");



ALTER TABLE ONLY "public"."trip_module_settings"
    ADD CONSTRAINT "trip_module_settings_pkey" PRIMARY KEY ("trip_id");



ALTER TABLE ONLY "public"."trip_modules"
    ADD CONSTRAINT "trip_modules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_modules"
    ADD CONSTRAINT "trip_modules_trip_id_module_id_key" UNIQUE ("trip_id", "module_id");



ALTER TABLE ONLY "public"."trip_place_data"
    ADD CONSTRAINT "trip_place_data_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_place_data"
    ADD CONSTRAINT "trip_place_data_trip_place_id_key" UNIQUE ("trip_place_id");



ALTER TABLE ONLY "public"."trip_places"
    ADD CONSTRAINT "trip_places_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_places"
    ADD CONSTRAINT "trip_places_trip_id_place_id_module_key_key" UNIQUE ("trip_id", "place_id", "module_key");



ALTER TABLE ONLY "public"."trip_preferences"
    ADD CONSTRAINT "trip_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_preferences"
    ADD CONSTRAINT "trip_preferences_trip_id_user_id_preference_key_key" UNIQUE ("trip_id", "user_id", "preference_key");



ALTER TABLE ONLY "public"."trip_presence"
    ADD CONSTRAINT "trip_presence_pkey" PRIMARY KEY ("trip_id", "user_id", "device_id");



ALTER TABLE ONLY "public"."trip_schedule_events"
    ADD CONSTRAINT "trip_schedule_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."trip_schedule_events"
    ADD CONSTRAINT "trip_schedule_events_trip_id_source_key_key" UNIQUE ("trip_id", "source_key");



ALTER TABLE ONLY "public"."trip_settings"
    ADD CONSTRAINT "trip_settings_pkey" PRIMARY KEY ("trip_id");



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_activity_events"
    ADD CONSTRAINT "user_activity_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_content_overrides"
    ADD CONSTRAINT "user_content_overrides_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_content_overrides"
    ADD CONSTRAINT "user_content_overrides_trip_id_user_id_entity_type_entity_i_key" UNIQUE ("trip_id", "user_id", "entity_type", "entity_id", "field_name");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."visited_places"
    ADD CONSTRAINT "visited_places_pkey" PRIMARY KEY ("id");



CREATE INDEX "activity_trip_event_idx" ON "public"."user_activity_events" USING "btree" ("trip_id", "event_type", "created_at" DESC);



CREATE INDEX "ai_action_proposals_user_status_idx" ON "public"."ai_action_proposals" USING "btree" ("user_id", "status", "created_at" DESC);



CREATE INDEX "ai_interaction_events_trip_created_idx" ON "public"."ai_interaction_events" USING "btree" ("user_id", "trip_id", "created_at" DESC) WHERE ("trip_id" IS NOT NULL);



CREATE INDEX "ai_interaction_events_user_created_idx" ON "public"."ai_interaction_events" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "ai_learning_signals_trip_idx" ON "public"."ai_learning_signals" USING "btree" ("user_id", "trip_id") WHERE ("trip_id" IS NOT NULL);



CREATE INDEX "ai_learning_signals_user_status_idx" ON "public"."ai_learning_signals" USING "btree" ("user_id", "status", "last_observed_at" DESC);



CREATE INDEX "ai_usage_events_user_created_idx" ON "public"."ai_usage_events" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "budget_entries_trip_category_idx" ON "public"."budget_entries" USING "btree" ("trip_id", "category");



CREATE INDEX "budget_entries_trip_date_idx" ON "public"."budget_entries" USING "btree" ("trip_id", "expense_date" DESC, "created_at" DESC);



CREATE INDEX "custom_phrases_trip_idx" ON "public"."custom_phrases" USING "btree" ("trip_id", "created_at" DESC);



CREATE INDEX "custom_reminders_trip_created_idx" ON "public"."custom_reminders" USING "btree" ("trip_id", "created_at");



CREATE INDEX "daily_member_stats_trip_day_idx" ON "public"."daily_member_stats" USING "btree" ("trip_id", "trip_day" DESC);



CREATE INDEX "day_closures_trip_day_idx" ON "public"."day_closures" USING "btree" ("trip_id", "trip_day" DESC);



CREATE UNIQUE INDEX "day_notes_trip_day_unique" ON "public"."day_notes" USING "btree" ("trip_id", "day");



CREATE INDEX "day_notes_trip_idx" ON "public"."day_notes" USING "btree" ("trip_id", "updated_at");



CREATE INDEX "favorites_trip_idx" ON "public"."favorites" USING "btree" ("trip_id", "created_at");



CREATE INDEX "gallery_photos_trip_idx" ON "public"."gallery_photos" USING "btree" ("trip_id", "created_at");



CREATE INDEX "gallery_photos_trip_taken_idx" ON "public"."gallery_photos" USING "btree" ("trip_id", "taken_at" DESC);



CREATE INDEX "generated_content_entity_idx" ON "public"."generated_content" USING "btree" ("trip_id", "entity_type", "entity_id", "task_type");



CREATE INDEX "live_day_decisions_trip_day_idx" ON "public"."live_day_decisions" USING "btree" ("trip_id", "day", "created_at" DESC);



CREATE INDEX "live_day_snapshots_trip_day_idx" ON "public"."live_day_snapshots" USING "btree" ("trip_id", "day");



CREATE INDEX "live_moment_status_linked_photo_idx" ON "public"."live_moment_status" USING "btree" ("linked_photo_id") WHERE ("linked_photo_id" IS NOT NULL);



CREATE INDEX "live_moment_status_trip_triggered_idx" ON "public"."live_moment_status" USING "btree" ("trip_id", "triggered_at" DESC);



CREATE INDEX "live_moments_trip_idx" ON "public"."live_moments" USING "btree" ("trip_id", "created_at");



CREATE INDEX "location_samples_trip_time_idx" ON "public"."location_samples" USING "btree" ("trip_id", "recorded_at" DESC);



CREATE INDEX "media_entity_idx" ON "public"."media" USING "btree" ("trip_id", "entity_type", "entity_id");



CREATE INDEX "paris_member_activity_feed_aggregate_idx" ON "public"."paris_member_activity_feed" USING "btree" ("trip_id", "user_id", "aggregate_key", "updated_at" DESC) WHERE ("aggregate_key" IS NOT NULL);



CREATE INDEX "paris_member_activity_feed_trip_created_idx" ON "public"."paris_member_activity_feed" USING "btree" ("trip_id", "created_at" DESC);



CREATE INDEX "paris_member_activity_feed_trip_updated_idx" ON "public"."paris_member_activity_feed" USING "btree" ("trip_id", "updated_at" DESC);



CREATE INDEX "phrase_favorites_user_idx" ON "public"."phrase_favorites" USING "btree" ("user_id", "trip_id");



CREATE INDEX "place_lifecycle_history_trip_place_idx" ON "public"."place_lifecycle_history" USING "btree" ("trip_place_id", "event_at" DESC);



CREATE INDEX "place_lifecycle_history_trip_time_idx" ON "public"."place_lifecycle_history" USING "btree" ("trip_id", "event_at" DESC);



CREATE INDEX "place_recommendation_feedback_trip_idx" ON "public"."place_recommendation_feedback" USING "btree" ("trip_id", "created_at" DESC);



CREATE INDEX "place_visits_trip_arrived_idx" ON "public"."place_visits" USING "btree" ("trip_id", "arrived_at", "left_at");



CREATE INDEX "place_visits_trip_place_idx" ON "public"."place_visits" USING "btree" ("trip_id", "place_id", "created_at" DESC);



CREATE INDEX "places_name_idx" ON "public"."places" USING "btree" ("lower"("name"));



CREATE INDEX "places_primary_type_idx" ON "public"."places" USING "btree" ("primary_type");



CREATE INDEX "places_roles_gin_idx" ON "public"."places" USING "gin" ("roles");



CREATE UNIQUE INDEX "places_source_identity_uidx" ON "public"."places" USING "btree" ("source", "source_id") WHERE ("source_id" IS NOT NULL);



CREATE INDEX "recommendation_events_rec_idx" ON "public"."recommendation_events" USING "btree" ("recommendation_id", "created_at" DESC);



CREATE INDEX "recommendation_events_trip_created_idx" ON "public"."recommendation_events" USING "btree" ("trip_id", "created_at" DESC);



CREATE INDEX "recommendation_instances_entity_idx" ON "public"."recommendation_instances" USING "btree" ("trip_id", "module_key", "entity_type", "entity_id");



CREATE INDEX "recommendation_instances_trip_created_idx" ON "public"."recommendation_instances" USING "btree" ("trip_id", "created_at" DESC);



CREATE INDEX "recommendations_trip_module_idx" ON "public"."recommendations" USING "btree" ("trip_id", "module_key", "status", "score" DESC);



CREATE INDEX "reminder_status_trip_completed_idx" ON "public"."reminder_status" USING "btree" ("trip_id", "is_completed");



CREATE INDEX "reminder_status_trip_idx" ON "public"."reminder_status" USING "btree" ("trip_id");



CREATE INDEX "restaurants_reservation_idx" ON "public"."restaurants" USING "btree" ("reservation_date", "reservation_time") WHERE ("reservation_date" IS NOT NULL);



CREATE INDEX "restaurants_status_idx" ON "public"."restaurants" USING "btree" ("reservation_status", "visited");



CREATE INDEX "timeline_events_place_idx" ON "public"."timeline_events" USING "btree" ("place_id");



CREATE INDEX "timeline_events_trip_occurred_idx" ON "public"."timeline_events" USING "btree" ("trip_id", "occurred_at" DESC);



CREATE INDEX "trip_activity_events_actor_idx" ON "public"."trip_activity_events" USING "btree" ("actor_user_id", "created_at" DESC);



CREATE INDEX "trip_activity_events_trip_created_idx" ON "public"."trip_activity_events" USING "btree" ("trip_id", "created_at" DESC);



CREATE INDEX "trip_members_user_idx" ON "public"."trip_members" USING "btree" ("user_id");



CREATE INDEX "trip_place_data_place_idx" ON "public"."trip_place_data" USING "btree" ("place_id");



CREATE INDEX "trip_place_data_trip_type_idx" ON "public"."trip_place_data" USING "btree" ("trip_id", "place_type");



CREATE INDEX "trip_place_data_trip_updated_idx" ON "public"."trip_place_data" USING "btree" ("trip_id", "updated_at" DESC);



CREATE INDEX "trip_places_trip_favorite_idx" ON "public"."trip_places" USING "btree" ("trip_id", "is_favorite") WHERE (("is_favorite" = true) AND ("status" <> 'archived'::"text"));



CREATE INDEX "trip_places_trip_favorite_type_idx" ON "public"."trip_places" USING "btree" ("trip_id", "module_key", "is_favorite") WHERE ("status" <> 'archived'::"text");



CREATE INDEX "trip_places_trip_module_idx" ON "public"."trip_places" USING "btree" ("trip_id", "module_key", "position");



CREATE INDEX "trip_places_trip_module_status_idx" ON "public"."trip_places" USING "btree" ("trip_id", "module_key", "status") WHERE ("status" <> 'archived'::"text");



CREATE INDEX "trip_places_trip_planned_idx" ON "public"."trip_places" USING "btree" ("trip_id", "planned_date", "planned_time") WHERE ("planned_date" IS NOT NULL);



CREATE INDEX "trip_places_trip_type_status_idx" ON "public"."trip_places" USING "btree" ("trip_id", "status", "updated_at" DESC);



CREATE INDEX "trip_preferences_trip_idx" ON "public"."trip_preferences" USING "btree" ("trip_id");



CREATE INDEX "trip_presence_trip_seen_idx" ON "public"."trip_presence" USING "btree" ("trip_id", "last_seen_at" DESC);



CREATE INDEX "trip_schedule_events_place_idx" ON "public"."trip_schedule_events" USING "btree" ("place_id");



CREATE INDEX "trip_schedule_events_trip_date_idx" ON "public"."trip_schedule_events" USING "btree" ("trip_id", "event_date", "start_time");



CREATE INDEX "trip_schedule_events_trip_place_idx" ON "public"."trip_schedule_events" USING "btree" ("trip_place_id");



CREATE UNIQUE INDEX "trip_schedule_events_trip_provider_unique" ON "public"."trip_schedule_events" USING "btree" ("trip_id", "provider_place_id") WHERE ("provider_place_id" IS NOT NULL);



CREATE INDEX "trip_schedule_events_trip_source_key_idx" ON "public"."trip_schedule_events" USING "btree" ("trip_id", "source_key") WHERE ("source_key" IS NOT NULL);



CREATE UNIQUE INDEX "trip_schedule_events_trip_trip_place_unique" ON "public"."trip_schedule_events" USING "btree" ("trip_id", "trip_place_id") WHERE ("trip_place_id" IS NOT NULL);



CREATE INDEX "visited_places_trip_idx" ON "public"."visited_places" USING "btree" ("trip_id", "visited_at");



CREATE OR REPLACE TRIGGER "ai_action_proposals_touch_updated_at" BEFORE UPDATE ON "public"."ai_action_proposals" FOR EACH ROW EXECUTE FUNCTION "public"."luvia_touch_ai_updated_at"();



CREATE OR REPLACE TRIGGER "ai_learning_signals_touch_updated_at" BEFORE UPDATE ON "public"."ai_learning_signals" FOR EACH ROW EXECUTE FUNCTION "public"."luvia_touch_ai_updated_at"();



CREATE OR REPLACE TRIGGER "budget_entries_set_updated_at" BEFORE UPDATE ON "public"."budget_entries" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "budget_settings_set_updated_at" BEFORE UPDATE ON "public"."budget_settings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "custom_phrases_set_updated_at" BEFORE UPDATE ON "public"."custom_phrases" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "custom_reminders_set_updated_at" BEFORE UPDATE ON "public"."custom_reminders" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "daily_member_stats_set_updated_at" BEFORE UPDATE ON "public"."daily_member_stats" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "day_closures_set_updated_at" BEFORE UPDATE ON "public"."day_closures" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "gallery_photos_set_updated_at" BEFORE UPDATE ON "public"."gallery_photos" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "live_moment_status_set_updated_at" BEFORE UPDATE ON "public"."live_moment_status" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "luvia_trip_member_joined_activity" AFTER INSERT ON "public"."trip_members" FOR EACH ROW EXECUTE FUNCTION "public"."luvia_activity_member_joined_trigger"();



CREATE OR REPLACE TRIGGER "reminder_status_set_updated_at" BEFORE UPDATE ON "public"."reminder_status" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_automation_jobs" BEFORE UPDATE ON "public"."automation_jobs" FOR EACH ROW EXECUTE FUNCTION "public"."luvia_set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_derived_user_preferences" BEFORE UPDATE ON "public"."derived_user_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."luvia_set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_destinations" BEFORE UPDATE ON "public"."destinations" FOR EACH ROW EXECUTE FUNCTION "public"."luvia_set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_generated_content" BEFORE UPDATE ON "public"."generated_content" FOR EACH ROW EXECUTE FUNCTION "public"."luvia_set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_media" BEFORE UPDATE ON "public"."media" FOR EACH ROW EXECUTE FUNCTION "public"."luvia_set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_modules" BEFORE UPDATE ON "public"."modules" FOR EACH ROW EXECUTE FUNCTION "public"."luvia_set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_places" BEFORE UPDATE ON "public"."places" FOR EACH ROW EXECUTE FUNCTION "public"."luvia_set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_restaurants" BEFORE UPDATE ON "public"."restaurants" FOR EACH ROW EXECUTE FUNCTION "public"."luvia_set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_trip_modules" BEFORE UPDATE ON "public"."trip_modules" FOR EACH ROW EXECUTE FUNCTION "public"."luvia_set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_trip_places" BEFORE UPDATE ON "public"."trip_places" FOR EACH ROW EXECUTE FUNCTION "public"."luvia_set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_trip_preferences" BEFORE UPDATE ON "public"."trip_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."luvia_set_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at_user_content_overrides" BEFORE UPDATE ON "public"."user_content_overrides" FOR EACH ROW EXECUTE FUNCTION "public"."luvia_set_updated_at"();



CREATE OR REPLACE TRIGGER "trip_schedule_events_touch" BEFORE UPDATE ON "public"."trip_schedule_events" FOR EACH ROW EXECUTE FUNCTION "public"."luvia_touch_schedule_event"();



CREATE OR REPLACE TRIGGER "user_profiles_preference_compatibility" BEFORE INSERT OR UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."luvia_sync_profile_preference_compatibility"();



ALTER TABLE ONLY "public"."accommodations"
    ADD CONSTRAINT "accommodations_trip_place_id_fkey" FOREIGN KEY ("trip_place_id") REFERENCES "public"."trip_places"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_action_proposals"
    ADD CONSTRAINT "ai_action_proposals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_interaction_events"
    ADD CONSTRAINT "ai_interaction_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_learning_signals"
    ADD CONSTRAINT "ai_learning_signals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_usage_events"
    ADD CONSTRAINT "ai_usage_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_usage"
    ADD CONSTRAINT "ai_usage_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_usage"
    ADD CONSTRAINT "ai_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."automation_jobs"
    ADD CONSTRAINT "automation_jobs_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."automation_jobs"
    ADD CONSTRAINT "automation_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."automation_steps"
    ADD CONSTRAINT "automation_steps_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."automation_jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."budget_entries"
    ADD CONSTRAINT "budget_entries_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."budget_settings"
    ADD CONSTRAINT "budget_settings_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."co_selection_aggregates"
    ADD CONSTRAINT "co_selection_aggregates_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."custom_phrases"
    ADD CONSTRAINT "custom_phrases_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."custom_reminders"
    ADD CONSTRAINT "custom_reminders_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_member_stats"
    ADD CONSTRAINT "daily_member_stats_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."day_closures"
    ADD CONSTRAINT "day_closures_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."day_notes"
    ADD CONSTRAINT "day_notes_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."derived_user_preferences"
    ADD CONSTRAINT "derived_user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."favorites"
    ADD CONSTRAINT "favorites_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."gallery_photos"
    ADD CONSTRAINT "gallery_photos_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."generated_content"
    ADD CONSTRAINT "generated_content_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."generated_content"
    ADD CONSTRAINT "generated_content_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."live_moment_status"
    ADD CONSTRAINT "live_moment_status_linked_photo_id_fkey" FOREIGN KEY ("linked_photo_id") REFERENCES "public"."gallery_photos"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."live_moment_status"
    ADD CONSTRAINT "live_moment_status_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."live_moments"
    ADD CONSTRAINT "live_moments_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."media_pages"
    ADD CONSTRAINT "media_pages_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."media"
    ADD CONSTRAINT "media_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."media"
    ADD CONSTRAINT "media_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."paris_member_activity_feed"
    ADD CONSTRAINT "paris_member_activity_feed_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."paris_member_locations"
    ADD CONSTRAINT "paris_member_locations_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."paris_member_presence"
    ADD CONSTRAINT "paris_member_presence_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."paris_member_profiles"
    ADD CONSTRAINT "paris_member_profiles_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."phrase_favorites"
    ADD CONSTRAINT "phrase_favorites_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."place_lifecycle_history"
    ADD CONSTRAINT "place_lifecycle_history_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."place_lifecycle_history"
    ADD CONSTRAINT "place_lifecycle_history_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."place_lifecycle_history"
    ADD CONSTRAINT "place_lifecycle_history_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."place_lifecycle_history"
    ADD CONSTRAINT "place_lifecycle_history_trip_place_id_fkey" FOREIGN KEY ("trip_place_id") REFERENCES "public"."trip_places"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."place_recommendation_feedback"
    ADD CONSTRAINT "place_recommendation_feedback_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."place_recommendation_feedback"
    ADD CONSTRAINT "place_recommendation_feedback_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."place_recommendation_feedback"
    ADD CONSTRAINT "place_recommendation_feedback_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."place_visits"
    ADD CONSTRAINT "place_visits_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."place_visits"
    ADD CONSTRAINT "place_visits_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."popularity_aggregates"
    ADD CONSTRAINT "popularity_aggregates_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recommendation_events"
    ADD CONSTRAINT "recommendation_events_recommendation_id_fkey" FOREIGN KEY ("recommendation_id") REFERENCES "public"."recommendations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recommendation_events"
    ADD CONSTRAINT "recommendation_events_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recommendation_events"
    ADD CONSTRAINT "recommendation_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recommendations"
    ADD CONSTRAINT "recommendations_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recommendations"
    ADD CONSTRAINT "recommendations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reminder_status"
    ADD CONSTRAINT "reminder_status_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."restaurants"
    ADD CONSTRAINT "restaurants_trip_place_id_fkey" FOREIGN KEY ("trip_place_id") REFERENCES "public"."trip_places"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."timeline_events"
    ADD CONSTRAINT "timeline_events_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."timeline_events"
    ADD CONSTRAINT "timeline_events_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_members"
    ADD CONSTRAINT "trip_members_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_module_settings"
    ADD CONSTRAINT "trip_module_settings_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_modules"
    ADD CONSTRAINT "trip_modules_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_modules"
    ADD CONSTRAINT "trip_modules_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_place_data"
    ADD CONSTRAINT "trip_place_data_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_place_data"
    ADD CONSTRAINT "trip_place_data_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_place_data"
    ADD CONSTRAINT "trip_place_data_trip_place_id_fkey" FOREIGN KEY ("trip_place_id") REFERENCES "public"."trip_places"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_places"
    ADD CONSTRAINT "trip_places_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."trip_places"
    ADD CONSTRAINT "trip_places_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_places"
    ADD CONSTRAINT "trip_places_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_preferences"
    ADD CONSTRAINT "trip_preferences_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_preferences"
    ADD CONSTRAINT "trip_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_schedule_events"
    ADD CONSTRAINT "trip_schedule_events_place_id_fkey" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."trip_schedule_events"
    ADD CONSTRAINT "trip_schedule_events_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_schedule_events"
    ADD CONSTRAINT "trip_schedule_events_trip_place_id_fkey" FOREIGN KEY ("trip_place_id") REFERENCES "public"."trip_places"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."trip_schedule_events"
    ADD CONSTRAINT "trip_schedule_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trip_settings"
    ADD CONSTRAINT "trip_settings_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."trips"
    ADD CONSTRAINT "trips_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "public"."destinations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_activity_events"
    ADD CONSTRAINT "user_activity_events_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_activity_events"
    ADD CONSTRAINT "user_activity_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_content_overrides"
    ADD CONSTRAINT "user_content_overrides_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_content_overrides"
    ADD CONSTRAINT "user_content_overrides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."visited_places"
    ADD CONSTRAINT "visited_places_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE CASCADE;



CREATE POLICY "Users can delete own AI interaction events" ON "public"."ai_interaction_events" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own AI learning signals" ON "public"."ai_learning_signals" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own AI proposals" ON "public"."ai_action_proposals" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own AI usage" ON "public"."ai_usage_events" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own AI interaction events" ON "public"."ai_interaction_events" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own AI learning signals" ON "public"."ai_learning_signals" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own AI proposals" ON "public"."ai_action_proposals" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own AI interaction events" ON "public"."ai_interaction_events" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own AI learning signals" ON "public"."ai_learning_signals" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own AI proposals" ON "public"."ai_action_proposals" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own AI usage" ON "public"."ai_usage_events" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own AI learning signals" ON "public"."ai_learning_signals" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own AI proposals" ON "public"."ai_action_proposals" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."accommodations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "accommodations_trip_member_select" ON "public"."accommodations" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."trip_places" "tp"
  WHERE (("tp"."id" = "accommodations"."trip_place_id") AND "public"."luvia_is_trip_member"("tp"."trip_id")))));



CREATE POLICY "accommodations_trip_member_write" ON "public"."accommodations" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."trip_places" "tp"
  WHERE (("tp"."id" = "accommodations"."trip_place_id") AND "public"."luvia_is_trip_member"("tp"."trip_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."trip_places" "tp"
  WHERE (("tp"."id" = "accommodations"."trip_place_id") AND "public"."luvia_is_trip_member"("tp"."trip_id")))));



CREATE POLICY "activity own access" ON "public"."user_activity_events" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK ((("user_id" = "auth"."uid"()) AND (("trip_id" IS NULL) OR "public"."luvia_is_trip_member"("trip_id"))));



CREATE POLICY "ai usage own read" ON "public"."ai_usage" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."ai_action_proposals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_interaction_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_learning_signals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_usage_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "automation steps via job" ON "public"."automation_steps" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."automation_jobs" "j"
  WHERE (("j"."id" = "automation_steps"."job_id") AND ("j"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."automation_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."automation_steps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."budget_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."budget_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "co selection safe read" ON "public"."co_selection_aggregates" FOR SELECT TO "authenticated" USING (("sample_size" >= 10));



ALTER TABLE "public"."co_selection_aggregates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."custom_phrases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."custom_reminders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_member_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."day_closures" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."day_notes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "derived preferences own access" ON "public"."derived_user_preferences" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."derived_user_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."destinations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "destinations authenticated read" ON "public"."destinations" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."favorites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gallery_photos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "generated content member access" ON "public"."generated_content" TO "authenticated" USING ("public"."luvia_is_trip_member"("trip_id")) WITH CHECK ("public"."luvia_is_trip_member"("trip_id"));



ALTER TABLE "public"."generated_content" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "jobs own access" ON "public"."automation_jobs" TO "authenticated" USING ((("user_id" = "auth"."uid"()) AND "public"."luvia_is_trip_member"("trip_id"))) WITH CHECK ((("user_id" = "auth"."uid"()) AND "public"."luvia_is_trip_member"("trip_id")));



ALTER TABLE "public"."live_day_decisions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "live_day_decisions_member" ON "public"."live_day_decisions" USING ("public"."luvia_is_trip_member"("trip_id")) WITH CHECK (("public"."luvia_is_trip_member"("trip_id") AND ("user_id" = "auth"."uid"())));



ALTER TABLE "public"."live_day_snapshots" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "live_day_snapshots_member" ON "public"."live_day_snapshots" USING ("public"."luvia_is_trip_member"("trip_id")) WITH CHECK (("public"."luvia_is_trip_member"("trip_id") AND ("user_id" = "auth"."uid"())));



ALTER TABLE "public"."live_moment_status" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."live_moments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."location_samples" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "location_samples_member" ON "public"."location_samples" USING (("public"."luvia_is_trip_member"("trip_id") AND ("user_id" = "auth"."uid"()))) WITH CHECK (("public"."luvia_is_trip_member"("trip_id") AND ("user_id" = "auth"."uid"())));



ALTER TABLE "public"."media" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "media member access" ON "public"."media" TO "authenticated" USING ("public"."luvia_is_trip_member"("trip_id")) WITH CHECK ("public"."luvia_is_trip_member"("trip_id"));



CREATE POLICY "media pages via media" ON "public"."media_pages" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."media" "m"
  WHERE (("m"."id" = "media_pages"."media_id") AND "public"."luvia_is_trip_member"("m"."trip_id")))));



ALTER TABLE "public"."media_pages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "members add budget entries" ON "public"."budget_entries" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_trip_member"("trip_id") AND ("created_by" = "auth"."uid"())));



CREATE POLICY "members add budget settings" ON "public"."budget_settings" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members add custom phrases" ON "public"."custom_phrases" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_trip_member"("trip_id") AND ("created_by" = "auth"."uid"())));



CREATE POLICY "members add custom reminders" ON "public"."custom_reminders" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members add daily member stats" ON "public"."daily_member_stats" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members add day closures" ON "public"."day_closures" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members add day notes" ON "public"."day_notes" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_trip_member"("trip_id") AND ("created_by" = "auth"."uid"())));



CREATE POLICY "members add favorites" ON "public"."favorites" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_trip_member"("trip_id") AND ("created_by" = "auth"."uid"())));



CREATE POLICY "members add gallery photos" ON "public"."gallery_photos" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_trip_member"("trip_id") AND ("created_by" = "auth"."uid"())));



CREATE POLICY "members add live moment status" ON "public"."live_moment_status" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members add live moments" ON "public"."live_moments" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_trip_member"("trip_id") AND ("created_by" = "auth"."uid"())));



CREATE POLICY "members add reminder status" ON "public"."reminder_status" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members add visited places" ON "public"."visited_places" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_trip_member"("trip_id") AND ("created_by" = "auth"."uid"())));



CREATE POLICY "members can read memberships" ON "public"."trip_members" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_trip_member"("trip_id")));



CREATE POLICY "members delete budget entries" ON "public"."budget_entries" FOR DELETE TO "authenticated" USING ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members delete custom phrases" ON "public"."custom_phrases" FOR DELETE TO "authenticated" USING ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members delete custom reminders" ON "public"."custom_reminders" FOR DELETE TO "authenticated" USING ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members delete daily member stats" ON "public"."daily_member_stats" FOR DELETE TO "authenticated" USING ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members delete day closures" ON "public"."day_closures" FOR DELETE TO "authenticated" USING ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members delete day notes" ON "public"."day_notes" FOR DELETE TO "authenticated" USING ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members delete favorites" ON "public"."favorites" FOR DELETE TO "authenticated" USING ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members delete gallery photos" ON "public"."gallery_photos" FOR DELETE TO "authenticated" USING ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members delete live moment status" ON "public"."live_moment_status" FOR DELETE TO "authenticated" USING ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members delete live moments" ON "public"."live_moments" FOR DELETE TO "authenticated" USING ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members delete reminder status" ON "public"."reminder_status" FOR DELETE TO "authenticated" USING ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members delete visited places" ON "public"."visited_places" FOR DELETE TO "authenticated" USING ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members read budget entries" ON "public"."budget_entries" FOR SELECT TO "authenticated" USING ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members read budget settings" ON "public"."budget_settings" FOR SELECT TO "authenticated" USING ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members read custom phrases" ON "public"."custom_phrases" FOR SELECT TO "authenticated" USING ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members read custom reminders" ON "public"."custom_reminders" FOR SELECT TO "authenticated" USING ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members read daily member stats" ON "public"."daily_member_stats" FOR SELECT TO "authenticated" USING ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members read day closures" ON "public"."day_closures" FOR SELECT TO "authenticated" USING ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members read day notes" ON "public"."day_notes" FOR SELECT TO "authenticated" USING ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members read favorites" ON "public"."favorites" FOR SELECT TO "authenticated" USING ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members read gallery photos" ON "public"."gallery_photos" FOR SELECT TO "authenticated" USING ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members read live moment status" ON "public"."live_moment_status" FOR SELECT TO "authenticated" USING ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members read live moments" ON "public"."live_moments" FOR SELECT TO "authenticated" USING ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members read reminder status" ON "public"."reminder_status" FOR SELECT TO "authenticated" USING ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members read visited places" ON "public"."visited_places" FOR SELECT TO "authenticated" USING ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members update budget entries" ON "public"."budget_entries" FOR UPDATE TO "authenticated" USING ("public"."is_trip_member"("trip_id")) WITH CHECK ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members update budget settings" ON "public"."budget_settings" FOR UPDATE TO "authenticated" USING ("public"."is_trip_member"("trip_id")) WITH CHECK ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members update custom phrases" ON "public"."custom_phrases" FOR UPDATE TO "authenticated" USING ("public"."is_trip_member"("trip_id")) WITH CHECK ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members update custom reminders" ON "public"."custom_reminders" FOR UPDATE TO "authenticated" USING ("public"."is_trip_member"("trip_id")) WITH CHECK ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members update daily member stats" ON "public"."daily_member_stats" FOR UPDATE TO "authenticated" USING ("public"."is_trip_member"("trip_id")) WITH CHECK ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members update day closures" ON "public"."day_closures" FOR UPDATE TO "authenticated" USING ("public"."is_trip_member"("trip_id")) WITH CHECK ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members update day notes" ON "public"."day_notes" FOR UPDATE TO "authenticated" USING ("public"."is_trip_member"("trip_id")) WITH CHECK ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members update favorites" ON "public"."favorites" FOR UPDATE TO "authenticated" USING ("public"."is_trip_member"("trip_id")) WITH CHECK ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members update gallery photos" ON "public"."gallery_photos" FOR UPDATE TO "authenticated" USING ("public"."is_trip_member"("trip_id")) WITH CHECK ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members update live moment status" ON "public"."live_moment_status" FOR UPDATE TO "authenticated" USING ("public"."is_trip_member"("trip_id")) WITH CHECK ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members update live moments" ON "public"."live_moments" FOR UPDATE TO "authenticated" USING ("public"."is_trip_member"("trip_id")) WITH CHECK ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members update reminder status" ON "public"."reminder_status" FOR UPDATE TO "authenticated" USING ("public"."is_trip_member"("trip_id")) WITH CHECK ("public"."is_trip_member"("trip_id"));



CREATE POLICY "members update visited places" ON "public"."visited_places" FOR UPDATE TO "authenticated" USING ("public"."is_trip_member"("trip_id")) WITH CHECK ("public"."is_trip_member"("trip_id"));



ALTER TABLE "public"."modules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "modules authenticated read" ON "public"."modules" FOR SELECT TO "authenticated" USING (("is_active" = true));



CREATE POLICY "overrides own access" ON "public"."user_content_overrides" TO "authenticated" USING (("public"."luvia_is_trip_member"("trip_id") AND ("user_id" = "auth"."uid"()))) WITH CHECK (("public"."luvia_is_trip_member"("trip_id") AND ("user_id" = "auth"."uid"())));



CREATE POLICY "owners can update trips" ON "public"."trips" FOR UPDATE TO "authenticated" USING (("owner" = "auth"."uid"())) WITH CHECK (("owner" = "auth"."uid"()));



CREATE POLICY "paris_activity_realtime_select" ON "public"."paris_member_activity_feed" FOR SELECT USING ("public"."paris_is_trip_member"("trip_id"));



ALTER TABLE "public"."paris_member_activity_feed" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."paris_member_locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."paris_member_presence" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."paris_member_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "paris_presence_realtime_select" ON "public"."paris_member_presence" FOR SELECT USING ("public"."paris_is_trip_member"("trip_id"));



ALTER TABLE "public"."phrase_favorites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."place_lifecycle_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "place_lifecycle_history_member_insert" ON "public"."place_lifecycle_history" FOR INSERT TO "authenticated" WITH CHECK (("public"."luvia_is_trip_member"("trip_id") AND ("actor_user_id" = "auth"."uid"())));



CREATE POLICY "place_lifecycle_history_member_select" ON "public"."place_lifecycle_history" FOR SELECT TO "authenticated" USING ("public"."luvia_is_trip_member"("trip_id"));



ALTER TABLE "public"."place_recommendation_feedback" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "place_recommendation_feedback_member_insert" ON "public"."place_recommendation_feedback" FOR INSERT TO "authenticated" WITH CHECK (("public"."luvia_is_trip_member"("trip_id") AND ("actor_user_id" = "auth"."uid"())));



CREATE POLICY "place_recommendation_feedback_member_select" ON "public"."place_recommendation_feedback" FOR SELECT TO "authenticated" USING ("public"."luvia_is_trip_member"("trip_id"));



ALTER TABLE "public"."place_visits" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "place_visits_trip_member_select" ON "public"."place_visits" FOR SELECT TO "authenticated" USING ("public"."luvia_is_trip_member"("trip_id"));



CREATE POLICY "place_visits_trip_member_write" ON "public"."place_visits" TO "authenticated" USING ("public"."luvia_is_trip_member"("trip_id")) WITH CHECK ("public"."luvia_is_trip_member"("trip_id"));



ALTER TABLE "public"."places" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "places authenticated read" ON "public"."places" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "popularity safe read" ON "public"."popularity_aggregates" FOR SELECT TO "authenticated" USING (("sample_size" >= 10));



ALTER TABLE "public"."popularity_aggregates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."provider_cache" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "recommendation events own insert" ON "public"."recommendation_events" FOR INSERT TO "authenticated" WITH CHECK (("public"."luvia_is_trip_member"("trip_id") AND ("user_id" = "auth"."uid"())));



ALTER TABLE "public"."recommendation_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recommendation_instances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recommendation_memory" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recommendation_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recommendations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "recommendations own read" ON "public"."recommendations" FOR SELECT TO "authenticated" USING (("public"."luvia_is_trip_member"("trip_id") AND (("user_id" IS NULL) OR ("user_id" = "auth"."uid"()))));



ALTER TABLE "public"."reminder_status" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."restaurants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "restaurants via trip place" ON "public"."restaurants" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."trip_places" "tp"
  WHERE (("tp"."id" = "restaurants"."trip_place_id") AND "public"."luvia_is_trip_member"("tp"."trip_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."trip_places" "tp"
  WHERE (("tp"."id" = "restaurants"."trip_place_id") AND "public"."luvia_is_trip_member"("tp"."trip_id")))));



ALTER TABLE "public"."timeline_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "timeline_events_trip_member_select" ON "public"."timeline_events" FOR SELECT TO "authenticated" USING ("public"."luvia_is_trip_member"("trip_id"));



CREATE POLICY "timeline_events_trip_member_write" ON "public"."timeline_events" TO "authenticated" USING ("public"."luvia_is_trip_member"("trip_id")) WITH CHECK ("public"."luvia_is_trip_member"("trip_id"));



CREATE POLICY "trip members can read trips" ON "public"."trips" FOR SELECT TO "authenticated" USING ((("owner" = "auth"."uid"()) OR "public"."is_trip_member"("id")));



CREATE POLICY "trip members read activity" ON "public"."trip_activity_events" FOR SELECT TO "authenticated" USING ("public"."luvia_is_trip_member"("trip_id", "auth"."uid"()));



CREATE POLICY "trip members read presence" ON "public"."trip_presence" FOR SELECT TO "authenticated" USING ("public"."luvia_is_trip_member"("trip_id", "auth"."uid"()));



CREATE POLICY "trip members read recommendation events" ON "public"."recommendation_events" FOR SELECT TO "authenticated" USING ("public"."luvia_is_trip_member"("trip_id", "auth"."uid"()));



CREATE POLICY "trip members read recommendations" ON "public"."recommendation_instances" FOR SELECT TO "authenticated" USING ("public"."luvia_is_trip_member"("trip_id", "auth"."uid"()));



CREATE POLICY "trip modules admin write" ON "public"."trip_modules" TO "authenticated" USING ("public"."luvia_is_trip_admin"("trip_id")) WITH CHECK ("public"."luvia_is_trip_admin"("trip_id"));



CREATE POLICY "trip modules member read" ON "public"."trip_modules" FOR SELECT TO "authenticated" USING ("public"."luvia_is_trip_member"("trip_id"));



CREATE POLICY "trip places member access" ON "public"."trip_places" TO "authenticated" USING ("public"."luvia_is_trip_member"("trip_id")) WITH CHECK ("public"."luvia_is_trip_member"("trip_id"));



CREATE POLICY "trip preferences member read" ON "public"."trip_preferences" FOR SELECT TO "authenticated" USING ("public"."luvia_is_trip_member"("trip_id"));



CREATE POLICY "trip preferences own write" ON "public"."trip_preferences" TO "authenticated" USING (("public"."luvia_is_trip_member"("trip_id") AND (("user_id" IS NULL) OR ("user_id" = "auth"."uid"())))) WITH CHECK (("public"."luvia_is_trip_member"("trip_id") AND (("user_id" IS NULL) OR ("user_id" = "auth"."uid"()))));



ALTER TABLE "public"."trip_activity_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trip_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trip_module_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trip_modules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trip_place_data" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "trip_place_data_member_select" ON "public"."trip_place_data" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."trip_members" "tm"
  WHERE (("tm"."trip_id" = "trip_place_data"."trip_id") AND ("tm"."user_id" = "auth"."uid"())))));



CREATE POLICY "trip_place_data_member_write" ON "public"."trip_place_data" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."trip_members" "tm"
  WHERE (("tm"."trip_id" = "trip_place_data"."trip_id") AND ("tm"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."trip_members" "tm"
  WHERE (("tm"."trip_id" = "trip_place_data"."trip_id") AND ("tm"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."trip_places" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trip_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trip_presence" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trip_schedule_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "trip_schedule_events_member_delete" ON "public"."trip_schedule_events" FOR DELETE USING ("public"."luvia_is_trip_member"("trip_id", "auth"."uid"()));



CREATE POLICY "trip_schedule_events_member_insert" ON "public"."trip_schedule_events" FOR INSERT WITH CHECK (("public"."luvia_is_trip_member"("trip_id", "auth"."uid"()) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "trip_schedule_events_member_select" ON "public"."trip_schedule_events" FOR SELECT USING ("public"."luvia_is_trip_member"("trip_id", "auth"."uid"()));



CREATE POLICY "trip_schedule_events_member_update" ON "public"."trip_schedule_events" FOR UPDATE USING ("public"."luvia_is_trip_member"("trip_id", "auth"."uid"())) WITH CHECK ("public"."luvia_is_trip_member"("trip_id", "auth"."uid"()));



ALTER TABLE "public"."trip_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."trips" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_activity_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_content_overrides" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_profiles_insert_own" ON "public"."user_profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "user_profiles_select_own" ON "public"."user_profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "user_profiles_update_own" ON "public"."user_profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "users add own phrase favorites" ON "public"."phrase_favorites" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_trip_member"("trip_id") AND ("user_id" = "auth"."uid"())));



CREATE POLICY "users can delete own membership" ON "public"."trip_members" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "users can update own membership" ON "public"."trip_members" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "users create recommendation events" ON "public"."recommendation_events" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND "public"."luvia_is_trip_member"("trip_id", "auth"."uid"())));



CREATE POLICY "users delete own phrase favorites" ON "public"."phrase_favorites" FOR DELETE TO "authenticated" USING (("public"."is_trip_member"("trip_id") AND ("user_id" = "auth"."uid"())));



CREATE POLICY "users manage own presence" ON "public"."trip_presence" TO "authenticated" USING ((("user_id" = "auth"."uid"()) AND "public"."luvia_is_trip_member"("trip_id", "auth"."uid"()))) WITH CHECK ((("user_id" = "auth"."uid"()) AND "public"."luvia_is_trip_member"("trip_id", "auth"."uid"())));



CREATE POLICY "users manage own recommendation memory" ON "public"."recommendation_memory" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "users manage own recommendation settings" ON "public"."recommendation_settings" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "users manage recommendation decisions" ON "public"."recommendation_instances" TO "authenticated" USING ((("user_id" = "auth"."uid"()) AND "public"."luvia_is_trip_member"("trip_id", "auth"."uid"()))) WITH CHECK ((("user_id" = "auth"."uid"()) AND "public"."luvia_is_trip_member"("trip_id", "auth"."uid"())));



CREATE POLICY "users read own phrase favorites" ON "public"."phrase_favorites" FOR SELECT TO "authenticated" USING (("public"."is_trip_member"("trip_id") AND ("user_id" = "auth"."uid"())));



ALTER TABLE "public"."visited_places" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."budget_entries";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."budget_settings";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."custom_phrases";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."custom_reminders";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."daily_member_stats";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."day_closures";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."day_notes";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."favorites";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."gallery_photos";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."live_moment_status";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."live_moments";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."paris_member_activity_feed";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."paris_member_presence";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."phrase_favorites";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."place_visits";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."recommendation_events";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."reminder_status";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."timeline_events";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."trip_activity_events";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."trip_members";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."trip_place_data";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."trip_presence";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."trip_schedule_events";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."visited_places";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."create_trip_with_code"("trip_name" "text", "trip_code" "text", "owner_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_trip_with_code"("trip_name" "text", "trip_code" "text", "owner_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_trip_with_code"("trip_name" "text", "trip_code" "text", "owner_name" "text") TO "anon";



REVOKE ALL ON FUNCTION "public"."is_trip_member"("check_trip_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_trip_member"("check_trip_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."join_trip_by_code"("join_code" "text", "member_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."join_trip_by_code"("join_code" "text", "member_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."join_trip_by_code"("join_code" "text", "member_name" "text") TO "anon";



GRANT ALL ON FUNCTION "public"."luvia_clear_restaurants"("p_trip_id" "uuid", "p_scope" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."luvia_core_v2_database_status"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."luvia_core_v2_permission_status"("p_trip_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."luvia_decide_recommendation"("p_id" "uuid", "p_trip_id" "uuid", "p_status" "text", "p_reason" "text", "p_action" "text", "p_context" "jsonb") TO "authenticated";



GRANT ALL ON FUNCTION "public"."luvia_delete_schedule_event"("p_trip_id" "uuid", "p_source_key" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."luvia_ensure_user_profile"("p_user_id" "uuid") FROM PUBLIC;



GRANT ALL ON FUNCTION "public"."luvia_finalize_trip_creation"("p_trip_id" "uuid", "p_trip_name" "text", "p_destination_context" "jsonb", "p_symbol" "text", "p_accent" "text", "p_start_date" "date", "p_end_date" "date") TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_profiles" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_profiles" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_profiles" TO "service_role";



REVOKE ALL ON FUNCTION "public"."luvia_get_my_profile"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."luvia_get_my_profile"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."luvia_get_trip_modules"("p_trip_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."luvia_handle_new_auth_user_profile"() FROM PUBLIC;



GRANT ALL ON FUNCTION "public"."luvia_import_place_entity"("p_trip_id" "uuid", "p_place" "jsonb", "p_trip_place" "jsonb", "p_extension" "jsonb") TO "authenticated";



GRANT ALL ON FUNCTION "public"."luvia_import_restaurant_entity"("p_trip_id" "uuid", "p_place" "jsonb", "p_trip_place" "jsonb", "p_restaurant" "jsonb") TO "authenticated";



GRANT ALL ON FUNCTION "public"."luvia_is_trip_admin"("p_trip_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."luvia_is_trip_member"("p_trip_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."luvia_is_trip_member"("p_trip_id" "uuid", "p_user_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."luvia_join_trip_by_code"("p_join_code" "text", "p_display_name" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."luvia_list_archived_restaurant_entities"("p_trip_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."luvia_list_place_entities"("p_trip_id" "uuid", "p_primary_type" "text", "p_role" "text", "p_status" "text") TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."recommendation_events" TO "anon";
GRANT ALL ON TABLE "public"."recommendation_events" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."recommendation_events" TO "service_role";



GRANT ALL ON FUNCTION "public"."luvia_list_recommendation_events"("p_trip_id" "uuid", "p_limit" integer) TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."recommendation_instances" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."recommendation_instances" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."recommendation_instances" TO "service_role";



GRANT ALL ON FUNCTION "public"."luvia_list_recommendations"("p_trip_id" "uuid", "p_module" "text", "p_limit" integer) TO "authenticated";



GRANT ALL ON FUNCTION "public"."luvia_list_restaurant_entities"("p_trip_id" "uuid") TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trip_schedule_events" TO "anon";
GRANT ALL ON TABLE "public"."trip_schedule_events" TO "authenticated";
GRANT ALL ON TABLE "public"."trip_schedule_events" TO "service_role";



GRANT ALL ON FUNCTION "public"."luvia_list_schedule_events"("p_trip_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."luvia_list_trip_activity"("p_trip_id" "uuid", "p_limit" integer) TO "authenticated";



GRANT ALL ON FUNCTION "public"."luvia_list_trip_members"("p_trip_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."luvia_list_trip_presence"("p_trip_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."luvia_presence_heartbeat"("p_trip_id" "uuid", "p_device_id" "text", "p_display_name" "text", "p_current_view" "text", "p_metadata" "jsonb") TO "authenticated";



GRANT ALL ON FUNCTION "public"."luvia_presence_leave"("p_trip_id" "uuid", "p_device_id" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."luvia_preview_trip_invite"("p_join_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."luvia_preview_trip_invite"("p_join_code" "text") TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."ai_learning_signals" TO "anon";
GRANT ALL ON TABLE "public"."ai_learning_signals" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_learning_signals" TO "service_role";



REVOKE ALL ON FUNCTION "public"."luvia_record_ai_learning_signal"("p_trip_id" "uuid", "p_scope_key" "text", "p_signal_key" "text", "p_category" "text", "p_value" "jsonb", "p_confidence" numeric, "p_source_summary" "jsonb", "p_status" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."luvia_record_ai_learning_signal"("p_trip_id" "uuid", "p_scope_key" "text", "p_signal_key" "text", "p_category" "text", "p_value" "jsonb", "p_confidence" numeric, "p_source_summary" "jsonb", "p_status" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."luvia_record_place_recommendation_feedback"("p_trip_id" "uuid", "p_place_id" "uuid", "p_provider_place_id" "text", "p_decision" "text", "p_match_score" smallint, "p_reasons" "jsonb", "p_context" "jsonb") TO "authenticated";



GRANT ALL ON FUNCTION "public"."luvia_record_recommendation_event"("p_event" "jsonb") TO "authenticated";



GRANT ALL ON FUNCTION "public"."luvia_record_trip_activity"("p_trip_id" "uuid", "p_event_type" "text", "p_title" "text", "p_body" "text", "p_entity_type" "text", "p_entity_id" "text", "p_metadata" "jsonb") TO "authenticated";



GRANT ALL ON FUNCTION "public"."luvia_remove_place_from_trip"("p_trip_id" "uuid", "p_trip_place_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."luvia_remove_restaurant_from_trip"("p_trip_id" "uuid", "p_trip_place_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."luvia_reset_recommendation_learning"("p_trip_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."luvia_restaurant_entity_schema_status"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."luvia_restaurant_entity_schema_status"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."luvia_restaurant_import_status"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."luvia_save_trip_profile"("p_trip_id" "uuid", "p_trip_name" "text", "p_destination_context" "jsonb", "p_symbol" "text", "p_accent" "text", "p_start_date" "date", "p_end_date" "date") TO "authenticated";



GRANT ALL ON FUNCTION "public"."luvia_set_trip_modules"("p_trip_id" "uuid", "p_modules" "jsonb", "p_settings" "jsonb") TO "authenticated";



GRANT ALL ON FUNCTION "public"."luvia_store_recommendation"("p_item" "jsonb") TO "authenticated";



GRANT ALL ON FUNCTION "public"."luvia_update_place_lifecycle"("p_trip_id" "uuid", "p_trip_place_id" "uuid", "p_status" "text", "p_patch" "jsonb") TO "authenticated";



GRANT ALL ON FUNCTION "public"."luvia_update_restaurant_lifecycle"("p_trip_id" "uuid", "p_trip_place_id" "uuid", "p_status" "text", "p_patch" "jsonb") TO "authenticated";



GRANT ALL ON FUNCTION "public"."luvia_update_trip_details"("p_trip_id" "uuid", "p_trip_name" "text", "p_destination_context" "jsonb", "p_symbol" "text", "p_accent" "text", "p_start_date" "date", "p_end_date" "date") TO "authenticated";



GRANT ALL ON FUNCTION "public"."luvia_upsert_accommodation"("p_trip_id" "uuid", "p_trip_place_id" "uuid", "p_status" "text", "p_accommodation" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."luvia_upsert_my_profile"("p_display_name" "text", "p_first_name" "text", "p_last_name" "text", "p_avatar_url" "text", "p_avatar_color" "text", "p_language" "text", "p_timezone" "text", "p_home_location" "text", "p_dietary_preferences" "jsonb", "p_travel_preferences" "jsonb", "p_theme_mode" "text", "p_active_trip_id" "uuid", "p_settings" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."luvia_upsert_my_profile"("p_display_name" "text", "p_first_name" "text", "p_last_name" "text", "p_avatar_url" "text", "p_avatar_color" "text", "p_language" "text", "p_timezone" "text", "p_home_location" "text", "p_dietary_preferences" "jsonb", "p_travel_preferences" "jsonb", "p_theme_mode" "text", "p_active_trip_id" "uuid", "p_settings" "jsonb") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."luvia_upsert_my_profile_v2"("p_display_name" "text", "p_first_name" "text", "p_last_name" "text", "p_avatar_url" "text", "p_avatar_color" "text", "p_language" "text", "p_timezone" "text", "p_home_location" "text", "p_dietary_preferences" "text"[], "p_travel_interests" "text"[], "p_travel_styles" "text"[], "p_activity_preferences" "text"[], "p_entertainment_preferences" "text"[], "p_dining_preferences" "text"[], "p_mobility_preferences" "text"[], "p_atmosphere_preferences" "text"[], "p_travel_pace" "text", "p_budget_preference" "text", "p_family_preferences" "jsonb", "p_accessibility_preferences" "jsonb", "p_preference_schema_version" integer, "p_preferences_completed_at" timestamp with time zone, "p_preferences_updated_at" timestamp with time zone, "p_legacy_travel_preferences" "jsonb", "p_theme_mode" "text", "p_active_trip_id" "uuid", "p_settings" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."luvia_upsert_my_profile_v2"("p_display_name" "text", "p_first_name" "text", "p_last_name" "text", "p_avatar_url" "text", "p_avatar_color" "text", "p_language" "text", "p_timezone" "text", "p_home_location" "text", "p_dietary_preferences" "text"[], "p_travel_interests" "text"[], "p_travel_styles" "text"[], "p_activity_preferences" "text"[], "p_entertainment_preferences" "text"[], "p_dining_preferences" "text"[], "p_mobility_preferences" "text"[], "p_atmosphere_preferences" "text"[], "p_travel_pace" "text", "p_budget_preference" "text", "p_family_preferences" "jsonb", "p_accessibility_preferences" "jsonb", "p_preference_schema_version" integer, "p_preferences_completed_at" timestamp with time zone, "p_preferences_updated_at" timestamp with time zone, "p_legacy_travel_preferences" "jsonb", "p_theme_mode" "text", "p_active_trip_id" "uuid", "p_settings" "jsonb") TO "authenticated";



GRANT ALL ON FUNCTION "public"."luvia_upsert_schedule_event"("p_trip_id" "uuid", "p_event" "jsonb") TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trip_place_data" TO "anon";
GRANT ALL ON TABLE "public"."trip_place_data" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trip_place_data" TO "service_role";



GRANT ALL ON FUNCTION "public"."luvia_upsert_trip_place_fields"("p_trip_id" "uuid", "p_trip_place_id" "uuid", "p_place_id" "uuid", "p_place_type" "text", "p_fields" "jsonb") TO "authenticated";



GRANT ALL ON FUNCTION "public"."luvia_verify_place_backend"("p_trip_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."paris_add_member_activity"("p_trip_id" "uuid", "p_member_name" "text", "p_activity_key" "text", "p_activity_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."paris_add_member_activity"("p_trip_id" "uuid", "p_member_name" "text", "p_activity_key" "text", "p_activity_text" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."paris_claim_unowned_trip"("p_trip_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."paris_delete_empty_trip"("p_trip_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."paris_delete_empty_trip"("p_trip_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."paris_delete_trip"("p_trip_id" "uuid", "p_confirmation" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."paris_is_trip_member"("p_trip_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."paris_is_trip_member"("p_trip_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."paris_is_trip_owner"("p_trip_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."paris_leave_trip"("p_trip_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."paris_leave_trip"("p_trip_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."paris_list_activity_events"("p_trip_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."paris_list_activity_events"("p_trip_id" "uuid", "p_limit" integer) TO "authenticated";



GRANT ALL ON FUNCTION "public"."paris_list_member_activity"("p_trip_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."paris_list_member_activity"("p_trip_id" "uuid", "p_limit" integer) TO "authenticated";



GRANT ALL ON FUNCTION "public"."paris_list_my_trips"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."paris_list_participants"("p_trip_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."paris_list_participants"("p_trip_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."paris_rename_trip"("p_trip_id" "uuid", "p_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."paris_rename_trip"("p_trip_id" "uuid", "p_name" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."paris_track_event"("p_trip_id" "uuid", "p_member_name" "text", "p_event_type" "text", "p_category" "text", "p_activity_text" "text", "p_icon" "text", "p_metadata" "jsonb", "p_aggregate_key" "text", "p_aggregate_window_seconds" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."paris_track_event"("p_trip_id" "uuid", "p_member_name" "text", "p_event_type" "text", "p_category" "text", "p_activity_text" "text", "p_icon" "text", "p_metadata" "jsonb", "p_aggregate_key" "text", "p_aggregate_window_seconds" integer) TO "authenticated";



GRANT ALL ON FUNCTION "public"."paris_update_member_location"("p_trip_id" "uuid", "p_member_name" "text", "p_latitude" double precision, "p_longitude" double precision, "p_accuracy" double precision, "p_heading" double precision, "p_speed" double precision, "p_place_label" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."paris_update_member_location"("p_trip_id" "uuid", "p_member_name" "text", "p_latitude" double precision, "p_longitude" double precision, "p_accuracy" double precision, "p_heading" double precision, "p_speed" double precision, "p_place_label" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."paris_update_presence"("p_trip_id" "uuid", "p_device_id" "text", "p_member_name" "text", "p_device_type" "text", "p_platform" "text", "p_activity_key" "text", "p_activity_text" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."paris_update_presence"("p_trip_id" "uuid", "p_device_id" "text", "p_member_name" "text", "p_device_type" "text", "p_platform" "text", "p_activity_key" "text", "p_activity_text" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."paris_upsert_member_profile"("p_trip_id" "uuid", "p_member_name" "text", "p_avatar_data" "text", "p_avatar_color" "text", "p_location_sharing" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."paris_upsert_member_profile"("p_trip_id" "uuid", "p_member_name" "text", "p_avatar_data" "text", "p_avatar_color" "text", "p_location_sharing" boolean) TO "authenticated";


















GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."accommodations" TO "anon";
GRANT ALL ON TABLE "public"."accommodations" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."accommodations" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."ai_action_proposals" TO "anon";
GRANT ALL ON TABLE "public"."ai_action_proposals" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_action_proposals" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."ai_interaction_events" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."ai_interaction_events" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_interaction_events" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."ai_usage" TO "anon";
GRANT ALL ON TABLE "public"."ai_usage" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."ai_usage" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."ai_usage_events" TO "anon";
GRANT SELECT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."ai_usage_events" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_usage_events" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."automation_jobs" TO "anon";
GRANT ALL ON TABLE "public"."automation_jobs" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."automation_jobs" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."automation_steps" TO "anon";
GRANT ALL ON TABLE "public"."automation_steps" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."automation_steps" TO "service_role";



GRANT ALL ON TABLE "public"."budget_entries" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."budget_entries" TO "service_role";



GRANT ALL ON TABLE "public"."budget_settings" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."budget_settings" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."co_selection_aggregates" TO "anon";
GRANT ALL ON TABLE "public"."co_selection_aggregates" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."co_selection_aggregates" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."custom_phrases" TO "anon";
GRANT ALL ON TABLE "public"."custom_phrases" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."custom_phrases" TO "service_role";



GRANT ALL ON TABLE "public"."custom_reminders" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."custom_reminders" TO "service_role";



GRANT ALL ON TABLE "public"."daily_member_stats" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."daily_member_stats" TO "service_role";



GRANT ALL ON TABLE "public"."day_closures" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."day_closures" TO "service_role";



GRANT ALL ON TABLE "public"."day_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."day_notes" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."derived_user_preferences" TO "anon";
GRANT ALL ON TABLE "public"."derived_user_preferences" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."derived_user_preferences" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."destinations" TO "anon";
GRANT ALL ON TABLE "public"."destinations" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."destinations" TO "service_role";



GRANT ALL ON TABLE "public"."favorites" TO "authenticated";
GRANT ALL ON TABLE "public"."favorites" TO "service_role";



GRANT ALL ON TABLE "public"."gallery_photos" TO "anon";
GRANT ALL ON TABLE "public"."gallery_photos" TO "authenticated";
GRANT ALL ON TABLE "public"."gallery_photos" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."generated_content" TO "anon";
GRANT ALL ON TABLE "public"."generated_content" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."generated_content" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."live_day_decisions" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."live_day_decisions" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."live_day_decisions" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."live_day_snapshots" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."live_day_snapshots" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."live_day_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."live_moment_status" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."live_moment_status" TO "service_role";



GRANT ALL ON TABLE "public"."live_moments" TO "anon";
GRANT ALL ON TABLE "public"."live_moments" TO "authenticated";
GRANT ALL ON TABLE "public"."live_moments" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."location_samples" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."location_samples" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."location_samples" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."media" TO "anon";
GRANT ALL ON TABLE "public"."media" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."media" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."media_pages" TO "anon";
GRANT ALL ON TABLE "public"."media_pages" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."media_pages" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."modules" TO "anon";
GRANT ALL ON TABLE "public"."modules" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."modules" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."paris_member_activity_feed" TO "service_role";
GRANT SELECT ON TABLE "public"."paris_member_activity_feed" TO "authenticated";
GRANT SELECT ON TABLE "public"."paris_member_activity_feed" TO "anon";



GRANT SELECT,USAGE ON SEQUENCE "public"."paris_member_activity_feed_id_seq" TO "authenticated";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."paris_member_locations" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."paris_member_presence" TO "service_role";
GRANT SELECT ON TABLE "public"."paris_member_presence" TO "authenticated";
GRANT SELECT ON TABLE "public"."paris_member_presence" TO "anon";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."paris_member_profiles" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."phrase_favorites" TO "anon";
GRANT ALL ON TABLE "public"."phrase_favorites" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."phrase_favorites" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."place_lifecycle_history" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."place_lifecycle_history" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."place_lifecycle_history" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."place_recommendation_feedback" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."place_recommendation_feedback" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."place_recommendation_feedback" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."place_visits" TO "anon";
GRANT ALL ON TABLE "public"."place_visits" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."place_visits" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."places" TO "anon";
GRANT ALL ON TABLE "public"."places" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."places" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."popularity_aggregates" TO "anon";
GRANT ALL ON TABLE "public"."popularity_aggregates" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."popularity_aggregates" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."provider_cache" TO "anon";
GRANT ALL ON TABLE "public"."provider_cache" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."provider_cache" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."recommendation_memory" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."recommendation_memory" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."recommendation_memory" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."recommendation_settings" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."recommendation_settings" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."recommendation_settings" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."recommendations" TO "anon";
GRANT ALL ON TABLE "public"."recommendations" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."recommendations" TO "service_role";



GRANT ALL ON TABLE "public"."reminder_status" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."reminder_status" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."restaurants" TO "anon";
GRANT ALL ON TABLE "public"."restaurants" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."restaurants" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."timeline_events" TO "anon";
GRANT ALL ON TABLE "public"."timeline_events" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."timeline_events" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trip_activity_events" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trip_activity_events" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trip_activity_events" TO "service_role";



GRANT ALL ON TABLE "public"."trip_members" TO "anon";
GRANT ALL ON TABLE "public"."trip_members" TO "authenticated";
GRANT ALL ON TABLE "public"."trip_members" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trip_module_settings" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trip_modules" TO "anon";
GRANT ALL ON TABLE "public"."trip_modules" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trip_modules" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trip_places" TO "anon";
GRANT ALL ON TABLE "public"."trip_places" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trip_places" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trip_preferences" TO "anon";
GRANT ALL ON TABLE "public"."trip_preferences" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trip_preferences" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trip_presence" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trip_presence" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trip_presence" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."trip_settings" TO "service_role";



GRANT ALL ON TABLE "public"."trips" TO "anon";
GRANT ALL ON TABLE "public"."trips" TO "authenticated";
GRANT ALL ON TABLE "public"."trips" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_activity_events" TO "anon";
GRANT ALL ON TABLE "public"."user_activity_events" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_activity_events" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_content_overrides" TO "anon";
GRANT ALL ON TABLE "public"."user_content_overrides" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."user_content_overrides" TO "service_role";



GRANT ALL ON TABLE "public"."visited_places" TO "anon";
GRANT ALL ON TABLE "public"."visited_places" TO "authenticated";
GRANT ALL ON TABLE "public"."visited_places" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "service_role";



































