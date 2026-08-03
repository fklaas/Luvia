const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const build='13.12.0';
const core='4.12.0';
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');

const required=[
  `modules/cycling-routes/cycling-route-module.css?v=${build}`,
  `intelligence/cycling-route-service.js?v=${build}`,
  `core/places/cycling-route-intelligence-service.js?v=${build}`,
  `modules/cycling-routes/cycling-route-module.js?v=${build}`,
  `bootstrap-${core}`
];
for(const token of required)assert(index.includes(token),`Browser bootstrap asset missing: ${token}`);
assert(!index.includes('?v=13.10.0'),'Stale 13.10.0 asset query remains in index.html');
const ordered=[
  'core/places/place-domain.js',
  'core/places/place-type-contract.js',
  'core/places/place-type-definitions.js',
  'core/places/place-registry.js',
  'core/places/place-adapters.js',
  'core/places/cycling-route-intelligence-service.js',
  'modules/cycling-routes/cycling-route-module.js',
  'modules/places-shell.js'
];
let cursor=-1;
for(const asset of ordered){const next=index.indexOf(asset);assert(next>cursor,`Invalid browser load order for ${asset}`);cursor=next;}

const listeners=new Map();
const window={
  addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn);},
  dispatchEvent(event){for(const fn of listeners.get(event.type)||[])fn.call(window,event);return true;},
  LuviaPlaceEntities:{list:async()=>({data:{entities:[]}}),searchPlaces:async()=>({data:{places:[]}}),importPlace:async()=>({data:{}})},
  LuviaCyclingRoutes:{search:async()=>({data:{places:[]}})}
};
class CustomEvent{constructor(type,options={}){this.type=type;this.detail=options.detail;}}
const document={currentScript:{src:'https://example.test/core/places/place-type-definitions.js'},baseURI:'https://example.test/',createElement(){return{dataset:{},addEventListener(){},set src(value){this._src=value},get src(){return this._src}}},head:{appendChild(){}}};
const context=vm.createContext({window,document,CustomEvent,URL,console,setTimeout,clearTimeout,Date,Map,Set,Object,Array,JSON,Math,Number,String,Boolean,Promise});
for(const file of [
  'core/places/place-domain.js',
  'core/places/place-type-contract.js',
  'core/places/place-type-definitions.js',
  'core/places/place-registry.js',
  'core/places/place-adapters.js'
])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});

assert(window.LuviaPlaceRegistry.isSupported('cycling_route'),'cycling_route type is not supported by the runtime registry');
assert(window.LuviaPlaceRegistry.getAdapter('cycling_route'),'cycling_route adapter was not registered');
const status=window.LuviaPlaceRegistry.status('cycling_route');
assert.strictEqual(status.state,'ready',`Expected ready cycling adapter, received ${JSON.stringify(status)}`);
assert.strictEqual(status.ready,true,'Cycling adapter must report ready=true');
const diagnostics=window.LuviaPlaceRegistry.diagnostics();
assert(diagnostics.adapters.some(item=>item.key==='cycling_route'&&item.state==='ready'),'Registry diagnostics do not expose a ready cycling_route adapter');

const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
assert(sw.includes(`luvia-shell-v${build}`),'Patch cache name missing');
assert(sw.includes('activeCache.match(request,{ignoreSearch:true})'),'Static fallback must use only the active release cache');
assert(!sw.includes('const cached=await caches.match(request,{ignoreSearch:true})'),'Global cross-release cache fallback remains active');
console.log('Cycling registry bootstrap and asset loading: OK');
