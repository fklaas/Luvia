# Deployment 13.7.0

1. Vollständige Projektdateien deployen.
2. Keine SQL-Migration.
3. Keine Edge Function neu deployen.
4. PWA vollständig schließen und neu öffnen.
5. `node tests/place-architecture-regression.test.cjs` lokal ausführen.
6. In der Browser-Konsole: `await LuviaPlaceConformance.runAll()` – erwartet `ok: true`.
7. Favorit setzen/entfernen und „Alle entfernen“ in allen drei Place-Modulen testen.
8. Aktive Reise wechseln und prüfen, dass Favoriten/Timeline nicht zwischen Reisen vermischt werden.

Cache: `luvia-shell-v13.7.0`
