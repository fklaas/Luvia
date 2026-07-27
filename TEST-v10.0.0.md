# Testplan · Luvia 10.0.0

1. Ohne Login erscheint ausschließlich das Login-Gateway.
2. Login ohne vorhandene Reise zeigt den Empty State „Noch keine Reise“.
3. Login mit mehreren Reisen zeigt einmalig die Reiseauswahl und keinen Loop.
4. Login mit einer Reise aktiviert diese automatisch.
5. Reisewechsel aktualisiert `luvia.activeTripId` und den Modulkontext.
6. Vorhandene `parisIdentityV1`-/`parisTripRegistryV1`-Daten werden übernommen.
7. Ein vorhandenes String-Reiseziel wird zu `destination.name` migriert.
8. Ohne aktive Reise wird `ParisCloud.connect` nicht gestartet.
9. Nach aktiver Reise bleiben Profil, Budget, Galerie und Synchronisation über die Übergangsbrücke erreichbar.
10. Service Worker verwendet Cache `luvia-shell-v10.0.0`.
