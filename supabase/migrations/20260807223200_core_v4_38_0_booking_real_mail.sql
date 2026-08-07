-- Luvia Booking Core V0.3 · Real Mail Transport & Inbound Replies
begin;
alter table public.booking_messages add column if not exists provider_message_id text;
alter table public.booking_messages add column if not exists provider_thread_id text;
alter table public.booking_messages add column if not exists message_id_header text;
alter table public.booking_messages add column if not exists in_reply_to text;
alter table public.booking_messages add column if not exists references_header text;
alter table public.booking_messages add column if not exists webhook_event_id text;
create unique index if not exists booking_messages_provider_message_uidx on public.booking_messages(transport_provider,provider_message_id) where provider_message_id is not null;
create unique index if not exists booking_messages_webhook_event_uidx on public.booking_messages(webhook_event_id) where webhook_event_id is not null;
create index if not exists booking_messages_message_id_header_idx on public.booking_messages(message_id_header) where message_id_header is not null;

create or replace function public.luvia_booking_match_inbound(
 p_to text[], p_in_reply_to text default null, p_references text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_booking uuid; v_alias text; v_ref text;
begin
 foreach v_alias in array coalesce(p_to,array[]::text[]) loop
   select bm.booking_id into v_booking from public.booking_messages bm
   where bm.direction='outbound' and (lower(bm.sender)=lower(v_alias) or lower(coalesce(bm.metadata->>'replyTo',''))=lower(v_alias))
   order by bm.created_at desc limit 1;
   if v_booking is not null then return v_booking; end if;
 end loop;
 if nullif(trim(coalesce(p_in_reply_to,'')),'') is not null then
   select booking_id into v_booking from public.booking_messages where message_id_header=p_in_reply_to order by created_at desc limit 1;
   if v_booking is not null then return v_booking; end if;
 end if;
 if nullif(trim(coalesce(p_references,'')),'') is not null then
   for v_ref in select regexp_split_to_table(p_references,'\\s+') loop
     select booking_id into v_booking from public.booking_messages where message_id_header=v_ref order by created_at desc limit 1;
     if v_booking is not null then return v_booking; end if;
   end loop;
 end if;
 return null;
end $$;
revoke all on function public.luvia_booking_match_inbound(text[],text,text) from public;
grant execute on function public.luvia_booking_match_inbound(text[],text,text) to service_role;

comment on function public.luvia_booking_match_inbound(text[],text,text) is 'V0.3 server-side inbound reply matcher. Matches reply alias first, then Message-ID threading headers.';
commit;
