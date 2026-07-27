# Core V2.12.1 – Restaurant Entity Contract

Der Vertrag trennt Restaurantdaten verbindlich in drei Ebenen:

1. `place`: globale, vom Provider aktualisierbare Ortsdaten.
2. `tripPlace`: reisenspezifische Planung und persönliche Inhalte.
3. `restaurant`: reservierungs- und restaurantspezifische Reisedaten.

## Identitäten

- Globaler Place: `provider + providerPlaceId`
- Reiseverknüpfung: `tripId + placeId + moduleKey`
- Restaurant-Erweiterung: genau ein Datensatz je `tripPlaceId`

## Überschreibregeln

Provider-Synchronisierung darf ausschließlich Felder aus `ownership().providerManaged` aktualisieren. Persönliche Reise-, Reservierungs- und Bewertungsdaten aus `ownership().userManaged` bleiben unverändert.

## Öffentliche API

- `normalizePlace(place)`
- `normalizeTripPlace(input)`
- `normalizeRestaurant(input)`
- `createImport(input)`
- `validate(entity)`
- `ownership()`
- `toDatabase(entity)`
