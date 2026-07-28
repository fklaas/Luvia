# Testplan – Luvia 13.3.0.3

## Öffentlicher Einstieg

- Startseite ist ohne Scrollen vollständig sichtbar.
- Logo, Anmelden, Headline, Beschreibung und beide Aktionen sind lesbar.
- Kein Text liegt hinter Wolken oder Hintergrundelementen.

## Reisegedanke

- alle fünf Gedankenwölkchen sind lesbar und antippbar
- Wölkchen bewegen sich nur leicht
- Freitextfeld ist vollständig sichtbar und erreichbar
- Auswahl führt zu „Wie dürfen wir dich nennen?“

## Registrierung

1. Name mittig eingeben und weiter
2. E-Mail mittig eingeben und weiter
3. Passwort und Wiederholung mittig eingeben
4. Konto erstellen löst `ParisAuth.signUp` aus
5. Validierungs- und Supabase-Meldungen sind sichtbar

## Anmeldung und Einladung

- Anmelden öffnet eine zentrierte, vollständig sichtbare Login-Maske
- Einladungscode ist mittig erreichbar

## Geräte

- iPhone Safari
- installierte PWA
- Tablet Hoch- und Querformat
- Desktop
- kurze Viewports und eingeblendete Bildschirmtastatur
