# Tests – Luvia 13.27.5.1

## Lokal geprüft
- JavaScript-Syntax der geänderten JS-Dateien
- lokale Script- und CSS-Referenzen in `index.html`, `intelligence/test.html` und `intelligence/console.html`
- Ladeordnung Kernel-Version vor Core-4-Diagnostics
- Ladeordnung Media Readiness vor Service-Registrierung
- vollständige AI-Abhängigkeiten für Brain-Smoke-Tests
- Lifecycle-Abhängigkeiten für Media Readiness
- defensive Fehlerantwort bei fehlender Media-Readiness-Implementierung
- aktive Versions- und Cachekonsistenz
- ZIP-Integrität

## Live zu prüfen
- Developer Console: Media Readiness Service testen
- Core-4-Smoke-Test erneut ausführen
- Registry muss keinen Folgefehler durch `media-readiness` mehr zeigen
- Luvia Brain Core und Luvia Brain Safety müssen bei vollständig geladenen APIs bestehen

Produktive Supabase-, Storage-, PWA- und Mobile-Tests wurden lokal nicht ausgeführt.
