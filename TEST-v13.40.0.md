# TEST — Luvia v13.40.0 / Core 4.40.0

## Statische Tests
- Release-/Core-Version konsistent.
- Booking-JavaScript syntaktisch valide.
- neue Provider Capability + Status Provenance Contracts werden vor Registry/Integration geladen.
- Migration enthält neue Status `forwarded` und `alternative_proposed`.
- Deep-Link-Handoff kann nur `forwarded` setzen.
- Provider Auto-Status benötigt `service_role` + `luvia_access_state=connected`.
- Webhook/Polling werden nur akzeptiert, wenn die Capability dafür explizit `true` ist.
- Provider-Event-ID wird idempotent dedupliziert.
- Affiliate-Conversion ändert weiterhin nicht automatisch den Booking-Status.

## Produktions-Smoke nach Migration
1. Migration ausführen.
2. Provider-Capability-Seeds lesen.
3. Bestehende Buchungen laden.
4. Testbuchung `ready -> forwarded` via `luvia_booking_record_handoff` prüfen.
5. Sicherstellen, dass ein noch nicht verbundener Provider `confirmed` über `luvia_booking_apply_provider_status` NICHT setzen kann.
