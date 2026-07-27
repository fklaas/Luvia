# Core 3.5.2 · Central Travel Preferences

## Öffentliche API

```js
const prefs = window.LuviaTravelPreferences.snapshot();
const context = window.LuviaTravelPreferences.context('hotels', { tripId });
const reasons = window.LuviaTravelPreferences.reasons(place, 'places');
const delta = window.LuviaTravelPreferences.score(place, 'places');
```

## Moduladapter

```js
const unregister = window.LuviaTravelPreferences.registerAdapter('hotels', (base, extra) => ({
  hotelContext: {
    quietPreferred: base.group.pace === 'relaxed',
    budget: base.group.budget
  }
}));
```

## Realtime im Frontend
Module können auf `luvia:travel-preferences-changed` hören. Das Event wird nach Cloud-Laden, Speichern oder einem Profilwechsel ausgelöst.

## Datenhaltung
Die Primärdaten bleiben im cloud-synchronisierten Benutzerprofil. Empfehlungsentscheidungen speichern zusätzlich den verwendeten Präferenzkontext, damit Reise-Revue, Reisebuch und spätere KI-Auswertungen nachvollziehen können, warum ein Ort vorgeschlagen oder gewählt wurde.
