-- Luvia v13.53.0 / Core 4.53.0
-- Booking Return Orchestration & Reconciliation Automation V1
-- Reprocesses previously unlinked provider receipts once booking/correlation references become available.
-- Automatically opens commercial reconciliation for reported commission without ever changing reservation status.
begin;

alter table public.booking_provider_status_receipts
  add column if not exists reprocess_count integer not null default 0,
  add column if not exists last_reprocessed_at timestamptz;

create table if not exists public.booking_reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid,
  actor_user_id uuid,
  source text not null default 'bookings_view' check (source in ('bookings_view','provider_reference_trigger','correlation_trigger','service_runner','manual')),
  scanned_count integer not null default 0,
  applied_count integer not null default 0,
  linked_count integer not null default 0,
  review_count integer not null default 0,
  unchanged_count integer not null default 0,
  failed_count integer not null default 0,
  details jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists booking_reconciliation_runs_trip_idx on public.booking_reconciliation_runs(trip_id,started_at desc);
alter table public.booking_reconciliation_runs enable row level security;
drop policy if exists booking_reconciliation_runs_trip_member_select on public.booking_reconciliation_runs;
create policy booking_reconciliation_runs_trip_member_select on public.booking_reconciliation_runs
for select to authenticated using (trip_id is not null and public.luvia_booking_is_trip_member(trip_id));
grant select on public.booking_reconciliation_runs to authenticated;
grant select,insert,update,delete on public.booking_reconciliation_runs to service_role;

-- Internal worker. It is intentionally not granted directly.
create or replace function public.luvia_booking_reprocess_provider_status_receipt_internal(p_receipt_id uuid)
returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  r public.booking_provider_status_receipts;
  b public.bookings;
  c public.booking_correlations;
  pr public.booking_provider_references;
  v_normalized text;
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

  -- Correlation is authoritative for a later booking link.
  if r.correlation_id is not null then
    select * into c from public.booking_correlations where id=r.correlation_id;
    if found and c.booking_id is not null then
      select * into b from public.bookings where id=c.booking_id;
      if found then v_linked:=r.booking_id is distinct from b.id; end if;
    end if;
  end if;

  -- Provider reservation reference is the next exact matching seam.
  if b.id is null and r.provider_reference is not null then
    select * into pr
      from public.booking_provider_references
      where provider_id=r.provider_id and reservation_reference=r.provider_reference
      limit 1;
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

  -- Existing receipt booking link remains valid.
  if b.id is null and r.booking_id is not null then
    select * into b from public.bookings where id=r.booking_id;
  end if;

  v_normalized:=coalesce(r.normalized_luvia_status,public.luvia_booking_normalize_provider_status(r.provider_id,r.provider_status));
  v_source:=case r.transport when 'webhook' then 'provider_webhook' when 'api' then 'provider_api' else 'provider_polling' end;

  if b.id is null then
    update public.booking_provider_status_receipts
      set resolution_state='pending_unlinked',resolution_reason='NO_BOOKING_LINK',
          reprocess_count=reprocess_count+1,last_reprocessed_at=now()
      where id=r.id returning * into r;
    return jsonb_build_object('ok',true,'changed',false,'linked',false,'state','pending_unlinked','receiptId',r.id);
  end if;

  update public.booking_provider_status_receipts
    set booking_id=b.id,trip_id=b.trip_id,correlation_id=coalesce(r.correlation_id,c.id),
        normalized_luvia_status=v_normalized,reprocess_count=reprocess_count+1,last_reprocessed_at=now()
    where id=r.id returning * into r;

  -- Resolve old unlinked issue once the booking can be linked.
  update public.booking_reconciliation_issues
    set state='resolved',resolved_at=coalesce(resolved_at,now()),details=details||jsonb_build_object('resolvedBy','return_orchestration_v1','receiptId',r.id)
    where provider_id=r.provider_id and issue_type='unlinked_provider_status' and state='open'
      and (reference=r.provider_reference or details->>'receiptId'=r.id::text);

  if v_normalized is null then
    update public.booking_provider_status_receipts
      set resolution_state='pending_review',resolution_reason='STATUS_NOT_PUBLICLY_VERIFIED'
      where id=r.id returning * into r;
    select id into v_existing_issue from public.booking_reconciliation_issues
      where booking_id=b.id and provider_id=r.provider_id and issue_type='unknown_provider_status' and state='open'
        and (reference=r.provider_reference or details->>'receiptId'=r.id::text) limit 1;
    if v_existing_issue is null then
      insert into public.booking_reconciliation_issues(trip_id,booking_id,correlation_id,provider_id,issue_type,reference,details)
      values(b.trip_id,b.id,r.correlation_id,r.provider_id,'unknown_provider_status',coalesce(r.provider_reference,r.external_event_id),jsonb_build_object('receiptId',r.id,'providerStatus',r.provider_status,'reprocessed',true));
    end if;
    return jsonb_build_object('ok',true,'changed',v_linked,'linked',true,'applied',false,'state','pending_review','receiptId',r.id);
  end if;

  -- Do not duplicate a previously emitted signal for this receipt.
  if r.status_signal_id is not null then
    return jsonb_build_object('ok',true,'changed',v_linked,'linked',true,'applied',r.status_update_id is not null,'state',r.resolution_state,'receiptId',r.id,'reason','SIGNAL_ALREADY_EMITTED');
  end if;

  v_result:=public.luvia_booking_ingest_status_signal(
    b.id,r.provider_id,r.provider_reference,r.provider_status,v_normalized,v_source,r.external_event_id,1.0,
    coalesce(r.evidence,'{}'::jsonb)||jsonb_build_object('providerReceiptId',r.id,'signatureVerified',r.signature_verified,'transport',r.transport,'reprocessed',true),
    r.occurred_at
  );
  begin v_signal_id:=((v_result->'signal'->>'id'))::uuid; exception when others then v_signal_id:=null; end;
  begin v_update_id:=(v_result->>'statusUpdateId')::uuid; exception when others then v_update_id:=null; end;

  update public.booking_provider_status_receipts
    set resolution_state=case when coalesce((v_result->>'applied')::boolean,false) then 'applied' else 'ignored' end,
        resolution_reason=coalesce(v_result->'signal'->>'resolution_reason',v_result->>'reason','STATUS_SIGNAL_NOT_APPLIED'),
        status_signal_id=coalesce(v_signal_id,status_signal_id),status_update_id=coalesce(v_update_id,status_update_id)
    where id=r.id returning * into r;

  return jsonb_build_object('ok',true,'changed',true,'linked',true,'applied',coalesce((v_result->>'applied')::boolean,false),'state',r.resolution_state,'receiptId',r.id,'statusResult',v_result);
end $$;
revoke all on function public.luvia_booking_reprocess_provider_status_receipt_internal(uuid) from public,anon,authenticated;

-- Trip-scoped eventual consistency runner. Authenticated users may only reconcile trips they belong to.
create or replace function public.luvia_booking_reconcile_trip_returns(
  p_trip_id uuid,
  p_limit integer default 50,
  p_source text default 'bookings_view'
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_role text:=coalesce(current_setting('request.jwt.claim.role',true),'');
  v_source text:=lower(trim(coalesce(p_source,'bookings_view')));
  v_limit integer:=greatest(1,least(coalesce(p_limit,50),200));
  run public.booking_reconciliation_runs;
  x record;
  result jsonb;
  scanned integer:=0; applied integer:=0; linked integer:=0; review integer:=0; unchanged integer:=0; failed integer:=0;
begin
  if auth.uid() is null and v_role<>'service_role' then raise exception 'AUTH_REQUIRED'; end if;
  if auth.uid() is not null and not public.luvia_booking_is_trip_member(p_trip_id) then raise exception 'TRIP_ACCESS_DENIED'; end if;
  if v_source not in ('bookings_view','provider_reference_trigger','correlation_trigger','service_runner','manual') then v_source:='manual'; end if;

  insert into public.booking_reconciliation_runs(trip_id,actor_user_id,source)
  values(p_trip_id,auth.uid(),v_source) returning * into run;

  for x in
    select r.id
    from public.booking_provider_status_receipts r
    left join public.booking_correlations c on c.id=r.correlation_id
    where coalesce(r.trip_id,c.trip_id)=p_trip_id
      and r.resolution_state in ('received','pending_unlinked','pending_review','failed')
    order by r.received_at asc
    limit v_limit
  loop
    scanned:=scanned+1;
    begin
      result:=public.luvia_booking_reprocess_provider_status_receipt_internal(x.id);
      if coalesce((result->>'applied')::boolean,false) then applied:=applied+1;
      elsif coalesce((result->>'linked')::boolean,false) then linked:=linked+1;
      elsif result->>'state'='pending_review' then review:=review+1;
      else unchanged:=unchanged+1; end if;
    exception when others then
      failed:=failed+1;
    end;
  end loop;

  update public.booking_reconciliation_runs set
    scanned_count=scanned,applied_count=applied,linked_count=linked,review_count=review,unchanged_count=unchanged,failed_count=failed,
    details=jsonb_build_object('bookingStatusChangedByCommercialSignals',false),finished_at=now()
  where id=run.id returning * into run;

  return jsonb_build_object('ok',true,'run',to_jsonb(run));
end $$;
revoke all on function public.luvia_booking_reconcile_trip_returns(uuid,integer,text) from public,anon;
grant execute on function public.luvia_booking_reconcile_trip_returns(uuid,integer,text) to authenticated,service_role;

-- Trigger bridge: once a provider reservation reference becomes known, any matching pending receipt is reprocessed immediately.
create or replace function public.luvia_booking_provider_reference_return_bridge()
returns trigger language plpgsql security definer set search_path=public as $$
declare x record;
begin
  if new.reservation_reference is null then return new; end if;
  for x in select id from public.booking_provider_status_receipts
    where provider_id=new.provider_id and provider_reference=new.reservation_reference
      and resolution_state in ('received','pending_unlinked','pending_review','failed')
  loop
    perform public.luvia_booking_reprocess_provider_status_receipt_internal(x.id);
  end loop;
  return new;
end $$;
revoke all on function public.luvia_booking_provider_reference_return_bridge() from public,anon,authenticated;
drop trigger if exists booking_provider_reference_return_bridge on public.booking_provider_references;
create trigger booking_provider_reference_return_bridge
after insert or update of reservation_reference on public.booking_provider_references
for each row execute function public.luvia_booking_provider_reference_return_bridge();

-- Trigger bridge: linking a correlation to a booking also wakes up provider receipts that arrived earlier.
create or replace function public.luvia_booking_correlation_return_bridge()
returns trigger language plpgsql security definer set search_path=public as $$
declare x record;
begin
  if new.booking_id is null or new.booking_id is not distinct from old.booking_id then return new; end if;
  for x in select id from public.booking_provider_status_receipts
    where correlation_id=new.id and resolution_state in ('received','pending_unlinked','pending_review','failed')
  loop
    perform public.luvia_booking_reprocess_provider_status_receipt_internal(x.id);
  end loop;
  return new;
end $$;
revoke all on function public.luvia_booking_correlation_return_bridge() from public,anon,authenticated;
drop trigger if exists booking_correlation_return_bridge on public.booking_correlations;
create trigger booking_correlation_return_bridge
after update of booking_id on public.booking_correlations
for each row execute function public.luvia_booking_correlation_return_bridge();

-- Commercial automation: a reported commission creates a pending reconciliation record only.
-- It never changes bookings.status.
create or replace function public.luvia_booking_conversion_commission_bridge()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_key text;
begin
  if new.commission_amount is null then return new; end if;
  v_key:='auto:'||new.id::text;
  insert into public.booking_commission_reconciliations(
    conversion_report_id,correlation_id,booking_id,trip_id,provider_id,reconciliation_key,state,
    reported_amount,reported_currency,source,evidence,occurred_at
  ) values(
    new.id,new.correlation_id,new.booking_id,new.trip_id,new.provider_id,v_key,'pending',
    new.commission_amount,new.commission_currency,new.source,
    jsonb_build_object('autoCreated',true,'conversionState',new.conversion_state,'bookingStatusChanged',false),new.occurred_at
  ) on conflict(provider_id,reconciliation_key) do update set
    booking_id=coalesce(excluded.booking_id,booking_commission_reconciliations.booking_id),
    correlation_id=coalesce(excluded.correlation_id,booking_commission_reconciliations.correlation_id),
    reported_amount=coalesce(excluded.reported_amount,booking_commission_reconciliations.reported_amount),
    reported_currency=coalesce(excluded.reported_currency,booking_commission_reconciliations.reported_currency),
    evidence=booking_commission_reconciliations.evidence||excluded.evidence,updated_at=now();
  return new;
end $$;
revoke all on function public.luvia_booking_conversion_commission_bridge() from public,anon,authenticated;
drop trigger if exists booking_conversion_commission_bridge on public.booking_conversion_reports;
create trigger booking_conversion_commission_bridge
after insert or update of commission_amount,commission_currency,booking_id,correlation_id on public.booking_conversion_reports
for each row execute function public.luvia_booking_conversion_commission_bridge();

-- Backfill pending commercial reconciliation for reports that already carry commission facts.
insert into public.booking_commission_reconciliations(
  conversion_report_id,correlation_id,booking_id,trip_id,provider_id,reconciliation_key,state,reported_amount,reported_currency,source,evidence,occurred_at
)
select c.id,c.correlation_id,c.booking_id,c.trip_id,c.provider_id,'auto:'||c.id::text,'pending',c.commission_amount,c.commission_currency,c.source,
       jsonb_build_object('autoCreated',true,'backfilled',true,'conversionState',c.conversion_state,'bookingStatusChanged',false),c.occurred_at
from public.booking_conversion_reports c
where c.commission_amount is not null
on conflict(provider_id,reconciliation_key) do nothing;

create or replace view public.booking_return_orchestration_summary with (security_invoker=true) as
select b.id booking_id,b.trip_id,b.provider,b.provider_reference,b.status,b.status_source,b.status_verified_at,
  (select count(*) from public.booking_provider_status_receipts r where r.booking_id=b.id and r.resolution_state='applied') applied_provider_receipt_count,
  (select count(*) from public.booking_provider_status_receipts r where r.booking_id=b.id and r.resolution_state in ('pending_unlinked','pending_review','failed')) pending_provider_receipt_count,
  (select max(r.last_reprocessed_at) from public.booking_provider_status_receipts r where r.booking_id=b.id) last_provider_return_reprocessed_at,
  (select count(*) from public.booking_commission_reconciliations c where c.booking_id=b.id and c.state='pending') pending_commission_reconciliation_count,
  (select count(*) from public.booking_commission_reconciliations c where c.booking_id=b.id and c.state='paid') paid_commission_count
from public.bookings b;
grant select on public.booking_return_orchestration_summary to authenticated,service_role;

update public.booking_provider_capabilities set metadata=metadata||jsonb_build_object(
  'returnOrchestrationV1',jsonb_build_object(
    'eventualConsistency',true,
    'reprocessOnProviderReference',true,
    'reprocessOnCorrelationLink',true,
    'tripScopedRefresh',true,
    'commercialReconciliationAutoOpen',true,
    'commercialSignalsCanConfirmReservation',false
  )
),updated_at=now()
where active=true;

comment on function public.luvia_booking_reconcile_trip_returns(uuid,integer,text) is 'Trip-scoped eventual-consistency runner for provider returns. Re-links old receipts when exact booking/correlation references become available.';
comment on function public.luvia_booking_conversion_commission_bridge() is 'Creates pending commission reconciliation from commercial evidence. Never mutates reservation status.';
comment on table public.booking_reconciliation_runs is 'Audit trail for automatic provider-return reconciliation cycles.';
commit;
