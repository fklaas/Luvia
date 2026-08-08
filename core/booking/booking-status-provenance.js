(function(){
'use strict';
const VERSION='2.0.0';
const STATUSES=Object.freeze(['draft','ready','forwarded','requested','awaiting_reply','alternative_proposed','needs_action','confirmed','declined','cancelled','failed']);
const SOURCES=Object.freeze(['system','handoff','provider_webhook','provider_api','provider_polling','affiliate_callback','email_reply','user_confirmation']);
const TERMINAL=Object.freeze(['confirmed','declined','cancelled']);
const LABELS=Object.freeze({draft:'Entwurf',ready:'Bereit',forwarded:'Weitergeleitet',requested:'Angefragt',awaiting_reply:'Antwort ausstehend',alternative_proposed:'Alternative vorgeschlagen',needs_action:'Aktion nötig',confirmed:'Bestätigt',declined:'Abgelehnt',cancelled:'Storniert',failed:'Fehlgeschlagen'});
const clean=v=>String(v??'').trim().toLowerCase();
function status(v){const s=clean(v);return STATUSES.includes(s)?s:null;}
function source(v){const s=clean(v);return SOURCES.includes(s)?s:null;}
function canAutoApply({capability,status:next,source:src}={}){const s=status(next),origin=source(src);if(!s||!origin)return false;if(origin==='handoff')return s==='forwarded';if(['provider_webhook','provider_api','provider_polling'].includes(origin))return Boolean(window.LuviaBookingProviderCapabilities?.canAutoStatus?.(capability));if(origin==='email_reply')return ['requested','awaiting_reply','alternative_proposed','needs_action','confirmed','declined','cancelled'].includes(s);if(origin==='user_confirmation')return true;return false;}
function describe(row={}){return Object.freeze({status:status(row.status)||'draft',label:LABELS[status(row.status)||'draft']||'Unbekannt',source:source(row.statusSource||row.status_source)||null,sourceRef:row.statusSourceRef||row.status_source_ref||null,verifiedAt:row.statusVerifiedAt||row.status_verified_at||null});}
window.LuviaBookingStatusProvenance=Object.freeze({version:VERSION,STATUSES,SOURCES,TERMINAL,LABELS,status,source,canAutoApply,describe});
})();
