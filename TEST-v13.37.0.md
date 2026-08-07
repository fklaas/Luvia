# Testplan · Luvia 13.37.0 / Core 4.37.0

## Automatisiert lokal geprüft
- Syntax der kritischen geänderten JavaScript-Dateien.
- Build/Core/Service-Worker/Force-Update auf 13.37.0 / 4.37.0.
- 152 lokale Assets aus `index.html`, 0 fehlend.
- CSS-Klammerstruktur konsistent.
- Hero/Story/Signal-Klassifikation vorhanden.
- Bis zu drei Hero-Fotos pro Person/Moment.
- Bestehende Foto-Cards werden beim erneuten Auswählen nicht dupliziert.
- Stack-Datum nutzt Media-Day-Keys.
- Cloud-Titelvorschläge vorhanden.
- Owner-only Stack-Auflösen per RPC vorhanden.
- Gemeinsame Review-Aggregation vorhanden.
- Alte Emoji-Reaktions-Doppelkarte wird bei vorhandener Momentgefühl-Karte unterdrückt.
- Sichtbare Memory-Moments-Sektion aus Gallery entfernt.
- Desktop-Hover-Fix ohne Card-Scale vorhanden.

## Manuelle Pflichtprüfung nach Deployment
### Hero / Story / Signal
1. Einen neuen Fotomoment mit einem Teilnehmer öffnen.
2. 1, 2 und 3 Fotos markieren; viertes Foto darf nicht zusätzlich ausgewählt werden.
3. Moment abschließen und prüfen, dass alle gewählten Fotos als eigene Hero Cards vorhanden sind.
4. Bestehenden Moment erneut ergänzen, Auswahl ändern und prüfen, dass keine Foto-Dubletten entstehen.
5. Momentgefühl + Emoji setzen: im Stack soll daraus eine sinnvolle Signal-Karte entstehen, keine zusätzliche reine Emoji-Doppelkarte.

### Datum
1. Einen Cluster mit Fotos eines bekannten Galerietags öffnen.
2. Stack muss denselben Tag anzeigen wie die Media-/Galerie-Zuordnung.
3. Cluster mit anderem Tag prüfen; kein pauschales oder aktuelles Datum darf verwendet werden.

### Titel
1. Zwei Reisende geben jeweils einen Titelvorschlag ab.
2. Nach Reload müssen beide Vorschläge in Supabase erhalten bleiben; Stack zeigt die Anzahl der Vorschläge.

### Gemeinsamer Review-Stand
1. Reisender A swipt/entscheidet alle Cards.
2. Reisender B hat noch nicht entschieden -> Stapel darf noch nicht als vollständig gemeinsam geprüft erscheinen.
3. Reisender B entscheidet ebenfalls alle Cards -> Status muss für spätere Priorisierung bereit werden.

### Owner-only Auflösen
1. Als normaler Mitreisender: keine Auflösen-Schaltfläche.
2. Direkten RPC-Versuch als Nicht-Owner ablehnen lassen.
3. Als Reisebesitzer Stack auflösen -> Stack verschwindet.
4. Originalfotos und Memory Cards müssen weiterhin vorhanden sein.

### Galerie
- Fotogalerie öffnen: keine separate sichtbare `Memory Moments`-Sektion mehr.
- Normale Foto-/Tages-/Albumfunktionen dürfen davon nicht betroffen sein.

### Desktop-Schärfe
- Laptop und großer Desktop: Text/Kanten im Spread vergleichen.
- Hover: Karte hebt sich weich an, ohne sichtbares Scale-Weichzeichnen.
