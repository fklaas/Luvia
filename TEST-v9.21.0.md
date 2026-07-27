# Testanleitung – Core V2.12.3.1

1. Eine Reise mit Ziel `Paris` öffnen.
2. Developer Console → Backend & Places öffnen und „Ziel auflösen“ ausführen.
3. Prüfen: `canonicalCity.name = Paris`, `primaryType`, `viewport`, `searchRadiusMeters` und `radiusSource` vorhanden.
4. Restaurantmodul öffnen und nach `Pasta` suchen.
5. Prüfen: Treffer stammen aus dem Paris-Kontext und zeigen eine Entfernung.
6. Sortierung „Entfernung“ wählen; Distanzen müssen aufsteigend sein.
7. Mindestbewertung `4,5` aktivieren; keine niedrigere Bewertung darf erscheinen.
8. „Jetzt geöffnet“ aktivieren; Provider-Anfrage muss `openNow` verwenden.
9. „Vegetarisch bestätigt“ aktivieren; nur Orte mit bestätigtem Google-Merkmal bleiben erhalten.
10. Einen Treffer importieren und prüfen, dass der bestehende Restaurant-Import unverändert funktioniert.

## Landmark-Test
Eine Destination mit `landmarkContext`, z. B. Eiffelturm, verwenden. Die Distanzquelle muss `landmark` sein und die Suche soll den Landmark-Mittelpunkt beziehungsweise dessen Viewport nutzen.

## Regression
- Ziel ohne Landmark funktioniert weiterhin über `canonicalCity`/bestehendes `center`.
- Alte Destination Contexts Schema 4 werden auf Schema 5 normalisiert.
- Nearby Search, Autocomplete, Details und Photo bleiben unverändert aufrufbar.
- Restaurantliste und Import bleiben kompatibel.
- Offline-Shell lädt mit Cache `luvia-shell-v9.21.0`.
