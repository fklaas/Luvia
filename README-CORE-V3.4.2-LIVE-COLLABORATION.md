# Core 3.4.2 · Live Collaboration Contract

`window.LuviaCollaboration` ist die zentrale öffentliche API für gemeinsame Live-Funktionen.

## Aktivität veröffentlichen

```js
await window.LuviaCollaboration.record(
  'photo.uploaded',
  'Luisa hat 3 Fotos hochgeladen',
  {
    entityType: 'photo',
    entityId: 'optional-id',
    metadata: { count: 3 }
  }
);
```

Module dürfen keine eigenen Activity-Tabellen oder Realtime-Channels anlegen. Neue Ereignistypen werden über diese API publiziert.

## Status lesen

```js
const state = window.LuviaCollaboration.snapshot();
console.log(state.activities, state.presence);
```

## Reaktiv abonnieren

```js
const unsubscribe = window.LuviaCollaboration.subscribe(state => {
  // UI aktualisieren
});
```

## Grundregeln
- Eine aktive Reise wird über `watchTrip(tripId)` verbunden.
- Presence ist gerätebezogen und wird serverseitig pro Nutzer zusammengeführt.
- Realtime-Nachrichten dienen als Aktualisierungssignal; Supabase-RPCs liefern den kanonischen Zustand.
- Zugriff ist auf Mitglieder der jeweiligen Reise beschränkt.
