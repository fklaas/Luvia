-- Luvia 13.29.4 / Core 4.29.4 - Media Delivery Rebuild
begin;

alter table if exists public.media
  add column if not exists thumb_256_path text,
  add column if not exists thumb_640_path text,
  add column if not exists preview_1280_path text;

create index if not exists media_trip_ready_day_delivery_idx
  on public.media (trip_id, day_key, captured_at)
  where status = 'ready' and type = 'image';

create or replace function public.luvia_gallery_bootstrap(p_trip_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
with
media_rows as (
  select coalesce(jsonb_agg(to_jsonb(m) order by m.captured_at nulls last, m.created_at), '[]'::jsonb) value
  from public.media m
  where m.trip_id = p_trip_id and m.type = 'image' and m.status <> 'deleted'
),
cluster_rows as (
  select coalesce(jsonb_agg(
    to_jsonb(c) || jsonb_build_object(
      'mediaIds', coalesce((select jsonb_agg(i.media_id order by i.position, i.created_at) from public.media_cluster_items i where i.cluster_id = c.id), '[]'::jsonb),
      'preview_media_ids', coalesce(to_jsonb(c.preview_media_ids), '[]'::jsonb)
    ) order by c.start_at nulls last
  ), '[]'::jsonb) value
  from public.media_clusters c
  where c.trip_id = p_trip_id
),
album_rows as (
  select coalesce(jsonb_agg(
    to_jsonb(a) || jsonb_build_object(
      'media_ids', coalesce((select jsonb_agg(i.media_id order by i.position, i.created_at) from public.memory_album_items i where i.album_id = a.id), '[]'::jsonb),
      'photo_count', coalesce((select count(*) from public.memory_album_items i where i.album_id = a.id),0)
    ) order by a.created_at desc
  ), '[]'::jsonb) value
  from public.memory_albums a
  where a.trip_id = p_trip_id and a.status <> 'archived'
),
polaroid_rows as (
  select coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) value
  from public.media_day_polaroids p
  where p.trip_id = p_trip_id
)
select jsonb_build_object(
  'media', (select value from media_rows),
  'clusters', (select value from cluster_rows),
  'albums', (select value from album_rows),
  'polaroids', (select value from polaroid_rows),
  'schema', 'gallery-bootstrap-v1'
);
$$;

grant execute on function public.luvia_gallery_bootstrap(uuid) to authenticated;

commit;
