# Luvia Build 13.9.0 / Core 4.9.0

## Shopping & Travel Retail Intelligence

Build 13.9.0 ergänzt `shopping` als fünften produktiven Place-Typ. Shopping wurde nicht als separates Teilsystem gebaut, sondern ausschließlich als neuer Place-Type-Contract mit fachlicher Intelligence auf der bestehenden globalen Places-Architektur.

## Neuer Places-Bereich

Im Places-Hub steht nun zusätzlich:

- 🛍️ Shopping

Der Bereich ist für bestehende und neue Reisen standardmäßig verfügbar. Enthaltene Discovery-Kategorien:

- Entdecken
- Einkaufszentren
- Märkte
- Mode
- Souvenirs
- Feinkost
- Luxus & Design
- Outlet

Shopping verwendet unverändert die globalen Bausteine für Discovery, Karten, Favoriten, Detailkarte, Alternativen, Timeline, Reiseakzentfarbe, Dark Mode, Runtime, Commands, Cloud und Conformance.

## Shopping Intelligence

Der neue zentrale Dienst `LuviaShoppingIntelligence` leitet nachvollziehbare Hinweise aus Google-Place-Daten ab:

- Einkaufsformat
- Sortiment beziehungsweise Einkaufszweck
- Einkaufserlebnis
- Indoor oder Outdoor
- Preisgefühl
- lokaler Charakter
- beste Besuchszeit
- Reiseeignung

Die Detailkarte zeigt diese Werte über den globalen Renderer `LuviaPlaceUI.insightGrid(...)` im Abschnitt **„Sortiment, Erlebnis und Reiseeignung“**. Quelle und Sicherheit der Ableitung bleiben sichtbar.

Luvia erfindet keine konkreten Produkte, Bestände, Preise oder Marktstände. Fehlende beziehungsweise wechselnde Informationen werden ausdrücklich als unsicher oder vor Ort zu prüfen gekennzeichnet.

## Suche und Provider-Mapping

Shopping-Suchen verwenden das aktive kanonische Reiseziel. Die produktive Suche wird bewusst nicht generell auf `shopping_mall` beschränkt. Dadurch können neben Einkaufszentren auch Märkte, Markthallen, Kaufhäuser, Boutiquen, Concept Stores, Souvenirshops, Feinkostläden und Outlets gefunden werden.

Der Backend & Places Explorer enthält einen eigenen Shopping-Test über dieselbe Destination- und Gateway-Pipeline wie die übrigen Place-Typen.

## Favoriten, Timeline und Detailkarte

- Shopping-Favoriten verwenden `LuviaPlaceCollections` und `LuviaPlaceCommands`.
- Vorschlags- und Favoritenkarten verwenden dieselbe globale `LuviaPlaceUI.card`-Schablone.
- Ein Shopping-Ort wird mit `planned_at` über den globalen Timeline-Dialog geplant.
- Geplante Shopping-Orte erscheinen im Shopping-Modul, Dashboard-Kalender, Tagesablauf und globalen Timeline Core.
- Timeline und Dashboard öffnen dieselbe vollständige Shopping-Detailkarte wie das Shopping-Modul.
- Alternativen öffnen ohne Seitenreload direkt ihre eigene globale Detailkarte.

## Universelle Cloud-Persistenz

Der vorhandene `place.import`-Pfad wurde zentral vervollständigt: Nicht leere typabhängige Extension-Felder werden für nicht restaurant-spezifische Place-Typen über die bereits vorhandene RPC `luvia_upsert_trip_place_fields(...)` in `trip_place_data` gespeichert.

Damit bleiben die Shopping-Einordnung und künftige typabhängige JSON-Felder nach Reload und Reisewechsel cloudseitig verfügbar, ohne eine Shopping-Sondertabelle oder parallele lokale Datenquelle anzulegen.

Es ist keine neue SQL-Migration erforderlich, weil Tabelle, RLS und universelle RPC bereits Bestandteil des bestehenden Core sind.

## Plattform, Diagnose und Versionierung

- Shopping Adapter steht produktiv auf `ready`.
- Developer Console und Core Diagnostics prüfen nun fünf produktive Place-Typen.
- Backend & Places Explorer kann Shopping separat testen und verwendet beim Import die aktuelle öffentliche Place-Entity-API.
- Conformance prüft Restaurants, Unterkünfte, Sehenswürdigkeiten, Fotospots und Shopping nach denselben Regeln.
- Build-, Core-, Runtime-, PWA- und Gateway-Version wurden auf 13.9.0 / 4.9.0 angehoben.

## Bekannte Grenzen

- Es gibt noch keinen Live-Warenbestand, Preisvergleich oder Checkout.
- Öffnungszeiten, Sortiment, Preise und Marktstände können sich kurzfristig ändern.
- Nutzer- und teilnehmerspezifische Shopping-Präferenzen werden erst in einem späteren Intelligence-Ausbau stärker gewichtet.
- Ein produktiver Remote-Test gegen Google Places und Supabase ist erst nach Deployment im verbundenen Projekt möglich.
