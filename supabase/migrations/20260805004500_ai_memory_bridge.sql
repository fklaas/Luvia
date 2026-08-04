-- Luvia 13.28.2 / Core 4.28.2 - AI Memory Bridge
create table if not exists public.media_memory_proposals (
  id uuid primary key,
  trip_id uuid not null references public.trips(id) on delete cascade,
  cluster_id uuid not null references public.media_clusters(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft','executed','rejected','failed')),
  title text not null,
  explanation text not null default '',
  actions jsonb not null default '[]'::jsonb,
  evidence_refs jsonb not null default '[]'::jsonb,
  context_snapshot jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.media_memory_proposals enable row level security;
drop policy if exists media_memory_proposals_select on public.media_memory_proposals;
create policy media_memory_proposals_select on public.media_memory_proposals for select using (public.luvia_is_trip_member(trip_id, auth.uid()));
drop policy if exists media_memory_proposals_insert on public.media_memory_proposals;
create policy media_memory_proposals_insert on public.media_memory_proposals for insert with check (public.luvia_is_trip_member(trip_id, auth.uid()) and created_by=auth.uid());
drop policy if exists media_memory_proposals_update on public.media_memory_proposals;
create policy media_memory_proposals_update on public.media_memory_proposals for update using (public.luvia_is_trip_member(trip_id, auth.uid())) with check (public.luvia_is_trip_member(trip_id, auth.uid()));
create index if not exists media_memory_proposals_trip_cluster_idx on public.media_memory_proposals(trip_id,cluster_id,created_at desc);
