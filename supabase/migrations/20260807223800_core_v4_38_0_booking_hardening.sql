
begin;

-- Luvia Booking Core V0.9.2
-- Hardening & Integration Prep - corrected against the actual standalone Booking Core schema.
-- Fixes:
-- 1) uses public.luvia_booking_is_trip_member(...)
-- 2) uses bookings.amount / bookings.currency (not price_amount / price_currency)

create table if not exists public.booking_audit_log (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete cascade,
  actor_type text not null check (actor_type in ('user','system','provider','admin')),
  actor_id text,
  action text not null,
  entity_type text not null,
  entity_id text,
  before_state jsonb not null default '{}'::jsonb,
  after_state jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists booking_audit_log_booking_created_idx
  on public.booking_audit_log(booking_id, created_at desc);

create table if not exists public.booking_dead_letters (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete cascade,
  source text not null,
  operation text not null,
  error_class text,
  error_code text,
  error_message text not null,
  payload jsonb not null default '{}'::jsonb,
  retry_count integer not null default 0 check (retry_count >= 0),
  next_retry_at timestamptz,
  status text not null default 'open'
    check (status in ('open','retry_scheduled','resolved','discarded')),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists booking_dead_letters_status_retry_idx
  on public.booking_dead_letters(status, next_retry_at);

create unique index if not exists booking_dead_letters_dedupe_idx
  on public.booking_dead_letters(source, operation, booking_id, error_code, error_message)
  where status in ('open','retry_scheduled');

create table if not exists public.booking_health_checks (
  check_key text primary key,
  status text not null check (status in ('ok','degraded','failed')),
  details jsonb not null default '{}'::jsonb,
  checked_at timestamptz not null default now()
);

alter table public.booking_audit_log enable row level security;
alter table public.booking_dead_letters enable row level security;
alter table public.booking_health_checks enable row level security;

drop policy if exists booking_audit_log_trip_member_select
  on public.booking_audit_log;

create policy booking_audit_log_trip_member_select
on public.booking_audit_log
for select
to authenticated
using (
  booking_id is not null
  and exists (
    select 1
    from public.bookings b
    where b.id = booking_audit_log.booking_id
      and public.luvia_booking_is_trip_member(b.trip_id)
  )
);

drop policy if exists booking_dead_letters_trip_member_select
  on public.booking_dead_letters;

create policy booking_dead_letters_trip_member_select
on public.booking_dead_letters
for select
to authenticated
using (
  booking_id is not null
  and exists (
    select 1
    from public.bookings b
    where b.id = booking_dead_letters.booking_id
      and public.luvia_booking_is_trip_member(b.trip_id)
  )
);

revoke all on public.booking_health_checks from anon, authenticated;
revoke all on public.booking_audit_log from anon;
revoke all on public.booking_dead_letters from anon;

grant select on public.booking_audit_log to authenticated;
grant select on public.booking_dead_letters to authenticated;

grant select, insert, update, delete on
  public.booking_audit_log,
  public.booking_dead_letters,
  public.booking_health_checks
to service_role;

grant select, insert, update, delete on
  public.bookings,
  public.booking_messages,
  public.booking_provider_links,
  public.booking_events,
  public.booking_profiles,
  public.booking_offers,
  public.booking_affiliate_partners,
  public.booking_affiliate_links,
  public.booking_affiliate_clicks,
  public.booking_affiliate_attributions,
  public.booking_affiliate_conversions,
  public.booking_route_decisions,
  public.booking_route_attempts
to service_role;

create or replace function public.luvia_booking_append_audit(
  p_booking_id uuid,
  p_actor_type text,
  p_actor_id text,
  p_action text,
  p_entity_type text,
  p_entity_id text default null,
  p_before_state jsonb default '{}'::jsonb,
  p_after_state jsonb default '{}'::jsonb,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_actor_type not in ('user','system','provider','admin') then
    raise exception 'AUDIT_ACTOR_TYPE_INVALID';
  end if;

  if p_booking_id is not null and not exists (
    select 1 from public.bookings where id = p_booking_id
  ) then
    raise exception 'BOOKING_NOT_FOUND';
  end if;

  insert into public.booking_audit_log(
    booking_id, actor_type, actor_id, action,
    entity_type, entity_id, before_state, after_state, metadata
  )
  values(
    p_booking_id, p_actor_type, p_actor_id, p_action,
    p_entity_type, p_entity_id,
    coalesce(p_before_state,'{}'::jsonb),
    coalesce(p_after_state,'{}'::jsonb),
    coalesce(p_metadata,'{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.luvia_booking_append_audit(
  uuid,text,text,text,text,text,jsonb,jsonb,jsonb
) from public;

grant execute on function public.luvia_booking_append_audit(
  uuid,text,text,text,text,text,jsonb,jsonb,jsonb
) to service_role;

create or replace function public.luvia_booking_dead_letter(
  p_booking_id uuid,
  p_source text,
  p_operation text,
  p_error_class text,
  p_error_code text,
  p_error_message text,
  p_payload jsonb default '{}'::jsonb,
  p_retry_count integer default 0,
  p_next_retry_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if coalesce(trim(p_source),'') = '' or coalesce(trim(p_operation),'') = '' then
    raise exception 'DLQ_SOURCE_OPERATION_REQUIRED';
  end if;

  if coalesce(trim(p_error_message),'') = '' then
    raise exception 'DLQ_ERROR_MESSAGE_REQUIRED';
  end if;

  select id
  into v_id
  from public.booking_dead_letters
  where source = p_source
    and operation = p_operation
    and booking_id is not distinct from p_booking_id
    and error_code is not distinct from p_error_code
    and error_message = p_error_message
    and status in ('open','retry_scheduled')
  order by created_at desc
  limit 1;

  if v_id is null then
    insert into public.booking_dead_letters(
      booking_id, source, operation, error_class, error_code, error_message,
      payload, retry_count, next_retry_at, status
    )
    values(
      p_booking_id, p_source, p_operation, p_error_class, p_error_code,
      p_error_message, coalesce(p_payload,'{}'::jsonb),
      greatest(coalesce(p_retry_count,0),0), p_next_retry_at,
      case when p_next_retry_at is null then 'open' else 'retry_scheduled' end
    )
    returning id into v_id;
  else
    update public.booking_dead_letters
    set retry_count = greatest(retry_count, coalesce(p_retry_count,retry_count)),
        next_retry_at = coalesce(p_next_retry_at,next_retry_at),
        status = case
          when coalesce(p_next_retry_at,next_retry_at) is null then 'open'
          else 'retry_scheduled'
        end,
        payload = coalesce(p_payload,payload),
        updated_at = now()
    where id = v_id;
  end if;

  return v_id;
end;
$$;

revoke all on function public.luvia_booking_dead_letter(
  uuid,text,text,text,text,text,jsonb,integer,timestamptz
) from public;

grant execute on function public.luvia_booking_dead_letter(
  uuid,text,text,text,text,text,jsonb,integer,timestamptz
) to service_role;

create or replace function public.luvia_booking_resolve_dead_letter(
  p_dead_letter_id uuid,
  p_resolution text default 'resolved'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.booking_dead_letters
  set status = case
        when p_resolution = 'discarded' then 'discarded'
        else 'resolved'
      end,
      resolved_at = now(),
      updated_at = now()
  where id = p_dead_letter_id;

  return found;
end;
$$;

revoke all on function public.luvia_booking_resolve_dead_letter(uuid,text)
  from public;

grant execute on function public.luvia_booking_resolve_dead_letter(uuid,text)
  to service_role;

drop view if exists public.booking_integration_summary;

create view public.booking_integration_summary
with (security_invoker = true)
as
select
  b.id,
  b.trip_id,
  b.trip_place_id,
  b.place_id,
  b.requested_by,
  b.booking_type,
  b.status,
  b.channel,
  b.provider,
  b.provider_reference,
  b.title,
  b.start_at,
  b.end_at,
  b.party_size,
  b.participant_ids,
  b.amount,
  b.currency,
  b.confirmation_number,
  b.cancellation_deadline,
  b.contact,
  b.request,
  b.metadata,
  b.created_at,
  b.updated_at,
  b.confirmed_at,
  b.cancelled_at,
  (
    select max(m.created_at)
    from public.booking_messages m
    where m.booking_id = b.id
  ) as last_message_at,
  (
    select max(e.created_at)
    from public.booking_events e
    where e.booking_id = b.id
  ) as last_event_at,
  (
    select count(*)::int
    from public.booking_dead_letters d
    where d.booking_id = b.id
      and d.status in ('open','retry_scheduled')
  ) as open_dead_letters
from public.bookings b;

grant select on public.booking_integration_summary
  to authenticated, service_role;

insert into public.booking_health_checks(
  check_key, status, details, checked_at
)
values
  ('schema','ok','{"version":"0.9.2"}'::jsonb,now()),
  ('database','ok','{"core_tables":true}'::jsonb,now())
on conflict (check_key) do update
set status = excluded.status,
    details = excluded.details,
    checked_at = excluded.checked_at;

comment on table public.booking_audit_log
  is 'Append-only audit trail for Booking Core V0.9.2.';

comment on table public.booking_dead_letters
  is 'Dead-letter queue for failed booking operations and webhook/provider processing.';

comment on view public.booking_integration_summary
  is 'Stable read model for Luvia integration adapters.';

commit;
