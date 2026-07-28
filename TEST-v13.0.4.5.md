# Test v13.0.4.5

1. `/intelligence/console.html?v=13.0.4.5` öffnen.
2. Prüfen, dass die Seite ohne Gateway-Request lädt.
3. Services und Core 4 Health öffnen.
4. `/intelligence/test.html?v=13.0.4.5` öffnen.
5. Prüfen, dass kein automatischer 401/400-Aufruf an `luvia-gateway` erfolgt.
6. Normale App öffnen und Restaurantvorschläge testen.
