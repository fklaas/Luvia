# Luvia 13.4.6.5 – Persistent Timeline Calendar Expansion

## Behoben

- Der aufgeklappte Zustand des Reise-Timeline-Kalenders bleibt bei Cloud-Hydration, Realtime-Updates und Dashboard-Neurendering erhalten.
- „Weitere Tage anzeigen“ erweitert weiterhin in Siebener-Schritten.
- Sind alle Reisetage sichtbar, wechselt die Aktion zu „Weniger Tage anzeigen“ und reduziert wieder auf sieben Tage.
- Der Zustand wird pro aktiver Reise im laufenden App-Fenster geführt; es wird kein fachlicher Zustand lokal gespeichert.

## Architektur

Die sichtbare Anzahl der Kalendertage ist reiner UI-Zustand des `LuviaTimelineCore`. Sie ist nicht Teil der Reise- oder Timeline-Fachdaten und wird deshalb weder in Supabase noch in localStorage persistiert.

## Bekannte Grenzen

Nach einem vollständigen Browser-Neustart beginnt der Kalender bewusst wieder mit sieben Tagen.
