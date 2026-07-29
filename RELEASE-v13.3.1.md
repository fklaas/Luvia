# Luvia 13.3.1 – Stay Core & Accommodation Data Foundation

**Core:** 4.3.1  
**Build:** 13.3.1

## Ergebnis

Build 13.3.1 erweitert den Universal Place Core erstmals nach Restaurants um den Place-Typ `accommodation`. Unterkünfte behalten eine kanonische Identität in `places` und werden über `trip_places` mit der aktiven Reise verbunden. Es entsteht keine parallele Hotel-Entity.

## Änderungen

- neues cloudbasiertes Unterkunftsmodul mit zielbezogener Provider-Suche
- idempotenter Import über die generische `place.import`-Action und vorhandene Dublettenlogik
- neue optionale Extension-Tabelle `accommodations` für reise- und buchungsbezogene Unterkunftsdaten
- klare Trennung von Providerdaten in `places`, Reisezustand in `trip_places` und Buchungsdaten in `accommodations`
- Lifecycle: gemerkt, verglichen, ausgewählt, gebucht, eingecheckt, ausgecheckt, besucht, verworfen
- Check-in, Check-out, Gäste, Zimmer, Buchungsnummer, Anbieter, Gesamtpreis, Währung, Notizen und fester Ausgangspunkt
- Check-in und Check-out werden über den bestehenden universellen Schedule Service angelegt
- Unterkunftsänderungen werden über den bestehenden Timeline Core protokolliert
- Cloud-Reload lädt gespeicherte Unterkünfte und Extension-Daten erneut
- Restaurants bleiben auf ihrer bestehenden universellen Pipeline unverändert
- keine fachliche Unterkunftspersistenz in localStorage

## Architekturentscheidung

Eine Unterkunft ist eine kanonische Place-Entity. Die Tabelle `accommodations` ist ausschließlich eine optionale fachliche Extension je `trip_place_id`. Provider- und spätere Offer-Quellen bleiben von der Unterkunftsidentität getrennt. Dadurch können Booking, Expedia, direkte Hotelseiten oder andere Partner später als neutrale Angebotsquellen ergänzt werden.

## Bekannte Grenzen

- noch keine vollständige Detailansicht, Vergleichsliste oder Stay-Match-Bewertung
- noch keine produktive Offer- oder Affiliate-Integration
- Ausstattung und erweiterte Buchungsfelder sind im Schema vorbereitet, aber in der ersten UI nur teilweise editierbar
