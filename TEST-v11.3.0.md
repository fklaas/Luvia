# Regressionstest Luvia 11.3.0

## Profil
- Profil-Hub vom Dashboard öffnen
- Anzeigename, Heimatort, Avatarfarbe und Präferenzen speichern
- Inkognito mit demselben Konto anmelden und Cloud-Werte prüfen
- Profilvollständigkeit und Sync-Status kontrollieren

## Reisen
- Reise wechseln und App neu laden
- auf zweitem Gerät dieselbe aktive Reise prüfen
- neue Reise aus Profil-Hub starten
- Reise archivieren und wiederherstellen
- Reise bearbeiten und speichern

## Theme
- Hell, Dunkel und System testen
- Systemmodus bei Betriebssystemwechsel prüfen
- reduzierte Animationen und kompakte Darstellung testen
- Desktop, Tablet und Smartphone prüfen

## Architektur
- Browserkonsole: keine Warnung zu mehreren GoTrueClient-Instanzen
- `LuviaSupabaseService.diagnostics()` liefert `instances: 1`
- Dashboard Widgets werden über `LuviaDashboardWidgets.list()` geliefert
- Restaurants öffnen, Dashboard wechseln und Profil öffnen
- keine Regression bei Auth, Trips, Destination oder Places
