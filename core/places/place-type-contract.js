(function(){
'use strict';
const VERSION='4.6.4';
const contracts=new Map();
const CANONICAL_LIFECYCLE=['discovered','favorite','planned','selected','reserved','booked','checked_in','checked_out','visited','rated','rejected','archived'];
const FIELD_TYPES=['text','textarea','number','boolean','date','time','datetime','select','multiselect','currency','url'];
const TIMELINE_ROLES=['start','end','point','none'];
const CAPABILITIES=['favorite','planning','reservation','booking','stay','gpsVisit','alternatives','recommendations','timeline','today','dashboard','travelBook','realtime','photos','ratings','notes'];
const required=['type','moduleKey','identity','discovery','lifecycle','fields','capabilities','presentation','ui'];
const clone=v=>JSON.parse(JSON.stringify(v));
function validate(input){
 const errors=[],warnings=[]; const c=input||{};
 required.forEach(k=>{if(c[k]===undefined||c[k]===null)errors.push(`Pflichtfeld fehlt: ${k}`)});
 if(!c.identity?.label)errors.push('identity.label fehlt');
 if(!c.identity?.pluralLabel)errors.push('identity.pluralLabel fehlt');
 if(!c.identity?.icon)errors.push('identity.icon fehlt');
 if(!c.discovery?.title)errors.push('discovery.title fehlt');
 if(!c.discovery?.searchPlaceholder)errors.push('discovery.searchPlaceholder fehlt');
 const life=Array.isArray(c.lifecycle)?c.lifecycle:[];
 life.forEach(x=>{if(!CANONICAL_LIFECYCLE.includes(x))errors.push(`Nicht-kanonischer Lifecycle: ${x}`)});
 const keys=new Set();
 (Array.isArray(c.fields)?c.fields:[]).forEach((f,i)=>{
   if(!f?.key)errors.push(`fields[${i}].key fehlt`); else if(keys.has(f.key))errors.push(`Doppeltes Feld: ${f.key}`); else keys.add(f.key);
   if(!FIELD_TYPES.includes(f?.type))errors.push(`Ungültiger Feldtyp ${f?.type} bei ${f?.key||i}`);
   if(f.timelineRole&&!TIMELINE_ROLES.includes(f.timelineRole))errors.push(`Ungültige timelineRole bei ${f.key}`);
 });
 Object.entries(c.capabilities||{}).forEach(([k,v])=>{if(!CAPABILITIES.includes(k))warnings.push(`Unbekannte Capability: ${k}`);if(typeof v!=='boolean')errors.push(`Capability ${k} muss boolean sein`)});
 if(c.capabilities?.planning && !(c.fields||[]).some(f=>['start','end','point'].includes(f.timelineRole)))warnings.push('Planning ist aktiv, aber kein Timeline-Feld definiert.');
 if(!Array.isArray(c.ui?.card?.factSlots)||!c.ui.card.factSlots.length)errors.push('ui.card.factSlots fehlt');
 if(!Array.isArray(c.ui?.detail?.sectionOrder)||!c.ui.detail.sectionOrder.length)errors.push('ui.detail.sectionOrder fehlt');
 if(!c.ui?.detail?.requiredSections?.includes('alternatives'))errors.push('ui.detail.requiredSections muss alternatives enthalten');
 if(c.capabilities?.stay && !((c.fields||[]).some(f=>f.key==='check_in_at')&&(c.fields||[]).some(f=>f.key==='check_out_at')))errors.push('Stay benötigt check_in_at und check_out_at.');
 return{valid:errors.length===0,errors,warnings};
}
function register(contract){
 const normalized={contractVersion:VERSION,...clone(contract)}; const result=validate(normalized);
 if(!result.valid)throw new Error(`Ungültiger Place Type Contract ${contract?.type||'unknown'}: ${result.errors.join('; ')}`);
 contracts.set(normalized.type,Object.freeze(normalized));
 window.dispatchEvent(new CustomEvent('luvia:place-contract-registered',{detail:{type:normalized.type}}));
 return normalized;
}
function get(type){return contracts.get(type)||null}
function all(){return[...contracts.values()]}
function field(type,key){return get(type)?.fields?.find(f=>f.key===key)||null}
function dateFields(type){return(get(type)?.fields||[]).filter(f=>['date','time','datetime'].includes(f.type))}
function timelineFields(type){return(get(type)?.fields||[]).filter(f=>['start','end','point'].includes(f.timelineRole))}
function capability(type,key){return Boolean(get(type)?.capabilities?.[key])}
function diagnostics(){return{version:VERSION,status:'ready',registered:contracts.size,types:all().map(c=>({type:c.type,moduleKey:c.moduleKey,valid:validate(c).valid,fields:c.fields.length,lifecycle:c.lifecycle,capabilities:c.capabilities})),canonicalLifecycle:[...CANONICAL_LIFECYCLE]}}
window.LuviaPlaceTypeContracts=Object.freeze({version:VERSION,register,get,all,validate,field,dateFields,timelineFields,capability,diagnostics,CANONICAL_LIFECYCLE:[...CANONICAL_LIFECYCLE]});
})();
