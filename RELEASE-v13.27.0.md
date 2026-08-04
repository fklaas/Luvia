# Luvia 13.27.0 – Places Lifecycle

## Ziel

Places besitzt ab diesem Build genau vier sichtbare Lebenszykluszustände:

1. Entdeckt
2. Geplant
3. Besucht
4. Erinnert

Die Timeline bleibt die fachliche Quelle für geplante Besuche. GPS- und manuelle Besuche verwenden die bestehende `place_visits`-Architektur. Der Zustand „Erinnert“ wird aus echten Memory-Ereignissen abgeleitet und nicht als paralleler Place-Status erfunden.

## Enthalten

- neue Übersicht „Meine Orte“ unter Planen
- aktive Kachel „Besuchte Orte“ unter Reise
- Filter und Zähler für alle vier Zustände
- manuelle Besuchsbestätigung
- globale GPS-Besuchserkennung ein- und ausschalten
- sichtbare Besuchs- und Erinnerungsevidenz
- API für kommende Foto-, Album- und Reisebuchmodule: `LuviaPlaceLifecycleService.linkMemory()`
- keine neue Datenbankmigration
