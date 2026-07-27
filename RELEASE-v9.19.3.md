# Luvia 9.19.3 — Core V2.12.2

## Restaurant Entity Schema

- ergänzt geplantes Datum und Uhrzeit an `trip_places`
- ergänzt Reservierungsname, Reservierungslink, Reservierungsnotizen und Menülink an `restaurants`
- fügt gezielte Datenbankindizes hinzu
- bestätigt das bestehende RLS-Sicherheitsmodell
- ergänzt eine sichere Schema-Diagnosefunktion
- enthält einen Browser-Diagnosetest für die Migration

Es werden keine neuen Haupttabellen erstellt und keine bestehenden Nutzerdaten überschrieben.

## Included destination UI maintenance

- Destination labels are normalized to `City, Country` without a visible country-code prefix.
- Existing `radiusSource` values are preserved during destination normalization.
- Viewport-derived radii are displayed as `dynamisch` instead of `manuell`.

## Maintenance Fix

- Platform-Selbsttest vergleicht Core- und Build-Version nun dynamisch mit der geladenen Kernel-Version.
- Behebt den falschen Fehler `checks.core: false` nach Core-Upgrades.
- Keine Änderung an Plattformfunktionen oder Datenbankschema.
