# Luvia Build 13.5.1.5 – Places Dock Event Isolation

## Behoben

- Der Places-Dock reagiert nur noch auf Klicks innerhalb der eigentlichen Dock-Navigation.
- Klicks auf Kategorien, Filter, Favoriten, Kartenaktionen und andere Controls in Place-Modulen können nicht mehr versehentlich als Dock-Navigation interpretiert werden.
- Ein erneuter interner Render-Aufruf der bereits geöffneten Places-Ansicht setzt das aktive Place-Modul nicht mehr automatisch auf die Place-Auswahl zurück.
- Nur ein bewusster Klick auf den Dock-Eintrag „Places“ oder auf „Zurück zur Place-Auswahl“ öffnet den Places-Hub.

## Ursache

Die App-Shell behandelte jeden erneuten `show('places')`-Aufruf bei bereits aktiver Places-Ansicht als Rückkehr zum Hub. Cloud-, Profil- oder UI-Aktualisierungen konnten dadurch während normaler Modulinteraktionen die Place-Auswahl erneut rendern. Zusätzlich war der Click-Delegation-Selektor zu allgemein.

## Versionen

- Build: 13.5.1.5
- Core: 4.5.1.5
- PWA Cache: luvia-shell-v13.5.1.5
