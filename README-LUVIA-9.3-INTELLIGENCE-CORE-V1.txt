LUVIA 9.3 – INTELLIGENCE CORE V1 (FOUNDATION)

Dieser Schritt legt die gemeinsame technische Grundlage an, bevor Google Places und KI live angebunden werden.

NEU
- intelligence/destination-context.js
  Normalisiert das aktive Reiseziel an einer zentralen Stelle.
- intelligence/core.js
  Gemeinsames Gateway für spätere Places-, KI- und Enrichment-Aufgaben.
- intelligence/test.html
  Sichtbare Diagnoseseite zum Testen des erkannten Reiseziels und des Integrationsstatus.
- supabase/functions/luvia-intelligence/index.ts
  Sichere serverseitige Edge-Function-Grundlage. API-Schlüssel gehören später ausschließlich in Supabase Secrets.

TEST
1. App mit einer Testreise öffnen und diese Reise aktivieren.
2. Danach /intelligence/test.html auf derselben Domain öffnen.
3. Prüfen, ob Reise, Reiseziel und Trip-ID korrekt erkannt werden.
4. Google Place-ID und Koordinaten sind in diesem ersten Schritt erwartungsgemäß noch nicht vorhanden.

NÄCHSTER SCHRITT
- Reiseziel-Auswahl im Onboarding mit Google Places Autocomplete.
- Speichern von placeId, Koordinaten, Land und Suchradius in der Reise.
