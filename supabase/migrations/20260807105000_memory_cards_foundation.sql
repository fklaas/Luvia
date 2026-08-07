-- Luvia 13.36.0 / Core 4.36.0 - Memory Cards Foundation
begin;

create table if not exists public.memory_cards (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null,
  author_id uuid not null references auth.users(id) on delete cascade,
  card_type text not null,
  source_type text not null default 'manual',
  content text not null default '',
  media_id uuid references public.media(id) on delete set null,
  cluster_id uuid,
  journey_id uuid references public.memory_journeys(id) on delete set null,
  reaction text not null default '',
  weight smallint not null default 1 check (weight between 1 and 3),
  visibility text not null default 'trip' check (visibility in ('private','trip')),
  status text not null default 'active' check (status in ('active','dismissed','archived')),
  dedupe_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists memory_cards_trip_idx on public.memory_cards(trip_id, updated_at desc);
create index if not exists memory_cards_cluster_idx on public.memory_cards(cluster_id, updated_at desc);
create index if not exists memory_cards_author_idx on public.memory_cards(author_id, updated_at desc);
create unique index if not exists memory_cards_trip_dedupe_uidx on public.memory_cards(trip_id, dedupe_key);

alter table public.memory_cards enable row level security;

drop policy if exists memory_cards_trip_member_select on public.memory_cards;
create policy memory_cards_trip_member_select on public.memory_cards
for select to authenticated
using (
  author_id = auth.uid()
  or (visibility = 'trip' and public.luvia_is_trip_member(trip_id, auth.uid()))
);

drop policy if exists memory_cards_author_insert on public.memory_cards;
create policy memory_cards_author_insert on public.memory_cards
for insert to authenticated
with check (
  author_id = auth.uid()
  and public.luvia_is_trip_member(trip_id, auth.uid())
);

drop policy if exists memory_cards_author_update on public.memory_cards;
create policy memory_cards_author_update on public.memory_cards
for update to authenticated
using (author_id = auth.uid() and public.luvia_is_trip_member(trip_id, auth.uid()))
with check (author_id = auth.uid() and public.luvia_is_trip_member(trip_id, auth.uid()));

drop policy if exists memory_cards_author_delete on public.memory_cards;
create policy memory_cards_author_delete on public.memory_cards
for delete to authenticated
using (author_id = auth.uid() and public.luvia_is_trip_member(trip_id, auth.uid()));

grant select, insert, update, delete on public.memory_cards to authenticated;

do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='memory_cards'
  ) then
    alter publication supabase_realtime add table public.memory_cards;
  end if;
end $$;

commit;
