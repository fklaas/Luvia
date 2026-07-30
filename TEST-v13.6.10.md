# Test 13.6.10

1. Neues Restaurant auf einer Discovery-Karte favorisieren: Herz bleibt aktiv und Sammlung wächst.
2. Dasselbe Restaurant erneut anklicken: Favorit verschwindet aus Sammlung und allen Karten.
3. Restaurant-Detailkarte und Discovery-Karte zeigen stets denselben Zustand.
4. „Alle entfernen“ entfernt alle Restaurantfavoriten und setzt alle sichtbaren Karten zurück.
5. Die gleichen Tests für Unterkünfte und Sehenswürdigkeiten durchführen.
6. Beim App-Start und beim Favoritenklick darf kein anonymer `401`-Gateway-Schreibversuch entstehen.
7. `await LuviaPlaceConformance.runAll()` muss `ok: true` melden.
