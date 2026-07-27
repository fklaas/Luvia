LUVIA 4 – GETRENNTE REISEARCHITEKTUR

- index.html: schlanker Router
- paris-official.html: geschützte vollständige Paris-Reise aus der gelieferten Altdatei
- trip.html: modulare Reiseansicht
- route-switcher.js: öffnet anhand templateId/isParisOfficial die richtige Seite
- modules/*.html: eigenständige Modulfragmente

Die Paris-Seite wird nicht vom Modulmanager gefiltert. Modulare Reisen starten mit selectedModules = [].
Die offizielle Paris-Reise kann in Meine Reisen weder modular bearbeitet noch endgültig gelöscht werden.
