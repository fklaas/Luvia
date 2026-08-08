-- Luvia Core 4.46.0 · Build 13.46.0
-- Resy Adapter Foundation.
begin;

update public.booking_provider_capabilities
set
  integration_tier='external_handoff',
  booking_mode='handoff',
  luvia_access_state='partner_required',
  supports_availability=true,
  supports_create_reservation=true,
  supports_status_webhook=null,
  supports_status_polling=null,
  attribution_mode='none',
  commercial_access='partner_required',
  metadata=metadata||jsonb_build_object(
    'adapter',jsonb_build_object(
      'version','1.0.0',
      'foundationReady',true,
      'venueReferenceType','provider_venue_reference',
      'reservationReferenceType','provider_reservation_reference',
      'publicApiSurface','booking_api_and_discovery_integrations',
      'widgetVenueIdPubliclyDocumented',true,
      'widgetApiKeyPubliclyDocumented',true,
      'authContract','partner_contract_required',
      'liveTransportEnabled',false,
      'statusContract','unified_provenance_v1',
      'statusWebhookPubliclyVerified',false,
      'statusPollingPubliclyVerified',false,
      'partnerApplicationRequired',true
    )
  )
where provider_id='resy';

commit;
