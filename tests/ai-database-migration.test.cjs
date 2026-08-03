/* Build 13.17.0 – AI persistence, RLS and profile separation */
const fs=require('fs'),assert=require('assert');
const sql=fs.readFileSync('supabase/migrations/20260803_038_core_v4_17_0_luvia_brain_foundation.sql','utf8');
for(const table of ['ai_learning_signals','ai_interaction_events','ai_action_proposals','ai_usage_events'])assert(sql.includes(`public.${table}`),`missing ${table}`);
for(const token of ['enable row level security','auth.uid() = user_id','luvia_record_ai_learning_signal','evidence_count = ai_learning_signals.evidence_count + 1','confirmation','service_role'])assert(sql.toLowerCase().includes(token.toLowerCase()),`missing ${token}`);
assert(!sql.includes('alter table public.user_profiles drop'),'AI migration destructively changes user profile');
assert(sql.includes("status in ('inferred','confirmed','dismissed')"),'learning signal lifecycle missing');
console.log('AI migration, RLS, evidence memory and profile separation: OK');
