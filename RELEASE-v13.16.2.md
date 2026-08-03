# Luvia 13.16.2 / Core 4.16.2

## Guided Travel Canvas Focus Mode

Build 13.16.2 entwickelt Guided Discovery von einem vorgeschalteten Filter-Flow zu einer fokussierten, emotionalen Reiseleinwand weiter. Places und Move zeigen nach einer geführten Auswahl nur noch die daraus entstandenen Vorschläge. Der vollständige Katalog, freie Suche, Quick-Filter, Verfeinerung und Sammlungen werden erst geöffnet, wenn der Benutzer dies nach den Vorschlägen bewusst anfordert.

## Behobene Fehler

### Letzte Mehrfachauswahl blieb scheinbar hängen

Die Szenen „Welche Stimmung soll diesmal dazu passen?“ in Places und „Was ist euch für diese Verbindung besonders wichtig?“ in Move werden nicht mehr nach jedem Klick vollständig neu aufgebaut. Ausgewählte Wolken, ARIA-Zustand, Statuszeile und Weiter-Button werden direkt im bestehenden DOM aktualisiert. Dadurch bleiben Auswahl und Fokus stabil; der Flow lässt sich zuverlässig fortsetzen.

### Vorlieben-Flow lag hinter dem Profil

Der Guided-Flow liegt jetzt immer oberhalb des Profilfensters. Das zugrunde liegende Profil wird währenddessen `inert`, `aria-hidden` und visuell ausgeblendet. Nach Speichern oder Abbruch wird es vollständig wiederhergestellt.

## Fokussierter Vorschlagsmodus

Nach Abschluss des Places- oder Move-Flows:

- erscheint eine offene, animierte Travel-Canvas als emotionaler Übergang,
- werden der persönliche Discovery Contract und die zwei Präferenzebenen erklärt,
- zeigt das jeweilige Modul nur die passenden Vorschlagskarten,
- bleiben Modulkopf, Planungspanel, Suchleiste, Quick-Filter, Filter-Drawer und Sammlung verborgen,
- ist kein „Alle Bereiche“-Button im Kopf sichtbar,
- wird der vollständige Bereich erst am Ende über „Gesamten Bereich öffnen“ angeboten.

Damit ist die geführte Auswahl der primäre Produkterlebnispfad. Der Katalog ist ein bewusster Ausweichweg und kein parallel sichtbarer Browser.

## Zwei klar getrennte Präferenzebenen

### Globaler Reisekompass

Die im Profil beziehungsweise Registrierungs-Onboarding gespeicherten Vorlieben beschreiben dauerhaft, wie der Benutzer reist. Sie bleiben in `public.user_profiles` gespeichert und wirken appweit.

### Aktueller Reisemoment

Die Antworten in Places oder Move gelten nur für die aktuelle Inspiration. Sie ergänzen den globalen Kontext, überschreiben aber keine Profilwerte.

Places- und Move-Contracts enthalten jetzt explizit:

```text
preferenceLayers.globalProfile
preferenceLayers.moduleMoment
mergePolicy = global-profile-context-plus-explicit-module-moment
mutatesGlobalProfile = false
```

## Visuelle Überarbeitung

- organische Wolken aus mehreren Wolkenkörpern statt ovaler Buttons,
- offenere Vollbildflächen mit Reise-, Rosa-, Pfirsich-, Lavendel- und Cremetönen,
- große typografische Szenen statt technischer Formularoptik,
- neue Travel-Canvas für Ergebnisübergänge,
- Reiseweg, Flugzeug, Lichtpunkte und persönliche Auswahlchips,
- offenere Empfehlungskarten und Katalog-Gate,
- neu gestalteter Profilbereich „Vorlieben“ mit visueller Darstellung beider Präferenzebenen,
- responsive Einspaltenansichten und große Touch-Ziele.

## Performance und Bewegung

- Pointer-Parallax ist per `requestAnimationFrame` gedrosselt,
- Mehrfachauswahlen lösen keinen kompletten Renderzyklus mehr aus,
- permanente Einzelanimation jeder Auswahlwolke wurde deaktiviert,
- Bewegungen verwenden überwiegend `transform` und `opacity`,
- Daueranimationen wurden verlangsamt und reduziert,
- `prefers-reduced-motion` und die Luvia-Profileinstellung bleiben vollständig unterstützt,
- lange Ergebnislisten verwenden `content-visibility` in der fokussierten Ansicht.

## Move bleibt ohne Timeline

Unverändert verbindlich:

- keine Timeline-Aktion,
- kein `planned_at`,
- keine Planning-Capability,
- keine Move-Einträge in der globalen Timeline.

## Datenbank und Backend

Dieser Build ändert weder das Supabase-Schema noch den Gateway-Code. Die Migration aus 13.16.1 bleibt die aktuelle Preference-Migration.

```text
Keine neue SQL-Migration.
Kein Edge-Function-Deployment erforderlich.
```
