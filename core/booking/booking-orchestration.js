(function(){
'use strict';
const VERSION='0.8.0';
const ROUTE_ORDER=Object.freeze(['api','affiliate','external_link','email','manual']);
const ROUTE_SCORE=Object.freeze({api:500,affiliate:400,external_link:300,email:200,manual:0});
const USER_ACTION_CHANNELS=Object.freeze(['affiliate','external_link','manual']);
const ERROR_CLASSES=Object.freeze(['transient','permanent','user_action','unknown']);
const clean=v=>String(v??'').trim();
const bool=v=>v===true||String(v).toLowerCase()==='true';
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const urlOk=v=>{try{const u=new URL(clean(v));return u.protocol==='https:';}catch{return false;}};
const emailOk=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(v));
function normalizeCandidate(raw={}){
 const channel=ROUTE_ORDER.includes(clean(raw.channel).toLowerCase())?clean(raw.channel).toLowerCase():'manual';
 const sourceType=clean(raw.sourceType||raw.source_type||'candidate');
 const target=clean(raw.target||raw.value||raw.contactValue||raw.contact_value);
 const confidence=Math.max(0,Math.min(1,Number(raw.confidence??0)));
 const autoUsable=raw.autoUsable===undefined&&raw.auto_usable===undefined?true:bool(raw.autoUsable??raw.auto_usable);
 const active=raw.active===undefined?true:bool(raw.active);
 const structurallyValid=channel==='email'?emailOk(target):(channel==='manual'?true:urlOk(target));
 return Object.freeze({
  id:clean(raw.id)||null,channel,provider:clean(raw.provider)||null,target:target||null,
  sourceType,sourceId:clean(raw.sourceId||raw.source_id||raw.id)||null,
  confidence:Number.isFinite(confidence)?confidence:0,autoUsable,active,structurallyValid,
  requiresUserAction:USER_ACTION_CHANNELS.includes(channel),metadata:Object.freeze(obj(raw.metadata))
 });
}
function routeScore(candidate){
 const c=normalizeCandidate(candidate);
 if(!c.active||!c.autoUsable||!c.structurallyValid)return -1;
 return (ROUTE_SCORE[c.channel]??-1)+Math.round(c.confidence*10);
}
function plan(candidates=[],options={}){
 const excluded=new Set((options.excludedChannels||[]).map(x=>clean(x).toLowerCase()));
 const normalized=(Array.isArray(candidates)?candidates:[]).map(normalizeCandidate)
  .filter(c=>!excluded.has(c.channel))
  .map(c=>({route:c,score:routeScore(c)})).filter(x=>x.score>=0)
  .sort((a,b)=>b.score-a.score||ROUTE_ORDER.indexOf(a.route.channel)-ROUTE_ORDER.indexOf(b.route.channel));
 const selected=normalized[0]?.route||normalizeCandidate({channel:'manual',sourceType:'fallback',target:'manual',confidence:1});
 return Object.freeze({
  version:VERSION,selected,channel:selected.channel,provider:selected.provider,target:selected.target,
  requiresUserAction:selected.requiresUserAction,
  dispatchAllowed:!selected.requiresUserAction&&bool(options.userApproved),
  reason:normalized.length?'HIGHEST_PRIORITY_AVAILABLE_ROUTE':'NO_AUTOMATED_ROUTE_AVAILABLE',
  excludedChannels:Object.freeze([...excluded]),ranked:Object.freeze(normalized)
 });
}
function classifyFailure(error={}){
 const status=Number(error.status||error.statusCode||0);const code=clean(error.code).toUpperCase();
 if(error.userActionRequired===true)return 'user_action';
 if(status===408||status===425||status===429||status>=500)return 'transient';
 if(status>=400&&status<500)return 'permanent';
 if(['ETIMEDOUT','ECONNRESET','EAI_AGAIN','RATE_LIMITED','TEMPORARY_UNAVAILABLE'].includes(code))return 'transient';
 if(['INVALID_REQUEST','NOT_SUPPORTED','AUTH_INVALID','CONTACT_REJECTED'].includes(code))return 'permanent';
 return 'unknown';
}
function nextAfterFailure({attemptNo=1,maxRetries=2,error={}}={}){
 const errorClass=ERROR_CLASSES.includes(clean(error.errorClass||error.error_class).toLowerCase())?clean(error.errorClass||error.error_class).toLowerCase():classifyFailure(error);
 if(errorClass==='user_action')return Object.freeze({action:'wait_for_user',errorClass,retry:false,fallback:false});
 if(errorClass==='transient'&&Number(attemptNo)<=Number(maxRetries)){
  const delaySeconds=Math.min(3600,Math.max(30,60*Math.pow(2,Math.max(0,Number(attemptNo)-1))));
  return Object.freeze({action:'retry_same_route',errorClass,retry:true,fallback:false,delaySeconds});
 }
 return Object.freeze({action:'fallback_next_route',errorClass,retry:false,fallback:true});
}
async function execute(planResult,context={}){
 const p=planResult?.selected?planResult:plan(context.candidates||[],context);
 const route=p.selected;
 if(route.requiresUserAction){
  return Object.freeze({ok:true,kind:'user_action_required',channel:route.channel,provider:route.provider,target:route.target,requiresUserAction:true,merchantOfRecord:false});
 }
 if(!bool(context.userApproved)){
  return Object.freeze({ok:false,kind:'approval_required',channel:route.channel,provider:route.provider,target:route.target,requiresUserAction:true});
 }
 const registry=context.registry||window.LuviaBookingProviderRegistry;
 if(!registry||typeof registry.dispatch!=='function')throw new Error('Booking-Provider-Registry nicht verfügbar.');
 return registry.dispatch(context.booking,{...context,providerId:route.provider||context.providerId,route});
}
window.LuviaBookingOrchestration=Object.freeze({version:VERSION,ROUTE_ORDER,ROUTE_SCORE,USER_ACTION_CHANNELS,ERROR_CLASSES,normalizeCandidate,routeScore,plan,classifyFailure,nextAfterFailure,execute});
})();
