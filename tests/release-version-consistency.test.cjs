const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const build='13.9.1',core='4.9.1';
const must=[
 ['intelligence/kernel/version.js',build,core],
 ['index.html',`?v=${build}`],
 ['sw.js',`luvia-shell-v${build}`],
 ['intelligence/pwa-service.js',`luvia-shell-v${build}`],
 ['intelligence/console.html',`Build ${build}`],
 ['intelligence/test.html',`Build ${build}`],
 ['intelligence/backend.html',`Build ${build}`],
 ['core/diagnostics/core-v4-finalization.js',build,core],
 ['supabase/functions/luvia-gateway/index.ts',build,core],
 ['intelligence/runtime-config.json',build,core],
 ['modules/shopping/shopping-module.js',core],
 ['core/places/shopping-intelligence-service.js',core],
 ['RELEASE-v13.9.1.md',build,core],
 ['DEPLOYMENT-v13.9.1.md',build],
 ['TEST-v13.9.1.md',build],
 ['CHANGED-FILES-v13.9.1.txt',build,core],
 ['COMMIT-v13.9.1.txt','fix(places): unify planning editor and guard cloud identifiers'],
 ['00_UNBEDINGT_IMMER_LESEN_PLACES_ARCHITEKTUR.md','Build 13.9.1','Core 4.9.1']
];
const failures=[];
for(const [file,...tokens] of must){const text=fs.readFileSync(path.join(root,file),'utf8');for(const token of tokens)if(!text.includes(token))failures.push(`${file}: ${token} fehlt`);}
if(failures.length){console.error(failures.join('\n'));process.exit(1);}console.log('Release version consistency: OK');
