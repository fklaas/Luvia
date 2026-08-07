(function(){
'use strict';
const VERSION='0.5.0';
const KINDS=Object.freeze(['official_api','booking_provider','reservation_link','public_reservation_email','public_contact_email','manual']);
const CHANNEL_BY_KIND=Object.freeze({official_api:'api',booking_provider:'external_link',reservation_link:'external_link',public_reservation_email:'email',public_contact_email:'email',manual:'manual'});
const PRIORITY=Object.freeze({official_api:100,booking_provider:90,reservation_link:85,public_reservation_email:80,public_contact_email:60,manual:0});
const clean=v=>String(v??'').trim();
const bool=v=>v===true||String(v).toLowerCase()==='true';
const emailOk=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(v));
const urlOk=v=>{try{const u=new URL(clean(v));return /^https?:$/.test(u.protocol);}catch{return false;}};
function normalizeCandidate(raw={}){
 const kind=KINDS.includes(clean(raw.kind).toLowerCase())?clean(raw.kind).toLowerCase():'manual';
 const value=clean(raw.value||raw.contactValue||raw.contact_value);
 const sourceUrl=clean(raw.sourceUrl||raw.source_url);
 const isOfficial=bool(raw.isOfficial??raw.is_official);
 const isPublic=bool(raw.isPublic??raw.is_public);
 const verified=clean(raw.verificationStatus||raw.verification_status||'unverified').toLowerCase()==='verified';
 const confidence=Math.max(0,Math.min(1,Number(raw.confidence??0)));
 const structurallyValid=kind.includes('email')?emailOk(value):(kind==='official_api'||kind==='booking_provider'||kind==='reservation_link'?urlOk(value):true);
 const evidenceOk=Boolean(sourceUrl&&urlOk(sourceUrl));
 const autoUsable=kind==='manual'?false:Boolean(structurallyValid&&evidenceOk&&verified&&isPublic&&(isOfficial||kind==='booking_provider'));
 return Object.freeze({kind,channel:CHANNEL_BY_KIND[kind],value,provider:clean(raw.provider)||null,sourceUrl:sourceUrl||null,isOfficial,isPublic,verificationStatus:verified?'verified':'unverified',confidence:Number.isFinite(confidence)?confidence:0,structurallyValid,evidenceOk,autoUsable,metadata:Object.freeze({...raw.metadata})});
}
function scoreCandidate(raw={}){
 const c=normalizeCandidate(raw); if(!c.autoUsable)return -1;
 return PRIORITY[c.kind]+Math.round(c.confidence*10)+(c.isOfficial?3:0);
}
function resolve(candidates=[]){
 const normalized=(Array.isArray(candidates)?candidates:[]).map(normalizeCandidate);
 const ranked=normalized.map(c=>({candidate:c,score:scoreCandidate(c)})).filter(x=>x.score>=0).sort((a,b)=>b.score-a.score);
 if(!ranked.length)return Object.freeze({resolved:false,channel:'manual',provider:null,value:null,kind:'manual',reason:'NO_VERIFIED_PUBLIC_BOOKING_CHANNEL',candidate:null,ranked:[]});
 const top=ranked[0].candidate;
 return Object.freeze({resolved:true,channel:top.channel,provider:top.provider,value:top.value,kind:top.kind,reason:'HIGHEST_PRIORITY_VERIFIED_PUBLIC_CHANNEL',candidate:top,ranked:Object.freeze(ranked)});
}
window.LuviaBookingDiscovery=Object.freeze({version:VERSION,KINDS,CHANNEL_BY_KIND,PRIORITY,normalizeCandidate,scoreCandidate,resolve});
})();
