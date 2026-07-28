# Test 13.1.3.7

- Zwei Tagesplaneinträge speichern.
- STRG+F5 drücken: Einträge müssen ohne leeren Zwischenzustand aus dem lokalen stabilen Snapshot erscheinen.
- Nach Remote-Hydration müssen dieselben Einträge sichtbar bleiben.
- Eine Uhrzeit ändern und neu laden: Die neue Zeit muss erhalten bleiben.
- Browserkonsole: keine 403-Meldung für `trip_schedule_events`.
- Restaurantmodul: `Eure Restaurantmomente` darf nicht vorübergehend leer werden.
