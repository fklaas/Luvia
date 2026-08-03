begin;

create table if not exists public.trip_place_data (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  trip_place_id uuid not null references public.trip_places(id) on delete cascade,
  place_id uuid references public.places(id) on delete cascade,
  place_type text not null,
  fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(trip_place_id)
);

create index if not exists trip_place_data_trip_type_idx on public.trip_place_data(trip_id,place_type);
create index if not exists trip_place_data_place_idx on public.trip_place_data(place_id);

alter table public.trip_place_data enable row level security;
drop policy if exists trip_place_data_member_select on public.trip_place_data;
create policy trip_place_data_member_select on public.trip_place_data for select to authenticated using (
  exists(select 1 from public.trip_members tm where tm.trip_id=trip_place_data.trip_id and tm.user_id=auth.uid())
);
drop policy if exists trip_place_data_member_write on public.trip_place_data;
create policy trip_place_data_member_write on public.trip_place_data for all to authenticated using (
  exists(select 1 from public.trip_members tm where tm.trip_id=trip_place_data.trip_id and tm.user_id=auth.uid())
) with check (
  exists(select 1 from public.trip_members tm where tm.trip_id=trip_place_data.trip_id and tm.user_id=auth.uid())
);

grant select,insert,update,delete on public.trip_place_data to authenticated;

do $$ begin
 if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='trip_place_data') then
  alter publication supabase_realtime add table public.trip_place_data;
 end if;
end $$;

commit;
