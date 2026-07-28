# Luvia 12.1.1 · Core 3.9.0 – Schedule Intelligence

## Neu
- Zentraler `LuviaScheduleIntelligence` Service für alle künftigen Reisemodule.
- Persistierte Restauranttermine werden zu einem gemeinsamen Tagesablauf normalisiert.
- Abfahrtszeit aus Besuchszeit, Entfernung, Wegart und Sicherheitspuffer.
- Erkennung von Überschneidungen und zu knappen Übergängen.
- Nächster Programmpunkt, freie Zeitfenster und Konflikte im Dashboard.
- Sichtbarer Tagesplan- und Abfahrtsblock in Restaurantdetails.
- Öffentliche API: `refresh`, `snapshot`, `analyze`, `subscribe`, `diagnostics`.

## Architektur
Der Service ist nicht restaurantgebunden. Restaurants sind der erste Datenadapter. Hotels, Sehenswürdigkeiten, Transport und weitere Timeline-Entities können später dieselbe normalisierte Event-Struktur liefern.
