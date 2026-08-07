# Luvia v13.38.0 / Core 4.38.0 – Booking Core V1 Integration

## Neu
- Luvia Booking Core V1.0.2 in den produktiven App-Core integriert.
- Zentraler Booking-Adapter statt Buchungslogik in einzelnen Place-Modulen.
- Reservieren/Buchen erscheint automatisch bei Place-Typen mit Contract-Capability `reservation` oder `booking`.
- Neuer Plan-Bereich „Buchungen & Reservierungen“.
- Echte Resend-Outbound-/Inbound-Edge-Functions im Repository.
- Produktionsmigrationen für Foundation, Communication, Inbound, Reservation Intelligence, Discovery, Generic Booking, Affiliate, Orchestration, Hardening und V1 Release.
- Booking-Status bleibt zentral und cloudautoritativ.
- Provider-IDs werden nicht als interne UUIDs geschrieben.
- Kein automatisches Akzeptieren von Alternativterminen.
- Keine geratenen E-Mail-Adressen.

## Deployment
Die neuen `20260807223xxx_core_v4_38_0_booking_*.sql` Migrationen müssen in Reihenfolge auf das produktive Supabase-Projekt angewendet werden.
Danach `booking-email-send`, `booking-email-inbound` und optional `booking-health` deployen.
Secrets siehe `BOOKING-CORE-PRODUCTION-DEPLOY.md`.
