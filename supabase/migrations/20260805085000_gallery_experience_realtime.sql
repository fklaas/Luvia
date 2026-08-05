-- Luvia 13.28.3 / Core 4.28.3 - Realtime Gallery Experience
begin;
alter table public.media add column if not exists favorite boolean not null default false;
alter table public.media add column if not exists display_name text;
alter table public.media add column if not exists edit_settings jsonb not null default '{}'::jsonb;
create table if not exists public.media_day_polaroids(
  trip_id uuid not null references public.trips(id) on delete cascade,
  day_key date not null,
  media_id uuid not null references public.media(id) on delete cascade,
  selected_by uuid references auth.users(id) on delete set null,
  selected_at timestamptz not null default now(),
  primary key(trip_id,day_key), unique(media_id)
);
alter table public.media_day_polaroids enable row level security;
drop policy if exists media_day_polaroids_trip_member_all on public.media_day_polaroids;
create policy media_day_polaroids_trip_member_all on public.media_day_polaroids for all to authenticated
using(public.luvia_is_trip_member(trip_id,auth.uid())) with check(public.luvia_is_trip_member(trip_id,auth.uid()));
grant select,insert,update,delete on public.media_day_polaroids to authenticated;
do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='media_cluster_items') then alter publication supabase_realtime add table public.media_cluster_items; end if;
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='media_day_polaroids') then alter publication supabase_realtime add table public.media_day_polaroids; end if;
end $$;
commit;
