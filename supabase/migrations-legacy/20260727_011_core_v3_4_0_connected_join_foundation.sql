-- Luvia Core 3.4.0 · Unified invitations, hidden join onboarding and realtime members
begin;

create or replace function public.luvia_normalize_join_code(p_code text)
returns text language sql immutable as $$
  select upper(regexp_replace(coalesce(p_code,''),'[^A-Za-z0-9]','','g'));
$$;

-- Existing trips without a code receive one when the canonical join_code column exists.
do $$
begin
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='trips' and column_name='join_code') then
    execute $q$update public.trips set join_code=upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)) where join_code is null or btrim(join_code)=''$q$;
    execute $q$create unique index if not exists trips_join_code_upper_uidx on public.trips (upper(join_code)) where join_code is not null$q$;
  end if;
end $$;

create or replace function public.luvia_preview_trip_invite(p_join_code text)
returns table(trip_id uuid,trip_name text,destination_name text,symbol text,accent text,member_count bigint)
language plpgsql security definer set search_path=public as $$
declare v_code text:=public.luvia_normalize_join_code(p_join_code);
begin
  if length(v_code)<5 then return; end if;
  return query execute $q$
    select t.id,
      coalesce(nullif(to_jsonb(t)->>'trip_name',''),nullif(to_jsonb(t)->>'title',''),'Unsere Reise'),
      coalesce(nullif(to_jsonb(t)->'destination_context'->>'name',''),nullif(to_jsonb(t)->>'destination_name',''),'Gemeinsames Reiseziel'),
      coalesce(nullif(to_jsonb(t)->>'symbol',''),'❤️'),
      coalesce(nullif(to_jsonb(t)->>'accent',''),'#ee6f83'),
      (select count(*) from public.trip_members tm where (to_jsonb(tm)->>'trip_id')::uuid=t.id)
    from public.trips t
    where public.luvia_normalize_join_code(coalesce(to_jsonb(t)->>'join_code',to_jsonb(t)->>'code',to_jsonb(t)->>'trip_code'))=$1
    limit 1
  $q$ using v_code;
end $$;

grant execute on function public.luvia_preview_trip_invite(text) to anon, authenticated;

create or replace function public.luvia_join_trip_by_code(p_join_code text,p_display_name text)
returns table(trip_id uuid,member_id uuid,member_role text,already_member boolean)
language plpgsql security definer set search_path=public as $$
declare v_trip uuid;v_member uuid;v_existing boolean:=false;v_code text:=public.luvia_normalize_join_code(p_join_code);v_name text:=left(trim(coalesce(p_display_name,'')),80);
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(v_code)<5 then raise exception 'INVALID_INVITE_CODE'; end if;
  if v_name='' then raise exception 'DISPLAY_NAME_REQUIRED'; end if;
  execute $q$select t.id from public.trips t where public.luvia_normalize_join_code(coalesce(to_jsonb(t)->>'join_code',to_jsonb(t)->>'code',to_jsonb(t)->>'trip_code'))=$1 limit 1$q$ into v_trip using v_code;
  if v_trip is null then raise exception 'INVITE_NOT_FOUND'; end if;
  select tm.id,true into v_member,v_existing from public.trip_members tm where (to_jsonb(tm)->>'trip_id')::uuid=v_trip and (to_jsonb(tm)->>'user_id')::uuid=auth.uid() limit 1;
  if not coalesce(v_existing,false) then
    insert into public.trip_members(trip_id,user_id,display_name,role,joined_at)
    values(v_trip,auth.uid(),v_name,'member',now()) returning id into v_member;
  else
    update public.trip_members set display_name=v_name where id=v_member;
  end if;
  return query select v_trip,v_member,'member'::text,coalesce(v_existing,false);
end $$;

grant execute on function public.luvia_join_trip_by_code(text,text) to authenticated;

create or replace function public.luvia_list_trip_members(p_trip_id uuid)
returns table(id uuid,user_id uuid,display_name text,role text,joined_at timestamptz)
language sql security definer set search_path=public as $$
 select tm.id,(to_jsonb(tm)->>'user_id')::uuid,coalesce(nullif(to_jsonb(tm)->>'display_name',''),'Mitreisende Person'),coalesce(nullif(to_jsonb(tm)->>'role',''),'member'),coalesce((to_jsonb(tm)->>'joined_at')::timestamptz,now())
 from public.trip_members tm
 where (to_jsonb(tm)->>'trip_id')::uuid=p_trip_id
 and exists(select 1 from public.trip_members mine where (to_jsonb(mine)->>'trip_id')::uuid=p_trip_id and (to_jsonb(mine)->>'user_id')::uuid=auth.uid())
 order by coalesce((to_jsonb(tm)->>'joined_at')::timestamptz,now()),tm.id;
$$;
grant execute on function public.luvia_list_trip_members(uuid) to authenticated;

-- Realtime publication is idempotent.
do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='trip_members') then
    alter publication supabase_realtime add table public.trip_members;
  end if;
exception when duplicate_object then null; end $$;

commit;
