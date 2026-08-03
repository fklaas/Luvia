-- Luvia 11.2.13 / Core 3.0.2.13
-- Schema-agnostic ownership, reliable profile writes and authoritative cloud deletion.

create or replace function public.paris_is_trip_owner(p_trip_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_result boolean := false;
  v_member boolean := false;
  v_member_count integer := 0;
begin
  if v_uid is null or p_trip_id is null then return false; end if;

  if to_regclass('public.trips') is not null then
    select exists (
      select 1 from public.trips t
      where t.id=p_trip_id and (
        nullif(to_jsonb(t)->>'owner_id','')::uuid=v_uid or
        nullif(to_jsonb(t)->>'created_by','')::uuid=v_uid or
        nullif(to_jsonb(t)->>'user_id','')::uuid=v_uid
      )
    ) into v_result;
    if v_result then return true; end if;
  end if;

  if to_regclass('public.trip_members') is not null then
    select exists (
      select 1 from public.trip_members tm
      where nullif(to_jsonb(tm)->>'trip_id','')::uuid=p_trip_id
        and nullif(to_jsonb(tm)->>'user_id','')::uuid=v_uid
    ) into v_member;
    if not v_member then return false; end if;

    select exists (
      select 1 from public.trip_members tm
      where nullif(to_jsonb(tm)->>'trip_id','')::uuid=p_trip_id
        and nullif(to_jsonb(tm)->>'user_id','')::uuid=v_uid
        and lower(coalesce(nullif(to_jsonb(tm)->>'role',''),'member')) in ('owner','admin','creator')
    ) into v_result;
    if v_result then return true; end if;

    select count(*) into v_member_count
    from public.trip_members tm
    where nullif(to_jsonb(tm)->>'trip_id','')::uuid=p_trip_id;

    -- In installations without a role column, the only member is necessarily
    -- the creator/owner. This also repairs legacy create_trip_with_code schemas.
    if v_member_count=1 then return true; end if;
  end if;

  return false;
end;
$$;

create or replace function public.paris_claim_unowned_trip(p_trip_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_members integer := 0;
  v_has_role boolean := false;
  v_column text;
begin
  if v_uid is null or p_trip_id is null then return false; end if;
  if public.paris_is_trip_owner(p_trip_id) then return true; end if;

  if not exists (
    select 1 from public.trip_members tm
    where nullif(to_jsonb(tm)->>'trip_id','')::uuid=p_trip_id
      and nullif(to_jsonb(tm)->>'user_id','')::uuid=v_uid
  ) then return false; end if;

  select count(*) into v_members from public.trip_members tm
  where nullif(to_jsonb(tm)->>'trip_id','')::uuid=p_trip_id;
  if v_members<>1 then return false; end if;

  select exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='trip_members' and column_name='role'
  ) into v_has_role;
  if v_has_role then
    execute $q$update public.trip_members tm set role=$1
      where nullif(to_jsonb(tm)->>'trip_id','')::uuid=$2
        and nullif(to_jsonb(tm)->>'user_id','')::uuid=$3$q$
      using 'owner',p_trip_id,v_uid;
  end if;

  foreach v_column in array array['owner_id','created_by','user_id'] loop
    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='trips' and column_name=v_column
    ) then
      execute format('update public.trips set %I=coalesce(%I,$1) where id=$2',v_column,v_column)
        using v_uid,p_trip_id;
    end if;
  end loop;

  -- Sole-member ownership remains valid even when the legacy tables expose
  -- neither a role column nor a dedicated owner column.
  return public.paris_is_trip_owner(p_trip_id);
end;
$$;

create or replace function public.luvia_save_trip_profile(
 p_trip_id uuid,p_trip_name text,p_destination_context jsonb,p_symbol text,p_accent text,p_start_date date,p_end_date date
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
 cleaned jsonb;
 merged jsonb;
 v_owner boolean;
begin
 select public.paris_is_trip_owner(p_trip_id) into v_owner;
 if not v_owner then select public.paris_claim_unowned_trip(p_trip_id) into v_owner; end if;
 if not coalesce(v_owner,false) then raise exception 'NOT_TRIP_OWNER'; end if;

 select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) into cleaned
 from jsonb_each(coalesce(p_destination_context,'{}'::jsonb))
 where value <> 'null'::jsonb
   and not(jsonb_typeof(value)='string' and btrim(value #>> '{}')='');

 select coalesce(destination_context,'{}'::jsonb)||cleaned into merged
 from public.trip_settings where trip_id=p_trip_id;
 merged:=coalesce(merged,cleaned,'{}'::jsonb);

 insert into public.trip_settings(trip_id,trip_name,destination_context,symbol,accent,start_date,end_date,updated_at,updated_by)
 values(p_trip_id,left(trim(coalesce(nullif(p_trip_name,''),'Unsere Reise')),80),merged,
        coalesce(nullif(p_symbol,''),'❤️'),coalesce(nullif(p_accent,''),'#ee6f83'),
        p_start_date,p_end_date,now(),auth.uid())
 on conflict(trip_id) do update set
  trip_name=excluded.trip_name,
  destination_context=excluded.destination_context,
  symbol=excluded.symbol,
  accent=excluded.accent,
  start_date=excluded.start_date,
  end_date=excluded.end_date,
  updated_at=now(),
  updated_by=auth.uid();

 return jsonb_build_object('trip_id',p_trip_id,'trip_name',p_trip_name,'destination',merged,
   'symbol',p_symbol,'accent',p_accent,'start_date',p_start_date,'end_date',p_end_date,'is_owner',true);
end;
$$;

create or replace function public.luvia_finalize_trip_creation(
 p_trip_id uuid,p_trip_name text,p_destination_context jsonb,p_symbol text,p_accent text,p_start_date date,p_end_date date
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
 v_claimed boolean;
begin
 select public.paris_claim_unowned_trip(p_trip_id) into v_claimed;
 if not coalesce(v_claimed,false) then raise exception 'TRIP_OWNER_ASSIGNMENT_FAILED'; end if;
 return public.luvia_save_trip_profile(p_trip_id,p_trip_name,p_destination_context,p_symbol,p_accent,p_start_date,p_end_date);
end;
$$;

revoke all on function public.paris_is_trip_owner(uuid) from anon;
grant execute on function public.paris_is_trip_owner(uuid) to authenticated;
revoke all on function public.paris_claim_unowned_trip(uuid) from anon;
grant execute on function public.paris_claim_unowned_trip(uuid) to authenticated;
revoke all on function public.luvia_save_trip_profile(uuid,text,jsonb,text,text,date,date) from anon;
grant execute on function public.luvia_save_trip_profile(uuid,text,jsonb,text,text,date,date) to authenticated;
revoke all on function public.luvia_finalize_trip_creation(uuid,text,jsonb,text,text,date,date) from anon;
grant execute on function public.luvia_finalize_trip_creation(uuid,text,jsonb,text,text,date,date) to authenticated;
notify pgrst,'reload schema';
