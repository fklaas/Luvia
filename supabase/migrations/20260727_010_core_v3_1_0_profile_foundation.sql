begin;

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  first_name text,
  last_name text,
  avatar_url text,
  avatar_color text not null default '#ee6f83',
  language text not null default 'de',
  timezone text,
  home_location text,
  dietary_preferences jsonb not null default '[]'::jsonb,
  travel_preferences jsonb not null default '{}'::jsonb,
  theme_mode text not null default 'system' check (theme_mode in ('light','dark','system')),
  active_trip_id uuid,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;
drop policy if exists user_profiles_select_own on public.user_profiles;
create policy user_profiles_select_own on public.user_profiles for select to authenticated using (user_id=auth.uid());
drop policy if exists user_profiles_insert_own on public.user_profiles;
create policy user_profiles_insert_own on public.user_profiles for insert to authenticated with check (user_id=auth.uid());
drop policy if exists user_profiles_update_own on public.user_profiles;
create policy user_profiles_update_own on public.user_profiles for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists user_profiles_delete_own on public.user_profiles;
create policy user_profiles_delete_own on public.user_profiles for delete to authenticated using (user_id=auth.uid());

create or replace function public.luvia_get_my_profile()
returns setof public.user_profiles
language plpgsql security definer set search_path=public
as $$
declare uid uuid:=auth.uid();
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  insert into public.user_profiles(user_id,display_name,first_name,last_name)
  select uid,coalesce(raw_user_meta_data->>'display_name',split_part(email,'@',1)),raw_user_meta_data->>'first_name',raw_user_meta_data->>'last_name'
  from auth.users where id=uid
  on conflict(user_id) do nothing;
  return query select * from public.user_profiles where user_id=uid;
end;$$;

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
language plpgsql security definer set search_path=public
as $$
declare uid uuid:=auth.uid();
begin
  if uid is null then raise exception 'AUTH_REQUIRED'; end if;
  insert into public.user_profiles(user_id,display_name,first_name,last_name,avatar_url,avatar_color,language,timezone,home_location,dietary_preferences,travel_preferences,theme_mode,active_trip_id,settings,updated_at)
  values(uid,nullif(trim(p_display_name),''),nullif(trim(p_first_name),''),nullif(trim(p_last_name),''),nullif(trim(p_avatar_url),''),coalesce(nullif(p_avatar_color,''),'#ee6f83'),coalesce(nullif(p_language,''),'de'),nullif(trim(p_timezone),''),nullif(trim(p_home_location),''),coalesce(p_dietary_preferences,'[]'::jsonb),coalesce(p_travel_preferences,'{}'::jsonb),case when p_theme_mode in ('light','dark','system') then p_theme_mode else 'system' end,p_active_trip_id,coalesce(p_settings,'{}'::jsonb),now())
  on conflict(user_id) do update set display_name=excluded.display_name,first_name=excluded.first_name,last_name=excluded.last_name,avatar_url=excluded.avatar_url,avatar_color=excluded.avatar_color,language=excluded.language,timezone=excluded.timezone,home_location=excluded.home_location,dietary_preferences=excluded.dietary_preferences,travel_preferences=excluded.travel_preferences,theme_mode=excluded.theme_mode,active_trip_id=excluded.active_trip_id,settings=excluded.settings,updated_at=now();
  return query select * from public.user_profiles where user_id=uid;
end;$$;

grant execute on function public.luvia_get_my_profile() to authenticated;
grant execute on function public.luvia_upsert_my_profile(text,text,text,text,text,text,text,text,jsonb,jsonb,text,uuid,jsonb) to authenticated;
revoke all on function public.luvia_get_my_profile() from anon;
revoke all on function public.luvia_upsert_my_profile(text,text,text,text,text,text,text,text,jsonb,jsonb,text,uuid,jsonb) from anon;

commit;
