-- Luvia 13.37.0 / Core 4.37.0 — Memory Curation Foundation
begin;

create table if not exists public.memory_stack_curation (
  trip_id uuid not null,
  cluster_id uuid not null,
  status text not null default 'active' check (status in ('active','dissolved')),
  day_key date,
  auto_title text,
  chosen_title text,
  metadata jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (trip_id,cluster_id)
);
create index if not exists memory_stack_curation_trip_idx on public.memory_stack_curation(trip_id,status,updated_at desc);

create table if not exists public.memory_stack_title_proposals (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null,
  cluster_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 90),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(trip_id,cluster_id,user_id)
);
create index if not exists memory_stack_title_proposals_trip_idx on public.memory_stack_title_proposals(trip_id,cluster_id,created_at);

alter table public.memory_stack_curation enable row level security;
alter table public.memory_stack_title_proposals enable row level security;

drop policy if exists memory_stack_curation_select on public.memory_stack_curation;
create policy memory_stack_curation_select on public.memory_stack_curation for select to authenticated
using (public.luvia_is_trip_member(trip_id,auth.uid()));

drop policy if exists memory_stack_title_proposals_select on public.memory_stack_title_proposals;
create policy memory_stack_title_proposals_select on public.memory_stack_title_proposals for select to authenticated
using (public.luvia_is_trip_member(trip_id,auth.uid()));
drop policy if exists memory_stack_title_proposals_insert on public.memory_stack_title_proposals;
create policy memory_stack_title_proposals_insert on public.memory_stack_title_proposals for insert to authenticated
with check (user_id=auth.uid() and public.luvia_is_trip_member(trip_id,auth.uid()));
drop policy if exists memory_stack_title_proposals_update on public.memory_stack_title_proposals;
create policy memory_stack_title_proposals_update on public.memory_stack_title_proposals for update to authenticated
using (user_id=auth.uid() and public.luvia_is_trip_member(trip_id,auth.uid()))
with check (user_id=auth.uid() and public.luvia_is_trip_member(trip_id,auth.uid()));
drop policy if exists memory_stack_title_proposals_delete on public.memory_stack_title_proposals;
create policy memory_stack_title_proposals_delete on public.memory_stack_title_proposals for delete to authenticated
using (user_id=auth.uid() and public.luvia_is_trip_member(trip_id,auth.uid()));

grant select on public.memory_stack_curation to authenticated;
grant select,insert,update,delete on public.memory_stack_title_proposals to authenticated;

-- Review decisions are shared curation evidence. Every trip member may read the
-- aggregate source, while writes remain strictly bound to the current user.
drop policy if exists memory_card_album_reviews_select on public.memory_card_album_reviews;
create policy memory_card_album_reviews_select on public.memory_card_album_reviews
for select to authenticated using (public.luvia_is_trip_member(trip_id,auth.uid()));

create or replace function public.luvia_memory_dissolve_stack(p_trip_id uuid,p_cluster_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.paris_is_trip_owner(p_trip_id) then raise exception 'Nur der Reisebesitzer darf einen Kartenstapel auflösen.'; end if;
  insert into public.memory_stack_curation(trip_id,cluster_id,status,updated_by,updated_at)
  values(p_trip_id,p_cluster_id,'dissolved',auth.uid(),now())
  on conflict(trip_id,cluster_id) do update set status='dissolved',updated_by=auth.uid(),updated_at=now();
  return true;
end;$$;
revoke all on function public.luvia_memory_dissolve_stack(uuid,uuid) from public,anon;
grant execute on function public.luvia_memory_dissolve_stack(uuid,uuid) to authenticated;

do $$ begin
  alter publication supabase_realtime add table public.memory_stack_curation;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.memory_stack_title_proposals;
exception when duplicate_object then null; end $$;

commit;
