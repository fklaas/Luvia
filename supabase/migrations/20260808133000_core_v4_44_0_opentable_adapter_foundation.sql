begin;

update public.booking_provider_capabilities
set metadata=metadata||jsonb_build_object(
 'adapter',jsonb_build_object(
   'version','1.0.0',
   'foundationReady',true,
   'restaurantReferenceType','rid',
   'reservationReferenceType','provider_reservation_id',
   'apiFamily','Online Booking API / Consumer API v2',
   'directoryApi',true,
   'directoryApiPurpose','restaurant_data_and_reservation_links',
   'authContract','partner_credentials_required',
   'liveTransportEnabled',false,
   'statusContract','unified_provenance_v1',
   'statusWebhookPubliclyVerified',false,
   'statusPolling',true,
   'partnerApplicationRequired',true
 )
)
where provider_id='opentable';

commit;
