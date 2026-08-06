# Regression checklist 13.29.5

- [ ] App, Core, kernel and service worker show 13.29.5 / 4.29.5.
- [ ] Gallery mount count increases only once per route opening.
- [ ] Exactly one `luvia_gallery_bootstrap` request occurs on initial opening.
- [ ] No direct `media_clusters`, `media_cluster_items`, `memory_albums` or `memory_album_items` queries occur from gallery components.
- [ ] No `preview.jpg` request occurs for day cards, photo cards, cluster cards or album covers.
- [ ] Visible card images come from `luvia-media-thumbnails` and are WebP thumbnails.
- [ ] Existing photos without completed backfill show a skeleton without downloading a large preview.
- [ ] “Euer Reisemoment” never overlays an actual image.
- [ ] Empty travel days retain the warm illustrated placeholder.
- [ ] Timeline actions for photos and clusters still work.
- [ ] Opening and leaving the gallery repeatedly does not create duplicate subscriptions or requests.
- [ ] Mobile buttons remain immediately interactive.
