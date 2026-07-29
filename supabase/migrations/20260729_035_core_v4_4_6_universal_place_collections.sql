begin;

alter table if exists public.trip_places
  drop constraint if exists trip_places_status_check;

alter table if exists public.trip_places
  add constraint trip_places_status_check check (
    status in (
      'idea','discovered','saved','favorite','favorited','planned','reserved','selected','booked',
      'checked_in','checked_out','visited','rated','rejected','dismissed','archived','memory','travel_book'
    )
  );

create index if not exists trip_places_trip_favorite_type_idx
  on public.trip_places (trip_id,module_key,is_favorite)
  where status <> 'archived';

comment on constraint trip_places_status_check on public.trip_places is
  'Universal Place lifecycle. New clients write canonical states; legacy aliases remain readable during migration.';

commit;
