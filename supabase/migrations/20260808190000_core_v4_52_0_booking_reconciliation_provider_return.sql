-- Luvia v13.52.0 / Core 4.52.0
-- Conversion/Commission Reconciliation + Provider Status Return V1
-- Provider status evidence can flow back through correlation/provider references.
-- Commercial conversion/commission facts remain strictly separate from reservation confirmation.
begin;

create table if not exists public.booking_provider_status_receipts (
  id uuid primary key default gen_random_uuid(),
  correlation_id uuid references public.booking_correlations(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  trip_id uuid,
  provider_id text not null,
  transport text not null check (transport in ('webhook','api','polling')),
  provider_reference text,
  provider_status text not null,
  normalized_luvia_status text check (normalized_luvia_status is null or normalized_luvia_status in ('requested','awaiting_reply','alternative_proposed','needs_action','confirmed','declined','cancelled','failed')),
  external_event_id text,
  signature_verified boolean,
  raw_payload jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  resolution_state text not null default 'received' check (resolution_state in ('received','pending_unlinked','pending_review','applied','ignored','duplicate','failed')),
  resolution_reason text,
  status_signal_id uuid references public.booking_status_signals(id) on delete set null,
  status_update_id uuid references public.booking_status_updates(id) on delete set null,
  occurred_at timestamptz not null default now(),
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index if not exists booking_provider_status_receipts_event_uidx
  on public.booking_provider_status_receipts(provider_id,transport,external_event_id)
  where external_event_id is not null;
create index if not exists booking_provider_status_receipts_booking_idx on public.booking_provider_status_receipts(booking_id,occurred_at desc) where booking_id is not null;
create index if not exists booking_provider_status_receipts_correlation_idx on public.booking_provider_status_receipts(correlation_id,occurred_at desc) where correlation_id is not null;
create index if not exists booking_provider_status_receipts_reference_idx on public.booking_provider_status_receipts(provider_id,provider_reference) where provider_reference is not null;

alter table public.booking_provider_status_receipts enable row level security;
drop policy if exists booking_provider_status_receipts_trip_member_select on public.booking_provider_status_receipts;
create policy booking_provider_status_receipts_trip_member_select on public.booking_provider_status_receipts
for select to authenticated using (trip_id is not null and public.luvia_booking_is_trip_member(trip_id));
grant select on public.booking_provider_status_receipts to authenticated;
grant select,insert,update,delete on public.booking_provider_status_receipts to service_role;

create table if not exists public.booking_commission_reconciliations (
  id uuid primary key default gen_random_uuid(),
  conversion_report_id uuid not null references public.booking_conversion_reports(id) on delete cascade,
  correlation_id uuid references public.booking_correlations(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  trip_id uuid not null,
  provider_id text not null,
  reconciliation_key text not null,
  state text not null default 'pending' check (state in ('pending','matched','approved','paid','rejected','disputed')),
  expected_amount numeric check (expected_amount is null or expected_amount >= 0),
  expected_currency text check (expected_currency is null or char_length(expected_currency)=3),
  reported_amount numeric check (reported_amount is null or reported_amount >= 0),
  reported_currency text check (reported_currency is null or char_length(reported_currency)=3),
  settled_amount numeric check (settled_amount is null or settled_amount >= 0),
  settled_currency text check (settled_currency is null or char_length(settled_currency)=3),
  statement_reference text,
  source text not null default 'manual_reconciliation' check (source in ('provider_callback','affiliate_callback','provider_api','provider_polling','manual_reconciliation')),
  evidence jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  reconciled_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider_id,reconciliation_key)
);
create index if not exists booking_commission_reconciliations_conversion_idx on public.booking_commission_reconciliations(conversion_report_id,created_at desc);
create index if not exists booking_commission_reconciliations_booking_idx on public.booking_commission_reconciliations(booking_id,created_at desc) where booking_id is not null;
create index if not exists booking_commission_reconciliations_trip_idx on public.booking_commission_reconciliations(trip_id,created_at desc);
alter table public.booking_commission_reconciliations enable row level security;
drop policy if exists booking_commission_reconciliations_trip_member_select on public.booking_commission_reconciliations;
create policy booking_commission_reconciliations_trip_member_select on public.booking_commission_reconciliations
for select to authenticated using (public.luvia_booking_is_trip_member(trip_id));
grant select on public.booking_commission_reconciliations to authenticated;
grant select,insert,update,delete on public.booking_commission_reconciliations to service_role;

create table if not exists public.booking_reconciliation_issues (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid,
  booking_id uuid references public.bookings(id) on delete set null,
  correlation_id uuid references public.booking_correlations(id) on delete set null,
  provider_id text,
  issue_type text not null check (issue_type in ('unlinked_provider_status','unknown_provider_status','provider_mismatch','ambiguous_correlation','commission_mismatch','conversion_mismatch','invalid_payload')),
  severity text not null default 'warning' check (severity in ('info','warning','error')),
  reference text,
  details jsonb not null default '{}'::jsonb,
  state text not null default 'open' check (state in ('open','resolved','ignored')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists booking_reconciliation_issues_trip_idx on public.booking_reconciliation_issues(trip_id,created_at desc);
alter table public.booking_reconciliation_issues enable row level security;
drop policy if exists booking_reconciliation_issues_trip_member_select on public.booking_reconciliation_issues;
create policy booking_reconciliation_issues_trip_member_select on public.booking_reconciliation_issues
for select to authenticated using (trip_id is not null and public.luvia_booking_is_trip_member(trip_id));
grant select on public.booking_reconciliation_issues to authenticated;
grant select,insert,update,delete on public.booking_reconciliation_issues to service_role;

-- Only publicly verified provider vocabularies are normalized here.
-- Quandoo: official webhook notificationType values.
-- Tock: documented reservation party-state model already used by the v13.47 adapter.
create or replace function public.luvia_booking_normalize_provider_status(p_provider_id text,p_provider_status text)
returns text language plpgsql immutable as $$
declare p text:=lower(trim(coalesce(p_provider_id,''))); s text:=upper(trim(coalesce(p_provider_status,'')));
begin
  if p='quandoo' then
    return case s
      when 'RESERVATION_CREATED' then 'requested'
      when 'RESERVATION_CONFIRMED' then 'confirmed'
      when 'RESERVATION_REJECTED' then 'declined'
      when 'RESERVATION_CUSTOMER_CANCELED' then 'cancelled'
      when 'RESERVATION_MERCHANT_CANCELED' then 'cancelled'
      when 'RESERVATION_NOTIFICATION_REQUESTED' then 'awaiting_reply'
      when 'RESERVATION_NOTIFIED' then 'awaiting_reply'
      when 'RESERVATION_RECONFIRMED' then 'confirmed'
      when 'RESERVATION_CHECKED_OUT' then 'confirmed'
      when 'RESERVATION_ENQUIRY_CREATED' then 'requested'
      when 'RESERVATION_ENQUIRY_CONFIRMED' then 'confirmed'
      when 'RESERVATION_ENQUIRY_REJECTED' then 'declined'
      else null end;
  elsif p='tock' then
    return case s
      when 'EXPECTED' then 'confirmed'
      when 'ARRIVED' then 'confirmed'
      when 'SEATED' then 'confirmed'
      when 'PARTIALLY_ARRIVED' then 'confirmed'
      when 'PARTIALLY_SEATED' then 'confirmed'
      when 'LEFT' then 'confirmed'
      when 'CANCELLED' then 'cancelled'
      else null end;
  end if;
  return null;
end $$;

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
  v_normalized text;
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

  v_normalized:=public.luvia_booking_normalize_provider_status(v_provider,v_status);
  v_source:=case v_transport when 'webhook' then 'provider_webhook' when 'api' then 'provider_api' else 'provider_polling' end;

  insert into public.booking_provider_status_receipts(
    correlation_id,booking_id,trip_id,provider_id,transport,provider_reference,provider_status,normalized_luvia_status,
    external_event_id,signature_verified,raw_payload,evidence,resolution_state,resolution_reason,occurred_at
  ) values(
    v_correlation.id,v_booking.id,coalesce(v_booking.trip_id,v_correlation.trip_id),v_provider,v_transport,v_reference,v_status,v_normalized,
    nullif(trim(coalesce(p_external_event_id,'')),''),p_signature_verified,coalesce(p_raw_payload,'{}'::jsonb),coalesce(p_evidence,'{}'::jsonb),
    case when v_booking.id is null then 'pending_unlinked' when v_normalized is null then 'pending_review' else 'received' end,
    case when v_booking.id is null then 'NO_BOOKING_LINK' when v_normalized is null then 'STATUS_NOT_PUBLICLY_VERIFIED' else null end,
    coalesce(p_occurred_at,now())
  ) returning * into v_receipt;

  if v_booking.id is null then
    insert into public.booking_reconciliation_issues(trip_id,correlation_id,provider_id,issue_type,reference,details)
    values(v_receipt.trip_id,v_receipt.correlation_id,v_provider,'unlinked_provider_status',coalesce(v_reference,p_external_event_id),jsonb_build_object('receiptId',v_receipt.id,'providerStatus',v_status));
    return jsonb_build_object('duplicate',false,'applied',false,'receipt',to_jsonb(v_receipt),'reason','NO_BOOKING_LINK');
  end if;
  if v_normalized is null then
    insert into public.booking_reconciliation_issues(trip_id,booking_id,correlation_id,provider_id,issue_type,reference,details)
    values(v_booking.trip_id,v_booking.id,v_receipt.correlation_id,v_provider,'unknown_provider_status',coalesce(v_reference,p_external_event_id),jsonb_build_object('receiptId',v_receipt.id,'providerStatus',v_status));
    return jsonb_build_object('duplicate',false,'applied',false,'receipt',to_jsonb(v_receipt),'reason','STATUS_NOT_PUBLICLY_VERIFIED');
  end if;

  v_result:=public.luvia_booking_ingest_status_signal(
    v_booking.id,v_provider,v_reference,v_status,v_normalized,v_source,p_external_event_id,1.0,
    coalesce(p_evidence,'{}'::jsonb)||jsonb_build_object('providerReceiptId',v_receipt.id,'signatureVerified',p_signature_verified,'transport',v_transport),
    coalesce(p_occurred_at,now())
  );
  begin v_signal_id:=((v_result->'signal'->>'id'))::uuid; exception when others then v_signal_id:=null; end;
  begin v_update_id:=(v_result->>'statusUpdateId')::uuid; exception when others then v_update_id:=null; end;
  update public.booking_provider_status_receipts
    set resolution_state=case when coalesce((v_result->>'applied')::boolean,false) then 'applied' else 'ignored' end,
        resolution_reason=coalesce(v_result->'signal'->>'resolution_reason',v_result->>'reason'),status_signal_id=v_signal_id,status_update_id=v_update_id
    where id=v_receipt.id returning * into v_receipt;
  return jsonb_build_object('duplicate',false,'applied',coalesce((v_result->>'applied')::boolean,false),'receipt',to_jsonb(v_receipt),'statusResult',v_result);
end $$;
revoke all on function public.luvia_booking_ingest_provider_status_receipt(text,text,text,text,text,uuid,uuid,boolean,jsonb,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.luvia_booking_ingest_provider_status_receipt(text,text,text,text,text,uuid,uuid,boolean,jsonb,jsonb,timestamptz) to service_role;

create or replace function public.luvia_booking_reconcile_conversion_report(
  p_conversion_report_id uuid,
  p_conversion_state text default null,
  p_commission_state text default 'matched',
  p_commission_amount numeric default null,
  p_commission_currency text default null,
  p_statement_reference text default null,
  p_reconciliation_key text default null,
  p_source text default 'manual_reconciliation',
  p_evidence jsonb default '{}'::jsonb,
  p_occurred_at timestamptz default null
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  r public.booking_conversion_reports;
  c public.booking_commission_reconciliations;
  v_state text:=lower(trim(coalesce(p_conversion_state,'')));
  v_commission_state text:=lower(trim(coalesce(p_commission_state,'matched')));
  v_source text:=lower(trim(coalesce(p_source,'manual_reconciliation')));
  v_key text;
  v_event text;
  v_time timestamptz:=coalesce(p_occurred_at,now());
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
  select * into r from public.booking_conversion_reports where id=p_conversion_report_id for update;
  if not found then raise exception 'CONVERSION_REPORT_NOT_FOUND'; end if;
  if v_state<>'' and v_state not in ('reported','pending','approved','rejected','cancelled') then raise exception 'CONVERSION_STATE_INVALID'; end if;
  if v_commission_state not in ('pending','matched','approved','paid','rejected','disputed') then raise exception 'COMMISSION_STATE_INVALID'; end if;
  if v_source not in ('provider_callback','affiliate_callback','provider_api','provider_polling','manual_reconciliation') then raise exception 'RECONCILIATION_SOURCE_INVALID'; end if;
  if v_state<>'' and v_state<>r.conversion_state then
    update public.booking_conversion_reports set conversion_state=v_state,commission_amount=coalesce(p_commission_amount,commission_amount),commission_currency=coalesce(upper(nullif(trim(coalesce(p_commission_currency,'')),'')),commission_currency),evidence=evidence||coalesce(p_evidence,'{}'::jsonb) where id=r.id returning * into r;
    v_event:=case when v_state='approved' then 'conversion_approved' when v_state in ('rejected','cancelled') then 'conversion_rejected' else 'conversion_reported' end;
    insert into public.booking_attribution_events_v2(booking_id,trip_id,provider_id,correlation_id,conversion_report_id,event_type,external_reference,metadata,occurred_at)
      values(r.booking_id,r.trip_id,r.provider_id,r.correlation_id,r.id,v_event,r.external_reference,jsonb_build_object('reconciled',true,'conversionState',r.conversion_state,'bookingStatusChanged',false)||coalesce(p_evidence,'{}'::jsonb),v_time);
  end if;
  v_key:=coalesce(nullif(trim(coalesce(p_reconciliation_key,'')),''),nullif(trim(coalesce(p_statement_reference,'')),''),coalesce(r.external_event_id,r.id::text));
  insert into public.booking_commission_reconciliations(
    conversion_report_id,correlation_id,booking_id,trip_id,provider_id,reconciliation_key,state,
    expected_amount,expected_currency,reported_amount,reported_currency,settled_amount,settled_currency,statement_reference,source,evidence,occurred_at,reconciled_at,paid_at
  ) values(
    r.id,r.correlation_id,r.booking_id,r.trip_id,r.provider_id,v_key,v_commission_state,
    r.commission_amount,r.commission_currency,p_commission_amount,upper(nullif(trim(coalesce(p_commission_currency,'')),'')),
    case when v_commission_state='paid' then coalesce(p_commission_amount,r.commission_amount) else null end,
    case when v_commission_state='paid' then coalesce(upper(nullif(trim(coalesce(p_commission_currency,'')),'')),r.commission_currency) else null end,
    nullif(trim(coalesce(p_statement_reference,'')),''),v_source,coalesce(p_evidence,'{}'::jsonb),v_time,
    case when v_commission_state in ('matched','approved','paid','rejected') then v_time else null end,
    case when v_commission_state='paid' then v_time else null end
  ) on conflict(provider_id,reconciliation_key) do update set
    state=excluded.state,reported_amount=coalesce(excluded.reported_amount,booking_commission_reconciliations.reported_amount),
    reported_currency=coalesce(excluded.reported_currency,booking_commission_reconciliations.reported_currency),
    settled_amount=coalesce(excluded.settled_amount,booking_commission_reconciliations.settled_amount),
    settled_currency=coalesce(excluded.settled_currency,booking_commission_reconciliations.settled_currency),
    statement_reference=coalesce(excluded.statement_reference,booking_commission_reconciliations.statement_reference),
    evidence=booking_commission_reconciliations.evidence||excluded.evidence,reconciled_at=coalesce(excluded.reconciled_at,booking_commission_reconciliations.reconciled_at),
    paid_at=coalesce(excluded.paid_at,booking_commission_reconciliations.paid_at),updated_at=now()
  returning * into c;
  if v_commission_state='paid' and not exists(select 1 from public.booking_attribution_events_v2 where conversion_report_id=r.id and event_type='commission_paid' and metadata->>'reconciliationId'=c.id::text) then
    insert into public.booking_attribution_events_v2(booking_id,trip_id,provider_id,correlation_id,conversion_report_id,event_type,external_reference,metadata,occurred_at)
      values(r.booking_id,r.trip_id,r.provider_id,r.correlation_id,r.id,'commission_paid',coalesce(c.statement_reference,r.external_reference),jsonb_build_object('reconciliationId',c.id,'amount',c.settled_amount,'currency',c.settled_currency,'bookingStatusChanged',false),v_time);
  end if;
  return jsonb_build_object('conversion',to_jsonb(r),'reconciliation',to_jsonb(c),'bookingStatusChanged',false);
end $$;
revoke all on function public.luvia_booking_reconcile_conversion_report(uuid,text,text,numeric,text,text,text,text,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.luvia_booking_reconcile_conversion_report(uuid,text,text,numeric,text,text,text,text,jsonb,timestamptz) to service_role;

create or replace view public.booking_reconciliation_provider_return_summary with (security_invoker=true) as
select b.id booking_id,b.trip_id,b.provider,b.provider_reference,b.status,b.status_source,b.status_verified_at,
  (select count(*) from public.booking_provider_status_receipts r where r.booking_id=b.id) provider_receipt_count,
  (select jsonb_build_object('provider',r.provider_id,'transport',r.transport,'providerStatus',r.provider_status,'normalizedStatus',r.normalized_luvia_status,'resolutionState',r.resolution_state,'occurredAt',r.occurred_at) from public.booking_provider_status_receipts r where r.booking_id=b.id order by r.occurred_at desc,r.received_at desc limit 1) latest_provider_receipt,
  (select count(*) from public.booking_conversion_reports c where c.booking_id=b.id) conversion_count,
  (select count(*) from public.booking_commission_reconciliations c where c.booking_id=b.id) reconciliation_count,
  (select max(c.paid_at) from public.booking_commission_reconciliations c where c.booking_id=b.id and c.state='paid') last_commission_paid_at
from public.bookings b;
grant select on public.booking_reconciliation_provider_return_summary to authenticated,service_role;

update public.booking_provider_capabilities set metadata=metadata||jsonb_build_object(
  'statusReturnV1',jsonb_build_object('correlationAware',true,'receiptInbox',true,'commissionReconciliation',true,'directWebhookReady',case when provider_id='quandoo' then true else false end,'liveConnected',luvia_access_state='connected')
),updated_at=now()
where provider_id in ('quandoo','zenchef','opentable','sevenrooms','thefork','tock','resy');

comment on table public.booking_provider_status_receipts is 'Raw provider-return evidence linked through correlation/provider reservation references before authoritative status application.';
comment on table public.booking_commission_reconciliations is 'Commercial reconciliation ledger. Commission state never mutates reservation status.';
comment on function public.luvia_booking_ingest_provider_status_receipt(text,text,text,text,text,uuid,uuid,boolean,jsonb,jsonb,timestamptz) is 'Provider return intake. Applies status only through Booking Status V2 and only when provider status mapping is verified.';
comment on function public.luvia_booking_reconcile_conversion_report(uuid,text,text,numeric,text,text,text,text,jsonb,timestamptz) is 'Conversion/commission reconciliation. Explicitly returns bookingStatusChanged=false.';
commit;
