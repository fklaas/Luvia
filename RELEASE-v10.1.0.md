# Luvia 10.1.0 · Core 2.13.1

## New Trip Onboarding

- Neues vierstufiges Reise-Onboarding auf Basis des zentralen Luvia Trip Store.
- Erfassung von Reisename, Reiseziel, optionalem Land, Symbol, Farbe und Reisezeitraum.
- Einheitliches Destination-Objekt als kanonische Datenquelle.
- Cloud-Erstellung über das bestehende Supabase-Projekt und `create_trip_with_code`.
- Zusätzliche Reisedetails werden über `paris_update_trip_details` gespeichert.
- Lokaler Fallback, falls noch keine angemeldete Cloud-Sitzung verfügbar ist.
- Neu erstellte Reisen werden sofort aktiviert und stehen Runtime und Modulen zur Verfügung.
- Empty State und Profilbereich „Meine Reisen“ öffnen beide denselben neuen Creator.
- Alter `parisForceNewTripV1`-Neustartpfad aus den sichtbaren Neue-Reise-Einstiegen entfernt.

## Testfälle

1. Angemeldet und ohne Reisen → „Erste Reise erstellen“ öffnet das neue Onboarding.
2. Pflichtfelder leer → verständliche Validierung ohne Reload.
3. Symbol und Farbe ändern die Vorschau unmittelbar.
4. Enddatum vor Startdatum → Speichern wird verhindert.
5. Erfolgreiche Cloud-Erstellung → Reise erscheint in „Meine Reisen“ und wird aktiv.
6. Neue Reise aus dem Profil → bestehende Reisen bleiben erhalten.
7. Mobile Ansicht → Vollbild-Onboarding mit fixierter Navigation.
