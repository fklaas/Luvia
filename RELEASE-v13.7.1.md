# Luvia Build 13.7.1 · Core 4.7.1

## Gateway, Auth & Console Runtime Closure

- Authorization wird vor geschützten Gateway-Aufrufen aufgelöst.
- Destination Resolve ist als öffentliche, nur lesende Gateway-Aktion definiert.
- CORS/OPTIONS-Vertrag wurde gehärtet.
- 502/503/504 erhalten begrenztes Backoff und Circuit Breaker.
- Diagnose, Developer Console, Backend Console, PWA und App verwenden dieselbe Release-Metadatenquelle.
- Backend Places Explorer enthält Einzeltests für Restaurants, Unterkünfte und Sehenswürdigkeiten.
- Implementierte Place-Typen werden in der Developer Console als ready ausgewiesen; kommende Typen als planned.
- Die App zeigt Build und Core sichtbar im Header sowie dynamisch im Profil.

## Deployment

Dieser Build enthält eine geänderte Supabase Edge Function. `supabase/functions/luvia-gateway` muss neu deployt werden.
