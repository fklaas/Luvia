const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const build='13.11.0',core='4.11.0';
const must=[
 ['intelligence/kernel/version.js',build,core,'Cycling Routes & MTB Trail Intelligence'],
 ['index.html',`?v=${build}`,'cycling-route-service.js','cycling-route-intelligence-service.js','modules/cycling-routes/cycling-route-module.js'],
 ['sw.js',`luvia-shell-v${build}`,'modules/cycling-routes/cycling-route-module.js','cycling-route-intelligence-service.js'],
 ['intelligence/pwa-service.js',`luvia-shell-v${build}`],
 ['intelligence/console.html',`Build ${build}`],
 ['intelligence/test.html',`Build ${build}`],
 ['intelligence/backend.html',`Build ${build}`,'Fahrradrouten testen'],
 ['core/diagnostics/core-v4-finalization.js',build,core,'Fahrradrouten Adapter'],
 ['supabase/functions/luvia-gateway/index.ts',build,core,'CYCLING_ACTIONS'],
 ['supabase/functions/luvia-gateway/_shared/cycling.ts',core,'cycling.search','cycling.details'],
 ['supabase/migrations/20260730_036_core_v4_11_0_cycling_route_place_type.sql',core,"'cycling_route'"],
 ['intelligence/runtime-config.json',build,core,'Cycling Routes & MTB Trail Intelligence'],
 ['core/places/place-type-definitions.js',build,core,"type:'cycling_route'"],
 ['core/places/cycling-route-intelligence-service.js',core,'LuviaCyclingRouteIntelligence'],
 ['modules/cycling-routes/cycling-route-module.js',core,"placeType:'cycling_route'",'registerCapabilityRenderer?.(TYPE'],
 ['RELEASE-v13.11.0.md',build,core],
 ['DEPLOYMENT-v13.11.0.md',build],
 ['TEST-v13.11.0.md',build],
 ['CHANGED-FILES-v13.11.0.txt',build,core],
 ['COMMIT-v13.11.0.txt','feat(places): add cycling routes and mtb trail intelligence'],
 ['00_UNBEDINGT_IMMER_LESEN_PLACES_ARCHITEKTUR.md','Build 13.11.0','Core 4.11.0']
];
const failures=[];
for(const [file,...tokens] of must){const text=fs.readFileSync(path.join(root,file),'utf8');for(const token of tokens)if(!text.includes(token))failures.push(`${file}: ${token} fehlt`);}
if(failures.length){console.error(failures.join('\n'));process.exit(1)}console.log('Release version consistency: OK');
