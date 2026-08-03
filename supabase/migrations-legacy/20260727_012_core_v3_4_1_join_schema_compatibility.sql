-- Luvia Core 3.4.1 · Join schema compatibility repair
-- Replaces the join RPC with a schema-aware implementation for legacy trip_members tables.
begin;

create or replace function public.luvia_join_trip_by_code(p_join_code text,p_display_name text)
returns table(trip_id uuid,member_id uuid,member_role text,already_member boolean)
language plpgsql security definer set search_path=public as $$
declare
  v_trip uuid;
  v_member uuid;
  v_existing boolean:=false;
  v_code text:=public.luvia_normalize_join_code(p_join_code);
  v_name text:=left(trim(coalesce(p_display_name,'')),80);
  v_name_col text;
  v_role_col text;
  v_joined_col text;
  v_columns text:='trip_id,user_id';
  v_values text:='$1,$2';
  v_position integer:=3;
  v_sql text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if length(v_code)<5 then raise exception 'INVALID_INVITE_CODE'; end if;
  if v_name='' then raise exception 'DISPLAY_NAME_REQUIRED'; end if;

  execute $q$select t.id from public.trips t where public.luvia_normalize_join_code(coalesce(to_jsonb(t)->>'join_code',to_jsonb(t)->>'code',to_jsonb(t)->>'trip_code'))=$1 limit 1$q$
    into v_trip using v_code;
  if v_trip is null then raise exception 'INVITE_NOT_FOUND'; end if;

  select tm.id,true into v_member,v_existing
  from public.trip_members tm
  where nullif(to_jsonb(tm)->>'trip_id','')::uuid=v_trip
    and nullif(to_jsonb(tm)->>'user_id','')::uuid=auth.uid()
  limit 1;

  select case
    when exists(select 1 from information_schema.columns where table_schema='public' and table_name='trip_members' and column_name='display_name') then 'display_name'
    when exists(select 1 from information_schema.columns where table_schema='public' and table_name='trip_members' and column_name='member_name') then 'member_name'
    when exists(select 1 from information_schema.columns where table_schema='public' and table_name='trip_members' and column_name='name') then 'name'
  end into v_name_col;

  select case
    when exists(select 1 from information_schema.columns where table_schema='public' and table_name='trip_members' and column_name='role') then 'role'
    when exists(select 1 from information_schema.columns where table_schema='public' and table_name='trip_members' and column_name='member_role') then 'member_role'
  end into v_role_col;

  select case
    when exists(select 1 from information_schema.columns where table_schema='public' and table_name='trip_members' and column_name='joined_at') then 'joined_at'
    when exists(select 1 from information_schema.columns where table_schema='public' and table_name='trip_members' and column_name='created_at') then 'created_at'
  end into v_joined_col;

  if not coalesce(v_existing,false) then
    if v_name_col is not null then v_columns:=v_columns||','||quote_ident(v_name_col);v_values:=v_values||',$'||v_position;v_position:=v_position+1;end if;
    if v_role_col is not null then v_columns:=v_columns||','||quote_ident(v_role_col);v_values:=v_values||',$'||v_position;v_position:=v_position+1;end if;
    if v_joined_col is not null then v_columns:=v_columns||','||quote_ident(v_joined_col);v_values:=v_values||',now()';end if;
    v_sql:='insert into public.trip_members('||v_columns||') values('||v_values||') returning id';
    if v_name_col is not null and v_role_col is not null then execute v_sql into v_member using v_trip,auth.uid(),v_name,'member';
    elsif v_name_col is not null then execute v_sql into v_member using v_trip,auth.uid(),v_name;
    elsif v_role_col is not null then execute v_sql into v_member using v_trip,auth.uid(),'member';
    else execute v_sql into v_member using v_trip,auth.uid();
    end if;
  elsif v_name_col is not null then
    execute format('update public.trip_members set %I=$1 where id=$2',v_name_col) using v_name,v_member;
  end if;

  return query select v_trip,v_member,
    coalesce((select coalesce(nullif(to_jsonb(tm)->>'role',''),nullif(to_jsonb(tm)->>'member_role',''),'member') from public.trip_members tm where tm.id=v_member),'member'),
    coalesce(v_existing,false);
end $$;

grant execute on function public.luvia_join_trip_by_code(text,text) to authenticated;

commit;
