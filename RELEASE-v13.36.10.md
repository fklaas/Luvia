# Luvia 13.36.10 · Core 4.36.10
## Memory Review & Profile Persistence Hardening

Basis: 13.36.9 / Core 4.36.9.

## Memory Review
- Behebt den Freeze nach vier Mobile-Swipes: sichtbare Stack-Layer werden relativ zum aktuellen Cursor gesteuert, nicht über feste DOM-nth-child-Grenzen.
- Mobile Swipe rechts = `included` (für zukünftiges Memory Album vormerken).
- Mobile Swipe links = `excluded` (nicht für das Album auswählen).
- Entscheidungen löschen niemals die Memory Card und sind später änderbar.
- Neue Cloud-Tabelle `memory_card_album_reviews` persistiert die Entscheidung pro Benutzer und Karte.
- Desktop nutzt dieselbe Core-Aktion über dezente Links-/Rechts-Aktionen an der gehovert/fokussierten Karte.
- Vorhandene Review-Entscheidungen werden beim Öffnen des Stapels wieder eingelesen.

## Responsive Memory Cards
- Desktop-Kartenbreite wird aus verfügbarer Stage-Fläche, Höhe und Kartenanzahl berechnet.
- Laptop-Ansichten erhalten kleinere Karten; große Desktop-Flächen dürfen größere Karten nutzen.
- Scatter-Berechnung verwendet dieselbe dynamische Kartenbreite, damit Layout und tatsächliche Card-Geometrie übereinstimmen.

## Profile Persistence Hardening
- `user_profiles` bleibt Source of Truth; LocalStorage ist ausschließlich Start-/Offline-Cache.
- Optimistische Änderungen werden nicht mehr vor Cloud-Bestätigung in den Cache geschrieben.
- Jeder Profil-Save wird nach dem RPC erneut aus Supabase gelesen. Dauerhafte Felder werden gegen den erwarteten Zustand validiert.
- Bei Readback-Abweichung gilt der Save als fehlgeschlagen statt stillschweigend als erfolgreich.
- Profilfarbe und Reisekompass-Felder werden in der Migration auf persistente Defaults/NOT NULL gehärtet.
- `profile_revision` dokumentiert serverseitige Profiländerungen.
- `completeOnboarding()` merged neue/partielle Antworten mit dem bestehenden Reisekompass, statt nicht gelieferte Werte auf Defaults zurückzusetzen.

## Backend
Neue Migration erforderlich:
`supabase/migrations/20260807161000_core_v4_36_10_profile_persistence_memory_review.sql`
