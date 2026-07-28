# Luvia 13.1.3.6 — Deterministic Schedule Hydration

- Persistent schedule is hydrated immediately from local storage and deterministically reconciled with Supabase.
- Persisted universal schedule events are authoritative over stale restaurant planning fields.
- Schedule writes are awaited before Today Intelligence refreshes.
- Forced refreshes queue instead of being dropped during an active refresh.
- Timeline time changes survive hard reloads and appear immediately.
