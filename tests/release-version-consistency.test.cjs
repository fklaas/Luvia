const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const build='13.14.0',core='4.14.0',title='Transport & Mobility Intelligence';
const must=[
 ['intelligence/kernel/version.js',build,core,title],
 ['index.html',`?v=${build}`,`bootstrap-${core}`,'transport-intelligence-service.js','modules/mobility/mobility-module.css','modules/mobility/mobility-module.js'],
 ['sw.js',`luvia-shell-v${build}`,'modules/mobility/mobility-module.js','transport-intelligence-service.js'],
 ['intelligence/pwa-service.js',`luvia-shell-v${build}`],
 ['intelligence/console.html',`Build ${build}`],
 ['intelligence/test.html',`Build ${build}`],
 ['intelligence/backend.html',`Build ${build}`,'Transport testen'],
 ['core/diagnostics/core-v4-finalization.js',build,core,'Transport & Mobilität Adapter'],
 ['supabase/functions/luvia-gateway/index.ts',build,core],
 ['supabase/functions/luvia-gateway/_shared/places.ts','evChargeOptions','parkingOptions','strictDestination===false'],
 ['intelligence/runtime-config.json',build,core,title],
 ['core/places/place-type-definitions.js',build,core,"type:'mobility'", "renderer:'mobility'"],
 ['core/places/transport-intelligence-service.js',core,'LuviaTransportIntelligence'],
 ['modules/mobility/mobility-module.js',core,"placeType:'mobility'",'LuviaPlaceExperience.moduleShell',"registerCapabilityRenderer?.(\'mobility\'"],
 ['RELEASE-v13.14.0.md',build,core,title],
 ['DEPLOYMENT-v13.14.0.md',build,'Places API (New)'],
 ['TEST-v13.14.0.md',build,"LuviaPlaceRegistry.status('mobility')"],
 ['CHANGED-FILES-v13.14.0.txt',build,core,'modules/mobility/mobility-module.js'],
 ['DELETED-FILES-v13.14.0.txt',build,core,'modules/cycling-routes/cycling-route-module.js'],
 ['COMMIT-v13.14.0.txt','feat(places): add transport mobility and retire cycling routes'],
 ['00_UNBEDINGT_IMMER_LESEN_PLACES_ARCHITEKTUR.md','Build 13.14.0','Core 4.14.0','Transport & Mobilität und Rücknahme von Fahrradrouten']
];
const failures=[];
for(const [file,...tokens] of must){const text=fs.readFileSync(path.join(root,file),'utf8');for(const token of tokens)if(!text.includes(token))failures.push(`${file}: ${token} fehlt`);}
const forbiddenActive=[
 ['index.html',['cycling-route-service.js','cycling-route-intelligence-service.js','modules/cycling-routes/']],
 ['sw.js',['cycling-route-service.js','cycling-route-intelligence-service.js','modules/cycling-routes/']],
 ['supabase/functions/luvia-gateway/index.ts',['CYCLING_ACTIONS','cycling.search','cycling.health','cycling.details']],
 ['core/places/place-type-definitions.js',["type:'cycling_route'"]],
 ['core/modules/module-registry.js',['cycling_routes']],
 ['modules/places-shell.js',['cycling_routes']]
];
for(const [file,tokens] of forbiddenActive){const text=fs.readFileSync(path.join(root,file),'utf8');for(const token of tokens)if(text.includes(token))failures.push(`${file}: still contains retired ${token}`);}
if(failures.length){console.error(failures.join('\n'));process.exit(1)}
console.log('Release version consistency: OK');
