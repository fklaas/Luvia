# Deployment · Luvia v9.22.0 / Core V2.12.4

## 1. Supabase Edge Function

Im entpackten Projektstamm, in dem der Ordner `supabase` liegt:

```powershell
supabase login
supabase link --project-ref yiadkcxgyzdgyadnhyqe
supabase functions deploy luvia-gateway --project-ref yiadkcxgyzdgyadnhyqe --use-api
```

Das bestehende Secret `GOOGLE_PLACES_API_KEY` wird weiterverwendet. Es ist kein neues Secret erforderlich.

Prüfung:

```powershell
supabase functions list --project-ref yiadkcxgyzdgyadnhyqe
supabase secrets list --project-ref yiadkcxgyzdgyadnhyqe
```

## 2. SQL

Für Core V2.12.4 ist keine neue SQL-Migration erforderlich. Die Reiseaktionen verwenden den vorhandenen Restaurant-Importvertrag und die vorhandenen Tabellen/RPCs.

## 3. Web-App

Das vollständige Paket auf den produktiven Branch übertragen und deployen. Anschließend die PWA vollständig neu laden. Der Cache-Name lautet `luvia-shell-v9.22.0`.
