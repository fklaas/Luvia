-- Luvia 13.29.1 / Core 4.29.1 - Memory Album Experience & participant favorites
begin;
create table if not exists public.memory_album_favorites (
 album_id uuid not null references public.memory_albums(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 media_id uuid not null references public.media(id) on delete cascade,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(album_id,user_id)
);
create index if not exists memory_album_favorites_album_idx on public.memory_album_favorites(album_id);
alter table public.memory_album_favorites enable row level security;
drop policy if exists memory_album_favorites_trip_member_all on public.memory_album_favorites;
create policy memory_album_favorites_trip_member_all on public.memory_album_favorites for all to authenticated
using(exists(select 1 from public.memory_albums a where a.id=album_id and public.luvia_is_trip_member(a.trip_id,auth.uid())))
with check(user_id=auth.uid() and exists(select 1 from public.memory_albums a where a.id=album_id and public.luvia_is_trip_member(a.trip_id,auth.uid())));
grant select,insert,update,delete on public.memory_album_favorites to authenticated;
commit;
