begin;

-- Build 13.11.0 / Core 4.11.0
-- Erweitert den kanonischen Universal-Place-Vertrag um echte Fahrrad- und MTB-Routen.
-- Die Route bleibt eine normale places-Entity; Geometrie und Routeneigenschaften
-- werden weiterhin über raw_provider_data / trip_place_data geführt.
alter table if exists public.places
  drop constraint if exists places_primary_type_check;

alter table if exists public.places
  add constraint places_primary_type_check
  check (
    primary_type in (
      'restaurant',
      'accommodation',
      'attraction',
      'photo_spot',
      'activity',
      'shopping',
      'nature',
      'family',
      'mobility',
      'transit',
      'cycling_route',
      'custom'
    )
  );

comment on constraint places_primary_type_check on public.places is
  'Kanonische Luvia-Place-Typen einschließlich cycling_route ab Core 4.11.0.';

commit;
