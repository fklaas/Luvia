-- Luvia v13.54.2 / Core 4.54.2
-- Verified Provider Transition Fix
-- Allows ready -> confirmed only inside the protected provider-status apply core when the
-- signal came from a trusted verified provider contract. The shared user/system transition
-- matrix remains unchanged, so handoff, affiliate, client and unverified paths cannot use it.

begin;

create or replace function public.luvia_booking_apply_provider_status_internal(
  p_booking_id uuid,
  p_provider text,
  p_provider_reference text,
  p_provider_status text,
  p_luvia_status text,
  p_source text,
  p_event_id text default null,
  p_payload jsonb default '{}'::jsonb,
  p_occurred_at timestamptz default null,
  p_require_connected boolean default true
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  b public.bookings;
  c public.booking_provider_capabilities;
  v_status text;
  v_source text;
  v_event public.booking_status_updates;
  v_old text;
  v_trusted_ready_confirmation boolean := false;
begin
  v_status:=lower(trim(coalesce(p_luvia_status,'')));
  v_source:=lower(trim(coalesce(p_source,'')));

  if v_status not in ('requested','awaiting_reply','alternative_proposed','needs_action','confirmed','declined','cancelled','failed') then
    raise exception 'PROVIDER_STATUS_TARGET_INVALID';
  end if;
  if v_source not in ('provider_webhook','provider_api','provider_polling') then
    raise exception 'PROVIDER_STATUS_SOURCE_INVALID';
  end if;

  select * into b from public.bookings where id=p_booking_id for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;

  select * into c
  from public.booking_provider_capabilities
  where provider_id=lower(trim(coalesce(p_provider,''))) and active=true;
  if not found then raise exception 'PROVIDER_CAPABILITY_NOT_FOUND'; end if;

  if p_require_connected and c.luvia_access_state<>'connected' then
    raise exception 'PROVIDER_NOT_CONNECTED_FOR_STATUS';
  end if;
  if v_source='provider_webhook' and c.supports_status_webhook is distinct from true then
    raise exception 'PROVIDER_WEBHOOK_STATUS_NOT_ENABLED';
  end if;
  if v_source='provider_polling' and c.supports_status_polling is distinct from true then
    raise exception 'PROVIDER_POLLING_STATUS_NOT_ENABLED';
  end if;

  if p_event_id is not null then
    select * into v_event
    from public.booking_status_updates
    where provider_id=c.provider_id and source=v_source and source_event_id=p_event_id
    limit 1;
    if found then
      return jsonb_build_object('duplicate',true,'updateId',v_event.id,'bookingId',v_event.booking_id,'status',v_event.luvia_status);
    end if;
  end if;

  -- A verified provider contract can legitimately confirm an API/webhook/polling booking
  -- directly from `ready`. `p_require_connected=false` is only passed by the protected
  -- contract reprocessor after verification; it is not exposed to browser/client callers.
  v_trusted_ready_confirmation :=
    b.status='ready'
    and v_status='confirmed'
    and v_source in ('provider_webhook','provider_api','provider_polling')
    and p_require_connected=false;

  if not public.luvia_booking_transition_allowed(b.status,v_status)
     and not v_trusted_ready_confirmation then
    raise exception 'INVALID_PROVIDER_STATUS_TRANSITION: % -> %',b.status,v_status;
  end if;

  v_old:=b.status;
  update public.bookings
  set status=v_status,
      provider=c.provider_id,
      provider_reference=coalesce(nullif(trim(coalesce(p_provider_reference,'')),''),provider_reference),
      status_source=v_source,
      status_source_ref=coalesce(nullif(trim(coalesce(p_event_id,'')),''),nullif(trim(coalesce(p_provider_reference,'')),'')),
      status_verified_at=coalesce(p_occurred_at,now()),
      updated_at=now(),
      confirmed_at=case when v_status='confirmed' then coalesce(confirmed_at,coalesce(p_occurred_at,now())) else confirmed_at end,
      cancelled_at=case when v_status='cancelled' then coalesce(cancelled_at,coalesce(p_occurred_at,now())) else cancelled_at end
  where id=b.id
  returning * into b;

  insert into public.booking_status_updates(
    booking_id,trip_id,provider_id,provider_reference,provider_status,luvia_status,source,source_event_id,evidence,occurred_at,applied
  ) values (
    b.id,b.trip_id,c.provider_id,b.provider_reference,nullif(trim(coalesce(p_provider_status,'')),''),v_status,v_source,
    nullif(trim(coalesce(p_event_id,'')),''),
    coalesce(p_payload,'{}'::jsonb)||jsonb_build_object('trustedReadyConfirmation',v_trusted_ready_confirmation),
    coalesce(p_occurred_at,now()),true
  ) returning * into v_event;

  insert into public.booking_events(booking_id,trip_id,event_type,from_status,to_status,payload)
  values(
    b.id,b.trip_id,'booking.provider.status.applied',v_old,v_status,
    jsonb_build_object(
      'provider',c.provider_id,
      'providerStatus',p_provider_status,
      'providerReference',b.provider_reference,
      'source',v_source,
      'sourceEventId',p_event_id,
      'statusUpdateId',v_event.id,
      'trustedInternalContract',not p_require_connected,
      'trustedReadyConfirmation',v_trusted_ready_confirmation
    )
  );

  return jsonb_build_object(
    'duplicate',false,
    'booking',to_jsonb(b),
    'statusUpdateId',v_event.id,
    'trustedReadyConfirmation',v_trusted_ready_confirmation
  );
end $$;

revoke all on function public.luvia_booking_apply_provider_status_internal(uuid,text,text,text,text,text,text,jsonb,timestamptz,boolean)
from public,anon,authenticated,service_role;

comment on function public.luvia_booking_apply_provider_status_internal(uuid,text,text,text,text,text,text,jsonb,timestamptz,boolean)
is 'Protected database-only provider-status apply core. Verified provider contracts may allow ready -> confirmed while public/client transition rules remain unchanged.';

commit;
