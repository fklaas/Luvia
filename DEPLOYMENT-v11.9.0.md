# Deployment 11.9.0

1. Migrationen ausführen:
   `supabase db push`
2. Neue Migration:
   `20260727_017_core_v3_7_0_recommendation_complete_foundation.sql`
3. Gateway neu deployen:
   `supabase functions deploy luvia-gateway`
4. Projekt deployen.
5. App und Developer Console mit `?v=11.9.0` öffnen.
