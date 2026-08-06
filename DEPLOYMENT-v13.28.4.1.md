# Deployment 13.28.5

Keine Datenbankmigration.

Da die Bildanalyse als neue Capability in `luvia-intelligence` ergänzt wurde:

```bash
supabase functions deploy luvia-intelligence
```

Danach Frontend deployen:

```bash
git add .
git commit -m "fix: polish gallery realtime timeline and global location"
git push
```

Keine Secrets ändern. Danach `force-update.html` ausführen und App 13.28.5 / Core 4.28.5 prüfen.
