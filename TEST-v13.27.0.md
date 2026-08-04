# Abnahmetest – Luvia 13.27.0

## Meine Orte

1. Planen öffnen.
2. „Meine Orte“ öffnen.
3. Die Filter Entdeckt, Geplant, Besucht und Erinnert prüfen.

## Geplant

Einen Place über Places zur Timeline hinzufügen. Er muss anschließend unter „Geplant“ erscheinen.

## Besucht

Bei einem entdeckten oder geplanten Ort „Als besucht markieren“ wählen. Der Ort muss unter „Besucht“ erscheinen und ein Timeline-Ereignis erzeugen.

## GPS

GPS-Besuchserkennung aktivieren. Die Browserabfrage muss erscheinen. Der Status muss anschließend als aktiv angezeigt werden.

## Erinnert

„Erinnerung verknüpfen“ wählen und einen kurzen Text speichern. Der Ort muss unter „Erinnert“ erscheinen. Kommende Foto- und Albummodule verwenden dafür dieselbe Service-API.

## Diagnose

```javascript
LuviaPlaceLifecycleService.diagnostics()
LuviaPlaceLifecycleHub.diagnostics()
```
