# Luvia v13.39.3 / Core 4.39.2 — Provider Handoff Enrichment Fix

## Problem
Auf kompakten KI-/Places-Karten war beim Klick auf „Reservieren“ oft nur Name + Provider-Place-ID vorhanden. Die offizielle Website wurde erst in der Place-Detailansicht nachgeladen. Der Booking-Resolver erhielt dadurch keine Website und fiel sofort auf das E-Mail-Formular zurück, obwohl ein direktes Buchungssystem existierte.

## Fix
- Booking-CTA lädt vor dem Routing die kanonischen Place-Details anhand der Provider-Place-ID nach.
- `websiteUri`/`website`, vorhandene `reservationUrl`/`bookingUrl` und E-Mail werden in den Routing-Kontext übernommen.
- Erst danach wird `booking-route-resolve` aufgerufen.
- Direkter verifizierter Anbieterlink öffnet sich sofort; das Mail-Formular erscheint nur bei echtem Fallback.
- Cache-Busting auf Build 13.39.3 erhöht.

## Infrastruktur
Keine SQL-Migration. Keine neue Edge Function. `booking-route-resolve` muss für diesen Client-Fix nicht erneut deployed werden, sofern bereits v13.39.1 deployed ist.
