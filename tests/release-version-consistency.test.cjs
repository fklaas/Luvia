const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const build='13.13.0',core='4.13.0',title='Cycling Routes Rebuild & Google-First Discovery';
const must=[
 ['intelligence/kernel/version.js',build,core,title],
 ['index.html',`?v=${build}`,`bootstrap-${core}`,'cycling-route-service.js','cycling-route-intelligence-service.js','modules/cycling-routes/cycling-route-module.css','modules/cycling-routes/cycling-route-module.js'],
 ['sw.js',`luvia-shell-v${build}`,'modules/cycling-routes/cycling-route-module.js','cycling-route-intelligence-service.js'],
 ['intelligence/pwa-service.js',`luvia-shell-v${build}`],
 ['intelligence/console.html',`Build ${build}`],
 ['intelligence/test.html',`Build ${build}`],
 ['intelligence/backend.html',`Build ${build}`,'Fahrradrouten testen'],
 ['core/diagnostics/core-v4-finalization.js',build,core,'Fahrradrouten Adapter'],
 ['supabase/functions/luvia-gateway/index.ts',build,core,'CYCLING_ACTIONS',"'cycling.search.google'"],
 ['supabase/functions/luvia-gateway/_shared/cycling.ts',core,'googleCyclingSearch','cycling.search.google','cycling.search.generated','cycling.details'],
 ['supabase/functions/luvia-gateway/_shared/cycling-google.ts',core,'places.googleapis.com/v1','routes.googleapis.com/directions/v2:computeRoutes',"travelMode: 'BICYCLE'",'syntheticAnchors'],
 ['supabase/migrations/20260730_036_core_v4_11_0_cycling_route_place_type.sql','4.11.0',"'cycling_route'"],
 ['intelligence/runtime-config.json',build,core,title],
 ['core/places/place-type-definitions.js',build,core,"type:'cycling_route'"],
 ['core/places/cycling-route-intelligence-service.js',core,'LuviaCyclingRouteIntelligence','Google Routes'],
 ['modules/cycling-routes/cycling-route-module.js',core,"placeType:'cycling_route'",'registerCapabilityRenderer?.(TYPE','searchGoogle'],
 ['RELEASE-v13.13.0.md',build,core,title],
 ['DEPLOYMENT-v13.13.0.md',build,'Places API (New)','Routes API'],
 ['TEST-v13.13.0.md',build,'cycling.search.google'],
 ['CHANGED-FILES-v13.13.0.txt',build,core],
 ['COMMIT-v13.13.0.txt','fix(cycling): rebuild discovery around Google Places and Routes'],
 ['00_UNBEDINGT_IMMER_LESEN_PLACES_ARCHITEKTUR.md','Build 13.13.0','Core 4.13.0','Google-First Cycling Routes Rebuild']
];
const failures=[];
for(const [file,...tokens] of must){const text=fs.readFileSync(path.join(root,file),'utf8');for(const token of tokens)if(!text.includes(token))failures.push(`${file}: ${token} fehlt`);}
if(failures.length){console.error(failures.join('\n'));process.exit(1)}console.log('Release version consistency: OK');
