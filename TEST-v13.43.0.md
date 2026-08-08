# Test v13.43.0

- Zenchef provider adapter loads and registers.
- Zenchef capability remains `partner_required` until real access exists.
- Venue/reservation references reject unsafe/empty values.
- Semantically unambiguous provider statuses map to unified Luvia statuses; unknown values map to null.
- Automatic provider status remains blocked until capability is `connected`.
- `booking-provider-zenchef` uses JWT and CORS.
- Availability/create/update calls return controlled `PARTNER_REQUIRED` while access is absent.
- No undocumented Zenchef auth header or live endpoint is guessed.
- Existing TheFork `PARTNER_REQUIRED` state is normalized to handled JSON instead of HTTP 409.
- Existing Quandoo adapter remains unchanged.
