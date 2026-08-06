# Deployment 13.27.3

Keine Datenbankmigration und kein Edge-Function-Deployment erforderlich.

```powershell
git add .
git commit -m "fix(places): stop lifecycle request storm and persist visits reliably"
git push
```

Danach `force-update.html` ausführen und 13.27.3 / Core 4.27.3 prüfen.
