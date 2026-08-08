-- Luvia Core 4.40.0 provider/status smoke (safe read checks first)
select provider_id,display_name,integration_tier,booking_mode,luvia_access_state,
       supports_availability,supports_create_reservation,supports_status_webhook,supports_status_polling,attribution_mode
from public.booking_provider_capabilities
where active=true
order by provider_id;

select column_name,data_type
from information_schema.columns
where table_schema='public' and table_name='bookings'
  and column_name in ('status','status_source','status_source_ref','status_verified_at')
order by column_name;

select to_regclass('public.booking_status_updates') as booking_status_updates_table;

-- Expected security invariant: provider rows remain partner_required/discovery until credentials are really connected.
select provider_id,luvia_access_state
from public.booking_provider_capabilities
where provider_id in ('thefork','zenchef','quandoo','opentable','sevenrooms')
order by provider_id;
