begin;

update public.booking_provider_capabilities
set metadata=metadata||jsonb_build_object(
 'adapter',jsonb_build_object(
   'version','1.0.0',
   'foundationReady',true,
   'apiBase','https://api.quandoo.com/v1',
   'merchantReferenceType','numeric_id',
   'reservationReferenceType','provider_reference',
   'authHeader','X-Quandoo-AuthToken',
   'attributionParameter','agent_id',
   'liveTransportEnabled',false,
   'statusContract','unified_provenance_v1',
   'webhookRegistration','manual_partner_contact'
 )
), attribution_mode='click'
where provider_id='quandoo';

commit;
