-- Luvia 13.28.2.1 / Core 4.28.2.1
-- AI Memory Bridge permission correction
-- RLS policies alone do not grant table privileges to PostgREST roles.

grant usage on schema public to authenticated;
grant select, insert, update on table public.media_memory_proposals to authenticated;

-- Keep anonymous access explicitly unavailable.
revoke all on table public.media_memory_proposals from anon;
