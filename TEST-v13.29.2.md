# Test 13.29.2

- JavaScript syntax checks for all changed runtime files.
- ZIP integrity verification.
- Verify application version: 13.29.2 / Core 4.29.2.
- Verify cluster cards never report a nonzero badge with an empty `mediaIds` collection after migration.
- Verify first gallery open stays interactive during preview loading.
- Verify second gallery open reads preview images from `luvia-media-previews-v13.29.2` Cache Storage.
- Verify no `luvia-gateway` or place reanalysis request is started by gallery initialization.
- Target gallery data budget: media, albums, polaroids and clusters only; duplicate reads reuse in-flight promises.
