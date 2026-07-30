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

## 19. Verbindliche Favoriten-Persistenz ab Core 4.7.0

Für alle Place-Typen gilt derselbe atomare Ablauf. Ein noch nicht mit der Reise verknüpfter Provider-Ort wird beim ersten Favoritenklick direkt mit `status: favorite` und `isFavorite: true` importiert. Es ist verboten, zunächst einen unfavorisierten Datensatz zu importieren und anschließend über einen zweiten konkurrierenden Request zu favorisieren.

Der sichtbare Buttonzustand (`aria-pressed`) bestimmt beim Klick eindeutig den gewünschten Folgezustand. Modulinterne Models, alte Restaurant-Caches oder historische Feldnamen dürfen diese Entscheidung nicht überschreiben.

Nach erfolgreicher Persistenz verteilt `LuviaPlaceCollections` den kanonischen Zustand über `luvia:place-favorite-changed` und `luvia:place-collection-changed`. Jedes Modul darf diesen Zustand nur spiegeln. Insbesondere darf ein Restaurant-Render einen gerade erfolgreich gespeicherten Favoriten nicht durch ein veraltetes lokales Model wieder zurücksetzen.

Geschützte Gateway-Aufrufe warten auf die initialisierte Supabase-Sitzung und verwenden ausschließlich das aktuelle Access Token. Ein Request ohne verfügbare Sitzung darf nicht als paralleler anonymer Schreibversuch gestartet werden.

## 20. Restaurant-Favoriten-Rendering ab Core 4.7.0

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


## Build 13.7.0 – Global Place Runtime & Conformance Closure

Ab Build 13.7.0 gilt zusätzlich verbindlich:

1. `LuviaPlaceRuntime` ist der einzige UI-Laufzeitsnapshot für Place Entities, Trip-Place-Verknüpfungen, Favoriten und reisespezifische Place-Daten. Module dürfen Cloud-Daten nicht als eigene zweite Wahrheit spiegeln.
2. `LuviaPlaceCommands` ist die einzige Command-Fassade für `favorite`, `unfavorite`, `toggleFavorite`, `clearFavorites`, `plan` und `unplan`.
3. Restaurant, Unterkunft und Sehenswürdigkeit müssen dieselben Shell-Bausteine verwenden: `LuviaPlaceExperience.discovery`, `LuviaPlaceExperience.plannedPanel`, `LuviaPlaceCollections.favoritePanel`, `LuviaPlaceUI.card`, `LuviaPlaceDetail` und `LuviaPlaceUIActions`.
4. Lokale Funktionen namens `setFavorite`, `toggleFavorite` oder `clearFavorites` in Place-Modulen sind verboten.
5. Direkte Lifecycle-Schreibvorgänge mit `isFavorite` aus Modulen sind verboten.
6. Der Runtime Store ist an eine eindeutige `tripId` gebunden. Ein Reisewechsel darf niemals Datensätze einer vorherigen Reise weiterverwenden.
7. Conformance muss für alle Module einschließlich Restaurants dieselben Shell-Anforderungen prüfen.
8. Vor jedem Release ist `node tests/place-architecture-regression.test.cjs` sowie `await LuviaPlaceConformance.runAll()` auszuführen.


## Build 13.8.0 / Core 4.8.0 – Gateway-, Diagnose- und Versionsvertrag

Diese Regeln sind verbindlich:

1. **Eine Release-Version:** `intelligence/kernel/version.js` ist die einzige Quelle für Core, Build, Kanal und Build-Zeit. App, Diagnose, Developer Console, Backend Console, PWA und Edge-Health müssen diese Werte anzeigen.
2. **Auth vor geschützten Requests:** `LuviaBackend` wartet vor dem ersten geschützten Request auf eine gültige Supabase-Sitzung. Ein 401 darf höchstens einen kontrollierten Token-Refresh auslösen.
3. **Öffentliche Aktionen:** `system.health`, `places.health` und `destination.resolve` dürfen ohne Benutzer-Token laufen. Alle schreibenden Place-Aktionen bleiben geschützt.
4. **CORS-Vertrag:** Die Edge Function beantwortet `OPTIONS` für freigegebene Origins mit vollständigen CORS-Headern. Nicht freigegebene Origins werden eindeutig mit 403 abgewiesen.
5. **Deduplizierung und Backoff:** Identische parallele Requests werden zusammengeführt. 502/503/504 werden höchstens zweimal mit exponentiellem Backoff wiederholt; anschließend schützt ein kurzer Circuit Breaker vor Request-Stürmen.
6. **Keine unhandled Background Requests:** Automatische Destination-Auflösung arbeitet fehlertolerant, gedrosselt und darf die App oder Konsole nicht mit wiederholten Promise-Fehlern fluten.
7. **Places-Testmatrix:** Backend & Places muss Restaurants, Unterkünfte und Sehenswürdigkeiten einzeln über dieselbe produktive Pipeline testen können.
8. **Place Readiness:** In der Developer Console stehen implementierte Typen `restaurant`, `accommodation` und `attraction` auf `ready`. Noch nicht implementierte Contracts stehen auf `planned`, nicht fälschlich auf produktionsbereit.
9. **Diagnose ist Teil des Releases:** Diagnose-, Developer- und Backend-Konsole müssen bei jedem Build aktualisiert und gegen die zentrale Version geprüft werden.
10. **Konsolen-Regressionsregel:** Normaler Start, Reisewechsel, alle Place-Module, Favorit, Timeline und Backend-Tests dürfen keine Luvia-eigenen 400/401/503/CORS- oder unhandled-Promise-Fehler erzeugen.

## Build 13.8.0 – Fotospots als Referenz für neue Place-Typen

`photo_spot` ist der erste Place-Typ, der nach der Runtime-&-Conformance-Closure vollständig als Contract plus fachlicher Adapter ergänzt wurde.

Verbindlich gilt:

- Modul-ID: `photo_spots`
- Place-Typ: `photo_spot`
- Shell, Karten, Favoriten, Detailkarte, Timeline-Dialog und Cloud-Persistenz kommen ausschließlich aus dem globalen Place Core.
- Der kurze Planungstermin wird als `planned_at` mit `timelineRole: point` gespeichert.
- Fotofachliche Werte sind Empfehlungen mit sichtbarer Quelle und Sicherheit. Nutzerangaben überschreiben automatische Ableitungen immer.
- Sonnenaufgang/-untergang, Lichtfenster und Sonnenrichtung werden aus Place-Koordinaten, Reisedatum und astronomischem Sonnenstand berechnet.
- Motiv, Indoor/Outdoor, Stativ und Zugang werden aus Google-Kategorie, Name und Beschreibung abgeleitet. Unklare Werte müssen als „wahrscheinlich“ oder „prüfen“ gekennzeichnet werden; erfundene Gewissheit ist verboten.
- `LuviaPhotoSpotIntelligence` ist der einzige fachliche Ableitungsdienst für Fotospots.
- Fotospots müssen dieselben Conformance-Regeln wie Restaurant, Unterkunft und Sehenswürdigkeit bestehen.

## Build 13.8.1 / Core 4.8.1 – Verbindlicher Places-Hub- und Insight-Card-Vertrag

Ab Build 13.8.1 gilt zusätzlich:

- Der Places-Hub verwendet auf großen Web-Ansichten **maximal drei Spalten**. Unterhalb von 1040 px werden zwei Spalten, auf mobilen Ansichten eine Spalte verwendet.
- Hub-Kacheln werden ausschließlich durch `LuviaPlacesShell` erzeugt. Sie müssen globale Theme-, Reiseakzent-, Typografie-, Flächen- und Linien-Tokens verwenden.
- Inhalte einer Hub-Kachel dürfen ihre Containergrenzen niemals überschreiten. Titel, Beschreibungen und Tags müssen umbrechen können und auf Mobilgeräten vollständig lesbar bleiben.
- Typabhängige Intelligence-Informationen in Detailkarten werden über den globalen Renderer `LuviaPlaceUI.insightGrid(...)` ausgegeben.
- Ein Place-Modul liefert an `insightGrid` nur fachliche Werte, Icons, Quellen und Sicherheiten. Es erstellt keine eigene Card-Struktur und keine lokale Insight-CSS-Shell.
- Insight Cards zeigen Wert, Quelle und Ableitungssicherheit klar getrennt. Unklare Daten dürfen weiterhin nicht als sichere Tatsachen dargestellt werden.
- Der Fotospot-Bereich ist die erste Referenzimplementierung für diesen globalen Insight-Card-Vertrag. Weitere Place-Typen sollen denselben Renderer für typabhängige Informationen verwenden.


## Verbindliche Detailkarten-Öffnung aus Timeline, Dashboard und Cross-Module-Flows

- Timeline und Dashboard dürfen niemals eine reduzierte lokale Kopie der Place-Detailkarte erzeugen.
- Ein externer Place-Aufruf delegiert zuerst an den zuständigen Place-Typ und öffnet damit dieselbe Detailkarte wie innerhalb des Place-Moduls.
- Der globale Detail-Core besitzt zusätzlich typabhängige Capability-Renderer als sicheren Fallback.
- Typabhängige Bereiche wie `Licht, Motiv und Zugang` müssen deshalb auch beim Öffnen aus Timeline, Today, Dashboard oder späteren Modulen sichtbar bleiben.
- Provider-Details dürfen den angeforderten Luvia-Place-Typ beim Nachladen nicht überschreiben. Ein als `photo_spot` geöffneter Ort bleibt für diese Darstellung ein Fotospot, auch wenn Google ihn zusätzlich als Museum, Park oder Sehenswürdigkeit klassifiziert.

## Build 13.9.0 / Core 4.9.0 – Shopping als fünfter produktiver Place-Typ

`shopping` wird ausschließlich als neuer fachlicher Vertrag auf der bestehenden globalen Places-Architektur ergänzt. Es ist verboten, dafür eine eigene Favoriten-, Timeline-, Karten-, Detail- oder Cloud-Struktur zu bauen.

Verbindlich gilt:

- Modul-ID und Place-Typ: `shopping`
- Die globale Places-Shell, Discovery, Vorschaukarten, Favoritensammlung, Detailkarte, Timeline-Dialoge, Reiseakzentfarben, Dark Mode, Runtime, Commands und Conformance werden unverändert wiederverwendet.
- Der Planungstermin wird als `planned_at` mit `timelineRole: point` in `trip_place_data.fields` gespeichert.
- `LuviaShoppingIntelligence` ist der einzige fachliche Ableitungsdienst für Einkaufsformat, Sortiment, Einkaufserlebnis, Indoor/Outdoor, Preisgefühl, lokalen Charakter und beste Besuchszeit.
- Diese Werte sind nachvollziehbare Hinweise aus Google-Place-Daten. Sortiment, konkrete Produkte, Preise, Marktstände und Verfügbarkeit dürfen niemals erfunden werden.
- Typabhängige Shopping-Hinweise werden ausschließlich über `LuviaPlaceUI.insightGrid(...)` dargestellt.
- Shopping-Suchen dürfen nicht pauschal auf den Google-Typ `shopping_mall` beschränkt werden. Märkte, Boutiquen, Souvenirshops, Feinkostläden, Kaufhäuser und Outlets müssen über zielgebundene Textsuche erreichbar bleiben.
- Der Places Explorer muss Shopping separat über die produktive Destination- und Gateway-Pipeline testen können.
- `restaurant`, `accommodation`, `attraction`, `photo_spot` und `shopping` müssen in Registry, Developer Console, Backend und Conformance als produktive Typen auf `ready` stehen.

### Universelle Persistenz typabhängiger Place-Felder

Ab Core 4.9.0 darf `place.import` ein nicht leeres typabhängiges `extension`-Objekt nicht nur in der Importantwort zurückgeben. Für alle nicht restaurant-spezifischen Place-Typen wird es zusätzlich über `luvia_upsert_trip_place_fields(...)` in der vorhandenen kanonischen Tabelle `trip_place_data` gespeichert.

Damit gilt:

- jedes typabhängige reisebezogene Feld besitzt genau eine cloudautoritative Quelle,
- Module lesen diese Werte über `LuviaTripPlaceData`,
- Reload, Reisewechsel, Timeline und externe Detailöffnung verwenden denselben Datensatz,
- neue Place-Typen benötigen für reine JSON-Felder keine eigene Tabelle und keine parallele lokale Persistenz,
- eigene Tabellen sind nur zulässig, wenn ein klarer relationaler Fachbedarf besteht und der zentrale Vertrag entsprechend erweitert wird.


## Build 13.9.1 / Core 4.9.1 – Globaler Planungsdialog und Insight-Card-Contract

Ab Build 13.9.1 ist die Planung sämtlicher Place-Typen verbindlich vereinheitlicht.

### Globaler Planungsdialog

- `LuviaPlaceExperience.planningEditor(...)` rendert das einzige zulässige Formular für Datum und Uhrzeit.
- `LuviaTimelineCore.openPlanningEditor(...)` steuert Öffnen, Schließen, Validierung, Enter-Bestätigung, Ladezustand und Fehlermeldungen.
- `LuviaPlaceUIActions.openTimelineDialog(...)` verwendet denselben Editor für neue Planungseinträge.
- `LuviaTimelineCore.editEntry(...)` verwendet denselben Editor für nachträgliche Änderungen aus Timeline, Dashboard und den geplanten Karten oberhalb der Place-Suche.
- Restaurants, Unterkünfte, Sehenswürdigkeiten, Fotospots, Shopping und alle kommenden Place-Typen dürfen keinen eigenen Datumsdialog mehr implementieren.
- Enter muss das Formular überall genau wie ein Klick auf den primären Speichern-Button absenden.
- Die Felddefinitionen stammen ausschließlich aus den `timelineRole`-Feldern des jeweiligen Place-Type-Contracts.
- Unterkünfte erhalten deshalb Check-in und Check-out; punktuelle Places erhalten genau ihr kanonisches Point-Feld.

### Einziger Cloud-Writer und UUID-Schutz

- Planung und Änderungen schreiben ausschließlich über `LuviaPlaceCollections.saveDateFields(...)` und damit über `LuviaTripPlaceData`.
- `tripId` und `tripPlaceId` müssen vor jedem RPC-Aufruf als gültige UUID geprüft werden.
- Werte wie `undefined`, leere IDs oder Provider-IDs dürfen niemals an UUID-Parameter von Supabase übergeben werden.
- Ein unvollständiger Datensatz wird vor dem Netzwerkaufruf mit einer verständlichen UI-Meldung abgebrochen.
- Rohe Einträge aus `LuviaTripPlaceData.dateEntries(...)` gelten auch ohne zusätzliches `source`-Attribut als Place-Data-Einträge und dürfen niemals in den Legacy-Writer für `trip_schedule_events` geraten.
- Nach erfolgreichem Speichern werden Timeline, geplantes Panel und aktuelle Modulansicht ohne Reload über die zentralen Events aktualisiert.

### Insight Cards

- Die visuelle Card-Shell ist ausschließlich `LuviaPlaceUI.insightGrid(...)`.
- Ein Place-Type-Contract aktiviert typabhängige Insight Cards über `capabilities.insightCards` und beschreibt den Abschnitt unter `ui.detail.insightSection`.
- Ein aktivierter Insight-Card-Typ muss einen Renderer über `LuviaPlaceDetail.registerCapabilityRenderer(...)` registrieren.
- Conformance muss fehlende Insight-Section-Metadaten oder fehlende Renderer als Architekturverletzung melden.
- Nicht jeder Place-Typ muss dieselben Inhalte zeigen. Nur fachlich belastbare, typabhängige Informationen dürfen als Karten erscheinen.
- Restaurants, Unterkünfte und Sehenswürdigkeiten können denselben globalen Renderer künftig für eigene Intelligence-Bereiche nutzen; doppelte Fact-Chips oder erfundene Informationen sind dabei verboten.

## Build 13.10.0 / Core 4.10.0 – globaler Contract-Bootstrap und Planungsparität

Der Place-Type-Contract ist eine kritische Laufzeitabhängigkeit. Ein kurzzeitiger Fehler beim Laden von `place-type-contract.js` darf keinen Place-Typ ohne Timeline-Schema zurücklassen.

Verbindlich gilt ab diesem Build:

- `index.html` installiert vor den externen Place-Core-Dateien einen kleinen funktionalen Inline-Bootstrap unter derselben API `LuviaPlaceTypeContracts`.
- Dieser Bootstrap ist kein zweites Datenmodell und keine alternative Fachlogik. Er hält nur die zentrale Contract-Registry funktionsfähig, bis der vollständige validierende Contract-Core geladen ist.
- `place-type-definitions.js` registriert Restaurant, Unterkunft, Sehenswürdigkeit, Fotospot und Shopping sowohl gegen den Bootstrap als auch gegen den vollständigen Contract-Core.
- Auch im Bootstrap-Modus müssen alle kanonischen Timeline-Felder verfügbar sein: `planned_at`, `check_in_at`, `check_out_at` und `starts_at`.
- Der Definitions-Loader versucht nach einer Bootstrap-Registrierung weiterhin begrenzt, den vollständigen Contract-Core nachzuladen.
- Beim späteren Upgrade übernimmt `place-type-contract.js` alle bereits registrierten Contracts, validiert sie und verwirft keinen Typ.
- Nach dem Upgrade werden Registry und Diagnostics über zentrale Events auf die echte Core-Version aktualisiert.
- Der globale Planungsdialog darf bei keinem produktiven Typ den Fehler „kein Timeline-Schema registriert“ erzeugen, nur weil ein einzelner Asset-Request kurzzeitig fehlschlug.
- Restaurant darf keinen lokal hart codierten Datumsdialog mehr als Sonderweg verwenden. Auch Restaurant ruft `LuviaPlaceUIActions.openTimelineDialog(...)` auf.
- Typabhängige Validierungen, etwa die Prüfung von Restaurant-Öffnungszeiten, werden als Callback in den globalen Dialog eingebracht und rechtfertigen keinen eigenen Dialog oder Writer.
- Alle fünf produktiven Place-Typen verwenden damit denselben Contract, denselben Dialog, Enter-Bestätigung, UUID-Schutz und Cloud-Writer.
- Der Service Worker hält Contract, Definitionen, Timeline, UI Actions und Conformance weiterhin als kritische App-Shell-Dateien vor und nutzt bei Netzwerkfehlern gültige Cache-Kopien unabhängig vom Build-Query-String.

Pflichttest nach Änderungen am Bootstrap oder Planungsdialog:

```javascript
['restaurant','accommodation','attraction','photo_spot','shopping'].map(type => ({
  type,
  schema: LuviaPlaceUIActions.schema(type)
}))
```

Jeder Typ muss mindestens ein kanonisches Timeline-Feld liefern. Zusätzlich muss `node tests/place-contract-bootstrap-resilience.test.cjs` erfolgreich sein.

## Build 13.11.0 / Core 4.11.0 – Fahrradrouten und MTB-Trail-Vertrag

`cycling_route` ist der erste produktive Place-Typ, dessen kanonische Entity nicht nur einen Punkt, sondern optional eine vollständige Routengeometrie repräsentiert. Trotzdem bleibt er vollständig Teil des Universal Place Systems.

Verbindlich gilt:

- Modul-ID: `cycling_routes`
- Place-Typ: `cycling_route`
- Der Planungstermin ist `planned_at` mit `timelineRole: point`.
- Shell, Karten, Favoriten, Detailkarte, Planung, Timeline, Runtime, Commands, Cloud-Writer, Reiseisolation und Conformance werden ausschließlich global bereitgestellt.
- `LuviaCyclingRoutes` ist der Browservertrag für `cycling.search`, `cycling.details` und `cycling.health`.
- Echte Routen werden primär aus OpenStreetMap-Routenrelationen und Trail-Tags geladen. Bikeparks, Trailzentren und Startpunkte aus Google Places sind nur ein ergänzender Fallback und dürfen nicht als vollständige Route ausgegeben werden.
- `LuviaCyclingRouteIntelligence` ist der einzige fachliche Ableitungsdienst für Routentyp, Länge, Fahrzeit, Schwierigkeit, Untergrund, Routenform, Beschilderung, Höhenprofil, Rad-Empfehlung und Sicherheitscheck.
- `mtb:scale`, Untergrund, Distanz, Netzwerk und Referenz dürfen nur als sichere Werte erscheinen, wenn sie aus der Quelle oder Geometrie stammen.
- Höhenmeter, Befahrbarkeit, Sperrungen, Zugangsrechte, Trailzustand und tatsächliche Schwierigkeit dürfen niemals erfunden werden.
- Die geschätzte Fahrzeit ist als Schätzung zu kennzeichnen und ersetzt keine individuelle Leistungs- oder Sicherheitsplanung.
- Routengeometrie wird als typabhängiges Feld über den bestehenden Cloudvertrag gespeichert; eine zweite lokale Routenquelle oder eigene Favoriten-/Timeline-Tabelle ist verboten.
- Die Datenbank-Constraint `places_primary_type_check` muss `cycling_route` enthalten. Dafür ist die Migration `20260730_036_core_v4_11_0_cycling_route_place_type.sql` verbindlicher Bestandteil des Builds.
- Google-Routes-`BICYCLE` dient nur der Anfahrt beziehungsweise Wegeinformation und ersetzt nicht die OSM-basierte MTB- oder Tourenentdeckung. Der Beta-Hinweis des Providers muss sichtbar bleiben.
- Bei Ausfall eines öffentlichen Overpass-Endpunkts soll der Gateway einen zweiten Endpunkt versuchen. Die UI darf anschließend kontrolliert auf Bikeparks/Trailzentren zurückfallen, statt die gesamte Places-Shell zu beschädigen.

Produktive Contract-Typen ab diesem Build:

```text
restaurant
accommodation
attraction
photo_spot
shopping
nature
cycling_route
```

Pflichttests:

```javascript
LuviaPlaceUIActions.schema('cycling_route')
LuviaPlaceRegistry.status('cycling_route')
LuviaCyclingRoutes.diagnostics()
LuviaCyclingRouteIntelligence.diagnostics()
await LuviaPlaceConformance.runAll()
```

Zusätzlich müssen `node tests/cycling-provider-gateway.test.cjs`, `node tests/cycling-route-intelligence.test.cjs` und `node tests/cycling-route-integration.test.cjs` erfolgreich sein.
