-- Luvia Intelligence Core V2.1 – Database Foundation
-- Im Supabase SQL Editor einmal vollständig ausführen.
-- Die Migration ergänzt die bestehende Luvia-Datenbank und ist wiederholt ausführbar.

create extension if not exists pgcrypto;

-- Gemeinsame Hilfsfunktionen -------------------------------------------------
create or replace function public.luvia_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create or replace function public.luvia_is_trip_member(p_trip_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (
    select 1 from public.trip_members tm
    where (to_jsonb(tm)->>'trip_id')::uuid = p_trip_id
      and (to_jsonb(tm)->>'user_id')::uuid = auth.uid()
  ) or exists (
    select 1 from public.trips t
    where t.id=p_trip_id and nullif(to_jsonb(t)->>'owner_id','')::uuid=auth.uid()
  );
$$;

create or replace function public.luvia_is_trip_admin(p_trip_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
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

grant execute on function public.luvia_is_trip_member(uuid) to authenticated;
grant execute on function public.luvia_is_trip_admin(uuid) to authenticated;

-- Profile um Datenschutz-/Empfehlungseinstellungen ergänzen ----------------
do $$ begin
  if to_regclass('public.profiles') is not null then
    alter table public.profiles add column if not exists recommendation_consent boolean not null default false;
    alter table public.profiles add column if not exists analytics_consent boolean not null default false;
    alter table public.profiles add column if not exists preferred_language text not null default 'de';
    alter table public.profiles add column if not exists updated_at timestamptz not null default now();
  end if;
end $$;

-- Reiseziel-Stammdaten -------------------------------------------------------
create table if not exists public.destinations (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'manual',
  provider_place_id text,
  name text not null,
  display_name text,
  country text,
  country_code text,
  latitude double precision,
  longitude double precision,
  timezone text,
  currency text,
  language_codes text[] not null default '{}',
  search_radius_meters integer not null default 30000 check(search_radius_meters between 1000 and 200000),
  source_data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, provider_place_id)
);

-- Bestehende trips behutsam erweitern ---------------------------------------
do $$ begin
  if to_regclass('public.trips') is not null then
    alter table public.trips add column if not exists destination_id uuid references public.destinations(id) on delete set null;
    alter table public.trips add column if not exists trip_type text;
    alter table public.trips add column if not exists accent_color text;
    alter table public.trips add column if not exists intelligence_version integer not null default 2;
    alter table public.trips add column if not exists sync_status text not null default 'synced';
    alter table public.trips add column if not exists updated_at timestamptz not null default now();
  end if;
end $$;

-- Präferenzen ---------------------------------------------------------------
create table if not exists public.trip_preferences (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  preference_key text not null,
  preference_value jsonb not null,
  source text not null default 'user' check(source in ('user','onboarding','behavior_inference','ai_inference','system')),
  confidence numeric(4,3) not null default 1 check(confidence between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(trip_id,user_id,preference_key)
);

create table if not exists public.derived_user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  preference_key text not null,
  preference_value jsonb not null,
  confidence numeric(4,3) not null default 0.5 check(confidence between 0 and 1),
  evidence_count integer not null default 1 check(evidence_count >= 0),
  evidence jsonb not null default '[]',
  status text not null default 'active' check(status in ('active','rejected','confirmed','expired')),
  first_detected_at timestamptz not null default now(),
  last_detected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,preference_key)
);

-- Module und Modulkonfiguration ---------------------------------------------
create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  module_key text not null unique,
  name text not null,
  version integer not null default 2,
  category text,
  is_active boolean not null default true,
  schema_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trip_modules (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  enabled boolean not null default true,
  position integer not null default 0,
  settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(trip_id,module_id)
);

-- Zentrale Orte -------------------------------------------------------------
create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'manual',
  provider_place_id text,
  name text not null,
  address text,
  latitude double precision,
  longitude double precision,
  maps_url text,
  website text,
  phone text,
  rating numeric(3,2),
  rating_count integer,
  price_level integer,
  categories text[] not null default '{}',
  attributes jsonb not null default '{}',
  opening_hours jsonb not null default '[]',
  raw_provider_data jsonb not null default '{}',
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider,provider_place_id)
);

create table if not exists public.trip_places (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  module_key text not null,
  status text not null default 'idea' check(status in ('idea','planned','reserved','visited','dismissed','archived')),
  position integer not null default 0,
  is_favorite boolean not null default false,
  user_notes text,
  custom_name text,
  custom_description text,
  custom_symbol text,
  created_by uuid references auth.users(id) on delete set null,
  sync_status text not null default 'synced' check(sync_status in ('synced','pending_upload','pending_update','conflict','failed','local_only')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(trip_id,place_id,module_key)
);

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  trip_place_id uuid not null unique references public.trip_places(id) on delete cascade,
  reservation_date date,
  reservation_time time,
  reservation_status text not null default 'idea' check(reservation_status in ('idea','requested','reserved','confirmed','cancelled','visited')),
  confirmation_number text,
  menu_status text not null default 'not_checked' check(menu_status in ('not_checked','searching','found','needs_upload','ready','failed')),
  personal_rating smallint check(personal_rating between 1 and 5),
  visited boolean not null default false,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- KI-Inhalte und Nutzerüberschreibungen -------------------------------------
create table if not exists public.generated_content (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  task_type text not null,
  content jsonb not null default '{}',
  model text,
  prompt_version text,
  confidence numeric(4,3) check(confidence between 0 and 1),
  source_data jsonb not null default '{}',
  status text not null default 'ready' check(status in ('draft','processing','ready','rejected','superseded','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_content_overrides (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id uuid,
  field_name text not null,
  value jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(trip_id,user_id,entity_type,entity_id,field_name)
);

-- Medien und PDF-Seiten -----------------------------------------------------
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  module_key text,
  entity_type text,
  entity_id uuid,
  type text not null check(type in ('image','pdf','video','audio','document')),
  purpose text,
  source text not null default 'user_upload' check(source in ('user_upload','remote_url','provider','generated')),
  original_name text,
  mime_type text,
  storage_path text,
  remote_url text,
  page_count integer,
  status text not null default 'pending' check(status in ('pending','processing','ready','failed','deleted')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media_pages (
  id uuid primary key default gen_random_uuid(),
  media_id uuid not null references public.media(id) on delete cascade,
  page_number integer not null check(page_number > 0),
  preview_path text,
  width integer,
  height integer,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique(media_id,page_number)
);

-- Empfehlungen und Aktivitätsereignisse -------------------------------------
create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  module_key text not null,
  entity_type text not null,
  entity_id uuid,
  recommendation_type text not null,
  reason_code text,
  reason_text text,
  score numeric(8,5) not null default 0,
  source text not null default 'rules',
  status text not null default 'new' check(status in ('new','shown','opened','accepted','dismissed','expired')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create table if not exists public.recommendation_events (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null references public.recommendations(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check(event_type in ('shown','clicked','accepted','dismissed','hidden','saved','removed_later','rated_positive','rated_negative')),
  event_data jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.user_activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete cascade,
  module_key text,
  entity_type text,
  entity_id uuid,
  event_type text not null,
  metadata jsonb not null default '{}',
  consent_scope text not null default 'functional' check(consent_scope in ('functional','analytics','recommendations')),
  created_at timestamptz not null default now()
);

create table if not exists public.popularity_aggregates (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid references public.destinations(id) on delete cascade,
  module_key text not null,
  entity_type text not null,
  entity_id uuid,
  traveler_segment text not null default 'all',
  selection_count integer not null default 0,
  favorite_count integer not null default 0,
  completion_count integer not null default 0,
  positive_rating_count integer not null default 0,
  negative_rating_count integer not null default 0,
  sample_size integer not null default 0,
  popularity_score numeric(8,5) not null default 0,
  updated_at timestamptz not null default now(),
  unique(destination_id,module_key,entity_type,entity_id,traveler_segment)
);

create table if not exists public.co_selection_aggregates (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid references public.destinations(id) on delete cascade,
  entity_type_a text not null,
  entity_id_a uuid not null,
  entity_type_b text not null,
  entity_id_b uuid not null,
  traveler_segment text not null default 'all',
  selection_count integer not null default 0,
  sample_size integer not null default 0,
  confidence numeric(4,3) not null default 0 check(confidence between 0 and 1),
  updated_at timestamptz not null default now(),
  unique(destination_id,entity_type_a,entity_id_a,entity_type_b,entity_id_b,traveler_segment)
);

-- Jobs, Cache und Kosten ----------------------------------------------------
create table if not exists public.automation_jobs (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  pipeline text not null,
  status text not null default 'idle' check(status in ('idle','loading','processing','ready','needs_confirmation','partial','failed','offline','cancelled')),
  input jsonb not null default '{}',
  result jsonb not null default '{}',
  error jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.automation_steps (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.automation_jobs(id) on delete cascade,
  step_key text not null,
  position integer not null default 0,
  status text not null default 'idle',
  input jsonb not null default '{}',
  result jsonb not null default '{}',
  error jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  unique(job_id,step_key)
);

create table if not exists public.provider_cache (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  cache_key text not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  request_cost numeric(12,6),
  unique(provider,cache_key)
);

create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete cascade,
  task_type text not null,
  model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  estimated_cost numeric(12,6) not null default 0,
  created_at timestamptz not null default now()
);

-- Indizes ------------------------------------------------------------------
create index if not exists trip_preferences_trip_idx on public.trip_preferences(trip_id);
create index if not exists trip_places_trip_module_idx on public.trip_places(trip_id,module_key,position);
create index if not exists recommendations_trip_module_idx on public.recommendations(trip_id,module_key,status,score desc);
create index if not exists activity_trip_event_idx on public.user_activity_events(trip_id,event_type,created_at desc);
create index if not exists generated_content_entity_idx on public.generated_content(trip_id,entity_type,entity_id,task_type);
create index if not exists media_entity_idx on public.media(trip_id,entity_type,entity_id);
create index if not exists places_name_idx on public.places(lower(name));

-- updated_at Trigger --------------------------------------------------------
do $$ declare t text; begin
  foreach t in array array['destinations','trip_preferences','derived_user_preferences','modules','trip_modules','places','trip_places','restaurants','generated_content','user_content_overrides','media','automation_jobs'] loop
    execute format('drop trigger if exists %I on public.%I','set_updated_at_'||t,t);
    execute format('create trigger %I before update on public.%I for each row execute function public.luvia_set_updated_at()','set_updated_at_'||t,t);
  end loop;
end $$;

-- RLS ----------------------------------------------------------------------
do $$ declare t text; begin
  foreach t in array array['destinations','trip_preferences','derived_user_preferences','modules','trip_modules','places','trip_places','restaurants','generated_content','user_content_overrides','media','media_pages','recommendations','recommendation_events','user_activity_events','popularity_aggregates','co_selection_aggregates','automation_jobs','automation_steps','provider_cache','ai_usage'] loop
    execute format('alter table public.%I enable row level security',t);
  end loop;
end $$;

-- Öffentliche/aggregierte Lesedaten, nur Server darf schreiben
create policy "destinations authenticated read" on public.destinations for select to authenticated using (true);
create policy "places authenticated read" on public.places for select to authenticated using (true);
create policy "modules authenticated read" on public.modules for select to authenticated using (is_active=true);
create policy "popularity safe read" on public.popularity_aggregates for select to authenticated using (sample_size >= 10);
create policy "co selection safe read" on public.co_selection_aggregates for select to authenticated using (sample_size >= 10);

-- Reisespezifische Tabellen
create policy "trip preferences member read" on public.trip_preferences for select to authenticated using (public.luvia_is_trip_member(trip_id));
create policy "trip preferences own write" on public.trip_preferences for all to authenticated using (public.luvia_is_trip_member(trip_id) and (user_id is null or user_id=auth.uid())) with check (public.luvia_is_trip_member(trip_id) and (user_id is null or user_id=auth.uid()));
create policy "trip modules member read" on public.trip_modules for select to authenticated using (public.luvia_is_trip_member(trip_id));
create policy "trip modules admin write" on public.trip_modules for all to authenticated using (public.luvia_is_trip_admin(trip_id)) with check (public.luvia_is_trip_admin(trip_id));
create policy "trip places member access" on public.trip_places for all to authenticated using (public.luvia_is_trip_member(trip_id)) with check (public.luvia_is_trip_member(trip_id));
create policy "generated content member access" on public.generated_content for all to authenticated using (public.luvia_is_trip_member(trip_id)) with check (public.luvia_is_trip_member(trip_id));
create policy "overrides own access" on public.user_content_overrides for all to authenticated using (public.luvia_is_trip_member(trip_id) and user_id=auth.uid()) with check (public.luvia_is_trip_member(trip_id) and user_id=auth.uid());
create policy "media member access" on public.media for all to authenticated using (public.luvia_is_trip_member(trip_id)) with check (public.luvia_is_trip_member(trip_id));
create policy "recommendations own read" on public.recommendations for select to authenticated using (public.luvia_is_trip_member(trip_id) and (user_id is null or user_id=auth.uid()));
create policy "recommendation events own insert" on public.recommendation_events for insert to authenticated with check (public.luvia_is_trip_member(trip_id) and user_id=auth.uid());
create policy "activity own access" on public.user_activity_events for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid() and (trip_id is null or public.luvia_is_trip_member(trip_id)));
create policy "jobs own access" on public.automation_jobs for all to authenticated using (user_id=auth.uid() and public.luvia_is_trip_member(trip_id)) with check (user_id=auth.uid() and public.luvia_is_trip_member(trip_id));
create policy "ai usage own read" on public.ai_usage for select to authenticated using (user_id=auth.uid());
create policy "derived preferences own access" on public.derived_user_preferences for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());

-- Child Tabellen über Parent absichern
create policy "restaurants via trip place" on public.restaurants for all to authenticated using (exists(select 1 from public.trip_places tp where tp.id=trip_place_id and public.luvia_is_trip_member(tp.trip_id))) with check (exists(select 1 from public.trip_places tp where tp.id=trip_place_id and public.luvia_is_trip_member(tp.trip_id)));
create policy "media pages via media" on public.media_pages for select to authenticated using (exists(select 1 from public.media m where m.id=media_id and public.luvia_is_trip_member(m.trip_id)));
create policy "automation steps via job" on public.automation_steps for select to authenticated using (exists(select 1 from public.automation_jobs j where j.id=job_id and j.user_id=auth.uid()));

-- Registrierte Module -------------------------------------------------------
insert into public.modules(module_key,name,version,category) values
 ('restaurants','Restaurants',2,'places'),('photo-spots','Fotospots',2,'places'),
 ('memories','Erinnerungen',2,'content'),('language','Sprachcoach',2,'assistant'),
 ('apps','Must-have Apps',2,'utility'),('assistant','Reiseassistent',2,'assistant'),
 ('live-moments','Live Moments',2,'live'),('mobility','Anreise & Mobilität',2,'utility'),
 ('budget','Budget-Tracker',2,'utility'),('gallery','Reisegalerie',2,'media'),
 ('day-plans','Reisetage',2,'planning'),('closing','Tagesabschluss',2,'content'),
 ('review','Cinematic Review',2,'media'),('travel-book','Reisebuch',2,'content')
on conflict(module_key) do update set name=excluded.name,version=excluded.version,category=excluded.category,updated_at=now();

-- Diagnose-RPC: verrät keine fremden Daten ---------------------------------
create or replace function public.luvia_core_v2_database_status()
returns jsonb language plpgsql security definer set search_path=public as $$
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
grant execute on function public.luvia_core_v2_database_status() to authenticated;

notify pgrst, 'reload schema';
