# Deployment v13.51.0 / Core 4.51.0

1. Vollständige Web-App deployen.
2. Migration im Supabase SQL Editor ausführen:
   `supabase/migrations/20260808181500_core_v4_51_0_booking_correlation_conversion_foundation.sql`
3. Keine neuen Secrets.
4. Keine neue Edge Function erforderlich.
5. Optional `luvia-gateway` neu deployen, damit Health/Diagnostics Build 13.51.0 / Core 4.51.0 melden:
   `supabase functions deploy luvia-gateway --no-verify-jwt`

## Smoke Test 1
```sql
select count(*) as correlations from public.booking_correlations;
select count(*) as conversion_reports from public.booking_conversion_reports;
```

## Smoke Test 2
```sql
select correlation_id,trip_id,booking_id,provider_id,correlation_state,conversion_report_count,latest_conversion
from public.booking_correlation_conversion_summary
order by handoff_correlated_at desc
limit 10;
```

Erwartung: Die bereits vorhandenen v13.50-Handoffs besitzen nach der Migration eine `correlation_id`, auch wenn `booking_id` noch `null` ist.
