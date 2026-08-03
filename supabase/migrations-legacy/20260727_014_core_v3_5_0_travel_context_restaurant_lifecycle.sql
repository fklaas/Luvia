-- Luvia Core V3.5.0 · Build 11.7.0
-- Travel Context & Restaurant Lifecycle Foundation
begin;

alter table public.trip_places
  add column if not exists lifecycle_status text not null default 'discovered',
  add column if not exists visited_at timestamptz,
  add column if not exists memory_status text not null default 'none',
  add column if not exists travel_book_status text not null default 'none';

alter table public.restaurants
  add column if not exists personal_notes text,
  add column if not exists personal_rating smallint,
  add column if not exists recommended_visit_time time without time zone,
  add column if not exists recommendation_reason text,
  add column if not exists match_score smallint,
  add column if not exists recommendation_metadata jsonb not null default '{}'::jsonb;

alter table public.trip_places drop constraint if exists trip_places_lifecycle_status_check;
alter table public.trip_places add constraint trip_places_lifecycle_status_check check (
  lifecycle_status in ('discovered','saved','favorited','planned','reserved','visited','rated','memory','travel_book')
);
alter table public.trip_places drop constraint if exists trip_places_memory_status_check;
alter table public.trip_places add constraint trip_places_memory_status_check check (memory_status in ('none','candidate','created'));
alter table public.trip_places drop constraint if exists trip_places_travel_book_status_check;
alter table public.trip_places add constraint trip_places_travel_book_status_check check (travel_book_status in ('none','candidate','linked'));
alter table public.restaurants drop constraint if exists restaurants_personal_rating_check;
alter table public.restaurants add constraint restaurants_personal_rating_check check (personal_rating is null or personal_rating between 1 and 5);
alter table public.restaurants drop constraint if exists restaurants_match_score_check;
alter table public.restaurants add constraint restaurants_match_score_check check (match_score is null or match_score between 0 and 100);

create table if not exists public.place_lifecycle_history (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  trip_place_id uuid not null references public.trip_places(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  module_key text not null,
  from_status text,
  to_status text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists place_lifecycle_history_trip_time_idx on public.place_lifecycle_history(trip_id,event_at desc);
create index if not exists place_lifecycle_history_trip_place_idx on public.place_lifecycle_history(trip_place_id,event_at desc);
alter table public.place_lifecycle_history enable row level security;
drop policy if exists place_lifecycle_history_member_select on public.place_lifecycle_history;
create policy place_lifecycle_history_member_select on public.place_lifecycle_history for select to authenticated using (public.luvia_is_trip_member(trip_id));
drop policy if exists place_lifecycle_history_member_insert on public.place_lifecycle_history;
create policy place_lifecycle_history_member_insert on public.place_lifecycle_history for insert to authenticated with check (public.luvia_is_trip_member(trip_id) and actor_user_id=auth.uid());

create table if not exists public.place_recommendation_feedback (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  place_id uuid references public.places(id) on delete cascade,
  provider_place_id text,
  module_key text not null default 'restaurants',
  decision text not null check (decision in ('shown','opened','accepted','rejected','saved','favorited','planned','reserved','visited')),
  match_score smallint check (match_score is null or match_score between 0 and 100),
  reasons jsonb not null default '[]'::jsonb,
  context jsonb not null default '{}'::jsonb,
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists place_recommendation_feedback_trip_idx on public.place_recommendation_feedback(trip_id,created_at desc);
alter table public.place_recommendation_feedback enable row level security;
drop policy if exists place_recommendation_feedback_member_select on public.place_recommendation_feedback;
create policy place_recommendation_feedback_member_select on public.place_recommendation_feedback for select to authenticated using (public.luvia_is_trip_member(trip_id));
drop policy if exists place_recommendation_feedback_member_insert on public.place_recommendation_feedback;
create policy place_recommendation_feedback_member_insert on public.place_recommendation_feedback for insert to authenticated with check (public.luvia_is_trip_member(trip_id) and actor_user_id=auth.uid());

create or replace function public.luvia_update_restaurant_lifecycle(
  p_trip_id uuid,
  p_trip_place_id uuid,
  p_status text,
  p_patch jsonb default '{}'::jsonb
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_user uuid:=auth.uid(); v_current text; v_place uuid; v_restaurant uuid; v_result jsonb;
  v_allowed text[]:=array['discovered','saved','favorited','planned','reserved','visited','rated','memory','travel_book'];
begin
  if v_user is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
  if not public.luvia_is_trip_member(p_trip_id) then raise exception using errcode='42501',message='NOT_AUTHORIZED'; end if;
  if not (p_status=any(v_allowed)) then raise exception using errcode='22023',message='LIFECYCLE_STATUS_INVALID'; end if;
  select tp.lifecycle_status,tp.place_id,r.id into v_current,v_place,v_restaurant
  from public.trip_places tp join public.restaurants r on r.trip_place_id=tp.id
  where tp.id=p_trip_place_id and tp.trip_id=p_trip_id and tp.module_key='restaurants' for update;
  if v_place is null then raise exception using errcode='P0002',message='RESTAURANT_NOT_FOUND'; end if;

  update public.trip_places set
    lifecycle_status=p_status,
    status=case when p_status in ('discovered','saved','favorited') then 'idea' when p_status in ('planned','reserved') then 'planned' else 'visited' end,
    is_favorite=case when p_status in ('favorited','planned','reserved','visited','rated','memory','travel_book') then true else is_favorite end,
    planned_date=coalesce(nullif(p_patch->>'plannedDate','')::date,planned_date),
    planned_time=coalesce(nullif(p_patch->>'plannedTime','')::time,planned_time),
    visited_at=case when p_status in ('visited','rated','memory','travel_book') then coalesce(nullif(p_patch->>'visitedAt','')::timestamptz,visited_at,now()) else visited_at end,
    memory_status=case when p_status='memory' then 'created' when p_status='travel_book' then 'created' else memory_status end,
    travel_book_status=case when p_status='travel_book' then 'linked' else travel_book_status end,
    user_notes=coalesce(nullif(p_patch->>'notes',''),user_notes),updated_at=now()
  where id=p_trip_place_id;

  update public.restaurants set
    reservation_status=case when p_status='reserved' then 'confirmed' else coalesce(nullif(p_patch->>'reservationStatus',''),reservation_status) end,
    reservation_date=coalesce(nullif(p_patch->>'reservationDate','')::date,reservation_date),
    reservation_time=coalesce(nullif(p_patch->>'reservationTime','')::time,reservation_time),
    visited=p_status in ('visited','rated','memory','travel_book') or visited,
    personal_rating=coalesce(nullif(p_patch->>'personalRating','')::smallint,personal_rating),
    personal_notes=coalesce(nullif(p_patch->>'notes',''),personal_notes),
    recommended_visit_time=coalesce(nullif(p_patch->>'recommendedVisitTime','')::time,recommended_visit_time),
    recommendation_reason=coalesce(nullif(p_patch->>'recommendationReason',''),recommendation_reason),
    match_score=coalesce(nullif(p_patch->>'matchScore','')::smallint,match_score),
    recommendation_metadata=recommendation_metadata||coalesce(p_patch->'recommendationMetadata','{}'::jsonb),updated_at=now()
  where id=v_restaurant;

  if v_current is distinct from p_status then
    insert into public.place_lifecycle_history(trip_id,trip_place_id,place_id,module_key,from_status,to_status,actor_user_id,metadata)
    values(p_trip_id,p_trip_place_id,v_place,'restaurants',v_current,p_status,v_user,coalesce(p_patch->'metadata','{}'::jsonb));
  end if;

  if to_regclass('public.trip_activity_events') is not null and v_current is distinct from p_status then
    insert into public.trip_activity_events(trip_id,actor_user_id,event_type,title,entity_type,entity_id,metadata)
    values(p_trip_id,v_user,'restaurant.lifecycle','Restaurantstatus: '||p_status,'restaurant',p_trip_place_id::text,jsonb_build_object('from',v_current,'to',p_status));
  end if;

  select jsonb_build_object('place',to_jsonb(p),'tripPlace',to_jsonb(tp),'restaurant',to_jsonb(r),
    'history',coalesce((select jsonb_agg(to_jsonb(h) order by h.event_at desc) from public.place_lifecycle_history h where h.trip_place_id=tp.id),'[]'::jsonb)) into v_result
  from public.trip_places tp join public.places p on p.id=tp.place_id join public.restaurants r on r.trip_place_id=tp.id
  where tp.id=p_trip_place_id;
  return v_result;
end;$$;

grant execute on function public.luvia_update_restaurant_lifecycle(uuid,uuid,text,jsonb) to authenticated;

create or replace function public.luvia_record_place_recommendation_feedback(
 p_trip_id uuid,p_place_id uuid,p_provider_place_id text,p_decision text,p_match_score smallint,p_reasons jsonb,p_context jsonb
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; begin
 if auth.uid() is null then raise exception using errcode='42501',message='AUTH_REQUIRED'; end if;
 if not public.luvia_is_trip_member(p_trip_id) then raise exception using errcode='42501',message='NOT_AUTHORIZED'; end if;
 insert into public.place_recommendation_feedback(trip_id,place_id,provider_place_id,decision,match_score,reasons,context,actor_user_id)
 values(p_trip_id,p_place_id,nullif(p_provider_place_id,''),p_decision,p_match_score,coalesce(p_reasons,'[]'::jsonb),coalesce(p_context,'{}'::jsonb),auth.uid()) returning id into v_id;
 return v_id;
end;$$;
grant execute on function public.luvia_record_place_recommendation_feedback(uuid,uuid,text,text,smallint,jsonb,jsonb) to authenticated;

commit;
