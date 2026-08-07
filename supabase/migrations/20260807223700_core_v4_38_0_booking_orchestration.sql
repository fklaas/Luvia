-- Luvia Booking Core V0.8 · Booking Orchestration & Provider Routing
-- Production integration upgrade.
begin;

create table if not exists public.booking_route_decisions(
 id uuid primary key default gen_random_uuid(),
 booking_id uuid not null references public.bookings(id) on delete cascade,
 channel text not null check(channel in ('api','affiliate','external_link','email','manual')),
 provider text,
 target text,
 source_type text not null check(source_type in ('contact_candidate','affiliate_link','manual_fallback')),
 source_id uuid,
 route_rank integer not null,
 requires_user_action boolean not null default false,
 reason text not null,
 policy_version text not null default '0.8.0',
 excluded_channels jsonb not null default '[]'::jsonb check(jsonb_typeof(excluded_channels)='array'),
 decision jsonb not null default '{}'::jsonb check(jsonb_typeof(decision)='object'),
 created_at timestamptz not null default now()
);
create index if not exists booking_route_decisions_booking_idx on public.booking_route_decisions(booking_id,created_at desc);

create table if not exists public.booking_route_attempts(
 id uuid primary key default gen_random_uuid(),
 booking_id uuid not null references public.bookings(id) on delete cascade,
 decision_id uuid not null references public.booking_route_decisions(id) on delete cascade,
 attempt_no integer not null check(attempt_no>0),
 status text not null default 'planned' check(status in ('planned','dispatching','action_required','succeeded','failed','retry_scheduled','superseded')),
 error_class text check(error_class is null or error_class in ('transient','permanent','user_action','unknown')),
 error_code text,
 error_message text,
 retry_at timestamptz,
 idempotency_key text not null,
 metadata jsonb not null default '{}'::jsonb check(jsonb_typeof(metadata)='object'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(decision_id,attempt_no),
 unique(idempotency_key)
);
create index if not exists booking_route_attempts_booking_idx on public.booking_route_attempts(booking_id,created_at desc);
create index if not exists booking_route_attempts_retry_idx on public.booking_route_attempts(status,retry_at) where status='retry_scheduled';

create table if not exists public.booking_route_state(
 booking_id uuid primary key references public.bookings(id) on delete cascade,
 current_decision_id uuid references public.booking_route_decisions(id) on delete set null,
 current_attempt_id uuid references public.booking_route_attempts(id) on delete set null,
 state text not null default 'idle' check(state in ('idle','planned','dispatching','waiting_user','retry_wait','succeeded','fallback_required','exhausted')),
 retry_count integer not null default 0 check(retry_count>=0),
 last_error jsonb not null default '{}'::jsonb check(jsonb_typeof(last_error)='object'),
 next_retry_at timestamptz,
 updated_at timestamptz not null default now()
);

alter table public.booking_route_decisions enable row level security;
alter table public.booking_route_attempts enable row level security;
alter table public.booking_route_state enable row level security;

grant select on public.booking_route_decisions,public.booking_route_attempts,public.booking_route_state to authenticated;
grant select,insert,update,delete on public.booking_route_decisions,public.booking_route_attempts,public.booking_route_state to service_role;

drop policy if exists booking_route_decisions_trip_member_select on public.booking_route_decisions;
create policy booking_route_decisions_trip_member_select on public.booking_route_decisions for select to authenticated
 using(exists(select 1 from public.bookings b where b.id=booking_id and public.luvia_booking_is_trip_member(b.trip_id)));

drop policy if exists booking_route_attempts_trip_member_select on public.booking_route_attempts;
create policy booking_route_attempts_trip_member_select on public.booking_route_attempts for select to authenticated
 using(exists(select 1 from public.bookings b where b.id=booking_id and public.luvia_booking_is_trip_member(b.trip_id)));

drop policy if exists booking_route_state_trip_member_select on public.booking_route_state;
create policy booking_route_state_trip_member_select on public.booking_route_state for select to authenticated
 using(exists(select 1 from public.bookings b where b.id=booking_id and public.luvia_booking_is_trip_member(b.trip_id)));

create or replace function public.luvia_booking_route_rank(p_channel text)
returns integer language sql immutable as $$
 select case lower(coalesce(p_channel,''))
  when 'api' then 500
  when 'affiliate' then 400
  when 'external_link' then 300
  when 'email' then 200
  else 0 end
$$;

create or replace function public.luvia_booking_plan_route(
 p_booking_id uuid,
 p_excluded_channels text[] default array[]::text[]
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
 b public.bookings;
 c public.booking_contact_candidates;
 l public.booking_affiliate_links;
 p public.booking_affiliate_partners;
 d public.booking_route_decisions;
 v_channel text:='manual';
 v_provider text;
 v_target text;
 v_source_type text:='manual_fallback';
 v_source_id uuid;
 v_reason text:='NO_AUTOMATED_ROUTE_AVAILABLE';
 v_requires boolean:=true;
 v_rank integer:=0;
 v_excluded text[]:=coalesce(p_excluded_channels,array[]::text[]);
 v_result jsonb;
begin
 select * into b from public.bookings where id=p_booking_id for update;
 if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
 if auth.uid() is not null and not public.luvia_booking_is_trip_member(b.trip_id) then raise exception 'BOOKING_FORBIDDEN'; end if;

 -- 1) Official API. Fully automatic only after the caller has explicit user approval to dispatch.
 if not ('api'=any(v_excluded)) then
  select * into c from public.booking_contact_candidates x
   where x.booking_id=b.id and x.auto_usable=true and x.kind='official_api' and x.channel='api'
   order by x.confidence desc,x.is_official desc,x.discovered_at desc limit 1;
  if found then
   v_channel:='api';v_provider:=c.provider;v_target:=c.contact_value;v_source_type:='contact_candidate';v_source_id:=c.id;
   v_reason:='OFFICIAL_API_AVAILABLE';v_requires:=false;v_rank:=500;
  end if;
 end if;

 -- 2) Affiliate. Always explicit user navigation; never interpreted as booking confirmation.
 if v_channel='manual' and not ('affiliate'=any(v_excluded)) then
  select al.* into l
   from public.booking_affiliate_links al join public.booking_affiliate_partners ap on ap.id=al.partner_id
   where al.booking_id=b.id and al.status='active' and (al.expires_at is null or al.expires_at>now()) and ap.status='active'
   order by al.created_at desc limit 1;
  if found then
   select * into p from public.booking_affiliate_partners where id=l.partner_id;
   v_channel:='affiliate';v_provider:=p.partner_key;v_target:=l.affiliate_url;v_source_type:='affiliate_link';v_source_id:=l.id;
   v_reason:='ACTIVE_AFFILIATE_ROUTE_AVAILABLE';v_requires:=true;v_rank:=400;
  end if;
 end if;

 -- 3) External booking/provider link. Explicit user navigation.
 if v_channel='manual' and not ('external_link'=any(v_excluded)) then
  select * into c from public.booking_contact_candidates x
   where x.booking_id=b.id and x.auto_usable=true and x.channel='external_link' and x.kind in ('booking_provider','reservation_link')
   order by public.luvia_booking_candidate_priority(x.kind) desc,x.confidence desc,x.discovered_at desc limit 1;
  if found then
   v_channel:='external_link';v_provider:=c.provider;v_target:=c.contact_value;v_source_type:='contact_candidate';v_source_id:=c.id;
   v_reason:='VERIFIED_EXTERNAL_BOOKING_ROUTE_AVAILABLE';v_requires:=true;v_rank:=300;
  end if;
 end if;

 -- 4) Verified public email. Dispatch can be automatic only after explicit user approval upstream.
 if v_channel='manual' and not ('email'=any(v_excluded)) then
  select * into c from public.booking_contact_candidates x
   where x.booking_id=b.id and x.auto_usable=true and x.channel='email' and x.kind in ('public_reservation_email','public_contact_email')
   order by public.luvia_booking_candidate_priority(x.kind) desc,x.confidence desc,x.discovered_at desc limit 1;
  if found then
   v_channel:='email';v_provider:=coalesce(c.provider,'resend');v_target:=c.contact_value;v_source_type:='contact_candidate';v_source_id:=c.id;
   v_reason:='VERIFIED_PUBLIC_EMAIL_ROUTE_AVAILABLE';v_requires:=false;v_rank:=200;
  end if;
 end if;

 insert into public.booking_route_decisions(booking_id,channel,provider,target,source_type,source_id,route_rank,requires_user_action,reason,excluded_channels,decision)
 values(b.id,v_channel,v_provider,v_target,v_source_type,v_source_id,v_rank,v_requires,v_reason,to_jsonb(v_excluded),
  jsonb_build_object('policy','api>affiliate>external_link>email>manual','merchantOfRecord',false,'autoDispatchRequiresUserApproval',v_channel in ('api','email'),'userNavigationRequired',v_requires))
 returning * into d;

 insert into public.booking_route_state(booking_id,current_decision_id,state,retry_count,last_error,next_retry_at,updated_at)
 values(b.id,d.id,'planned',0,'{}'::jsonb,null,now())
 on conflict(booking_id) do update set current_decision_id=excluded.current_decision_id,current_attempt_id=null,state='planned',retry_count=0,last_error='{}'::jsonb,next_retry_at=null,updated_at=now();

 update public.bookings set
  channel=v_channel,
  provider=case when v_channel='manual' then provider else coalesce(v_provider,provider) end,
  contact=case
   when v_channel='email' then contact||jsonb_build_object('email',v_target)
   when v_channel in ('affiliate','external_link') then contact||jsonb_build_object('bookingUrl',v_target)
   when v_channel='api' then contact||jsonb_build_object('apiEndpoint',v_target)
   else contact end,
  metadata=metadata||jsonb_build_object('routing',jsonb_build_object('decisionId',d.id,'channel',v_channel,'provider',v_provider,'reason',v_reason,'requiresUserAction',v_requires,'policyVersion','0.8.0')),
  updated_at=now()
 where id=b.id;

 v_result:=jsonb_build_object('decisionId',d.id,'bookingId',b.id,'channel',v_channel,'provider',v_provider,'target',v_target,'sourceType',v_source_type,'sourceId',v_source_id,'routeRank',v_rank,'requiresUserAction',v_requires,'reason',v_reason,'policyVersion','0.8.0','merchantOfRecord',false);
 insert into public.booking_events(booking_id,trip_id,actor_user_id,event_type,payload)
 values(b.id,b.trip_id,auth.uid(),'booking.route.planned',v_result);
 return v_result;
end $$;
revoke all on function public.luvia_booking_plan_route(uuid,text[]) from public;
grant execute on function public.luvia_booking_plan_route(uuid,text[]) to authenticated,service_role;

create or replace function public.luvia_booking_start_route_attempt(
 p_decision_id uuid,p_idempotency_key text,p_metadata jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path=public as $$
declare d public.booking_route_decisions;b public.bookings;a public.booking_route_attempts;v_no integer;v_status text;
begin
 select * into d from public.booking_route_decisions where id=p_decision_id;
 if not found then raise exception 'ROUTE_DECISION_NOT_FOUND'; end if;
 select * into b from public.bookings where id=d.booking_id;
 if trim(coalesce(p_idempotency_key,''))='' then raise exception 'ROUTE_IDEMPOTENCY_KEY_REQUIRED'; end if;
 select coalesce(max(attempt_no),0)+1 into v_no from public.booking_route_attempts where decision_id=d.id;
 v_status:=case when d.requires_user_action then 'action_required' else 'dispatching' end;
 insert into public.booking_route_attempts(booking_id,decision_id,attempt_no,status,error_class,idempotency_key,metadata)
 values(b.id,d.id,v_no,v_status,case when d.requires_user_action then 'user_action' end,trim(p_idempotency_key),coalesce(p_metadata,'{}'::jsonb)) returning * into a;
 insert into public.booking_route_state(booking_id,current_decision_id,current_attempt_id,state,retry_count,last_error,next_retry_at,updated_at)
 values(b.id,d.id,a.id,case when d.requires_user_action then 'waiting_user' else 'dispatching' end,0,'{}'::jsonb,null,now())
 on conflict(booking_id) do update set current_decision_id=d.id,current_attempt_id=a.id,state=excluded.state,next_retry_at=null,updated_at=now();
 insert into public.booking_events(booking_id,trip_id,event_type,payload) values(b.id,b.trip_id,'booking.route.attempt.started',jsonb_build_object('attemptId',a.id,'decisionId',d.id,'attemptNo',v_no,'channel',d.channel,'provider',d.provider,'status',v_status));
 return jsonb_build_object('attemptId',a.id,'decisionId',d.id,'attemptNo',v_no,'status',v_status,'requiresUserAction',d.requires_user_action,'channel',d.channel,'provider',d.provider,'target',d.target);
end $$;
revoke all on function public.luvia_booking_start_route_attempt(uuid,text,jsonb) from public;
grant execute on function public.luvia_booking_start_route_attempt(uuid,text,jsonb) to service_role;

create or replace function public.luvia_booking_complete_route_attempt(
 p_attempt_id uuid,p_success boolean,p_error_class text default null,p_error_code text default null,p_error_message text default null,p_max_retries integer default 2,p_metadata jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path=public as $$
declare a public.booking_route_attempts;d public.booking_route_decisions;b public.bookings;v_class text;v_status text;v_state text;v_action text;v_retry timestamptz;v_max integer:=greatest(0,least(10,coalesce(p_max_retries,2)));
begin
 select * into a from public.booking_route_attempts where id=p_attempt_id for update;
 if not found then raise exception 'ROUTE_ATTEMPT_NOT_FOUND'; end if;
 select * into d from public.booking_route_decisions where id=a.decision_id;
 select * into b from public.bookings where id=a.booking_id;
 if coalesce(p_success,false) then
  v_status:='succeeded';v_state:='succeeded';v_action:='complete';v_class:=null;v_retry:=null;
 else
  v_class:=lower(trim(coalesce(p_error_class,'unknown')));
  if v_class not in ('transient','permanent','user_action','unknown') then raise exception 'ROUTE_ERROR_CLASS_INVALID'; end if;
  if v_class='user_action' then
   v_status:='action_required';v_state:='waiting_user';v_action:='wait_for_user';v_retry:=null;
  elsif v_class='transient' and a.attempt_no<=v_max then
   v_status:='retry_scheduled';v_state:='retry_wait';v_action:='retry_same_route';
   v_retry:=now()+make_interval(secs=>least(3600,60*power(2,greatest(0,a.attempt_no-1))::integer));
  else
   v_status:='failed';v_state:='fallback_required';v_action:='fallback_next_route';v_retry:=null;
  end if;
 end if;
 update public.booking_route_attempts set status=v_status,error_class=v_class,error_code=nullif(trim(coalesce(p_error_code,'')),''),error_message=nullif(trim(coalesce(p_error_message,'')),''),retry_at=v_retry,metadata=metadata||coalesce(p_metadata,'{}'::jsonb),updated_at=now() where id=a.id returning * into a;
 update public.booking_route_state set current_decision_id=d.id,current_attempt_id=a.id,state=v_state,retry_count=case when v_state='retry_wait' then retry_count+1 else retry_count end,last_error=case when p_success then '{}'::jsonb else jsonb_build_object('class',v_class,'code',p_error_code,'message',p_error_message,'attemptId',a.id) end,next_retry_at=v_retry,updated_at=now() where booking_id=b.id;
 insert into public.booking_events(booking_id,trip_id,event_type,payload) values(b.id,b.trip_id,case when p_success then 'booking.route.attempt.succeeded' else 'booking.route.attempt.failed' end,jsonb_build_object('attemptId',a.id,'decisionId',d.id,'attemptNo',a.attempt_no,'status',v_status,'errorClass',v_class,'action',v_action,'retryAt',v_retry,'channel',d.channel,'provider',d.provider));
 return jsonb_build_object('attemptId',a.id,'decisionId',d.id,'status',v_status,'state',v_state,'action',v_action,'errorClass',v_class,'retryAt',v_retry,'fallbackRequired',v_action='fallback_next_route');
end $$;
revoke all on function public.luvia_booking_complete_route_attempt(uuid,boolean,text,text,text,integer,jsonb) from public;
grant execute on function public.luvia_booking_complete_route_attempt(uuid,boolean,text,text,text,integer,jsonb) to service_role;

comment on table public.booking_route_decisions is 'Deterministic V0.8 route decisions. Policy: API -> affiliate -> external link -> email -> manual.';
comment on table public.booking_route_attempts is 'Dispatch/action attempts with idempotency, retry scheduling and typed failure classification.';
comment on table public.booking_route_state is 'Current orchestration state per booking; lifecycle status remains separate.';
comment on function public.luvia_booking_plan_route(uuid,text[]) is 'Plans but does not silently perform user-navigation routes. Affiliate/external/manual always require explicit user action.';
comment on function public.luvia_booking_complete_route_attempt(uuid,boolean,text,text,text,integer,jsonb) is 'Transient failures retry same route; permanent/exhausted failures request deterministic fallback. Does not confirm the booking.';

commit;
