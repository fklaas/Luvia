const fs=require('fs'),assert=require('assert');
const read=f=>fs.readFileSync(f,'utf8');
const kg=read('core/context/journey-knowledge-graph.js');
assert(kg.includes('plannedVisits'));assert(kg.includes('normalizeBooking'));assert(kg.includes("planningStatus:'planned'"));
const places=read('modules/places-shell.js'),move=read('modules/move-shell.js');
assert(places.includes('LuviaConversationalDiscovery'));assert(move.includes('LuviaConversationalDiscovery'));
const pipe=read('core/discovery/ai-search-evidence-pipeline.js');assert(pipe.includes('LuviaDiscoveryContracts.matches'));assert(pipe.includes('dedupe'));assert(pipe.includes('uncertainties'));
assert(!move.includes("planned_at"));console.log('PASS planned visits + conversational discovery 13.19.1');
