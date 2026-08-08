# Luvia v13.39.1 / Core 4.39.1 — Venue-Verified Booking Handoff

## Ziel
Der globale „Reservieren“-Button entscheidet vor dem Öffnen eines Formulars, ob ein belegbarer direkter Buchungsweg existiert.

## Neu / Fixes
- Route-Preview läuft direkt beim Klick auf „Reservieren“/„Buchen“.
- Verifizierter Provider/Reservierungslink → direkte Weiterleitung; kein E-Mail-Formular.
- E-Mail-Formular erscheint nur als Fallback, wenn kein direkter Buchungsweg gefunden wurde.
- Gefundene verifizierte E-Mail wird dem Fallback-Formular automatisch übergeben.
- Provider-Links werden venue-spezifisch bewertet.
- Rechtliche/AGB-/GTC-/Privacy-/Cookie-Seiten werden explizit als Buchungsziel verworfen.
- Provider-Widgets in iframe/form/data-booking-url werden zusätzlich erkannt.
- Provider-Links mit Venue-ID/Restaurant-ID/Slug werden bevorzugt.
- Bestehende Booking-Core-Übersicht und E-Mail-Fallback bleiben kompatibel.

## Routing
1. Venue-verifizierter Provider-Link
2. Offizieller Reservierungslink
3. Verifizierte öffentliche Reservierungs-E-Mail
4. Verifizierte allgemeine E-Mail
5. Manueller Fallback

## Deployment
- Web-App v13.39.1 deployen.
- `booking-route-resolve` aus dieser Version erneut deployen.
- Verify JWT: ON.
- Keine Migration, keine neuen Secrets.
