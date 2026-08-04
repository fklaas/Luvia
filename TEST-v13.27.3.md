# Test 13.27.3

1. „Meine Orte“ öffnen: Es dürfen nur wenige gebündelte Requests entstehen, keine Endlosschleife.
2. Einen Ort als besucht markieren: POST `place_visits` muss erfolgreich sein und der Ort unter „Besucht“ erscheinen.
3. Einen entdeckten Ort „Zur Timeline“ hinzufügen: Dialog speichern und Eintrag unter „Heute“ prüfen.
4. Erneut „Meine Orte“ öffnen: Filter und Zähler müssen aus Cloud-Daten stimmen.
