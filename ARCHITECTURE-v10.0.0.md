# Architekturbericht · Luvia 10.0.0

## Produktiver Core
- `core/storage/storage.js` – kanonischer Speicherzugriff
- `core/trips/trip-store.js` – einzige aktive Trip-Auswahl und Trip-Liste
- `core/runtime/runtime.js` – zentraler App-Zustand und Boot-Ablauf
- `luvia-trip-context.js` – lesender Kontextadapter für Module
- `luvia-app-state.js` – UI-Snapshot des Runtime-Zustands
- `luvia-entry.js` – Reiseauswahl und Empty State

## Legacy-isoliert
- `legacy/paris/cloud-adapter.js` – bestehende Supabase-RPCs
- `core/legacy/paris-migrator.js` – einmaliger Import und Übergangsspiegel

## Noch zu migrieren
- `profile-center.js`
- `supabase-sync.js`
- `people-system.js`
- `sync/*`
- ältere Root-Module wie `budget.js`, `gallery.js`, `reminders.js`, `live-moments.js`

## Architekturregeln ab Core 2.13
1. Neuer produktiver Code liest keine `parisIdentityV1`- oder `parisTripRegistryV1`-Schlüssel direkt.
2. Neuer produktiver Code ruft keine `paris_*`-RPCs direkt auf.
3. Module starten nur bei Runtime-Phase `ready`.
4. `activeTrip.destination` ist die einzige Destination-Quelle.
5. Fehlende Reisen sind ein gültiger Zustand und kein Fehler.
6. Legacy-Zugriffe müssen in `legacy/paris` oder `core/legacy` gekapselt sein.
