# Tests — v13.48.0 / Core 4.48.0

Automated checks:
- Tock adapter JavaScript syntax PASS.
- Tock provider foundation test PASS.
- Final console reliability regression PASS.
- Release version consistency PASS.

Required production smoke tests:
1. Tock capability row is `partner_required`, availability/create false, webhook null, status polling true.
2. Authenticated `booking-provider-tock` `poll_status` call returns controlled `PARTNER_REQUIRED` with `error=null` at Supabase invoke level.
3. Clean-console regression remains free of Luvia-owned red errors.
