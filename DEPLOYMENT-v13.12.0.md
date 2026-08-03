# Deployment 13.12.0

## 1. Datenbank
Keine neue Migration. Die Migration `20260730_036_core_v4_11_0_cycling_route_place_type.sql` muss bereits angewendet sein.

## 2. Supabase Secrets
```bash
supabase secrets set TRAILFORKS_APP_ID="..."
supabase secrets set TRAILFORKS_APP_SECRET="..."
supabase secrets set OPENROUTESERVICE_API_KEY="..."
```

Optional, falls Trailforks im freigeschalteten Entwicklerportal einen abweichenden Trails-Endpunkt nennt:
```bash
supabase secrets set TRAILFORKS_TRAILS_ENDPOINT="https://..."
```

Optional für eine eigene ORS-Instanz:
```bash
supabase secrets set OPENROUTESERVICE_BASE_URL="https://.../v2/directions"
```

## 3. Gateway
```bash
supabase functions deploy luvia-gateway
```

## 4. Frontend
```bash
git add .
git commit -m "feat(cycling): add Trailforks hybrid discovery and partner deep links"
git push
```

## 5. PWA
Cache: `luvia-shell-v13.12.0`. Danach `force-update.html` öffnen.
