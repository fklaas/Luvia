/* Build 13.16.2 – Move cannot plan or write to Timeline */
const fs=require('fs');
const assert=require('assert');
const files=['modules/move-shell.js','modules/mobility/mobility-module.js'];
for(const file of files){const text=fs.readFileSync(file,'utf8');for(const token of ['planned_at','Zur Timeline','openTimelineDialog','planningCapability'])assert(!text.includes(token),`${file} contains forbidden Move planning token ${token}`)}
const schema=fs.readFileSync('core/preferences/preference-schema.js','utf8');
const definitions=fs.readFileSync('core/places/place-type-definitions.js','utf8');
assert(schema.includes("placeType: 'mobility'"));
assert(!schema.slice(schema.indexOf('function buildMoveContract'),schema.indexOf('function buildContract')).includes('planned_at'));
assert(definitions.includes("type:'mobility'")&&definitions.includes('planning:false'),'mobility capability does not explicitly disable planning');
console.log('Move without Timeline/planning: OK');
