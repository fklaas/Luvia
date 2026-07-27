# Luvia 11.2.0 · Core 3.0.2 — Core Health & Destination

- PWA-Cache und Manifest auf Build 11.2.0 vereinheitlicht.
- PWA wird auch im produktiven App-Boot registriert.
- Developer-Service auf 1.1.0 aktualisiert; PWA-Abhängigkeit kann sauber bereit werden.
- Destination Service liest zuerst den kanonischen `LuviaTripStore`.
- Strukturierte Google-Places-Daten aus dem Onboarding bleiben beim Remote-Reconcile erhalten.
- Destination wird in Trip Store, Legacy-Spiegel und Places-Kontext synchronisiert.
- Backend-Konsole initialisiert Auth über denselben Supabase-Client wie die App.
- ThemeService erzeugt die App-Akzentpalette aus der aktiven Reisefarbe.
- Service Worker und App-Shell auf 11.2.0 aktualisiert.
