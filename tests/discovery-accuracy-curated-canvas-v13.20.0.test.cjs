const fs=require('fs'),path=require('path'),assert=require('assert');const root=path.resolve(__dirname,'..');const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const conv=read('core/discovery/conversational-discovery-core.js'),pipe=read('core/discovery/ai-search-evidence-pipeline.js'),canvas=read('core/discovery/curated-travel-canvas.js'),places=read('modules/places-shell.js'),move=read('modules/move-shell.js');
assert(conv.includes("domain==='move'"));assert(pipe.includes('MAX=5'));assert(canvas.includes('Luvias beste Wahl'));
assert(!places.includes('showCurated'));assert(!move.includes('showCurated'));
assert(places.includes('LuviaPlanningFoundation'));assert(move.includes('LuviaPlanningFoundation'));
console.log('Historical discovery components retained but superseded by Planning Foundation Reset');
