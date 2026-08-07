-- Luvia Booking Core V0.4 · Reservation Intelligence
-- Production integration upgrade.
begin;

-- V0.3.1 hardening discovered during real E2E testing: server-side webhooks need explicit table grants.
grant select,insert,update,delete on table
 public.bookings,public.booking_messages,public.booking_events,public.booking_provider_links
to service_role;

create table if not exists public.booking_message_intelligence(
 id uuid primary key default gen_random_uuid(),
 booking_id uuid not null references public.bookings(id) on delete cascade,
 message_id uuid not null references public.booking_messages(id) on delete cascade,
 classifier text not null default 'rules',
 classifier_version text not null default '0.4.0',
 intent text not null check(intent in ('confirmed','declined','alternative_proposed','needs_action','informational','unknown')),
 confidence numeric(5,4) not null check(confidence>=0 and confidence<=1),
 proposed_status text check(proposed_status is null or proposed_status in ('confirmed','declined','needs_action')),
 auto_apply boolean not null default false,
 applied boolean not null default false,
 applied_status text check(applied_status is null or applied_status in ('confirmed','declined','needs_action')),
 requires_user_action boolean not null default false,
 review_required boolean not null default false,
 visible_reply text,
 evidence jsonb not null default '[]'::jsonb,
 extracted jsonb not null default '{}'::jsonb,
 raw_result jsonb not null default '{}'::jsonb,
 classified_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(message_id)
);
create index if not exists booking_message_intelligence_booking_idx on public.booking_message_intelligence(booking_id,classified_at desc);
create index if not exists booking_message_intelligence_review_idx on public.booking_message_intelligence(review_required,classified_at desc) where review_required=true;

alter table public.booking_message_intelligence enable row level security;
grant select on public.booking_message_intelligence to authenticated;
grant select,insert,update,delete on public.booking_message_intelligence to service_role;

drop policy if exists booking_message_intelligence_trip_member_select on public.booking_message_intelligence;
create policy booking_message_intelligence_trip_member_select on public.booking_message_intelligence
for select to authenticated using(exists(
 select 1 from public.bookings b where b.id=booking_id and public.luvia_booking_is_trip_member(b.trip_id)
));

-- Server-side state-machine seam. service_role only; keeps webhook transitions inside the canonical transition rules.
create or replace function public.luvia_booking_service_transition(p_booking_id uuid,p_status text,p_patch jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_booking public.bookings; v_old text;
begin
 select * into v_booking from public.bookings where id=p_booking_id for update;
 if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
 if p_status not in ('draft','ready','requested','awaiting_reply','needs_action','confirmed','declined','cancelled','failed') then raise exception 'INVALID_BOOKING_STATUS'; end if;
 if not public.luvia_booking_transition_allowed(v_booking.status,p_status) then raise exception 'INVALID_BOOKING_TRANSITION: % -> %',v_booking.status,p_status; end if;
 v_old:=v_booking.status;
 update public.bookings set
  status=p_status,
  provider=coalesce(nullif(p_patch->>'provider',''),provider),
  provider_reference=coalesce(nullif(p_patch->>'provider_reference',''),provider_reference),
  channel=coalesce(nullif(p_patch->>'channel',''),channel),
  confirmation_number=coalesce(nullif(p_patch->>'confirmation_number',''),confirmation_number),
  metadata=metadata||coalesce(p_patch->'metadata','{}'::jsonb),
  confirmed_at=case when p_status='confirmed' then coalesce(confirmed_at,now()) else confirmed_at end,
  cancelled_at=case when p_status='cancelled' then coalesce(cancelled_at,now()) else cancelled_at end,
  updated_at=now()
 where id=p_booking_id returning * into v_booking;
 insert into public.booking_events(booking_id,trip_id,actor_user_id,event_type,from_status,to_status,payload)
 values(v_booking.id,v_booking.trip_id,null,'booking.'||p_status,v_old,p_status,coalesce(p_patch,'{}'::jsonb)||jsonb_build_object('source','booking-intelligence'));
 return to_jsonb(v_booking);
end $$;
revoke all on function public.luvia_booking_service_transition(uuid,text,jsonb) from public;
grant execute on function public.luvia_booking_service_transition(uuid,text,jsonb) to service_role;

-- Pure deterministic classifier. No external AI/API dependency in V0.4.
create or replace function public.luvia_booking_classify_reply(p_subject text,p_body_text text)
returns jsonb language plpgsql immutable as $$
declare
 v_reply text:=trim(coalesce(p_body_text,''));
 v_text text;
 v_intent text:='unknown'; v_conf numeric:=0.45; v_status text:=null;
 v_auto boolean:=false; v_action boolean:=true; v_review boolean:=false;
 v_evidence jsonb:='[]'::jsonb; v_extracted jsonb:='{}'::jsonb;
 v_time text; v_date text;
begin
 -- Remove common quoted-reply blocks so the original outbound request does not influence the decision.
 v_reply:=regexp_replace(v_reply,E'(?is)\\n[^\\n]{0,240}schrieb am[^\\n]*:.*$','','g');
 v_reply:=regexp_replace(v_reply,E'(?is)\\nOn [^\\n]{0,240} wrote:.*$','','g');
 v_reply:=regexp_replace(v_reply,E'(?is)\\nLe [^\\n]{0,240} a écrit\\s*:.*$','','g');
 v_reply:=regexp_replace(v_reply,E'(?is)\\n>.*$','','g');
 if length(trim(v_reply))=0 then v_reply:=left(coalesce(p_body_text,''),2000); end if;
 v_text:=lower(coalesce(p_subject,'')||E'\\n'||v_reply);

 -- Decline first: negated confirmations must never be mistaken for confirmations.
 if v_text ~ '(leider.{0,80}(nicht|keine|kein|ausgebucht|voll)|nicht möglich|nicht verfügbar|keine verfügbarkeit|ausgebucht|vollständig belegt|nicht bestätigen|cannot confirm|no availability|fully booked|unable to accommodate|aucune disponibilité|ne pouvons pas confirmer|complet)' then
  v_intent:='declined';v_conf:=0.97;v_status:='declined';v_action:=false;v_evidence:='["explicit_decline"]'::jsonb;
 elsif v_text ~ '(stattdessen|alternativ|als alternative|andere uhrzeit|anderen termin|available at|another time|alternative|instead|proposons|disponible à)' then
  v_intent:='alternative_proposed';v_conf:=0.94;v_status:='needs_action';v_action:=true;v_evidence:='["explicit_alternative"]'::jsonb;
 elsif trim(lower(v_reply)) ~ '^(bestätigt|confirmed|confirmée|confirmee)[.! ]*$'
    or v_text ~ '(reservierung|buchung|tisch).{0,45}(ist|wurde|wird).{0,12}bestätigt'
    or v_text ~ '(gerne|hiermit).{0,15}bestätigen wir|ist für sie reserviert|haben wir.{0,30}reserviert|we confirm|reservation is confirmed|your booking is confirmed|table is reserved|réservation.{0,30}confirmée|nous confirmons|table.{0,30}réservée' then
  v_intent:='confirmed';v_conf:=0.98;v_status:='confirmed';v_action:=false;v_evidence:='["explicit_confirmation"]'::jsonb;
 elsif v_text ~ '(kreditkarte|kartendaten|anzahlung|vorkasse|zahlung|deposit|prepayment|credit card|carte bancaire|acompte|please confirm|please reply|bitte.{0,30}(bestätigen|antworten|anrufen|kontaktieren|auswählen)|merci de.{0,30}(confirmer|répondre|appeler|choisir))' then
  v_intent:='needs_action';v_conf:=0.92;v_status:='needs_action';v_action:=true;v_evidence:='["explicit_action_required"]'::jsonb;
 elsif v_text ~ '(wir melden uns|in bearbeitung|wird geprüft|we will get back|under review|nous revenons vers vous)' then
  v_intent:='informational';v_conf:=0.82;v_status:=null;v_action:=false;v_evidence:='["informational_reply"]'::jsonb;
 elsif v_text ~ '(bestätigen|confirm|réservation|reservierung|buchung)' then
  v_intent:='unknown';v_conf:=0.62;v_status:=null;v_action:=true;v_evidence:='["booking_language_without_decision"]'::jsonb;
 end if;

 select (regexp_match(v_reply,'(?i)\\b(?:um|at|à)?\\s*([01]?[0-9]|2[0-3])[:.]([0-5][0-9])\\s*(?:uhr|h)?\\b'))[1]||':'||(regexp_match(v_reply,'(?i)\\b(?:um|at|à)?\\s*([01]?[0-9]|2[0-3])[:.]([0-5][0-9])\\s*(?:uhr|h)?\\b'))[2] into v_time;
 if v_time is not null then v_extracted:=v_extracted||jsonb_build_object('proposedTime',lpad(split_part(v_time,':',1),2,'0')||':'||split_part(v_time,':',2)); end if;
 select (regexp_match(v_reply,'\\b([0-3]?[0-9])[./-]([01]?[0-9])[./-](20[0-9]{2})\\b'))[3]||'-'||lpad((regexp_match(v_reply,'\\b([0-3]?[0-9])[./-]([01]?[0-9])[./-](20[0-9]{2})\\b'))[2],2,'0')||'-'||lpad((regexp_match(v_reply,'\\b([0-3]?[0-9])[./-]([01]?[0-9])[./-](20[0-9]{2})\\b'))[1],2,'0') into v_date;
 if v_date is not null then v_extracted:=v_extracted||jsonb_build_object('proposedDate',v_date); end if;

 v_auto:=v_conf>=0.90 and v_status is not null;
 v_review:=not v_auto and v_conf>=0.70;
 return jsonb_build_object('classifier','rules','version','0.4.0','intent',v_intent,'confidence',v_conf,'proposedStatus',v_status,'autoApply',v_auto,'requiresUserAction',v_action,'reviewRequired',v_review,'visibleReply',trim(v_reply),'evidence',v_evidence,'extracted',v_extracted);
end $$;
revoke all on function public.luvia_booking_classify_reply(text,text) from public;
grant execute on function public.luvia_booking_classify_reply(text,text) to service_role;

create or replace function public.luvia_booking_process_inbound_intelligence(p_message_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
 v_msg public.booking_messages; v_booking public.bookings; v_result jsonb;
 v_intent text; v_conf numeric; v_proposed text; v_auto boolean; v_applied boolean:=false; v_applied_status text:=null;
begin
 select * into v_msg from public.booking_messages where id=p_message_id and direction='inbound' for update;
 if not found then raise exception 'INBOUND_MESSAGE_NOT_FOUND'; end if;
 select * into v_booking from public.bookings where id=v_msg.booking_id for update;
 if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
 v_result:=public.luvia_booking_classify_reply(v_msg.subject,v_msg.body_text);
 v_intent:=v_result->>'intent'; v_conf:=(v_result->>'confidence')::numeric; v_proposed:=nullif(v_result->>'proposedStatus',''); v_auto:=coalesce((v_result->>'autoApply')::boolean,false);

 if v_auto and v_proposed is not null and public.luvia_booking_transition_allowed(v_booking.status,v_proposed) then
   perform public.luvia_booking_service_transition(v_booking.id,v_proposed,jsonb_build_object('metadata',jsonb_build_object('last_intelligence_intent',v_intent,'last_intelligence_confidence',v_conf,'last_intelligence_message_id',v_msg.id)));
   v_applied:=true;v_applied_status:=v_proposed;
 end if;

 insert into public.booking_message_intelligence(booking_id,message_id,classifier,classifier_version,intent,confidence,proposed_status,auto_apply,applied,applied_status,requires_user_action,review_required,visible_reply,evidence,extracted,raw_result,classified_at,updated_at)
 values(v_booking.id,v_msg.id,'rules','0.4.0',v_intent,v_conf,v_proposed,v_auto,v_applied,v_applied_status,coalesce((v_result->>'requiresUserAction')::boolean,false),coalesce((v_result->>'reviewRequired')::boolean,false),v_result->>'visibleReply',coalesce(v_result->'evidence','[]'::jsonb),coalesce(v_result->'extracted','{}'::jsonb),v_result,now(),now())
 on conflict(message_id) do update set classifier='rules',classifier_version='0.4.0',intent=excluded.intent,confidence=excluded.confidence,proposed_status=excluded.proposed_status,auto_apply=excluded.auto_apply,applied=excluded.applied,applied_status=excluded.applied_status,requires_user_action=excluded.requires_user_action,review_required=excluded.review_required,visible_reply=excluded.visible_reply,evidence=excluded.evidence,extracted=excluded.extracted,raw_result=excluded.raw_result,classified_at=now(),updated_at=now();

 insert into public.booking_events(booking_id,trip_id,actor_user_id,event_type,payload)
 values(v_booking.id,v_booking.trip_id,null,case when v_applied then 'booking.intelligence.applied' when coalesce((v_result->>'reviewRequired')::boolean,false) then 'booking.intelligence.needs_review' else 'booking.intelligence.classified' end,
 jsonb_build_object('message_id',v_msg.id,'intent',v_intent,'confidence',v_conf,'proposed_status',v_proposed,'applied',v_applied,'applied_status',v_applied_status,'classifier_version','0.4.0'));
 return v_result||jsonb_build_object('bookingId',v_booking.id,'messageId',v_msg.id,'applied',v_applied,'appliedStatus',v_applied_status);
end $$;
revoke all on function public.luvia_booking_process_inbound_intelligence(uuid) from public;
grant execute on function public.luvia_booking_process_inbound_intelligence(uuid) to service_role;

comment on table public.booking_message_intelligence is 'Auditable V0.4 reservation-reply classifications. One current decision per inbound message.';
comment on function public.luvia_booking_process_inbound_intelligence(uuid) is 'Classifies one inbound booking message and auto-applies only high-confidence safe state transitions.';

commit;
