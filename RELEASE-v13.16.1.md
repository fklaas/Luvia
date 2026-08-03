# Luvia 13.16.1 / Core 4.16.1

## Global User Preference Persistence

Build 13.16.1 macht die globalen Reisevorlieben zu echten privaten Cloud-Daten pro Supabase-Benutzer. `public.user_profiles` bleibt die einzige Profilzeile und die einzige dauerhafte Source of Truth. Auth-Metadaten und Local Storage dienen nur noch der Registrierungsmigration beziehungsweise als Cache.

## Datenbank

Neue Migration:

```text
supabase/migrations/20260803_037_core_v4_16_1_global_user_preference_persistence.sql
```

Die bestehende Tabelle `public.user_profiles` wird migrationssicher um explizite Felder erweitert:

- `dietary_preferences text[]`
- `travel_interests text[]`
- `travel_styles text[]`
- `activity_preferences text[]`
- `entertainment_preferences text[]`
- `dining_preferences text[]`
- `mobility_preferences text[]`
- `atmosphere_preferences text[]`
- `travel_pace text`
- `budget_preference text`
- `family_preferences jsonb`
- `accessibility_preferences jsonb`
- `preference_schema_version integer`
- `preferences_completed_at timestamptz`
- `preferences_updated_at timestamptz`

Bestehende Werte aus `dietary_preferences`, `travel_preferences` und vorhandenen Registrierungsmetadaten werden ohne destruktives Löschen übernommen. Das alte `travel_preferences`-JSON bleibt während der Kompatibilitätsphase bestehen, wird aber aus den expliziten Feldern erzeugt und ist nicht mehr führend.

Ein Auth-Trigger legt für neue Benutzer automatisch genau eine Profilzeile an. Bestehende Auth-Benutzer ohne Profilzeile werden nachgezogen. RLS erlaubt ausschließlich Lesen, Anlegen und Ändern des eigenen Profils über `auth.uid() = user_id`; die frühere Delete-Policy wird entfernt.

## Zentraler Preference Core

Neu ist `window.LuviaUserPreferences` in:

```text
core/preferences/user-preferences-service.js
```

Der Service übernimmt zentral:

- Cloud-Laden über `LuviaProfileService`
- Schema-Normalisierung und Legacy-Kompatibilität
- Cloud-Updates über `luvia_upsert_my_profile_v2`
- Cache- und Fehlerzustand
- Rollback bei fehlgeschlagener Cloud-Speicherung
- Events und Subscriptions
- Kategorieänderungen
- Onboarding-Abschluss
- gemeinsamen Discovery Context für Places und Move

Die bestehende `LuviaTravelPreferences`-API bleibt als kompatible, lesende Fassade erhalten und bezieht ihre Daten aus demselben Core.

## Registrierung und Profil

Das Registrierungs-Onboarding umfasst jetzt Ernährung, Interessen, Reisestile, Aktivitäten, Unterhaltung, Mobilität, Reisetempo, Budget, Familienbedürfnisse und Barrierefreiheit. Die Auswahl wird beim Supabase-Sign-up als registrierungsgebundener Migrationsinput übergeben; der Datenbank-Trigger schreibt sie transaktional in `public.user_profiles`.

Im Profil verwendet „Vorlieben“ denselben Guided Flow. Der Abschluss gilt erst nach erfolgreichem Supabase-RPC als gespeichert. Bei einem Fehler bleibt der Flow geöffnet, zeigt den Cloud-Fehler an und stellt den vorherigen Zustand wieder her.

## Places und Move

Places und Move lesen die globalen Werte aus `LuviaUserPreferences`. Bekannte Profilangaben werden im Guided Flow sichtbar erwähnt und für den jeweiligen Discovery Contract berücksichtigt. Eine abweichende aktuelle Suchentscheidung bleibt eine Suchüberschreibung und verändert das globale Profil nicht.

Move bleibt ausdrücklich ohne Timeline:

- kein `planned_at`
- keine Planning-Capability
- keine Aktion „Zur Timeline“
- keine Move-Einträge in der globalen Timeline

Die strikte Typvalidierung und das Verbot fachfremder Fallbacks bleiben unverändert aktiv.

## Guided Discovery

Ergänzt wurden:

- geräte-/reisebezogene Wiederaufnahme eines unbeabsichtigt geschlossenen Flows über `sessionStorage`
- klare Cloud-Speicherzustände
- sichtbarer Fehler statt vorgetäuschtem Abschluss
- Profilhinweise für Places und Move
- neue Szenen für Unterhaltung, Mobilität, Familie und Barrierefreiheit
- weiterhin Reisefarbverläufe, Begleittöne, Parallax, Flugzeug-Fortschritt, Zurücknavigation und Reduced Motion

## Versionen

```text
App:       13.16.1
Core:      4.16.1
PWA-Cache: luvia-shell-v13.16.1
Schema:    3
```

## Commit

```text
fix(profile): persist global travel preferences per user
```
