# Luvia Core 4.0.2.1 / Build 13.0.2.1

## Place Migration Completion

This compatibility completion connects all productive restaurant lifecycle writes to the universal Place Core.

### Completed
- Restaurant import results are normalized and registered as canonical Places.
- Save, favorite, plan, reservation and visit actions update the Restaurant backend and Place Core in one flow.
- Manual "Besucht" actions call the Presence & Visit Core with the real canonical `places.id`.
- Manual visits create a canonical visit record and timeline event.
- Restaurant workspace lifecycle changes use the same migration bridge.
- UI update events now expose the canonical Place ID.

### Compatibility
The Restaurant service remains the persistent compatibility writer for existing restaurant tables. The Place Core is the canonical cross-module runtime representation. No second Restaurant service or duplicate entity is introduced.

### Database
No new migration is required.
