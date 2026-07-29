# Luvia Build 13.3.3.1 – Universal Place Detail & Intelligence Contract

## Änderungen
- Neue zentrale `LuviaPlaceDetail`-Hülle für genau ein Place-Overlay.
- Unterkunftsdetail bleibt stabil geöffnet; Aufenthalts- und Buchungsfelder verschwinden nicht mehr.
- Gesamte Unterkunftskarte ist klickbar, ausgenommen eigenständige Aktionsbuttons.
- Unterkunftsvorschauen verwenden die universelle Intelligence-Fassade und zeigen nur belegte Smart-Informationen.
- Unterkunfts-Intelligence berücksichtigt Bewertung, Entfernung, Providermerkmale und gespeicherten Aufenthalt.
- Restaurant-Kompatibilität bleibt unverändert.

## Grenzen
Live-Routen, Google-Fotos und Cloud-Persistenz müssen nach Deployment produktiv geprüft werden.
