const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const build='13.15.0',core='4.15.0',title='Move Domain Extraction & Mobility Separation';
const must=[
 ['intelligence/kernel/version.js',build,core,title,'2026-08-03T12:51:00+02:00'],
 ['index.html',`?v=${build}`,`bootstrap-${core}`,'modules/move-shell.css','modules/move-shell.js','modules/mobility/mobility-module.js'],
 ['sw.js',`luvia-shell-v${build}`,'modules/move-shell.css','modules/move-shell.js','modules/mobility/mobility-module.js'],
 ['intelligence/pwa-service.js',`luvia-shell-v${build}`],
 ['intelligence/console.html',`Build ${build}`],
 ['intelligence/test.html',`Build ${build}`],
 ['intelligence/backend.html',`Build ${build}`,'Move testen'],
 ['core/diagnostics/core-v4-finalization.js',build,core,'Move Adapter'],
 ['supabase/functions/luvia-gateway/index.ts',build,core],
 ['supabase/functions/luvia-gateway/_shared/places.ts','evChargeOptions','parkingOptions','strictDestination===false'],
 ['intelligence/runtime-config.json',build,core,title],
 ['core/places/place-type-definitions.js',build,core,"type:'mobility'", "renderer:'mobility'", "identity:{label:'Move-Punkt'"],
 ['core/places/transport-intelligence-service.js',core,'LuviaTransportIntelligence','move-mobility'],
 ['core/modules/module-registry.js',core,'CORE_PLACE_MODULES','CORE_MOVE_MODULES',"domain:'move'"],
 ['modules/places-shell.js',core,'Luvia Places'],
 ['modules/move-shell.js',core,'Luvia Move','An- & Abreise','Vor Ort'],
 ['modules/mobility/mobility-module.js',core,"placeType:'mobility'",'LuviaPlaceExperience.moduleShell',"registerCapabilityRenderer?.('mobility'"],
 ['app/app-shell.js',build,'data-view="places"','data-view="move"'],
 ['RELEASE-v13.15.0.md',build,core,title],
 ['DEPLOYMENT-v13.15.0.md',build,'Places API (New)','Move'],
 ['TEST-v13.15.0.md',build,"LuviaPlaceRegistry.status('mobility')",'LuviaMoveShell'],
 ['CHANGED-FILES-v13.15.0.txt',build,core,'modules/move-shell.js','modules/mobility/mobility-module.js'],
 ['COMMIT-v13.15.0.txt','feat(move): extract mobility from Places into its own domain'],
 ['00_UNBEDINGT_IMMER_LESEN_PLACES_ARCHITEKTUR.md','Build 13.15.0','Core 4.15.0','Places / Move Domain Separation']
];
const failures=[];
for(const [file,...tokens] of must){const full=path.join(root,file);if(!fs.existsSync(full)){failures.push(`${file}: Datei fehlt`);continue}const text=fs.readFileSync(full,'utf8');for(const token of tokens)if(!text.includes(token))failures.push(`${file}: ${token} fehlt`);}
const placesShell=fs.readFileSync(path.join(root,'modules/places-shell.js'),'utf8');
if(placesShell.includes("mobility:{"))failures.push('modules/places-shell.js: mobility still appears in Places hub');
const app=fs.readFileSync(path.join(root,'app/app-shell.js'),'utf8');
if(!app.includes('Dashboard')||!app.includes('📍 Places')||!app.includes('🚉 Move'))failures.push('app/app-shell.js: three-part navigation missing');
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
