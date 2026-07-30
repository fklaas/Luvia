# UNBEDINGT IMMER LESEN – Verbindliche Luvia-Places-Architektur

> **Pflichtlektüre vor jeder Änderung an Places, Dashboard, Timeline, Favoriten, Place-Details, Place-Modulen, Boot, Realtime oder Reisewechsel.**
>
> Diese Datei ist keine unverbindliche Dokumentation. Sie beschreibt den verbindlichen Architektur-, Technik-, Funktions-, Design- und UI-Vertrag von Luvia. Neue Implementierungen dürfen davon nicht abweichen. Bestehende Abweichungen sind in den Core zurückzuführen – nicht durch weitere Sonderwege zu ergänzen.

## 1. Grundsatz: Cloud ist die einzige Wahrheit

Luvia besitzt für Places genau einen maßgeblichen Datenstand: Supabase/Cloud.

Nicht zulässig als konkurrierende Wahrheit:

- LocalStorage für Place-Domain-Daten
- modulinterne Favoritenlisten
- separate Restaurant-, Unterkunfts- oder Aktivitäts-Timelines
- lokale aktive Reise, die das Cloud-Profil überschreibt
- duplizierte Place-Details oder eigene Provider-Caches außerhalb der globalen Services

LocalStorage darf ausschließlich für kurzlebige UI-Zustände verwendet werden, niemals als fachlicher Place-Datenspeicher.

## 2. Kanonisches Datenmodell

Jeder reale Ort folgt derselben Kette:

```text
Provider Place
→ Place Entity
→ Trip Place
→ Trip Place Data
→ Collections / Timeline / Detail / Intelligence
```

### Place Entity
Globale Identität des realen Ortes. Provider-IDs, Name, Adresse, Koordinaten, Kategorie und Provider-Metadaten gehören hierhin.

### Trip Place
Verknüpfung eines Place mit genau einer Reise. Enthält reisebezogenen Status und Lifecycle.

### Trip Place Data
Flexible, typabhängige Reisedaten wie:

- `planned_at`
- `starts_at`
- `ends_at`
- `check_in_at`
- `check_out_at`
- Reservierungs-, Buchungs- oder Notizfelder

### Wichtige ID-Regel
`place_id` in Supabase muss eine interne UUID sein. Google-/Provider-IDs dürfen niemals als UUID in Cloud-Tabellen geschrieben werden.

## 3. Place Type Contract

Jeder Place-Typ muss in `core/places/place-type-contract.js` bzw. den Type Definitions registriert sein.

Der Contract definiert verbindlich:

- kanonischen Typ
- `moduleKey`
- Lifecycle-Zustände
- Capabilities
- Provider-Mapping
- Planungsfelder
- Timeline-Rollen
- UI-Verhalten
- Detailabschnitte
- erlaubte Aktionen
- Intelligence-Adapter

Ein Modul darf keine eigenen Lifecycle-Werte, Timeline-Feldnamen oder Aktionsbezeichnungen erfinden.

## 4. Globale Services und ihre Verantwortung

### `LuviaPlaceEntities`
Einziger Weg für Import, Laden und kanonische Place-/Trip-Place-Verknüpfungen.

### `LuviaTripPlaceData`
Einziger Weg für typabhängige Place-Daten und Timeline-Persistenz.

### `LuviaPlaceCollections`
Einziger Weg für Favoriten, Sammlungen und „Alle entfernen“.

### `LuviaPlaceDetail` / `LuviaPlaceDetails`
Einziger universeller Detail-Renderer. Keine eigene Detailkarte pro Modul.

### `LuviaPlaceUI`
Einziger globaler Kartenrenderer für Discovery- und Favoritenkarten.

### `LuviaPlaceUIActions`
Einziger Weg für Favorit- und Timeline-Aktionen sowie das Contract-gesteuerte Planungsdialogfenster.

### `LuviaPlaceExperience`
Einzige globale Modulschablone für Header, Planned Panel, Discovery, Suche, Kategorien, Ergebnisse, Loading-/Empty-States und Favoritensammlung.

### `LuviaTimelineCore`
Einzige Timeline für alle Place-Typen. Module erstellen keine eigene Timeline.

### `LuviaPlacesShell`
Steuert Place-Hub, Modul-Mounting, Wechsel, Rückkehr und aktiven Trip-Kontext.

### `LuviaPlaceConformance`
Prüft Architektur- und UI-Verträge. Regeln dürfen nicht abgeschwächt werden, um Abweichungen „grün“ zu machen. Der Code muss korrigiert werden.

## 5. Verbindliche Modul-Schablone

Jedes Place-Modul verwendet dieselben Core-Bausteine:

```text
LuviaPlaceExperience.plannedPanel
LuviaPlaceExperience.discovery
LuviaPlaceCollections.favoritePanel
LuviaPlaceUI.card
LuviaPlaceUIActions.openTimelineDialog
LuviaPlaceDetail.open
```

Ein Modul liefert nur typabhängige Konfiguration und Adapter. Es baut nicht selbst:

- Header
- Such-Shell
- Favoriten-Shell
- Karten
- Planungsdialog
- Detail-Overlay
- Loading State
- Empty State

## 6. Verbindliches Design und UI

### Typografie
Immer globale Design-Tokens verwenden:

- `--lv-font-body`
- `--lv-font-display`
- `--lv-text`
- `--lv-muted`

Keine lokale Schriftart und keine fest codierten Textfarben.

### Flächen und Linien
Immer globale Tokens:

- `--lv-bg`
- `--lv-surface-elevated`
- `--lv-surface-soft`
- `--lv-line`
- `--lv-shadow-*`

### Akzentfarbe
Favorit und „Zur Timeline“ verwenden immer die Akzentfarbe der aktiven Reise. Module dürfen keine eigene Primärfarbe setzen.

### Globale Hauptaktionen
Immer dieselben Bezeichnungen:

```text
♡ Favorit
＋ Zur Timeline
```

Nach Zustandsänderung:

```text
♥ Favorit
✓ In Timeline
```

### Karten
Discovery- und Favoritenkarten sind dieselbe Komponente. Favoritenstatus verändert nur Zustand und Aktion, niemals Layout, Bildfläche oder Fact Slots.

### Globale Fact Slots
Kompakte Karten verwenden ausschließlich:

- Bewertung
- Entfernung
- beste Besuchszeit
- Preisniveau
- Öffnungsstatus

Keine lokalen Intelligence-Chips auf kompakten Karten.

### Dark Mode
Alle Places-Flächen und Texte müssen ausschließlich Theme-Tokens verwenden. Weiß auf heller Fläche oder dunkle fest codierte Farben sind Architekturfehler.

## 7. Detailkarten

Alle Typen verwenden denselben Detail-Renderer mit:

- Galerie
- Name, Typ und Adresse
- Favorit und Zur Timeline
- Fact Slots
- Lifecycle
- Überblick
- Provider-Felder
- Empfehlungen / Einschränkungen
- Alternativen
- optionalen typabhängigen Abschnitten

Typabhängige Abschnitte ergänzen die Karte, ersetzen sie nicht.

## 8. Globale Timeline-Regel

Jeder planbare Place-Typ registriert seine Zeitfelder im Contract.

Beispiele:

```text
Restaurant: planned_at (point)
Sehenswürdigkeit: starts_at (point)
Unterkunft: check_in_at (start), check_out_at (end)
```

Nach erfolgreicher Planung müssen zentral ausgelöst werden:

```text
luvia:place-plan-changed
luvia:timeline-invalidated
LuviaTimelineCore.hydrate(tripId)
```

Die Timeline erzeugt fachliche Titel, z. B.:

- `Restaurant · Name`
- `Sehenswürdigkeit · Name`
- `Check-in · Unterkunft`
- `Check-out · Unterkunft`

Feldnamen wie „Zeitpunkt“ oder „Datum und Uhrzeit“ dürfen nicht als sichtbare Ereignistitel erscheinen.

## 9. Favoriten und Sammlungen

Favoriten laufen ausschließlich über `LuviaPlaceCollections`.

„Alle entfernen“ muss:

1. den kanonischen Place-Typ verwenden,
2. alle Favoriten dieses Typs in der aktiven Reise laden,
3. zentral zurücksetzen,
4. Collection-/Place-Events senden,
5. die globale Shell neu rendern.

Kein Modul implementiert eine eigene Sammellöschung.

## 10. Boot, Reisewechsel und Realtime

### Boot
Genau ein Bootprozess:

```text
Intro
→ Auth
→ Cloud-Profil
→ aktive Reise
→ Timeline / Place-Daten
→ UI
→ Realtime
```

Das Intro darf nicht durch Service-Worker-Aktivierung, Auth-Events oder doppelte `bootstrap()`-Aufrufe erneut starten.

### Aktive Reise
Die Cloud-Profil-ID ist maßgeblich. Ein sichtbarer View darf nur wiederverwendet werden, wenn View und `tripId` übereinstimmen.

### Realtime
Realtime liefert ausschließlich spätere Änderungen. Es darf nicht parallel den Initialzustand aufbauen oder vollständige Module bei Fokus-/Tabwechsel neu mounten.

## 11. Performance-Regeln

- Erstes sichtbares Kartenbild eager laden.
- Bekannte Preview-Daten sofort rendern.
- Detail-, Foto- und Importanfragen deduplizieren.
- Kein Modul wartet auf vollständige Intelligence, bevor Grundkarten erscheinen.
- Keine komplette Modul-Neuhydration bei jedem Event.
- Keine konkurrierenden `place.list`-Anfragen.
- Keine automatischen Scrollsprünge bei Fokus, `visibilitychange` oder Realtime-Reconnect.

## 12. Verbotene Sonderwege

Strikt verboten:

- eigener Favoritenspeicher pro Modul
- eigene Detailkarte
- eigene Timeline
- eigener Planungsdialog
- lokale Card-Komponente
- direkte Supabase-Tabellenzugriffe aus Place-Modulen
- direkte Manipulation von `trip_places` oder `trip_place_data`
- Provider-ID als interne UUID
- Inline-Styles und direkte `element.style`-Manipulation für Place-UI
- lokale Aktionsnamen oder Farben
- lokale Dark-Mode-Regeln
- Mounting/Rendern ohne aktiven eindeutigen `tripId`-Kontext

## 13. Pflichtablauf für neue Place-Typen

1. Contract registrieren.
2. Provider-Mapping ergänzen.
3. Type Capability und Timeline-Rollen definieren.
4. Modul nur als Adapter auf die globale Experience Shell bauen.
5. Globale Card und Favorite Collection verwenden.
6. Globale Detailkarte verwenden.
7. Globalen Planungsdialog verwenden.
8. Timeline-Persistenz ausschließlich über `LuviaTripPlaceData`.
9. Reisewechsel, Reload, Dark Mode und mobile Darstellung testen.
10. `await LuviaPlaceConformance.runAll()` ausführen.
11. Erst veröffentlichen, wenn `ok: true` und alle Interaktionen manuell geprüft sind.

## 14. Pflicht-Regressionscheck vor jedem Release

- App startet genau einmal.
- Zuletzt aktive Cloud-Reise wird geladen.
- Alle Core-Place-Module sind nach Reload sichtbar.
- Restaurant, Unterkunft und Sehenswürdigkeit öffnen.
- Suche und Kategorien reagieren sofort.
- Discovery- und Favoritenkarten sind identisch.
- Favorit setzen und entfernen funktioniert.
- „Alle entfernen“ funktioniert für jeden Typ.
- „Zur Timeline“ funktioniert für jeden planbaren Typ.
- Timeline zeigt fachliche Titel und richtige Reise.
- Reisewechsel hinterlässt keine alten Daten.
- Detailaktionen nutzen die Reisefarbe.
- Dark Mode ist vollständig lesbar.
- Keine Architekturfehler in der Konsole.
- `LuviaPlaceConformance.runAll()` meldet `ok: true`.

## 15. Regel für ChatGPT und alle zukünftigen Entwickler

Vor jeder Änderung an Luvia Places muss diese Datei vollständig gelesen werden. Bei Konflikten zwischen einer schnellen lokalen Lösung und diesem Dokument gewinnt immer der globale Core-Vertrag. Keine neue Sonderstruktur, kein Workaround und keine Doppelimplementierung.

## Verbindliche Regel: Favoriten-Sammelaktionen und Kartenstatus

Stand ab Build 13.6.9 / Core 4.6.9:

- `Alle entfernen` wird ausschließlich durch `LuviaPlaceCollections` ausgeführt.
- Die Sammelaktion darf **nicht** zuerst erneut die komplette Place-Liste vom Gateway laden. Die globale Favorite-Shell übergibt die bereits bekannten kanonischen `tripPlaceId`-Werte direkt an den Collection Core.
- Jede betroffene Verknüpfung wird über `LuviaPlaceEntities.updateLifecycle(..., { isFavorite:false })` aktualisiert.
- Anschließend wird genau ein globales Ereignis `luvia:place-collection-changed` mit `action: favorites-cleared`, den betroffenen `clearedTripPlaceIds` und den `providerPlaceIds` ausgelöst.
- Alle Place-Module müssen dieses Ereignis konsumieren und sowohl Favoritensammlung als auch Discovery-Karten synchronisieren.
- Eine Karte darf nach einer Sammellöschung nirgendwo weiter `Favorit ✓` oder `♥ Favorit` anzeigen. Der Zustand ist global, tripgebunden und cloudautoritativ.
- Lokale Sammellöschungen, modulinterne Favoritenlisten oder ein erneuter `place.list`-Zwang vor dem Entfernen sind verboten.

Diese Regel gilt gleichermaßen für Restaurants, Unterkünfte, Sehenswürdigkeiten und alle zukünftigen Place-Typen.


## 18. Verbindliches globales Favoritensystem (Core 4.6.9)

Favoriten dürfen ausnahmslos nur über `LuviaPlaceCollections` verändert werden. Die verbindliche UI-Aktion ist `data-place-favorite-toggle`; modulbezogene Schreibaktionen wie `data-rv2-import`, `data-favorite` oder eigene Favoriten-Handler sind für neue Implementierungen verboten.

Jede Favoritenaktion benötigt den Place-Typ und mindestens eine kanonische Identität: `tripPlaceId` für bereits verknüpfte Orte oder `providerPlaceId` für noch nicht importierte Orte. Der Core importiert bei Bedarf genau einmal, schreibt `trip_places.is_favorite`, synchronisiert alle sichtbaren Karten und sendet `luvia:place-favorite-changed` sowie `luvia:place-collection-changed`.

Ein Klick auf einen bereits aktiven Favoritenbutton entfernt den Ort wieder aus den Favoriten. Das gilt für Discovery-Karten, Favoritenkarten und Detailkarten. `Alle entfernen` verwendet denselben zentralen Schreibweg für jeden einzelnen Place. Nach erfolgreichem Entfernen müssen alle Karten desselben Ortes sofort `♡ Favorit` zeigen; ein Reload ist unzulässig.

Module dürfen Favoriten nur darstellen und auf die globalen Events mit einem normalen Daten-Refresh reagieren. Sie dürfen weder einen eigenen Favoriten-Cache als Wahrheit führen noch direkt `place.lifecycle.update`, `place.import` oder `trip_places` für Favoriten aufrufen.


## Verbindlicher Favoriten-Writer ab Core 4.6.9

Restaurants, Unterkünfte, Sehenswürdigkeiten und alle zukünftigen Place-Typen verwenden **ausschließlich** `LuviaPlaceCollections`.

Verboten sind insbesondere:

- modulinterne Favoriten-Importfunktionen,
- eigene Entfernen-Handler,
- deaktivierte Favoritenbuttons,
- eigene Favoritencaches als Wahrheit,
- direkte Lifecycle-Schreibvorgänge für Favoriten aus einem Place-Modul.

Jeder Favoritenbutton muss durch `LuviaPlaceCollections.favoriteButton(...)` erzeugt werden. Jeder Klick wird zentral über `data-place-favorite-toggle` verarbeitet. Ein aktiver Favorit bleibt anklickbar und entfernt den Ort wieder aus der Sammlung. `Alle entfernen` verwendet denselben Writer für jeden einzelnen kanonischen `tripPlaceId`.

Der globale Core normalisiert sowohl `is_favorite` als auch historische `isFavorite`-Antworten. Module dürfen diese Varianten nicht selbst auswerten. Ereignisse `luvia:place-favorite-changed` und `luvia:place-collection-changed` sind die einzige UI-Synchronisationsschnittstelle.

## 19. Verbindliche Favoriten-Persistenz ab Core 4.6.11

Für alle Place-Typen gilt derselbe atomare Ablauf. Ein noch nicht mit der Reise verknüpfter Provider-Ort wird beim ersten Favoritenklick direkt mit `status: favorite` und `isFavorite: true` importiert. Es ist verboten, zunächst einen unfavorisierten Datensatz zu importieren und anschließend über einen zweiten konkurrierenden Request zu favorisieren.

Der sichtbare Buttonzustand (`aria-pressed`) bestimmt beim Klick eindeutig den gewünschten Folgezustand. Modulinterne Models, alte Restaurant-Caches oder historische Feldnamen dürfen diese Entscheidung nicht überschreiben.

Nach erfolgreicher Persistenz verteilt `LuviaPlaceCollections` den kanonischen Zustand über `luvia:place-favorite-changed` und `luvia:place-collection-changed`. Jedes Modul darf diesen Zustand nur spiegeln. Insbesondere darf ein Restaurant-Render einen gerade erfolgreich gespeicherten Favoriten nicht durch ein veraltetes lokales Model wieder zurücksetzen.

Geschützte Gateway-Aufrufe warten auf die initialisierte Supabase-Sitzung und verwenden ausschließlich das aktuelle Access Token. Ein Request ohne verfügbare Sitzung darf nicht als paralleler anonymer Schreibversuch gestartet werden.

## 20. Restaurant-Favoriten-Rendering ab Core 4.6.11

Auch die Darstellung gespeicherter Restaurantfavoriten muss ausschließlich mit den bereits kanonisch aufgelösten Identitäten arbeiten.

Verbindlich:

- Der Kartenrenderer löst die Provider-ID einmal als lokale `providerId` auf.
- Genau diese aufgelöste ID wird an `LuviaPlaceCollections.favoriteButton(...)` übergeben.
- Nicht deklarierte oder implizite Variablennamen wie `providerPlaceId` sind im Renderer verboten.
- Ein Renderfehler in einer Favoritensammlung darf niemals den erfolgreichen globalen Favoritenstatus überschreiben oder dessen UI-Synchronisation abbrechen.
- Restaurant, Unterkunft und Sehenswürdigkeit verwenden denselben Favorite-Core und unterscheiden sich nur in `placeType` und Identitätsdaten.

Pflichttest nach jeder Änderung an Place-Karten:

1. Einen neuen Favoriten über eine Discovery-Karte setzen.
2. Favoritensammlung öffnen.
3. Favoritenkarte vollständig rendern.
4. Favorit über Discovery- oder Favoritenkarte wieder entfernen.
5. `Alle entfernen` ausführen.
6. Prüfen, dass keine `ReferenceError`-Meldung entsteht und alle Karten denselben Zustand zeigen.
