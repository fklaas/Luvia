# Luvia Build 13.8.0 / Core 4.8.0

## Photo Spots Contract & Solar Intelligence

Build 13.8.0 ergänzt `photo_spot` als vierten produktiven Place-Typ auf Basis des globalen Place Runtime-, Command-, Shell-, UI-, Favoriten-, Timeline- und Conformance-Systems.

### Fachliche Funktionen

- Fotospots, Aussichtspunkte, Architektur- und Naturmotive entdecken
- Favoriten und „Alle entfernen“ über `LuviaPlaceCollections`
- kurze Planung über `planned_at` in der globalen Timeline
- Sonnenaufgang oder Sonnenuntergang
- bestes Lichtfenster
- Sonnen-/Blickrichtung
- gewünschtes Motiv
- Indoor oder Outdoor
- Stativempfehlung
- freier Zugang oder Eintritt

### Entscheidungslogik

Astronomische Werte werden aus Koordinaten und Reisedatum berechnet. Kategorische Werte werden aus Google-Place-Typen, Name und Beschreibung abgeleitet. Jede Empfehlung zeigt Quelle und Sicherheit. Unklare Angaben werden nicht als Tatsachen dargestellt.

### Architektur

- neuer Contract `photo_spot`
- neues Modul `photo_spots`
- neuer Service `LuviaPhotoSpotIntelligence`
- globale Shell und Karten ohne Sonderstruktur
- Runtime-/Command-/Favoriten-/Timeline-Integration
- Conformance und statischer Architekturtest um Fotospots erweitert
- Developer Console markiert `photo_spot` als ready
- Backend & Places enthält einen Fotospot-Einzeltest
