# Testplan 12.1.1

- Developer Console zeigt System- und Servicekarten.
- Core-Diagnose zeigt Reise, Data Layer, Kernel, Event Bus und Service Registry.
- Kernel startet ohne `fehlenden Service restaurants`.
- `schedule-intelligence` und `restaurant-intelligence` erscheinen in der Registry.
- Ein fehlender Login kann beim Backend-Test weiterhin 401 liefern, darf aber die Diagnoseoberfläche nicht leeren.
