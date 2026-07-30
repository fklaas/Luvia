const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const build='13.10.0',core='4.10.0';
const must=[
 ['intelligence/kernel/version.js',build,core,'Nature & Excursion Intelligence'],
 ['index.html',`?v=${build}`,'nature-intelligence-service.js','modules/nature/nature-module.js'],
 ['sw.js',`luvia-shell-v${build}`,'modules/nature/nature-module.js','nature-intelligence-service.js'],
 ['intelligence/pwa-service.js',`luvia-shell-v${build}`],
 ['intelligence/console.html',`Build ${build}`],
 ['intelligence/test.html',`Build ${build}`],
 ['intelligence/backend.html',`Build ${build}`,'Natur testen'],
 ['core/diagnostics/core-v4-finalization.js',build,core,'Natur Adapter'],
 ['supabase/functions/luvia-gateway/index.ts',build,core],
 ['intelligence/runtime-config.json',build,core,'Nature & Excursion Intelligence'],
 ['core/places/place-type-definitions.js',build,core,"type:'nature'"],
 ['core/places/nature-intelligence-service.js',core,'LuviaNatureIntelligence'],
 ['modules/nature/nature-module.js',core,"placeType:'nature'","registerCapabilityRenderer?.('nature'"],
 ['RELEASE-v13.10.0.md',build,core],
 ['DEPLOYMENT-v13.10.0.md',build],
 ['TEST-v13.10.0.md',build],
 ['CHANGED-FILES-v13.10.0.txt',build,core],
 ['COMMIT-v13.10.0.txt','feat(places): add nature and excursion intelligence'],
 ['00_UNBEDINGT_IMMER_LESEN_PLACES_ARCHITEKTUR.md','Build 13.10.0','Core 4.10.0']
];
const failures=[];
for(const [file,...tokens] of must){const text=fs.readFileSync(path.join(root,file),'utf8');for(const token of tokens)if(!text.includes(token))failures.push(`${file}: ${token} fehlt`);}
if(failures.length){console.error(failures.join('\n'));process.exit(1)}console.log('Release version consistency: OK');
