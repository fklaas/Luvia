-- Luvia Core v2.12.4.12
-- Realtime-/Favoritenrechte, robuste Besitzererkennung und vollständiges Löschen eigener Reisen.
begin;

grant usage on schema public to authenticated;

do $$
begin
  if to_regclass('public.favorites') is not null then
    grant select, insert, update, delete on table public.favorites to authenticated;
    revoke all on table public.favorites from anon;
  end if;
  if to_regclass('public.day_notes') is not null then
    grant select, insert, update, delete on table public.day_notes to authenticated;
    revoke all on table public.day_notes from anon;
  end if;
end $$;

create or replace function public.paris_is_trip_owner(p_trip_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_result boolean := false;
begin
  if v_uid is null or p_trip_id is null then return false; end if;

  if to_regclass('public.trip_members') is not null then
    execute $q$
      select exists (
        select 1 from public.trip_members tm
        where nullif(to_jsonb(tm)->>'trip_id','')::uuid = $1
          and nullif(to_jsonb(tm)->>'user_id','')::uuid = $2
          and lower(coalesce(to_jsonb(tm)->>'role','member')) in ('owner','admin','creator')
      )
    $q$ into v_result using p_trip_id, v_uid;
    if v_result then return true; end if;
  end if;

  if to_regclass('public.trips') is not null then
    execute $q$
      select exists (
        select 1 from public.trips t
        where t.id = $1 and (
          nullif(to_jsonb(t)->>'owner_id','')::uuid = $2 or
          nullif(to_jsonb(t)->>'created_by','')::uuid = $2 or
          nullif(to_jsonb(t)->>'user_id','')::uuid = $2
        )
      )
    $q$ into v_result using p_trip_id, v_uid;
  end if;
  return coalesce(v_result,false);
end;
$$;

grant execute on function public.paris_is_trip_owner(uuid) to authenticated;
revoke execute on function public.paris_is_trip_owner(uuid) from anon;

create or replace function public.paris_delete_trip(p_trip_id uuid, p_confirmation text)
returns jsonb
language plpgsql
security definer
set search_path = public, storage
as $$
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
$$;

grant execute on function public.paris_delete_trip(uuid,text) to authenticated;
revoke execute on function public.paris_delete_trip(uuid,text) from anon;
grant usage, select on all sequences in schema public to authenticated;
commit;
notify pgrst, 'reload schema';
