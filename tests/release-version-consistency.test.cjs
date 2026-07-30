const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const build='13.9.1.2',core='4.9.1.2';
const must=[
 ['intelligence/kernel/version.js',build,core,'Global Place Contract Bootstrap & Planning Parity'],
 ['index.html',`?v=${build}`,'data-luvia-critical="place-contract-bootstrap"','bootstrap-4.9.1.2'],
 ['sw.js',`luvia-shell-v${build}`,'ignoreSearch:true','place-type-contract.js'],
 ['intelligence/pwa-service.js',`luvia-shell-v${build}`],
 ['intelligence/console.html',`Build ${build}`],
 ['intelligence/test.html',`Build ${build}`],
 ['intelligence/backend.html',`Build ${build}`],
 ['core/diagnostics/core-v4-finalization.js',build,core],
 ['supabase/functions/luvia-gateway/index.ts',build,core],
 ['intelligence/runtime-config.json',build,core,'Global Place Contract Bootstrap & Planning Parity'],
 ['core/places/place-type-contract.js',core,'luvia:place-contract-ready','upgradedFromBootstrap'],
 ['core/places/place-type-definitions.js',build,core,'luvia:place-definitions-ready','contracts?.bootstrap'],
 ['core/places/place-ui-actions.js',core,'waitForSchema','validateValues'],
 ['modules/restaurants-v2/restaurant-module.js',"LuviaPlaceUIActions.openTimelineDialog({type:'restaurant'"],
 ['RELEASE-v13.9.1.2.md',build,core],
 ['DEPLOYMENT-v13.9.1.2.md',build],
 ['TEST-v13.9.1.2.md',build],
 ['CHANGED-FILES-v13.9.1.2.txt',build,core],
 ['COMMIT-v13.9.1.2.txt','fix(places): restore global planning schemas for every place type'],
 ['00_UNBEDINGT_IMMER_LESEN_PLACES_ARCHITEKTUR.md','Build 13.9.1.2','Core 4.9.1.2']
];
const failures=[];
for(const [file,...tokens] of must){const text=fs.readFileSync(path.join(root,file),'utf8');for(const token of tokens)if(!text.includes(token))failures.push(`${file}: ${token} fehlt`);}
if(failures.length){console.error(failures.join('\n'));process.exit(1)}console.log('Release version consistency: OK');
