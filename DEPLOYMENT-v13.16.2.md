# Deployment – Luvia 13.16.2 / Core 4.16.2

## 1. Datenbank

Für Build 13.16.2 gilt: **Keine neue Datenbankmigration**.

Die Preference-Migration aus Build 13.16.1 muss bereits angewendet sein:

```text
supabase/migrations/20260803_037_core_v4_16_1_global_user_preference_persistence.sql
```

Nur falls sie im Zielprojekt noch fehlt:

```bash
supabase db push
```

## 2. Supabase Edge Functions

Es wurde keine Datei unter `supabase/functions/luvia-gateway` geändert.

```text
Kein supabase functions deploy erforderlich.
```

Insbesondere ist für diesen reinen Frontend-/Core-UX-Build kein erneutes Deployment von `luvia-gateway` notwendig.

## 3. Frontend veröffentlichen

```bash
git add .
git commit -m "feat(discovery): turn Places and Move into guided travel canvases"
git push
```

## 4. PWA aktualisieren

Neuer Cache:

```text
luvia-shell-v13.16.2
```

Danach:

1. Alle geöffneten Luvia-Tabs schließen.
2. Die installierte PWA vollständig beenden.
3. `force-update.html` öffnen.
4. Luvia erneut starten.
5. In der Diagnose Build `13.16.2` und Core `4.16.2` kontrollieren.

## 5. Direkte Abnahme

### Places

1. Places öffnen und Guided Discovery abschließen.
2. Bei „Welche Stimmung soll diesmal dazu passen?“ mehrere Wolken wählen.
3. Prüfen, dass die Auswahl sofort sichtbar bleibt und „Auswahl übernehmen“ funktioniert.
4. In den Ergebnissen prüfen, dass keine Suchleiste, Quick-Filter, Verfeinerung, geplanten Einträge oder Sammlung erscheinen.
5. Prüfen, dass nur am Ende „Gesamten Bereich öffnen“ angeboten wird.

### Move

1. Move öffnen und bis „Was ist euch für diese Verbindung besonders wichtig?“ gehen.
2. Mehrere Prioritäten wählen und fortfahren.
3. Prüfen, dass nur persönliche Move-Vorschläge sichtbar sind.
4. Sicherstellen, dass keine Timeline- oder Planungsaktion vorhanden ist.
5. Den vollständigen Bereich nur über das Katalog-Gate öffnen.

### Profil

1. Profil → Vorlieben öffnen.
2. Die Darstellung „Globales Reiseprofil + aktueller Reisemoment“ prüfen.
3. „Reisekompass anpassen“ öffnen.
4. Sicherstellen, dass der Guided Flow oberhalb des Profils liegt.
5. Speichern und prüfen, dass das Profilfenster anschließend korrekt wieder sichtbar ist.
