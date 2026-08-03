-- Luvia Core 3.7.0 · Smart Recommendation Engine Complete Foundation
begin;
create extension if not exists pgcrypto;

alter table public.recommendation_instances
  add column if not exists candidate_source text,
  add column if not exists constraints jsonb not null default '{}'::jsonb,
  add column if not exists group_match jsonb not null default '{}'::jsonb,
  add column if not exists rule_version text not null default 'foundation-1';

create table if not exists public.recommendation_events(
 id uuid primary key default gen_random_uuid(),
 recommendation_id uuid references public.recommendation_instances(id) on delete cascade,
 trip_id uuid not null,
 user_id uuid not null default auth.uid(),
 module_key text not null,
 entity_type text,
 entity_id text,
 event_type text not null,
 event_data jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index if not exists recommendation_events_trip_created_idx on public.recommendation_events(trip_id,created_at desc);
create index if not exists recommendation_events_rec_idx on public.recommendation_events(recommendation_id,created_at desc);
alter table public.recommendation_events enable row level security;
drop policy if exists "trip members read recommendation events" on public.recommendation_events;
create policy "trip members read recommendation events" on public.recommendation_events for select to authenticated using(public.luvia_is_trip_member(trip_id,auth.uid()));
drop policy if exists "users create recommendation events" on public.recommendation_events;
create policy "users create recommendation events" on public.recommendation_events for insert to authenticated with check(user_id=auth.uid() and public.luvia_is_trip_member(trip_id,auth.uid()));

create table if not exists public.recommendation_memory(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid(),
 scope_type text not null default 'user',
 scope_id text not null default 'global',
 module_key text not null default 'places',
 memory_key text not null,
 memory_value jsonb not null default '{}'::jsonb,
 confidence numeric(5,4) not null default 0,
 sample_count integer not null default 0,
 rule_version text not null default 'foundation-1',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(user_id,scope_type,scope_id,module_key,memory_key)
);
alter table public.recommendation_memory enable row level security;
drop policy if exists "users manage own recommendation memory" on public.recommendation_memory;
create policy "users manage own recommendation memory" on public.recommendation_memory for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

create table if not exists public.recommendation_settings(
 user_id uuid primary key default auth.uid(),
 enabled boolean not null default true,
 personalization boolean not null default true,
 use_location boolean not null default true,
 learning boolean not null default true,
 debug boolean not null default false,
 max_distance_meters integer not null default 30000,
 minimum_score numeric(5,2) not null default 0,
 updated_at timestamptz not null default now()
);
alter table public.recommendation_settings enable row level security;
drop policy if exists "users manage own recommendation settings" on public.recommendation_settings;
create policy "users manage own recommendation settings" on public.recommendation_settings for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

create or replace function public.luvia_store_recommendation(p_item jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid:=coalesce(nullif(p_item->>'id','')::uuid,gen_random_uuid());v_trip uuid:=nullif(p_item->>'tripId','')::uuid;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if v_trip is null or not public.luvia_is_trip_member(v_trip,auth.uid()) then raise exception 'TRIP_ACCESS_DENIED';end if;
 insert into public.recommendation_instances(id,trip_id,user_id,module_key,entity_type,entity_id,recommendation_type,context_snapshot,score,score_components,reasons,warnings,suggested_date,suggested_time,expires_at,status,engine_version,candidate_source,constraints,group_match,rule_version)
 values(v_id,v_trip,auth.uid(),coalesce(nullif(p_item->>'module',''),'places'),coalesce(nullif(p_item->>'entityType',''),'place'),nullif(p_item->>'entityId',''),coalesce(nullif(p_item->>'recommendationType',''),'for-you'),coalesce(p_item->'contextSnapshot','{}'::jsonb),nullif(p_item->>'score','')::numeric,coalesce(p_item->'scoreComponents','[]'::jsonb),coalesce(p_item->'reasons','[]'::jsonb),coalesce(p_item->'warnings','[]'::jsonb),nullif(p_item->>'suggestedDate','')::date,nullif(p_item->>'suggestedTime','')::time,nullif(p_item->>'expiresAt','')::timestamptz,coalesce(nullif(p_item->>'status',''),'generated'),'3.7.0',nullif(p_item->>'candidateSource',''),coalesce(p_item->'constraints','{}'::jsonb),coalesce(p_item->'groupMatch','{}'::jsonb),coalesce(nullif(p_item->>'ruleVersion',''),'foundation-1'))
 on conflict(id) do update set score=excluded.score,score_components=excluded.score_components,reasons=excluded.reasons,warnings=excluded.warnings,context_snapshot=excluded.context_snapshot,expires_at=excluded.expires_at,status=excluded.status,candidate_source=excluded.candidate_source,constraints=excluded.constraints,group_match=excluded.group_match,rule_version=excluded.rule_version,engine_version='3.7.0',updated_at=now();
 return v_id;
end $$;
grant execute on function public.luvia_store_recommendation(jsonb) to authenticated;

create or replace function public.luvia_record_recommendation_event(p_event jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid:=coalesce(nullif(p_event->>'id','')::uuid,gen_random_uuid());v_trip uuid:=nullif(p_event->>'tripId','')::uuid;v_rec uuid:=nullif(p_event->>'recommendationId','')::uuid;
begin
 if auth.uid() is null or v_trip is null or not public.luvia_is_trip_member(v_trip,auth.uid()) then raise exception 'TRIP_ACCESS_DENIED';end if;
 insert into public.recommendation_events(id,recommendation_id,trip_id,user_id,module_key,entity_type,entity_id,event_type,event_data)
 values(v_id,v_rec,v_trip,auth.uid(),coalesce(nullif(p_event->>'module',''),'places'),nullif(p_event->>'entityType',''),nullif(p_event->>'entityId',''),coalesce(nullif(p_event->>'eventType',''),'unknown'),coalesce(p_event->'data','{}'::jsonb));
 return v_id;
end $$;
grant execute on function public.luvia_record_recommendation_event(jsonb) to authenticated;

create or replace function public.luvia_list_recommendation_events(p_trip_id uuid,p_limit integer default 200) returns setof public.recommendation_events language sql stable security definer set search_path=public as $$
 select * from public.recommendation_events where trip_id=p_trip_id and public.luvia_is_trip_member(p_trip_id,auth.uid()) order by created_at desc limit greatest(1,least(coalesce(p_limit,200),1000));
$$;
grant execute on function public.luvia_list_recommendation_events(uuid,integer) to authenticated;

create or replace function public.luvia_reset_recommendation_learning(p_trip_id uuid default null) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 delete from public.recommendation_memory where user_id=auth.uid() and (p_trip_id is null or (scope_type='trip' and scope_id=p_trip_id::text));
end $$;
grant execute on function public.luvia_reset_recommendation_learning(uuid) to authenticated;

do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='recommendation_events') then
   alter publication supabase_realtime add table public.recommendation_events;
 end if;
exception when duplicate_object then null; end $$;
commit;
