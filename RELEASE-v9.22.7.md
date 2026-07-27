# Luvia Build 9.22.7 / Core 2.12.4.7

## Restaurant Gateway CORS Fix

- GitHub-Pages-Origin `https://fklaas.github.io` dauerhaft freigeschaltet.
- Pflicht-Origins werden mit optionalen `LUVIA_ALLOWED_ORIGINS` zusammengeführt statt überschrieben.
- Origins werden normalisiert, damit abschließende Schrägstriche keine Fehlzuordnung verursachen.
- Restaurant-Suche funktioniert nach erneutem Gateway-Deployment wieder auf GitHub Pages und myluvia.app.
- Keine Datenbank- oder Entity-Änderung.
