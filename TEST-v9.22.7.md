# Tests Build 9.22.7

## CORS
- Auf `https://fklaas.github.io` Restaurantmodul öffnen und Suche ausführen.
- In der Browserkonsole darf kein CORS-Fehler mit `Access-Control-Allow-Origin: null` erscheinen.
- Preflight muss Status 204 liefern und als Allow-Origin exakt den aufrufenden Origin zurückgeben.
- Dasselbe auf `https://myluvia.app` prüfen.

## Regression
- Login und Session bleiben erforderlich.
- Restaurant-Suche, Details, Speichern und Favoriten testen.
- Unbekannte Origins bleiben gesperrt.
