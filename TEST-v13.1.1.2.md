# Test v13.1.1.2

1. Zwei heutige Termine mit mindestens 45 Minuten freiem Fenster anlegen.
2. Restaurant- oder Place-Kandidaten laden.
3. Dashboard prüfen: Freies Fenster zeigt bei passendem Kandidaten Name und „Ansehen“.
4. Bei einem aktuellen Place „Als besucht markieren“ anklicken.
5. Erwartet: Erfolgsmeldung, Lifecycle `visited`, Timeline-Ereignis und Today-Neuberechnung.
6. Zwischen Browser-Tabs wechseln. Die Heute-Karte darf während eines Refreshs nicht leer werden.
7. GPS im Profil aktualisieren und Restaurants öffnen. Entfernungen müssen von der Geräteposition stammen.
8. GPS deaktivieren/entziehen. Es darf keine Ersatzentfernung vom Reiseziel angezeigt werden.
