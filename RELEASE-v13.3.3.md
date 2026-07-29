# Luvia Build 13.3.3 – Universal Place Experience Contract

## Ziel
Das vollständig entwickelte Restaurant-Erlebnis wird als verbindliche, wiederverwendbare Hülle für alle Place-Typen festgeschrieben. Unterkünfte verwenden keine parallele Such-, Filter-, Karten- oder Overlay-Struktur mehr.

## Änderungen
- Neuer zentraler `LuviaPlaceExperience`-Vertrag für Discovery, Quick-Filter, Filter Drawer, geplante Einträge und genau ein Place-Overlay.
- Neuer universeller `LuviaPlaceIntelligence`-Fassade mit Restaurant-Kompatibilität und generischem Fallback für weitere Place-Typen.
- Unterkunftssuche nutzt exakt die Restaurant-Klassen und Komponenten für Hero, Search, Filter, Quick Chips, Ergebnisraster, Karten, Sammlung und Tagesplan.
- Unterkunftsfilter: Mindestbewertung, Sortierung, geöffnet, familienfreundlich und Parkplatz.
- Geplante Check-in-/Check-out-Einträge erscheinen oberhalb der Suche und werden über den gemeinsamen Schedule Core gespeist.
- Unterkunftsdetail zeigt Check-in, Check-out, Gäste, Zimmer, Buchungsnummer, Buchungsanbieter, festen Ausgangspunkt und Notizen.
- Single-overlay-Guard verhindert doppelt übereinander geöffnete Place-Karten.
- Kartenfläche und Aktionsbutton öffnen dieselbe Detailansicht; Events werden gestoppt und nicht doppelt verarbeitet.
- Entfernung und Weg werden über Travel Context und Places Route ermittelt.
- Nach Speichern werden Schedule, Timeline und Cross-Module Recommendations aktualisiert.

## Architekturentscheidung
Restaurant-spezifische Fachlogik bleibt als Compatibility Adapter erhalten. Design, Discovery, Overlay, Schedule-Panel und universelle Intelligence werden aus dem Restaurantmodul heraus als Place-Core-Verträge bereitgestellt. Kommende Place-Typen konfigurieren nur Capabilities, Texte, Filter, Query und fachliche Formulare.

## Bekannte Grenzen
Die produktive Provider- und Supabase-Verifikation muss nach Deployment gegen die reale Umgebung erfolgen. Der Restaurant-Service bleibt aus Kompatibilitätsgründen bestehen, wird aber nicht mehr als Designvertrag verwendet.
