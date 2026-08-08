# Luvia v13.39.0 / Core 4.39.0 — Booking Provider Routing V1

## Ziel
Luvia priorisiert direkte Buchungswege vor E-Mail. E-Mail bleibt ein sicherer Fallback.

## Neu
- Neue Edge Function `booking-route-resolve`.
- Automatische Discovery startet direkt beim Anlegen einer Buchung.
- Erkennt belegbare Provider-Links auf der offiziellen Anbieter-Website, u. a. OpenTable und TheFork.
- Erkennt offizielle interne Reservierungslinks und weitere externe Reservierungsanbieter.
- Erst danach werden öffentliche E-Mail-Adressen als Fallback berücksichtigt.
- Booking-Übersicht zeigt den tatsächlich gewählten Kanal verständlich an.
- Direkte Provider-Links öffnen über einen expliziten Nutzer-Button; der Status wird dadurch nicht fälschlich auf `requested` oder `confirmed` gesetzt.
- Manuelle Kontaktpflege bleibt letzter Fallback.

## Routing-Priorität
1. Official API
2. Booking Provider
3. Official Reservation Link
4. Public Reservation E-Mail
5. Public Contact E-Mail
6. Manual

## Sicherheit
- Keine geratenen E-Mail-Adressen.
- Externe Provider-Links werden nur als automatisch nutzbar gespeichert, wenn sie auf der offiziellen Website des Ortes als Link belegt wurden.
- Direkter Link bedeutet nicht automatisch bestätigte Reservierung.

## Deployment
- Web-App v13.39.0 deployen.
- Edge Function `booking-route-resolve` deployen.
- Verify JWT: ON.
- Keine Datenbankmigration erforderlich. Die vorhandenen Discovery-/Routing-Tabellen aus Booking Core V1 werden weiterverwendet.
