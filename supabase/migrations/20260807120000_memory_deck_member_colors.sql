begin;

drop function if exists public.luvia_list_trip_members(uuid);
create function public.luvia_list_trip_members(p_trip_id uuid)
returns table(id uuid,user_id uuid,display_name text,role text,joined_at timestamptz,avatar_url text,avatar_color text)
language sql stable security definer set search_path=public as $$
 select tm.id,
   nullif(to_jsonb(tm)->>'user_id','')::uuid,
   coalesce(nullif(to_jsonb(tm)->>'display_name',''),nullif(to_jsonb(tm)->>'member_name',''),nullif(to_jsonb(tm)->>'name',''),'Mitreisende Person'),
   coalesce(nullif(to_jsonb(tm)->>'role',''),nullif(to_jsonb(tm)->>'member_role',''),'member'),
   coalesce(nullif(to_jsonb(tm)->>'joined_at','')::timestamptz,nullif(to_jsonb(tm)->>'created_at','')::timestamptz,now()),
   up.avatar_url,
   coalesce(up.avatar_color,'#d88198')
 from public.trip_members tm
 left join public.user_profiles up on up.user_id=nullif(to_jsonb(tm)->>'user_id','')::uuid
 where nullif(to_jsonb(tm)->>'trip_id','')::uuid=p_trip_id
 and public.luvia_is_trip_member(p_trip_id)
 order by coalesce(nullif(to_jsonb(tm)->>'joined_at','')::timestamptz,nullif(to_jsonb(tm)->>'created_at','')::timestamptz,now()),tm.id;
$$;
grant execute on function public.luvia_list_trip_members(uuid) to authenticated;

commit;
