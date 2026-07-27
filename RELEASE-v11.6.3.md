# Luvia 11.6.3 · Core 3.4.3

## Live Bootstrap Stability

Dieser Hotfix behebt das Blockieren der Anwendung auf dem Startbildschirm „Luvia wird vorbereitet …“ nach Build 11.6.2.

### Ursache
Dashboard-Widgets haben während ihres Renderings erneut `watchTrip()` gestartet. Gleichzeitig löste jede Collaboration-Statusänderung ein vollständiges Dashboard-Rendering aus. Während des initialen Starts konnten dadurch mehrere überlappende Realtime-Initialisierungen und eine Render-/Microtask-Kette entstehen, die den Browser-Hauptthread blockierte.

### Korrekturen
- Collaboration-Lifecycle vollständig aus den Dashboard-Renderfunktionen entfernt.
- `watchTrip()` gegen parallele und veraltete Initialisierungen abgesichert.
- Realtime-Kanäle werden beim Reisewechsel kontrolliert ersetzt.
- Trip-Store startet den Collaboration-Watcher nur noch, wenn sich die aktive Reise tatsächlich geändert hat.
- Dashboard-Updates aus Collaboration-Ereignissen werden per `requestAnimationFrame` zusammengeführt.
- Cache-, PWA-, App- und Core-Version auf 11.6.3 / 3.4.3 erhöht.

### Datenbank
Keine neue Migration erforderlich. Die Migration aus Core 3.4.2 bleibt gültig.
