# Regressionstest 11.7.0

## Bootstrap
- App lädt ohne Endlosschleife.
- Dashboard erscheint.
- Activity Feed blockiert die App nicht, auch wenn eine Migration fehlt.

## Standort und Kontext
- Restaurantmodul zeigt die freiwillige Standortfreigabe.
- Nach Klick erscheint die Browserabfrage.
- Nach Erlaubnis zeigt das Modul den aktiven Standortkontext.
- Suchtreffer und Detailansicht zeigen Entfernung, sofern Koordinaten vorhanden sind.
- Ablehnung der Berechtigung lässt die App weiterhin vollständig nutzbar.

## Restaurant-Lebenszyklus
- Restaurant suchen und Detailansicht öffnen.
- Speichern, Favorisieren, Planen, Reservieren und Besucht testen.
- Status bleibt nach Reload und auf einem zweiten Gerät erhalten.
- Countdown wird bei Datum und Uhrzeit angezeigt.
- Activity Feed erhält ein Restaurant-Lebenszyklus-Ereignis.
- Statushistorie wird in `place_lifecycle_history` geschrieben.

## Darstellung
- Schaltflächen Favorit, Speichern, Tagesplan, Reserviert und Besucht sind lesbar.
- Mobile und Desktop-Ansicht prüfen.
