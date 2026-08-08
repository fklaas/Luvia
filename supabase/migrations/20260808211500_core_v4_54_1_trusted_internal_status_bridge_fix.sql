-- Luvia v13.54.1 / Core 4.54.1
-- Trusted Internal Status Bridge Fix
-- Separates externally callable service-role ingress from internal SECURITY DEFINER processing.
-- Internal functions are not executable by public/anon/authenticated/service_role; only owner-owned
-- SECURITY DEFINER database functions can use them. Verified provider contracts may bypass the
-- commercial access-state gate only inside the trusted reprocessor after contract verification.

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

  -- Normal external/service-role provider ingress still requires a connected provider.
  -- A verified provider-status contract may bypass only this commercial connection gate when
  -- invoked by the protected internal reprocessor. Transport capability remains mandatory.
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

  if not public.luvia_booking_transition_allowed(b.status,v_status) then
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
    nullif(trim(coalesce(p_event_id,'')),''),coalesce(p_payload,'{}'::jsonb),coalesce(p_occurred_at,now()),true
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
      'trustedInternalContract',not p_require_connected
    )
  );

  return jsonb_build_object('duplicate',false,'booking',to_jsonb(b),'statusUpdateId',v_event.id);
end $$;

revoke all on function public.luvia_booking_apply_provider_status_internal(uuid,text,text,text,text,text,text,jsonb,timestamptz,boolean) from public,anon,authenticated,service_role;

-- Keep the existing public service-role seam unchanged. It delegates to the internal core and
-- always requires the provider to be explicitly connected.
create or replace function public.luvia_booking_apply_provider_status(
  p_booking_id uuid,p_provider text,p_provider_reference text,p_provider_status text,p_luvia_status text,p_source text,
  p_event_id text default null,p_payload jsonb default '{}'::jsonb,p_occurred_at timestamptz default null
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role' then
    raise exception 'SERVICE_ROLE_REQUIRED';
  end if;
  return public.luvia_booking_apply_provider_status_internal(
    p_booking_id,p_provider,p_provider_reference,p_provider_status,p_luvia_status,p_source,
    p_event_id,p_payload,p_occurred_at,true
  );
end $$;
revoke all on function public.luvia_booking_apply_provider_status(uuid,text,text,text,text,text,text,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.luvia_booking_apply_provider_status(uuid,text,text,text,text,text,text,jsonb,timestamptz) to service_role;

create or replace function public.luvia_booking_ingest_status_signal_internal(
  p_booking_id uuid,
  p_provider_id text,
  p_provider_reference text,
  p_provider_status text,
  p_proposed_luvia_status text,
  p_source text,
  p_source_event_id text default null,
  p_confidence numeric default null,
  p_evidence jsonb default '{}'::jsonb,
  p_occurred_at timestamptz default null,
  p_trusted_provider_contract boolean default false
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  b public.bookings;
  s public.booking_status_signals;
  existing public.booking_status_signals;
  latest public.booking_status_signals;
  v_source text;
  v_status text;
  v_authority integer;
  v_latest_authority integer;
  applied jsonb;
  update_id uuid;
begin
  select * into b from public.bookings where id=p_booking_id for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;

  v_source:=lower(trim(coalesce(p_source,'')));
  v_status:=lower(trim(coalesce(p_proposed_luvia_status,'')));
  if v_source not in ('system','handoff','provider_webhook','provider_api','provider_polling','affiliate_callback','email_reply','user_confirmation') then
    raise exception 'STATUS_SIGNAL_SOURCE_INVALID';
  end if;
  if v_status not in ('requested','awaiting_reply','alternative_proposed','needs_action','confirmed','declined','cancelled','failed') then
    raise exception 'STATUS_SIGNAL_TARGET_INVALID';
  end if;

  if p_source_event_id is not null then
    select * into existing from public.booking_status_signals
    where source=v_source and source_event_id=p_source_event_id limit 1;
    if found then return jsonb_build_object('duplicate',true,'signal',to_jsonb(existing)); end if;
  end if;

  insert into public.booking_status_signals(
    booking_id,trip_id,provider_id,provider_reference,provider_status,proposed_luvia_status,source,source_event_id,confidence,evidence,occurred_at
  ) values (
    b.id,b.trip_id,nullif(lower(trim(coalesce(p_provider_id,''))),''),nullif(trim(coalesce(p_provider_reference,'')),''),
    nullif(trim(coalesce(p_provider_status,'')),''),v_status,v_source,nullif(trim(coalesce(p_source_event_id,'')),''),
    case when p_confidence is null then null else greatest(0,least(1,p_confidence)) end,
    coalesce(p_evidence,'{}'::jsonb)||jsonb_build_object('trustedProviderContract',p_trusted_provider_contract),
    coalesce(p_occurred_at,now())
  ) returning * into s;

  if v_status='confirmed' and v_source in ('handoff','affiliate_callback') then
    update public.booking_status_signals set resolution_state='ignored',resolution_reason='NON_CONFIRMING_SOURCE'
    where id=s.id returning * into s;
    return jsonb_build_object('duplicate',false,'applied',false,'signal',to_jsonb(s));
  end if;

  v_authority:=public.luvia_booking_status_source_authority(v_source);
  select * into latest
  from public.booking_status_signals
  where booking_id=b.id and id<>s.id and resolution_state='applied'
  order by occurred_at desc,received_at desc limit 1;

  if found then
    v_latest_authority:=public.luvia_booking_status_source_authority(latest.source);
    if v_latest_authority>v_authority and latest.proposed_luvia_status<>v_status then
      update public.booking_status_signals set resolution_state='ignored',resolution_reason='LOWER_AUTHORITY_THAN_APPLIED_SIGNAL'
      where id=s.id returning * into s;
      return jsonb_build_object('duplicate',false,'applied',false,'signal',to_jsonb(s));
    end if;
    if v_latest_authority=v_authority and latest.proposed_luvia_status<>v_status
       and abs(extract(epoch from (s.occurred_at-latest.occurred_at)))<300 then
      update public.booking_status_signals set resolution_state='conflict',resolution_reason='EQUAL_AUTHORITY_CONFLICT' where id=s.id;
      update public.booking_status_signals set resolution_state='conflict',resolution_reason='EQUAL_AUTHORITY_CONFLICT' where id=latest.id;
      return jsonb_build_object('duplicate',false,'applied',false,'conflict',true,'signalId',s.id,'conflictsWith',latest.id);
    end if;
  end if;

  if v_source in ('provider_webhook','provider_api','provider_polling') then
    begin
      applied:=public.luvia_booking_apply_provider_status_internal(
        b.id,coalesce(p_provider_id,b.provider),p_provider_reference,p_provider_status,v_status,v_source,
        p_source_event_id,p_evidence,p_occurred_at,not p_trusted_provider_contract
      );
    exception when others then
      update public.booking_status_signals set resolution_state='ignored',resolution_reason=sqlerrm
      where id=s.id returning * into s;
      return jsonb_build_object('duplicate',false,'applied',false,'signal',to_jsonb(s));
    end;
    begin update_id:=(applied->>'statusUpdateId')::uuid; exception when others then update_id:=null; end;
  else
    if not public.luvia_booking_transition_allowed(b.status,v_status) then
      update public.booking_status_signals set resolution_state='ignored',resolution_reason='INVALID_BOOKING_TRANSITION'
      where id=s.id returning * into s;
      return jsonb_build_object('duplicate',false,'applied',false,'signal',to_jsonb(s));
    end if;
    update public.bookings
    set status=v_status,status_source=v_source,
        status_source_ref=coalesce(nullif(trim(coalesce(p_source_event_id,'')),''),nullif(trim(coalesce(p_provider_reference,'')),'')),
        status_verified_at=coalesce(p_occurred_at,now()),updated_at=now()
    where id=b.id;
    insert into public.booking_status_updates(
      booking_id,trip_id,provider_id,provider_reference,provider_status,luvia_status,source,source_event_id,evidence,occurred_at,applied
    ) values (
      b.id,b.trip_id,nullif(lower(trim(coalesce(p_provider_id,''))),''),nullif(trim(coalesce(p_provider_reference,'')),''),
      nullif(trim(coalesce(p_provider_status,'')),''),v_status,v_source,nullif(trim(coalesce(p_source_event_id,'')),''),
      coalesce(p_evidence,'{}'::jsonb),coalesce(p_occurred_at,now()),true
    ) returning id into update_id;
  end if;

  update public.booking_status_signals
  set resolution_state='applied',resolution_reason='AUTHORITATIVE_SIGNAL_APPLIED',applied_status_update_id=update_id
  where id=s.id returning * into s;

  return jsonb_build_object('duplicate',false,'applied',true,'signal',to_jsonb(s),'statusUpdateId',update_id);
end $$;

revoke all on function public.luvia_booking_ingest_status_signal_internal(uuid,text,text,text,text,text,text,numeric,jsonb,timestamptz,boolean) from public,anon,authenticated,service_role;

-- Existing service-role ingress remains the only externally callable status-signal RPC.
create or replace function public.luvia_booking_ingest_status_signal(
  p_booking_id uuid,p_provider_id text,p_provider_reference text,p_provider_status text,p_proposed_luvia_status text,p_source text,
  p_source_event_id text default null,p_confidence numeric default null,p_evidence jsonb default '{}'::jsonb,p_occurred_at timestamptz default null
) returns jsonb
language plpgsql
security definer
set search_path=public
as $$
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role' then
    raise exception 'SERVICE_ROLE_REQUIRED';
  end if;
  return public.luvia_booking_ingest_status_signal_internal(
    p_booking_id,p_provider_id,p_provider_reference,p_provider_status,p_proposed_luvia_status,p_source,
    p_source_event_id,p_confidence,p_evidence,p_occurred_at,false
  );
end $$;
revoke all on function public.luvia_booking_ingest_status_signal(uuid,text,text,text,text,text,text,numeric,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.luvia_booking_ingest_status_signal(uuid,text,text,text,text,text,text,numeric,jsonb,timestamptz) to service_role;

-- Reprocessor now uses the internal core only after the verified provider contract has resolved
-- to autoApply=true. This is the trusted database-only path that fixes the trigger/JWT mismatch.
create or replace function public.luvia_booking_reprocess_provider_status_receipt_internal(p_receipt_id uuid)
returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  r public.booking_provider_status_receipts;
  b public.bookings;
  c public.booking_correlations;
  pr public.booking_provider_references;
  v_contract jsonb;
  v_normalized text;
  v_auto_apply boolean:=false;
  v_contract_id uuid;
  v_contract_version text;
  v_source text;
  v_result jsonb;
  v_signal_id uuid;
  v_update_id uuid;
  v_linked boolean:=false;
  v_existing_issue uuid;
begin
  select * into r from public.booking_provider_status_receipts where id=p_receipt_id for update;
  if not found then return jsonb_build_object('ok',false,'reason','RECEIPT_NOT_FOUND'); end if;
  if r.resolution_state in ('applied','duplicate') then
    return jsonb_build_object('ok',true,'changed',false,'state',r.resolution_state,'receiptId',r.id);
  end if;

  if r.correlation_id is not null then
    select * into c from public.booking_correlations where id=r.correlation_id;
    if found and c.booking_id is not null then
      select * into b from public.bookings where id=c.booking_id;
      if found then v_linked:=r.booking_id is distinct from b.id; end if;
    end if;
  end if;
  if b.id is null and r.provider_reference is not null then
    select * into pr from public.booking_provider_references
    where provider_id=r.provider_id and reservation_reference=r.provider_reference limit 1;
    if found then
      select * into b from public.bookings where id=pr.booking_id;
      if found then
        v_linked:=true;
        if r.correlation_id is null then
          select * into c from public.booking_correlations
          where booking_id=b.id and (provider_id=r.provider_id or provider_id is null)
          order by linked_at desc nulls last,created_at desc limit 1;
        end if;
      end if;
    end if;
  end if;
  if b.id is null and r.booking_id is not null then
    select * into b from public.bookings where id=r.booking_id;
  end if;

  v_contract:=public.luvia_booking_resolve_provider_status_contract(r.provider_id,r.transport,r.provider_status,r.signature_verified);
  v_normalized:=nullif(v_contract->>'normalizedStatus','');
  v_auto_apply:=coalesce((v_contract->>'autoApply')::boolean,false);
  begin v_contract_id:=(v_contract->>'contractId')::uuid; exception when others then v_contract_id:=null; end;
  v_contract_version:=nullif(v_contract->>'contractVersion','');
  v_source:=case r.transport when 'webhook' then 'provider_webhook' when 'api' then 'provider_api' else 'provider_polling' end;

  if b.id is null then
    update public.booking_provider_status_receipts
    set resolution_state='pending_unlinked',resolution_reason='NO_BOOKING_LINK',
        normalized_luvia_status=v_normalized,status_contract_id=v_contract_id,status_contract_version=v_contract_version,
        mapping_verified=v_auto_apply,evidence=evidence||jsonb_build_object('statusContract',v_contract),
        reprocess_count=reprocess_count+1,last_reprocessed_at=now()
    where id=r.id returning * into r;
    return jsonb_build_object('ok',true,'changed',false,'linked',false,'state','pending_unlinked','receiptId',r.id,'contract',v_contract);
  end if;

  update public.booking_provider_status_receipts
  set booking_id=b.id,trip_id=b.trip_id,correlation_id=coalesce(r.correlation_id,c.id),
      normalized_luvia_status=v_normalized,status_contract_id=v_contract_id,status_contract_version=v_contract_version,
      mapping_verified=v_auto_apply,evidence=evidence||jsonb_build_object('statusContract',v_contract),
      reprocess_count=reprocess_count+1,last_reprocessed_at=now()
  where id=r.id returning * into r;

  update public.booking_reconciliation_issues
  set state='resolved',resolved_at=coalesce(resolved_at,now()),
      details=details||jsonb_build_object('resolvedBy','trusted_internal_status_bridge_v1','receiptId',r.id)
  where provider_id=r.provider_id and issue_type='unlinked_provider_status' and state='open'
    and (reference=r.provider_reference or details->>'receiptId'=r.id::text);

  if not v_auto_apply then
    update public.booking_provider_status_receipts
    set resolution_state='pending_review',resolution_reason=coalesce(v_contract->>'reason','STATUS_NOT_VERIFIED')
    where id=r.id returning * into r;
    select id into v_existing_issue
    from public.booking_reconciliation_issues
    where booking_id=b.id and provider_id=r.provider_id and issue_type='unknown_provider_status' and state='open'
      and (reference=r.provider_reference or details->>'receiptId'=r.id::text)
    limit 1;
    if v_existing_issue is null then
      insert into public.booking_reconciliation_issues(trip_id,booking_id,correlation_id,provider_id,issue_type,reference,details)
      values(
        b.trip_id,b.id,r.correlation_id,r.provider_id,'unknown_provider_status',coalesce(r.provider_reference,r.external_event_id),
        jsonb_build_object('receiptId',r.id,'providerStatus',r.provider_status,'statusContract',v_contract,'reprocessed',true)
      );
    end if;
    return jsonb_build_object('ok',true,'changed',v_linked,'linked',true,'applied',false,'state','pending_review','receiptId',r.id,'contract',v_contract);
  end if;

  if r.status_signal_id is not null then
    return jsonb_build_object('ok',true,'changed',v_linked,'linked',true,'applied',r.status_update_id is not null,
      'state',r.resolution_state,'receiptId',r.id,'reason','SIGNAL_ALREADY_EMITTED','contract',v_contract);
  end if;

  v_result:=public.luvia_booking_ingest_status_signal_internal(
    b.id,r.provider_id,r.provider_reference,r.provider_status,v_normalized,v_source,r.external_event_id,1.0,
    coalesce(r.evidence,'{}'::jsonb)||jsonb_build_object(
      'providerReceiptId',r.id,
      'signatureVerified',r.signature_verified,
      'transport',r.transport,
      'reprocessed',true,
      'statusContract',v_contract,
      'trustedInternalBridgeVersion','4.54.1'
    ),
    r.occurred_at,
    true
  );

  begin v_signal_id:=((v_result->'signal'->>'id'))::uuid; exception when others then v_signal_id:=null; end;
  begin v_update_id:=(v_result->>'statusUpdateId')::uuid; exception when others then v_update_id:=null; end;

  update public.booking_provider_status_receipts
  set resolution_state=case when coalesce((v_result->>'applied')::boolean,false) then 'applied' else 'ignored' end,
      resolution_reason=coalesce(v_result->'signal'->>'resolution_reason',v_result->>'reason','STATUS_SIGNAL_NOT_APPLIED'),
      status_signal_id=coalesce(v_signal_id,status_signal_id),
      status_update_id=coalesce(v_update_id,status_update_id)
  where id=r.id returning * into r;

  return jsonb_build_object(
    'ok',true,'changed',true,'linked',true,'applied',coalesce((v_result->>'applied')::boolean,false),
    'state',r.resolution_state,'receiptId',r.id,'statusResult',v_result,'contract',v_contract,
    'trustedInternalBridge',true
  );
end $$;
revoke all on function public.luvia_booking_reprocess_provider_status_receipt_internal(uuid) from public,anon,authenticated;

comment on function public.luvia_booking_apply_provider_status_internal(uuid,text,text,text,text,text,text,jsonb,timestamptz,boolean)
is 'Protected database-only provider-status apply core. Not externally executable. Verified provider contracts may bypass only the connected-access gate after trusted contract resolution.';

comment on function public.luvia_booking_ingest_status_signal_internal(uuid,text,text,text,text,text,text,numeric,jsonb,timestamptz,boolean)
is 'Protected database-only Booking Status V2 resolver. External clients must use the service-role ingress wrapper; trusted reconciliation may set trusted-provider-contract only after verified contract resolution.';

commit;
