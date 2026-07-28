# Test Build 13.0.4.2

1. `/intelligence/console.html` öffnen. Erwartet: Systemübersicht innerhalb weniger Sekunden bedienbar.
2. Zwischen allen Tabs wechseln. Erwartet: nur der aktive Bereich wird aufgebaut; Browser bleibt responsiv.
3. `Core 4 Health` öffnen. Erwartet: kompakte Traces, keine Endlosschleife und kein Browser-Hänger.
4. `Aktualisieren` und anschließend Smoke Tests ausführen.
5. `/intelligence/test.html` öffnen. Erwartet: Seite bleibt auch bei verzögerter Supabase-Verbindung bedienbar.
6. Browserkonsole prüfen. Erwartet: keine Out-of-memory-, Rekursions- oder Long-running-script-Fehler.
