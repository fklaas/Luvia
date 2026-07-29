# Testplan – Luvia 13.3.1.1

1. Reise bearbeiten und Unterkünfte aktivieren.
2. „Module übernehmen“ anklicken.
3. Prüfen, dass Unterkünfte unten in der Navigation erscheint.
4. Browser vollständig neu laden.
5. Prüfen, dass Unterkünfte weiterhin aktiv ist.
6. Unterkünfte öffnen. Erwartet werden Überschrift, Suche, Suchergebnisse und gespeicherte Unterkünfte statt einer leeren Fläche.
7. Zwischen Dashboard, Unterkünfte und Restaurants wechseln. Jeder Wechsel muss denselben Fade-/Intro-Übergang verwenden.
8. Prüfen, dass im Dashboard oben weder „Unterkünfte öffnen“ noch „Restaurants öffnen“ erscheint.

## Console

```javascript
LuviaTripStore.snapshot().activeTrip.modules
```

Erwartet bei aktivierten Modulen mindestens:

```javascript
['restaurants', 'accommodations']
```

```javascript
LuviaModuleRegistry.enabledForTrip(LuviaTripStore.snapshot().activeTrip)
```

Muss dieselben aktivierten Module liefern.
