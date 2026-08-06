# Deployment Build 13.8.0

Keine SQL-Migration und kein erneutes Edge-Function-Deployment erforderlich.

```bash
git add .
git commit -m "feat(places): add contract-driven photo spots and solar intelligence"
git push
```

Neuer PWA-Cache: `luvia-shell-v13.8.0`

Nach dem Pages-Deployment die PWA vollständig schließen und neu öffnen.

## Abnahme

1. Places-Hub zeigt Fotospots.
2. Suche und Kategorien liefern Ergebnisse am aktiven Reiseziel.
3. Favorit setzen, erneut entfernen und „Alle entfernen“ funktionieren global.
4. Detailkarte zeigt Foto-Planung mit Quelle und Sicherheit.
5. „Zur Timeline“ erzeugt einen Fotospot-Eintrag im Dashboard.
6. `await LuviaPlaceConformance.runAll()` liefert `ok: true` und keine Violations.
7. Backend & Places → Fotospots testen.
