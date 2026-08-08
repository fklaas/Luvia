import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders, resolveOrigin } from './_shared/cors.ts';
import { errorResponse, jsonResponse, requestId } from './_shared/http.ts';
import { enforceRateLimit } from './_shared/rate-limit.ts';
import { log } from './_shared/logger.ts';
import { placesAction, placesDiagnostics } from './_shared/places.ts';
import { restaurantAction, restaurantDiagnostics } from './_shared/restaurants.ts';
import { recommendationAction, recommendationDiagnostics } from './_shared/recommendations.ts';
import { scheduleAction } from './_shared/schedule.ts';
import { routesAction } from './_shared/routes.ts';
import { placeEntityAction } from './_shared/place-entities.ts';

type GatewayBody={action?:string;payload?:unknown;context?:Record<string,unknown>};
const ACTION_PATTERN=/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const PUBLIC_ACTIONS=new Set(['system.health','places.health','destination.resolve']);
const PLACES_ACTIONS=new Set(['destination.resolve','places.health','places.text-search','places.nearby-search','places.autocomplete','places.details','places.photo']);
const PLACE_ENTITY_ACTIONS=new Set(['place.health','place.list','place.import','place.lifecycle.update','place.accommodation.update','place.remove']);
const RESTAURANT_ACTIONS=new Set(['restaurant.health','restaurant.list','restaurant.history','restaurant.import','restaurant.lifecycle.update','restaurant.feedback','restaurant.remove','restaurant.clear']);
const SCHEDULE_ACTIONS=new Set(['schedule.list','schedule.upsert','schedule.delete']);
const ROUTES_ACTIONS=new Set(['routes.compute']);
const RECOMMENDATION_ACTIONS=new Set(['recommendation.health','recommendation.store','recommendation.event','recommendation.decision','recommendation.list','recommendation.events','recommendation.learning.reset']);

Deno.serve(async(req:Request)=>{
  const id=requestId(req);
  const rawOrigin=req.headers.get('origin');
  const origin=resolveOrigin(rawOrigin);
  const cors=corsHeaders(origin||'https://myluvia.app',id);
  // Preflight must always be answered before auth/content checks. This prevents
  // browsers from surfacing a CORS transport failure before Luvia can handle
  // the actual request. Only approved origins receive a successful preflight.
  if(req.method==='OPTIONS'){
    if(!origin)return new Response(null,{status:403,headers:cors});
    const requested=req.headers.get('access-control-request-headers');
    const headers=new Headers(cors);
    if(requested)headers.set('Access-Control-Allow-Headers',requested);
    return new Response(null,{status:204,headers});
  }
  if(!origin)return errorResponse(403,'ORIGIN_NOT_ALLOWED','Origin ist nicht freigeschaltet.',id,cors);
  if(req.method!=='POST')return errorResponse(405,'METHOD_NOT_ALLOWED','Nur POST ist erlaubt.',id,cors);
  const contentType=req.headers.get('content-type')||'';
  if(!contentType.includes('application/json'))return errorResponse(415,'UNSUPPORTED_MEDIA_TYPE','Content-Type application/json erforderlich.',id,cors);
  let body:GatewayBody;
  try{body=await req.json();}catch{return errorResponse(400,'INVALID_JSON','Ungültiger JSON-Body.',id,cors);}
  const action=String(body.action||'').trim().toLowerCase();
  if(!ACTION_PATTERN.test(action)||action.length>80)return errorResponse(400,'INVALID_ACTION','Ungültige Aktion.',id,cors);

  const forwarded=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const clientKey=forwarded||req.headers.get('cf-connecting-ip')||'unknown';
  const rate=enforceRateLimit(`${clientKey}:${action}`,action==='system.health'?60:PLACES_ACTIONS.has(action)?45:PLACE_ENTITY_ACTIONS.has(action)?40:RESTAURANT_ACTIONS.has(action)?30:SCHEDULE_ACTIONS.has(action)?60:ROUTES_ACTIONS.has(action)?40:RECOMMENDATION_ACTIONS.has(action)?60:30,60_000);
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
    if(error||!data.user){
      // Public diagnostics must remain reachable even when the browser still
      // carries an expired token. Protected actions continue to fail closed.
      if(!PUBLIC_ACTIONS.has(action))return errorResponse(401,'INVALID_SESSION','Sitzung ist ungültig oder abgelaufen.',id,cors);
      userClient=null;
    }else userId=data.user.id;
  }
  if(!PUBLIC_ACTIONS.has(action)&&!userId)return errorResponse(401,'AUTH_REQUIRED','Für diese Aktion ist eine Anmeldung erforderlich.',id,cors);

  const started=performance.now();
  try{
    let data:unknown;
    switch(action){
      case 'system.health':
        data={status:'ok',service:'luvia-gateway',version:'4.52.0',build:'13.52.0',core:'4.52.0',time:new Date().toISOString(),authenticated:Boolean(userId),places:placesDiagnostics(),restaurants:restaurantDiagnostics(),recommendations:recommendationDiagnostics()};
        break;
      default:
        if(PLACES_ACTIONS.has(action)){
          const places=await placesAction(action,body.payload||{});
          const durationMs=Math.round((performance.now()-started)*100)/100;
          log('info','gateway.places.success',{requestId:id,action,userId,durationMs,cacheHit:places.cache?.hit||false});
          return jsonResponse(200,{ok:true,data:places.data,meta:{requestId:id,action,durationMs,cache:places.cache}},cors);
        }
        if(PLACE_ENTITY_ACTIONS.has(action)){
          if(!userClient) return errorResponse(401,'AUTH_REQUIRED','Für diese Aktion ist eine Anmeldung erforderlich.',id,cors);
          const places=await placeEntityAction(action,body.payload||{},userClient);
          const durationMs=Math.round((performance.now()-started)*100)/100;
          return jsonResponse(200,{ok:true,data:places.data,meta:{requestId:id,action,durationMs}},cors);
        }
        if(RESTAURANT_ACTIONS.has(action)){
          if(!userClient) return errorResponse(401,'AUTH_REQUIRED','Für diese Aktion ist eine Anmeldung erforderlich.',id,cors);
          const restaurants=await restaurantAction(action,body.payload||{},userClient);
          const durationMs=Math.round((performance.now()-started)*100)/100;
          log('info','gateway.restaurant.success',{requestId:id,action,userId,durationMs,alreadyAdded:Boolean(restaurants.data?.alreadyAdded),created:restaurants.data?.created||null});
          return jsonResponse(200,{ok:true,data:restaurants.data,meta:{requestId:id,action,durationMs}},cors);
        }
        if(SCHEDULE_ACTIONS.has(action)){
          if(!userClient) return errorResponse(401,'AUTH_REQUIRED','Für diese Aktion ist eine Anmeldung erforderlich.',id,cors);
          const schedule=await scheduleAction(action,body.payload||{},userClient);
          const durationMs=Math.round((performance.now()-started)*100)/100;
          return jsonResponse(200,{ok:true,data:schedule.data,meta:{requestId:id,action,durationMs}},cors);
        }
        if(ROUTES_ACTIONS.has(action)){const routes=await routesAction(action,body.payload||{});const durationMs=Math.round((performance.now()-started)*100)/100;return jsonResponse(200,{ok:true,data:routes.data,meta:{requestId:id,action,durationMs}},cors);}
        if(RECOMMENDATION_ACTIONS.has(action)){
          if(!userClient) return errorResponse(401,'AUTH_REQUIRED','Für diese Aktion ist eine Anmeldung erforderlich.',id,cors);
          const recommendations=await recommendationAction(action,body.payload||{},userClient);
          const durationMs=Math.round((performance.now()-started)*100)/100;
          log('info','gateway.recommendation.success',{requestId:id,action,userId,durationMs});
          return jsonResponse(200,{ok:true,data:recommendations.data,meta:{requestId:id,action,durationMs}},cors);
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
