-- Luvia Core 4.48.0 · Build 13.48.0
-- Official Booking Engines & Provider Detection V2.
-- Discovery rows only: no API, webhook, polling or commercial access is claimed.
begin;

insert into public.booking_provider_capabilities(
  provider_id,display_name,integration_tier,booking_mode,luvia_access_state,
  supports_availability,supports_create_reservation,supports_status_webhook,supports_status_polling,
  attribution_mode,commercial_access,metadata
)
values
 ('covermanager','CoverManager','external_handoff','handoff','discovery',null,null,null,null,'none','unknown','{"capabilityBasis":"venue_handoff_detection","detectionVersion":"2.0.0","liveTransportEnabled":false}'::jsonb),
 ('resdiary','ResDiary','external_handoff','handoff','discovery',null,null,null,null,'none','unknown','{"capabilityBasis":"venue_handoff_detection","detectionVersion":"2.0.0","liveTransportEnabled":false}'::jsonb),
 ('tablecheck','TableCheck','external_handoff','handoff','discovery',null,null,null,null,'none','unknown','{"capabilityBasis":"venue_handoff_detection","detectionVersion":"2.0.0","liveTransportEnabled":false}'::jsonb),
 ('formitable','Formitable','external_handoff','handoff','discovery',null,null,null,null,'none','unknown','{"capabilityBasis":"venue_handoff_detection","detectionVersion":"2.0.0","liveTransportEnabled":false}'::jsonb),
 ('aleno','aleno','external_handoff','handoff','discovery',null,null,null,null,'none','unknown','{"capabilityBasis":"venue_handoff_detection","detectionVersion":"2.0.0","liveTransportEnabled":false}'::jsonb),
 ('simpleerb','simpleERB','external_handoff','handoff','discovery',null,null,null,null,'none','unknown','{"capabilityBasis":"venue_handoff_detection","detectionVersion":"2.0.0","liveTransportEnabled":false}'::jsonb)
on conflict(provider_id) do update set
 display_name=excluded.display_name,
 integration_tier=excluded.integration_tier,
 booking_mode=excluded.booking_mode,
 luvia_access_state=case when booking_provider_capabilities.luvia_access_state='connected' then 'connected' else excluded.luvia_access_state end,
 metadata=booking_provider_capabilities.metadata||excluded.metadata,
 updated_at=now();

update public.booking_provider_capabilities
set metadata=metadata||jsonb_build_object(
  'providerDetection',jsonb_build_object(
    'version','2.0.0','officialWebsiteCrawl',true,'iframeAndFormDetection',true,
    'dataAttributeDetection',true,'embeddedConfigDetection',true,
    'venueVerificationRequired',true,'legalLinkRejection',true,'handoffHealthValidation',true
  )
),updated_at=now()
where provider_id='official';

commit;
