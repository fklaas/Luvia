const fs=require('fs');
const path=require('path');
const os=require('os');
const assert=require('assert');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const source=fs.readFileSync('supabase/functions/luvia-gateway/_shared/cycling-google.ts','utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const tmp=path.join(os.tmpdir(),`luvia-cycling-google-${Date.now()}.cjs`);
fs.writeFileSync(tmp,js);
global.Deno={env:{get:name=>['GOOGLE_PLACES_API_KEY','GOOGLE_MAPS_API_KEY'].includes(name)?'test-google-key':''}};
let placeRequests=0,routeRequests=0;
global.fetch=async(url,options={})=>{
  if(String(url).includes('places.googleapis.com')){
    placeRequests++;
    return{ok:true,status:200,json:async()=>({places:[
      {id:`places/anchor-${placeRequests}-a`,displayName:{text:'Bois de Vincennes'},formattedAddress:'Paris, Frankreich',shortFormattedAddress:'Paris',location:{latitude:48.8283,longitude:2.4330},primaryType:'park',types:['park','tourist_attraction'],rating:4.7,userRatingCount:24000,googleMapsUri:'https://maps.google.test/bois'},
      {id:`places/anchor-${placeRequests}-b`,displayName:{text:'Cycling Park Paris'},formattedAddress:'Paris, Frankreich',shortFormattedAddress:'Paris',location:{latitude:48.875,longitude:2.41},primaryType:'sports_complex',types:['sports_complex','park'],rating:4.5,userRatingCount:320,googleMapsUri:'https://maps.google.test/cycling'}
    ]})};
  }
  if(String(url).includes('routes.googleapis.com')){
    routeRequests++;
    const body=JSON.parse(options.body||'{}');
    assert.equal(body.travelMode,'BICYCLE');
    assert(Array.isArray(body.intermediates)&&body.intermediates.length>=2,'Google route must use intermediate cycling waypoints');
    return{ok:true,status:200,json:async()=>({routes:[{distanceMeters:18000+routeRequests*1000,duration:`${3600+routeRequests*120}s`,polyline:{encodedPolyline:'_p~iF~ps|U_ulLnnqC_mqNvxq`@'},routeLabels:['DEFAULT_ROUTE']} ]})};
  }
  throw new Error(`Unexpected URL: ${url}`);
};
const api=require(tmp);
(async()=>{
  const response=await api.googleCyclingSearch({profile:'mtb',maxGeneratedResultCount:4,destination:{name:'Paris',countryCode:'FR',location:{latitude:48.8566,longitude:2.3522}}});
  assert.equal(response.data.routes.length,4,'Google-first provider must generate four routes');
  assert(response.data.anchors.length>=2,'Google Places anchors must be returned');
  assert.equal(response.data.summary.resultMode,'google-generated');
  assert.equal(response.data.provider,'google-cycling');
  assert(placeRequests>=1&&placeRequests<=3,'Anchor discovery must use a bounded number of parallel Places searches');
  assert(routeRequests>=4,'One successful Google Routes request per generated proposal expected');
  for(const route of response.data.routes){
    assert.equal(route.provider,'google-routes');
    assert.equal(route.primaryType,'cycling_route');
    assert.equal(route.routeData.resultKind,'generated_round_trip');
    assert.equal(route.routeData.generated,true);
    assert(route.routeData.geometrySegments[0].length>=3);
    assert(route.routeData.distanceMeters>0);
    assert(route.routeData.estimatedDurationMinutes>0);
    assert(route.routeData.warnings.length>=1,'Google bicycle beta warning must remain visible');
  }
  const diagnostics=api.googleCyclingDiagnostics();
  assert.equal(diagnostics.configured,true);
  assert.equal(diagnostics.capabilities.syntheticWaypointFallback,true);
  assert.equal(diagnostics.capabilities.routesDoNotWaitForSlowPlaces,true);
  console.log('Cycling Google-first discovery runtime: OK');
})().catch(error=>{console.error(error);process.exit(1)}).finally(()=>{try{fs.unlinkSync(tmp)}catch{}});
