-- Luvia Core 3.6.0 · Smart Recommendation Engine
begin;
create extension if not exists pgcrypto;
create table if not exists public.recommendation_instances(
 id uuid primary key default gen_random_uuid(), trip_id uuid not null, user_id uuid not null default auth.uid(), module_key text not null,
 entity_type text not null, entity_id text, recommendation_type text not null default 'for-you', context_snapshot jsonb not null default '{}'::jsonb,
 score numeric(5,2), score_components jsonb not null default '[]'::jsonb, reasons jsonb not null default '[]'::jsonb, warnings jsonb not null default '[]'::jsonb,
 suggested_date date, suggested_time time, expires_at timestamptz, status text not null default 'generated', decision_reason text, converted_action text,
 engine_version text not null default '3.6.0', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists recommendation_instances_trip_created_idx on public.recommendation_instances(trip_id,created_at desc);
create index if not exists recommendation_instances_entity_idx on public.recommendation_instances(trip_id,module_key,entity_type,entity_id);
alter table public.recommendation_instances enable row level security;
drop policy if exists "trip members read recommendations" on public.recommendation_instances;
create policy "trip members read recommendations" on public.recommendation_instances for select to authenticated using(public.luvia_is_trip_member(trip_id,auth.uid()));
drop policy if exists "users manage recommendation decisions" on public.recommendation_instances;
create policy "users manage recommendation decisions" on public.recommendation_instances for all to authenticated using(user_id=auth.uid() and public.luvia_is_trip_member(trip_id,auth.uid())) with check(user_id=auth.uid() and public.luvia_is_trip_member(trip_id,auth.uid()));
create or replace function public.luvia_store_recommendation(p_item jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid:=coalesce(nullif(p_item->>'id','')::uuid,gen_random_uuid());v_trip uuid:=nullif(p_item->>'tripId','')::uuid;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if v_trip is null or not public.luvia_is_trip_member(v_trip,auth.uid()) then raise exception 'TRIP_ACCESS_DENIED';end if;
 insert into public.recommendation_instances(id,trip_id,user_id,module_key,entity_type,entity_id,recommendation_type,context_snapshot,score,score_components,reasons,warnings,suggested_date,suggested_time,expires_at,status,engine_version)
 values(v_id,v_trip,auth.uid(),coalesce(nullif(p_item->>'module',''),'places'),coalesce(nullif(p_item->>'entityType',''),'place'),nullif(p_item->>'entityId',''),coalesce(nullif(p_item->>'recommendationType',''),'for-you'),coalesce(p_item->'contextSnapshot','{}'::jsonb),nullif(p_item->>'score','')::numeric,coalesce(p_item->'scoreComponents','[]'::jsonb),coalesce(p_item->'reasons','[]'::jsonb),coalesce(p_item->'warnings','[]'::jsonb),nullif(p_item->>'suggestedDate','')::date,nullif(p_item->>'suggestedTime','')::time,nullif(p_item->>'expiresAt','')::timestamptz,coalesce(nullif(p_item->>'status',''),'generated'),'3.6.0')
 on conflict(id) do update set score=excluded.score,score_components=excluded.score_components,reasons=excluded.reasons,warnings=excluded.warnings,context_snapshot=excluded.context_snapshot,expires_at=excluded.expires_at,updated_at=now();
 return v_id;
end $$;
grant execute on function public.luvia_store_recommendation(jsonb) to authenticated;
create or replace function public.luvia_decide_recommendation(p_id uuid,p_trip_id uuid,p_status text,p_reason text default null,p_action text default null,p_context jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_row public.recommendation_instances;
begin
 if auth.uid() is null or not public.luvia_is_trip_member(p_trip_id,auth.uid()) then raise exception 'TRIP_ACCESS_DENIED';end if;
 update public.recommendation_instances set status=p_status,decision_reason=p_reason,converted_action=p_action,updated_at=now(),context_snapshot=context_snapshot||jsonb_build_object('decisionContext',p_context) where id=p_id and trip_id=p_trip_id and user_id=auth.uid() returning * into v_row;
 if v_row.id is null then raise exception 'RECOMMENDATION_NOT_FOUND';end if;
 return to_jsonb(v_row);
end $$;
grant execute on function public.luvia_decide_recommendation(uuid,uuid,text,text,text,jsonb) to authenticated;
create or replace function public.luvia_list_recommendations(p_trip_id uuid,p_module text default null,p_limit integer default 100) returns setof public.recommendation_instances language sql stable security definer set search_path=public as $$
 select * from public.recommendation_instances where trip_id=p_trip_id and public.luvia_is_trip_member(p_trip_id,auth.uid()) and (p_module is null or module_key=p_module) order by created_at desc limit greatest(1,least(coalesce(p_limit,100),500));
$$;
grant execute on function public.luvia_list_recommendations(uuid,text,integer) to authenticated;
commit;
