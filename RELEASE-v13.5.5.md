# Luvia 13.5.5 — Deterministic Trip View & Timeline Recovery

## Behoben
- Ein Reisewechsel ersetzt den sichtbaren View jetzt atomar; Header, Dashboard, Ziel, Timeline und Places können nicht mehr aus unterschiedlichen Reisen stammen.
- Der Dashboard-Kalender wird beim ersten Render gebunden. Tage und „Weitere Tage anzeigen“ reagieren sofort.
- Restaurant-Details enthalten wieder die globale Aktion „Zur Timeline“ – sowohl in der sofortigen Vorschau als auch nach dem Detail-Upgrade.
- Realtime Collaboration prüft Client und Channel vor dem Abonnement und bricht bei einem ungültigen Zustand kontrolliert ab.
- Der Places-Dock setzt die Scrollposition nicht mehr eigenmächtig auf 0.

## Architektur
- Jeder gerenderte View trägt die aktive tripId.
- Same-View-Reuse ist nur erlaubt, wenn View und tripId übereinstimmen.
- Reisewechsel werden serialisiert; ältere asynchrone Wechsel dürfen einen neueren Stand nicht überschreiben.
- Vor dem sichtbaren Wechsel wird die Timeline für die Zielreise hydratisiert.
