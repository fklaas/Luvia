# Luvia 13.4.1 – Universal Place Detail, Schedule & Timeline Contract

- Restaurant-derived detail renderer is now the single Place detail shell.
- Restaurant and accommodation details use the same lifecycle, intelligence, schedule, participant, suggestion and alternative slots.
- Accommodation check-in/out persistence waits for cloud completion and writes deterministic Timeline events.
- Dashboard and Today refresh immediately after Place planning changes.
- GPS remains the only distance source.
- Migration 031 corrects the real `module_key` schema and adds schedule/timeline indexes.
