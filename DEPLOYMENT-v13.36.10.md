# Deployment · Luvia 13.36.10 / Core 4.36.10

## 1. Supabase Migration ZUERST deployen
`supabase db push`

Neu:
`20260807161000_core_v4_36_10_profile_persistence_memory_review.sql`

Sie härtet `user_profiles` und legt `memory_card_album_reviews` an.

## 2. Frontend deployen
Kompletten Inhalt dieses Builds deployen.

## 3. PWA aktualisieren
`force-update.html` einmal öffnen, danach Browser/PWA vollständig schließen und neu starten.

## 4. Pflichtprüfung nach Deployment
1. Profilfarbe ändern und speichern.
2. Reisekompass ändern und übernehmen.
3. Abmelden. Browser-Site-Daten/LocalStorage löschen.
4. Neu anmelden. Profilfarbe und Reisekompass müssen identisch aus Supabase zurückkommen.
5. Mobile Memory mit mindestens 8 Cards öffnen und alle 8 nacheinander links/rechts wegwischen. Kein Freeze nach Karte 4.
6. Stapel erneut öffnen: Desktop-Album-Markierungen müssen bereits gespeicherte Entscheidungen anzeigen.

Keine neue Edge Function erforderlich.
