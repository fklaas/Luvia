# Luvia v9.20.0 — Core V2.12.3

## Restaurant Import Service

- sicherer Gateway-Endpunkt `restaurant.import`
- serverseitiger Google-Place-Detailabruf
- atomarer Place-, TripPlace- und Restaurant-Upsert
- Duplikatschutz und Wiederverwendung globaler Places
- `restaurant.list` für gespeicherte Reise-Restaurants
- Restaurant-Service im Frontend
- zielbezogene Google-Places-Suche direkt im Restaurant-Modul
- Button „Zur Reise hinzufügen“ im Modul und Places Explorer
- Import-Metriken, Logging und Health-Diagnose

## Deployment

1. Migration `20260726_004_core_v2_12_3_restaurant_import_service.sql` ausführen.
2. Edge Function `luvia-gateway` neu deployen.
3. Frontend über GitHub/Cloudflare deployen.
