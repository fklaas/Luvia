# Deployment 13.6.0

## Versionen

- App Build: 13.6.0
- Core: 4.6.0
- PWA Cache: `luvia-shell-v13.6.0`

## Deployment

Es ist keine SQL-Migration erforderlich.

Es ist kein erneutes Deployment der Supabase Edge Function erforderlich, sofern die bestehende generische Place-Schnittstelle die bereits unterstützte `attraction`-Zuordnung verwendet.

```bash
git add .
git commit -m "feat(places): add attractions and activities through the global place contract"
git push
```

Nach dem GitHub-Pages-Deployment die installierte PWA vollständig schließen und erneut öffnen.

## Smoke Test

1. Places öffnen.
2. „Sehenswürdigkeiten & Aktivitäten“ auswählen.
3. Kategorie wechseln und Suche ausführen.
4. Favorit speichern.
5. Detailkarte öffnen.
6. Beginn, Dauer und optionale Ticketdaten speichern.
7. Dashboard öffnen und Timeline-Eintrag prüfen.
8. Reise wechseln und sicherstellen, dass keine Daten der vorherigen Reise erscheinen.
9. `await LuviaPlaceConformance.runAll()` in der Konsole ausführen.
