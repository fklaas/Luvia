(function(){
'use strict';
const VERSION='4.11.1';
const types=new Map(),adapters=new Map(),errors=[];
const D=()=>window.LuviaPlaceDomain;
const base=['recommendations','nearby','alternatives','timeline','visit_detection','notes','photos','favorites','ratings','memories','realtime','offline'];
const labels={restaurant:'Restaurants',accommodation:'Unterkünfte',attraction:'Sehenswürdigkeiten',photo_spot:'Fotospots',activity:'Aktivitäten',shopping:'Shopping',nature:'Natur',cycling_route:'Fahrradrouten',family:'Familienorte',mobility:'Mobilität',transit:'Verkehr',custom:'Eigene Orte'};
function registerType(key,definition={}){if(!D().TYPES.includes(key))throw new Error('Unbekannter Place-Typ: '+key);const contract=window.LuviaPlaceTypeContracts?.get?.(key);types.set(key,Object.freeze({key,label:contract?.identity?.pluralLabel||labels[key],capabilities:contract?Object.keys(contract.capabilities).filter(k=>contract.capabilities[k]):[...new Set(definition.capabilities||base)],lifecycle:contract?.lifecycle||[...new Set(definition.lifecycle||D().LIFECYCLES)],contractVersion:contract?.contractVersion||null,version:definition.version||VERSION}));return types.get(key);}
function registerAdapter(key,adapter){if(!types.has(key))throw new Error('Place-Typ nicht registriert: '+key);if(!adapter||typeof adapter.normalize!=='function'||typeof adapter.status!=='function')throw new Error('Ungültiger Place Adapter: '+key);adapters.set(key,adapter);return adapter;}
function adapter(key){return adapters.get(key)||null;}
function status(key){const a=adapter(key);if(!a)return{state:'unsupported',reason:'Kein Adapter registriert.'};try{return a.status();}catch(error){errors.push({key,message:error.message,at:new Date().toISOString()});return{state:'failed',reason:error.message};}}
function diagnostics(){return{version:VERSION,registeredTypes:types.size,registeredAdapters:adapters.size,types:[...types.values()],adapters:[...adapters.entries()].map(([key,a])=>({key,version:a.version||'unknown',...status(key)})),errors:[...errors]};}
D().TYPES.forEach(key=>registerType(key));
window.addEventListener('luvia:place-contract-registered',event=>{const type=event.detail?.type;if(type&&D().TYPES.includes(type))registerType(type)});
window.LuviaPlaceRegistry=Object.freeze({version:VERSION,registerType,registerAdapter,getType:key=>types.get(key)||null,getTypes:()=>[...types.values()],isSupported:key=>types.has(key),getAdapter:adapter,getCapabilities:key=>types.get(key)?.capabilities||[],status,diagnostics});
})();
