# Luvia 13.5.1 — Place UI Contract & Visual Conformance

## Ziel
Die technische Place-Conformance aus 13.5.0 wird um einen verbindlichen globalen UI-Vertrag erweitert. Restaurants, Unterkünfte und Fotospots beschreiben nur noch Inhalte, Slots und Capabilities; Geometrie, Zustände, Karten, Detailstruktur und Aktionen liegen zentral.

## Änderungen
- Globaler `LuviaPlaceUIContract` mit den Fact-Slots `rating`, `distance`, `bestTimeToVisit`, `priceLevel`, `openingState`.
- Alle drei Place-Type-Contracts enthalten denselben UI-Vertrag.
- Neuer normalisierter Provider-Feldrenderer für alle verfügbaren, fachlich nutzbaren Google-Places-New-Daten.
- Globale UI-Aktionssprache und gemeinsame Loading-, Empty-, Error- und Offline-States.
- Detailkarten zeigen Providerdetails, Empfehlung/Einschränkungen und einen verpflichtenden Alternativen-Slot.
- Teilnehmer-Matches, nächste Schritte, Abfahrt und Tagesplan bleiben technisch vorbereitet, sind aber zentral ausgeblendet.
- Globale Place-Design-Tokens und responsive Regeln.
- Visual Conformance prüft UI-Contracts, Tokens, gemeinsame Renderer, Inline-Styles und DOM-Konformität.

## Keine Backendänderungen
Keine SQL-Migration, Edge-Function oder Secrets erforderlich.
