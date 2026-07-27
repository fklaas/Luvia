# Regressionstest Luvia 11.3.3

## Dialoge
- Dashboard: Reise bearbeiten öffnet den neuen Reiseeditor.
- Profil > Meine Reisen: Bearbeiten öffnet denselben Reiseeditor.
- Dashboard/Header: Personen einladen öffnet Code, Link und QR-Code.
- X, Escape und Klick auf den Hintergrund schließen Dialoge.
- Klick innerhalb des Dialogs schließt ihn nicht.

## Reiseeditor
- Titel, Ziel, Land, Zeitraum, Symbol, Farbe und Module bearbeiten.
- Live-Vorschau aktualisiert sich während der Eingabe.
- Speichern aktualisiert Dashboard und Cloud-Datensatz.

## Diagnose
- Core-Diagnose in einer angemeldeten Browser-Sitzung öffnen.
- Supabase: Verbunden; Anmeldung: Angemeldet.
- Auth, User, Data, Trips, Backend, Places und Developer: Bereit.
- Alle Service-Tests erfolgreich.
- Permission- und CRUD-Test erfolgreich.
- Keine Meldung „Supabase-Client fehlt“.
- Nur eine Supabase-Client-Instanz.

## Einladungen
- Link kopieren.
- Native Teilen-Funktion oder Fallback testen.
- E-Mail, WhatsApp und Telegram öffnen korrekte Inhalte.
- Signal kopiert die Einladung in die Zwischenablage.
