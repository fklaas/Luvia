# Test 13.2.0.2

## Automatisch geprüft
- JavaScript-Syntax der geänderten Dateien
- Einbindung der Verifikation in App und Core-Diagnose
- Build-/Core-Versionen
- neue SQL-Migration vorhanden

## Produktiver Test
1. Als Reisemitglied anmelden.
2. Dashboard und Core-Diagnose öffnen.
3. Verifikation mit Rehydration starten.
4. Erwartung: kein 403 auf `timeline_events` oder `place_visits`.
5. Erwartung: `LuviaCloudOnlyPlaceVerification` ist auf beiden Seiten definiert.
6. Erwartung: Gateway-Healthcheck liefert 200, auch falls zuvor ein abgelaufener Token vorhanden war.
7. Zwei gleichnamige Orte mit unterschiedlichen Provider-IDs importieren; beide müssen getrennt bleiben.
