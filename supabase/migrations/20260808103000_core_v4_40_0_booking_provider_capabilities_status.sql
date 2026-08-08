-- Luvia Core 4.40.0 · Provider Capability & Status Foundation
-- Provider-neutral capability registry + unified status provenance.
begin;

alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check check(status in (
  'draft','ready','forwarded','requested','awaiting_reply','alternative_proposed','needs_action','confirmed','declined','cancelled','failed'
));
alter table public.bookings add column if not exists status_source text;
alter table public.bookings add column if not exists status_source_ref text;
alter table public.bookings add column if not exists status_verified_at timestamptz;
alter table public.bookings drop constraint if exists bookings_status_source_check;
alter table public.bookings add constraint bookings_status_source_check check(status_source is null or status_source in (
  'system','handoff','provider_webhook','provider_api','provider_polling','affiliate_callback','email_reply','user_confirmation'
));

create table if not exists public.booking_provider_capabilities(
  provider_id text primary key,
  display_name text not null,
  integration_tier text not null default 'external_handoff' check(integration_tier in ('connected','tracked_handoff','external_handoff','fallback')),
  booking_mode text not null default 'handoff' check(booking_mode in ('api','tracked_handoff','handoff','email')),
  luvia_access_state text not null default 'discovery' check(luvia_access_state in ('connected','partner_required','discovery','disabled')),
  supports_availability boolean,
  supports_create_reservation boolean,
  supports_status_webhook boolean,
  supports_status_polling boolean,
  attribution_mode text not null default 'none' check(attribution_mode in ('none','click','conversion')),
  commercial_access text not null default 'unknown' check(commercial_access in ('public','partner_required','private','unknown')),
  status_mapping jsonb not null default '{}'::jsonb check(jsonb_typeof(status_mapping)='object'),
  metadata jsonb not null default '{}'::jsonb check(jsonb_typeof(metadata)='object'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.booking_status_updates(
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  provider_id text,
  provider_reference text,
  provider_status text,
  luvia_status text not null check(luvia_status in ('draft','ready','forwarded','requested','awaiting_reply','alternative_proposed','needs_action','confirmed','declined','cancelled','failed')),
  source text not null check(source in ('system','handoff','provider_webhook','provider_api','provider_polling','affiliate_callback','email_reply','user_confirmation')),
  source_event_id text,
  evidence jsonb not null default '{}'::jsonb check(jsonb_typeof(evidence)='object'),
  occurred_at timestamptz not null default now(),
  applied boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists booking_status_updates_provider_event_uidx on public.booking_status_updates(provider_id,source,source_event_id) where source_event_id is not null;
create index if not exists booking_status_updates_booking_idx on public.booking_status_updates(booking_id,occurred_at desc,created_at desc);
create index if not exists booking_status_updates_provider_reference_idx on public.booking_status_updates(provider_id,provider_reference) where provider_reference is not null;

alter table public.booking_provider_capabilities enable row level security;
alter table public.booking_status_updates enable row level security;
grant select on public.booking_provider_capabilities to authenticated;
grant select on public.booking_status_updates to authenticated;
grant select,insert,update,delete on public.booking_provider_capabilities,public.booking_status_updates to service_role;

drop policy if exists booking_provider_capabilities_authenticated_select on public.booking_provider_capabilities;
create policy booking_provider_capabilities_authenticated_select on public.booking_provider_capabilities for select to authenticated using(active=true);
drop policy if exists booking_status_updates_trip_member_select on public.booking_status_updates;
create policy booking_status_updates_trip_member_select on public.booking_status_updates for select to authenticated using(public.luvia_booking_is_trip_member(trip_id));

insert into public.booking_provider_capabilities(provider_id,display_name,integration_tier,booking_mode,luvia_access_state,supports_availability,supports_create_reservation,supports_status_webhook,supports_status_polling,attribution_mode,commercial_access,metadata)
values
 ('thefork','TheFork','external_handoff','handoff','partner_required',true,true,true,true,'none','partner_required','{"capabilityBasis":"official_docs","note":"Platform supports booking lifecycle and webhooks; Luvia credentials not connected yet."}'::jsonb),
 ('zenchef','Zenchef','external_handoff','handoff','partner_required',true,true,true,true,'none','partner_required','{"capabilityBasis":"official_docs","note":"Platform supports reservations/availability and reservation webhooks; Luvia credentials not connected yet."}'::jsonb),
 ('quandoo','Quandoo','external_handoff','handoff','partner_required',true,true,true,true,'click','partner_required','{"capabilityBasis":"official_docs","note":"Partner API documents reservation webhooks and agent attribution; Luvia credentials not connected yet."}'::jsonb),
 ('opentable','OpenTable','external_handoff','handoff','partner_required',true,true,null,true,'none','partner_required','{"capabilityBasis":"official_docs","note":"API partner access required; webhook capability intentionally left unknown until partner contract is verified."}'::jsonb),
 ('sevenrooms','SevenRooms','external_handoff','handoff','partner_required',true,true,null,null,'none','partner_required','{"capabilityBasis":"official_product_docs","note":"API/integration platform exists; exact Luvia status-return rights remain unverified."}'::jsonb),
 ('resy','Resy','external_handoff','handoff','discovery',null,null,null,null,'none','partner_required','{"capabilityBasis":"pending_verification"}'::jsonb),
 ('tock','Tock','external_handoff','handoff','discovery',null,null,null,null,'none','partner_required','{"capabilityBasis":"pending_verification"}'::jsonb),
 ('official','Offizielle Reservierung','external_handoff','handoff','discovery',null,null,null,null,'none','unknown','{"capabilityBasis":"venue_specific"}'::jsonb),
 ('email','E-Mail-Fallback','fallback','email','connected',false,false,false,false,'none','public','{"capabilityBasis":"luvia_core"}'::jsonb)
on conflict(provider_id) do update set
 display_name=excluded.display_name,integration_tier=excluded.integration_tier,booking_mode=excluded.booking_mode,luvia_access_state=excluded.luvia_access_state,
 supports_availability=excluded.supports_availability,supports_create_reservation=excluded.supports_create_reservation,supports_status_webhook=excluded.supports_status_webhook,
 supports_status_polling=excluded.supports_status_polling,attribution_mode=excluded.attribution_mode,commercial_access=excluded.commercial_access,
 metadata=booking_provider_capabilities.metadata||excluded.metadata,updated_at=now();

create or replace function public.luvia_booking_transition_allowed(p_from text,p_to text)
returns boolean language sql immutable as $$
 select p_from=p_to or case p_from
  when 'draft' then p_to in ('ready','cancelled')
  when 'ready' then p_to in ('forwarded','requested','cancelled','failed')
  when 'forwarded' then p_to in ('ready','requested','awaiting_reply','confirmed','declined','alternative_proposed','needs_action','cancelled','failed')
  when 'requested' then p_to in ('awaiting_reply','confirmed','declined','alternative_proposed','needs_action','cancelled','failed')
  when 'awaiting_reply' then p_to in ('confirmed','declined','alternative_proposed','needs_action','cancelled','failed')
  when 'alternative_proposed' then p_to in ('requested','awaiting_reply','confirmed','declined','needs_action','cancelled','failed')
  when 'needs_action' then p_to in ('requested','awaiting_reply','confirmed','declined','alternative_proposed','cancelled','failed')
  when 'confirmed' then p_to in ('cancelled','needs_action','alternative_proposed')
  when 'declined' then p_to in ('ready','cancelled')
  when 'failed' then p_to in ('ready','cancelled')
  else false end;
$$;
grant execute on function public.luvia_booking_transition_allowed(text,text) to authenticated,service_role;

create or replace function public.luvia_transition_booking(p_booking_id uuid,p_status text,p_patch jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_booking public.bookings; v_old text; v_source text;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into v_booking from public.bookings where id=p_booking_id for update;
 if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
 if not public.luvia_booking_is_trip_member(v_booking.trip_id) then raise exception 'TRIP_ACCESS_DENIED'; end if;
 if p_status not in ('draft','ready','forwarded','requested','awaiting_reply','alternative_proposed','needs_action','confirmed','declined','cancelled','failed') then raise exception 'INVALID_BOOKING_STATUS'; end if;
 if not public.luvia_booking_transition_allowed(v_booking.status,p_status) then raise exception 'INVALID_BOOKING_TRANSITION: % -> %',v_booking.status,p_status; end if;
 v_old:=v_booking.status;
 v_source:=coalesce(nullif(p_patch->>'statusSource',''),nullif(p_patch->>'status_source',''),'user_confirmation');
 if v_source not in ('system','handoff','provider_webhook','provider_api','provider_polling','affiliate_callback','email_reply','user_confirmation') then v_source:='user_confirmation'; end if;
 update public.bookings set
  status=p_status,
  provider=coalesce(nullif(p_patch->>'provider',''),provider),
  provider_reference=coalesce(nullif(p_patch->>'providerReference',''),nullif(p_patch->>'provider_reference',''),provider_reference),
  confirmation_number=coalesce(nullif(p_patch->>'confirmationNumber',''),confirmation_number),
  contact=contact||coalesce(p_patch->'contact','{}'::jsonb),
  request=request||coalesce(p_patch->'request','{}'::jsonb),
  metadata=metadata||coalesce(p_patch->'metadata','{}'::jsonb),
  status_source=v_source,
  status_source_ref=coalesce(nullif(p_patch->>'statusSourceRef',''),nullif(p_patch->>'status_source_ref',''),status_source_ref),
  status_verified_at=case when p_status<>v_old then now() else status_verified_at end,
  confirmed_at=case when p_status='confirmed' then coalesce(confirmed_at,now()) else confirmed_at end,
  cancelled_at=case when p_status='cancelled' then coalesce(cancelled_at,now()) else cancelled_at end,
  updated_at=now()
 where id=p_booking_id returning * into v_booking;
 if v_old is distinct from p_status then
  insert into public.booking_events(booking_id,trip_id,actor_user_id,event_type,from_status,to_status,payload)
  values(v_booking.id,v_booking.trip_id,auth.uid(),'booking.status.changed',v_old,p_status,jsonb_build_object('patch',coalesce(p_patch,'{}'::jsonb),'statusSource',v_source));
  insert into public.booking_status_updates(booking_id,trip_id,provider_id,provider_reference,luvia_status,source,source_event_id,evidence,occurred_at,applied)
  values(v_booking.id,v_booking.trip_id,v_booking.provider,v_booking.provider_reference,p_status,v_source,nullif(p_patch->>'statusSourceRef',''),jsonb_build_object('patch',coalesce(p_patch,'{}'::jsonb),'actorUserId',auth.uid()),now(),true);
 end if;
 return to_jsonb(v_booking);
end $$;
revoke all on function public.luvia_transition_booking(uuid,text,jsonb) from public;
grant execute on function public.luvia_transition_booking(uuid,text,jsonb) to authenticated,service_role;

create or replace function public.luvia_booking_record_handoff(
 p_booking_id uuid,p_provider text,p_external_url text,p_provider_reference text default null,p_metadata jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path=public as $$
declare b public.bookings; v_provider text; v_old text;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into b from public.bookings where id=p_booking_id for update;
 if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
 if not public.luvia_booking_is_trip_member(b.trip_id) then raise exception 'TRIP_ACCESS_DENIED'; end if;
 if b.status not in ('ready','forwarded') then raise exception 'HANDOFF_REQUIRES_READY_BOOKING'; end if;
 v_provider:=lower(trim(coalesce(p_provider,'official'))); if v_provider='' then v_provider:='official'; end if;
 if trim(coalesce(p_external_url,'')) !~* '^https://' then raise exception 'HANDOFF_HTTPS_URL_REQUIRED'; end if;
 v_old:=b.status;
 update public.bookings set status='forwarded',channel='external_link',provider=v_provider,provider_reference=coalesce(nullif(trim(coalesce(p_provider_reference,'')),''),provider_reference),
  status_source='handoff',status_source_ref=trim(p_external_url),status_verified_at=now(),metadata=metadata||jsonb_build_object('handoff',coalesce(p_metadata,'{}'::jsonb)||jsonb_build_object('url',trim(p_external_url),'at',now())),updated_at=now()
 where id=b.id returning * into b;
 if v_old is distinct from 'forwarded' then
  insert into public.booking_events(booking_id,trip_id,actor_user_id,event_type,from_status,to_status,payload) values(b.id,b.trip_id,auth.uid(),'booking.forwarded',v_old,'forwarded',jsonb_build_object('provider',v_provider,'url',trim(p_external_url)));
  insert into public.booking_status_updates(booking_id,trip_id,provider_id,provider_reference,provider_status,luvia_status,source,source_event_id,evidence,occurred_at,applied)
  values(b.id,b.trip_id,v_provider,b.provider_reference,'handoff','forwarded','handoff',trim(p_external_url),jsonb_build_object('url',trim(p_external_url),'metadata',coalesce(p_metadata,'{}'::jsonb)),now(),true);
 end if;
 return to_jsonb(b);
end $$;
revoke all on function public.luvia_booking_record_handoff(uuid,text,text,text,jsonb) from public;
grant execute on function public.luvia_booking_record_handoff(uuid,text,text,text,jsonb) to authenticated,service_role;

create or replace function public.luvia_booking_apply_provider_status(
 p_booking_id uuid,p_provider text,p_provider_reference text,p_provider_status text,p_luvia_status text,p_source text,p_event_id text default null,p_payload jsonb default '{}'::jsonb,p_occurred_at timestamptz default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare b public.bookings; c public.booking_provider_capabilities; v_status text; v_source text; v_event public.booking_status_updates; v_old text;
begin
 if coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
 v_status:=lower(trim(coalesce(p_luvia_status,''))); v_source:=lower(trim(coalesce(p_source,'')));
 if v_status not in ('requested','awaiting_reply','alternative_proposed','needs_action','confirmed','declined','cancelled','failed') then raise exception 'PROVIDER_STATUS_TARGET_INVALID'; end if;
 if v_source not in ('provider_webhook','provider_api','provider_polling') then raise exception 'PROVIDER_STATUS_SOURCE_INVALID'; end if;
 select * into b from public.bookings where id=p_booking_id for update; if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
 select * into c from public.booking_provider_capabilities where provider_id=lower(trim(coalesce(p_provider,''))) and active=true;
 if not found then raise exception 'PROVIDER_CAPABILITY_NOT_FOUND'; end if;
 if c.luvia_access_state<>'connected' then raise exception 'PROVIDER_NOT_CONNECTED_FOR_STATUS'; end if;
 if v_source='provider_webhook' and c.supports_status_webhook is distinct from true then raise exception 'PROVIDER_WEBHOOK_STATUS_NOT_ENABLED'; end if;
 if v_source='provider_polling' and c.supports_status_polling is distinct from true then raise exception 'PROVIDER_POLLING_STATUS_NOT_ENABLED'; end if;
 if p_event_id is not null then select * into v_event from public.booking_status_updates where provider_id=c.provider_id and source=v_source and source_event_id=p_event_id limit 1; if found then return jsonb_build_object('duplicate',true,'updateId',v_event.id,'bookingId',v_event.booking_id,'status',v_event.luvia_status); end if; end if;
 if not public.luvia_booking_transition_allowed(b.status,v_status) then raise exception 'INVALID_PROVIDER_STATUS_TRANSITION: % -> %',b.status,v_status; end if;
 v_old:=b.status;
 update public.bookings set status=v_status,provider=c.provider_id,provider_reference=coalesce(nullif(trim(coalesce(p_provider_reference,'')),''),provider_reference),status_source=v_source,status_source_ref=coalesce(nullif(trim(coalesce(p_event_id,'')),''),nullif(trim(coalesce(p_provider_reference,'')),'')),status_verified_at=coalesce(p_occurred_at,now()),updated_at=now(),confirmed_at=case when v_status='confirmed' then coalesce(confirmed_at,coalesce(p_occurred_at,now())) else confirmed_at end,cancelled_at=case when v_status='cancelled' then coalesce(cancelled_at,coalesce(p_occurred_at,now())) else cancelled_at end where id=b.id returning * into b;
 insert into public.booking_status_updates(booking_id,trip_id,provider_id,provider_reference,provider_status,luvia_status,source,source_event_id,evidence,occurred_at,applied)
 values(b.id,b.trip_id,c.provider_id,b.provider_reference,nullif(trim(coalesce(p_provider_status,'')),''),v_status,v_source,nullif(trim(coalesce(p_event_id,'')),''),coalesce(p_payload,'{}'::jsonb),coalesce(p_occurred_at,now()),true) returning * into v_event;
 insert into public.booking_events(booking_id,trip_id,event_type,from_status,to_status,payload) values(b.id,b.trip_id,'booking.provider.status.applied',v_old,v_status,jsonb_build_object('provider',c.provider_id,'providerStatus',p_provider_status,'providerReference',b.provider_reference,'source',v_source,'sourceEventId',p_event_id,'statusUpdateId',v_event.id));
 return jsonb_build_object('duplicate',false,'booking',to_jsonb(b),'statusUpdateId',v_event.id);
end $$;
revoke all on function public.luvia_booking_apply_provider_status(uuid,text,text,text,text,text,text,jsonb,timestamptz) from public;
grant execute on function public.luvia_booking_apply_provider_status(uuid,text,text,text,text,text,text,jsonb,timestamptz) to service_role;

comment on table public.booking_provider_capabilities is 'Provider-neutral capability/access registry. Platform capability does not imply that Luvia has partner credentials.';
comment on table public.booking_status_updates is 'Immutable-ish booking status provenance facts. Handoff, provider APIs/webhooks, e-mail and user confirmation remain distinguishable.';
comment on function public.luvia_booking_apply_provider_status(uuid,text,text,text,text,text,text,jsonb,timestamptz) is 'Service-role seam for future provider adapters. A provider cannot auto-confirm unless Luvia access is explicitly marked connected and the declared status transport is enabled.';

commit;
