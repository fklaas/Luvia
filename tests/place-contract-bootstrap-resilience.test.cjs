const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const listeners=new Map();
const window={
 addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn)},
 removeEventListener(type,fn){listeners.get(type)?.delete(fn)},
 dispatchEvent(event){for(const fn of listeners.get(event.type)||[])fn(event);return true}
};
class CustomEvent{constructor(type,options={}){this.type=type;this.detail=options.detail}}
const document={
 currentScript:{src:'https://example.test/core/places/place-type-definitions.js?v=13.17.0'},
 baseURI:'https://example.test/',
 createElement(){return{dataset:{},addEventListener(){},set src(value){this._src=value},get src(){return this._src}}},
 head:{appendChild(){}}
};
const context=vm.createContext({window,document,CustomEvent,URL,Map,Object,JSON,setTimeout,clearTimeout,console});
function run(file){vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file})}

const html=fs.readFileSync('index.html','utf8');
const bootstrap=html.match(/<script data-luvia-critical="place-contract-bootstrap">([\s\S]*?)<\/script>/);
assert(bootstrap,'critical inline place-contract bootstrap missing');
vm.runInContext(bootstrap[1],context,{filename:'inline-place-contract-bootstrap.js'});
assert.strictEqual(window.LuviaPlaceTypeContracts.bootstrap,true,'inline bootstrap was not installed');

run('core/places/place-domain.js');
assert.doesNotThrow(()=>run('core/places/place-type-definitions.js'),'definitions must register against the inline bootstrap');
const planned={restaurant:'planned_at',accommodation:'check_in_at',attraction:'starts_at',photo_spot:'planned_at',shopping:'planned_at',nature:'planned_at'};
for(const [type,key] of Object.entries(planned)){
 const contract=window.LuviaPlaceTypeContracts.get(type);
 assert(contract,`${type} contract missing in bootstrap mode`);
 assert(contract.fields.some(field=>field.key===key&&['start','end','point'].includes(field.timelineRole)),`${type} timeline schema missing in bootstrap mode`);
}
const mobilityBootstrap=window.LuviaPlaceTypeContracts.get('mobility');
assert(mobilityBootstrap,'mobility contract missing in bootstrap mode');
assert.strictEqual(mobilityBootstrap.planning,false,'Move must disable planning in bootstrap mode');
assert(!mobilityBootstrap.fields.some(field=>field.key==='planned_at'),'Move must not register planned_at in bootstrap mode');

run('core/places/place-registry.js');
run('core/places/place-type-contract.js');
assert.strictEqual(window.LuviaPlaceTypeContracts.version,'4.17.0','full contract did not upgrade the bootstrap');
assert.strictEqual(window.LuviaPlaceTypeContracts.bootstrap,false,'bootstrap flag remained active after upgrade');
for(const [type,key] of Object.entries(planned)){
 const contract=window.LuviaPlaceTypeContracts.get(type);
 assert(contract,`${type} contract lost during full-contract upgrade`);
 assert.strictEqual(contract.contractVersion,'4.17.0',`${type} contract version was not upgraded`);
 assert(contract.fields.some(field=>field.key===key&&['start','end','point'].includes(field.timelineRole)),`${type} timeline schema lost during upgrade`);
 const registry=window.LuviaPlaceRegistry.getType(type);
 assert.strictEqual(registry.contractVersion,'4.17.0',`${type} registry metadata did not refresh`);
 assert(registry.capabilities.includes('planning'),`${type} planning capability missing`);
}
const mobility=window.LuviaPlaceTypeContracts.get('mobility');
assert.strictEqual(mobility.contractVersion,'4.17.0','Move contract version was not upgraded');
assert.strictEqual(mobility.planning,false,'Move planning was reintroduced after full contract upgrade');
assert(!window.LuviaPlaceRegistry.getType('mobility').capabilities.includes('planning'),'Move registry still advertises planning');

const sw=fs.readFileSync('sw.js','utf8');
for(const token of ['place-type-contract.js','place-type-definitions.js','timeline-core.js','place-ui-actions.js','ignoreSearch:true','cached||response'])assert(sw.includes(token),`service-worker resilience token missing: ${token}`);
const actions=fs.readFileSync('core/places/place-ui-actions.js','utf8');
for(const token of ['await waitForSchema(type)','pendingDialogs.has(key)','validateValues','resolved?.tripPlaceId'])assert(actions.includes(token),`global planning action token missing: ${token}`);
const restaurants=fs.readFileSync('modules/restaurants-v2/restaurant-module.js','utf8');
assert(restaurants.includes("LuviaPlaceUIActions.openTimelineDialog({type:'restaurant'"),'restaurant still bypasses the global planning dialog');
console.log('Place contract bootstrap, planned Places and non-plannable Move: OK');
