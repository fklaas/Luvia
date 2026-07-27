# Luvia 11.7.1 · Core 3.5.1 — Restaurant Workspace

## Neu
- Altes globales Restaurant-Inhaltsmodul aus dem aktiven UI entfernt.
- Jede gespeicherte Restaurantkarte öffnet nun einen eigenen Luvia Workspace.
- Planung, Reservierung, Status, Präferenzen, Bewertung, Erinnerung und Reisebuch-Verknüpfung pro Restaurant.
- Alle Änderungen werden über den zentralen Restaurant Core in Supabase gespeichert und live mit Reisemitgliedern synchronisiert.
- Statushistorie und Aktivitätsereignisse bleiben Grundlage für Timeline, Reise-Revue und Reisebuch.
- Responsive Popup für Desktop und Mobile im aktuellen Luvia Branding.

## Datenbank
Migration `20260727_015_core_v3_5_1_restaurant_workspace.sql` ausführen.

## Backend
`luvia-gateway` neu deployen.
