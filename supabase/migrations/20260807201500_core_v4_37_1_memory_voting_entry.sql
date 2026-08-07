-- Luvia 13.37.1 / Core 4.37.1 — Memory Curation UX Polish & Voting Entry
begin;

create table if not exists public.memory_card_album_votes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null,
  cluster_id uuid not null,
  card_id uuid not null references public.memory_cards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  points smallint not null default 0 check (points between 0 and 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(card_id,user_id)
);
create index if not exists memory_card_album_votes_cluster_idx on public.memory_card_album_votes(trip_id,cluster_id,updated_at desc);
alter table public.memory_card_album_votes enable row level security;
drop policy if exists memory_card_album_votes_select on public.memory_card_album_votes;
create policy memory_card_album_votes_select on public.memory_card_album_votes for select to authenticated using (public.luvia_is_trip_member(trip_id,auth.uid()));
drop policy if exists memory_card_album_votes_insert on public.memory_card_album_votes;
create policy memory_card_album_votes_insert on public.memory_card_album_votes for insert to authenticated with check (user_id=auth.uid() and public.luvia_is_trip_member(trip_id,auth.uid()));
drop policy if exists memory_card_album_votes_update on public.memory_card_album_votes;
create policy memory_card_album_votes_update on public.memory_card_album_votes for update to authenticated using (user_id=auth.uid() and public.luvia_is_trip_member(trip_id,auth.uid())) with check (user_id=auth.uid() and public.luvia_is_trip_member(trip_id,auth.uid()));
grant select,insert,update on public.memory_card_album_votes to authenticated;
do $$ begin alter publication supabase_realtime add table public.memory_card_album_votes; exception when duplicate_object then null; end $$;
commit;
