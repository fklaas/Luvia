# Deployment 13.28.6

1. Deploy the complete project to Cloudflare/GitHub.
2. No database migration is required.
3. Deploy `luvia-gateway` only when the production function does not yet include `places.nearby-search`. The supplied project already contains that action.
4. Open `force-update.html` once on cached devices.
5. Test one untouched iPhone HEIC original and one JPEG original with location enabled.

External runtime dependencies loaded by `index.html`: `heic2any@0.0.4`, `exifr@7.1.3`.
