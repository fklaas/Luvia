# Luvia v13.51.0 / Core 4.51.0 — Booking Correlation & Conversion Foundation

## Ziel
Der Booking Core kann einen externen Provider-Handoff schon vor Existenz einer lokalen Buchung dauerhaft identifizieren und später mit einer Luvia-Buchung oder einer Conversion verknüpfen.

## Neu
- `booking_correlations`: langlebige Correlation-ID + Token pro Handoff.
- Bestehende Handoffs werden bei der Migration rückwirkend korreliert.
- `booking_attribution_events_v2.correlation_id` verbindet Attribution mit der neuen Identität.
- `luvia_booking_link_recent_place_handoff`: verknüpft eine später erstellte Luvia-Buchung nur bei einem eindeutigen recent-place match.
- `luvia_booking_link_correlation`: explizite Token-Verknüpfung für spätere Partner-/Callback-Flows.
- `booking_conversion_reports`: provider-neutrale Conversion-Evidence unabhängig vom Reservierungsstatus.
- `luvia_booking_report_conversion`: service-role-only, idempotent über Provider/Source/Event-ID.
- Conversion, Affiliate und Handoff können niemals allein `confirmed` setzen.
- `booking_correlation_conversion_summary` für Audit/Diagnostik.

## Sicherheits-/Semantikregel
`conversion != reservation confirmation`. Ein Conversion-Callback darf eine wirtschaftliche oder attributionale Conversion belegen, aber keinen bestätigten Reservierungsstatus erzeugen. Bestätigung bleibt dem Status-Core und belastbaren Provider-/Mail-/User-Evidenzen vorbehalten.
