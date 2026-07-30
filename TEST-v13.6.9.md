# Test 13.6.9

1. Restaurant als Favorit markieren.
2. Auf derselben kleinen Karte erneut klicken: Favorit verschwindet.
3. Mehrere Restaurantfavoriten anlegen und „Alle entfernen“ wählen.
4. Sammlung wird leer und alle sichtbaren Discovery-Karten zeigen wieder `♡ Favorit`.
5. Dasselbe Verhalten mit Unterkunft und Sehenswürdigkeit gegenprüfen.
6. `await LuviaPlaceConformance.runAll()` muss `ok: true` liefern.
