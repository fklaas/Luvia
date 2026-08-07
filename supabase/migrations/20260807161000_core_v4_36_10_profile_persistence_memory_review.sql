-- Luvia 13.36.10 / Core 4.36.10
-- Profile Persistence Hardening + Memory Album Review Decisions
begin;

-- Durable profile columns must always have a cloud value. LocalStorage is never
-- authoritative; these defaults only repair historic null rows once.
update public.user_profiles set avatar_color='#ee6f83' where avatar_color is null or btrim(avatar_color)='';
update public.user_profiles set dietary_preferences='{}'::text[] where dietary_preferences is null;
update public.user_profiles set travel_interests='{}'::text[] where travel_interests is null;
update public.user_profiles set travel_styles='{}'::text[] where travel_styles is null;
update public.user_profiles set activity_preferences='{}'::text[] where activity_preferences is null;
update public.user_profiles set entertainment_preferences='{}'::text[] where entertainment_preferences is null;
update public.user_profiles set dining_preferences='{}'::text[] where dining_preferences is null;
update public.user_profiles set mobility_preferences='{}'::text[] where mobility_preferences is null;
update public.user_profiles set atmosphere_preferences='{}'::text[] where atmosphere_preferences is null;
update public.user_profiles set travel_pace='balanced' where travel_pace is null or travel_pace not in ('relaxed','balanced','active');
update public.user_profiles set budget_preference='medium' where budget_preference is null or budget_preference not in ('low','medium','premium');
update public.user_profiles set family_preferences='{}'::jsonb where family_preferences is null;
update public.user_profiles set accessibility_preferences='{}'::jsonb where accessibility_preferences is null;
update public.user_profiles set settings='{}'::jsonb where settings is null;
update public.user_profiles set preference_schema_version=3 where preference_schema_version is null or preference_schema_version < 3;

alter table public.user_profiles
  alter column avatar_color set default '#ee6f83',
  alter column dietary_preferences set default '{}'::text[],
  alter column travel_interests set default '{}'::text[],
  alter column travel_styles set default '{}'::text[],
  alter column activity_preferences set default '{}'::text[],
  alter column entertainment_preferences set default '{}'::text[],
  alter column dining_preferences set default '{}'::text[],
  alter column mobility_preferences set default '{}'::text[],
  alter column atmosphere_preferences set default '{}'::text[],
  alter column travel_pace set default 'balanced',
  alter column budget_preference set default 'medium',
  alter column family_preferences set default '{}'::jsonb,
  alter column accessibility_preferences set default '{}'::jsonb,
  alter column preference_schema_version set default 3,
  alter column settings set default '{}'::jsonb;

alter table public.user_profiles
  alter column avatar_color set not null,
  alter column dietary_preferences set not null,
  alter column travel_interests set not null,
  alter column travel_styles set not null,
  alter column activity_preferences set not null,
  alter column entertainment_preferences set not null,
  alter column dining_preferences set not null,
  alter column mobility_preferences set not null,
  alter column atmosphere_preferences set not null,
  alter column travel_pace set not null,
  alter column budget_preference set not null,
  alter column family_preferences set not null,
  alter column accessibility_preferences set not null,
  alter column preference_schema_version set not null,
  alter column settings set not null;

alter table public.user_profiles
  add column if not exists profile_revision bigint not null default 0;

create or replace function public.luvia_bump_profile_revision()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  new.profile_revision := coalesce(old.profile_revision,0)+1;
  return new;
end;$$;

drop trigger if exists trg_luvia_profile_revision on public.user_profiles;
create trigger trg_luvia_profile_revision
before update on public.user_profiles
for each row execute function public.luvia_bump_profile_revision();

-- Future album curation is a review decision, never deletion of the memory card.
create table if not exists public.memory_card_album_reviews (
  card_id uuid not null references public.memory_cards(id) on delete cascade,
  trip_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  decision text not null default 'undecided' check (decision in ('included','excluded','undecided')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(card_id,user_id)
);
create index if not exists memory_card_album_reviews_trip_idx on public.memory_card_album_reviews(trip_id,user_id,updated_at desc);

alter table public.memory_card_album_reviews enable row level security;
drop policy if exists memory_card_album_reviews_select on public.memory_card_album_reviews;
create policy memory_card_album_reviews_select on public.memory_card_album_reviews
for select to authenticated using (user_id=auth.uid() and public.luvia_is_trip_member(trip_id,auth.uid()));
drop policy if exists memory_card_album_reviews_insert on public.memory_card_album_reviews;
create policy memory_card_album_reviews_insert on public.memory_card_album_reviews
for insert to authenticated with check (user_id=auth.uid() and public.luvia_is_trip_member(trip_id,auth.uid()));
drop policy if exists memory_card_album_reviews_update on public.memory_card_album_reviews;
create policy memory_card_album_reviews_update on public.memory_card_album_reviews
for update to authenticated using (user_id=auth.uid() and public.luvia_is_trip_member(trip_id,auth.uid()))
with check (user_id=auth.uid() and public.luvia_is_trip_member(trip_id,auth.uid()));
drop policy if exists memory_card_album_reviews_delete on public.memory_card_album_reviews;
create policy memory_card_album_reviews_delete on public.memory_card_album_reviews
for delete to authenticated using (user_id=auth.uid() and public.luvia_is_trip_member(trip_id,auth.uid()));
grant select,insert,update,delete on public.memory_card_album_reviews to authenticated;

do $$ begin
  alter publication supabase_realtime add table public.memory_card_album_reviews;
exception when duplicate_object then null;
end $$;

commit;
