# Luvia 13.6.9 / Core 4.6.9

## Global Restaurant Favorite Closure

- Restaurant-Favoriten verwenden nun exakt denselben globalen Writer wie Unterkünfte und Sehenswürdigkeiten.
- Historische camelCase-Felder `isFavorite` werden im Core normalisiert.
- Restaurant-Detailkarten verwenden `LuviaPlaceCollections.favoriteButton`.
- Alte Restaurant-Favoritenhandler wurden entfernt.
- Einzelnes Entfernen, Hinzufügen und „Alle entfernen“ synchronisieren alle sichtbaren Karten.
