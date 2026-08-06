# Luvia 13.29.5.2 / Core 4.29.5.2

- Direct thumbnail URLs are written into visible image elements during the first render.
- Visible gallery and lightbox images use eager loading and high fetch priority.
- Media, cluster and memory-album realtime subscriptions are restored.
- Realtime invalidates the gallery bootstrap snapshot and performs one debounced refresh.
- Gallery subscriptions are removed cleanly when leaving the view.
- Service-worker shell cache bumped to 13.29.5.2.
