# Deployment 13.28.4

Nur Frontend. Keine neue SQL-Migration und keine Edge Function.

```bash
git add .
git commit -m "feat: add silent realtime day gallery and creative photo studio"
git push
```

Danach PWA schließen, `force-update.html` öffnen und App 13.28.4 / Core 4.28.4 prüfen.

Für App-Kamera-Standort muss der Browserstandort erlaubt werden. Bei Ablehnung wird das Foto trotzdem gespeichert, jedoch ohne Koordinaten.
