# Deployment – Luvia 13.15.0 / Core 4.15.0

## 1. Datenbank

Keine neue SQL-Migration erforderlich.

Der kanonische Typ bleibt `mobility`. Bereits gespeicherte Transport- und Mobilitätspunkte werden durch die Trennung in **Move** nicht migriert oder dupliziert.

## 2. Supabase Edge Function

Im entpackten Projektordner mit dem Unterordner `supabase`:

```bash
supabase functions deploy luvia-gateway
```

Der Gateway erhält damit die aktuelle Versionsausgabe 13.15.0 / 4.15.0. Die Move-Suche verwendet weiterhin die bestehende universelle Places-Pipeline.

## 3. Secrets

Keine neuen Secrets erforderlich.

Der vorhandene Google-Key muss Zugriff auf **Places API (New)** besitzen. Fahrradrouten-, Trailforks- und openrouteservice-Secrets werden nicht benötigt.

## 4. Frontend

```bash
git add .
git commit -m "feat(move): extract mobility from Places into its own domain"
git push
```

## 5. PWA-Cache

Neuer Cache:

```text
luvia-shell-v13.15.0
```

Nach dem Deployment:

1. alle Luvia-Tabs schließen,
2. die installierte PWA vollständig beenden,
3. einmal `force-update.html` öffnen,
4. Luvia neu starten.
