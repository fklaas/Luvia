(function(){
  'use strict';
  const VERSION='3.0.2.9-auth-refresh-retry';
  const DEFAULT_FUNCTION='luvia-gateway';
  const DEFAULT_TIMEOUT=12000;
  const ACTION_PATTERN=/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
  const SENSITIVE_KEYS=/authorization|token|secret|password|apikey|api_key|cookie|session/i;
  const listeners=new Set();
  const state={initialized:false,requests:0,successes:0,failures:0,timeouts:0,lastRequestAt:null,lastSuccessAt:null,lastError:null,lastStatus:null,lastRequestId:null,recent:[]};
  const now=()=>new Date().toISOString();
  const uuid=()=>globalThis.crypto?.randomUUID?.()||`req_${Date.now()}_${Math.random().toString(36).slice(2,10)}`;
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  function config(){
    const source=window.LUVIA_AUTH_CONFIG||window.LUVIA_CONFIG||{};
    const supabaseUrl=String(source.supabaseUrl||source.url||'').replace(/\/$/,'');
    const runtime=window.LuviaPlatform?.get?.('backend',{})||window.LUVIA_RUNTIME_CONFIG?.backend||{};
    return Object.freeze({
      supabaseUrl,
      functionsBase:supabaseUrl?`${supabaseUrl}/functions/v1`:'',
      functionName:String(runtime.functionName||DEFAULT_FUNCTION),
      timeoutMs:clamp(Number(runtime.timeoutMs)||DEFAULT_TIMEOUT,1000,30000),
      configured:Boolean(supabaseUrl),
      secureContext:window.isSecureContext===true,
      publishableKey:String(source.publishableKey||source.supabaseKey||window.ParisSupabaseConfig?.publishableKey||''),
      clientBuild:window.LuviaCoreVersion?.build||'unknown'
    });
  }
  function sanitize(value,depth=0){
    if(depth>5)return '[max-depth]';
    if(Array.isArray(value))return value.slice(0,50).map(v=>sanitize(v,depth+1));
    if(value&&typeof value==='object'){
      const out={};
      Object.entries(value).slice(0,100).forEach(([key,item])=>{out[key]=SENSITIVE_KEYS.test(key)?'[redacted]':sanitize(item,depth+1);});
      return out;
    }
    if(typeof value==='string'&&value.length>1000)return value.slice(0,1000)+'…';
    return value;
  }
  function emit(type,detail){
    const event={type,at:now(),detail:sanitize(detail)};
    listeners.forEach(fn=>{try{fn(event);}catch{}});
    window.LuviaKernelEvents?.emit?.(`backend.${type}`,event.detail);
    return event;
  }
  function remember(entry){state.recent.unshift(sanitize(entry));state.recent=state.recent.slice(0,20);}
  function authClient(){
    return window.ParisSupabaseClient||window.ParisCloud?.client||window.LuviaDatabaseFoundation?.client?.()||null;
  }
  async function accessToken({refresh=false}={}){
    try{
      const client=authClient();
      if(refresh&&client?.auth?.refreshSession){
        const refreshed=await client.auth.refreshSession();
        const token=refreshed?.data?.session?.access_token;
        if(token)return token;
      }
      const result=await client?.auth?.getSession?.();
      const sessionToken=result?.data?.session?.access_token;
      if(sessionToken)return sessionToken;
      const authState=window.ParisAuth?.getState?.();
      return authState?.session?.access_token||'';
    }catch{return '';}
  }
  function validateAction(action){
    const normalized=String(action||'').trim().toLowerCase();
    if(!ACTION_PATTERN.test(normalized)||normalized.length>80){const error=new Error('Ungültige Backend-Aktion.');error.code='INVALID_ACTION';throw error;}
    return normalized;
  }
  function normalizeError(error,fallback='BACKEND_REQUEST_FAILED'){
    const normalized=new Error(error?.message||'Backend-Anfrage fehlgeschlagen.');
    normalized.name=error?.name||'LuviaBackendError';
    normalized.code=error?.code||fallback;
    normalized.status=error?.status||0;
    normalized.requestId=error?.requestId||state.lastRequestId||null;
    normalized.retryAfter=error?.retryAfter||null;
    return normalized;
  }
  async function request(action,payload={},options={}){
    const cfg=config();
    if(!cfg.configured){const error=new Error('Supabase ist nicht konfiguriert.');error.code='BACKEND_NOT_CONFIGURED';throw error;}
    if(!cfg.secureContext&&location.hostname!=='localhost'){const error=new Error('Sichere Backend-Aufrufe benötigen HTTPS.');error.code='INSECURE_CONTEXT';throw error;}
    const safeAction=validateAction(action);
    const requestId=options.requestId||uuid();
    const timeoutMs=clamp(Number(options.timeoutMs)||cfg.timeoutMs,1000,30000);
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort('timeout'),timeoutMs);
    const started=performance.now();
    state.requests++;state.lastRequestAt=now();state.lastRequestId=requestId;
    const token=await accessToken();
    const headers={'Content-Type':'application/json','Accept':'application/json','X-Luvia-Request-Id':requestId,'X-Luvia-Client-Version':VERSION,'X-Luvia-Build':cfg.clientBuild};
    if(cfg.publishableKey)headers.apikey=cfg.publishableKey;
    if(token)headers.Authorization=`Bearer ${token}`;
    emit('request.started',{requestId,action:safeAction,authenticated:Boolean(token)});
    try{
      const requestBody=JSON.stringify({action:safeAction,payload:sanitize(payload),context:{destinationId:window.LuviaDestination?.getActive?.()?.id||null,tripId:window.LuviaTripContext?.getSnapshot?.()?.tripId||null,clientVersion:VERSION,build:cfg.clientBuild}});
      const send=()=>fetch(`${cfg.functionsBase}/${cfg.functionName}`,{method:'POST',headers,body:requestBody,signal:controller.signal,cache:'no-store',credentials:'omit'});
      let response=await send();
      if(response.status===401){
        const refreshedToken=await accessToken({refresh:true});
        if(refreshedToken){headers.Authorization=`Bearer ${refreshedToken}`;response=await send();}
      }
      const body=await response.json().catch(()=>({ok:false,error:{code:'INVALID_RESPONSE',message:'Backend lieferte keine gültige JSON-Antwort.'}}));
      const responseRequestId=response.headers.get('x-luvia-request-id')||body?.meta?.requestId||requestId;
      if(!response.ok||body?.ok===false){
        const error=new Error(body?.error?.message||`Backend-Anfrage fehlgeschlagen (${response.status}).`);
        error.code=body?.error?.code||`HTTP_${response.status}`;error.status=response.status;error.requestId=responseRequestId;error.retryAfter=response.headers.get('retry-after');throw error;
      }
      const durationMs=Math.round((performance.now()-started)*100)/100;
      state.successes++;state.lastSuccessAt=now();state.lastStatus=response.status;state.lastError=null;
      remember({requestId:responseRequestId,action:safeAction,ok:true,status:response.status,durationMs,at:now()});
      emit('request.succeeded',{requestId:responseRequestId,action:safeAction,status:response.status,durationMs});
      return {...body,meta:{...(body.meta||{}),requestId:responseRequestId,durationMs}};
    }catch(raw){
      const aborted=controller.signal.aborted;
      const error=normalizeError(raw,aborted?'BACKEND_TIMEOUT':'BACKEND_REQUEST_FAILED');
      if(aborted){error.code='BACKEND_TIMEOUT';error.message=`Backend-Anfrage nach ${timeoutMs} ms abgebrochen.`;state.timeouts++;}
      state.failures++;state.lastError={code:error.code,message:error.message,status:error.status,requestId:error.requestId,at:now()};state.lastStatus=error.status||0;
      remember({requestId,action:safeAction,ok:false,status:error.status||0,error:error.code,durationMs:Math.round((performance.now()-started)*100)/100,at:now()});
      window.LuviaKernelLogger?.warn?.('backend','Sicherer Backend-Aufruf fehlgeschlagen',sanitize({requestId,action:safeAction,code:error.code,status:error.status}));
      emit('request.failed',{requestId,action:safeAction,code:error.code,status:error.status});
      throw error;
    }finally{clearTimeout(timeout);}
  }
  async function health(options={}){return request('system.health',{},options);}
  async function probe(){
    const cfg=config();
    if(!cfg.configured)return{ok:false,skipped:true,code:'BACKEND_NOT_CONFIGURED',message:'Supabase nicht konfiguriert.'};
    try{const result=await health({timeoutMs:5000});return{ok:true,configured:true,result};}
    catch(error){return{ok:false,configured:true,code:error.code,message:error.message,status:error.status||0,requestId:error.requestId||null};}
  }
  function diagnostics(){const cfg=config();return{version:VERSION,initialized:state.initialized,configured:cfg.configured,secureContext:cfg.secureContext,functionName:cfg.functionName,endpoint:cfg.functionsBase?`${cfg.functionsBase}/${cfg.functionName}`:'',timeoutMs:cfg.timeoutMs,metrics:{requests:state.requests,successes:state.successes,failures:state.failures,timeouts:state.timeouts},lastRequestAt:state.lastRequestAt,lastSuccessAt:state.lastSuccessAt,lastStatus:state.lastStatus,lastError:sanitize(state.lastError),recent:[...state.recent]};}
  function testContract(){
    const cfg=config();
    const checks={api:typeof request==='function',https:cfg.secureContext||location.hostname==='localhost',configured:cfg.configured,actionValidation:false,sanitization:false,requestIds:Boolean(uuid())};
    try{validateAction('system.health');checks.actionValidation=true;}catch{}
    const sample=sanitize({token:'secret',nested:{password:'hidden'},safe:'visible'});checks.sanitization=sample.token==='[redacted]'&&sample.nested.password==='[redacted]'&&sample.safe==='visible';
    return{ok:Object.values(checks).every(Boolean),message:'Secure-Backend-Vertrag, Konfiguration, Request-IDs und Redaction geprüft.',checks,diagnostics:diagnostics()};
  }
  function subscribe(listener){if(typeof listener!=='function')return()=>{};listeners.add(listener);return()=>listeners.delete(listener);}
  function init(){state.initialized=true;emit('ready',{version:VERSION,configured:config().configured});return api;}
  const api=Object.freeze({version:VERSION,init,config,request,invoke:request,health,probe,diagnostics,testContract,sanitize,subscribe});
  window.LuviaBackend=api;
  window.LuviaSecureBackend=api;
  init();
})();
