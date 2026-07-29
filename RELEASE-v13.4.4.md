# Luvia Build 13.4.4 – Universal Place Field Source & Live Shell

Core 4.4.4 / Build 13.4.4

## Änderungen
- `trip_place_data` ist die verbindliche Cloud-Quelle für alle vom Nutzer befüllten Place-Felder.
- Neuer Core-Service `LuviaTripPlaceData` mit Hydration, Realtime, atomarem JSONB-Merge und typübergreifenden Datumsfeldern.
- Unterkunfts-Check-in und -Check-out werden nicht mehr zusätzlich in `trip_schedule_events` gespeichert.
- Timeline und Unterkunftsübersicht lesen dieselben `trip_place_data`-Zeilen.
- Geplante Place-Karten verwenden global Datum und Uhrzeit, kompakte Änderungs- und Löschaktionen sowie den neutralen Titel „Geplant“.
- Timeline-Datumseditor zeigt alle relevanten Datumsfelder des Place-Typs gleichzeitig.
- Place-Detailkarten können über der geöffneten Timeline erscheinen; die Timeline bleibt darunter erhalten.
- In-Window-Updates erfolgen über Realtime und zentrale Core-Events ohne Seitenreload.

## Migration
`20260729_034_core_v4_4_4_single_source_place_fields.sql`

Die Migration legt eine atomare Merge-RPC an, migriert bestehende Unterkunftsfelder und entfernt doppelte Unterkunfts-Schedule-Zeilen.
