# Luvia 11.1.0 · Core App Integration

- Neue minimale produktive `index.html` ohne alte Paris-Oberfläche.
- Vorhandener Core, Service Registry, Event Bus, Backend Gateway und Diagnoseseiten bleiben erhalten.
- Direkter Supabase-Service ersetzt `ParisCloud.connect()` im produktiven Boot.
- Auth, Reisen und aktive Reise werden vollständig aufgelöst, bevor eine Ansicht gerendert wird.
- Genau eine App-Shell mit Dashboard und horizontalem Modul-Dock.
- Restaurants ist das einzige produktiv registrierte Fachmodul.
- Alte `index.html` liegt nur noch als Referenz unter `legacy/ui/index-v11.0.0.html` und wird nicht geladen.
