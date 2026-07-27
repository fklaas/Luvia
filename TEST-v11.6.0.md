# Regressionstest Luvia 11.6.0

## Dashboard
- 320, 375, 430, 768, 1024, 1440 und 1920 px testen
- lange Reise-, Ziel- und Profilnamen testen
- keine Überlappung oder horizontales Scrollen

## Reise und Module
- Reise bearbeiten mehrfach öffnen/schließen
- Module öffnen, zurückkehren, speichern und neu laden
- Restaurantstatus bleibt nach Cloud-Neuladen korrekt

## Einladungen und Join
- Einladungslink in ausgeloggtem Browser öffnen
- anmelden/registrieren, Anzeigenamen setzen, beitreten
- QR-Code scannen: identischer Flow
- Einladungscode über leeren Reisebildschirm eingeben
- ungültigen Code testen
- doppelten Beitritt testen: kein doppeltes Mitglied
- neues Mitglied erscheint ohne Reload auf anderem Gerät

## Restaurant
- Kategorien, Filter und Verwalten bedienen
- Tab wechseln und zurückkehren
- Browser minimieren/öffnen und pageshow testen

## Console
- keine renderDashboard-, trip.edit-, Dialog-, Reference- oder UI-Manager-Fehler
- keine unbehandelten Promise-Rejections
