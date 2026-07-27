# Luvia 11.6.1 · Core 3.4.1

## Join & Dashboard Repair

Dieser Reparaturrelease korrigiert die beim Praxistest von 11.6.0 festgestellten Fehler.

### Behoben
- Reisebeitritt unterstützt nun unterschiedliche bestehende `trip_members`-Schemas.
- Die Join-RPC setzt nicht mehr zwingend eine Spalte `role` voraus.
- Unterstützt werden `role` oder `member_role`, `display_name`, `member_name` oder `name` sowie `joined_at` oder `created_at`.
- Das Dashboard verwendet deterministische Spalten statt einer in einzelnen Browsern fehlerhaften intrinsischen Grid-Berechnung.
- Keine extrem schmalen Karten und keine buchstabenweisen Umbrüche mehr.
- Mobile: eine Spalte; Standard-Desktop: zwei; breite Desktops: drei; Ultrawide: vier.

### Neu
- Eigener Profilbereich **Dashboard**.
- Dashboard-Karten können persönlich aktiviert und deaktiviert werden.
- Reihenfolge kann mit Auf-/Ab-Aktionen geändert werden.
- Konfiguration wird im Profil gespeichert und geräteübergreifend synchronisiert.
- Schnellzugriff „Dashboard anpassen“ im Profil-Hub und im persönlichen Dashboard-Widget.

### Hinweis zur Console
Der Screenshotfehler `No Listener: tabs:outgoing.message.ready` stammt aus einem Browser-Extension-Content-Script (`content.js`/`vendor.js`) und nicht aus dem Luvia-Bundle. Die aktiven Luvia-JavaScript-Dateien bleiben syntaktisch fehlerfrei.
