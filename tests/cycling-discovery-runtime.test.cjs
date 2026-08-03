const fs=require('fs');
const path=require('path');
const os=require('os');
const assert=require('assert');
const ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
const source=fs.readFileSync('supabase/functions/luvia-gateway/_shared/cycling.ts','utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const tmp=path.join(os.tmpdir(),`luvia-cycling-${Date.now()}.cjs`);
fs.writeFileSync(tmp,js);
global.Deno={env:{get:()=>''}};
global.fetch=async(_url,options={})=>{
  const data=new URLSearchParams(options.body).get('data')||'';
  let elements=[];
  if(data.includes('relation(around:')){
    elements=[{type:'relation',id:101,center:{lat:48.91,lon:2.42},tags:{type:'route',route:'bicycle',name:'Große regionale Radrunde',network:'rcn',distance:'62 km'}}];
  }else if(data.includes('mtb:scale')){
    elements=[
      {type:'way',id:201,center:{lat:48.88,lon:2.39},tags:{highway:'path','mtb:scale':'1',surface:'ground'}},
      {type:'way',id:202,center:{lat:48.881,lon:2.392},tags:{highway:'track','mtb:scale':'2',surface:'compacted'}}
    ];
  }
  return{ok:true,status:200,json:async()=>({elements})};
};
const api=require(tmp);
(async()=>{
  const payload={query:'Mountainbike Trails Singletrails Enduro',profile:'mtb',radiusMeters:150000,maxResultCount:30,destination:{name:'Paris',displayName:'Paris',location:{latitude:48.8566,longitude:2.3522}}};
  const routes=await api.cyclingAction('cycling.search.routes',payload);
  assert(routes.data.routes.length===1,'Broad route stage must keep a general cycling route when exact MTB routes are absent');
  assert(routes.data.routes[0].routeData.matchTier==='fallback','General route must be truthfully marked as fallback');
  assert(routes.data.summary.resultMode==='fallback','Route stage must announce fallback mode instead of returning empty');
  const trails=await api.cyclingAction('cycling.search.trails',payload);
  assert(trails.data.routes.length>=1,'Unnamed MTB ways must be converted into a discoverable trail area');
  const area=trails.data.routes.find(item=>item.routeData.resultKind==='trail_area');
  assert(area,'MTB way cluster must be represented as trail_area');
  assert(area.routeData.matchTier==='exact','MTB trail area must be an exact MTB match');
  assert(area.routeData.isCompleteRoute===false,'Trail area must never pretend to be a complete route');
  const combined=await api.cyclingAction('cycling.search',payload);
  assert(combined.data.routes.length>=2,'Combined staged discovery must merge route fallback and exact trail area');
  console.log('Cycling discovery runtime fallback and clustering: OK');
})().catch(error=>{console.error(error);process.exit(1)}).finally(()=>{try{fs.unlinkSync(tmp)}catch{}});
