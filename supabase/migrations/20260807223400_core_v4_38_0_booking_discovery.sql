-- Luvia Booking Core V0.5 · Booking Discovery & Contact Resolution
-- Production integration upgrade.
begin;

create table if not exists public.booking_discovery_runs(
 id uuid primary key default gen_random_uuid(),
 booking_id uuid not null references public.bookings(id) on delete cascade,
 trip_id uuid not null,
 status text not null default 'running' check(status in ('running','resolved','unresolved','failed')),
 started_at timestamptz not null default now(),
 finished_at timestamptz,
 resolver_version text not null default '0.5.0',
 source_count integer not null default 0,
 result jsonb not null default '{}'::jsonb,
 error jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);

create table if not exists public.booking_contact_candidates(
 id uuid primary key default gen_random_uuid(),
 booking_id uuid not null references public.bookings(id) on delete cascade,
 discovery_run_id uuid references public.booking_discovery_runs(id) on delete cascade,
 kind text not null check(kind in ('official_api','booking_provider','reservation_link','public_reservation_email','public_contact_email','manual')),
 channel text not null check(channel in ('email','api','external_link','manual')),
 provider text,
 contact_value text,
 source_url text,
 is_public boolean not null default false,
 is_official boolean not null default false,
 verification_status text not null default 'unverified' check(verification_status in ('unverified','verified','rejected','stale')),
 confidence numeric(5,4) not null default 0 check(confidence>=0 and confidence<=1),
 auto_usable boolean not null default false,
 evidence jsonb not null default '{}'::jsonb,
 metadata jsonb not null default '{}'::jsonb,
 discovered_at timestamptz not null default now(),
 last_verified_at timestamptz,
 created_at timestamptz not null default now(),
 unique(booking_id,kind,contact_value,source_url)
);

create table if not exists public.booking_channel_resolutions(
 id uuid primary key default gen_random_uuid(),
 booking_id uuid not null references public.bookings(id) on delete cascade,
 discovery_run_id uuid references public.booking_discovery_runs(id) on delete set null,
 candidate_id uuid references public.booking_contact_candidates(id) on delete set null,
 resolved boolean not null default false,
 channel text not null check(channel in ('email','api','external_link','manual')),
 provider text,
 contact_value text,
 reason text not null,
 resolver_version text not null default '0.5.0',
 resolution jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index if not exists booking_contact_candidates_booking_idx on public.booking_contact_candidates(booking_id,auto_usable,confidence desc);
create index if not exists booking_channel_resolutions_booking_idx on public.booking_channel_resolutions(booking_id,created_at desc);

alter table public.booking_discovery_runs enable row level security;
alter table public.booking_contact_candidates enable row level security;
alter table public.booking_channel_resolutions enable row level security;

grant select on public.booking_discovery_runs,public.booking_contact_candidates,public.booking_channel_resolutions to authenticated;
grant select,insert,update,delete on public.booking_discovery_runs,public.booking_contact_candidates,public.booking_channel_resolutions to service_role;

drop policy if exists booking_discovery_runs_trip_member_select on public.booking_discovery_runs;
create policy booking_discovery_runs_trip_member_select on public.booking_discovery_runs for select to authenticated using(public.luvia_booking_is_trip_member(trip_id));

drop policy if exists booking_contact_candidates_trip_member_select on public.booking_contact_candidates;
create policy booking_contact_candidates_trip_member_select on public.booking_contact_candidates for select to authenticated using(exists(select 1 from public.bookings b where b.id=booking_id and public.luvia_booking_is_trip_member(b.trip_id)));

drop policy if exists booking_channel_resolutions_trip_member_select on public.booking_channel_resolutions;
create policy booking_channel_resolutions_trip_member_select on public.booking_channel_resolutions for select to authenticated using(exists(select 1 from public.bookings b where b.id=booking_id and public.luvia_booking_is_trip_member(b.trip_id)));

create or replace function public.luvia_booking_candidate_channel(p_kind text)
returns text language sql immutable as $$
 select case lower(coalesce(p_kind,''))
  when 'official_api' then 'api'
  when 'booking_provider' then 'external_link'
  when 'reservation_link' then 'external_link'
  when 'public_reservation_email' then 'email'
  when 'public_contact_email' then 'email'
  else 'manual' end
$$;

create or replace function public.luvia_booking_candidate_priority(p_kind text)
returns integer language sql immutable as $$
 select case lower(coalesce(p_kind,''))
  when 'official_api' then 100
  when 'booking_provider' then 90
  when 'reservation_link' then 85
  when 'public_reservation_email' then 80
  when 'public_contact_email' then 60
  else 0 end
$$;

create or replace function public.luvia_booking_candidate_auto_usable(
 p_kind text,p_contact_value text,p_source_url text,p_is_public boolean,p_is_official boolean,p_verification_status text
) returns boolean language plpgsql immutable as $$
declare v_kind text:=lower(coalesce(p_kind,''));v_value text:=trim(coalesce(p_contact_value,''));v_source text:=trim(coalesce(p_source_url,''));
begin
 if coalesce(p_verification_status,'')<>'verified' or not coalesce(p_is_public,false) or v_source !~* '^https?://' then return false; end if;
 if v_kind in ('public_reservation_email','public_contact_email') then
  return coalesce(p_is_official,false) and v_value ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$';
 elsif v_kind='official_api' then
  return coalesce(p_is_official,false) and v_value ~* '^https?://';
 elsif v_kind in ('booking_provider','reservation_link') then
  return (coalesce(p_is_official,false) or v_kind='booking_provider') and v_value ~* '^https?://';
 end if;
 return false;
end $$;

create or replace function public.luvia_booking_upsert_candidate(
 p_booking_id uuid,p_discovery_run_id uuid,p_kind text,p_provider text,p_contact_value text,p_source_url text,
 p_is_public boolean,p_is_official boolean,p_verification_status text,p_confidence numeric,p_evidence jsonb default '{}'::jsonb,p_metadata jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;v_channel text;v_auto boolean;
begin
 if p_kind not in ('official_api','booking_provider','reservation_link','public_reservation_email','public_contact_email','manual') then raise exception 'INVALID_DISCOVERY_KIND'; end if;
 if not exists(select 1 from public.bookings where id=p_booking_id) then raise exception 'BOOKING_NOT_FOUND'; end if;
 v_channel:=public.luvia_booking_candidate_channel(p_kind);
 v_auto:=public.luvia_booking_candidate_auto_usable(p_kind,p_contact_value,p_source_url,p_is_public,p_is_official,p_verification_status);
 insert into public.booking_contact_candidates(booking_id,discovery_run_id,kind,channel,provider,contact_value,source_url,is_public,is_official,verification_status,confidence,auto_usable,evidence,metadata,last_verified_at)
 values(p_booking_id,p_discovery_run_id,p_kind,v_channel,nullif(trim(coalesce(p_provider,'')),''),nullif(trim(coalesce(p_contact_value,'')),''),nullif(trim(coalesce(p_source_url,'')),''),coalesce(p_is_public,false),coalesce(p_is_official,false),coalesce(p_verification_status,'unverified'),greatest(0,least(1,coalesce(p_confidence,0))),v_auto,coalesce(p_evidence,'{}'::jsonb),coalesce(p_metadata,'{}'::jsonb),case when p_verification_status='verified' then now() end)
 on conflict(booking_id,kind,contact_value,source_url) do update set discovery_run_id=excluded.discovery_run_id,channel=excluded.channel,provider=excluded.provider,is_public=excluded.is_public,is_official=excluded.is_official,verification_status=excluded.verification_status,confidence=excluded.confidence,auto_usable=excluded.auto_usable,evidence=excluded.evidence,metadata=excluded.metadata,last_verified_at=excluded.last_verified_at
 returning id into v_id;
 return v_id;
end $$;
revoke all on function public.luvia_booking_upsert_candidate(uuid,uuid,text,text,text,text,boolean,boolean,text,numeric,jsonb,jsonb) from public;
grant execute on function public.luvia_booking_upsert_candidate(uuid,uuid,text,text,text,text,boolean,boolean,text,numeric,jsonb,jsonb) to service_role;

create or replace function public.luvia_booking_resolve_channel(p_booking_id uuid,p_discovery_run_id uuid default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_booking public.bookings;v_candidate public.booking_contact_candidates;v_resolution public.booking_channel_resolutions;v_result jsonb;
begin
 select * into v_booking from public.bookings where id=p_booking_id for update;
 if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
 select * into v_candidate from public.booking_contact_candidates c
 where c.booking_id=p_booking_id and c.auto_usable=true and (p_discovery_run_id is null or c.discovery_run_id=p_discovery_run_id)
 order by public.luvia_booking_candidate_priority(c.kind) desc,c.confidence desc,c.is_official desc,c.discovered_at desc limit 1;
 if found then
  insert into public.booking_channel_resolutions(booking_id,discovery_run_id,candidate_id,resolved,channel,provider,contact_value,reason,resolution)
  values(p_booking_id,p_discovery_run_id,v_candidate.id,true,v_candidate.channel,v_candidate.provider,v_candidate.contact_value,'HIGHEST_PRIORITY_VERIFIED_PUBLIC_CHANNEL',jsonb_build_object('kind',v_candidate.kind,'sourceUrl',v_candidate.source_url,'confidence',v_candidate.confidence,'isOfficial',v_candidate.is_official)) returning * into v_resolution;
  update public.bookings set channel=v_candidate.channel,provider=coalesce(v_candidate.provider,provider),contact=case when v_candidate.channel='email' then contact||jsonb_build_object('email',v_candidate.contact_value) when v_candidate.channel='external_link' then contact||jsonb_build_object('bookingUrl',v_candidate.contact_value) when v_candidate.channel='api' then contact||jsonb_build_object('apiEndpoint',v_candidate.contact_value) else contact end,metadata=metadata||jsonb_build_object('discovery',jsonb_build_object('resolved',true,'candidateId',v_candidate.id,'kind',v_candidate.kind,'sourceUrl',v_candidate.source_url,'version','0.5.0')),updated_at=now() where id=p_booking_id;
  v_result:=jsonb_build_object('resolved',true,'channel',v_candidate.channel,'provider',v_candidate.provider,'value',v_candidate.contact_value,'kind',v_candidate.kind,'candidateId',v_candidate.id,'reason','HIGHEST_PRIORITY_VERIFIED_PUBLIC_CHANNEL');
 else
  insert into public.booking_channel_resolutions(booking_id,discovery_run_id,resolved,channel,reason,resolution)
  values(p_booking_id,p_discovery_run_id,false,'manual','NO_VERIFIED_PUBLIC_BOOKING_CHANNEL',jsonb_build_object('requiresUserAction',true)) returning * into v_resolution;
  update public.bookings set channel='manual',metadata=metadata||jsonb_build_object('discovery',jsonb_build_object('resolved',false,'reason','NO_VERIFIED_PUBLIC_BOOKING_CHANNEL','version','0.5.0')),updated_at=now() where id=p_booking_id;
  v_result:=jsonb_build_object('resolved',false,'channel','manual','provider',null,'value',null,'kind','manual','candidateId',null,'reason','NO_VERIFIED_PUBLIC_BOOKING_CHANNEL','requiresUserAction',true);
 end if;
 if p_discovery_run_id is not null then
  update public.booking_discovery_runs set status=case when (v_result->>'resolved')::boolean then 'resolved' else 'unresolved' end,finished_at=now(),source_count=(select count(*) from public.booking_contact_candidates where discovery_run_id=p_discovery_run_id),result=v_result where id=p_discovery_run_id;
 end if;
 insert into public.booking_events(booking_id,trip_id,event_type,payload) values(v_booking.id,v_booking.trip_id,'booking.discovery.resolved',v_result);
 return v_result;
end $$;
revoke all on function public.luvia_booking_resolve_channel(uuid,uuid) from public;
grant execute on function public.luvia_booking_resolve_channel(uuid,uuid) to service_role;

comment on table public.booking_contact_candidates is 'Verified public booking/contact candidates with source evidence. V0.5 never guesses addresses.';
comment on function public.luvia_booking_resolve_channel(uuid,uuid) is 'Priority: official API -> provider/link -> public reservation email -> public contact email -> manual.';

commit;
