-- Luvia v13.51.0 / Core 4.51.0
-- Booking Correlation & Conversion Foundation
-- Correlates provider handoffs with later bookings/conversions without treating conversion as reservation confirmation.
begin;

create table if not exists public.booking_correlations (
  id uuid primary key default gen_random_uuid(),
  correlation_token uuid not null default gen_random_uuid() unique,
  trip_id uuid not null,
  booking_id uuid references public.bookings(id) on delete set null,
  handoff_event_id uuid unique references public.booking_handoff_events(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  provider_id text,
  provider_place_id text,
  venue_name text,
  destination_host text,
  state text not null default 'open' check (state in ('open','linked','converted','expired','invalidated')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  linked_at timestamptz,
  converted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days')
);
create index if not exists booking_correlations_trip_created_idx on public.booking_correlations(trip_id,created_at desc);
create index if not exists booking_correlations_booking_idx on public.booking_correlations(booking_id,created_at desc) where booking_id is not null;
create index if not exists booking_correlations_match_idx on public.booking_correlations(trip_id,actor_user_id,provider_place_id,created_at desc) where state='open';

alter table public.booking_correlations enable row level security;
drop policy if exists booking_correlations_trip_member_select on public.booking_correlations;
create policy booking_correlations_trip_member_select on public.booking_correlations
for select to authenticated using (public.luvia_booking_is_trip_member(trip_id));
grant select on public.booking_correlations to authenticated;
grant select,insert,update,delete on public.booking_correlations to service_role;

alter table public.booking_attribution_events_v2
  add column if not exists correlation_id uuid references public.booking_correlations(id) on delete set null;
create index if not exists booking_attribution_events_v2_correlation_idx on public.booking_attribution_events_v2(correlation_id,occurred_at);

create table if not exists public.booking_conversion_reports (
  id uuid primary key default gen_random_uuid(),
  correlation_id uuid references public.booking_correlations(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  trip_id uuid not null,
  provider_id text not null,
  source text not null check (source in ('provider_callback','affiliate_callback','provider_api','provider_polling','manual_reconciliation')),
  conversion_type text not null default 'reservation' check (conversion_type in ('reservation','lead','commerce')),
  conversion_state text not null default 'reported' check (conversion_state in ('reported','pending','approved','rejected','cancelled')),
  external_event_id text,
  external_reference text,
  gross_amount numeric check (gross_amount is null or gross_amount >= 0),
  gross_currency text check (gross_currency is null or char_length(gross_currency)=3),
  commission_amount numeric check (commission_amount is null or commission_amount >= 0),
  commission_currency text check (commission_currency is null or char_length(commission_currency)=3),
  evidence jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create unique index if not exists booking_conversion_reports_event_uidx
  on public.booking_conversion_reports(provider_id,source,external_event_id)
  where external_event_id is not null;
create index if not exists booking_conversion_reports_booking_idx on public.booking_conversion_reports(booking_id,occurred_at desc) where booking_id is not null;
create index if not exists booking_conversion_reports_correlation_idx on public.booking_conversion_reports(correlation_id,occurred_at desc) where correlation_id is not null;
create index if not exists booking_conversion_reports_trip_idx on public.booking_conversion_reports(trip_id,occurred_at desc);

alter table public.booking_conversion_reports enable row level security;
drop policy if exists booking_conversion_reports_trip_member_select on public.booking_conversion_reports;
create policy booking_conversion_reports_trip_member_select on public.booking_conversion_reports
for select to authenticated using (public.luvia_booking_is_trip_member(trip_id));
grant select on public.booking_conversion_reports to authenticated;
grant select,insert,update,delete on public.booking_conversion_reports to service_role;

alter table public.booking_attribution_events_v2
  add column if not exists conversion_report_id uuid references public.booking_conversion_reports(id) on delete set null;
create index if not exists booking_attribution_events_v2_conversion_report_idx on public.booking_attribution_events_v2(conversion_report_id) where conversion_report_id is not null;

-- Replace the v2 handoff mirror so one handoff creates one durable correlation identity.
create or replace function public.luvia_booking_attribution_v2_mirror_handoff()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_correlation public.booking_correlations; v_host text;
begin
  begin
    v_host := lower(split_part(regexp_replace(new.destination_url,'^https?://','','i'), '/', 1));
  exception when others then v_host := null;
  end;

  insert into public.booking_correlations(
    trip_id,booking_id,handoff_event_id,actor_user_id,provider_id,provider_place_id,venue_name,destination_host,state,metadata,created_at,linked_at
  ) values(
    new.trip_id,new.booking_id,new.id,new.actor_user_id,nullif(lower(trim(coalesce(new.provider,''))),''),
    nullif(trim(coalesce(new.provider_place_id,'')),''),nullif(trim(coalesce(new.venue_name,'')),''),nullif(v_host,''),
    case when new.booking_id is null then 'open' else 'linked' end,
    jsonb_build_object('placeType',new.place_type,'destinationUrl',new.destination_url)||coalesce(new.metadata,'{}'::jsonb),
    new.created_at,case when new.booking_id is null then null else new.created_at end
  ) on conflict (handoff_event_id) do update set
    booking_id=coalesce(public.booking_correlations.booking_id,excluded.booking_id),
    provider_id=coalesce(public.booking_correlations.provider_id,excluded.provider_id),
    provider_place_id=coalesce(public.booking_correlations.provider_place_id,excluded.provider_place_id),
    venue_name=coalesce(public.booking_correlations.venue_name,excluded.venue_name)
  returning * into v_correlation;

  insert into public.booking_attribution_events_v2(
    booking_id,trip_id,provider_id,handoff_event_id,correlation_id,event_type,metadata,occurred_at
  ) values(
    new.booking_id,new.trip_id,nullif(lower(trim(coalesce(new.provider,''))),''),new.id,v_correlation.id,
    case when new.event_type='opened' then 'handoff_opened' else 'handoff_clicked' end,
    coalesce(new.metadata,'{}'::jsonb)||jsonb_build_object('correlationId',v_correlation.id,'correlationState',v_correlation.state),new.created_at
  );
  return new;
end $$;

drop trigger if exists booking_handoff_events_v2_mirror on public.booking_handoff_events;
create trigger booking_handoff_events_v2_mirror
after insert on public.booking_handoff_events
for each row execute function public.luvia_booking_attribution_v2_mirror_handoff();

-- Backfill correlations for already recorded handoffs, including the handoffs used to validate v13.50.0.
insert into public.booking_correlations(
  trip_id,booking_id,handoff_event_id,actor_user_id,provider_id,provider_place_id,venue_name,destination_host,state,metadata,created_at,linked_at
)
select h.trip_id,h.booking_id,h.id,h.actor_user_id,nullif(lower(trim(coalesce(h.provider,''))),''),
       nullif(trim(coalesce(h.provider_place_id,'')),''),nullif(trim(coalesce(h.venue_name,'')),''),
       nullif(lower(split_part(regexp_replace(h.destination_url,'^https?://','','i'),'/',1)),''),
       case when h.booking_id is null then 'open' else 'linked' end,
       jsonb_build_object('backfilled',true,'placeType',h.place_type,'destinationUrl',h.destination_url)||coalesce(h.metadata,'{}'::jsonb),
       h.created_at,case when h.booking_id is null then null else h.created_at end
from public.booking_handoff_events h
where not exists (select 1 from public.booking_correlations c where c.handoff_event_id=h.id);

update public.booking_attribution_events_v2 a
set correlation_id=c.id,
    metadata=coalesce(a.metadata,'{}'::jsonb)||jsonb_build_object('correlationId',c.id)
from public.booking_correlations c
where a.handoff_event_id=c.handoff_event_id and a.correlation_id is null;

create or replace function public.luvia_booking_link_recent_place_handoff(
  p_booking_id uuid,
  p_provider_place_id text default null,
  p_venue_name text default null,
  p_max_age_minutes integer default 120
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare b public.bookings; c public.booking_correlations; v_count integer; v_provider_place text; v_venue text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into b from public.bookings where id=p_booking_id for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if not public.luvia_booking_is_trip_member(b.trip_id) then raise exception 'TRIP_ACCESS_DENIED'; end if;
  v_provider_place:=nullif(trim(coalesce(p_provider_place_id,'')),'');
  v_venue:=nullif(lower(trim(coalesce(p_venue_name,''))),'');
  if v_provider_place is null and v_venue is null then return jsonb_build_object('linked',false,'reason','PLACE_IDENTITY_REQUIRED'); end if;

  select count(*) into v_count
  from public.booking_correlations x
  where x.trip_id=b.trip_id and x.actor_user_id=auth.uid() and x.booking_id is null and x.state='open'
    and x.created_at >= now() - make_interval(mins=>greatest(1,least(coalesce(p_max_age_minutes,120),1440)))
    and ((v_provider_place is not null and x.provider_place_id=v_provider_place)
      or (v_provider_place is null and v_venue is not null and lower(trim(coalesce(x.venue_name,'')))=v_venue));
  if v_count=0 then return jsonb_build_object('linked',false,'reason','NO_RECENT_HANDOFF'); end if;
  if v_count>1 then return jsonb_build_object('linked',false,'reason','AMBIGUOUS_RECENT_HANDOFF','candidates',v_count); end if;

  select * into c from public.booking_correlations x
  where x.trip_id=b.trip_id and x.actor_user_id=auth.uid() and x.booking_id is null and x.state='open'
    and x.created_at >= now() - make_interval(mins=>greatest(1,least(coalesce(p_max_age_minutes,120),1440)))
    and ((v_provider_place is not null and x.provider_place_id=v_provider_place)
      or (v_provider_place is null and v_venue is not null and lower(trim(coalesce(x.venue_name,'')))=v_venue))
  order by x.created_at desc limit 1 for update;

  update public.booking_correlations set booking_id=b.id,state='linked',linked_at=now(),metadata=metadata||jsonb_build_object('linkMethod','recent_place_handoff') where id=c.id returning * into c;
  update public.booking_handoff_events set booking_id=b.id where id=c.handoff_event_id and booking_id is null;
  update public.booking_attribution_events_v2 set booking_id=b.id,correlation_id=c.id,metadata=metadata||jsonb_build_object('linkedToBookingAt',now()) where correlation_id=c.id and booking_id is null;
  insert into public.booking_events(booking_id,trip_id,actor_user_id,event_type,payload)
    values(b.id,b.trip_id,auth.uid(),'booking.correlation.linked',jsonb_build_object('correlationId',c.id,'handoffEventId',c.handoff_event_id,'provider',c.provider_id));
  return jsonb_build_object('linked',true,'bookingId',b.id,'correlationId',c.id,'handoffEventId',c.handoff_event_id,'provider',c.provider_id);
end $$;
revoke all on function public.luvia_booking_link_recent_place_handoff(uuid,text,text,integer) from public,anon;
grant execute on function public.luvia_booking_link_recent_place_handoff(uuid,text,text,integer) to authenticated,service_role;

create or replace function public.luvia_booking_link_correlation(
  p_booking_id uuid,
  p_correlation_token uuid
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare b public.bookings; c public.booking_correlations;
begin
  if auth.uid() is null and coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role' then raise exception 'AUTH_REQUIRED'; end if;
  select * into b from public.bookings where id=p_booking_id for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if auth.uid() is not null and not public.luvia_booking_is_trip_member(b.trip_id) then raise exception 'TRIP_ACCESS_DENIED'; end if;
  select * into c from public.booking_correlations where correlation_token=p_correlation_token for update;
  if not found then raise exception 'CORRELATION_NOT_FOUND'; end if;
  if c.trip_id<>b.trip_id then raise exception 'CORRELATION_TRIP_MISMATCH'; end if;
  if c.booking_id is not null and c.booking_id<>b.id then raise exception 'CORRELATION_ALREADY_LINKED'; end if;
  update public.booking_correlations set booking_id=b.id,state=case when state='converted' then 'converted' else 'linked' end,linked_at=coalesce(linked_at,now()) where id=c.id returning * into c;
  update public.booking_handoff_events set booking_id=b.id where id=c.handoff_event_id and booking_id is null;
  update public.booking_attribution_events_v2 set booking_id=b.id,correlation_id=c.id where correlation_id=c.id and booking_id is null;
  update public.booking_conversion_reports set booking_id=b.id where correlation_id=c.id and booking_id is null;
  return jsonb_build_object('linked',true,'bookingId',b.id,'correlationId',c.id,'state',c.state);
end $$;
revoke all on function public.luvia_booking_link_correlation(uuid,uuid) from public,anon;
grant execute on function public.luvia_booking_link_correlation(uuid,uuid) to authenticated,service_role;

create or replace function public.luvia_booking_get_handoff_correlation(p_handoff_event_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare c public.booking_correlations;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into c from public.booking_correlations where handoff_event_id=p_handoff_event_id;
  if not found then return jsonb_build_object('found',false); end if;
  if not public.luvia_booking_is_trip_member(c.trip_id) then raise exception 'TRIP_ACCESS_DENIED'; end if;
  return jsonb_build_object('found',true,'correlationId',c.id,'correlationToken',c.correlation_token,'bookingId',c.booking_id,'provider',c.provider_id,'state',c.state,'expiresAt',c.expires_at);
end $$;
revoke all on function public.luvia_booking_get_handoff_correlation(uuid) from public,anon;
grant execute on function public.luvia_booking_get_handoff_correlation(uuid) to authenticated;

-- Provider-neutral conversion intake. A conversion is commercial/attribution evidence only.
-- It NEVER mutates bookings.status and NEVER creates a booking_status_update.
create or replace function public.luvia_booking_report_conversion(
  p_correlation_token uuid,
  p_provider_id text,
  p_source text,
  p_conversion_type text default 'reservation',
  p_conversion_state text default 'reported',
  p_external_event_id text default null,
  p_external_reference text default null,
  p_gross_amount numeric default null,
  p_gross_currency text default null,
  p_commission_amount numeric default null,
  p_commission_currency text default null,
  p_evidence jsonb default '{}'::jsonb,
  p_occurred_at timestamptz default null
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare c public.booking_correlations; r public.booking_conversion_reports; existing public.booking_conversion_reports; v_provider text; v_source text; v_type text; v_state text; v_event_type text;
begin
  if coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
  v_provider:=lower(trim(coalesce(p_provider_id,''))); v_source:=lower(trim(coalesce(p_source,'')));
  v_type:=lower(trim(coalesce(p_conversion_type,'reservation'))); v_state:=lower(trim(coalesce(p_conversion_state,'reported')));
  if v_provider='' then raise exception 'PROVIDER_REQUIRED'; end if;
  if v_source not in ('provider_callback','affiliate_callback','provider_api','provider_polling','manual_reconciliation') then raise exception 'CONVERSION_SOURCE_INVALID'; end if;
  if v_type not in ('reservation','lead','commerce') then raise exception 'CONVERSION_TYPE_INVALID'; end if;
  if v_state not in ('reported','pending','approved','rejected','cancelled') then raise exception 'CONVERSION_STATE_INVALID'; end if;
  if p_external_event_id is not null then
    select * into existing from public.booking_conversion_reports where provider_id=v_provider and source=v_source and external_event_id=p_external_event_id limit 1;
    if found then return jsonb_build_object('duplicate',true,'conversion',to_jsonb(existing),'bookingStatusChanged',false); end if;
  end if;
  select * into c from public.booking_correlations where correlation_token=p_correlation_token for update;
  if not found then raise exception 'CORRELATION_NOT_FOUND'; end if;
  if c.provider_id is not null and c.provider_id<>v_provider then raise exception 'CORRELATION_PROVIDER_MISMATCH'; end if;
  if c.expires_at<now() and c.state='open' then update public.booking_correlations set state='expired' where id=c.id; raise exception 'CORRELATION_EXPIRED'; end if;

  insert into public.booking_conversion_reports(correlation_id,booking_id,trip_id,provider_id,source,conversion_type,conversion_state,external_event_id,external_reference,gross_amount,gross_currency,commission_amount,commission_currency,evidence,occurred_at)
  values(c.id,c.booking_id,c.trip_id,v_provider,v_source,v_type,v_state,nullif(trim(coalesce(p_external_event_id,'')),''),nullif(trim(coalesce(p_external_reference,'')),''),p_gross_amount,upper(nullif(trim(coalesce(p_gross_currency,'')),'')),p_commission_amount,upper(nullif(trim(coalesce(p_commission_currency,'')),'')),coalesce(p_evidence,'{}'::jsonb),coalesce(p_occurred_at,now())) returning * into r;

  update public.booking_correlations set state='converted',converted_at=coalesce(converted_at,r.occurred_at),metadata=metadata||jsonb_build_object('lastConversionId',r.id,'lastConversionState',r.conversion_state) where id=c.id;
  v_event_type:=case when v_state='approved' then 'conversion_approved' when v_state in ('rejected','cancelled') then 'conversion_rejected' else 'conversion_reported' end;
  insert into public.booking_attribution_events_v2(booking_id,trip_id,provider_id,correlation_id,conversion_report_id,event_type,external_reference,metadata,occurred_at)
  values(r.booking_id,r.trip_id,r.provider_id,r.correlation_id,r.id,v_event_type,r.external_reference,
    jsonb_build_object('conversionReportId',r.id,'conversionType',r.conversion_type,'conversionState',r.conversion_state,'source',r.source,'bookingStatusChanged',false)||coalesce(r.evidence,'{}'::jsonb),r.occurred_at);

  return jsonb_build_object('duplicate',false,'conversion',to_jsonb(r),'correlationId',c.id,'bookingId',r.booking_id,'bookingStatusChanged',false,'reservationConfirmed',false);
end $$;
revoke all on function public.luvia_booking_report_conversion(uuid,text,text,text,text,text,text,numeric,text,numeric,text,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.luvia_booking_report_conversion(uuid,text,text,text,text,text,text,numeric,text,numeric,text,jsonb,timestamptz) to service_role;

create or replace view public.booking_correlation_conversion_summary with (security_invoker=true) as
select c.id as correlation_id,c.correlation_token,c.trip_id,c.booking_id,c.handoff_event_id,c.provider_id,c.provider_place_id,c.venue_name,c.destination_host,c.state as correlation_state,c.created_at as handoff_correlated_at,c.linked_at,c.converted_at,c.expires_at,
  (select count(*) from public.booking_conversion_reports r where r.correlation_id=c.id) as conversion_report_count,
  (select jsonb_build_object('id',r.id,'state',r.conversion_state,'type',r.conversion_type,'source',r.source,'externalReference',r.external_reference,'occurredAt',r.occurred_at) from public.booking_conversion_reports r where r.correlation_id=c.id order by r.occurred_at desc,r.received_at desc limit 1) as latest_conversion,
  (select count(*) from public.booking_attribution_events_v2 a where a.correlation_id=c.id) as attribution_event_count
from public.booking_correlations c;
grant select on public.booking_correlation_conversion_summary to authenticated,service_role;

comment on table public.booking_correlations is 'Durable correlation identity joining a provider handoff to a later Luvia booking and/or conversion without requiring a booking to exist at click time.';
comment on table public.booking_conversion_reports is 'Provider-neutral conversion evidence. Conversion/commission facts never imply reservation confirmation.';
comment on function public.luvia_booking_report_conversion(uuid,text,text,text,text,text,text,numeric,text,numeric,text,jsonb,timestamptz) is 'Service-role conversion intake. Idempotent by provider/source event id and deliberately forbidden from changing reservation status.';

commit;
