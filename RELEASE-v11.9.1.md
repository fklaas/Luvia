# Luvia 11.9.1 · Core 3.7.1 — Restaurant Lifecycle Persistence Stability

- Favorisieren schreibt keinen ungültigen Reservierungsstatus mehr.
- Null- und Leerwerte werden vor Lifecycle-Updates entfernt.
- Die Datenbank-RPC akzeptiert nur gültige Reservierungsstatus und behält andernfalls den vorhandenen Wert.
- Gateway-Fehler werden verständlich normalisiert.
- Der Service Worker erzeugt bei fehlgeschlagenen Same-Origin-Requests keine unbehandelte Fetch-Rejection mehr.
