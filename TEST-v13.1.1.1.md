# Test 13.1.1.1

1. Profil → Einstellungen → Globaler Standort aktivieren.
2. „Neu laden“ verwenden; Koordinaten, Genauigkeit und Zeitpunkt müssen erscheinen.
3. Restaurants öffnen und Vorschläge laden. Entfernungen müssen zur aktuellen Geräteposition passen.
4. Standort ändern oder neu laden; sichtbare Vorschläge müssen ihre Entfernungen neu berechnen.
5. Developer Console → Core 4 Health → Smoke Tests. Erwartet: 12/12 erfolgreich, auch wenn Today Status `empty` ist.
6. Cross-Module Diagnostics prüfen: Nearby-Sortierung muss live berechnete Entfernungen verwenden.
