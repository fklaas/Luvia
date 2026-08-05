# Tests 13.29.1

- Albumübersicht wird ohne vollständigen Medien-/Cluster-Reload interaktiv.
- Wizard-Buttons funktionieren sofort auf Mobilgeräten, auch während Bilder laden.
- Maximal kleine Bild-Batches werden parallel hydratisiert.
- Titelvorschläge erscheinen lokal sofort; AI ergänzt asynchron.
- Teilnehmer, Ort und Zeitraum werden in Album-Metadaten persistiert.
- Lieblingsfoto wird je angemeldetem Teilnehmer in `memory_album_favorites` gespeichert.
- Überraschungsmodus setzt Titel, Stimmung, Cover und Lieblingsfoto vor, bleibt editierbar.
- Realtime löst keinen Request-Sturm durch `memory_album_items` aus.
