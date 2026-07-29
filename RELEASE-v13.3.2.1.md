# Luvia Build 13.3.2.1 – Universal Places Design Contract Fix

## Ziel
Das Restaurant-Erlebnis ist der verbindliche visuelle und funktionale Designvertrag für alle Place-Typen. Unterkünfte verwenden nun dieselbe Shell, Suchmaske, Ergebnis-Karten, Detail-Experience, Akzentlogik und Intelligence-Darstellung.

## Änderungen
- Restaurant-CSS gilt nun gleichermaßen für `#restaurants-module` und `#accommodations-module`.
- Unterkunftssuche verwendet die identischen Search-, Filter-, Grid- und Card-Komponenten.
- Google-Place-Fotos werden über denselben serverseitigen Photo-Resolver wie bei Restaurants geladen.
- Ergebnis- und Detailaktionen heißen einheitlich `Warum passt das?` und `Favorit`.
- Unterkunftsdetails zeigen GPS-basierte Entfernung sowie Fuß- und Fahrtdauer, sofern Standort und Routing verfügbar sind.
- Check-in und Check-out werden als Schedule-Events und Timeline-Ereignisse gespeichert.
- Der ungültige Status `saved` wurde vollständig entfernt. Unterkünfte verwenden die kanonischen Werte `idea`, `reserved` und `archived`.

## Architektur
Restaurant-spezifische Fachfunktionen bleiben Capability-basiert. Die Experience-Komponenten sind dagegen universal. Unterkunft verwendet Aufenthalt/Buchung statt Reservierung/Tagesbesuch; zukünftige Place-Typen erhalten nur passende Capabilities.

## Grenzen
Produktive Provider-, Routing- und Cloud-Tests benötigen die reale Supabase-/Google-Konfiguration.
