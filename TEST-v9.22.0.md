# Testplan · Luvia v9.22.0 / Core V2.12.4

## Pflichtprüfung

1. App anmelden und eine Reise mit aufgelöstem Reiseziel öffnen.
2. Restaurantmodul öffnen. Quick-Filter müssen direkt oben sichtbar sein.
3. „Vegetarisch“ anklicken. Suchfeld und Checkbox müssen passend gesetzt sein; Suche muss starten.
4. „Pasta“, „Café“, „Romantisch“ und „Rooftop“ nacheinander testen.
5. Manuell suchen und Bewertung, Sortierung sowie „Jetzt geöffnet“ testen.
6. Prüfen, dass Treffer Name, Adresse, Bewertung, Entfernung, Tags und Match-Score zeigen.
7. Einen Treffer über „Details“ öffnen.
8. Detailseite auf Mobilgerät und Desktop prüfen: Galerie, Titel, Fakten, Tags, Score und Aktionen.
9. Ein Galeriefoto öffnen und Vollbild schließen.
10. Navigation, Telefon, Website und Reservierungslink prüfen, soweit Providerdaten vorhanden sind.
11. „Speichern“ testen und anschließend prüfen, dass der Ort in der Reise erscheint.
12. Mit einem anderen Ort „Favorit“ testen.
13. Mit einem anderen Ort „Tagesplan“ testen und Datum/Uhrzeit eingeben.
14. Mit einem anderen Ort „Besucht“ testen.
15. Modul neu laden; importierte Restaurants müssen weiterhin vorhanden sein.

## Regression

- Bestehende manuelle Restaurants und Paris-Demoeinträge bleiben sichtbar.
- Speisekarten-PDFs und Bildmenüs öffnen weiterhin.
- Editor, Upload, Sortierung und Countdown funktionieren weiterhin.
- Destination-Aware Search bleibt geografisch auf das kanonische Stadtziel begrenzt.
- Landmark-Kontext bleibt wirksam.
- Restaurantimport erzeugt keine doppelten Reiseverknüpfungen.
- PWA startet nach Update ohne alten Cache.
