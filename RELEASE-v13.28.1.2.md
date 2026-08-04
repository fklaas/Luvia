# Luvia 13.28.1.2 – Media Context Correction

Korrigiert die Galerie-Kontextauflösung in der aktiven App-Shell. Der Media Core verwendet nun den kanonischen `LuviaTripContext`/`LuviaTripStore`, den zentralen Supabase-Client und den bestehenden Auth-Status statt des Paris-Legacy-Sync-Kontexts.

Keine Datenbankänderung. Keine Edge-Function-Änderung.
