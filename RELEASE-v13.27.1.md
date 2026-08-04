# Luvia 13.27.1 – Places Lifecycle Realtime

## Behoben

- Freie Eingaben mit mehreren Wünschen werden auch bei Kommas sowie passenden „und“-Verbindungen in getrennte, sequenzielle Ziele zerlegt.
- „Als entdeckt merken“ gilt als Auswahl und führt anschließend mit dem nächsten erkannten Wunsch weiter.
- Timeline-Planungen senden den Lifecycle-Status `planned` samt Place-Schlüsseln direkt an die zentrale Lifecycle-Ansicht.
- „Meine Orte“ reagiert optimistisch und in Echtzeit auf geplant, besucht und erinnert.
- Zusätzlich erfolgt ein leiser Cloud-Refresh, damit die Oberfläche mit der autoritativen Datenquelle synchron bleibt.

Keine Datenbankmigration und kein Edge-Function-Deployment erforderlich.
