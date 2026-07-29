# Luvia 13.5.3 – Deterministic Cloud Boot Contract

## Ziel

Der App-Start wird nicht mehr von mehreren unabhängigen Initialisierungen erzeugt. Ein zentraler Boot Coordinator lädt genau einen autoritativen Cloud-Snapshot, bevor die Oberfläche freigegeben und Realtime aktiviert wird.

## Änderungen

- neues `LuviaBootCoordinator`-Core-Modul
- ausschließlich der Luvia-Startscreen ist während des Bootvorgangs sichtbar
- Mindestanzeigezeit des Intros: 2,6 Sekunden
- weicher gemeinsamer Fade von Intro zu vollständig vorbereitetem App-Zustand
- `app-gateway.js` führt keine zweite Auth-, Trip-, Realtime- oder Scroll-Initialisierung mehr aus
- Profil und Reisen werden einmalig aus der Cloud geladen
- `profile.activeTripId` ist die einzige autoritative Quelle für die zuletzt aktive Reise
- ist die Cloud-Auswahl ungültig, wird genau eine Reise gewählt und unmittelbar in das Cloud-Profil zurückgeschrieben
- lokaler `activeTripId` darf beim autoritativen Start keine Cloud-Auswahl überschreiben
- Timeline und Place-Daten werden vor dem ersten Dashboard-Render hydriert
- Realtime startet erst nach dem ersten vollständigen UI-Render
- Store- und Profil-Subscriptions sind während des Bootvorgangs renderstumm
- sämtliche erzwungenen Scroll-Restores bei `visibilitychange`, `pagehide` und `pageshow` wurden entfernt
- der Browser behält die Scrollposition beim Tabwechsel nativ bei

## Architekturregel

```text
Splash
→ Auth
→ Cloud-Profil + Cloud-Reisen
→ eindeutige aktive Reise
→ Timeline + Place-Snapshot
→ UI-Render
→ Splash-Fade-out
→ Realtime
```

Kein Modul darf während des Bootvorgangs selbstständig die App rendern, die aktive Reise bestimmen oder Realtime starten.
