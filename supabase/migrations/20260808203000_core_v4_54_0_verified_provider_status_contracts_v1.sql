-- Luvia v13.54.0 / Core 4.54.0
-- Verified Provider Status Contracts V1
-- Centralizes provider-specific status vocabularies and trust rules.
-- Only publicly verified contracts may auto-apply a reservation status.
begin;

create table if not exists public.booking_provider_status_contracts (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null,
  transport text not null check (transport in ('webhook','api','polling')),
  contract_version text not null,
  verification_state text not null check (verification_state in ('verified_public','partner_schema_required','unsupported')),
  auto_apply boolean not null default false,
  status_map jsonb not null default '{}'::jsonb,
  source_label text,
  source_url text,
  notes text,
  active boolean not null default true,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider_id,transport)
);

alter table public.booking_provider_status_contracts enable row level security;
drop policy if exists booking_provider_status_contracts_authenticated_select on public.booking_provider_status_contracts;
create policy booking_provider_status_contracts_authenticated_select on public.booking_provider_status_contracts
for select to authenticated using (true);
grant select on public.booking_provider_status_contracts to authenticated;
grant select,insert,update,delete on public.booking_provider_status_contracts to service_role;

insert into public.booking_provider_status_contracts(
  provider_id,transport,contract_version,verification_state,auto_apply,status_map,source_label,source_url,notes,verified_at
) values
('quandoo','webhook','quandoo-public-webhooks-2026-08','verified_public',true,
 '{"RESERVATION_CREATED":"requested","RESERVATION_CONFIRMED":"confirmed","RESERVATION_REJECTED":"declined","RESERVATION_CUSTOMER_CANCELED":"cancelled","RESERVATION_MERCHANT_CANCELED":"cancelled","RESERVATION_NOTIFICATION_REQUESTED":"awaiting_reply","RESERVATION_NOTIFIED":"awaiting_reply","RESERVATION_RECONFIRMED":"confirmed","RESERVATION_CHECKED_OUT":"confirmed","RESERVATION_ENQUIRY_CREATED":"requested","RESERVATION_ENQUIRY_CONFIRMED":"confirmed","RESERVATION_ENQUIRY_REJECTED":"declined"}'::jsonb,
 'Quandoo Webhooks notifications','https://docs.quandoo.com/webhooks-notifications/',
 'Public notificationType vocabulary. Webhook auto-apply still requires a verified webhook transport.',now()),
('tock','polling','tock-reservation-model-2026-08','verified_public',true,
 '{"EXPECTED":"confirmed","ARRIVED":"confirmed","SEATED":"confirmed","LEFT":"confirmed","CANCELLED":"cancelled","PARTIALLY_ARRIVED":"confirmed","PARTIALLY_SEATED":"confirmed"}'::jsonb,
 'Tock Reservation Data Model','https://api.exploretock.com/docs/latest/reservation.html',
 'Public PartyState vocabulary. Live polling remains disabled until authenticated partner transport is connected.',now()),
('zenchef','webhook','zenchef-partner-schema-pending','partner_schema_required',false,'{}'::jsonb,
 'Zenchef API capability overview','https://help.zenchef.com/hc/en-gb/articles/27690768125597-Zenchef-API',
 'Zenchef publicly confirms reservation webhooks, but payload/auth contract must be obtained through partner/API access.',now()),
('sevenrooms','api','sevenrooms-partner-schema-pending','partner_schema_required',false,'{}'::jsonb,
 'SevenRooms API & Integrations','https://sevenrooms.com/platform/integrations-apis/',
 'Public API capability exists; exact reservation status transport/schema is not assumed.',now()),
('opentable','polling','opentable-partner-schema-pending','partner_schema_required',false,'{}'::jsonb,
 'OpenTable partner contract required',null,'No undocumented status vocabulary is assumed.',null),
('thefork','polling','thefork-partner-schema-pending','partner_schema_required',false,'{}'::jsonb,
 'TheFork partner contract required',null,'No undocumented status vocabulary is assumed.',null),
('resy','polling','resy-partner-schema-pending','partner_schema_required',false,'{}'::jsonb,
 'Resy partner contract required',null,'No undocumented status vocabulary is assumed.',null)
on conflict(provider_id,transport) do update set
  contract_version=excluded.contract_version,
  verification_state=excluded.verification_state,
  auto_apply=excluded.auto_apply,
  status_map=excluded.status_map,
  source_label=excluded.source_label,
  source_url=excluded.source_url,
  notes=excluded.notes,
  active=true,
  verified_at=excluded.verified_at,
  updated_at=now();

alter table public.booking_provider_status_receipts
  add column if not exists status_contract_id uuid references public.booking_provider_status_contracts(id) on delete set null,
  add column if not exists status_contract_version text,
  add column if not exists mapping_verified boolean not null default false;
create index if not exists booking_provider_status_receipts_contract_idx on public.booking_provider_status_receipts(status_contract_id,received_at desc);

create or replace function public.luvia_booking_resolve_provider_status_contract(
  p_provider_id text,
  p_transport text,
  p_provider_status text,
  p_signature_verified boolean default null
) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare
  v_provider text:=lower(trim(coalesce(p_provider_id,'')));
  v_transport text:=lower(trim(coalesce(p_transport,'')));
  v_status text:=upper(trim(coalesce(p_provider_status,'')));
  c public.booking_provider_status_contracts;
  v_normalized text;
  v_transport_trusted boolean;
begin
  if v_provider='' or v_status='' or v_transport not in ('webhook','api','polling') then
    return jsonb_build_object('verified',false,'autoApply',false,'normalizedStatus',null,'reason','INVALID_STATUS_CONTRACT_INPUT');
  end if;
  select * into c from public.booking_provider_status_contracts
    where provider_id=v_provider and transport=v_transport and active=true limit 1;
  if not found then
    return jsonb_build_object('verified',false,'autoApply',false,'normalizedStatus',null,'reason','NO_PROVIDER_STATUS_CONTRACT');
  end if;
  v_normalized:=nullif(c.status_map->>v_status,'');
  v_transport_trusted:=case when v_transport='webhook' then coalesce(p_signature_verified,false) else true end;
  return jsonb_build_object(
    'contractId',c.id,'contractVersion',c.contract_version,'verificationState',c.verification_state,
    'verified',c.verification_state='verified_public','transportTrusted',v_transport_trusted,
    'autoApply',c.auto_apply and c.verification_state='verified_public' and v_transport_trusted and v_normalized is not null,
    'normalizedStatus',case when c.verification_state='verified_public' then v_normalized else null end,
    'reason',case
      when c.verification_state<>'verified_public' then 'PARTNER_STATUS_SCHEMA_REQUIRED'
      when not v_transport_trusted then 'UNVERIFIED_WEBHOOK_TRANSPORT'
      when v_normalized is null then 'STATUS_NOT_IN_VERIFIED_CONTRACT'
      else 'VERIFIED_PROVIDER_STATUS_CONTRACT' end,
    'sourceLabel',c.source_label,'sourceUrl',c.source_url
  );
end $$;
revoke all on function public.luvia_booking_resolve_provider_status_contract(text,text,text,boolean) from public,anon;
grant execute on function public.luvia_booking_resolve_provider_status_contract(text,text,text,boolean) to authenticated,service_role;

-- Backward-compatible normalizer: exposes only publicly verified mappings.
create or replace function public.luvia_booking_normalize_provider_status(p_provider_id text,p_provider_status text)
returns text language plpgsql stable as $$
declare p text:=lower(trim(coalesce(p_provider_id,''))); s text:=upper(trim(coalesce(p_provider_status,''))); c public.booking_provider_status_contracts;
begin
  select * into c from public.booking_provider_status_contracts
    where provider_id=p and active=true and verification_state='verified_public'
    order by case transport when 'webhook' then 1 when 'polling' then 2 else 3 end limit 1;
  if not found then return null; end if;
  return nullif(c.status_map->>s,'');
end $$;

-- Correlation-aware provider receipt intake with verified contract enforcement.
create or replace function public.luvia_booking_ingest_provider_status_receipt(
  p_provider_id text,
  p_transport text,
  p_provider_reference text,
  p_provider_status text,
  p_external_event_id text default null,
  p_correlation_token uuid default null,
  p_booking_id uuid default null,
  p_signature_verified boolean default null,
  p_raw_payload jsonb default '{}'::jsonb,
  p_evidence jsonb default '{}'::jsonb,
  p_occurred_at timestamptz default null
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_provider text:=lower(trim(coalesce(p_provider_id,'')));
  v_transport text:=lower(trim(coalesce(p_transport,'')));
  v_reference text:=nullif(trim(coalesce(p_provider_reference,'')),'');
  v_status text:=trim(coalesce(p_provider_status,''));
  v_source text;
  v_contract jsonb;
  v_normalized text;
  v_auto_apply boolean:=false;
  v_contract_id uuid;
  v_contract_version text;
  v_booking public.bookings;
  v_correlation public.booking_correlations;
  v_ref public.booking_provider_references;
  v_receipt public.booking_provider_status_receipts;
  v_duplicate public.booking_provider_status_receipts;
  v_result jsonb;
  v_signal_id uuid;
  v_update_id uuid;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
  if v_provider='' then raise exception 'PROVIDER_REQUIRED'; end if;
  if v_transport not in ('webhook','api','polling') then raise exception 'PROVIDER_STATUS_TRANSPORT_INVALID'; end if;
  if v_status='' then raise exception 'PROVIDER_STATUS_REQUIRED'; end if;
  if p_external_event_id is not null then
    select * into v_duplicate from public.booking_provider_status_receipts
      where provider_id=v_provider and transport=v_transport and external_event_id=p_external_event_id limit 1;
    if found then return jsonb_build_object('duplicate',true,'receipt',to_jsonb(v_duplicate)); end if;
  end if;

  if p_booking_id is not null then select * into v_booking from public.bookings where id=p_booking_id; end if;
  if p_correlation_token is not null then
    select * into v_correlation from public.booking_correlations where correlation_token=p_correlation_token;
    if found then
      if v_correlation.provider_id is not null and v_correlation.provider_id<>v_provider then raise exception 'CORRELATION_PROVIDER_MISMATCH'; end if;
      if v_booking.id is null and v_correlation.booking_id is not null then select * into v_booking from public.bookings where id=v_correlation.booking_id; end if;
    end if;
  end if;
  if v_booking.id is null and v_reference is not null then
    select * into v_ref from public.booking_provider_references where provider_id=v_provider and reservation_reference=v_reference limit 1;
    if found then select * into v_booking from public.bookings where id=v_ref.booking_id; end if;
  end if;
  if v_correlation.id is null and v_booking.id is not null then
    select * into v_correlation from public.booking_correlations where booking_id=v_booking.id and (provider_id=v_provider or provider_id is null) order by linked_at desc nulls last,created_at desc limit 1;
  end if;

  v_contract:=public.luvia_booking_resolve_provider_status_contract(v_provider,v_transport,v_status,p_signature_verified);
  v_normalized:=nullif(v_contract->>'normalizedStatus','');
  v_auto_apply:=coalesce((v_contract->>'autoApply')::boolean,false);
  begin v_contract_id:=(v_contract->>'contractId')::uuid; exception when others then v_contract_id:=null; end;
  v_contract_version:=nullif(v_contract->>'contractVersion','');
  v_source:=case v_transport when 'webhook' then 'provider_webhook' when 'api' then 'provider_api' else 'provider_polling' end;

  insert into public.booking_provider_status_receipts(
    correlation_id,booking_id,trip_id,provider_id,transport,provider_reference,provider_status,normalized_luvia_status,
    external_event_id,signature_verified,raw_payload,evidence,resolution_state,resolution_reason,occurred_at,
    status_contract_id,status_contract_version,mapping_verified
  ) values(
    v_correlation.id,v_booking.id,coalesce(v_booking.trip_id,v_correlation.trip_id),v_provider,v_transport,v_reference,v_status,v_normalized,
    nullif(trim(coalesce(p_external_event_id,'')),''),p_signature_verified,coalesce(p_raw_payload,'{}'::jsonb),
    coalesce(p_evidence,'{}'::jsonb)||jsonb_build_object('statusContract',v_contract),
    case when v_booking.id is null then 'pending_unlinked' when not v_auto_apply then 'pending_review' else 'received' end,
    case when v_booking.id is null then 'NO_BOOKING_LINK' when not v_auto_apply then coalesce(v_contract->>'reason','STATUS_NOT_VERIFIED') else null end,
    coalesce(p_occurred_at,now()),v_contract_id,v_contract_version,v_auto_apply
  ) returning * into v_receipt;

  if v_booking.id is null then
    insert into public.booking_reconciliation_issues(trip_id,correlation_id,provider_id,issue_type,reference,details)
    values(v_receipt.trip_id,v_receipt.correlation_id,v_provider,'unlinked_provider_status',coalesce(v_reference,p_external_event_id),jsonb_build_object('receiptId',v_receipt.id,'providerStatus',v_status,'statusContract',v_contract));
    return jsonb_build_object('duplicate',false,'applied',false,'receipt',to_jsonb(v_receipt),'reason','NO_BOOKING_LINK','contract',v_contract);
  end if;
  if not v_auto_apply then
    insert into public.booking_reconciliation_issues(trip_id,booking_id,correlation_id,provider_id,issue_type,reference,details)
    values(v_booking.trip_id,v_booking.id,v_receipt.correlation_id,v_provider,'unknown_provider_status',coalesce(v_reference,p_external_event_id),jsonb_build_object('receiptId',v_receipt.id,'providerStatus',v_status,'statusContract',v_contract));
    return jsonb_build_object('duplicate',false,'applied',false,'receipt',to_jsonb(v_receipt),'reason',coalesce(v_contract->>'reason','STATUS_NOT_VERIFIED'),'contract',v_contract);
  end if;

  v_result:=public.luvia_booking_ingest_status_signal(
    v_booking.id,v_provider,v_reference,v_status,v_normalized,v_source,p_external_event_id,1.0,
    coalesce(p_evidence,'{}'::jsonb)||jsonb_build_object('providerReceiptId',v_receipt.id,'signatureVerified',p_signature_verified,'transport',v_transport,'statusContract',v_contract),
    coalesce(p_occurred_at,now())
  );
  begin v_signal_id:=((v_result->'signal'->>'id'))::uuid; exception when others then v_signal_id:=null; end;
  begin v_update_id:=(v_result->>'statusUpdateId')::uuid; exception when others then v_update_id:=null; end;
  update public.booking_provider_status_receipts
    set resolution_state=case when coalesce((v_result->>'applied')::boolean,false) then 'applied' else 'ignored' end,
        resolution_reason=coalesce(v_result->'signal'->>'resolution_reason',v_result->>'reason'),status_signal_id=v_signal_id,status_update_id=v_update_id
    where id=v_receipt.id returning * into v_receipt;
  return jsonb_build_object('duplicate',false,'applied',coalesce((v_result->>'applied')::boolean,false),'receipt',to_jsonb(v_receipt),'statusResult',v_result,'contract',v_contract);
end $$;
revoke all on function public.luvia_booking_ingest_provider_status_receipt(text,text,text,text,text,uuid,uuid,boolean,jsonb,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.luvia_booking_ingest_provider_status_receipt(text,text,text,text,text,uuid,uuid,boolean,jsonb,jsonb,timestamptz) to service_role;

-- Reprocessor upgraded to re-evaluate the current verified provider contract on every pass.
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
  if r.resolution_state in ('applied','duplicate') then return jsonb_build_object('ok',true,'changed',false,'state',r.resolution_state,'receiptId',r.id); end if;

  if r.correlation_id is not null then
    select * into c from public.booking_correlations where id=r.correlation_id;
    if found and c.booking_id is not null then select * into b from public.bookings where id=c.booking_id; if found then v_linked:=r.booking_id is distinct from b.id; end if; end if;
  end if;
  if b.id is null and r.provider_reference is not null then
    select * into pr from public.booking_provider_references where provider_id=r.provider_id and reservation_reference=r.provider_reference limit 1;
    if found then
      select * into b from public.bookings where id=pr.booking_id;
      if found then v_linked:=true; if r.correlation_id is null then select * into c from public.booking_correlations where booking_id=b.id and (provider_id=r.provider_id or provider_id is null) order by linked_at desc nulls last,created_at desc limit 1; end if; end if;
    end if;
  end if;
  if b.id is null and r.booking_id is not null then select * into b from public.bookings where id=r.booking_id; end if;

  v_contract:=public.luvia_booking_resolve_provider_status_contract(r.provider_id,r.transport,r.provider_status,r.signature_verified);
  v_normalized:=nullif(v_contract->>'normalizedStatus','');
  v_auto_apply:=coalesce((v_contract->>'autoApply')::boolean,false);
  begin v_contract_id:=(v_contract->>'contractId')::uuid; exception when others then v_contract_id:=null; end;
  v_contract_version:=nullif(v_contract->>'contractVersion','');
  v_source:=case r.transport when 'webhook' then 'provider_webhook' when 'api' then 'provider_api' else 'provider_polling' end;

  if b.id is null then
    update public.booking_provider_status_receipts set resolution_state='pending_unlinked',resolution_reason='NO_BOOKING_LINK',
      normalized_luvia_status=v_normalized,status_contract_id=v_contract_id,status_contract_version=v_contract_version,mapping_verified=v_auto_apply,
      evidence=evidence||jsonb_build_object('statusContract',v_contract),reprocess_count=reprocess_count+1,last_reprocessed_at=now()
      where id=r.id returning * into r;
    return jsonb_build_object('ok',true,'changed',false,'linked',false,'state','pending_unlinked','receiptId',r.id,'contract',v_contract);
  end if;

  update public.booking_provider_status_receipts set booking_id=b.id,trip_id=b.trip_id,correlation_id=coalesce(r.correlation_id,c.id),
    normalized_luvia_status=v_normalized,status_contract_id=v_contract_id,status_contract_version=v_contract_version,mapping_verified=v_auto_apply,
    evidence=evidence||jsonb_build_object('statusContract',v_contract),reprocess_count=reprocess_count+1,last_reprocessed_at=now()
    where id=r.id returning * into r;

  update public.booking_reconciliation_issues set state='resolved',resolved_at=coalesce(resolved_at,now()),details=details||jsonb_build_object('resolvedBy','verified_provider_status_contracts_v1','receiptId',r.id)
    where provider_id=r.provider_id and issue_type='unlinked_provider_status' and state='open' and (reference=r.provider_reference or details->>'receiptId'=r.id::text);

  if not v_auto_apply then
    update public.booking_provider_status_receipts set resolution_state='pending_review',resolution_reason=coalesce(v_contract->>'reason','STATUS_NOT_VERIFIED') where id=r.id returning * into r;
    select id into v_existing_issue from public.booking_reconciliation_issues where booking_id=b.id and provider_id=r.provider_id and issue_type='unknown_provider_status' and state='open' and (reference=r.provider_reference or details->>'receiptId'=r.id::text) limit 1;
    if v_existing_issue is null then
      insert into public.booking_reconciliation_issues(trip_id,booking_id,correlation_id,provider_id,issue_type,reference,details)
      values(b.trip_id,b.id,r.correlation_id,r.provider_id,'unknown_provider_status',coalesce(r.provider_reference,r.external_event_id),jsonb_build_object('receiptId',r.id,'providerStatus',r.provider_status,'statusContract',v_contract,'reprocessed',true));
    end if;
    return jsonb_build_object('ok',true,'changed',v_linked,'linked',true,'applied',false,'state','pending_review','receiptId',r.id,'contract',v_contract);
  end if;

  if r.status_signal_id is not null then return jsonb_build_object('ok',true,'changed',v_linked,'linked',true,'applied',r.status_update_id is not null,'state',r.resolution_state,'receiptId',r.id,'reason','SIGNAL_ALREADY_EMITTED','contract',v_contract); end if;

  v_result:=public.luvia_booking_ingest_status_signal(
    b.id,r.provider_id,r.provider_reference,r.provider_status,v_normalized,v_source,r.external_event_id,1.0,
    coalesce(r.evidence,'{}'::jsonb)||jsonb_build_object('providerReceiptId',r.id,'signatureVerified',r.signature_verified,'transport',r.transport,'reprocessed',true,'statusContract',v_contract),r.occurred_at
  );
  begin v_signal_id:=((v_result->'signal'->>'id'))::uuid; exception when others then v_signal_id:=null; end;
  begin v_update_id:=(v_result->>'statusUpdateId')::uuid; exception when others then v_update_id:=null; end;
  update public.booking_provider_status_receipts set resolution_state=case when coalesce((v_result->>'applied')::boolean,false) then 'applied' else 'ignored' end,
    resolution_reason=coalesce(v_result->'signal'->>'resolution_reason',v_result->>'reason','STATUS_SIGNAL_NOT_APPLIED'),status_signal_id=coalesce(v_signal_id,status_signal_id),status_update_id=coalesce(v_update_id,status_update_id)
    where id=r.id returning * into r;
  return jsonb_build_object('ok',true,'changed',true,'linked',true,'applied',coalesce((v_result->>'applied')::boolean,false),'state',r.resolution_state,'receiptId',r.id,'statusResult',v_result,'contract',v_contract);
end $$;
revoke all on function public.luvia_booking_reprocess_provider_status_receipt_internal(uuid) from public,anon,authenticated;

create or replace view public.booking_provider_status_contract_health as
select
  c.provider_id,c.transport,c.contract_version,c.verification_state,c.auto_apply,c.active,c.verified_at,
  cap.luvia_access_state,cap.supports_status_webhook,cap.supports_status_polling,
  count(r.id) as receipt_count,
  count(r.id) filter(where r.resolution_state='applied') as applied_count,
  count(r.id) filter(where r.resolution_state='pending_review') as review_count
from public.booking_provider_status_contracts c
left join public.booking_provider_capabilities cap on cap.provider_id=c.provider_id
left join public.booking_provider_status_receipts r on r.status_contract_id=c.id
group by c.provider_id,c.transport,c.contract_version,c.verification_state,c.auto_apply,c.active,c.verified_at,cap.luvia_access_state,cap.supports_status_webhook,cap.supports_status_polling;
grant select on public.booking_provider_status_contract_health to authenticated,service_role;

commit;
