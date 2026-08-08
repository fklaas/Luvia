# Test – Luvia v13.45.1 / Core 4.45.1

## Automated/static checks
- Presence single-flight guard present.
- Session epoch/readiness barrier present.
- Immediate bootstrap heartbeat removed.
- Gateway OPTIONS handling happens before origin/auth/content checks.
- Requested preflight headers are echoed for approved origins.
- `luvia-gateway` remains `verify_jwt = false` because auth is enforced inside the gateway per action.
- Build/Core/cache-bust version consistency checked.
- JavaScript syntax checks passed.

## Production smoke test
1. Reload Luvia while authenticated.
2. Keep console open for 30+ seconds.
3. Navigate Today → Plan → Trip → Bookings.
4. Expected: no Luvia-owned red `luvia_presence_heartbeat` connection-closed error.
5. Trigger a Places/restaurant refresh that uses `luvia-gateway`.
6. Expected: no CORS preflight error from `https://myluvia.app`.
