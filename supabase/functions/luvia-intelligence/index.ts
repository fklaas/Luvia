import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders, resolveOrigin } from './_shared/cors.ts';
import { errorResponse, jsonResponse, requestId } from './_shared/http.ts';
import { enforceRateLimit } from './_shared/rate-limit.ts';
import { capability, listCapabilities } from './capabilities/registry.ts';
import { sanitize, byteLength, safetyIdentifier } from './policies/privacy.ts';
import { modelDiagnostics, runOpenAI } from './providers/openai.ts';
import { recordUsage } from './telemetry/usage.ts';

type Body={action?:string;payload?:any;client?:Record<string,unknown>};
const PUBLIC=new Set(['health','brain.health']);
const ACTION=/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
Deno.serve(async(req:Request)=>{
  const id=requestId(req),origin=resolveOrigin(req.headers.get('origin')),cors=corsHeaders(origin,id);
  if(!origin)return errorResponse(403,'ORIGIN_NOT_ALLOWED','Origin ist nicht freigeschaltet.',id,cors);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(req.method!=='POST')return errorResponse(405,'METHOD_NOT_ALLOWED','Nur POST ist erlaubt.',id,cors);
  if(!(req.headers.get('content-type')||'').includes('application/json'))return errorResponse(415,'UNSUPPORTED_MEDIA_TYPE','Content-Type application/json erforderlich.',id,cors);
  let body:Body;try{body=await req.json()}catch{return errorResponse(400,'INVALID_JSON','Ungültiger JSON-Body.',id,cors)}
  if(byteLength(body)>180_000)return errorResponse(413,'PAYLOAD_TOO_LARGE','Der KI-Kontext ist zu groß.',id,cors);
  const action=String(body.action||'').trim().toLowerCase();if(!ACTION.test(action)||action.length>80)return errorResponse(400,'INVALID_ACTION','Ungültige Aktion.',id,cors);
  const clientKey=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||req.headers.get('cf-connecting-ip')||'unknown';
  const url=Deno.env.get('SUPABASE_URL')||'',anon=Deno.env.get('SUPABASE_ANON_KEY')||'',authorization=req.headers.get('authorization')||'';let userId:string|null=null;
  if(authorization){const client=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});const {data,error}=await client.auth.getUser();if(!error&&data.user)userId=data.user.id;else if(!PUBLIC.has(action))return errorResponse(401,'INVALID_SESSION','Sitzung ist ungültig oder abgelaufen.',id,cors)}
  if(!PUBLIC.has(action)&&!userId)return errorResponse(401,'AUTH_REQUIRED','Für diese Aktion ist eine Anmeldung erforderlich.',id,cors);
  const capabilityKey=action==='brain.run'?String(body.payload?.capability||'brain.run'):action;const limit=PUBLIC.has(action)?60:80;const rate=enforceRateLimit(`${userId||clientKey}:${capabilityKey}`,limit,60_000);if(!rate.allowed)return errorResponse(429,'RATE_LIMITED','Zu viele KI-Anfragen.',id,{...cors,'Retry-After':String(rate.retryAfter)});
  if(PUBLIC.has(action))return jsonResponse(200,{ok:true,data:{service:'luvia-intelligence',status:'ok',version:'4.35.0',build:'13.35.0',core:'4.35.0',authenticated:Boolean(userId),...modelDiagnostics(),capabilities:listCapabilities(),privacy:{store:false,promptsLogged:false,minimumNecessaryContext:true}},meta:{requestId:id}},cors);
  if(action==='destination.normalize'){const name=String(body.payload?.name||'').trim();return jsonResponse(200,{ok:true,data:{name,isUsable:Boolean(name),isResolved:false,source:'server_normalized'},meta:{requestId:id}},cors)}
  if(!['brain.run','brain.orchestrate'].includes(action))return errorResponse(404,'ACTION_NOT_FOUND','Aktion ist nicht freigeschaltet.',id,cors);
  const capabilityId=action==='brain.orchestrate'?'brain.orchestrate':String(body.payload?.capability||'');const definition=capability(capabilityId);if(!definition)return errorResponse(400,'CAPABILITY_NOT_FOUND','Unbekannte Luvia-AI-Capability.',id,cors);
  const requestedTier=String(body.payload?.tier||definition.tier);const tier=(['fast','default','deep'].includes(requestedTier)?requestedTier:definition.tier) as 'fast'|'default'|'deep';const input=sanitize(body.payload?.input||{}),context=sanitize(body.payload?.context||{});const started=performance.now();
  try{
    const result=await runOpenAI({capability:definition,tier,input,context,safetyId:await safetyIdentifier(userId!)});
    await recordUsage({user_id:userId,capability:capabilityId,provider:result.provider,model:result.model,tier:result.tier,request_id:result.requestId,input_tokens:result.usage.inputTokens,output_tokens:result.usage.outputTokens,total_tokens:result.usage.totalTokens,cached_tokens:result.usage.cachedTokens,latency_ms:result.latencyMs,success:true,error_code:null});
    return jsonResponse(200,{ok:true,data:{result:result.result},meta:{requestId:id,capability:capabilityId,provider:result.provider,model:result.model,tier:result.tier,usage:result.usage,latencyMs:result.latencyMs,store:false}},cors);
  }catch(error){const e=error as any;await recordUsage({user_id:userId,capability:capabilityId,provider:'openai',model:'unresolved',tier,input_tokens:0,output_tokens:0,total_tokens:0,cached_tokens:0,latency_ms:Math.round(performance.now()-started),success:false,error_code:e.code||'AI_FAILED'});return errorResponse(e.status||500,e.code||'AI_FAILED',e.message||'Luvia Intelligence konnte die Aufgabe nicht verarbeiten.',id,cors)}
});
