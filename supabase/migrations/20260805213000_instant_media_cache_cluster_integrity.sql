-- Luvia 13.29.2 / Core 4.29.2
-- Instant Media Cache & Cluster Data Integrity

alter table if exists public.media_clusters
  add column if not exists photo_count integer not null default 0,
  add column if not exists cover_media_id uuid null,
  add column if not exists preview_media_ids uuid[] not null default '{}';

create index if not exists media_clusters_trip_state_start_idx
  on public.media_clusters (trip_id, state, start_at);

create or replace function public.luvia_refresh_media_cluster_preview(p_cluster_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
begin
  select coalesce(array_agg(x.media_id order by x.position, x.created_at), '{}')
    into v_ids
  from public.media_cluster_items x
  where x.cluster_id = p_cluster_id;

  update public.media_clusters
     set photo_count = coalesce(array_length(v_ids, 1), 0),
         cover_media_id = case when coalesce(array_length(v_ids, 1), 0) > 0 then v_ids[1] else null end,
         preview_media_ids = coalesce(v_ids[1:4], '{}'),
         updated_at = now()
   where id = p_cluster_id;
end;
$$;

create or replace function public.luvia_media_cluster_items_preview_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.luvia_refresh_media_cluster_preview(old.cluster_id);
    return old;
  end if;
  perform public.luvia_refresh_media_cluster_preview(new.cluster_id);
  if tg_op = 'UPDATE' and old.cluster_id is distinct from new.cluster_id then
    perform public.luvia_refresh_media_cluster_preview(old.cluster_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_media_cluster_items_preview on public.media_cluster_items;
create trigger trg_media_cluster_items_preview
after insert or update or delete on public.media_cluster_items
for each row execute function public.luvia_media_cluster_items_preview_trigger();

do $$
declare r record;
begin
  for r in select id from public.media_clusters loop
    perform public.luvia_refresh_media_cluster_preview(r.id);
  end loop;
end $$;
