# Luvia 13.6.10 / Core 4.6.10

## Global Favorite Persistence Closure

- Restaurant-Favoriten werden beim ersten Import atomar als Favorit gespeichert.
- Alle Favoritenklicks leiten den gewünschten Zustand aus dem globalen Buttonzustand ab.
- Das Restaurantmodul spiegelt erfolgreiche Core-Events in sein lokales Darstellungsmodell, ohne den Zustand zurückzusetzen.
- Der Backend-Service wartet vor geschützten Gateway-Aufrufen auf die initialisierte Supabase-Sitzung und das aktuelle Access Token.
- Die globale Places-Architekturdatei dokumentiert die verbindliche Persistenzregel.
