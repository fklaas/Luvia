# Luvia v9.15.1 — Intelligence Core v2.8.1 Platform Maintenance

## Bereinigung

- PWA-Service wird vor dem Registry-Start verlässlich sichergestellt und bei Bedarf einmalig nachgeladen.
- Der PWA-Service liefert auch während der Initialisierung sichere Status- und Diagnosewerte.
- Service-Worker klont Netzwerkantworten jetzt synchron, bevor der Response-Body an die Seite zurückgegeben wird.
- Verhindert `Response body is already used` beim Cache-Schreiben.
- PWA-Cache auf `luvia-shell-v9.15.1` aktualisiert.
- Favicon als ICO ergänzt und in der Developer Console explizit referenziert.
- Build- und Core-Metadaten auf 9.15.1 / 2.8.1 aktualisiert.

## Erwartetes Ergebnis

- PWA-Service startet in der Service Registry.
- `Alle Services bereit` wird nach erfolgreichem Start grün.
- Kein Luvia-eigener `Response.clone()`-Fehler mehr.
- Kein `/favicon.ico`-404 mehr.
