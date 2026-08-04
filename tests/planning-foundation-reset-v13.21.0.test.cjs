const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
for(const f of ['core/planning/planning-session.js','core/planning/planning-tool-registry.js','core/planning/planning-foundation.js'])if(!fs.existsSync(path.join(root,f)))throw new Error(`missing ${f}`);
const places=read('modules/places-shell.js'),move=read('modules/move-shell.js');
for(const [name,text] of [['places',places],['move',move]]){
 if(!text.includes('LuviaPlanningFoundation'))throw new Error(`${name} does not mount planning foundation`);
 if(text.includes('LuviaAISearchEvidencePipeline.execute'))throw new Error(`${name} still triggers automatic discovery search`);
 if(text.includes('LuviaConversationalDiscovery'))throw new Error(`${name} still mounts old conversational discovery`);
}
const foundation=read('core/planning/planning-foundation.js');
if(!foundation.includes('Noch keine automatische Suche'))throw new Error('foundation does not communicate reset state');
if(!foundation.includes('onCatalog'))throw new Error('explicit catalog fallback missing');
const session=read('core/planning/planning-session.js');
for(const token of ['goals','constraints','preferenceLayers','decisions','rejectedOptions','candidateSets','draftPlan'])if(!session.includes(token))throw new Error(`session model missing ${token}`);
console.log('Planning Foundation Reset v13.21.0: OK');
