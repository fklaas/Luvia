# Luvia Build 13.12.0 / Core 4.12.0

## Trailforks Hybrid Cycling Discovery & Partner Deep Links

Der produktive Test von Build 13.11.2 hat gezeigt, dass selbst eine technisch saubere und gestufte OpenStreetMap-Suche keine verlässliche Tourenabdeckung garantieren kann. Routenrelationen, MTB-Tags und benannte Trails sind regional sehr unterschiedlich gepflegt. Ein größerer Radius oder weitere Filter können diese fachliche Datenlücke nicht beheben.

Build 13.12.0 ersetzt deshalb die reine Tourensuche durch eine hybride Fahrradrouten-Engine.

## Zwei gleichberechtigte Ebenen

### 1. Vorhandene Touren entdecken

Luvia lädt weiterhin unabhängig und parallel:

- ausgeschilderte Fahrrad- und MTB-Routenrelationen,
- MTB- und Gravel-Wegmerkmale,
- Trailgebiete,
- Bikeparks, Trailzentren und Tour-Startpunkte.

Diese Treffer werden als vorhandene Providerdaten gekennzeichnet und bleiben nach Qualität und Profil sortiert.

### 2. Verlässliche Rundtouren erzeugen

Neu ist die Gateway-Action:

```text
cycling.search.generated
```

Sie berechnet über openrouteservice mehrere vollständige Rundtouren direkt am aktiven Reiseziel beziehungsweise an einem gefundenen geeigneten Trail-Startpunkt.

Unterstützte Luvia-Profile:

- MTB über `cycling-mountain`,
- Gravel über `cycling-mountain` mit gravelbezogener Einordnung,
- City über `cycling-regular`,
- Familie über `cycling-regular`,
- klassische Radtour über `cycling-regular`.

Je Profil werden mehrere Zielstrecken und Seeds parallel berechnet. Dadurch erhält der Nutzer unterschiedliche Rundtouren statt mehrfach derselben Strecke.

## Klare Kennzeichnung

Erzeugte Touren erscheinen mit:

```text
Für euch erstellt
```

Sie werden niemals als vorhandene, offiziell ausgeschilderte oder redaktionell geprüfte Tour dargestellt. Die Detailkarte weist ausdrücklich darauf hin, dass Verlauf, Sperrungen, Befahrbarkeit und Wegzustand vor der Fahrt geprüft werden müssen.

## Routendaten

Soweit vom Provider verfügbar, übernimmt Luvia:

- vollständige Routengeometrie,
- tatsächliche Routendistanz,
- berechnete Fahrzeit,
- Höhengewinn und Höhenverlust,
- Oberflächenanteile,
- Steigungs- und Eignungsinformationen,
- gewähltes Routingprofil,
- Round-Trip-Seed,
- Providerattribution.

Fehlende Werte werden nicht erfunden. Höhengewinn und -verlust können zusätzlich aus einer gelieferten dreidimensionalen Routengeometrie berechnet werden.

## Globale Place-Architektur

Die neuen Touren sind keine Sonderobjekte. Sie werden als `cycling_route` über den vorhandenen Universal Place Core importiert und verwenden:

- globale Modul-Shell,
- globale Karten und Detailkarten,
- Favoriten,
- Timeline und `planned_at`,
- Runtime und Commands,
- Reiseisolation,
- Cloud-Persistenz über `places`, `trip_places` und `trip_place_data`,
- Capability Renderer,
- Conformance-Prüfung.

Die universelle Importpipeline bewahrt `openrouteservice` als kanonische Providerquelle. Es wurde keine zusätzliche Tourentabelle und keine lokale Persistenz eingeführt.

## Sichere Providerkonfiguration

Der API-Schlüssel wird ausschließlich in der Supabase Edge Function gelesen:

```text
OPENROUTESERVICE_API_KEY
```

Optional wird aus Kompatibilitätsgründen auch `ORS_API_KEY` erkannt. Der Schlüssel wird niemals an den Browser ausgeliefert.

## Bestehende Provider bleiben erhalten

OpenStreetMap wird nicht ersetzt. Die Ergebnisliste kombiniert künftig:

- erzeugte Rundtouren,
- vorhandene Routen,
- Trailsegmente und Trailgebiete,
- Startpunkte und Anlagen.

Dadurch stehen verlässliche planbare Touren zur Verfügung, während besondere lokal vorhandene MTB- und Gravel-Daten weiterhin sichtbar bleiben.
