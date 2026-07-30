# Luvia Build 13.10.0 / Core 4.10.0

## Nature & Excursion Intelligence

Der sechste produktive Place-Typ **Natur & Ausflüge** wurde contract-driven auf dem globalen Places Core umgesetzt.

### Enthalten
- neuer Place-Type-Contract `nature`
- neue Places-Hub-Kachel und standardmäßig aktiviertes Modul
- Kategorien für Parks & Gärten, Wandern, Aussicht, Seen & Flüsse, Strände, Naturreservate sowie Picknick & Ruhe
- globale Suche, Karten, Favoriten, Detailkarte, Alternativen, Timeline, Cloud-Persistenz und Reiseisolation
- neuer Dienst `LuviaNatureIntelligence`
- Insight Cards für Naturtyp, Erlebnis, Ausflugscharakter, beste Besuchszeit, Zeitbedarf, Aufwand, Wetterabhängigkeit, Familien-/Wegehinweis, Zugang und Landschaft
- zentrale Speicherung typabhängiger Felder in `trip_place_data`
- Nature Adapter, Developer-Backend-Test, Diagnostics und Conformance für nun sechs produktive Place-Typen

### Architektur
Es existieren keine lokalen Favoriten-, Karten-, Timeline- oder Cloud-Writer im Naturmodul. Das Modul ergänzt ausschließlich seinen Contract, Suchbegriffe, fachliche Intelligence und den Capability-Renderer.

### Bekannte Grenzen
Wetter, Wegzustand, Höhenprofil, saisonale Sperrungen, Eintritt und tatsächliche Zugänglichkeit werden nicht als sicher behauptet. Hinweise sind nachvollziehbare Ableitungen aus Place-Typ, Name, Beschreibung und vorhandenen Providerangaben und müssen vor Ort geprüft werden.

### Datenbank
Keine neue SQL-Migration erforderlich. `nature` ist im kanonischen Place-Schema bereits vorgesehen; Extension-Felder werden über die bestehende generische Place-Pipeline gespeichert.
