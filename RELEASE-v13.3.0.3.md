# Luvia 13.3.0.3 – Guided Journey Readability & Registration Flow

**Core:** 4.3.0.3  
**Build:** 13.3.0.3

## Inhalt

- komplette Überarbeitung des öffentlichen Guided-Journey-Einstiegs
- konsequent lesbare Typografie und hoher Textkontrast auf allen Masken
- reisebezogene, rein CSS-basierte Hintergrundwelt mit Route, Flugzeug, Sonne, Hügeln und Ballons
- organische Gedankenwölkchen mit weichen Pastelltönen, Tiefenschatten und dezenter Float-Bewegung
- ruhiger Fade-/Blur-Wechsel zwischen den Masken
- Registrierung als drei einzelne, zentrierte Schritte:
  1. Wie dürfen wir dich nennen?
  2. Deine E-Mail
  3. Erstelle ein Passwort
- mittig platzierte Eingabefelder auf Smartphone, Tablet und Desktop
- bestehende zentrale ParisAuth-Logik für Kontoerstellung und Anmeldung weiterverwendet
- keine neue lokale Persistenz

## Behobene Probleme

- helle, unlesbare Texte
- überlagerte Gedankenblasen
- abgeschnittenes Registrierungsformular
- seitlich aus dem Viewport laufende Auth-Karte
- schwer erreichbare Eingabefelder auf iPhones
- uneinheitliche Wolkenformen und zu geringe visuelle Reisethematik
