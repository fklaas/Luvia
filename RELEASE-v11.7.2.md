# Luvia 11.7.2 · Core 3.5.2 — Central Travel Preferences

## Ziel
Reisepräferenzen werden nicht mehr nur im Profil angezeigt, sondern über einen zentralen Core-Service für sämtliche aktuellen und zukünftigen Reisemodule bereitgestellt.

## Neu
- `window.LuviaTravelPreferences` als zentrale, modulunabhängige Präferenz-API.
- Einheitlicher Kontext für Ernährungsweise, Interessen, Reisetempo, Budgetstil, Sprache, Zeitzone, Standortfreigabe und Personalisierung.
- Adapter-Registry für Hotels, Sehenswürdigkeiten, Fotospots, Shopping, Aktivitäten und zukünftige Module.
- Automatische Events bei Profiländerungen, damit aktive Module ohne Neuladen neu bewerten können.
- Restaurant-Match-Score und „Warum passt das zu euch?“ berücksichtigen die zentralen Präferenzen.
- Präferenzkontext wird gemeinsam mit Empfehlungsentscheidungen dauerhaft in der Datenbank gespeichert.

## Architekturregel
Module lesen Reisepräferenzen ausschließlich über `LuviaTravelPreferences`. Direkte Profilabfragen oder eigene Präferenzspeicher in einzelnen Modulen sind künftig nicht vorgesehen.
