# Test 13.1.3.5

1. Change a planned place time and verify the timeline updates immediately.
2. Hard reload once; entries must be visible immediately from local cache and remain after remote reconciliation.
3. Clear browser storage; reload and verify entries load from Supabase in one deterministic pass.
4. Click a free-time suggestion; verify it is saved before Today refresh and survives reload.
