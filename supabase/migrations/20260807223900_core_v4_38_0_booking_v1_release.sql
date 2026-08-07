begin;
do $$
declare missing text[]:=array[]::text[];
begin
 if to_regclass('public.bookings') is null then missing:=array_append(missing,'bookings'); end if;
 if to_regclass('public.booking_messages') is null then missing:=array_append(missing,'booking_messages'); end if;
 if to_regclass('public.booking_events') is null then missing:=array_append(missing,'booking_events'); end if;
 if to_regclass('public.booking_integration_summary') is null then missing:=array_append(missing,'booking_integration_summary'); end if;
 if array_length(missing,1) is not null then raise exception 'BOOKING_CORE_V1_SCHEMA_INCOMPLETE: %',array_to_string(missing,', '); end if;
 if to_regprocedure('public.luvia_booking_plan_route(uuid,text[])') is null then raise exception 'BOOKING_CORE_V1_ROUTE_FUNCTION_MISSING'; end if;
 if to_regprocedure('public.luvia_booking_process_inbound_intelligence(uuid)') is null then raise exception 'BOOKING_CORE_V1_INTELLIGENCE_FUNCTION_MISSING'; end if;
end $$;
insert into public.booking_health_checks(check_key,status,details,checked_at)
values('release','ok',jsonb_build_object('version','1.0.2','integration_ready',true,'luvia_core','4.38.0','luvia_build','13.38.0','checked_at',now()),now())
on conflict(check_key) do update set status=excluded.status,details=excluded.details,checked_at=excluded.checked_at;
comment on view public.booking_integration_summary is 'Luvia Booking Core V1.0.2 production integration read model.';
commit;