# Luvia Build 9.22.6 / Core 2.12.4.6

## Restaurant Discovery Visibility Fix

- Die Restaurantsuche wird immer gerendert – unabhängig davon, ob der Destination Context beim ersten Render bereits verfügbar ist.
- Ein gespeicherter `showDiscovery: false`-Altzustand kann die Suche nicht mehr ausblenden.
- Zusätzliche Destination-Felder aus Trip-Daten werden bei der Zielauflösung berücksichtigt.
- Vor jeder Suche wird der aktive Trip- und Destination-Kontext neu eingelesen.
- Fehlt tatsächlich ein Reiseziel, bleibt die Suchoberfläche sichtbar und zeigt eine klare Erklärung statt vollständig zu verschwinden.
- Desktop- und Mobile-Darstellung verwenden weiterhin dasselbe responsive Suchformular.

Keine SQL- oder Gateway-Änderung erforderlich.
