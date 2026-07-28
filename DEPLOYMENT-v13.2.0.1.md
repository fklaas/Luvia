# Deployment 13.2.0.1

Für diesen Fix ist keine neue SQL-Migration und kein Edge-Function-Deployment erforderlich.

1. Frontend-Dateien committen und pushen.
2. Hosting-Deployment abwarten.
3. PWA/Service Worker auf Cache `luvia-shell-v13.2.0.1` aktualisieren.
4. App einmal vollständig neu laden.
5. Cloud-Verifikation über die Developer Console ausführen.

Commit:

```text
fix(places): enforce cloud-only place state and identity
```
