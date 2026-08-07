(function(){
'use strict';
const R=()=>window.LuviaBookingProviderRegistry;
function register(){
 const defs=[
  {id:'email-stub',channel:'email',priority:60,network:true,supports:b=>({supported:Boolean(b?.contact?.email),score:60,reason:'Öffentliche Kontakt-E-Mail vorhanden'}),dispatch:async()=>{throw new Error('Echter EmailProvider ist in V0.3 noch nicht aktiviert. Verwende mock-email im Testmodus.');}},
  {id:'external-link',channel:'external_link',priority:40,network:false,supports:b=>({supported:Boolean(b?.request?.bookingUrl),score:40,reason:'Externer Buchungslink vorhanden'}),dispatch:async()=>{throw new Error('ExternalLinkProvider ist in V0.3 nur als Contract vorhanden.');}},
  {id:'affiliate',channel:'affiliate',priority:30,network:false,supports:b=>({supported:Boolean(b?.request?.affiliateUrl),score:30,reason:'Affiliate-Ziel vorhanden'}),dispatch:async()=>{throw new Error('AffiliateProvider ist in V0.3 nur als Contract vorhanden.');}},
  {id:'api',channel:'api',priority:80,network:true,supports:b=>({supported:Boolean(b?.request?.providerApi),score:80,reason:'Direkter Provider-Adapter verfügbar'}),dispatch:async()=>{throw new Error('ApiProvider ist in V0.3 nur als Contract vorhanden.');}}
 ];
 defs.forEach(d=>{try{R().register(d);}catch(error){if(!String(error?.message||'').includes('bereits registriert'))throw error;}});
}
if(R())register();window.LuviaBookingProviderStubs=Object.freeze({version:'0.3.0',register});
})();
