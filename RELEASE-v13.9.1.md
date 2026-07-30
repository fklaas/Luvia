# Luvia Build 13.9.1 / Core 4.9.1

## Global Place Planning Dialog & Insight Contract

Build 13.9.1 behebt den UUID-Fehler beim nachträglichen Ändern von Datum und Uhrzeit in Sehenswürdigkeiten, Fotospots und Shopping. Gleichzeitig wird der Planungsdialog endgültig als globaler Bestandteil der Places-Architektur festgeschrieben.

## Behobene Ursache

Die geplanten Karten oberhalb der Suche verwenden bei Sehenswürdigkeiten, Fotospots, Shopping und Unterkünften Einträge aus `LuviaTripPlaceData.dateEntries(...)`.

Diese Einträge besitzen kanonische Felder wie:

- `tripPlaceId`
- `dataKey`
- `placeType`
- `fields`

Sie besitzen jedoch nicht zwingend zusätzlich `source: "place-data"`.

Der bisherige Timeline-Editor erkannte ausschließlich das `source`-Attribut. Rohe Place-Data-Einträge wurden deshalb fälschlich an den Legacy-Writer für `trip_schedule_events` weitergereicht. Dort wurde mit einer nicht vorhandenen `rowId` gefiltert. Supabase erhielt dadurch `id = undefined` für eine UUID-Spalte und meldete:

```text
invalid input syntax for type uuid: "undefined"
```

Build 13.9.1 erkennt Place-Data-Einträge nun anhand ihrer kanonischen Identität und Felder. Sie können nicht mehr in den Legacy-Speicherpfad geraten.

## Ein globaler Planungsdialog

Neu beziehungsweise verbindlich zentralisiert sind:

- `LuviaPlaceExperience.planningEditor(...)` für das Formular-Markup
- `LuviaTimelineCore.openPlanningEditor(...)` für Verhalten und Speicherung
- `LuviaPlaceUIActions.openTimelineDialog(...)` für neue Planungseinträge
- `LuviaTimelineCore.editEntry(...)` für nachträgliche Änderungen

Restaurants, Unterkünfte, Sehenswürdigkeiten, Fotospots und Shopping verwenden dadurch dieselbe Dialog-Shell.

Der Dialog besitzt jetzt überall:

- getrennte, gut lesbare Datums- und Uhrzeitfelder
- identische Abstände, Rundungen und Reisefarbe
- denselben Responsive-Aufbau
- denselben Lade- und Fehlerzustand
- Absenden über den primären Button
- Absenden mit Enter
- Schließen mit Escape
- Inline-Fehlermeldung statt Browser-Alert

Unterkünfte erhalten contract-gesteuert Check-in und Check-out. Punktuelle Places erhalten ihr jeweiliges kanonisches Timeline-Feld, zum Beispiel:

- Restaurant: `planned_at`
- Sehenswürdigkeit: `starts_at`
- Fotospot: `planned_at`
- Shopping: `planned_at`

## Ein Cloud-Writer

Neue und geänderte Planungseinträge schreiben ausschließlich über:

```text
LuviaPlaceCollections.saveDateFields(...)
→ LuviaTripPlaceData
→ luvia_upsert_trip_place_fields(...)
→ trip_place_data
```

Damit verwenden Planung, geplante Karten, Dashboard und Timeline denselben cloudautoritativen Datensatz.

## UUID-Schutz

`LuviaTripPlaceData` prüft `tripId` und `tripPlaceId` jetzt vor jedem RPC-Aufruf als kanonische UUID.

Nicht mehr an Supabase gesendet werden können:

- `undefined`
- leere IDs
- Google-Provider-IDs an UUID-Parametern
- unvollständige Place-Verknüpfungen

Ein unvollständiger Datensatz wird vor dem Netzwerkaufruf verständlich in der UI gemeldet.

## Insight-Card-Contract

Die kurzen Intelligence-Karten aus Fotospots und Shopping werden als verbindlicher globaler UI-Vertrag festgeschrieben.

Die Darstellung kommt ausschließlich aus:

```text
LuviaPlaceUI.insightGrid(...)
```

Ein Place-Typ mit eigenen Insight Cards muss im Contract angeben:

- `capabilities.insightCards: true`
- `ui.detail.insightSection`

Zusätzlich muss er seinen fachlichen Renderer über folgende globale Registry bereitstellen:

```text
LuviaPlaceDetail.registerCapabilityRenderer(...)
```

Conformance meldet künftig einen Fehler, wenn ein aktivierter Insight-Typ keine Section-Metadaten oder keinen Renderer besitzt.

Fotospots und Shopping sind derzeit produktiv aktiviert. Restaurants, Unterkünfte und Sehenswürdigkeiten können denselben Renderer künftig für fachlich sinnvolle eigene Inhalte verwenden. Dabei werden keine bereits vorhandenen Fact Slots dupliziert und keine unsicheren Angaben erfunden.

## Design-Verantwortung

Die Styles des Planungsdialogs liegen nicht mehr im Restaurant-Modul, sondern zentral in:

```text
core/places/place-ui.css
```

Das Restaurant-Modul bleibt fachlich für Öffnungszeitenprüfungen zuständig, verwendet für das eigentliche Formular aber ebenfalls den globalen Editor.

## Realtime und In-Window-Update

Nach erfolgreichem Speichern werden weiterhin zentral ausgelöst:

- Timeline-Hydration
- `luvia:place-plan-changed`
- `luvia:in-window-data-changed`

Die geplanten Karten, Dashboard-Timeline und aktuelle Modulansicht aktualisieren sich ohne Browser-Reload.

## Datenbank und Provider

- Keine SQL-Migration erforderlich.
- Keine neue Tabelle erforderlich.
- Keine neuen Secrets erforderlich.
- Keine Änderung am Google-Places-Vertrag.
- Die Edge Function erhält ausschließlich die aktuelle Build-/Core-Version und muss deshalb erneut deployed werden.

## Bekannte Grenzen

- Bestehende historisch angelegte `trip_schedule_events` werden weiterhin über einen kompatiblen Legacy-Pfad bearbeitet. Dieser Pfad besitzt nun ebenfalls UUID-Schutz und denselben globalen Formulardialog.
- Die Insight-Card-Inhalte für Restaurants, Unterkünfte und Sehenswürdigkeiten werden erst aktiviert, wenn dafür belastbare typabhängige Intelligence-Werte definiert sind.
- Meldungen wie `tabs:outgoing.message.ready` stammen typischerweise von Browser-Erweiterungen und gehören nicht zum Luvia-Runtime-Code.
