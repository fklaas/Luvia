-- Luvia Booking Core V0.2 · Communication Foundation
-- Production integration upgrade.
begin;

alter table public.booking_messages add column if not exists transport_provider text;
alter table public.booking_messages add column if not exists intended_recipient text;
alter table public.booking_messages add column if not exists actual_recipient text;
alter table public.booking_messages add column if not exists template_key text;
alter table public.booking_messages add column if not exists idempotency_key text;
alter table public.booking_messages add column if not exists sent_at timestamptz;
alter table public.booking_messages add column if not exists received_at timestamptz;

update public.booking_messages set delivery_status='queued' where delivery_status is null;
alter table public.booking_messages alter column delivery_status set default 'queued';

do $$ begin
 if not exists(select 1 from pg_constraint where conname='booking_messages_delivery_status_check') then
  alter table public.booking_messages add constraint booking_messages_delivery_status_check check(delivery_status in ('queued','sent','delivered','received','failed'));
 end if;
end $$;

create unique index if not exists booking_messages_idempotency_uidx on public.booking_messages(idempotency_key) where idempotency_key is not null;
create index if not exists booking_messages_delivery_idx on public.booking_messages(booking_id,delivery_status,created_at desc);

create or replace function public.luvia_booking_record_message(
 p_booking_id uuid,
 p_direction text,
 p_channel text default 'email',
 p_transport_provider text default null,
 p_sender text default null,
 p_recipient text default null,
 p_intended_recipient text default null,
 p_actual_recipient text default null,
 p_subject text default null,
 p_body_text text default null,
 p_template_key text default null,
 p_provider_message_id text default null,
 p_provider_thread_id text default null,
 p_delivery_status text default 'queued',
 p_idempotency_key text default null,
 p_metadata jsonb default '{}'::jsonb,
 p_raw_payload jsonb default '{}'::jsonb
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_booking public.bookings; v_message public.booking_messages;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into v_booking from public.bookings where id=p_booking_id;
 if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
 if not public.luvia_booking_is_trip_member(v_booking.trip_id) then raise exception 'TRIP_ACCESS_DENIED'; end if;
 if p_direction not in ('outbound','inbound','system') then raise exception 'INVALID_MESSAGE_DIRECTION'; end if;
 if p_delivery_status not in ('queued','sent','delivered','received','failed') then raise exception 'INVALID_DELIVERY_STATUS'; end if;
 if p_idempotency_key is not null then
  select * into v_message from public.booking_messages where idempotency_key=p_idempotency_key;
  if found then return to_jsonb(v_message); end if;
 end if;
 insert into public.booking_messages(booking_id,direction,channel,transport_provider,sender,recipient,intended_recipient,actual_recipient,subject,body_text,template_key,provider_message_id,provider_thread_id,delivery_status,idempotency_key,metadata,raw_payload,sent_at,received_at)
 values(p_booking_id,p_direction,coalesce(nullif(p_channel,''),'email'),p_transport_provider,p_sender,p_recipient,p_intended_recipient,p_actual_recipient,p_subject,p_body_text,p_template_key,p_provider_message_id,p_provider_thread_id,p_delivery_status,p_idempotency_key,coalesce(p_metadata,'{}'::jsonb),coalesce(p_raw_payload,'{}'::jsonb),case when p_delivery_status in ('sent','delivered') then now() else null end,case when p_direction='inbound' or p_delivery_status='received' then now() else null end)
 returning * into v_message;
 insert into public.booking_events(booking_id,trip_id,actor_user_id,event_type,payload)
 values(v_booking.id,v_booking.trip_id,auth.uid(),case when p_direction='inbound' then 'booking.message.received' when p_delivery_status='failed' then 'booking.message.failed' else 'booking.message.'||p_delivery_status end,jsonb_build_object('message_id',v_message.id,'transport_provider',p_transport_provider,'delivery_status',p_delivery_status));
 return to_jsonb(v_message);
end $$;
revoke all on function public.luvia_booking_record_message(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,jsonb,jsonb) from public;
grant execute on function public.luvia_booking_record_message(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,jsonb,jsonb) to authenticated;

comment on function public.luvia_booking_record_message(uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,text,jsonb,jsonb) is 'V0.2 communication seam with membership checks and idempotent message recording.';
comment on column public.booking_messages.intended_recipient is 'Original business recipient. In test/staging this MUST NOT be used as transport recipient.';
comment on column public.booking_messages.actual_recipient is 'Actual transport recipient after environment safety routing.';

commit;
