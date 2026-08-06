-- Luvia 13.29.5 / Core 4.29.5
-- Gallery Stabilization & Direct Thumbnail Delivery
begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'luvia-media-thumbnails',
  'luvia-media-thumbnails',
  true,
  10485760,
  array['image/webp','image/jpeg','image/png']
)
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Public read is intentional for non-identifiable, EXIF-free thumbnails at UUID paths.
drop policy if exists "Public read Luvia thumbnails" on storage.objects;
create policy "Public read Luvia thumbnails"
on storage.objects for select
to public
using (bucket_id = 'luvia-media-thumbnails');

-- Authenticated clients may create thumbnails only inside trips they belong to.
drop policy if exists "Members upload Luvia thumbnails" on storage.objects;
create policy "Members upload Luvia thumbnails"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'luvia-media-thumbnails'
  and exists (
    select 1 from public.trip_members tm
    where tm.trip_id::text = (storage.foldername(name))[1]
      and tm.user_id = auth.uid()
  )
);

drop policy if exists "Members update Luvia thumbnails" on storage.objects;
create policy "Members update Luvia thumbnails"
on storage.objects for update
to authenticated
using (
  bucket_id = 'luvia-media-thumbnails'
  and exists (
    select 1 from public.trip_members tm
    where tm.trip_id::text = (storage.foldername(name))[1]
      and tm.user_id = auth.uid()
  )
)
with check (
  bucket_id = 'luvia-media-thumbnails'
  and exists (
    select 1 from public.trip_members tm
    where tm.trip_id::text = (storage.foldername(name))[1]
      and tm.user_id = auth.uid()
  )
);


-- Remove stale empty clusters created by interrupted analysis runs.
delete from public.media_clusters c
where not exists (select 1 from public.media_cluster_items i where i.cluster_id = c.id);

-- Exact duplicate memberships are deduplicated in the canonical Gallery Store.
-- They are not destructively deleted here because Memory Albums may reference an older cluster id.

-- Bootstrap v2: one snapshot and no component-side follow-up queries.
create or replace function public.luvia_gallery_bootstrap(p_trip_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  result jsonb;
begin
  if not exists (
    select 1 from public.trip_members tm
    where tm.trip_id = p_trip_id and tm.user_id = auth.uid()
  ) then
    raise exception 'FORBIDDEN';
  end if;

  select jsonb_build_object(
    'media', coalesce((
      select jsonb_agg(to_jsonb(m) order by m.captured_at nulls last, m.created_at)
      from public.media m
      where m.trip_id = p_trip_id and m.type = 'image' and m.status <> 'deleted'
    ), '[]'::jsonb),
    'clusters', coalesce((
      select jsonb_agg(
        to_jsonb(c) || jsonb_build_object(
          'mediaIds', coalesce((
            select jsonb_agg(i.media_id order by i.position, i.created_at)
            from public.media_cluster_items i
            where i.cluster_id = c.id
          ), '[]'::jsonb)
        ) order by c.start_at nulls last
      )
      from public.media_clusters c
      where c.trip_id = p_trip_id
    ), '[]'::jsonb),
    'albums', coalesce((
      select jsonb_agg(
        to_jsonb(a) || jsonb_build_object(
          'media_ids', coalesce((
            select jsonb_agg(i.media_id order by i.position, i.created_at)
            from public.memory_album_items i
            where i.album_id = a.id
          ), '[]'::jsonb),
          'photo_count', (select count(*) from public.memory_album_items i where i.album_id = a.id)
        ) order by a.created_at desc
      )
      from public.memory_albums a
      where a.trip_id = p_trip_id and a.status <> 'archived'
    ), '[]'::jsonb),
    'polaroids', coalesce((
      select jsonb_agg(to_jsonb(p))
      from public.media_day_polaroids p
      where p.trip_id = p_trip_id
    ), '[]'::jsonb),
    'schema', 'gallery-bootstrap-v2'
  ) into result;

  return result;
end;
$$;

grant execute on function public.luvia_gallery_bootstrap(uuid) to authenticated;

commit;
