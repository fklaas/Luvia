# Luvia 13.1.3.4

## Persistent Schedule & One-Tap Planning Fix

- Vorschläge werden per Klick direkt und auf den nächsten 5-Minuten-Slot gerundet eingeplant.
- Tagespläne werden zusätzlich universell in `trip_schedule_events` gespeichert.
- Hard-Reloads laden den Tagesplan wieder aus Supabase.
- Restaurant-Planung und universeller Schedule bleiben synchron.
