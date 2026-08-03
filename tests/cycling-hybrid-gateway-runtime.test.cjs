const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
let source=fs.readFileSync('supabase/functions/luvia-gateway/_shared/cycling.ts','utf8');
source=source.replace(/^import\s+\{[^\n]+\}\s+from\s+'\.\/cycling-google\.ts';\s*/,'');
source="const googleCyclingSearch=async()=>({data:{routes:[],anchors:[],summary:{selectedCount:0,anchorCount:0}}}); const googleCyclingDiagnostics=()=>({configured:false});\n"+source;
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const calls=[];
const context={
  module:{exports:{}},exports:{},console,setTimeout,clearTimeout,AbortController,Date,Map,Set,Promise,Math,Number,String,Object,Array,JSON,Error,RegExp,
  Deno:{env:{get:name=>name==='OPENROUTESERVICE_API_KEY'?'test-key':''}},
  fetch:async(url,options)=>{
    const request=JSON.parse(options.body);
    calls.push({url,request,headers:options.headers});
    const length=request.options.round_trip.length;
    const seed=request.options.round_trip.seed;
    return{
      ok:true,status:200,
      json:async()=>({
        metadata:{attribution:'openrouteservice.org by HeiGIT',engine:{version:'test'}},
        features:[{
          type:'Feature',
          geometry:{type:'LineString',coordinates:[[2.35,48.85,35],[2.37,48.86,55],[2.36,48.84,42],[2.35,48.85,35]]},
          properties:{summary:{distance:length+seed,duration:3600},ascent:120,descent:118,extras:{surface:{summary:[{value:10,amount:70},{value:3,amount:30}]},steepness:{summary:[{value:2,amount:80},{value:4,amount:20}]}}}
        }]
      })
    };
  }
};
context.exports=context.module.exports;
vm.createContext(context);
vm.runInContext(compiled,context,{filename:'cycling.ts'});
const api=context.module.exports;
(async()=>{
  const result=await api.cyclingAction('cycling.search.generated',{profile:'mtb',destination:{name:'Paris',location:{latitude:48.85,longitude:2.35}},maxGeneratedResultCount:4});
  assert.equal(result.data.routes.length,4,'Four generated round trips expected');
  assert.equal(calls.length,4,'One ORS request per preset expected');
  assert(calls.every(call=>call.url.includes('/cycling-mountain/geojson')),'MTB generation must use cycling-mountain');
  assert(calls.every(call=>Array.isArray(call.request.coordinates)&&call.request.coordinates.length===1),'Round trip requests must use one coordinate');
  assert(calls.every(call=>call.request.options.round_trip.length>0),'Round trip length missing');
  assert(calls.every(call=>call.headers.Authorization==='test-key'),'ORS key must stay server-side in Authorization header');
  for(const route of result.data.routes){
    assert.equal(route.provider,'openrouteservice');
    assert.equal(route.primaryType,'cycling_route');
    assert.equal(route.routeData.resultKind,'generated_round_trip');
    assert.equal(route.routeData.roundTrip,true);
    assert(route.routeData.geometrySegments[0].length>=4);
    assert(route.routeData.distanceMeters>0);
    assert(route.routeData.estimatedDurationMinutes>0);
    assert(route.routeData.elevationGainMeters>=0);
    assert(!JSON.stringify(route.raw).includes('coordinates'),'Raw provider metadata must not duplicate the complete route geometry');
  }
  console.log('Cycling hybrid gateway runtime: OK');
})().catch(error=>{console.error(error);process.exit(1)});
