# Luvia Build 13.13.0 / Core 4.13.0

## Cycling Routes Rebuild & Google-First Discovery

Build 13.13.0 ersetzt die bisherige Fahrradrouten-Discovery vollständig. `cycling_route` bleibt ein normaler globaler Place, erhält aber einen neuen verlässlichen primären Datenweg:

1. Google Places API (New) sucht passende Tourziele, Parks, Bikeparks, Trailzentren und Startpunkte im kanonischen Reiseziel.
2. Google Routes berechnet mehrere echte Fahrradstrecken mit Geometrie, Distanz und Fahrzeit.
3. Reagiert die Places-Suche zu langsam oder liefert keine brauchbaren Anker, beginnt die Routenberechnung nach höchstens 1,8 Sekunden mit serverseitig erzeugten Wegpunkten.
4. Openrouteservice, Trailforks und OpenStreetMap ergänzen anschließend nur noch optional.

## Wichtigste Änderungen

- Neue zentrale Gateway-Datei `supabase/functions/luvia-gateway/_shared/cycling-google.ts`.
- Neue Action `cycling.search.google`.
- Mehrere Google-Fahrradrouten pro Profil: MTB, Gravel, City, Familie und klassische Radtour.
- Google-Places-Anker werden als `cycling_anchor` transparent von vollständigen Routen getrennt.
- Google-Routen werden als „Für euch erstellt“ gekennzeichnet.
- MTB- und Gravel-Ergebnisse behaupten keine erfundene Trail-Schwierigkeit, Oberfläche oder Höhenmeter.
- Langsame Place-Suchen blockieren die Routenberechnung nicht mehr.
- Bei einem Routingfehler wird automatisch mit weniger Zwischenpunkten erneut versucht.
- Alle Ergebnisse verwenden weiterhin die globale Places-Shell, globale Karten, Favoriten, Detailkarte, Timeline, Cloud-Persistenz und Reiseisolation.
- Trailforks, Komoot, Wikiloc, Bikemap, MTB Project, Gravelmap und GravelDeluxe bleiben als Partnerlinks verfügbar; direkte Trailforks-Daten sind weiterhin optional.

## Keine neuen lokalen Strukturen

Es gibt keine Fahrradrouten-Sonderdatenbank, keine lokale Favoritenlogik, keine zweite Timeline und keine separate Detailkarte. Der kanonische Typ bleibt `cycling_route`, das Planungsfeld bleibt `planned_at`.

## Datenbank

Für Build 13.13.0 ist keine neue Migration erforderlich. Die bestehende Migration aus Build 13.11.0 muss angewendet sein:

`supabase/migrations/20260730_036_core_v4_11_0_cycling_route_place_type.sql`
