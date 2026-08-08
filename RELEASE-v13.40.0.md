# Luvia v13.40.0 / Core 4.40.0 — Provider Capability & Status Foundation

## Ziel
Booking Provider werden nicht mehr nur als Links behandelt. Core 4.40.0 führt einen provider-neutralen Capability- und Status-Provenance-Contract ein, auf dem TheFork, Zenchef, Quandoo, OpenTable, SevenRooms und weitere Adapter schrittweise aufgebaut werden können.

## Neu
- `booking_provider_capabilities`: trennt dokumentierte Plattform-Fähigkeiten strikt vom tatsächlich freigeschalteten Luvia-Zugang.
- `booking_status_updates`: nachvollziehbare Quelle jedes Booking-Status.
- neue Lifecycle-Status `forwarded` und `alternative_proposed`.
- `luvia_booking_record_handoff(...)`: ein externer Deep-Link darf ausschließlich `forwarded` erzeugen.
- `luvia_booking_apply_provider_status(...)`: serverseitige Schnittstelle für spätere API/Webhook/Polling-Adapter.
- automatische Provider-Statusänderungen werden blockiert, solange der Provider nicht explizit `luvia_access_state=connected` besitzt.
- Affiliate-Conversions bleiben vom Reservierungsstatus getrennt; ein Affiliate-Klick bestätigt keine Buchung.
- Browser-Contracts `LuviaBookingProviderCapabilities` und `LuviaBookingStatusProvenance`.

## Provider-Seed
TheFork, Zenchef, Quandoo, OpenTable, SevenRooms, Resy, Tock, offizielle Eigenbuchung und E-Mail-Fallback. Die Seeds beschreiben Plattform-Fähigkeiten konservativ; sie behaupten ausdrücklich keinen bereits vorhandenen Luvia-Partnerzugang.

## Vorheriger UX-Fix enthalten
Die Basis enthält auch v13.39.4: flexible KI-Ergebniskarten ohne abgeschnittene Inhalte sowie vorgewärmte Booking-Handoffs / branded Handoff statt sichtbarem `about:blank`.
