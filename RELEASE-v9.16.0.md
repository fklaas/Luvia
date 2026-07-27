# Luvia v9.16.0 — Intelligence Core v2.9.0 Destination Service

## Neu
- Zentraler `LuviaDestination` Service als öffentliche Core-API.
- Destination Registry mit stabilen IDs und deduplizierter Speicherung.
- Destination Cache mit Treffer-/Fehlertreffer-Diagnose.
- Resolver für bestehende Reise-, Ziel- und Koordinatenformate.
- Validierung für Namen, ISO-Ländercodes und Koordinaten.
- Zentraler aktiver Destination Context mit Events und Abonnements.
- Automatische, rückwärtskompatible Migration bestehender Reisen auf `destination_context` Schema V2.
- Optionaler Import aus der bestehenden Supabase-Tabelle `destinations`.
- Destination Service in Kernel Service Registry, Developer Console und Diagnosetests integriert.
- Öffentliche Intelligence API um `LuviaIntelligence.destinations` erweitert.

## Architektur
- Der bisherige `destination-context` bleibt ausschließlich als Kompatibilitäts-Fassade bestehen.
- Zielauflösung und Geschäftslogik liegen vollständig im Intelligence Core.
- Module können weiterhin `LuviaDestinationContext` verwenden und schrittweise auf `LuviaDestination` migriert werden.
- Google Places ist bewusst noch nicht enthalten und wird erst über Core V2.11 angebunden.

## Wartung
- Build-Metadaten auf 9.16.0 / Core 2.9.0 aktualisiert.
- PWA- und Service-Worker-Cache auf `luvia-shell-v9.16.0` angehoben.
- Destination-Service-Dateien in den Offline-App-Shell aufgenommen.
