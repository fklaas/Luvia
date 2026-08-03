-- Luvia Intelligence Core V2.12.2
-- Restaurant Entity Pipeline – Datenbankschema
-- Idempotente Ergänzung der bestehenden places -> trip_places -> restaurants Struktur.

begin;

-- Reisespezifische Planung direkt an der Place-Verknüpfung -----------------
alter table public.trip_places
  add column if not exists planned_date date,
  add column if not exists planned_time time without time zone;

-- Restaurant-spezifische, vom Nutzer verwaltete Daten ----------------------
alter table public.restaurants
  add column if not exists reservation_name text,
  add column if not exists reservation_url text,
  add column if not exists reservation_notes text,
  add column if not exists menu_url text;

-- Dokumentation der Datenverantwortung -------------------------------------
comment on column public.trip_places.planned_date is
  'Vom Nutzer gepflegter geplanter Reisetag. Darf nicht durch Provider-Synchronisierung überschrieben werden.';
comment on column public.trip_places.planned_time is
  'Vom Nutzer gepflegte geplante Uhrzeit. Darf nicht durch Provider-Synchronisierung überschrieben werden.';
comment on column public.restaurants.reservation_name is
  'Name, auf den die Reservierung läuft. Nutzerdaten.';
comment on column public.restaurants.reservation_url is
  'Reservierungs- oder Verwaltungslink. Nutzerdaten.';
comment on column public.restaurants.reservation_notes is
  'Persönliche Hinweise zur Reservierung. Nutzerdaten.';
comment on column public.restaurants.menu_url is
  'Vom Nutzer oder Luvia bestätigter Link zur Speisekarte.';

-- Abfrageindizes für Timeline, Restaurantliste und Reservierungen ----------
create index if not exists trip_places_trip_planned_idx
  on public.trip_places(trip_id, planned_date, planned_time)
  where planned_date is not null;

create index if not exists restaurants_reservation_idx
  on public.restaurants(reservation_date, reservation_time)
  where reservation_date is not null;

create index if not exists restaurants_status_idx
  on public.restaurants(reservation_status, visited);

-- RLS muss auch nach älteren oder teilweise ausgeführten Installationen an sein.
alter table public.places enable row level security;
alter table public.trip_places enable row level security;
alter table public.restaurants enable row level security;

-- Die bestehenden Policies werden bewusst nicht gelockert:
-- places: authentifizierte Nutzer dürfen globale Provider-Daten nur lesen.
-- trip_places/restaurants: Zugriff ausschließlich über Reisemitgliedschaft.

-- Diagnosefunktion für V2.12.2 ---------------------------------------------
create or replace function public.luvia_restaurant_entity_schema_status()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
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

revoke all on function public.luvia_restaurant_entity_schema_status() from public;
grant execute on function public.luvia_restaurant_entity_schema_status() to authenticated;

commit;
