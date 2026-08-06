# Luvia 13.29.7.1 / Core 4.29.7.1

## Gallery image source recovery

- Removed the gallery's dependency on public thumbnail URLs for existing media.
- Gallery, day folders, favorites and photo moments now receive one batched signed 640px source map from the canonical private media source.
- If transformed URL signing is unavailable, the same batch falls back to signed source files.
- Removed the second bootstrap during initial gallery mount.
- Places, Foursquare, Memory Albums and all non-gallery modules remain unchanged.
