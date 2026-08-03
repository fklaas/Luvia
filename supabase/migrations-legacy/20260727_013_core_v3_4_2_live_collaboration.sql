-- Luvia Core 3.4.2 · Live Collaboration Foundation
-- Activity feed, durable presence and realtime-ready collaboration APIs.
begin;

create extension if not exists pgcrypto;

create table if not exists public.trip_activity_events (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null,
  actor_user_id uuid,
  event_type text not null,
  title text not null,
  body text,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists trip_activity_events_trip_created_idx on public.trip_activity_events(trip_id,created_at desc);
create index if not exists trip_activity_events_actor_idx on public.trip_activity_events(actor_user_id,created_at desc);

create table if not exists public.trip_presence (
  trip_id uuid not null,
  user_id uuid not null,
  device_id text not null,
  display_name text,
  status text not null default 'online',
  current_view text,
  last_seen_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  primary key(trip_id,user_id,device_id)
);
create index if not exists trip_presence_trip_seen_idx on public.trip_presence(trip_id,last_seen_at desc);

create or replace function public.luvia_is_trip_member(p_trip_id uuid,p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.trip_members tm
    where nullif(to_jsonb(tm)->>'trip_id','')::uuid=p_trip_id
      and nullif(to_jsonb(tm)->>'user_id','')::uuid=p_user_id
  );
$$;
grant execute on function public.luvia_is_trip_member(uuid,uuid) to authenticated;


create or replace function public.luvia_list_trip_members(p_trip_id uuid)
returns table(id uuid,user_id uuid,display_name text,role text,joined_at timestamptz)
language sql stable security definer set search_path=public as $$
 select tm.id,
   nullif(to_jsonb(tm)->>'user_id','')::uuid,
   coalesce(nullif(to_jsonb(tm)->>'display_name',''),nullif(to_jsonb(tm)->>'member_name',''),nullif(to_jsonb(tm)->>'name',''),'Mitreisende Person'),
   coalesce(nullif(to_jsonb(tm)->>'role',''),nullif(to_jsonb(tm)->>'member_role',''),'member'),
   coalesce(nullif(to_jsonb(tm)->>'joined_at','')::timestamptz,nullif(to_jsonb(tm)->>'created_at','')::timestamptz,now())
 from public.trip_members tm
 where nullif(to_jsonb(tm)->>'trip_id','')::uuid=p_trip_id
 and public.luvia_is_trip_member(p_trip_id)
 order by coalesce(nullif(to_jsonb(tm)->>'joined_at','')::timestamptz,nullif(to_jsonb(tm)->>'created_at','')::timestamptz,now()),tm.id;
$$;
grant execute on function public.luvia_list_trip_members(uuid) to authenticated;

alter table public.trip_activity_events enable row level security;
alter table public.trip_presence enable row level security;

drop policy if exists "trip members read activity" on public.trip_activity_events;
create policy "trip members read activity" on public.trip_activity_events for select to authenticated
using (public.luvia_is_trip_member(trip_id));

drop policy if exists "trip members read presence" on public.trip_presence;
create policy "trip members read presence" on public.trip_presence for select to authenticated
using (public.luvia_is_trip_member(trip_id));

drop policy if exists "users manage own presence" on public.trip_presence;
create policy "users manage own presence" on public.trip_presence for all to authenticated
using (user_id=auth.uid() and public.luvia_is_trip_member(trip_id))
with check (user_id=auth.uid() and public.luvia_is_trip_member(trip_id));

create or replace function public.luvia_record_trip_activity(
  p_trip_id uuid,
  p_event_type text,
  p_title text,
  p_body text default null,
  p_entity_type text default null,
  p_entity_id text default null,
  p_metadata jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path=public as $$
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
grant execute on function public.luvia_record_trip_activity(uuid,text,text,text,text,text,jsonb) to authenticated;

create or replace function public.luvia_list_trip_activity(p_trip_id uuid,p_limit integer default 30)
returns table(id uuid,trip_id uuid,actor_user_id uuid,actor_name text,event_type text,title text,body text,entity_type text,entity_id text,metadata jsonb,created_at timestamptz)
language sql stable security definer set search_path=public as $$
  select e.id,e.trip_id,e.actor_user_id,
    coalesce(
      (select coalesce(nullif(to_jsonb(tm)->>'display_name',''),nullif(to_jsonb(tm)->>'member_name',''),nullif(to_jsonb(tm)->>'name',''))
       from public.trip_members tm
       where nullif(to_jsonb(tm)->>'trip_id','')::uuid=e.trip_id and nullif(to_jsonb(tm)->>'user_id','')::uuid=e.actor_user_id limit 1),
      nullif(e.metadata->>'actorName',''),'Luvia'
    ),e.event_type,e.title,e.body,e.entity_type,e.entity_id,e.metadata,e.created_at
  from public.trip_activity_events e
  where e.trip_id=p_trip_id and public.luvia_is_trip_member(p_trip_id)
  order by e.created_at desc
  limit greatest(1,least(coalesce(p_limit,30),100));
$$;
grant execute on function public.luvia_list_trip_activity(uuid,integer) to authenticated;

create or replace function public.luvia_presence_heartbeat(
  p_trip_id uuid,p_device_id text,p_display_name text default null,p_current_view text default null,p_metadata jsonb default '{}'::jsonb
) returns timestamptz language plpgsql security definer set search_path=public as $$
declare v_now timestamptz:=now();
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.luvia_is_trip_member(p_trip_id,auth.uid()) then raise exception 'TRIP_ACCESS_DENIED'; end if;
  insert into public.trip_presence(trip_id,user_id,device_id,display_name,status,current_view,last_seen_at,metadata)
  values(p_trip_id,auth.uid(),left(coalesce(nullif(trim(p_device_id),''),'browser'),120),nullif(left(trim(coalesce(p_display_name,'')),80),''),'online',nullif(left(trim(coalesce(p_current_view,'')),80),''),v_now,coalesce(p_metadata,'{}'::jsonb))
  on conflict(trip_id,user_id,device_id) do update set display_name=excluded.display_name,status='online',current_view=excluded.current_view,last_seen_at=v_now,metadata=excluded.metadata;
  return v_now;
end $$;
grant execute on function public.luvia_presence_heartbeat(uuid,text,text,text,jsonb) to authenticated;

create or replace function public.luvia_presence_leave(p_trip_id uuid,p_device_id text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then return; end if;
  update public.trip_presence set status='away',last_seen_at=now()
  where trip_id=p_trip_id and user_id=auth.uid() and device_id=left(coalesce(nullif(trim(p_device_id),''),'browser'),120);
end $$;
grant execute on function public.luvia_presence_leave(uuid,text) to authenticated;

create or replace function public.luvia_list_trip_presence(p_trip_id uuid)
returns table(user_id uuid,display_name text,status text,current_view text,last_seen_at timestamptz,device_count bigint)
language sql stable security definer set search_path=public as $$
  select p.user_id,
    coalesce(max(p.display_name),
      (select coalesce(nullif(to_jsonb(tm)->>'display_name',''),nullif(to_jsonb(tm)->>'member_name',''),nullif(to_jsonb(tm)->>'name',''),'Mitreisende Person')
       from public.trip_members tm where nullif(to_jsonb(tm)->>'trip_id','')::uuid=p_trip_id and nullif(to_jsonb(tm)->>'user_id','')::uuid=p.user_id limit 1)),
    case when max(p.last_seen_at)>now()-interval '90 seconds' then 'online' when max(p.last_seen_at)>now()-interval '15 minutes' then 'away' else 'offline' end,
    (array_agg(p.current_view order by p.last_seen_at desc))[1],max(p.last_seen_at),count(*)
  from public.trip_presence p
  where p.trip_id=p_trip_id and public.luvia_is_trip_member(p_trip_id)
  group by p.user_id
  order by max(p.last_seen_at) desc;
$$;
grant execute on function public.luvia_list_trip_presence(uuid) to authenticated;

create or replace function public.luvia_activity_member_joined_trigger()
returns trigger language plpgsql security definer set search_path=public as $$
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

drop trigger if exists luvia_trip_member_joined_activity on public.trip_members;
create trigger luvia_trip_member_joined_activity after insert on public.trip_members for each row execute function public.luvia_activity_member_joined_trigger();

-- Clean stale device rows opportunistically; aggregated status remains available through the RPC.
delete from public.trip_presence where last_seen_at<now()-interval '30 days';

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='trip_activity_events') then
    alter publication supabase_realtime add table public.trip_activity_events;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='trip_presence') then
    alter publication supabase_realtime add table public.trip_presence;
  end if;
exception when duplicate_object then null; end $$;

commit;
