const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),build='13.22.0',core='4.22.0';
const checks={
 'intelligence/kernel/version.js':[build,core,'AI Planning Dialogue'],
 'sw.js':['luvia-shell-v13.22.0'],
 'index.html':[build,'core/planning/planning-session.js','core/planning/planning-dialogue-service.js','core/planning/planning-foundation.js'],
 'modules/places-shell.js':[core,'LuviaPlanningFoundation'],
 'modules/move-shell.js':[core,'LuviaPlanningFoundation']
};
for(const [file,needles] of Object.entries(checks)){const text=fs.readFileSync(path.join(root,file),'utf8');for(const needle of needles)if(!text.includes(needle))throw new Error(`${file} missing ${needle}`)}
console.log('Build 13.22.0 release and architecture consistency: OK');
