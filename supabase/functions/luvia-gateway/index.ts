import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders, resolveOrigin } from './_shared/cors.ts';
import { errorResponse, jsonResponse, requestId } from './_shared/http.ts';
import { enforceRateLimit } from './_shared/rate-limit.ts';
import { log } from './_shared/logger.ts';
import { placesAction, placesDiagnostics } from './_shared/places.ts';
import { restaurantAction, restaurantDiagnostics } from './_shared/restaurants.ts';

type GatewayBody={action?:string;payload?:unknown;context?:Record<string,unknown>};
const ACTION_PATTERN=/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const PUBLIC_ACTIONS=new Set(['system.health','places.health']);
const PLACES_ACTIONS=new Set(['destination.resolve','places.health','places.text-search','places.nearby-search','places.autocomplete','places.details','places.photo']);
const RESTAURANT_ACTIONS=new Set(['restaurant.health','restaurant.list','restaurant.import']);

Deno.serve(async(req:Request)=>{
  const id=requestId(req);
  const origin=resolveOrigin(req.headers.get('origin'));
  const cors=corsHeaders(origin,id);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(req.method!=='POST')return errorResponse(405,'METHOD_NOT_ALLOWED','Nur POST ist erlaubt.',id,cors);
  const contentType=req.headers.get('content-type')||'';
  if(!contentType.includes('application/json'))return errorResponse(415,'UNSUPPORTED_MEDIA_TYPE','Content-Type application/json erforderlich.',id,cors);
  let body:GatewayBody;
  try{body=await req.json();}catch{return errorResponse(400,'INVALID_JSON','Ungültiger JSON-Body.',id,cors);}
  const action=String(body.action||'').trim().toLowerCase();
  if(!ACTION_PATTERN.test(action)||action.length>80)return errorResponse(400,'INVALID_ACTION','Ungültige Aktion.',id,cors);

  const forwarded=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const clientKey=forwarded||req.headers.get('cf-connecting-ip')||'unknown';
  const rate=enforceRateLimit(`${clientKey}:${action}`,action==='system.health'?60:PLACES_ACTIONS.has(action)?45:RESTAURANT_ACTIONS.has(action)?30:30,60_000);
  if(!rate.allowed)return errorResponse(429,'RATE_LIMITED','Zu viele Anfragen.',id,{...cors,'Retry-After':String(rate.retryAfter)});

  const supabaseUrl=Deno.env.get('SUPABASE_URL')||'';
  const anonKey=Deno.env.get('SUPABASE_ANON_KEY')||'';
  const authorization=req.headers.get('authorization')||'';
  let userId:string|null=null;
  let userClient:any=null;
  if(authorization){
    const client=createClient(supabaseUrl,anonKey,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
    userClient=client;
    const {data,error}=await client.auth.getUser();
    if(error||!data.user)return errorResponse(401,'INVALID_SESSION','Sitzung ist ungültig oder abgelaufen.',id,cors);
    userId=data.user.id;
  }
  if(!PUBLIC_ACTIONS.has(action)&&!userId)return errorResponse(401,'AUTH_REQUIRED','Für diese Aktion ist eine Anmeldung erforderlich.',id,cors);

  const started=performance.now();
  try{
    let data:unknown;
    switch(action){
      case 'system.health':
        data={status:'ok',service:'luvia-gateway',version:'3.0.2.6',time:new Date().toISOString(),authenticated:Boolean(userId),places:placesDiagnostics(),restaurants:restaurantDiagnostics()};
        break;
      default:
        if(PLACES_ACTIONS.has(action)){
          const places=await placesAction(action,body.payload||{});
          const durationMs=Math.round((performance.now()-started)*100)/100;
          log('info','gateway.places.success',{requestId:id,action,userId,durationMs,cacheHit:places.cache?.hit||false});
          return jsonResponse(200,{ok:true,data:places.data,meta:{requestId:id,action,durationMs,cache:places.cache}},cors);
        }
        if(RESTAURANT_ACTIONS.has(action)){
          if(!userClient) return errorResponse(401,'AUTH_REQUIRED','Für diese Aktion ist eine Anmeldung erforderlich.',id,cors);
          const restaurants=await restaurantAction(action,body.payload||{},userClient);
          const durationMs=Math.round((performance.now()-started)*100)/100;
          log('info','gateway.restaurant.success',{requestId:id,action,userId,durationMs,alreadyAdded:Boolean(restaurants.data?.alreadyAdded),created:restaurants.data?.created||null});
          return jsonResponse(200,{ok:true,data:restaurants.data,meta:{requestId:id,action,durationMs}},cors);
        }
        return errorResponse(404,'ACTION_NOT_FOUND','Aktion ist nicht freigeschaltet.',id,cors);
    }
    const durationMs=Math.round((performance.now()-started)*100)/100;
    log('info','gateway.request.success',{requestId:id,action,userId,durationMs});
    return jsonResponse(200,{ok:true,data,meta:{requestId:id,action,durationMs}},cors);
  }catch(error){
    log('error','gateway.request.failed',{requestId:id,action,userId,error:error instanceof Error?error.message:String(error)});
    const e=error as {status?:number;code?:string;message?:string};
    return errorResponse(e.status||500,e.code||'INTERNAL_ERROR',e.message||'Die Anfrage konnte nicht verarbeitet werden.',id,cors);
  }
});
