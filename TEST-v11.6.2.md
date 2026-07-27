# Regressionstest · Luvia 11.6.2 / Core 3.4.2

## Voraussetzung
- Migration `20260727_013_core_v3_4_2_live_collaboration.sql` ist in Supabase aktiv.
- Zwei unterschiedliche Luvia-Konten sind Mitglied derselben Reise.
- Die App ist auf zwei Geräten oder in zwei getrennten Browserprofilen geöffnet.

## Live Presence
1. Auf beiden Geräten dieselbe Reise öffnen.
2. Im Widget **Gemeinsam live** müssen beide Personen erscheinen.
3. Beide geöffneten Geräte müssen innerhalb weniger Sekunden als **Gerade aktiv** angezeigt werden.
4. Eine App in den Hintergrund legen.
5. Der Status wechselt zunächst auf **Vor Kurzem aktiv** und später auf **Zuletzt aktiv**.
6. App wieder öffnen. Der Status muss ohne Neuladen wieder live werden.

## Activity Feed
1. Eine Reise auf Gerät A bearbeiten und speichern.
2. Auf Gerät B muss im Widget **Letzte Aktivität** ohne Neuladen „Reise wurde bearbeitet“ erscheinen.
3. Auf Gerät A ein Restaurant speichern oder die Restaurantplanung ändern.
4. Auf Gerät B muss die Restaurantaktivität live erscheinen.
5. Ein neues Konto per Einladung beitreten lassen.
6. Auf allen geöffneten Geräten muss der Beitritt im Feed erscheinen.

## Dashboard und Realtime
1. Dashboard auf beiden Geräten gleichzeitig geöffnet lassen.
2. Prüfen, dass keine manuelle Aktualisierung notwendig ist.
3. Dashboard-Konfiguration im Profil ändern.
4. Prüfen, dass Activity- und Presence-Widget weiterhin korrekt gerendert werden.

## Offline-Fallback
1. Netzwerk kurz deaktivieren.
2. App darf nicht abstürzen; vorhandene Reise bleibt sichtbar.
3. Netzwerk wieder aktivieren.
4. Presence und Activity Feed müssen sich automatisch aktualisieren.

## Sicherheit
1. Ein Konto öffnen, das nicht Mitglied der Reise ist.
2. Direkte RPC-Abfragen für fremde Trip-IDs dürfen keine Aktivitäts- oder Presence-Daten liefern.
