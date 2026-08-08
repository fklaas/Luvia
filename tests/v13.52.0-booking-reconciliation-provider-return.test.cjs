const fs=require('fs'); const path=require('path'); const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const sql=read('supabase/migrations/20260808190000_core_v4_52_0_booking_reconciliation_provider_return.sql');
const client=read('core/booking/booking-reconciliation-provider-return.js');
const q=read('supabase/functions/booking-provider-quandoo-webhook/index.ts');
const ingest=read('supabase/functions/booking-provider-status-ingest/index.ts');
const checks=[
 ['provider receipt inbox',/booking_provider_status_receipts/.test(sql)],
 ['commission reconciliation ledger',/booking_commission_reconciliations/.test(sql)],
 ['reconciliation issues',/booking_reconciliation_issues/.test(sql)],
 ['correlation aware receipt',/p_correlation_token/.test(sql)&&/booking_correlations/.test(sql)],
 ['provider reference fallback',/booking_provider_references/.test(sql)],
 ['verified mapping gate',/STATUS_NOT_PUBLICLY_VERIFIED/.test(sql)],
 ['conversion never changes booking status',/bookingStatusChanged',false/.test(sql)],
 ['commission paid attribution',/commission_paid/.test(sql)],
 ['quandoo webhook custom token',/X-Luvia-Quandoo-Token/.test(q)&&/QUANDOO_WEBHOOK_TOKEN/.test(q)],
 ['quandoo official events',/RESERVATION_CONFIRMED/.test(sql)&&/RESERVATION_MERCHANT_CANCELED/.test(sql)],
 ['api polling ingest bridge',/booking-provider-status-ingest/.test(ingest)&&/PARTNER_REQUIRED/.test(ingest)],
 ['client semantics',/commissionDoesNotConfirmReservation:true/.test(client)&&/providerReceiptRequiresVerifiedMapping:true/.test(client)]
];
let failed=0; for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`); if(!ok)failed++;}
if(failed)process.exit(1); console.log('LUVIA_V13_52_0_BOOKING_RECONCILIATION_PROVIDER_RETURN_OK');
