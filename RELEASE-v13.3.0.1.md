# Luvia 13.3.0.1 – Guided Journey Canvas Refinement

**Core:** 4.3.0.1  
**Build:** 13.3.0.1

## Ziel

Die öffentliche Luvia-Erfahrung ist jetzt eine feste, nicht scrollbar aufgebaute Leinwand. Start, Reiseidee, Anmeldung und Einladung wechseln als zusammenhängende Folien innerhalb derselben Oberfläche.

## Änderungen

- öffentlicher Einstieg vollständig als One-Pager ohne vertikales Seitenscrolling
- horizontale Canvas-Übergänge statt Dialogen und Pop-ups
- warmes, farbenfroheres Branding auf Basis des vorhandenen Luvia-Logos
- neu gestaltete, weich schattierte Gedankenformen
- moderner Glas-, Tiefen- und Farbverlauf-Look
- konsequent mobile-first für Smartphone, Tablet und Desktop
- Anmeldung und Registrierung direkt als eigene Canvas-Folie
- Reiseidee bleibt bis zur Authentifizierung ausschließlich im Arbeitsspeicher
- Einladungscode erhält eine eigene Canvas-Folie
- `prefers-reduced-motion` wird berücksichtigt

## Architektur

Es wurde keine zweite Authentifizierungslogik eingeführt. Die bestehende `ParisAuthUI` wird weiterhin verwendet und nur in die neue Canvas-Folie eingebettet.
