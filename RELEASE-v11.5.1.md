# Luvia 11.5.1 · Core 3.3.1

## Stability Baseline I

Dieser Release beginnt die verbindliche Priorität-1-Stabilisierungsphase vor Connected Travel.

### Behoben und verbessert

- Dashboard-Grid für Mobile, Tablet, Desktop und Ultrawide neu abgesichert.
- Karten besitzen nun belastbare Mindestbreiten, saubere Umbrüche und keine überlappenden Inhalte.
- Tablet- und Mobile-Aktionsbereiche brechen kontrolliert in zwei beziehungsweise eine Spalte um.
- Reiseeditor und Modulfenster erhalten zusätzliche Tablet- und Mobile-Regeln.
- Dialogaufrufe für „Reise bearbeiten“ und „Personen einladen“ werden vor dem Öffnen geprüft.
- Fehlende oder fehlerhafte Dialoge erzeugen keine unbehandelten Promise-Fehler mehr.
- `LuviaUI.has()` und zentrale Dialog-Fehlerprotokollierung ergänzt.

### Technischer Hinweis

Die nicht eingebundenen Dateien `ui.js` und `config.js` sind tatsächlich Audiodateien mit falscher Dateiendung. Sie wurden in diesem Release nicht entfernt, da zunächst geprüft werden muss, ob sie historisch als Medienreferenzen benötigt werden. Aktive App-Seiten laden sie nicht.

### Nächster Stabilitätsschritt

Einladungs-/Join-Flow, Hidden Onboarding, gemeinsame Join-Logik und Teilnehmer-Realtime vollständig konsolidieren.
