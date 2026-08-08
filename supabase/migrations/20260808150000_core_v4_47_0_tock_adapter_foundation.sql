-- Luvia Core 4.48.0 · Build 13.48.0
-- Tock Adapter Foundation.
-- Public Tock API docs verify reservation/status data suitable for future polling.
-- Availability/create and webhook support are intentionally not claimed without a verified contract.
begin;

update public.booking_provider_capabilities
set
  integration_tier='external_handoff',
  booking_mode='handoff',
  luvia_access_state='partner_required',
  supports_availability=false,
  supports_create_reservation=false,
  supports_status_webhook=null,
  supports_status_polling=true,
  attribution_mode='none',
  commercial_access='partner_required',
  metadata=metadata||jsonb_build_object(
    'adapter',jsonb_build_object(
      'version','1.0.0',
      'foundationReady',true,
      'businessReferenceType','tock_business_id_or_domain_reference',
      'reservationReferenceType','tock_reservation_id',
      'publicApiSurface','reservation_data_model',
      'stableReservationIdPubliclyDocumented',true,
      'confirmationCodePubliclyDocumented',true,
      'partyStatePubliclyDocumented',true,
      'sequenceIdPubliclyDocumented',true,
      'lastUpdatedTimestampPubliclyDocumented',true,
      'isCancelledPubliclyDocumented',true,
      'statusPollingPubliclyVerified',true,
      'availabilityPubliclyVerified',false,
      'createReservationPubliclyVerified',false,
      'statusWebhookPubliclyVerified',false,
      'authContract','partner_or_business_access_required',
      'liveTransportEnabled',false,
      'statusContract','unified_provenance_v1',
      'partnerApplicationRequired',true
    )
  )
where provider_id='tock';

commit;
