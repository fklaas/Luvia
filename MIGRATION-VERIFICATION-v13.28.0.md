# Live-Verifikation nach Migration 13.28.0

## SQL-Kontrolle

```sql
select column_name, data_type
from information_schema.columns
where table_schema='public' and table_name='media'
order by ordinal_position;

select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id='luvia-media';

select policyname, tablename, cmd
from pg_policies
where schemaname in ('public','storage')
  and (tablename in ('media','media_pages','media_place_links','live_moment_media','objects'))
order by schemaname, tablename, policyname;
```

## Erwartung

- keine öffentliche URL für `luvia-media`
- Zugriff nur für authentifizierte Mitglieder der jeweiligen Reise
- neue Uploads erzeugen genau einen `media`-Datensatz
- Storage-Pfad beginnt mit der aktiven `trip_id`
- identischer Content-Hash erzeugt keinen zweiten aktiven Datensatz
- alte `gallery_photos` bleiben unverändert
