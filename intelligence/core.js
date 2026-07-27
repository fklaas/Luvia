(function(){
  'use strict';
  const VERSION='2.11.2-destination-intelligence';
  const state={providers:new Map(),lastError:null};
  const now=()=>new Date().toISOString();
  function destination(input){return window.LuviaDestination?.resolve(input)||window.LuviaDestinationContext?.normalize(input)||{name:'',isUsable:false,isResolved:false}}
  function registerProvider(name,provider){if(!name||!provider)throw new Error('Provider name and implementation required');state.providers.set(name,provider);return provider}
  function provider(name){return state.providers.get(name)||null}
  function config(){
    const auth=window.LUVIA_AUTH_CONFIG||window.LUVIA_CONFIG||{};
    const supabaseUrl=auth.supabaseUrl||auth.url||'';
    return {supabaseUrl,functionsBase:supabaseUrl?supabaseUrl.replace(/\/$/,'')+'/functions/v1':'',hasSupabase:Boolean(supabaseUrl)};
  }
  async function invoke(action,payload={},options={}){
    const custom=provider(options.provider||'gateway');
    if(custom?.invoke)return custom.invoke(action,payload,options);
    if(window.LuviaBackend?.request)return window.LuviaBackend.request(action,payload,options);
    throw new Error('Luvia Secure Backend ist nicht verfügbar.');
  }
  function status(input){
    const d=destination(input),cfg=config();
    const backend=window.LuviaBackend?.diagnostics?.()||{};return {version:VERSION,destination:d,supabase:cfg.hasSupabase,edgeFunction:backend.configured?'configured':'not_configured',secureBackend:backend,googlePlaces:d.isResolved?'destination_ready':'destination_unresolved',ai:'not_configured',readyForLiveRequests:Boolean(backend.configured&&backend.secureContext),lastError:state.lastError?.message||backend.lastError?.message||''};
  }
  window.LuviaIntelligence={...(window.LuviaIntelligence||{}),version:VERSION,destination,registerProvider,provider,invoke,status,data:window.LuviaData||window.LuviaIntelligence?.data,environment:window.LuviaEnvironment,kernel:window.LuviaKernel,services:window.LuviaServiceRegistry,platform:window.LuviaPlatform,destinations:window.LuviaDestination,backend:window.LuviaBackend,places:window.LuviaPlaces};
  window.dispatchEvent(new CustomEvent('luvia:intelligence-ready',{detail:{version:VERSION}}));
})();
