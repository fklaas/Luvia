# Luvia v9.18.5 – Destination Intelligence Maintenance

## Fehlerbehebung

- „Ziel neu auflösen“ umgeht jetzt ausdrücklich den sieben Tage gültigen Gateway-Cache.
- Der Destination-Cache verwendet eine neue Version, damit alte Profile ohne Intelligence-Felder nicht erneut geladen werden.
- Die Google Time Zone API liefert bei Fehlern jetzt Status und Fehlermeldung bis ins Backend-Dashboard.
- Sprache, Währung, Locale und Flagge werden weiterhin zuverlässig aus dem ISO-Ländercode ergänzt.
- Gateway-Version: 2.11.4.

## Deployment

Die Edge Function muss neu deployt werden, da sich Gateway-Code geändert hat. Danach das Gesamtpaket auf Cloudflare bereitstellen und im Browser einmal hart neu laden.
