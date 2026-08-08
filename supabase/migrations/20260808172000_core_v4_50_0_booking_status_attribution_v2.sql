-- Luvia v13.50.0 / Core 4.50.0
-- Booking Status & Attribution V2
begin;

create table if not exists public.booking_status_signals (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  trip_id uuid not null,
  provider_id text,
  provider_reference text,
  provider_status text,
  proposed_luvia_status text not null check (proposed_luvia_status in ('requested','awaiting_reply','alternative_proposed','needs_action','confirmed','declined','cancelled','failed')),
  source text not null check (source in ('system','handoff','provider_webhook','provider_api','provider_polling','affiliate_callback','email_reply','user_confirmation')),
  source_event_id text,
  confidence numeric(4,3) check (confidence is null or (confidence between 0 and 1)),
  evidence jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  received_at timestamptz not null default now(),
  resolution_state text not null default 'pending' check (resolution_state in ('pending','applied','ignored','conflict','duplicate')),
  resolution_reason text,
  applied_status_update_id uuid references public.booking_status_updates(id) on delete set null
);
create unique index if not exists booking_status_signals_source_event_uidx on public.booking_status_signals(source,source_event_id) where source_event_id is not null;
create index if not exists booking_status_signals_booking_idx on public.booking_status_signals(booking_id,occurred_at desc);

alter table public.booking_status_signals enable row level security;
drop policy if exists booking_status_signals_trip_member_select on public.booking_status_signals;
create policy booking_status_signals_trip_member_select on public.booking_status_signals for select to authenticated using(public.luvia_booking_is_trip_member(trip_id));
grant select on public.booking_status_signals to authenticated;
grant select,insert,update,delete on public.booking_status_signals to service_role;

create table if not exists public.booking_attribution_events_v2 (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete cascade,
  trip_id uuid not null,
  provider_id text,
  partner_id uuid references public.booking_affiliate_partners(id) on delete set null,
  handoff_event_id uuid references public.booking_handoff_events(id) on delete set null,
  click_id uuid references public.booking_affiliate_clicks(id) on delete set null,
  attribution_id uuid references public.booking_affiliate_attributions(id) on delete set null,
  conversion_id uuid references public.booking_affiliate_conversions(id) on delete set null,
  event_type text not null check(event_type in ('handoff_clicked','handoff_opened','affiliate_clicked','conversion_reported','conversion_approved','conversion_rejected','commission_paid')),
  external_reference text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists booking_attribution_events_v2_booking_idx on public.booking_attribution_events_v2(booking_id,occurred_at);
create index if not exists booking_attribution_events_v2_trip_idx on public.booking_attribution_events_v2(trip_id,occurred_at desc);
alter table public.booking_attribution_events_v2 enable row level security;
drop policy if exists booking_attribution_events_v2_trip_member_select on public.booking_attribution_events_v2;
create policy booking_attribution_events_v2_trip_member_select on public.booking_attribution_events_v2 for select to authenticated using(public.luvia_booking_is_trip_member(trip_id));
grant select on public.booking_attribution_events_v2 to authenticated;
grant select,insert,update,delete on public.booking_attribution_events_v2 to service_role;

create or replace function public.luvia_booking_attribution_v2_mirror_handoff()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.booking_attribution_events_v2(booking_id,trip_id,provider_id,handoff_event_id,event_type,metadata,occurred_at)
 values(new.booking_id,new.trip_id,nullif(lower(trim(coalesce(new.provider,''))),''),new.id,case when new.event_type='opened' then 'handoff_opened' else 'handoff_clicked' end,new.metadata,new.created_at);
 return new;
end $$;
drop trigger if exists booking_handoff_events_v2_mirror on public.booking_handoff_events;
create trigger booking_handoff_events_v2_mirror after insert on public.booking_handoff_events for each row execute function public.luvia_booking_attribution_v2_mirror_handoff();

create or replace function public.luvia_booking_attribution_v2_mirror_affiliate_click()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_trip uuid;
begin
 select trip_id into v_trip from public.bookings where id=new.booking_id;
 insert into public.booking_attribution_events_v2(booking_id,trip_id,partner_id,click_id,event_type,metadata,occurred_at)
 values(new.booking_id,v_trip,new.partner_id,new.id,'affiliate_clicked',new.metadata,new.clicked_at);
 return new;
end $$;
drop trigger if exists booking_affiliate_clicks_v2_mirror on public.booking_affiliate_clicks;
create trigger booking_affiliate_clicks_v2_mirror after insert on public.booking_affiliate_clicks for each row execute function public.luvia_booking_attribution_v2_mirror_affiliate_click();

create or replace function public.luvia_booking_attribution_v2_mirror_conversion()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_trip uuid; v_type text;
begin
 select trip_id into v_trip from public.bookings where id=new.booking_id;
 v_type:=case when new.status='approved' then 'conversion_approved' when new.status='rejected' then 'conversion_rejected' else 'conversion_reported' end;
 insert into public.booking_attribution_events_v2(booking_id,trip_id,partner_id,attribution_id,conversion_id,event_type,external_reference,metadata,occurred_at)
 values(new.booking_id,v_trip,new.partner_id,new.attribution_id,new.id,v_type,new.external_reference,new.metadata,coalesce(new.occurred_at,new.created_at));
 if new.commission_status='paid' then
   insert into public.booking_attribution_events_v2(booking_id,trip_id,partner_id,attribution_id,conversion_id,event_type,external_reference,metadata,occurred_at)
   values(new.booking_id,v_trip,new.partner_id,new.attribution_id,new.id,'commission_paid',new.external_reference,new.metadata,coalesce(new.occurred_at,new.created_at));
 end if;
 return new;
end $$;
drop trigger if exists booking_affiliate_conversions_v2_mirror on public.booking_affiliate_conversions;
create trigger booking_affiliate_conversions_v2_mirror after insert on public.booking_affiliate_conversions for each row execute function public.luvia_booking_attribution_v2_mirror_conversion();

create or replace function public.luvia_booking_status_source_authority(p_source text)
returns integer language sql immutable as $$
  select case lower(trim(coalesce(p_source,'')))
    when 'provider_webhook' then 100 when 'provider_api' then 95 when 'provider_polling' then 90
    when 'email_reply' then 75 when 'user_confirmation' then 70 when 'system' then 50
    when 'handoff' then 25 when 'affiliate_callback' then 20 else 0 end
$$;

create or replace function public.luvia_booking_ingest_status_signal(
  p_booking_id uuid,p_provider_id text,p_provider_reference text,p_provider_status text,p_proposed_luvia_status text,p_source text,p_source_event_id text default null,p_confidence numeric default null,p_evidence jsonb default '{}'::jsonb,p_occurred_at timestamptz default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare b public.bookings; s public.booking_status_signals; existing public.booking_status_signals; latest public.booking_status_signals; v_source text; v_status text; v_authority integer; v_latest_authority integer; applied jsonb; update_id uuid;
begin
 if coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
 select * into b from public.bookings where id=p_booking_id for update; if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
 v_source:=lower(trim(coalesce(p_source,''))); v_status:=lower(trim(coalesce(p_proposed_luvia_status,'')));
 if v_source not in ('system','handoff','provider_webhook','provider_api','provider_polling','affiliate_callback','email_reply','user_confirmation') then raise exception 'STATUS_SIGNAL_SOURCE_INVALID'; end if;
 if v_status not in ('requested','awaiting_reply','alternative_proposed','needs_action','confirmed','declined','cancelled','failed') then raise exception 'STATUS_SIGNAL_TARGET_INVALID'; end if;
 if p_source_event_id is not null then select * into existing from public.booking_status_signals where source=v_source and source_event_id=p_source_event_id limit 1; if found then return jsonb_build_object('duplicate',true,'signal',to_jsonb(existing)); end if; end if;
 insert into public.booking_status_signals(booking_id,trip_id,provider_id,provider_reference,provider_status,proposed_luvia_status,source,source_event_id,confidence,evidence,occurred_at)
 values(b.id,b.trip_id,nullif(lower(trim(coalesce(p_provider_id,''))),''),nullif(trim(coalesce(p_provider_reference,'')),''),nullif(trim(coalesce(p_provider_status,'')),''),v_status,v_source,nullif(trim(coalesce(p_source_event_id,'')),''),case when p_confidence is null then null else greatest(0,least(1,p_confidence)) end,coalesce(p_evidence,'{}'::jsonb),coalesce(p_occurred_at,now())) returning * into s;
 -- Handoffs and affiliate conversions are attribution facts, never proof of a confirmed reservation.
 if v_status='confirmed' and v_source in ('handoff','affiliate_callback') then update public.booking_status_signals set resolution_state='ignored',resolution_reason='NON_CONFIRMING_SOURCE' where id=s.id returning * into s; return jsonb_build_object('duplicate',false,'applied',false,'signal',to_jsonb(s)); end if;
 v_authority:=public.luvia_booking_status_source_authority(v_source);
 select * into latest from public.booking_status_signals where booking_id=b.id and id<>s.id and resolution_state='applied' order by occurred_at desc,received_at desc limit 1;
 if found then
   v_latest_authority:=public.luvia_booking_status_source_authority(latest.source);
   if v_latest_authority>v_authority and latest.proposed_luvia_status<>v_status then update public.booking_status_signals set resolution_state='ignored',resolution_reason='LOWER_AUTHORITY_THAN_APPLIED_SIGNAL' where id=s.id returning * into s; return jsonb_build_object('duplicate',false,'applied',false,'signal',to_jsonb(s)); end if;
   if v_latest_authority=v_authority and latest.proposed_luvia_status<>v_status and abs(extract(epoch from (s.occurred_at-latest.occurred_at)))<300 then update public.booking_status_signals set resolution_state='conflict',resolution_reason='EQUAL_AUTHORITY_CONFLICT' where id=s.id; update public.booking_status_signals set resolution_state='conflict',resolution_reason='EQUAL_AUTHORITY_CONFLICT' where id=latest.id; return jsonb_build_object('duplicate',false,'applied',false,'conflict',true,'signalId',s.id,'conflictsWith',latest.id); end if;
 end if;
 if v_source in ('provider_webhook','provider_api','provider_polling') then
   begin applied:=public.luvia_booking_apply_provider_status(b.id,coalesce(p_provider_id,b.provider),p_provider_reference,p_provider_status,v_status,v_source,p_source_event_id,p_evidence,p_occurred_at); exception when others then update public.booking_status_signals set resolution_state='ignored',resolution_reason=sqlerrm where id=s.id returning * into s; return jsonb_build_object('duplicate',false,'applied',false,'signal',to_jsonb(s)); end;
   update_id:=(applied->>'statusUpdateId')::uuid;
 else
   if not public.luvia_booking_transition_allowed(b.status,v_status) then update public.booking_status_signals set resolution_state='ignored',resolution_reason='INVALID_BOOKING_TRANSITION' where id=s.id returning * into s; return jsonb_build_object('duplicate',false,'applied',false,'signal',to_jsonb(s)); end if;
   update public.bookings set status=v_status,status_source=v_source,status_source_ref=coalesce(nullif(trim(coalesce(p_source_event_id,'')),''),nullif(trim(coalesce(p_provider_reference,'')),'')),status_verified_at=coalesce(p_occurred_at,now()),updated_at=now() where id=b.id;
   insert into public.booking_status_updates(booking_id,trip_id,provider_id,provider_reference,provider_status,luvia_status,source,source_event_id,evidence,occurred_at,applied) values(b.id,b.trip_id,nullif(lower(trim(coalesce(p_provider_id,''))),''),nullif(trim(coalesce(p_provider_reference,'')),''),nullif(trim(coalesce(p_provider_status,'')),''),v_status,v_source,nullif(trim(coalesce(p_source_event_id,'')),''),coalesce(p_evidence,'{}'::jsonb),coalesce(p_occurred_at,now()),true) returning id into update_id;
 end if;
 update public.booking_status_signals set resolution_state='applied',resolution_reason='AUTHORITATIVE_SIGNAL_APPLIED',applied_status_update_id=update_id where id=s.id returning * into s;
 return jsonb_build_object('duplicate',false,'applied',true,'signal',to_jsonb(s),'statusUpdateId',update_id);
end $$;
revoke all on function public.luvia_booking_ingest_status_signal(uuid,text,text,text,text,text,text,numeric,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.luvia_booking_ingest_status_signal(uuid,text,text,text,text,text,text,numeric,jsonb,timestamptz) to service_role;

create or replace function public.luvia_booking_record_attribution_event_v2(
 p_booking_id uuid,p_trip_id uuid,p_provider_id text,p_event_type text,p_partner_id uuid default null,p_handoff_event_id uuid default null,p_click_id uuid default null,p_attribution_id uuid default null,p_conversion_id uuid default null,p_external_reference text default null,p_metadata jsonb default '{}'::jsonb,p_occurred_at timestamptz default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_trip uuid; v_type text:=lower(trim(coalesce(p_event_type,'')));
begin
 if coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
 if v_type not in ('handoff_clicked','handoff_opened','affiliate_clicked','conversion_reported','conversion_approved','conversion_rejected','commission_paid') then raise exception 'ATTRIBUTION_EVENT_TYPE_INVALID'; end if;
 if p_booking_id is not null then select trip_id into v_trip from public.bookings where id=p_booking_id; end if; v_trip:=coalesce(v_trip,p_trip_id); if v_trip is null then raise exception 'TRIP_REQUIRED'; end if;
 insert into public.booking_attribution_events_v2(booking_id,trip_id,provider_id,partner_id,handoff_event_id,click_id,attribution_id,conversion_id,event_type,external_reference,metadata,occurred_at) values(p_booking_id,v_trip,nullif(lower(trim(coalesce(p_provider_id,''))),''),p_partner_id,p_handoff_event_id,p_click_id,p_attribution_id,p_conversion_id,v_type,nullif(trim(coalesce(p_external_reference,'')),''),coalesce(p_metadata,'{}'::jsonb),coalesce(p_occurred_at,now())) returning id into v_id;
 return v_id;
end $$;
revoke all on function public.luvia_booking_record_attribution_event_v2(uuid,uuid,text,text,uuid,uuid,uuid,uuid,uuid,text,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.luvia_booking_record_attribution_event_v2(uuid,uuid,text,text,uuid,uuid,uuid,uuid,uuid,text,jsonb,timestamptz) to service_role;

create or replace view public.booking_status_attribution_v2_summary with (security_invoker=true) as
select b.id as booking_id,b.trip_id,b.status,b.status_source,b.status_source_ref,b.status_verified_at,b.provider,b.provider_reference,
 (select count(*) from public.booking_status_signals s where s.booking_id=b.id) as status_signal_count,
 (select count(*) from public.booking_status_signals s where s.booking_id=b.id and s.resolution_state='conflict') as status_conflict_count,
 (select jsonb_build_object('source',s.source,'status',s.proposed_luvia_status,'providerStatus',s.provider_status,'occurredAt',s.occurred_at,'confidence',s.confidence,'resolutionState',s.resolution_state) from public.booking_status_signals s where s.booking_id=b.id order by s.occurred_at desc,s.received_at desc limit 1) as latest_status_signal,
 (select count(*) from public.booking_attribution_events_v2 a where a.booking_id=b.id) as attribution_event_count,
 (select max(a.occurred_at) from public.booking_attribution_events_v2 a where a.booking_id=b.id and a.event_type like 'conversion_%') as last_conversion_at,
 (select max(a.occurred_at) from public.booking_attribution_events_v2 a where a.booking_id=b.id and a.event_type='commission_paid') as commission_paid_at
from public.bookings b;
grant select on public.booking_status_attribution_v2_summary to authenticated,service_role;

comment on table public.booking_status_signals is 'V2 status evidence inbox. Status facts are resolved by source authority before they can mutate a booking.';
comment on table public.booking_attribution_events_v2 is 'Provider-neutral attribution journey. Handoff, click, conversion and commission facts remain separate from reservation confirmation.';
comment on function public.luvia_booking_ingest_status_signal(uuid,text,text,text,text,text,text,numeric,jsonb,timestamptz) is 'Booking Status V2 resolver. Affiliate callbacks and handoffs can never auto-confirm a reservation.';
commit;
