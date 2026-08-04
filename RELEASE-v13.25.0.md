# Luvia 13.25.0 – Product Focus & Navigation Reset

## Ziel
Luvia kehrt zum Produktkern zurück: gemeinsam planen, reisen und Erinnerungen bewahren. Experimentelle Mobilitäts- und Mehrziel-Composer-Flows sind nicht mehr Teil der primären Nutzerführung.

## Neue globale Navigation
- Heute
- Planen
- Reise
- Erinnerungen
- Mehr

Die Navigation wird zentral über `app/navigation-registry.js` definiert und nicht mehr aus aktivierten technischen Modulen erzeugt.

## Modul-Hubs
Neue, responsive Übersichten ordnen bestehende und kommende Funktionen dauerhaft ein:
- Planen: Places, Timeline, Checklisten, Budget, Routen, Sprachhilfe, Wetter, Community
- Reise: Tagesübersicht, Timeline, Teilnehmer, besuchte Orte, Live-Momente, Reisedaten
- Erinnerungen: Fotogalerie, Alben, Reisebuch, Revue, Highlights
- Mehr: Profil, Reisekompass, Reiseeinstellungen, Benachrichtigungen, Export, Hilfe

Noch nicht implementierte Funktionen öffnen keine leeren Seiten, sondern bleiben als klar markierte Vorschau sichtbar.

## Places
Der experimentelle Mehrziel-Planer und das Journey Planning Deck werden im primären Places-Einstieg nicht mehr gemountet. Places zeigt den Product-Focus-Zwischenstand und den bewussten Zugang zum bestehenden kanonischen Katalog. Die finale freie KI-Suche folgt in 13.26.0.

Künftiger Lifecycle:
- Entdeckt
- Geplant
- Besucht
- Erinnert

## Routen statt Move
Move wurde aus der globalen Navigation entfernt. Der neue Routen-Helfer öffnet Start und Ziel direkt in Google Maps. Luvia betreibt in diesem Produktstadium keine eigene Bahn-, Bus- oder internationale Fahrplanengine.

## Session Reset
Alte experimentelle Planning-, Candidate-, Research- und Journey-Deck-Sessions werden einmalig aus `sessionStorage` entfernt. Cloud-Datenmodelle, Places Core, Timeline und bestehende Reisedaten bleiben unverändert.
