const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const migration=read('supabase/migrations/20260808211500_core_v4_54_1_trusted_internal_status_bridge_fix.sql');
const index=read('index.html');
const checks=[
 ['internal apply core',/luvia_booking_apply_provider_status_internal/.test(migration)],
 ['internal signal core',/luvia_booking_ingest_status_signal_internal/.test(migration)],
 ['public apply keeps service role guard',/create or replace function public\.luvia_booking_apply_provider_status[\s\S]*SERVICE_ROLE_REQUIRED/.test(migration)],
 ['public signal keeps service role guard',/create or replace function public\.luvia_booking_ingest_status_signal[\s\S]*SERVICE_ROLE_REQUIRED/.test(migration)],
 ['internal cores revoked from service role',/revoke all on function public\.luvia_booking_ingest_status_signal_internal[\s\S]*service_role/.test(migration)&&/revoke all on function public\.luvia_booking_apply_provider_status_internal[\s\S]*service_role/.test(migration)],
 ['reprocessor uses internal signal core',/v_result:=public\.luvia_booking_ingest_status_signal_internal/.test(migration)],
 ['trusted contract flag passed',/r\.occurred_at,\s*true\s*\)/.test(migration)],
 ['connected gate conditional',/if p_require_connected and c\.luvia_access_state<>'connected'/.test(migration)],
 ['transport capability retained',/PROVIDER_WEBHOOK_STATUS_NOT_ENABLED/.test(migration)&&/PROVIDER_POLLING_STATUS_NOT_ENABLED/.test(migration)],
 ['handoff affiliate guard retained',/NON_CONFIRMING_SOURCE/.test(migration)],
 ['build version',/13\.54\.1/.test(index)&&/luvia-shell-v13\.54\.1/.test(read('sw.js'))],
 ['core version',/core:'4\.54\.1'/.test(read('intelligence/kernel/version.js'))],
 ['release name',/Trusted Internal Status Bridge Fix/.test(read('intelligence/kernel/version.js'))]
];
let fail=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)fail++;}
if(fail)process.exit(1);
console.log('LUVIA_V13_54_1_TRUSTED_INTERNAL_STATUS_BRIDGE_FIX_OK');
