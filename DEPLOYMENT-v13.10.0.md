# Deployment – Build 13.10.0

## 1. SQL
Keine SQL-Migration erforderlich.

## 2. Supabase Edge Function
Aus dem entpackten Projektordner mit dem Unterordner `supabase`:

```bash
supabase functions deploy luvia-gateway
```

Das Deployment aktualisiert die zentrale Health-/Versionsausgabe auf Build 13.10.0 / Core 4.10.0. Neue Secrets sind nicht erforderlich.

## 3. Frontend
```bash
git add .
git commit -m "feat(places): add nature and excursion intelligence"
git push
```

## 4. PWA
Neuer Cache: `luvia-shell-v13.10.0`.
Alle Luvia-Tabs und die installierte PWA vollständig schließen und neu öffnen. Bei einem alten Cache einmal `force-update.html` öffnen.
