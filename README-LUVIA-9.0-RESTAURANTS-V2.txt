LUVIA 9.0 – RESTAURANTS V2

Das Restaurant-Modul ist das erste vollständig neu gerenderte V2-Modul.

Technische Änderungen:
- Der feste Restaurant-HTML-Block wurde aus index.html entfernt.
- modules/restaurants.js besitzt jetzt ein strukturiertes Datenmodell, Defaults, Render-, Mount- und Unmount-Lebenszyklus.
- Restaurantkarten werden aus trip.moduleContent.restaurants.data erzeugt.
- Überschrift, Restaurants, Datum, Uhrzeit, Beschreibung, Symbol, Maps-Link und Speisekarte sind als eigene Datenfelder definiert.
- Wiederholbare Restaurant-Einträge sind für einen späteren Schritt-für-Schritt-Editor vorbereitet.
- Das bisherige sichtbare Paris-Design und die Speisekartenanzeige bleiben erhalten.
- LuviaModules.getModuleData('restaurants') liest die strukturierten Daten.
- LuviaModules.setModuleData('restaurants', data) speichert und rendert neue Daten.

Beispiel:
LuviaModules.setModuleData('restaurants', {
  heading: { title: 'Unsere Restaurants', eyebrow: 'Kulinarische Reise', description: '...' },
  entries: [{
    id: 'restaurant-1', name: 'Restaurantname', weekday: 'Freitag', date: '31.07.2026',
    time: '19:00', description: '...', symbol: '🍝', mapsUrl: 'https://...',
    menu: { enabled: false }
  }]
});
