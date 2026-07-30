# Luvia 13.7.0 / Core 4.7.0

## Restaurant Favorite Render Closure

- Behebt `ReferenceError: providerPlaceId is not defined` im Renderer gespeicherter Restaurantfavoriten.
- Der Restaurant-Favoritenrenderer übergibt nun die lokal kanonisch aufgelöste `providerId` an den globalen `LuviaPlaceCollections`-Core.
- Verhindert, dass ein Renderabbruch nach einer erfolgreichen Favoritenänderung Sammlung, Discovery-Karten und Buttonzustände auseinanderlaufen lässt.
- Ergänzt die verpflichtende Places-Architekturdokumentation um einen verbindlichen Favorite-Render-Regressionstest.

Keine SQL-Migration und kein Edge-Function-Deployment erforderlich.
