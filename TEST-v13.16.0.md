# Testplan · Luvia 13.16.0

## Registrierung

1. Neues Konto starten.
2. Nach dem Namen muss die vollflächige Guided Discovery erscheinen.
3. Interessen, Ernährung, Reisestil, Aktivitäten, Tempo und Budget auswählen.
4. „Mehr entdecken“ in mindestens einer Szene öffnen.
5. Registrierung beenden und E-Mail bestätigen.
6. Nach dem Login im Profil unter **Vorlieben** prüfen, ob die Angaben vorhanden sind.

## Profil

1. Profil → Vorlieben öffnen.
2. „Vorlieben anpassen“ starten.
3. Mehrere Angaben ändern und speichern.
4. App neu laden.
5. Die geänderten Angaben müssen erhalten bleiben und in Places wieder vorausgewertet werden.

## Places Guided Discovery

1. Places über die Hauptnavigation öffnen.
2. Es darf nicht sofort die statische Kachelübersicht erscheinen.
3. Den Flow beispielsweise mit „Kulinarik entdecken“ durchlaufen.
4. Reisefarbe, Begleitverläufe, Flugzeugfortschritt und weiche Szenenwechsel prüfen.
5. „Direkt stöbern“ testen.
6. Nach der Zusammenfassung Ergebnisse anzeigen.
7. Es dürfen keine fachfremden Google-Typen eingeblendet werden.
8. Bei zu wenigen Treffern darf Luvia nicht heimlich mit anderen Kategorien auffüllen.

## Move Guided Discovery

1. Move öffnen.
2. Anreise oder Fortbewegung vor Ort wählen.
3. Eine eindeutige Kategorie, beispielsweise Fähre, auswählen.
4. Nur typgerechte Ergebnisse prüfen.
5. **Move ohne Timeline:** Weder Karte noch Detailansicht dürfen „Zur Timeline“ anbieten.
6. Merken, Details und externe Route/Anbieter prüfen.

## Mobile und Bewegung

1. Flow auf schmalem Smartphone testen.
2. Wolken müssen bequem tappbar sein; unter 410 px werden sie einspaltig.
3. Vom linken Bildschirmrand nach rechts wischen, um zurückzugehen.
4. Systemoption „Bewegung reduzieren“ aktivieren; der Flow muss ohne Parallax und lange Animationen vollständig bedienbar bleiben.

## Automatisierte Tests

```bash
for file in tests/*.test.cjs; do node "$file"; done
```

Abgedeckt sind unter anderem Guided Discovery, globale Präferenzen, strikte Suchverträge, Places/Move-Trennung, Move ohne Timeline, globale Place-Conformance und Release-Konsistenz.
