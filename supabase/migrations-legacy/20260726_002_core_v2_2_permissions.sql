-- Luvia Intelligence Core V2.2.1 – Berechtigungsfix
-- Nach der V2.1-Migration einmal vollständig im Supabase SQL Editor ausführen.
-- Ergänzt die fehlenden PostgreSQL-Tabellenrechte. RLS bleibt weiterhin aktiv
-- und entscheidet anschließend, welche Datensätze der angemeldete Nutzer sehen
-- oder verändern darf.

begin;

grant usage on schema public to authenticated;

-- Grundrechte für den Browser-Client. Ohne diese Rechte erreicht eine Anfrage
-- die RLS-Policies gar nicht und Supabase meldet "permission denied for table".
grant select, insert, update, delete on table
  public.destinations,
  public.trip_preferences,
  public.derived_user_preferences,
  public.modules,
  public.trip_modules,
  public.places,
  public.trip_places,
  public.restaurants,
  public.generated_content,
  public.user_content_overrides,
  public.media,
  public.media_pages,
  public.recommendations,
  public.recommendation_events,
  public.user_activity_events,
  public.popularity_aggregates,
  public.co_selection_aggregates,
  public.automation_jobs,
  public.automation_steps,
  public.provider_cache,
  public.ai_usage
  to authenticated;

-- Die RLS-Policies bleiben die eigentliche Sicherheitsgrenze. Tabellen ohne
-- passende Schreib-Policy bleiben trotz GRANT für Browser-Schreibzugriffe gesperrt.

create or replace function public.luvia_core_v2_permission_status(p_trip_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
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

grant execute on function public.luvia_core_v2_permission_status(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
