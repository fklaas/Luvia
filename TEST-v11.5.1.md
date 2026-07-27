# Regressionstest Luvia 11.5.1

## Dashboard

- 320 px, 375 px, 430 px und 720 px Breite: keine überlappenden Karten.
- Tablet 768–980 px: zwei saubere Widget-Spalten und zweispaltige Aktionen.
- Desktop 1024–1439 px: zwei Widget-Spalten.
- Desktop ab 1440 px: drei Widget-Spalten.
- Ultrawide ab 1900 px: vier Widget-Spalten.
- Sehr lange Reise-, Ziel- und Profilnamen umbrechen ohne horizontales Scrollen.

## Dialoge

- „Reise bearbeiten“ öffnet aus Dashboard und Header ohne Console Error.
- „Personen einladen“ öffnet aus Dashboard und Header ohne Console Error.
- Escape, Schließen und Klick auf Hintergrund schließen den Dialog.
- Reiseeditor auf Mobile nutzt die volle Breite und hält Aktionen erreichbar.
- „Module“ öffnet als eigener Dialog und kehrt korrekt zum Reiseeditor zurück.

## Module

- Restaurant bleibt nach Speichern der Modulkonfiguration aktiviert.
- Navigation aktualisiert sich nach Moduländerung.
- Restaurantkategorien und Filter reagieren nach Tab-Wechsel weiterhin.

## Technik

- Keine Meldung `UI-Dialog nicht registriert` bei normaler Bedienung.
- Keine unbehandelten Promise-Rejections bei Dialogaufrufen.
- `window.LuviaUI.version` ergibt `1.1.0`.
- `window.LuviaKernelVersion` ergibt Build `11.5.1`, Core `3.3.1`.
- Service Worker verwendet Cache `luvia-shell-v11.5.1`.
