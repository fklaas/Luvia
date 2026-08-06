-- Luvia 13.30.0 / Core 4.30.0 - collaborative Memory Journey perspectives
begin;
create table if not exists public.memory_album_contributions (
 id uuid primary key default gen_random_uuid(),
 album_id uuid not null references public.memory_albums(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 prompt_key text not null default 'perspective',
 prompt_text text not null default '',
 answer_text text not null default '',
 reaction text not null default '',
 media_id uuid references public.media(id) on delete set null,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(album_id,user_id,prompt_key)
);
create index if not exists memory_album_contributions_album_idx on public.memory_album_contributions(album_id,updated_at);
alter table public.memory_album_contributions enable row level security;
drop policy if exists memory_album_contributions_trip_member_all on public.memory_album_contributions;
create policy memory_album_contributions_trip_member_all on public.memory_album_contributions for all to authenticated
using(exists(select 1 from public.memory_albums a where a.id=album_id and public.luvia_is_trip_member(a.trip_id,auth.uid())))
with check(user_id=auth.uid() and exists(select 1 from public.memory_albums a where a.id=album_id and public.luvia_is_trip_member(a.trip_id,auth.uid())));
grant select,insert,update,delete on public.memory_album_contributions to authenticated;
do $$ begin if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='memory_album_contributions') then alter publication supabase_realtime add table public.memory_album_contributions; end if; end $$;
commit;
