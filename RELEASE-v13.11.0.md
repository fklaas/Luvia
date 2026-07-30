# Luvia Build 13.11.0 / Core 4.11.0

## Cycling Routes & MTB Trail Intelligence

Der siebte produktive Place-Typ **Fahrradrouten** wurde mit klarem Schwerpunkt auf echte Mountainbike-Trails umgesetzt. Ergänzend unterstützt das Modul Gravel-Touren, City-Routen, klassische Radtouren, Familienrouten, Bikeparks und Rundtouren.

## Enthalten

- neuer kanonischer Place-Typ `cycling_route` mit Modul-ID `cycling_routes`
- neuer Place-Type-Contract mit globalem Planungstermin `planned_at`
- Places-Hub-Kachel **Fahrradrouten** und standardmäßig aktiviertes Modul
- Kategorien für MTB-Trails, Gravel, City-Touren, Radtouren, Familie, Bikeparks und Rundtouren
- echte Routensuche über OpenStreetMap-/Overpass-Routenrelationen `route=mtb` und `route=bicycle`
- zusätzliche Erkennung benannter Wege mit MTB-, Fahrrad-, Untergrund- und Track-Tags
- Google-Places-Fallback für Bikeparks, Trailzentren und routebezogene Startpunkte
- neuer sicherer Gateway-Vertrag `cycling.health`, `cycling.search` und `cycling.details`
- OSM-Routengeometrie mit vereinfachter Kartenvorschau
- Distanzberechnung aus Routengeometrie, sofern keine belastbare ausgeschilderte Distanz vorhanden ist
- neuer Dienst `LuviaCyclingRouteIntelligence`
- Insight Cards für Routentyp, Länge, geschätzte Fahrzeit, Schwierigkeit, Untergrund, Routenform, Beschilderung, Höhenprofil, Rad-Empfehlung und Sicherheitscheck
- globale Favoriten, Karten, Detailkarten, Timeline, Reiseisolation, Alternativen, Cloud-Persistenz und Conformance
- Developer Console, Backend & Places Explorer und Diagnostics für Fahrradrouten
- Google-Routes-Anfahrtsberechnung zusätzlich mit `BICYCLE`, einschließlich sichtbarem Beta-Hinweis

## Architektur

Fahrradrouten sind keine getrennte Routing-App. Eine Route besitzt dieselbe kanonische Luvia-Place-Identität wie alle anderen Places. Shell, Cards, Detailkarte, Favoriten, Planung, Timeline, Runtime, Commands, Cloud-Writer und Capability-Rendering stammen aus dem globalen Places Core.

Die Discovery nutzt für echte Strecken primär OpenStreetMap-Routendaten. Google Places wird nur ergänzend für Bikeparks, Trailzentren und Startpunkte verwendet, da ein POI-Provider keine vollständige Routengeometrie ersetzt.

Routeneigenschaften werden über den bestehenden universellen Place-Import und `trip_place_data` gespeichert. Es gibt keine lokale zweite Wahrheit und keine eigene Fahrradrouten-Favoriten- oder Timeline-Struktur.

## Datenwahrheit und bekannte Grenzen

- `mtb:scale` wird nur angezeigt, wenn die Quelle diese Angabe tatsächlich enthält.
- Höhenmeter werden ohne belastbaren Höhenprofil-Provider nicht erfunden.
- Die geschätzte Fahrzeit basiert auf Distanz und einem typischen Profiltempo, nicht auf dem individuellen Leistungsniveau.
- Befahrbarkeit, Sperrungen, Zugangsregeln, Wetter, Trailzustand und lokale Verbote müssen vor der Fahrt geprüft werden.
- Eine OSM-Relation kann unvollständig oder lokal unterschiedlich gepflegt sein.
- Fahrrad-Anfahrtsrouten des Google-Routes-Providers befinden sich im Beta-Status und können unvollständige Radwege enthalten.
- Die Kartenansicht ist in diesem Build eine leichte Routenvorschau in der globalen Place Card, noch kein vollwertiger Turn-by-Turn-Navigator.

## Datenbank

Die Migration `supabase/migrations/20260730_036_core_v4_11_0_cycling_route_place_type.sql` erweitert die bestehende kanonische `places_primary_type_check`-Constraint idempotent um `cycling_route`. Es wird keine neue Fach- oder Routentabelle angelegt.
