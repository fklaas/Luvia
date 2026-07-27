# Luvia v9.14.1 — Intelligence Core v2.7.1 App Shell Maintenance

## Behoben

- Ungültiges `await` im PWA-Installationshandler entfernt und den Installationsbutton DOM-sicher angebunden.
- Service Worker überspringt Range Requests und cached ausschließlich vollständige HTTP-200-Antworten.
- HTTP-206-Partial-Content-Antworten lösen dadurch keinen Cache-Fehler mehr aus.
- Modernes `mobile-web-app-capable`-Meta-Tag ergänzt.
- PWA-Cache und Build-Metadaten auf v9.14.1 aktualisiert.
