# Core V2.12.4.3

Dieser Fix trennt Text konsequent von frei wählbaren Reisefarben. Akzentfarben dienen nur noch als visuelle Signale wie Rahmen, Unterstreichung, Ring oder Fokus.

Die vegetarische Suche behandelt Providerdaten dreistufig:
- `true`: bestätigt und priorisiert
- `false`: bei aktivem Filter ausgeschlossen
- `null`: nicht bestätigt, aber weiterhin als möglicher vegetarischer Suchtreffer zugelassen

Restaurant-Favoriten bleiben Teil der bestehenden zentralen Place-/Trip-Entity. Es wird kein paralleler Local-Storage-Favoritenspeicher eingeführt.
