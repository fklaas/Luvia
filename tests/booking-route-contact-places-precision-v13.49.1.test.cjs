const fs=require('fs');const path=require('path');const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const booking=read('core/booking/booking-ui.js');
const route=read('supabase/functions/booking-route-resolve/index.ts');
const contracts=read('core/places/global-place-contracts.js');
const places=read('core/places/places-final-foundation.js');
const domain=read('core/places/place-domain.js');
const checks=[
 ['booking UI version',booking.includes("VERSION='1.5.0'")],
 ['manual fallback removed',!booking.includes('Optionaler manueller Fallback')&&!booking.includes('Anfrage vormerken')],
 ['explicit missing-email state',booking.includes('Keine verifizierte öffentliche E-Mail-Adresse gefunden.')],
 ['direct email send CTA',booking.includes('Reservierungsanfrage senden')&&booking.includes('sendEmail')],
 ['eager route prefetch',booking.includes("resolveRouteCached(placeFromButton(button)).catch(()=>{})")],
 ['virtual menu blocked',route.includes('virtual-menu')&&route.includes('NON_BOOKING_PROVIDER_CONTENT')],
 ['provider booking affordance required',route.includes('NO_BOOKING_AFFORDANCE')&&route.includes('BOOKING_PAGE_EVIDENCE')],
 ['fast first-page route',route.includes('VERIFIED_BOOKING_ROUTE_FAST')],
 ['parallel contact crawl',route.includes('Promise.all(crawl.map(link=>fetchPage(link)))')],
 ['hidden gem intent',contracts.includes('hidden_gem')&&contracts.includes('Geheimtipp')],
 ['mass tourism rejection',contracts.includes('iconicOrMassTourism')&&contracts.includes('userRatingCount')],
 ['semantic place filtering',places.includes('semanticRequest')],
 ['cross-place roles canonicalized',domain.includes("return'accommodation'")&&domain.includes("return'restaurant'")],
];
let fail=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)fail++;}
if(fail)process.exit(1);console.log('RESULT: LUVIA_V13_49_1_VERIFIED_BOOKING_CONTACT_PLACES_PRECISION_OK');
