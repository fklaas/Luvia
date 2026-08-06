-- Luvia 13.29.0 / Core 4.29.0 - Memory Albums
begin;
create table if not exists public.memory_albums (
 id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
 source_cluster_id uuid references public.media_clusters(id) on delete set null,
 title text not null default 'Unsere Erinnerung', description text not null default '', mood text,
 cover_media_id uuid references public.media(id) on delete set null,
 status text not null default 'published' check(status in ('draft','published','archived')),
 metadata jsonb not null default '{}'::jsonb,
 created_by uuid references auth.users(id) on delete set null, updated_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(trip_id,source_cluster_id)
);
create table if not exists public.memory_album_items (
 album_id uuid not null references public.memory_albums(id) on delete cascade,
 media_id uuid not null references public.media(id) on delete cascade,
 position integer not null default 0, created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), primary key(album_id,media_id)
);
create index if not exists memory_albums_trip_created_idx on public.memory_albums(trip_id,created_at desc);
create index if not exists memory_album_items_album_position_idx on public.memory_album_items(album_id,position);
alter table public.memory_albums enable row level security;alter table public.memory_album_items enable row level security;
drop policy if exists memory_albums_trip_member_all on public.memory_albums;
create policy memory_albums_trip_member_all on public.memory_albums for all to authenticated using(public.luvia_is_trip_member(trip_id,auth.uid())) with check(public.luvia_is_trip_member(trip_id,auth.uid()));
drop policy if exists memory_album_items_trip_member_all on public.memory_album_items;
create policy memory_album_items_trip_member_all on public.memory_album_items for all to authenticated using(exists(select 1 from public.memory_albums a where a.id=album_id and public.luvia_is_trip_member(a.trip_id,auth.uid()))) with check(exists(select 1 from public.memory_albums a where a.id=album_id and public.luvia_is_trip_member(a.trip_id,auth.uid())));
grant select,insert,update,delete on public.memory_albums,public.memory_album_items to authenticated;
do $$ begin if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='memory_albums') then alter publication supabase_realtime add table public.memory_albums; end if; end $$;
commit;
