-- Luvia 13.28.0 / Core 4.28.0
-- Smart Photo Foundation: canonical media metadata, private storage, place and live-moment links.

begin;

alter table public.media add column if not exists participant_id uuid;
alter table public.media add column if not exists storage_bucket text not null default 'luvia-media';
alter table public.media add column if not exists preview_path text;
alter table public.media add column if not exists thumbnail_path text;
alter table public.media add column if not exists captured_at timestamptz;
alter table public.media add column if not exists day_key date;
alter table public.media add column if not exists timezone text;
alter table public.media add column if not exists latitude numeric(10,7);
alter table public.media add column if not exists longitude numeric(10,7);
alter table public.media add column if not exists width integer;
alter table public.media add column if not exists height integer;
alter table public.media add column if not exists file_size bigint;
alter table public.media add column if not exists content_hash text;
alter table public.media add column if not exists place_id uuid;
alter table public.media add column if not exists legacy_source text;
alter table public.media add column if not exists legacy_id uuid;

update public.media
set captured_at = coalesce(captured_at, created_at),
    day_key = coalesce(day_key, coalesce(captured_at, created_at)::date),
    storage_bucket = coalesce(nullif(storage_bucket,''), 'luvia-media')
where captured_at is null or day_key is null or storage_bucket is null or storage_bucket='';

do $$
begin
  if to_regclass('public.places') is not null
     and not exists (
       select 1 from pg_constraint
       where conrelid='public.media'::regclass and conname='media_place_id_fkey'
     ) then
    alter table public.media add constraint media_place_id_fkey foreign key(place_id) references public.places(id) on delete set null;
  end if;
end $$;

create unique index if not exists media_trip_content_hash_unique
  on public.media(trip_id, content_hash)
  where content_hash is not null and status <> 'deleted';
create index if not exists media_trip_captured_at_idx on public.media(trip_id, captured_at);
create index if not exists media_trip_day_key_idx on public.media(trip_id, day_key);
create index if not exists media_place_trip_idx on public.media(trip_id, place_id);
create index if not exists media_user_id_idx on public.media(user_id);

create table if not exists public.media_place_links (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  media_id uuid not null references public.media(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  source text not null default 'manual' check(source in ('manual','gps','timeline','ai','legacy')),
  confidence numeric(5,4) not null default 1 check(confidence >= 0 and confidence <= 1),
  evidence jsonb not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(media_id, place_id)
);

create table if not exists public.live_moment_media (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  moment_key text not null,
  media_id uuid not null references public.media(id) on delete cascade,
  position integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(trip_id, moment_key, media_id)
);

alter table public.media enable row level security;
alter table public.media_pages enable row level security;
alter table public.media_place_links enable row level security;
alter table public.live_moment_media enable row level security;

drop policy if exists media_trip_member_select on public.media;
create policy media_trip_member_select on public.media for select to authenticated
using (public.luvia_is_trip_member(trip_id, auth.uid()));
drop policy if exists media_trip_member_insert on public.media;
create policy media_trip_member_insert on public.media for insert to authenticated
with check (user_id=auth.uid() and public.luvia_is_trip_member(trip_id, auth.uid()));
drop policy if exists media_trip_member_update on public.media;
create policy media_trip_member_update on public.media for update to authenticated
using (public.luvia_is_trip_member(trip_id, auth.uid()))
with check (public.luvia_is_trip_member(trip_id, auth.uid()));
drop policy if exists media_trip_member_delete on public.media;
create policy media_trip_member_delete on public.media for delete to authenticated
using (public.luvia_is_trip_member(trip_id, auth.uid()));

drop policy if exists media_pages_trip_member_all on public.media_pages;
create policy media_pages_trip_member_all on public.media_pages for all to authenticated
using (exists(select 1 from public.media m where m.id=media_pages.media_id and public.luvia_is_trip_member(m.trip_id,auth.uid())))
with check (exists(select 1 from public.media m where m.id=media_pages.media_id and public.luvia_is_trip_member(m.trip_id,auth.uid())));

drop policy if exists media_place_links_trip_member_all on public.media_place_links;
create policy media_place_links_trip_member_all on public.media_place_links for all to authenticated
using (public.luvia_is_trip_member(trip_id,auth.uid()))
with check (public.luvia_is_trip_member(trip_id,auth.uid()));

drop policy if exists live_moment_media_trip_member_all on public.live_moment_media;
create policy live_moment_media_trip_member_all on public.live_moment_media for all to authenticated
using (public.luvia_is_trip_member(trip_id,auth.uid()))
with check (public.luvia_is_trip_member(trip_id,auth.uid()));

grant select,insert,update,delete on public.media,public.media_pages,public.media_place_links,public.live_moment_media to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('luvia-media','luvia-media',false,26214400,array['image/jpeg','image/png','image/webp','image/heic','image/heif','image/avif'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists luvia_media_objects_select on storage.objects;
create policy luvia_media_objects_select on storage.objects for select to authenticated
using (bucket_id='luvia-media' and public.luvia_is_trip_member((storage.foldername(name))[1]::uuid,auth.uid()));
drop policy if exists luvia_media_objects_insert on storage.objects;
create policy luvia_media_objects_insert on storage.objects for insert to authenticated
with check (bucket_id='luvia-media' and public.luvia_is_trip_member((storage.foldername(name))[1]::uuid,auth.uid()) and owner_id=auth.uid()::text);
drop policy if exists luvia_media_objects_update on storage.objects;
create policy luvia_media_objects_update on storage.objects for update to authenticated
using (bucket_id='luvia-media' and public.luvia_is_trip_member((storage.foldername(name))[1]::uuid,auth.uid()))
with check (bucket_id='luvia-media' and public.luvia_is_trip_member((storage.foldername(name))[1]::uuid,auth.uid()));
drop policy if exists luvia_media_objects_delete on storage.objects;
create policy luvia_media_objects_delete on storage.objects for delete to authenticated
using (bucket_id='luvia-media' and public.luvia_is_trip_member((storage.foldername(name))[1]::uuid,auth.uid()));

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='media') then
    alter publication supabase_realtime add table public.media;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='live_moment_media') then
    alter publication supabase_realtime add table public.live_moment_media;
  end if;
end $$;

commit;
