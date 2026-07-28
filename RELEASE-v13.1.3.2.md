# Luvia 13.1.3.2 – Live Day Schedule Identity & Stable Suggestions

## Fertig umgesetzt

- Änderungen an Uhrzeit und Datum aktualisieren den bestehenden Schedule-Eintrag statt einen zweiten Eintrag anzulegen.
- Schedule Intelligence entfernt alte lokale Alias-Einträge anhand von Trip-Place-, Place- und Provider-Identität.
- Vorschläge in freien Zeitfenstern sind direkt anklickbar und öffnen die zugehörige Place-Karte.
- Restaurantvorschläge werden auf maximal zwei Food-Places pro Tag begrenzt und nach Meal, Café, Dessert und Bar unterschieden.
- Die Heute-Karte aktualisiert ohne Opacity-, Transform- oder View-Transition-Effekte.
- Restaurant Intelligence und Collaboration aktualisieren nur noch ihre eigenen Dashboard-Widgets statt die komplette App Shell neu aufzubauen.
- Der Live Day Companion unterdrückt semantisch identische Snapshots und damit unnötige Render-Ereignisse.

## Einordnung Bistro

Ein Bistro ist standardmäßig `restaurant.meal`. Nur wenn Name, Typen oder Metadaten es eindeutig als Café, Frühstücksort, Dessert-Ort oder Bar klassifizieren, erhält es eine andere Food-Unterkategorie.
