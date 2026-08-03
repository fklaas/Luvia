# Luvia Build 13.15.0 / Core 4.15.0

## Move Domain Extraction & Mobility Separation

Build 13.15.0 trennt Mobilität fachlich aus der Places-Übersicht heraus. **Places bleibt weiterhin Places**. Der neue eigenständige Hauptbereich heißt **Move**.

Die Hauptnavigation besteht damit aus:

- Dashboard
- Places
- Move

Move ist keine technische Kopie von Places. Der Bereich nutzt weiterhin denselben globalen Place-Core, dieselben Karten, Favoriten, Details, Timeline-Felder, Cloud-Writer und dieselbe Reiseisolation. Neu ist ausschließlich die fachliche Domain-Shell und die für Mobilität passende Nutzerführung.

## Places

Die Places-Übersicht enthält wieder ausschließlich die sechs Entdeckungsbereiche:

- Unterkünfte
- Restaurants
- Sehenswürdigkeiten & Aktivitäten
- Fotospots
- Shopping
- Natur & Ausflüge

`mobility` wird nicht mehr als siebte Place-Kachel dargestellt und nicht mehr durch `LuviaPlacesShell` geöffnet.

## Neuer Hauptbereich Move

`LuviaMoveShell` verwendet dieselben visuellen Hub-Bausteine wie Places und gliedert die Mobilität in zwei verständliche Gruppen.

### An- & Abreise

- Flüge
- Bahn
- Bus & Fernbus
- Fähren

### Vor Ort

- Nahverkehr
- Taxi & Fahrdienste
- Vermietung
- Parken & Laden

Jede Kachel konfiguriert dasselbe kanonische Fachmodul `mobility`. Es entstehen weder acht Fachmodule noch acht getrennte Datenmodelle.

## Verbindlicher gemeinsamer Core

Move verwendet weiterhin:

- `LuviaPlaceRuntime`
- `LuviaPlaceCommands`
- `LuviaPlaceExperience.moduleShell(...)`
- `LuviaPlaceUI.card(...)`
- `LuviaPlaceCollections`
- `LuviaPlaceDetail`
- `LuviaPlaceUIActions`
- `LuviaTripPlaceData`
- `LuviaTimelineCore`
- `LuviaPlaceConformance`

Der kanonische Place-Typ bleibt `mobility`. Gespeicherte Einträge aus Build 13.14.0 bleiben deshalb vollständig kompatibel.

## Präzisere Move-Suche

Jede Move-Kategorie besitzt eine eigene Typ-Whitelist und mehrere gezielte Google-Places-Suchpläne. Ergebnisse werden nur übernommen, wenn ihr tatsächlicher Provider-Typ zur geöffneten Kategorie passt.

Beispiele:

- Fähren akzeptieren ausschließlich Fährterminals und Fährdienste.
- Flüge akzeptieren ausschließlich Flughäfen.
- Bahn sucht getrennt nach Haupt-, Fern- und Regionalbahnhöfen sowie Reisezentren.
- Bus und Fernbus suchen getrennt nach Busbahnhöfen und Haltestellen.
- Nahverkehr trennt Metro, Stadtbahn, Straßenbahn und Bus.

Ein fachfremder Treffer wird nicht mehr als vermeintliche Alternative ausgegeben.

## Verständlichere Ergebnisnamen

Rohe Namen wie `München`, `Augustenstraße` oder `ZOB` werden mit der erkannten Verkehrsart ergänzt, wenn der Originalname diese Information nicht selbst enthält.

Beispiele:

- `München · Bahn & Fernverkehr`
- `Augustenstraße · Bus`
- `Name · Fährterminal`

Der Originalname bleibt erhalten; Move ergänzt lediglich die fachliche Einordnung.

## Entfernung und Planungskontext

Die Discovery verwendet die Entfernung zum kanonischen Reiseziel beziehungsweise dessen Suchanker. Das Mobilitätsmodul überschreibt diese Distanz nicht mehr nachträglich mit der Entfernung vom aktuellen Gerät.

Dadurch entstehen bei der Reiseplanung keine irreführenden Angaben wie mehrere hundert Kilometer vom derzeitigen Aufenthaltsort.

## Echtzeitgrenzen

Move zeigt belastbare Orts- und Providerdaten, behauptet aber keine:

- Live-Abfahrten
- Verspätungen
- aktuellen Gleise oder Gates
- freien Parkplätze
- freien Ladepunkte
- verbindlichen Tarife oder Preise

Diese Informationen benötigen später eine eigene Fahrplan- beziehungsweise Betreiberanbindung.
