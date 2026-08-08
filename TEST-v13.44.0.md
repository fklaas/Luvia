# Tests v13.44.0

- OpenTable adapter loads and registers.
- RID normalization accepts numeric OpenTable restaurant IDs and rejects non-numeric values.
- Conservative provider-status mapping returns null for unknown states.
- Partner-required access cannot auto-apply `confirmed`.
- Edge Function has CORS and JWT enabled.
- Expected partner-required state uses HTTP 200 controlled response.
- No OpenTable credential is shipped to the browser.
- Existing TheFork, Quandoo and Zenchef adapter tests remain green.
- Release consistency matches Build 13.44.0 / Core 4.44.0.
