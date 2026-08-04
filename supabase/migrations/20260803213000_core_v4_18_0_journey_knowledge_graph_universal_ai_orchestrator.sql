-- Luvia Core 4.18.0 · Journey Knowledge Graph & Universal AI Orchestrator
-- Idempotent persistence for evidence and orchestration traces. Existing domain tables remain authoritative.
create extension if not exists pgcrypto;

create table if not exists public.ai_evidence_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trip_id uuid null,
  evidence_key text not null,
  kind text not null,
  source text not null,
  confidence numeric(4,3) not null default 1 check (confidence between 0 and 1),
  payload jsonb not null default '{}'::jsonb,
  observed_at timestamptz null,
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, trip_id, evidence_key)
);

create table if not exists public.ai_orchestration_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trip_id uuid null,
  capability text not null,
  domain text not null default 'global',
  provider text null,
  model text null,
  status text not null default 'running' check (status in ('running','completed','failed','cancelled')),
  step_count integer not null default 0 check (step_count >= 0),
  tool_trace jsonb not null default '[]'::jsonb,
  evidence_keys text[] not null default '{}'::text[],
  result_summary jsonb not null default '{}'::jsonb,
  error_code text null,
  started_at timestamptz not null default now(),
  completed_at timestamptz null,
  created_at timestamptz not null default now()
);

alter table public.ai_evidence_records enable row level security;
alter table public.ai_orchestration_runs enable row level security;

drop policy if exists "Users can read own AI evidence" on public.ai_evidence_records;
drop policy if exists "Users can insert own AI evidence" on public.ai_evidence_records;
drop policy if exists "Users can update own AI evidence" on public.ai_evidence_records;
drop policy if exists "Users can delete own AI evidence" on public.ai_evidence_records;
create policy "Users can read own AI evidence" on public.ai_evidence_records for select using (auth.uid()=user_id);
create policy "Users can insert own AI evidence" on public.ai_evidence_records for insert with check (auth.uid()=user_id);
create policy "Users can update own AI evidence" on public.ai_evidence_records for update using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "Users can delete own AI evidence" on public.ai_evidence_records for delete using (auth.uid()=user_id);

drop policy if exists "Users can read own AI orchestration runs" on public.ai_orchestration_runs;
drop policy if exists "Users can insert own AI orchestration runs" on public.ai_orchestration_runs;
drop policy if exists "Users can update own AI orchestration runs" on public.ai_orchestration_runs;
drop policy if exists "Users can delete own AI orchestration runs" on public.ai_orchestration_runs;
create policy "Users can read own AI orchestration runs" on public.ai_orchestration_runs for select using (auth.uid()=user_id);
create policy "Users can insert own AI orchestration runs" on public.ai_orchestration_runs for insert with check (auth.uid()=user_id);
create policy "Users can update own AI orchestration runs" on public.ai_orchestration_runs for update using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "Users can delete own AI orchestration runs" on public.ai_orchestration_runs for delete using (auth.uid()=user_id);

create index if not exists ai_evidence_records_trip_kind_idx on public.ai_evidence_records(user_id,trip_id,kind,updated_at desc);
create index if not exists ai_orchestration_runs_trip_created_idx on public.ai_orchestration_runs(user_id,trip_id,created_at desc);

drop trigger if exists ai_evidence_records_touch_updated_at on public.ai_evidence_records;
create trigger ai_evidence_records_touch_updated_at before update on public.ai_evidence_records
for each row execute function public.luvia_touch_ai_updated_at();

grant select,insert,update,delete on public.ai_evidence_records to authenticated;
grant select,insert,update,delete on public.ai_orchestration_runs to authenticated;
