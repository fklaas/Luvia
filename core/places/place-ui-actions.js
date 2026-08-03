(function(){
'use strict';
const VERSION='4.15.0';
const labels=Object.freeze({favorite:'Favorit',unfavorite:'Favorit',plan:'Zur Timeline',planned:'In Timeline',changeDate:'Zeitpunkt ändern',removePlanning:'Planung löschen',open:'Details öffnen',route:'Navigation',call:'Anrufen',website:'Website öffnen',reserve:'Reservieren'});
const esc=v=>window.LuviaPlaceExperience?.esc?.(v)||String(v??'');
const pendingDialogs=new Map();
function actionButtons({favorite=false,planned=false,favoriteAttr='data-place-favorite-action',planAttr='data-place-plan-action'}={}){return `<button type="button" class="luv-place-primary-action ${favorite?'is-active':''}" ${favoriteAttr} aria-pressed="${favorite?'true':'false'}">${favorite?'♥':'♡'} ${labels.favorite}</button><button type="button" class="luv-place-primary-action ${planned?'is-active':''}" ${planAttr}>${planned?'✓':'＋'} ${planned?labels.planned:labels.plan}</button>`}
function schema(type){const c=window.LuviaPlaceTypeContracts?.get?.(type);return (c?.fields||[]).filter(f=>['start','end','point'].includes(f.timelineRole))}
async function waitForSchema(type,timeout=4000){
 let fields=schema(type);if(fields.length)return fields;
 await new Promise(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;clearTimeout(timer);window.removeEventListener('luvia:place-definitions-ready',check);window.removeEventListener('luvia:place-contract-registered',check);resolve()};const check=event=>{if(!event?.detail?.type||event.detail.type===type||event.type==='luvia:place-definitions-ready'){fields=schema(type);if(fields.length)finish()}};const timer=setTimeout(finish,timeout);window.addEventListener('luvia:place-definitions-ready',check);window.addEventListener('luvia:place-contract-registered',check)});
 fields=schema(type);if(!fields.length)throw new Error(`Das Timeline-Schema für ${type} konnte nicht geladen werden. Bitte Luvia einmal vollständig neu öffnen.`);return fields;
}
function dialogTitle(type){return type==='accommodation'?'Aufenthalt einplanen':'Wann möchtet ihr hier sein?'}
async function openTimelineDialogInternal({type,tripId,place,entity,tripPlace,importEntity,onSaved,validateValues,successMessage}={}){
 const fields=await waitForSchema(type);
 const current=tripPlace?.id?window.LuviaTripPlaceData?.recordForTripPlace?.(tripPlace.id)?.fields||{}:{};
 const editor=window.LuviaTimelineCore?.openPlanningEditor;if(typeof editor!=='function')throw new Error('Der globale Place-Planungsdialog ist nicht verfügbar.');
 return editor({eyebrow:'Tagesablauf',title:dialogTitle(type),description:type==='accommodation'?'Check-in und Check-out werden direkt in eure Reise-Timeline übernommen.':'Datum und Uhrzeit werden direkt in euren Tagesplan übernommen.',definitions:fields,fields:current,submitLabel:'In den Tagesplan',save:async values=>{await validateValues?.(values,{type,tripId,place,entity,tripPlace,fields});let resolved=entity;if(!tripPlace?.id&&importEntity)resolved=await importEntity(values);const unwrapped=resolved?.data?.entity||resolved?.data?.tripPlaceEntity||resolved?.data||resolved||{};const linkedId=unwrapped?.tripPlaceId||resolved?.tripPlaceId||null;const linkedPlaceId=unwrapped?.placeId||resolved?.placeId||null;const link=unwrapped?.tripPlace||unwrapped?.trip_place||resolved?.tripPlace||resolved?.trip_place||tripPlace||(linkedId?{id:linkedId,place_id:linkedPlaceId}:{});const p=unwrapped?.place||resolved?.place||place||{};if(!link.id)throw new Error('Place konnte nicht mit dieser Reise verknüpft werden.');const payload={...values,place_name:p.name||resolved?.name||place?.name||'Place'};for(const field of fields)if(field.timelineRole==='start'&&!payload[field.key])throw new Error(`${field.label} ist erforderlich.`);await window.LuviaPlaceCollections.saveDateFields({tripId,placeType:type,tripPlaceId:link.id,placeId:link.place_id||link.placeId||linkedPlaceId||p.id||place?.id||null,fields:payload});await window.LuviaPlaceEntities?.updateLifecycle?.(link.id,'planned',{}, {tripId});await window.LuviaTimelineCore?.hydrate?.(tripId);window.dispatchEvent(new CustomEvent('luvia:place-plan-changed',{detail:{tripId,type,tripPlaceId:link.id,fields:payload}}));window.dispatchEvent(new CustomEvent('luvia:timeline-invalidated',{detail:{tripId,type,tripPlaceId:link.id}}));await onSaved?.(resolved||entity);window.LuviaUIKit?.toast?.(successMessage||'Zur Timeline hinzugefügt.',{type:'success'})}})
}
async function openTimelineDialog(options={}){
 const key=[options.type||'place',options.tripId||'',options.tripPlace?.id||options.place?.id||options.place?.providerPlaceId||options.place?.provider_place_id||'new'].join(':');
 if(pendingDialogs.has(key))return pendingDialogs.get(key);
 const task=openTimelineDialogInternal(options).catch(error=>{console.error('[Luvia Places] Planungsdialog konnte nicht geöffnet werden.',error);window.LuviaUIKit?.toast?.(error.message||'Der Planungsdialog konnte nicht geöffnet werden.',{type:'error'});return null}).finally(()=>pendingDialogs.delete(key));
 pendingDialogs.set(key,task);return task;
}
window.LuviaPlaceUIActions=Object.freeze({version:VERSION,labels,actionButtons,openTimelineDialog,schema,waitForSchema,diagnostics:()=>({version:VERSION,status:'ready',actions:Object.keys(labels),timelineDialog:'contract-driven-global-form',detailActions:'canonical-trip-accent'})});
})();