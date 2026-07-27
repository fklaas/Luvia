LUVIA 3.1 – TRIP-CONTEXT & SPLASHSCREEN-FIX
Stand: 25.07.2026

Behoben:
1. Der Splashscreen wird nach dem Auth-Start immer freigegeben – auch bei fehlender Sitzung, Netzwerk- oder Supabase-Fehlern.
2. Ein zusätzlicher 4-Sekunden-Notfallmechanismus verhindert dauerhaftes Hängenbleiben.
3. Neue zentrale Datenquelle: luvia-trip-context.js
4. Dashboard und Live Moments beziehen das aktive Reiseziel aus demselben Trip-Context.
5. Die pauschale 30-Sekunden-Personalisierung im Dashboard wurde entfernt.
6. Alte Texte werden nur noch beim App-Start oder bei einem echten Reisewechsel angepasst.
7. Service-Worker-Cache erhöht auf luvia-v31-trip-context-fix-20260725-1.
8. Query-Versionen der geänderten Skripte wurden erhöht.

Wichtige interne LocalStorage-Namen mit „paris“ wurden absichtlich nicht umbenannt, damit vorhandene Daten und Sitzungen erhalten bleiben.
