# Luvia v13.46.0 / Core 4.46.0

## Resy Adapter Foundation

- Adds a first-class Resy provider adapter to the Booking Core.
- Promotes Resy from discovery-only to partner-required API foundation.
- Models Resy venue and reservation references through the shared provider-reference seam.
- Prepares availability/create/get/cancel adapter contracts without enabling unverified live transport.
- Keeps provider status ingestion disabled until a verified Resy partner status contract exists.
- Expected `PARTNER_REQUIRED` remains a controlled business state rather than a transport error.
- No credentials are exposed to the browser.
- Existing clean-console/network reliability behavior from v13.45.1 is preserved.
