begin;

create table if not exists public.memory_member_identity (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  avatar_color text not null default '#ee6f83',
  updated_at timestamptz not null default now()
);

insert into public.memory_member_identity(user_id,display_name,avatar_url,avatar_color,updated_at)
select user_id,display_name,avatar_url,coalesce(avatar_color,'#ee6f83'),coalesce(updated_at,now())
from public.user_profiles
on conflict(user_id) do update set display_name=excluded.display_name,avatar_url=excluded.avatar_url,avatar_color=excluded.avatar_color,updated_at=excluded.updated_at;

create or replace function public.luvia_sync_memory_member_identity()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.memory_member_identity(user_id,display_name,avatar_url,avatar_color,updated_at)
  values(new.user_id,new.display_name,new.avatar_url,coalesce(new.avatar_color,'#ee6f83'),now())
  on conflict(user_id) do update set display_name=excluded.display_name,avatar_url=excluded.avatar_url,avatar_color=excluded.avatar_color,updated_at=now();
  return new;
end;$$;

drop trigger if exists trg_luvia_memory_member_identity on public.user_profiles;
create trigger trg_luvia_memory_member_identity
after insert or update of display_name,avatar_url,avatar_color on public.user_profiles
for each row execute function public.luvia_sync_memory_member_identity();

create or replace function public.luvia_memory_can_see_member(p_target_user_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select p_target_user_id=auth.uid() or exists (
    select 1
    from public.trip_members mine
    join public.trip_members theirs
      on nullif(to_jsonb(mine)->>'trip_id','')=nullif(to_jsonb(theirs)->>'trip_id','')
    where nullif(to_jsonb(mine)->>'user_id','')::uuid=auth.uid()
      and nullif(to_jsonb(theirs)->>'user_id','')::uuid=p_target_user_id
  );
$$;
grant execute on function public.luvia_memory_can_see_member(uuid) to authenticated;

alter table public.memory_member_identity enable row level security;
drop policy if exists memory_member_identity_shared_trip_select on public.memory_member_identity;
create policy memory_member_identity_shared_trip_select on public.memory_member_identity
for select to authenticated using (public.luvia_memory_can_see_member(user_id));

grant select on public.memory_member_identity to authenticated;

do $$ begin
  alter publication supabase_realtime add table public.memory_member_identity;
exception when duplicate_object then null;
end $$;

commit;
