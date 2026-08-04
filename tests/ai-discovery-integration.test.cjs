const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..');
const ai=fs.readFileSync(path.join(root,'core/ai/ai-core.js'),'utf8');
const places=fs.readFileSync(path.join(root,'modules/places-shell.js'),'utf8');
const move=fs.readFileSync(path.join(root,'modules/move-shell.js'),'utf8');
assert(ai.includes('planDiscovery'), 'legacy AI discovery capability remains available as an internal API');
assert(!places.includes("planDiscovery('places'")&&!move.includes("planDiscovery('move'"),'primary shells must not auto-call discovery');
assert(places.includes('LuviaPlanningFoundation')&&move.includes('LuviaPlanningFoundation'));
console.log('AI discovery integration reset: legacy capability retained, primary flow disabled');
