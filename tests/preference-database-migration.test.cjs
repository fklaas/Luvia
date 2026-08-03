/* Build 13.16.1 – migration safety, source of truth and RLS structure */
const fs=require('fs');
const assert=require('assert');
const sql=fs.readFileSync('supabase/migrations/20260803_037_core_v4_16_1_global_user_preference_persistence.sql','utf8');
for(const field of ['dietary_preferences','travel_interests','travel_styles','activity_preferences','entertainment_preferences','mobility_preferences','travel_pace','budget_preference','family_preferences','accessibility_preferences','preference_schema_version','preferences_completed_at','preferences_updated_at'])assert(sql.includes(field),`missing field ${field}`);
for(const token of ['alter table public.user_profiles','add column if not exists','luvia_upsert_my_profile_v2','luvia_get_my_profile','on_auth_user_created_luvia_profile','after insert on auth.users','on conflict(user_id) do nothing','auth.uid() = user_id','enable row level security','from public, anon','travel_preferences','raw_user_meta_data','luvia_safe_integer','luvia_safe_timestamptz'])assert(sql.includes(token),`migration missing ${token}`);
assert(/dietary_preferences\s+text\[\]/.test(sql),'dietary_preferences is not migrated to text[]');
assert(/mobility_preferences\s+text\[\]/.test(sql),'mobility_preferences text[] missing');
assert(/family_preferences\s+jsonb/.test(sql),'family_preferences jsonb missing');
assert(!/create\s+table\s+(if\s+not\s+exists\s+)?public\.[a-z_]*preferences/i.test(sql),'parallel preference table introduced');
assert(!/create policy user_profiles_delete_own/i.test(sql),'private preference delete policy was reintroduced');
assert.strictEqual((sql.match(/\bbegin;/g)||[]).length>=1,true);
assert(sql.trim().endsWith('commit;'),'migration is not transactional');
console.log('Preference database migration structure and RLS: OK');
