-- Luvia Core v2.12.4.11
-- Erteilt ausschließlich angemeldeten Benutzern die notwendigen
-- Tabellenrechte. RLS bleibt aktiv und begrenzt weiterhin den Zugriff
-- auf Reisen, deren Mitglied der Benutzer ist.

begin;

grant usage on schema public to authenticated;

grant select, insert, update, delete on table public.daily_member_stats to authenticated;
grant select, insert, update, delete on table public.day_closures to authenticated;
grant select, insert, update, delete on table public.live_moment_status to authenticated;
grant select, insert, update, delete on table public.custom_reminders to authenticated;
grant select, insert, update, delete on table public.budget_entries to authenticated;
grant select, insert, update, delete on table public.budget_settings to authenticated;
grant select, insert, update, delete on table public.reminder_status to authenticated;

-- Für Tabellen mit Identity-/Serial-Spalten. UUID-basierte Tabellen benötigen
-- dies nicht, die Freigabe ist aber für vorhandene Sequenzen unschädlich.
grant usage, select on all sequences in schema public to authenticated;

-- Keine Freigabe für anon: Reiseinhalte bleiben vor der Anmeldung gesperrt.
revoke all on table public.daily_member_stats from anon;
revoke all on table public.day_closures from anon;
revoke all on table public.live_moment_status from anon;
revoke all on table public.custom_reminders from anon;
revoke all on table public.budget_entries from anon;
revoke all on table public.budget_settings from anon;
revoke all on table public.reminder_status from anon;

commit;
