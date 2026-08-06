# Deployment v9.22.3

## 1. Supabase Gateway
Da die vegetarische Nachfilterung im Gateway korrigiert wurde, muss `luvia-gateway` erneut deployt werden.

```powershell
supabase login
supabase link --project-ref yiadkcxgyzdgyadnhyqe
supabase functions deploy luvia-gateway --project-ref yiadkcxgyzdgyadnhyqe --use-api
```

## 2. SQL
Keine neue SQL-Migration. Favoriten verwenden weiterhin das bestehende Feld `trip_places.is_favorite`.

## 3. Web-App
Gesamtpaket übernehmen, committen und deployen. Danach App vollständig schließen und neu öffnen. Cache: `luvia-shell-v9.22.3`.
