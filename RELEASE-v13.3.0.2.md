# Luvia 13.3.0.2 – Guided Journey Atmosphere

**Core:** 4.3.0.2  
**Build:** 13.3.0.2

## Ziel

Die öffentliche Luvia-Erfahrung wurde visuell und strukturell vollständig neu aufgebaut. Die drei Einstiegszustände – Start, erster Reisegedanke und Authentifizierung – bilden jetzt eine ruhige, mobile-first Leinwand mit klar lesbaren Inhalten, organischen Gedankenwolken und weichen Fade-/Blur-Übergängen.

## Änderungen

- vollständige Neugestaltung der öffentlichen Landing-Leinwand
- keine horizontalen Slide-Übergänge mehr
- Fade-, Blur- und Scale-Wechsel zwischen den Masken
- ausschließlich moderne Sans-Serif-Typografie
- deutlich verbesserte Textkontraste
- organische, mehrschichtige Gedankenwolken mit Innen- und Außenschatten
- wechselnde Pastellatmosphären pro Maske
- mobile-first Layout für Smartphone, Tablet und Desktop
- Authentifizierungsformular visuell normalisiert
- Eingabefelder werden unabhängig vom Gerätemodus hell und lesbar dargestellt
- keine KI-generierten Fotos oder zusätzlichen Bildassets
- weiterhin kein localStorage und kein sessionStorage für den Journey Entry

## Verhalten

- `/` zeigt die öffentliche Luvia-Leinwand
- „Reise beginnen“ öffnet den ersten Reisegedanken per Fade
- Auswahl oder Freitext führt zur Registrierung
- „Anmelden“ öffnet die bestehende zentrale Authentifizierung
- „Ich wurde eingeladen“ führt in den vorhandenen Einladungsfluss
