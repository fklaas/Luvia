# Booking contact resolver deployment

Deploy the new Edge Function `booking-contact-resolve` in the production Luvia Supabase project with JWT verification ON.

No new user-managed secret is required. The function uses Supabase runtime environment variables and the existing Booking Core discovery tables/RPCs.

Purpose: resolve a provider contact only from evidence on an official public website. It never fabricates an email address.
