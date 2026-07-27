# Regressionstests · Luvia 11.2.6

## Places Onboarding
- Mit vorhandener aktiver Reise neue Reise anlegen und Ziel suchen.
- Ohne aktive Reise neue Reise anlegen und Ziel suchen.
- Ein leerer Destination Cache darf Autocomplete nicht mit `DESTINATION_NAME_REQUIRED` blockieren.
- `Paris` eingeben, Vorschlag auswählen und Reise speichern.
- Land, Place ID und Koordinaten nach Reload prüfen.

## Versionierung und Diagnosen
- App Shell zeigt Build 11.2.6.
- Developer Console zeigt Core 3.0.2.6 / Build 11.2.6.
- Backend Console zeigt Core 3.0.2.6 / Build 11.2.6.
- Diagnose/Test-Seite lädt keine alten Skriptversionen aus dem Cache.
- `system.health` und `places.health` des neu deployten Gateways melden 3.0.2.6.

## Trips und Restaurants
- Login mit bestehender Reise behält activeTrip.
- Restaurantmodul zeigt Suche und Filter bei vollständig geladenem Destination Context.
- Suche und Filter remounten das Modul nicht.
