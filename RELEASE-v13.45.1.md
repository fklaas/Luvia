# Luvia v13.45.1 / Core 4.45.1

## Final Console Reliability Fix

This patch closes the two remaining Luvia-owned console errors observed after v13.45.0.

### Fixed
- Presence heartbeat bootstrap race: presence writes no longer fire immediately while auth/session/network hydration is still settling.
- Heartbeat calls are single-flight and session-epoch guarded, so stale session/trip transitions cannot launch overlapping RPCs.
- Online/auth transitions use a short readiness barrier before restarting heartbeats.
- `luvia-gateway` now answers CORS preflight before auth/content validation and echoes the browser's requested headers for approved origins.
- Gateway health diagnostics now report the current Core/Build version.
- Runtime/app exposed version markers updated to v13.45.1 / Core 4.45.1.

### Not a Luvia error
Browser-extension message-channel errors such as `No listener: tabs:outgoing.message.ready` or `message channel closed` are outside the web app and cannot be fixed by Luvia code.
