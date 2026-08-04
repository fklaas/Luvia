const fs=require('fs'),path=require('path'),assert=require('assert');const root=path.resolve(__dirname,'..');
const graph=fs.readFileSync(path.join(root,'core/context/journey-knowledge-graph.js'),'utf8');
const places=fs.readFileSync(path.join(root,'modules/places-shell.js'),'utf8');const move=fs.readFileSync(path.join(root,'modules/move-shell.js'),'utf8');
assert(graph.includes('plannedVisit'),'planned visits remain supported');
assert(!places.includes('LuviaConversationalDiscovery'));assert(!move.includes('LuviaConversationalDiscovery'));
assert(places.includes('LuviaPlanningFoundation'));assert(move.includes('LuviaPlanningFoundation'));
console.log('Planned visits retained; conversational discovery superseded by planning foundation');
