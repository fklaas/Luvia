# Test v13.42.0

- Provider adapter registration and syntax.
- Quandoo capability remains `partner_required`.
- Merchant reference accepts numeric merchant IDs only.
- Known Quandoo webhook notification vocabulary maps to unified Luvia statuses.
- Unknown notification type maps to null.
- Automatic provider status remains blocked until provider is connected.
- Edge Function uses JWT and CORS.
- Expected partner-required state returns handled JSON instead of a non-2xx transport error.
- No credentials are exposed to the client.
