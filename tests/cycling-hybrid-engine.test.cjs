const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const gateway=fs.readFileSync('supabase/functions/luvia-gateway/_shared/cycling.ts','utf8');
const gatewayIndex=fs.readFileSync('supabase/functions/luvia-gateway/index.ts','utf8');
const serviceCode=fs.readFileSync('intelligence/cycling-route-service.js','utf8');
const moduleCode=fs.readFileSync('modules/cycling-routes/cycling-route-module.js','utf8');
const intelligence=fs.readFileSync('core/places/cycling-route-intelligence-service.js','utf8');
const entityGateway=fs.readFileSync('supabase/functions/luvia-gateway/_shared/place-entities.ts','utf8');

for(const token of [
  'OPENROUTESERVICE_API_KEY','ORS_API_KEY','cycling.search.generated','cycling-mountain',
  'round_trip','generated_round_trip','maxGeneratedResultCount','generatedRoundTrips',
  '© openrouteservice.org by HeiGIT | Map data © OpenStreetMap contributors'
]) assert(gateway.includes(token),`Hybrid gateway token missing: ${token}`);
assert(!gateway.includes("extra_info: ['surface', 'waytype', 'steepness', 'suitability', 'osmid']"),'Unsupported cycling osmid extra must not be requested');
assert(gatewayIndex.includes("'cycling.search.generated'"),'Generated cycling action is not routed through the gateway');
for(const token of ['searchGenerated','generatedRoundTrips:true',"'cycling.search.generated'"])assert(serviceCode.includes(token),`Client hybrid token missing: ${token}`);
for(const token of ["loadingSources=new Set(['trailforks','generated','places','routes','trails'])",'Für euch erstellt','isGenerated','isRouteProvider','maxGeneratedResultCount:4',"resultMode==='not_configured'"])assert(moduleCode.includes(token),`Cycling module hybrid token missing: ${token}`);
for(const token of ['generated_round_trip','generated_route','generation_profile','algorithmisch erzeugt'])assert(intelligence.includes(token),`Cycling intelligence hybrid token missing: ${token}`);
assert(entityGateway.includes("provider==='openrouteservice'?'openrouteservice'"),'Universal import must preserve openrouteservice as canonical source');

const generatedRoute={
  id:'ors-roundtrip-mtb-16000-17-test',providerPlaceId:'ors-roundtrip-mtb-16000-17-test',provider:'openrouteservice',source:'openrouteservice',
  name:'MTB-Runde · 16 km bei Paris',primaryType:'cycling_route',location:{latitude:48.85,longitude:2.35},
  routeData:{generated:true,resultKind:'generated_round_trip',profile:'mtb',qualityScore:96,distanceMeters:16000,roundTrip:true}
};
const calls=[];
const context={
  console,
  setTimeout,clearTimeout,
  window:{
    LuviaBackend:{request:async(action,payload)=>{calls.push({action,payload});return action==='cycling.search.generated'?{data:{routes:[generatedRoute],summary:{selectedCount:1}}}:{data:{routes:[],summary:{selectedCount:0}}};}},
    LuviaDestination:{getActive:()=>({name:'Paris',location:{latitude:48.85,longitude:2.35}})}
  }
};
vm.createContext(context);
vm.runInContext(serviceCode,context,{filename:'cycling-route-service.js'});
(async()=>{
  const api=context.window.LuviaCyclingRoutes;
  assert(api&&typeof api.searchGenerated==='function','searchGenerated API missing at runtime');
  const direct=await api.searchGenerated('MTB-Trails',{destination:{name:'Paris',location:{latitude:48.85,longitude:2.35}},profile:'mtb'});
  assert.equal(direct.data.routes[0].routeData.resultKind,'generated_round_trip');
  const combined=await api.search('MTB-Trails',{destination:{name:'Paris',location:{latitude:48.85,longitude:2.35}},profile:'mtb'});
  assert.equal(combined.data.routes.length,1,'Generated routes must survive the combined client merge');
  assert(calls.some(call=>call.action==='cycling.search.generated'),'Generated provider action was not requested');
  console.log('Cycling hybrid route engine: OK');
})().catch(error=>{console.error(error);process.exit(1)});
