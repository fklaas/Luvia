# Luvia 13.6.0 – Attractions & Activities

## Neuer globaler Place-Typ

Build 13.6.0 ergänzt Sehenswürdigkeiten und Aktivitäten als ersten neuen Place-Typ auf Basis der stabilisierten globalen Places-Architektur.

Der Typ `attraction` verwendet dieselben zentralen Bausteine wie Restaurants und Unterkünfte:

- Place Type Contract
- Place Entity Service
- Trip Places
- Trip Place Data
- globale Karten und Favoritensammlungen
- universelle Place-Detailkarte
- Timeline Core
- Place Intelligence
- Provider Field Renderer
- Places Shell und Visual Conformance

## Discovery

Enthalten sind Kategorien für Sehenswürdigkeiten, Museen, Freizeitaktivitäten, Parks und Gärten, Aussichtspunkte, familienfreundliche Orte sowie Indoor- und Outdoor-Aktivitäten.

Die Suche ist zielbezogen, zeigt zunächst sechs Ergebnisse und verwendet die globalen Place-Karten mit eager geladenen Medien.

## Planung

Aktivitäten können mit Beginn, Ende, Dauer, Ticketstatus, Buchungsnummer, Treffpunkt und Notizen in die Reise übernommen werden. Fehlt ein Endzeitpunkt, wird er aus Beginn und Dauer berechnet.

Die Zeitdaten werden ausschließlich in `trip_place_data` gespeichert und vom globalen Timeline Core konsumiert.

## UI

Favoriten- und Discovery-Karten verwenden denselben globalen Renderer. Die Detailkarte enthält sofort den Block „Besuch & Tickets“ und lädt Providerdetails, Galerie und Alternativen über den universellen Detailservice nach.

## Architektur

Der neue Typ wird über den Module Registry Core, die Places Shell und den Place Type Contract registriert. Er besitzt keinen eigenen Favoritenspeicher, keine eigene Timeline und kein separates Overlay-System.
