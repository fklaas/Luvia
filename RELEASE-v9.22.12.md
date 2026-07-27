# Luvia v9.22.12 · Core v2.12.4.12

## Behoben
- Zentraler Supabase-Realtime-Kanal ist pro Konto und Reise ein Singleton.
- Mehrfache `postgres_changes`-Registrierungen nach `subscribe()` werden verhindert.
- Realtime wird bei Abmeldung, Reisewechsel und Seitenende sauber beendet.
- Restaurantmodul normalisiert fehlende Überschriften- und Modelldaten vor jedem Rendern.
- Favoriten und Tagesnotizen erhalten die notwendigen Rechte für angemeldete Nutzer.
- Besitzererkennung berücksichtigt Mitgliedsrolle sowie `owner_id`, `created_by` und `user_id` der Reise.
- Eigene Reisen können über eine robuste, kaskadenähnliche Löschfunktion endgültig entfernt werden.
- Löschvorgang prüft Session und Besitzerstatus und zeigt verständliche Fehler an.

## Supabase
Einmal ausführen:
`supabase/migrations/20260727_006_core_v2_12_4_12_realtime_owner_delete_repair.sql`
