# Luvia Build 13.5.0 – Place Type Contract & Conformance

## Ziel
Build 13.5.0 führt einen verbindlichen Place-Type-Vertrag ein. Neue Place-Typen werden künftig über Contract und fachliche Adapter ergänzt, nicht über eigene Karten-, Overlay-, Favoriten-, Timeline- oder Speicherimplementierungen.

## Neu
- `LuviaPlaceTypeContracts` mit Schema, Validierung, Capabilities, Feldern, Lifecycle und Präsentationsvertrag.
- Verträge für Restaurant, Unterkunft und Fotospot.
- `LuviaPlaceConformance` mit Runtime- und Source-Guard-Prüfungen.
- Registry liest Lifecycle und Capabilities aus dem Contract.
- Fotospot ist als dritter Referenztyp vertraglich vollständig beschrieben.

## Architekturentscheidung
`trip_place_data` bleibt die einzige fachliche Quelle für ausgefüllte Place-Felder. `trip_places` bleibt Reiseverknüpfung und Lifecycle. Module dürfen keine parallelen Datenquellen einführen.

## Bekannte Grenze
Fotospots sind in diesem Build der Conformance-Beweis auf Contract-Ebene. Die vollständige sichtbare Photo-Spot-Experience folgt auf derselben Shell, ohne ein eigenes Modulgerüst zu erzeugen.
