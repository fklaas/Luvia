(function(){
'use strict';
const VERSION='4.9.1';
const TYPES=Object.freeze(['restaurant','accommodation','attraction','photo_spot','activity','shopping','nature','family','mobility','transit','custom']);
const LIFECYCLES=Object.freeze(['discovered','saved','favorite','planned','visited','rated','memory']);
const VISIT_STATES=Object.freeze(['nearby','arrived','stay_detected','visited','left']);
const SOURCES=Object.freeze(['local','google_places','supabase','restaurant_compatibility','user']);
const CAPABILITIES=Object.freeze(['recommendations','nearby','alternatives','timeline','visit_detection','notes','photos','favorites','ratings','memories','realtime','offline']);
const clean=v=>String(v??'').trim();
const uniq=a=>[...new Set((Array.isArray(a)?a:[]).map(clean).filter(Boolean))];
const finite=v=>Number.isFinite(Number(v))?Number(v):null;
function coordinates(value={}){const latitude=finite(value.latitude??value.lat),longitude=finite(value.longitude??value.lng);return latitude===null||longitude===null?null:Object.freeze({latitude,longitude,accuracyMeters:finite(value.accuracyMeters??value.accuracy)});}
function lifecycle(value='discovered'){const key=clean(value).toLowerCase();return LIFECYCLES.includes(key)?key:'discovered';}
function stableId(raw={}){return clean(raw.id||raw.placeId||raw.tripPlaceId||raw.providerPlaceId||raw.sourceId)||`place-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;}
function normalize(raw={},defaults={}){const primaryType=clean(raw.primaryType||defaults.primaryType||'custom').toLowerCase();if(!TYPES.includes(primaryType))throw new Error(`Nicht unterstützter Place-Typ: ${primaryType}`);const roles=uniq([...(raw.roles||[]),...(raw.types||[]),...(defaults.roles||[])]).filter(x=>TYPES.includes(x)&&x!==primaryType);const source=clean(raw.source||defaults.source||'local').toLowerCase();const now=new Date().toISOString();return Object.freeze({id:stableId(raw),tripId:clean(raw.tripId||defaults.tripId)||null,primaryType,roles:Object.freeze(roles),name:clean(raw.name)||'Unbenannter Ort',description:clean(raw.description||raw.editorialSummary),coordinates:coordinates(raw.coordinates||raw.location||{latitude:raw.latitude,longitude:raw.longitude}),address:clean(raw.address||raw.formattedAddress),source:SOURCES.includes(source)?source:'local',sourceId:clean(raw.sourceId||raw.providerPlaceId||raw.googlePlaceId)||null,lifecycle:lifecycle(raw.lifecycle||raw.lifecycleStatus||defaults.lifecycle),capabilities:Object.freeze(uniq(raw.capabilities||defaults.capabilities).filter(x=>CAPABILITIES.includes(x))),metadata:Object.freeze({...defaults.metadata,...(raw.metadata||{}),matchScore:raw.matchScore??raw.metadata?.matchScore??null}),createdAt:raw.createdAt||now,updatedAt:raw.updatedAt||now});}
function validate(place){const errors=[];if(!place?.id)errors.push('id');if(!TYPES.includes(place?.primaryType))errors.push('primaryType');if(!place?.name)errors.push('name');if(!LIFECYCLES.includes(place?.lifecycle))errors.push('lifecycle');return{valid:errors.length===0,errors};}
window.LuviaPlaceDomain=Object.freeze({version:VERSION,TYPES,LIFECYCLES,VISIT_STATES,SOURCES,CAPABILITIES,normalize,validate,coordinates,lifecycle});
})();
