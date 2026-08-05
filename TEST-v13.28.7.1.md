# Testplan 13.28.7.1

1. `luvia-gateway` deployen.
2. `Fallschirmspringen in München` suchen.
3. Im Response von `places.text-search` prüfen:
   - `providers.requested`: Google und Foursquare.
   - `providers.used`: bei erfolgreicher Antwort beide Provider.
   - Kein Fehler `Unexpected field(s): geocodes,timezone provided`.
4. Reine Foursquare-Treffer besitzen eine `fsq:`-ID.
5. Doppelte Treffer beider Provider werden zusammengeführt.
