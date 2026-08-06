# Deployment – Luvia 13.16.1 / Core 4.16.1

## 1. Datenbankmigration anwenden

Im lokalen Projektordner mit verknüpftem Supabase-Projekt:

```bash
supabase db push
```

Angewendet wird:

```text
supabase/migrations/20260803_037_core_v4_16_1_global_user_preference_persistence.sql
```

Die Migration ist transaktional und migrationssicher aufgebaut. Sie erweitert `public.user_profiles`, übernimmt Legacy-Werte, legt den Auth-Trigger an, zieht fehlende Profilzeilen nach und erneuert die privaten RLS-Regeln.

## 2. Edge Functions

Für Build 13.16.1 wurde keine Supabase Edge Function geändert.

```text
Kein supabase functions deploy erforderlich.
```

Insbesondere muss `luvia-gateway` für diesen Build nicht neu deployt werden. Nur bei unabhängig davon vorgenommenen Gateway-Änderungen wäre der folgende Befehl erforderlich:

```bash
supabase functions deploy luvia-gateway
```

## 3. Frontend veröffentlichen

```bash
git add .
git commit -m "fix(profile): persist global travel preferences per user"
git push
```

## 4. PWA aktualisieren

Neuer Cache:

```text
luvia-shell-v13.16.1
```

Nach erfolgreichem Deployment:

1. Alle geöffneten Luvia-Tabs schließen.
2. Eine installierte Luvia-PWA vollständig beenden.
3. `force-update.html` öffnen.
4. Luvia erneut starten und anmelden.
5. Unter Diagnose Build `13.16.1` und Core `4.16.1` kontrollieren.

## 5. Datenbankabnahme

Nach `supabase db push` mit zwei echten Testbenutzern prüfen:

```sql
select
  user_id,
  dietary_preferences,
  travel_interests,
  travel_styles,
  activity_preferences,
  entertainment_preferences,
  mobility_preferences,
  travel_pace,
  budget_preference,
  family_preferences,
  accessibility_preferences,
  preference_schema_version,
  preferences_completed_at,
  preferences_updated_at
from public.user_profiles
order by updated_at desc;
```

Erwartet wird genau eine Zeile je `auth.users.id`. Die Prüfung fremder Benutzerprofile muss mit einem RLS-Fehler beziehungsweise leerem Ergebnis enden.

## 6. Rollback-Hinweis

Die Migration löscht die Legacy-Spalte `travel_preferences` nicht. Dadurch bleibt ein kontrollierter Übergang möglich. Ein technischer Rollback des Frontends auf 13.16.0 ist grundsätzlich kompatibel, sollte aber nur nach Sicherung und gezielter Prüfung erfolgen, weil 13.16.0 die Legacy-Darstellung statt der expliziten Felder liest.
