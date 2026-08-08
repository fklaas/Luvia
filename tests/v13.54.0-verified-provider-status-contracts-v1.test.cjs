const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const migration=read('supabase/migrations/20260808203000_core_v4_54_0_verified_provider_status_contracts_v1.sql');
const quandoo=read('supabase/functions/booking-provider-quandoo-webhook/index.ts');
const tock=read('supabase/functions/booking-provider-tock/index.ts');
const client=read('core/booking/booking-provider-status-contracts.js');
const index=read('index.html');
const checks=[
 ['contract registry',/booking_provider_status_contracts/.test(migration)],
 ['verified public state',/verified_public/.test(migration)],
 ['partner schema gate',/partner_schema_required/.test(migration)],
 ['webhook trust gate',/UNVERIFIED_WEBHOOK_TRANSPORT/.test(migration)],
 ['quandoo confirmed mapping',/RESERVATION_CONFIRMED/.test(migration)&&/confirmed/.test(migration)],
 ['tock party state mapping',/"EXPECTED":"confirmed"/.test(migration)&&/"CANCELLED":"cancelled"/.test(migration)&&!/"NO_SHOW":"confirmed"/.test(migration)],
 ['receipt contract provenance',/status_contract_id/.test(migration)&&/mapping_verified/.test(migration)],
 ['quandoo contract evidence',/quandoo-public-webhooks-2026-08/.test(quandoo)],
 ['tock contract diagnostics',/tock-reservation-model-2026-08/.test(tock)],
 ['client contract module',/LuviaBookingProviderStatusContracts/.test(client)],
 ['client loaded',/booking-provider-status-contracts\.js\?v=13\.54\.0/.test(index)],
 ['build version',/13\.54\.0/.test(index)&&/luvia-shell-v13\.54\.0/.test(read('sw.js'))],
 ['core version',/core:'4\.54\.0'/.test(read('intelligence/kernel/version.js'))]
];
let fail=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)fail++;}
if(fail)process.exit(1);console.log('LUVIA_V13_54_0_VERIFIED_PROVIDER_STATUS_CONTRACTS_V1_OK');
