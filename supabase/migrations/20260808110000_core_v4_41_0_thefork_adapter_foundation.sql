begin;

create table if not exists public.booking_provider_references(
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  provider_id text not null references public.booking_provider_capabilities(provider_id),
  venue_reference text,
  reservation_reference text,
  reference_state text not null default 'discovered' check(reference_state in ('discovered','prepared','created','active','cancelled','failed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(booking_id,provider_id)
);
create unique index if not exists booking_provider_references_provider_reservation_uidx on public.booking_provider_references(provider_id,reservation_reference) where reservation_reference is not null;
create index if not exists booking_provider_references_venue_idx on public.booking_provider_references(provider_id,venue_reference) where venue_reference is not null;

alter table public.booking_provider_references enable row level security;
grant select on public.booking_provider_references to authenticated;
grant select,insert,update,delete on public.booking_provider_references to service_role;
drop policy if exists booking_provider_references_trip_member_select on public.booking_provider_references;
create policy booking_provider_references_trip_member_select on public.booking_provider_references for select to authenticated using(public.luvia_booking_is_trip_member(trip_id));

create or replace function public.luvia_booking_provider_reference_upsert(
 p_booking_id uuid,p_provider_id text,p_venue_reference text default null,p_reservation_reference text default null,p_reference_state text default 'discovered',p_metadata jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path=public as $$
declare b public.bookings; r public.booking_provider_references; v_provider text; v_state text;
begin
 if coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
 select * into b from public.bookings where id=p_booking_id; if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
 v_provider:=lower(trim(coalesce(p_provider_id,''))); if v_provider='' then raise exception 'PROVIDER_REQUIRED'; end if;
 if not exists(select 1 from public.booking_provider_capabilities where provider_id=v_provider and active=true) then raise exception 'PROVIDER_CAPABILITY_NOT_FOUND'; end if;
 v_state:=lower(trim(coalesce(p_reference_state,'discovered'))); if v_state not in ('discovered','prepared','created','active','cancelled','failed') then raise exception 'INVALID_REFERENCE_STATE'; end if;
 insert into public.booking_provider_references(booking_id,trip_id,provider_id,venue_reference,reservation_reference,reference_state,metadata)
 values(b.id,b.trip_id,v_provider,nullif(trim(coalesce(p_venue_reference,'')),''),nullif(trim(coalesce(p_reservation_reference,'')),''),v_state,coalesce(p_metadata,'{}'::jsonb))
 on conflict(booking_id,provider_id) do update set venue_reference=coalesce(excluded.venue_reference,booking_provider_references.venue_reference),reservation_reference=coalesce(excluded.reservation_reference,booking_provider_references.reservation_reference),reference_state=excluded.reference_state,metadata=booking_provider_references.metadata||excluded.metadata,updated_at=now()
 returning * into r;
 return to_jsonb(r);
end $$;
revoke all on function public.luvia_booking_provider_reference_upsert(uuid,text,text,text,text,jsonb) from public;
grant execute on function public.luvia_booking_provider_reference_upsert(uuid,text,text,text,text,jsonb) to service_role;

create or replace function public.luvia_booking_find_by_provider_reference(p_provider_id text,p_reservation_reference text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r public.booking_provider_references;
begin
 if coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role' then raise exception 'SERVICE_ROLE_REQUIRED'; end if;
 select * into r from public.booking_provider_references where provider_id=lower(trim(coalesce(p_provider_id,''))) and reservation_reference=trim(coalesce(p_reservation_reference,'')) limit 1;
 if not found then return null; end if;
 return to_jsonb(r);
end $$;
revoke all on function public.luvia_booking_find_by_provider_reference(text,text) from public;
grant execute on function public.luvia_booking_find_by_provider_reference(text,text) to service_role;

update public.booking_provider_capabilities set metadata=metadata||jsonb_build_object(
 'adapter',jsonb_build_object(
   'version','1.0.0',
   'foundationReady',true,
   'apiBase','https://api.thefork.io/manager/v1',
   'restaurantReferenceType','uuid',
   'reservationReferenceType','provider_reference',
   'liveTransportEnabled',false,
   'statusContract','unified_provenance_v1'
 )
) where provider_id='thefork';

comment on table public.booking_provider_references is 'Provider entity/reference seam. Keeps venue IDs and reservation IDs separate from Luvia booking IDs.';
comment on function public.luvia_booking_provider_reference_upsert(uuid,text,text,text,text,jsonb) is 'Service-role adapter seam for storing provider venue/reservation references without exposing provider credentials to the client.';

commit;
