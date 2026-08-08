# Tests – v13.46.0 / Core 4.46.0

Automated checks:
- Resy adapter JavaScript syntax PASS.
- Resy provider foundation test PASS.
- Final console reliability regression PASS.
- Release version consistency PASS.

Required production smoke tests:
1. Resy capability row is `partner_required` with availability/create enabled and unverified status callbacks left null.
2. Authenticated `booking-provider-resy` availability call returns controlled `PARTNER_REQUIRED` with `error=null` at Supabase invoke level.
3. Clean-console regression remains free of Luvia-owned red errors.
