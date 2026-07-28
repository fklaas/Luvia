# Luvia 12.1.2 · Core 3.9.2

## Diagnostics Cache & Dependency Compatibility

- Legacy dependency alias `restaurants` is normalized to `recommendations`.
- Service Registry diagnostics no longer collapse when an old cached service definition is present.
- All kernel and diagnostics scripts now use explicit 12.1.2 cache-busting.
- Cloudflare Pages headers disable caching for HTML diagnostics and the service worker.
- Developer Console and Core Diagnose remain renderable even during partial service failures.
