-- Luvia Core 4.17.0 · Luvia Brain Foundation
-- Idempotent, user-bound AI memory, proposals, events and usage telemetry.

create extension if not exists pgcrypto;

create table if not exists public.ai_learning_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trip_id uuid null,
  scope_key text not null default 'global',
  signal_key text not null,
  category text not null default 'general',
  value jsonb not null default '{}'::jsonb,
  confidence numeric(4,3) not null default 0.500 check (confidence >= 0 and confidence <= 1),
  evidence_count integer not null default 1 check (evidence_count >= 1),
  source_summary jsonb not null default '{}'::jsonb,
  status text not null default 'inferred' check (status in ('inferred','confirmed','dismissed')),
  first_observed_at timestamptz not null default now(),
  last_observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, scope_key, signal_key)
);

create table if not exists public.ai_interaction_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trip_id uuid null,
  capability text not null,
  event_type text not null,
  entity_type text null,
  entity_id text null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_action_proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trip_id uuid null,
  capability text not null,
  action_type text not null,
  action_payload jsonb not null default '{}'::jsonb,
  explanation text null,
  status text not null default 'draft' check (status in ('draft','accepted','rejected','executed','failed','expired')),
  decided_at timestamptz null,
  executed_at timestamptz null,
  error_text text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  capability text not null,
  provider text not null default 'openai',
  model text not null,
  tier text not null,
  request_id text null,
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  total_tokens integer not null default 0 check (total_tokens >= 0),
  cached_tokens integer not null default 0 check (cached_tokens >= 0),
  latency_ms integer not null default 0 check (latency_ms >= 0),
  success boolean not null default true,
  error_code text null,
  created_at timestamptz not null default now()
);

alter table public.ai_learning_signals enable row level security;
alter table public.ai_interaction_events enable row level security;
alter table public.ai_action_proposals enable row level security;
alter table public.ai_usage_events enable row level security;

-- Recreate policies deliberately so the migration remains repeatable.
drop policy if exists "Users can read own AI learning signals" on public.ai_learning_signals;
drop policy if exists "Users can insert own AI learning signals" on public.ai_learning_signals;
drop policy if exists "Users can update own AI learning signals" on public.ai_learning_signals;
drop policy if exists "Users can delete own AI learning signals" on public.ai_learning_signals;
create policy "Users can read own AI learning signals" on public.ai_learning_signals for select using (auth.uid() = user_id);
create policy "Users can insert own AI learning signals" on public.ai_learning_signals for insert with check (auth.uid() = user_id);
create policy "Users can update own AI learning signals" on public.ai_learning_signals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own AI learning signals" on public.ai_learning_signals for delete using (auth.uid() = user_id);

drop policy if exists "Users can read own AI interaction events" on public.ai_interaction_events;
drop policy if exists "Users can insert own AI interaction events" on public.ai_interaction_events;
drop policy if exists "Users can delete own AI interaction events" on public.ai_interaction_events;
create policy "Users can read own AI interaction events" on public.ai_interaction_events for select using (auth.uid() = user_id);
create policy "Users can insert own AI interaction events" on public.ai_interaction_events for insert with check (auth.uid() = user_id);
create policy "Users can delete own AI interaction events" on public.ai_interaction_events for delete using (auth.uid() = user_id);

drop policy if exists "Users can read own AI proposals" on public.ai_action_proposals;
drop policy if exists "Users can insert own AI proposals" on public.ai_action_proposals;
drop policy if exists "Users can update own AI proposals" on public.ai_action_proposals;
drop policy if exists "Users can delete own AI proposals" on public.ai_action_proposals;
create policy "Users can read own AI proposals" on public.ai_action_proposals for select using (auth.uid() = user_id);
create policy "Users can insert own AI proposals" on public.ai_action_proposals for insert with check (auth.uid() = user_id);
create policy "Users can update own AI proposals" on public.ai_action_proposals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own AI proposals" on public.ai_action_proposals for delete using (auth.uid() = user_id);

drop policy if exists "Users can read own AI usage" on public.ai_usage_events;
drop policy if exists "Users can delete own AI usage" on public.ai_usage_events;
create policy "Users can read own AI usage" on public.ai_usage_events for select using (auth.uid() = user_id);
create policy "Users can delete own AI usage" on public.ai_usage_events for delete using (auth.uid() = user_id);

create index if not exists ai_learning_signals_user_status_idx on public.ai_learning_signals (user_id, status, last_observed_at desc);
create index if not exists ai_learning_signals_trip_idx on public.ai_learning_signals (user_id, trip_id) where trip_id is not null;
create index if not exists ai_interaction_events_user_created_idx on public.ai_interaction_events (user_id, created_at desc);
create index if not exists ai_interaction_events_trip_created_idx on public.ai_interaction_events (user_id, trip_id, created_at desc) where trip_id is not null;
create index if not exists ai_action_proposals_user_status_idx on public.ai_action_proposals (user_id, status, created_at desc);
create index if not exists ai_usage_events_user_created_idx on public.ai_usage_events (user_id, created_at desc);

create or replace function public.luvia_touch_ai_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ai_learning_signals_touch_updated_at on public.ai_learning_signals;
create trigger ai_learning_signals_touch_updated_at before update on public.ai_learning_signals
for each row execute function public.luvia_touch_ai_updated_at();

drop trigger if exists ai_action_proposals_touch_updated_at on public.ai_action_proposals;
create trigger ai_action_proposals_touch_updated_at before update on public.ai_action_proposals
for each row execute function public.luvia_touch_ai_updated_at();

create or replace function public.luvia_record_ai_learning_signal(
  p_trip_id uuid,
  p_scope_key text,
  p_signal_key text,
  p_category text,
  p_value jsonb,
  p_confidence numeric,
  p_source_summary jsonb,
  p_status text default 'inferred'
)
returns public.ai_learning_signals
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_result public.ai_learning_signals;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if coalesce(trim(p_signal_key), '') = '' then
    raise exception 'SIGNAL_KEY_REQUIRED' using errcode = '22023';
  end if;
  if coalesce(p_status, 'inferred') not in ('inferred','confirmed','dismissed') then
    raise exception 'INVALID_SIGNAL_STATUS' using errcode = '22023';
  end if;

  insert into public.ai_learning_signals (
    user_id, trip_id, scope_key, signal_key, category, value, confidence,
    evidence_count, source_summary, status, first_observed_at, last_observed_at
  ) values (
    v_uid,
    p_trip_id,
    coalesce(nullif(trim(p_scope_key), ''), 'global'),
    trim(p_signal_key),
    coalesce(nullif(trim(p_category), ''), 'general'),
    coalesce(p_value, '{}'::jsonb),
    greatest(0, least(1, coalesce(p_confidence, 0.5))),
    1,
    coalesce(p_source_summary, '{}'::jsonb),
    coalesce(p_status, 'inferred'),
    now(),
    now()
  )
  on conflict (user_id, scope_key, signal_key)
  do update set
    trip_id = coalesce(excluded.trip_id, ai_learning_signals.trip_id),
    category = excluded.category,
    value = excluded.value,
    confidence = greatest(ai_learning_signals.confidence, excluded.confidence),
    evidence_count = ai_learning_signals.evidence_count + 1,
    source_summary = excluded.source_summary,
    status = case
      when ai_learning_signals.status = 'confirmed' and excluded.status = 'inferred' then 'confirmed'
      else excluded.status
    end,
    last_observed_at = now(),
    updated_at = now()
  returning * into v_result;

  return v_result;
end;
$$;

revoke all on function public.luvia_record_ai_learning_signal(uuid,text,text,text,jsonb,numeric,jsonb,text) from public;
grant execute on function public.luvia_record_ai_learning_signal(uuid,text,text,text,jsonb,numeric,jsonb,text) to authenticated;

grant select, insert, update, delete on public.ai_learning_signals to authenticated;
grant select, insert, delete on public.ai_interaction_events to authenticated;
grant select, insert, update, delete on public.ai_action_proposals to authenticated;
grant select, delete on public.ai_usage_events to authenticated;

grant all on public.ai_learning_signals to service_role;
grant all on public.ai_interaction_events to service_role;
grant all on public.ai_action_proposals to service_role;
grant all on public.ai_usage_events to service_role;

comment on table public.ai_learning_signals is 'Evidence-backed, user-owned inferred or confirmed signals. Never replaces explicit user_profiles preferences.';
comment on table public.ai_action_proposals is 'AI-generated drafts. User confirmation is required before execution through Luvia Core commands.';
comment on table public.ai_usage_events is 'Server-written AI request telemetry without prompts or raw private context.';
