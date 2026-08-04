# Place-Core-Inventar 13.27.5

| Ebene | Reale Implementierung | Identität/Vertrag | Entscheidung |
| --- | --- | --- | --- |
| kanonischer Place | `places` | `places.id`; Provideridentität über `provider + provider_place_id` bzw. `source + source_id` | beibehalten |
| Reise-Place | `trip_places` | `trip_places.id`, `trip_id`, `place_id` | reisespezifischen Status/Planung beibehalten |
| Registry/Contracts | `place-domain`, `place-type-contract`, `global-place-contracts`, `place-registry`, Adapter | modulunabhängige Place-Typen | beibehalten |
| Timeline | `timeline_events`, `trip_schedule_events`, `timeline-core.js` | Verknüpfung über `place_id` und Metadaten | harmonisieren |
| Besuch | `place_visits` | produktiv bekannt: `trip_id`, `place_id`, `participant_id`, Status-/Zeitfelder | **kein `trip_place_id` voraussetzen** |
| Lifecycle | `trip_places.lifecycle_status`, Resolver/Service/Hub | entdeckt → geplant → besucht → erinnert | beibehalten |
| Memory Evidence | Lifecycle Resolver, Timeline/Visit/Memory-Signale | Place-ID als Kern | später Media Evidence ergänzen |

## Foto-Place-Verknüpfung

Die spätere Media-Verknüpfung muss auf `places.id` zeigen. Ein optionaler `trip_place_id` darf nur ergänzenden reisespezifischen Kontext liefern und erst nach Live-Schemaprüfung eingeführt werden.
