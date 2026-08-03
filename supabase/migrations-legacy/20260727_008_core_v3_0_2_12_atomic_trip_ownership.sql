-- Luvia 11.2.12 / Core 3.0.2.12
-- Atomic ownership repair and cloud profile finalization for newly created trips.

create or replace function public.paris_claim_unowned_trip(p_trip_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid := auth.uid();
  v_members integer := 0;
  v_owner_exists boolean := false;
begin
  if v_uid is null or p_trip_id is null then return false; end if;

  if not exists (
    select 1 from public.trip_members tm
    where nullif(to_jsonb(tm)->>'trip_id','')::uuid=p_trip_id
      and nullif(to_jsonb(tm)->>'user_id','')::uuid=v_uid
  ) then
    return false;
  end if;

  select public.paris_is_trip_owner(p_trip_id) into v_owner_exists;
  if v_owner_exists then return true; end if;

  select count(*) into v_members
  from public.trip_members tm
  where nullif(to_jsonb(tm)->>'trip_id','')::uuid=p_trip_id;

  -- A trip with exactly one member can only belong to that authenticated creator.
  if v_members <> 1 then return false; end if;

  update public.trip_members tm
     set role='owner'
   where nullif(to_jsonb(tm)->>'trip_id','')::uuid=p_trip_id
     and nullif(to_jsonb(tm)->>'user_id','')::uuid=v_uid;

  -- Keep legacy ownership columns aligned where they exist.
  begin
    update public.trips t set owner_id=v_uid
    where t.id=p_trip_id and nullif(to_jsonb(t)->>'owner_id','') is null;
  exception when undefined_column then null;
  end;
  begin
    update public.trips t set created_by=v_uid
    where t.id=p_trip_id and nullif(to_jsonb(t)->>'created_by','') is null;
  exception when undefined_column then null;
  end;

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
 if not v_owner then
   select public.paris_claim_unowned_trip(p_trip_id) into v_owner;
 end if;
 if not coalesce(v_owner,false) then raise exception 'NOT_TRIP_OWNER'; end if;

 select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) into cleaned
 from jsonb_each(coalesce(p_destination_context,'{}'::jsonb))
 where value <> 'null'::jsonb and not(jsonb_typeof(value)='string' and btrim(value #>> '{}')='');

 select coalesce(destination_context,'{}'::jsonb)||cleaned into merged
 from public.trip_settings where trip_id=p_trip_id;
 merged:=coalesce(merged,cleaned,'{}'::jsonb);

 insert into public.trip_settings(trip_id,trip_name,destination_context,symbol,accent,start_date,end_date,updated_at,updated_by)
 values(p_trip_id,left(trim(coalesce(nullif(p_trip_name,''),'Unsere Reise')),80),merged,coalesce(nullif(p_symbol,''),'❤️'),coalesce(nullif(p_accent,''),'#ee6f83'),p_start_date,p_end_date,now(),auth.uid())
 on conflict(trip_id) do update set
  trip_name=excluded.trip_name,destination_context=excluded.destination_context,symbol=excluded.symbol,accent=excluded.accent,
  start_date=excluded.start_date,end_date=excluded.end_date,updated_at=now(),updated_by=auth.uid();

 return jsonb_build_object('trip_id',p_trip_id,'trip_name',p_trip_name,'destination',merged,'symbol',p_symbol,'accent',p_accent,'start_date',p_start_date,'end_date',p_end_date,'is_owner',true);
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
 v_profile jsonb;
begin
 select public.paris_claim_unowned_trip(p_trip_id) into v_claimed;
 if not coalesce(v_claimed,false) then raise exception 'TRIP_OWNER_ASSIGNMENT_FAILED'; end if;
 select public.luvia_save_trip_profile(p_trip_id,p_trip_name,p_destination_context,p_symbol,p_accent,p_start_date,p_end_date) into v_profile;
 return v_profile;
end;
$$;

revoke all on function public.paris_claim_unowned_trip(uuid) from anon;
grant execute on function public.paris_claim_unowned_trip(uuid) to authenticated;
revoke all on function public.luvia_save_trip_profile(uuid,text,jsonb,text,text,date,date) from anon;
grant execute on function public.luvia_save_trip_profile(uuid,text,jsonb,text,text,date,date) to authenticated;
revoke all on function public.luvia_finalize_trip_creation(uuid,text,jsonb,text,text,date,date) from anon;
grant execute on function public.luvia_finalize_trip_creation(uuid,text,jsonb,text,text,date,date) to authenticated;
notify pgrst,'reload schema';
