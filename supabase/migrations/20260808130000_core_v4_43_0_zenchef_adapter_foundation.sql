begin;

update public.booking_provider_capabilities
set metadata=metadata||jsonb_build_object(
 'adapter',jsonb_build_object(
   'version','1.0.0',
   'foundationReady',true,
   'restaurantReferenceType','provider_restaurant_id',
   'reservationReferenceType','provider_reservation_id',
   'authContract','partner_documentation_required',
   'liveTransportEnabled',false,
   'statusContract','unified_provenance_v1',
   'webhookSupported',true,
   'webhookConfiguration','ZenchefOS',
   'webhookLimit','one_url_per_restaurant',
   'sourceAttribution','partner_tag_when_available'
 )
)
where provider_id='zenchef';

commit;
