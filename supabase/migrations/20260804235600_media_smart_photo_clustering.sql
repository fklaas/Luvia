-- Luvia 13.28.1.1 / Core 4.28.1.1 - Smart Photo Clustering
begin;
create table if not exists public.media_clusters (
 id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id) on delete cascade,
 title text not null default 'Fotomoment', state text not null default 'active' check(state in ('active','dismissed')), kind text not null default 'moment' check(kind in ('moment','screenshots','documents')),
 start_at timestamptz not null, end_at timestamptz not null, is_automatic boolean not null default true,
 confidence numeric(5,4) not null default 1 check(confidence between 0 and 1), source_key text,
 created_by uuid references auth.users(id) on delete set null, updated_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(trip_id,source_key)
);
create table if not exists public.media_cluster_items (
 cluster_id uuid not null references public.media_clusters(id) on delete cascade,
 media_id uuid not null references public.media(id) on delete cascade, position integer not null default 0,
 created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(),
 primary key(cluster_id,media_id)
);
create index if not exists media_clusters_trip_start_idx on public.media_clusters(trip_id,start_at);
create unique index if not exists media_cluster_items_one_cluster_per_media on public.media_cluster_items(media_id);
alter table public.media_clusters enable row level security;alter table public.media_cluster_items enable row level security;
drop policy if exists media_clusters_trip_member_all on public.media_clusters;
create policy media_clusters_trip_member_all on public.media_clusters for all to authenticated using(public.luvia_is_trip_member(trip_id,auth.uid())) with check(public.luvia_is_trip_member(trip_id,auth.uid()));
drop policy if exists media_cluster_items_trip_member_all on public.media_cluster_items;
create policy media_cluster_items_trip_member_all on public.media_cluster_items for all to authenticated using(exists(select 1 from public.media_clusters c where c.id=cluster_id and public.luvia_is_trip_member(c.trip_id,auth.uid()))) with check(exists(select 1 from public.media_clusters c where c.id=cluster_id and public.luvia_is_trip_member(c.trip_id,auth.uid())));
grant select,insert,update,delete on public.media_clusters,public.media_cluster_items to authenticated;
do $$ begin if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='media_clusters') then alter publication supabase_realtime add table public.media_clusters; end if; end $$;
commit;
