# Booking Provider Routing V1 — Deploy

1. Web-App v13.39.0 / Core 4.39.0 deployen.
2. In Supabase Edge Functions `booking-route-resolve` neu anlegen/deployen.
3. Inhalt aus `supabase/functions/booking-route-resolve/index.ts` verwenden.
4. Verify JWT = ON.
5. Keine neuen Secrets.
6. Keine SQL-Migration.
7. Kontrolltest: neue Restaurant-Anfrage anlegen; danach in Buchungen prüfen, ob Provider/Reservierungslink vor E-Mail priorisiert wird.

Hinweis: `booking-contact-resolve` bleibt für Rückwärtskompatibilität bestehen, wird vom neuen Client jedoch nicht mehr als primärer Resolver verwendet.
