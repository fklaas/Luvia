# RELEASE v13.4.6.2

## Dashboard Preferences & Compact Timeline Calendar

### Änderungen
- Die universellen Aktionen „Datum und Uhrzeit ändern“ und „Löschen“ verwenden in Restaurant- und Unterkunftsplanungen dieselbe kompakte, dezente Darstellung wie in der Timeline.
- Dashboard-Widget-Einstellungen werden nach dem Umschalten sofort im geöffneten Dashboard übernommen.
- Die veralteten Dashboardkarten `Heute alt`, `Restaurant Intelligence` und `Persönlich für dich` wurden aus dem globalen Widget-Vertrag und der Profilkonfiguration entfernt.
- Der Timeline-Kalender zeigt initial höchstens sieben Reisetage. Weitere Tage werden in Siebenergruppen über „Weitere Tage anzeigen“ eingeblendet.
- Der Kalender bleibt in einer festen Widget-Breite und wächst nur zeilenweise, nicht horizontal.
- Mobile Darstellung bleibt einspaltig und verwendet ein kompaktes Vier-Spalten-Kalenderraster.

### Architektur
- Dashboard-Sichtbarkeit bleibt profil- und cloudbasiert; die App Shell aktualisiert lediglich das Widget-Raster ohne kompletten View-Remount.
- Die Timeline-Paginierung ist Teil des zentralen `LuviaTimelineCore` und gilt damit für alle künftigen Place-Typen.
- Keine fachlichen Datenquellen oder lokalen Speicherpfade wurden ergänzt.

### Bekannte Grenzen
- Das Einblenden weiterer Kalendertage gilt jeweils für die aktuell gerenderte Dashboardansicht und beginnt nach einem vollständigen Neuaufbau wieder bei sieben Tagen.
