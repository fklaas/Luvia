# Tests – v13.45.0 / Core 4.45.0

Automated checks completed:

- `node --check core/booking/providers/sevenrooms-adapter.js` PASS
- `node --check core/runtime/network-guard.js` PASS
- `node --check core/collaboration/collaboration-service.js` PASS
- `node --check core/recommendations/schedule-intelligence-service.js` PASS
- `node --check intelligence/backend-service.js` PASS
- `node tests/booking-sevenrooms-adapter-v13.45.0.test.cjs` PASS
  - marker: `LUVIA_V13_45_0_SEVENROOMS_ADAPTER_FOUNDATION_OK`
- `node tests/console-network-reliability-v13.45.0.test.cjs` PASS
  - marker: `LUVIA_V13_45_0_CONSOLE_NETWORK_RELIABILITY_OK`
- `node tests/release-version-consistency.test.cjs` PASS
  - marker: `Build 13.45.0 / Core 4.45.0 release consistency: OK`

Required production smoke tests after migration/function deployment:
1. SevenRooms capability check.
2. Authenticated SevenRooms expected-state check.
3. Clean startup console check while online/authenticated.
4. Offline/online recovery check: no request storm while offline, automatic refresh after reconnect.
