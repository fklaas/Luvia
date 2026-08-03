begin;

-- Luvia 13.16.1 / Core 4.16.1
-- Global User Preference Persistence
-- public.user_profiles remains the single source of truth. Legacy JSON stays
-- available during the compatibility phase, but is generated from explicit fields.

create or replace function public.luvia_jsonb_text_array(p_value jsonb)
returns text[]
language sql
immutable
set search_path = public
as $$
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

create or replace function public.luvia_jsonb_object(p_value jsonb)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select case when jsonb_typeof(coalesce(p_value, '{}'::jsonb)) = 'object'
    then coalesce(p_value, '{}'::jsonb)
    else '{}'::jsonb
  end;
$$;

create or replace function public.luvia_first_nonempty_text_array(p_first text[], p_second text[], p_third text[])
returns text[]
language sql
immutable
set search_path = public
as $$
  select case
    when coalesce(cardinality(p_first),0) > 0 then p_first
    when coalesce(cardinality(p_second),0) > 0 then p_second
    when coalesce(cardinality(p_third),0) > 0 then p_third
    else '{}'::text[]
  end;
$$;

create or replace function public.luvia_safe_timestamptz(p_value text)
returns timestamptz
language plpgsql
immutable
set search_path = public
as $$
begin
  if nullif(btrim(coalesce(p_value, '')), '') is null then return null; end if;
  return p_value::timestamptz;
exception when others then
  return null;
end;
$$;

create or replace function public.luvia_safe_integer(p_value text, p_default integer default 0)
returns integer
language plpgsql
immutable
set search_path = public
as $$
begin
  if nullif(btrim(coalesce(p_value, '')), '') is null then return p_default; end if;
  return p_value::integer;
exception when others then
  return p_default;
end;
$$;

create or replace function public.luvia_preferences_from_metadata(p_meta jsonb)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
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

-- Convert the existing JSON dietary column in place while preserving every array value.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='user_profiles'
      and column_name='dietary_preferences' and udt_name='jsonb'
  ) then
    alter table public.user_profiles alter column dietary_preferences drop default;
    alter table public.user_profiles
      alter column dietary_preferences type text[]
      using public.luvia_jsonb_text_array(dietary_preferences);
  end if;
end;
$$;

alter table public.user_profiles
  add column if not exists travel_interests text[],
  add column if not exists travel_styles text[],
  add column if not exists activity_preferences text[],
  add column if not exists entertainment_preferences text[],
  add column if not exists dining_preferences text[],
  add column if not exists mobility_preferences text[],
  add column if not exists atmosphere_preferences text[],
  add column if not exists travel_pace text,
  add column if not exists budget_preference text,
  add column if not exists family_preferences jsonb,
  add column if not exists accessibility_preferences jsonb,
  add column if not exists preference_schema_version integer,
  add column if not exists preferences_completed_at timestamptz,
  add column if not exists preferences_updated_at timestamptz;

-- Backfill explicit columns from the old profile JSON and, only where needed,
-- from registration metadata. Existing explicit values always win.
-- Drop the compatibility trigger first so re-running this migration does not
-- manufacture a new updated_at timestamp for unchanged profiles.
drop trigger if exists user_profiles_preference_compatibility on public.user_profiles;

with source as (
  select
    up.user_id,
    public.luvia_jsonb_object(up.travel_preferences) as legacy,
    public.luvia_preferences_from_metadata(u.raw_user_meta_data) as metadata
  from public.user_profiles up
  join auth.users u on u.id = up.user_id
)
update public.user_profiles up
set
  dietary_preferences = public.luvia_first_nonempty_text_array(
    coalesce(up.dietary_preferences, '{}'::text[]),
    public.luvia_jsonb_text_array(source.legacy->'dietary'),
    public.luvia_jsonb_text_array(source.metadata->'dietary_preferences')
  ),
  travel_interests = public.luvia_first_nonempty_text_array(coalesce(up.travel_interests, '{}'::text[]), public.luvia_jsonb_text_array(source.legacy->'interests'), public.luvia_jsonb_text_array(source.metadata->'travel_interests')),
  travel_styles = public.luvia_first_nonempty_text_array(coalesce(up.travel_styles, '{}'::text[]), public.luvia_jsonb_text_array(coalesce(source.legacy->'travelStyles', source.legacy->'travel_styles')), public.luvia_jsonb_text_array(source.metadata->'travel_styles')),
  activity_preferences = public.luvia_first_nonempty_text_array(coalesce(up.activity_preferences, '{}'::text[]), public.luvia_jsonb_text_array(coalesce(source.legacy->'activityPreferences', source.legacy->'activity_preferences')), public.luvia_jsonb_text_array(source.metadata->'activity_preferences')),
  entertainment_preferences = public.luvia_first_nonempty_text_array(coalesce(up.entertainment_preferences, '{}'::text[]), public.luvia_jsonb_text_array(coalesce(source.legacy->'entertainmentPreferences', source.legacy->'entertainment_preferences')), public.luvia_jsonb_text_array(source.metadata->'entertainment_preferences')),
  dining_preferences = public.luvia_first_nonempty_text_array(coalesce(up.dining_preferences, '{}'::text[]), public.luvia_jsonb_text_array(coalesce(source.legacy->'diningPreferences', source.legacy->'dining_preferences')), public.luvia_jsonb_text_array(source.metadata->'dining_preferences')),
  mobility_preferences = public.luvia_first_nonempty_text_array(coalesce(up.mobility_preferences, '{}'::text[]), public.luvia_jsonb_text_array(coalesce(source.legacy->'mobilityPreferences', source.legacy->'mobility_preferences')), public.luvia_jsonb_text_array(source.metadata->'mobility_preferences')),
  atmosphere_preferences = public.luvia_first_nonempty_text_array(coalesce(up.atmosphere_preferences, '{}'::text[]), public.luvia_jsonb_text_array(coalesce(source.legacy->'atmospherePreferences', source.legacy->'atmosphere_preferences')), public.luvia_jsonb_text_array(source.metadata->'atmosphere_preferences')),
  travel_pace = case when coalesce(nullif(up.travel_pace,''), nullif(source.legacy->>'pace',''), nullif(source.metadata->>'travel_pace',''), 'balanced') in ('relaxed','balanced','active') then coalesce(nullif(up.travel_pace,''), nullif(source.legacy->>'pace',''), nullif(source.metadata->>'travel_pace',''), 'balanced') else 'balanced' end,
  budget_preference = case when coalesce(nullif(up.budget_preference,''), nullif(source.legacy->>'budget',''), nullif(source.metadata->>'budget_preference',''), 'medium') in ('low','medium','premium') then coalesce(nullif(up.budget_preference,''), nullif(source.legacy->>'budget',''), nullif(source.metadata->>'budget_preference',''), 'medium') else 'medium' end,
  family_preferences = case when public.luvia_jsonb_object(up.family_preferences) <> '{}'::jsonb then public.luvia_jsonb_object(up.family_preferences) else public.luvia_jsonb_object(coalesce(source.legacy->'familyPreferences', source.legacy->'family_preferences', source.metadata->'family_preferences')) end,
  accessibility_preferences = case when public.luvia_jsonb_object(up.accessibility_preferences) <> '{}'::jsonb then public.luvia_jsonb_object(up.accessibility_preferences) else public.luvia_jsonb_object(coalesce(source.legacy->'accessibilityPreferences', source.legacy->'accessibility_preferences', source.metadata->'accessibility_preferences')) end,
  preference_schema_version = greatest(coalesce(up.preference_schema_version,0), public.luvia_safe_integer(source.metadata->>'preference_schema_version',0), 3),
  preferences_completed_at = coalesce(up.preferences_completed_at, public.luvia_safe_timestamptz(source.legacy->>'onboardingCompletedAt'), public.luvia_safe_timestamptz(source.legacy->>'onboarding_completed_at'), public.luvia_safe_timestamptz(source.metadata->>'preferences_completed_at')),
  preferences_updated_at = coalesce(up.preferences_updated_at, public.luvia_safe_timestamptz(source.metadata->>'preferences_updated_at'), up.updated_at, now())
from source
where source.user_id = up.user_id;

alter table public.user_profiles
  alter column dietary_preferences set default '{}'::text[],
  alter column dietary_preferences set not null,
  alter column travel_interests set default '{}'::text[],
  alter column travel_interests set not null,
  alter column travel_styles set default '{}'::text[],
  alter column travel_styles set not null,
  alter column activity_preferences set default '{}'::text[],
  alter column activity_preferences set not null,
  alter column entertainment_preferences set default '{}'::text[],
  alter column entertainment_preferences set not null,
  alter column dining_preferences set default '{}'::text[],
  alter column dining_preferences set not null,
  alter column mobility_preferences set default '{}'::text[],
  alter column mobility_preferences set not null,
  alter column atmosphere_preferences set default '{}'::text[],
  alter column atmosphere_preferences set not null,
  alter column travel_pace set default 'balanced',
  alter column travel_pace set not null,
  alter column budget_preference set default 'medium',
  alter column budget_preference set not null,
  alter column family_preferences set default '{}'::jsonb,
  alter column family_preferences set not null,
  alter column accessibility_preferences set default '{}'::jsonb,
  alter column accessibility_preferences set not null,
  alter column preference_schema_version set default 3,
  alter column preference_schema_version set not null,
  alter column preferences_updated_at set default now(),
  alter column preferences_updated_at set not null;

alter table public.user_profiles drop constraint if exists user_profiles_travel_pace_check;
alter table public.user_profiles add constraint user_profiles_travel_pace_check check (travel_pace in ('relaxed','balanced','active')) not valid;
alter table public.user_profiles validate constraint user_profiles_travel_pace_check;
alter table public.user_profiles drop constraint if exists user_profiles_budget_preference_check;
alter table public.user_profiles add constraint user_profiles_budget_preference_check check (budget_preference in ('low','medium','premium')) not valid;
alter table public.user_profiles validate constraint user_profiles_budget_preference_check;

create or replace function public.luvia_sync_profile_preference_compatibility()
returns trigger
language plpgsql
set search_path = public
as $$
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

drop trigger if exists user_profiles_preference_compatibility on public.user_profiles;
create trigger user_profiles_preference_compatibility
before insert or update on public.user_profiles
for each row execute function public.luvia_sync_profile_preference_compatibility();

create or replace function public.luvia_ensure_user_profile(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
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

revoke all on function public.luvia_ensure_user_profile(uuid) from public, anon, authenticated;

create or replace function public.luvia_handle_new_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.luvia_ensure_user_profile(new.id);
  return new;
end;
$$;

revoke all on function public.luvia_handle_new_auth_user_profile() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_luvia_profile on auth.users;
create trigger on_auth_user_created_luvia_profile
after insert on auth.users
for each row execute function public.luvia_handle_new_auth_user_profile();

-- Existing Auth users without a profile receive exactly one profile row.
do $$
declare uid uuid;
begin
  for uid in select id from auth.users loop
    perform public.luvia_ensure_user_profile(uid);
  end loop;
end;
$$;

create or replace function public.luvia_get_my_profile()
returns setof public.user_profiles
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  perform public.luvia_ensure_user_profile(uid);
  return query select * from public.user_profiles where user_id = uid;
end;
$$;

create or replace function public.luvia_upsert_my_profile_v2(
  p_display_name text default null,
  p_first_name text default null,
  p_last_name text default null,
  p_avatar_url text default null,
  p_avatar_color text default '#ee6f83',
  p_language text default 'de',
  p_timezone text default null,
  p_home_location text default null,
  p_dietary_preferences text[] default '{}'::text[],
  p_travel_interests text[] default '{}'::text[],
  p_travel_styles text[] default '{}'::text[],
  p_activity_preferences text[] default '{}'::text[],
  p_entertainment_preferences text[] default '{}'::text[],
  p_dining_preferences text[] default '{}'::text[],
  p_mobility_preferences text[] default '{}'::text[],
  p_atmosphere_preferences text[] default '{}'::text[],
  p_travel_pace text default 'balanced',
  p_budget_preference text default 'medium',
  p_family_preferences jsonb default '{}'::jsonb,
  p_accessibility_preferences jsonb default '{}'::jsonb,
  p_preference_schema_version integer default 3,
  p_preferences_completed_at timestamptz default null,
  p_preferences_updated_at timestamptz default null,
  p_legacy_travel_preferences jsonb default '{}'::jsonb,
  p_theme_mode text default 'system',
  p_active_trip_id uuid default null,
  p_settings jsonb default '{}'::jsonb
) returns setof public.user_profiles
language plpgsql
security definer
set search_path = public
as $$
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

-- Compatibility RPC for cached 13.16.0 clients. It maps legacy JSON into the
-- new explicit columns instead of making the JSON object authoritative.
create or replace function public.luvia_upsert_my_profile(
  p_display_name text default null,
  p_first_name text default null,
  p_last_name text default null,
  p_avatar_url text default null,
  p_avatar_color text default '#ee6f83',
  p_language text default 'de',
  p_timezone text default null,
  p_home_location text default null,
  p_dietary_preferences jsonb default '[]'::jsonb,
  p_travel_preferences jsonb default '{}'::jsonb,
  p_theme_mode text default 'system',
  p_active_trip_id uuid default null,
  p_settings jsonb default '{}'::jsonb
) returns setof public.user_profiles
language plpgsql
security definer
set search_path = public
as $$
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

alter table public.user_profiles enable row level security;
drop policy if exists user_profiles_select_own on public.user_profiles;
create policy user_profiles_select_own on public.user_profiles for select to authenticated using (auth.uid() = user_id);
drop policy if exists user_profiles_insert_own on public.user_profiles;
create policy user_profiles_insert_own on public.user_profiles for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists user_profiles_update_own on public.user_profiles;
create policy user_profiles_update_own on public.user_profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists user_profiles_delete_own on public.user_profiles;

revoke all on function public.luvia_get_my_profile() from public, anon;
revoke all on function public.luvia_upsert_my_profile_v2(text,text,text,text,text,text,text,text,text[],text[],text[],text[],text[],text[],text[],text[],text,text,jsonb,jsonb,integer,timestamptz,timestamptz,jsonb,text,uuid,jsonb) from public, anon;
revoke all on function public.luvia_upsert_my_profile(text,text,text,text,text,text,text,text,jsonb,jsonb,text,uuid,jsonb) from public, anon;
grant execute on function public.luvia_get_my_profile() to authenticated;
grant execute on function public.luvia_upsert_my_profile_v2(text,text,text,text,text,text,text,text,text[],text[],text[],text[],text[],text[],text[],text[],text,text,jsonb,jsonb,integer,timestamptz,timestamptz,jsonb,text,uuid,jsonb) to authenticated;
grant execute on function public.luvia_upsert_my_profile(text,text,text,text,text,text,text,text,jsonb,jsonb,text,uuid,jsonb) to authenticated;

commit;
