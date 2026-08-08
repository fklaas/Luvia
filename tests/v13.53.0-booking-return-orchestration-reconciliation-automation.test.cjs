const fs=require('fs');const path=require('path');const root=path.resolve(__dirname,'..');const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const sql=read('supabase/migrations/20260808194500_core_v4_53_0_booking_return_orchestration_reconciliation_automation.sql');
const client=read('core/booking/booking-return-orchestration.js');
const integration=read('core/booking/booking-integration.js');
const view=read('app/bookings-view.js');
const checks=[
 ['receipt reprocess counters',/reprocess_count/.test(sql)&&/last_reprocessed_at/.test(sql)],
 ['trip scoped reconciliation runner',/luvia_booking_reconcile_trip_returns/.test(sql)&&/TRIP_ACCESS_DENIED/.test(sql)],
 ['exact provider reference bridge',/booking_provider_reference_return_bridge/.test(sql)&&/reservation_reference/.test(sql)],
 ['correlation link bridge',/booking_correlation_return_bridge/.test(sql)],
 ['unknown status remains review',/STATUS_NOT_PUBLICLY_VERIFIED/.test(sql)&&/pending_review/.test(sql)],
 ['commercial auto reconciliation',/booking_conversion_commission_bridge/.test(sql)&&/'pending'/.test(sql)],
 ['commercial signals never confirm',/commercialSignalsCanConfirmReservation',false/.test(sql)||/commercialSignalsCanConfirmReservation:false/.test(client)],
 ['reconciliation run audit',/booking_reconciliation_runs/.test(sql)],
 ['booking view triggers eventual consistency',/reconcileTripReturns/.test(view)&&/reconcileTripReturns/.test(integration)],
 ['single flight client',/const runs=new Map/.test(client)&&/runs\.has\(tripId\)/.test(client)]
];
let fail=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)fail++;}if(fail)process.exit(1);console.log('LUVIA_V13_53_0_BOOKING_RETURN_ORCHESTRATION_RECONCILIATION_AUTOMATION_OK');
