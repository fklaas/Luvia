# Luvia 10.0.0 · Core 2.13.0

## Architecture Separation

Diese Version trennt den neuen produktiven Luvia-Core erstmals technisch von der gewachsenen Paris-Laufzeit.

### Neu
- zentraler Runtime-Zustandsautomat: `booting`, `signed-out`, `no-trips`, `trip-selection`, `ready`, `failed`
- zentraler Trip Store unter `core/trips/trip-store.js`
- kanonische Luvia-Speicherschlüssel unter `luvia.*`
- einheitliches Destination-Modell mit Name, Land, Place-ID und Koordinaten
- einmalige Migration aus den bisherigen Paris-Speicherschlüsseln
- isolierter Cloud-Adapter unter `legacy/paris/`
- stabiler Empty State ohne aktive oder vorhandene Reise
- keine Cloud-/Modulinitialisierung mehr ohne aktive Reise
- 13 unreferenzierte nummerierte Asset-Duplikate entfernt

### Kompatibilität
Bestehende Module werden vorübergehend über eine kontrollierte Legacy-Brücke gespiegelt. Neue Core-Dateien rufen keine `paris_*`-RPCs und keine alten `paris*`-Speicherschlüssel direkt auf.

### Noch zu migrieren
Profil/Reiseverwaltung, Supabase-Synchronisation, People/Presence sowie einzelne Module verwenden intern weiterhin alte Schnittstellen. Diese Komponenten sind funktionsfähig, gelten aber als Legacy-abhängig und werden in den nächsten Migrationssprints einzeln umgestellt.
