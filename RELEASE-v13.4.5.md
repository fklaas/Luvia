# Luvia 13.4.5 – Authoritative Place Planning & Stable App Lifecycle

Core 4.4.5 · Build 13.4.5

## Änderungen

- Restaurant-Planeinträge werden jetzt wie Unterkunftsdaten ausschließlich nach bestätigter Cloud-Löschung aus der Oberfläche entfernt.
- `LuviaTimelineCore.removeEntry()` und `clearEntries()` bilden den globalen Löschvertrag für alle Place-Typen.
- Timeline-Hydration besitzt einen eindeutigen `hydrated`-Status und der Service-Test prüft den tatsächlichen Snapshot statt fälschlich ein Array zu erwarten.
- Der App-Shell-Lifecycle remountet Ansichten nicht mehr bei Fokuswechsel, `visibilitychange`, Auth-Refresh oder unveränderten Profil-/Trip-Ereignissen.
- Das Fade-In wird nur noch bei einem echten Ansichtswechsel angezeigt.
- Der Übergang für den globalen Place-Bereich heißt verbindlich `Places`.
- Dashboard und Places verwenden dieselbe Intro-Höhe.
- Gateway-Origin-Normalisierung wurde für produktive Origins gehärtet.

## Architektur

Planeinträge werden nicht mehr zuerst lokal entfernt. Der Ablauf lautet jetzt:

Cloud-Delete → Cloud-Hydration → Timeline-Snapshot → Realtime/In-Window-Event → Place-Shell neu rendern.

Damit gilt derselbe Vertrag für Restaurants, Unterkünfte und künftige Place-Typen.

## Bekannte Grenzen

- Der produktive Supabase- und CORS-Test ist nach Deployment der Edge Function erforderlich.
- Es wurde keine neue Datenbankmigration benötigt.
