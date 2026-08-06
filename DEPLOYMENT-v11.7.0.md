# Deployment Luvia 11.7.0

1. Den vollständigen Inhalt dieses Projekts ins Repository übernehmen.
2. Datenbankmigrationen ausführen:

```bash
supabase db push
```

Dadurch werden insbesondere diese Migrationen eingespielt:
- `20260727_013_core_v3_4_2_live_collaboration.sql`
- `20260727_014_core_v3_5_0_travel_context_restaurant_lifecycle.sql`

3. Da neue Gateway-Aktionen enthalten sind, die Edge Function neu deployen:

```bash
supabase functions deploy luvia-gateway
```

4. Website deployen und einmal mit Cache-Buster öffnen:

```text
https://myluvia.app/index.html?v=11.7.0
```

5. Falls ein alter Service Worker aktiv ist, Seite einmal vollständig schließen und neu öffnen.
