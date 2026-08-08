const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const m=read('supabase/migrations/20260808213000_core_v4_54_2_verified_provider_transition_fix.sql');
const old=read('supabase/migrations/20260808103000_core_v4_40_0_booking_provider_capabilities_status.sql');
const index=read('index.html');
const checks=[
 ['trusted ready confirmation gate',/b\.status='ready'[\s\S]*v_status='confirmed'[\s\S]*provider_webhook[\s\S]*p_require_connected=false/.test(m)],
 ['transition exception is internal only',/and not v_trusted_ready_confirmation/.test(m)],
 ['shared transition matrix remains strict',/when 'ready' then p_to in \('forwarded','requested','cancelled','failed'\)/.test(old)],
 ['provider-only trusted sources',/v_source in \('provider_webhook','provider_api','provider_polling'\)/.test(m)],
 ['internal core still revoked',/revoke all on function public\.luvia_booking_apply_provider_status_internal[\s\S]*service_role/.test(m)],
 ['verified timestamps retained',/status_verified_at=/.test(m)&&/confirmed_at=case when v_status='confirmed'/.test(m)],
 ['provenance evidence',/trustedReadyConfirmation/.test(m)&&/status_source=v_source/.test(m)],
 ['build version',/13\.54\.2/.test(index)&&/luvia-shell-v13\.54\.2/.test(read('sw.js'))],
 ['core version',/core:'4\.54\.2'/.test(read('intelligence/kernel/version.js'))],
 ['release name',/Verified Provider Transition Fix/.test(read('intelligence/kernel/version.js'))]
];
let fail=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)fail++;}
if(fail)process.exit(1);
console.log('LUVIA_V13_54_2_VERIFIED_PROVIDER_TRANSITION_FIX_OK');
