(function(){
  'use strict';
  const VERSION='2.2.1-persistent-data-layer-permissions';
  const CACHE_PREFIX='luvia:data:v2:';
  const QUEUE_KEY='luvia:sync-queue:v2';
  const ERROR_KEY='luvia:data-errors:v2';
  const TABLES={
    trip_preferences:{tripScoped:true,userScoped:true,write:true,conflict:['trip_id','user_id','preference_key']},
    derived_user_preferences:{userScoped:true,write:true,conflict:['user_id','preference_key']},
    trip_modules:{tripScoped:true,write:true,conflict:['trip_id','module_id']},
    trip_places:{tripScoped:true,write:true,conflict:['trip_id','place_id','module_key']},
    restaurants:{write:true},
    generated_content:{tripScoped:true,write:true},
    user_content_overrides:{tripScoped:true,userScoped:true,write:true,conflict:['trip_id','user_id','entity_type','entity_id','field_name']},
    media:{tripScoped:true,userScoped:true,write:true},
    recommendations:{tripScoped:true,readOnly:true},
    recommendation_events:{tripScoped:true,userScoped:true,insertOnly:true},
    user_activity_events:{tripScoped:true,userScoped:true,write:true},
    automation_jobs:{tripScoped:true,userScoped:true,write:true},
    modules:{readOnly:true}, destinations:{readOnly:true}, places:{readOnly:true}, popularity_aggregates:{readOnly:true}, co_selection_aggregates:{readOnly:true}
  };
  const state={online:navigator.onLine,lastError:null,lastOperation:null,flushing:false,listeners:new Set()};
  const parse=(v,f)=>{try{return JSON.parse(v)}catch{return f}};
  const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
  const now=()=>new Date().toISOString();
  const uuid=()=>crypto.randomUUID?.()||('xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx').replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==='x'?r:(r&3|8);return v.toString(16)});
  function emit(type,detail={}){const event={type,at:now(),...detail};state.listeners.forEach(fn=>{try{fn(event)}catch{}});window.dispatchEvent(new CustomEvent('luvia:data-layer',{detail:event}));}
  function client(){return window.LuviaDatabaseFoundation?.client?.()||window.ParisSupabaseClient||null;}
  async function session(){const c=client();if(!c)return null;const {data}=await c.auth.getSession();return data?.session||null;}
  function context(){const d=window.LuviaDestinationContext?.getActive?.()||{};return {tripId:d.tripId||'',destination:d};}
  function meta(table){const m=TABLES[table];if(!m)throw new Error(`Tabelle „${table}“ ist für den öffentlichen Core nicht freigegeben.`);return m;}
  function cacheKey(table,scope='all'){return `${CACHE_PREFIX}${table}:${scope}`;}
  function cacheGet(table,scope='all'){return parse(localStorage.getItem(cacheKey(table,scope)),null);}
  function cacheSet(table,scope,data){localStorage.setItem(cacheKey(table,scope),JSON.stringify({data,updatedAt:now()}));emit('cache:write',{table,scope,count:Array.isArray(data)?data.length:1});return data;}
  function queue(){return parse(localStorage.getItem(QUEUE_KEY),[])||[];}
  function saveQueue(items){localStorage.setItem(QUEUE_KEY,JSON.stringify(items));emit('queue:changed',{count:items.length});}
  function errors(){return parse(localStorage.getItem(ERROR_KEY),[])||[];}
  function friendlyMessage(error){const raw=error?.message||String(error);if(/permission denied for table/i.test(raw))return `${raw} – Die SQL-Migration 20260726_002_core_v2_2_permissions.sql wurde vermutlich noch nicht ausgeführt.`;if(/row-level security|violates row-level security/i.test(raw))return `${raw} – Der angemeldete Nutzer ist vermutlich kein Mitglied dieser Reise oder die RLS-Policy greift nicht.`;return raw;}
  function logError(error,operation){const item={id:uuid(),at:now(),message:friendlyMessage(error),code:error?.code||'',operation};const list=[item,...errors()].slice(0,30);localStorage.setItem(ERROR_KEY,JSON.stringify(list));state.lastError=item;emit('error',item);}
  async function enrich(table,payload){const m=meta(table),s=await session(),ctx=context(),out={...clone(payload)};if(m.tripScoped&&!out.trip_id){if(!ctx.tripId)throw new Error('Keine aktive Reise erkannt.');out.trip_id=ctx.tripId;}if(m.userScoped&&!out.user_id){if(!s?.user?.id)throw new Error('Für diese Aktion ist eine Anmeldung erforderlich.');out.user_id=s.user.id;}return out;}
  function applyFilters(query,filters={}){Object.entries(filters||{}).forEach(([key,value])=>{if(value===undefined)return;if(Array.isArray(value))query=query.in(key,value);else if(value===null)query=query.is(key,null);else query=query.eq(key,value);});return query;}
  async function list(table,options={}){
    const m=meta(table),ctx=context(),scope=options.scope||options.filters?.trip_id||ctx.tripId||'global';
    const cached=cacheGet(table,scope);
    if(!navigator.onLine||!client()){if(cached)return {data:clone(cached.data),source:'cache',offline:true,updatedAt:cached.updatedAt};throw new Error('Offline und keine gespeicherten Daten vorhanden.');}
    try{
      let q=client().from(table).select(options.select||'*');
      const filters={...(options.filters||{})};if(m.tripScoped&&!filters.trip_id&&ctx.tripId)filters.trip_id=ctx.tripId;
      q=applyFilters(q,filters);if(options.orderBy)q=q.order(options.orderBy,{ascending:options.ascending!==false});if(options.limit)q=q.limit(options.limit);
      const {data,error}=await q;if(error)throw error;cacheSet(table,scope,data||[]);state.lastOperation={type:'list',table,at:now(),count:data?.length||0};emit('read',{table,count:data?.length||0,source:'supabase'});return {data:data||[],source:'supabase',offline:false};
    }catch(error){logError(error,{type:'list',table,options});if(cached)return {data:clone(cached.data),source:'cache-fallback',offline:true,error:error.message};throw error;}
  }
  async function get(table,id,options={}){if(!id)throw new Error('Datensatz-ID fehlt.');const result=await list(table,{...options,filters:{...(options.filters||{}),id},limit:1});return {...result,data:result.data[0]||null};}
  function enqueue(type,table,payload,options={}){const item={id:uuid(),type,table,payload:clone(payload),options:clone(options),createdAt:now(),attempts:0,status:'pending'};const items=queue();items.push(item);saveQueue(items);emit('queued',{item});return {data:payload,queued:true,offline:true,queueId:item.id};}
  async function executeWrite(type,table,payload,options={}){
    const m=meta(table);if(m.readOnly)throw new Error(`Tabelle „${table}“ ist schreibgeschützt.`);if(m.insertOnly&&type!=='create')throw new Error(`Tabelle „${table}“ erlaubt nur neue Einträge.`);
    const c=client();if(!navigator.onLine||!c)return enqueue(type,table,payload,options);
    try{
      let q;
      if(type==='create')q=c.from(table).insert(payload).select(options.select||'*');
      if(type==='update'){if(!options.id&&!options.filters)throw new Error('Update benötigt ID oder Filter.');q=c.from(table).update(payload);q=options.id?q.eq('id',options.id):applyFilters(q,options.filters);q=q.select(options.select||'*');}
      if(type==='remove'){if(!options.id&&!options.filters)throw new Error('Löschen benötigt ID oder Filter.');q=c.from(table).delete();q=options.id?q.eq('id',options.id):applyFilters(q,options.filters);q=q.select(options.select||'*');}
      if(type==='upsert')q=c.from(table).upsert(payload,{onConflict:(options.onConflict||m.conflict||[]).join(','),ignoreDuplicates:false}).select(options.select||'*');
      const {data,error}=await q;if(error)throw error;invalidate(table);state.lastOperation={type,table,at:now(),count:data?.length||0};emit('write',{type,table,count:data?.length||0});return {data:Array.isArray(data)&&data.length===1?data[0]:data,queued:false,offline:false};
    }catch(error){logError(error,{type,table,payload,options});if(options.queueOnError!==false&&(/fetch|network|offline/i.test(error.message||'')||!navigator.onLine))return enqueue(type,table,payload,options);throw error;}
  }
  async function create(table,payload,options={}){return executeWrite('create',table,await enrich(table,payload),options);}
  async function update(table,idOrFilters,changes,options={}){const target=typeof idOrFilters==='string'?{id:idOrFilters}:{filters:idOrFilters};return executeWrite('update',table,await enrich(table,changes),{...options,...target});}
  async function remove(table,idOrFilters,options={}){const target=typeof idOrFilters==='string'?{id:idOrFilters}:{filters:idOrFilters};return executeWrite('remove',table,{}, {...options,...target});}
  async function upsert(table,payload,options={}){return executeWrite('upsert',table,await enrich(table,payload),options);}
  function invalidate(table){Object.keys(localStorage).filter(k=>k.startsWith(`${CACHE_PREFIX}${table}:`)).forEach(k=>localStorage.removeItem(k));emit('cache:invalidate',{table});}
  async function flush(){if(state.flushing||!navigator.onLine||!client())return {processed:0,remaining:queue().length};state.flushing=true;let items=queue(),processed=0;for(const item of [...items]){try{const options={...(item.options||{}),queueOnError:false};await executeWrite(item.type,item.table,item.payload,options);items=items.filter(x=>x.id!==item.id);saveQueue(items);processed++;emit('queue:processed',{item});}catch(error){item.attempts=(item.attempts||0)+1;item.lastError=error.message;item.lastAttemptAt=now();if(item.attempts>=5)item.status='failed';items=items.map(x=>x.id===item.id?item:x);saveQueue(items);logError(error,{type:'flush',item});if(!navigator.onLine)break;}}state.flushing=false;return {processed,remaining:items.length};}
  function clearQueue(){saveQueue([]);}
  function snapshot(){return {version:VERSION,online:navigator.onLine,queue:queue(),queueCount:queue().length,errors:errors(),lastOperation:state.lastOperation,lastError:state.lastError,cacheKeys:Object.keys(localStorage).filter(k=>k.startsWith(CACHE_PREFIX))};}
  function subscribe(fn){state.listeners.add(fn);return()=>state.listeners.delete(fn);}
  window.addEventListener('online',()=>{state.online=true;emit('network',{online:true});flush();});
  window.addEventListener('offline',()=>{state.online=false;emit('network',{online:false});});
  const api={version:VERSION,list,get,create,update,remove,upsert,flush,clearQueue,invalidate,cacheGet,snapshot,subscribe,tables:Object.keys(TABLES)};
  window.LuviaData=api;
  window.LuviaIntelligence=window.LuviaIntelligence||{};
  window.LuviaIntelligence.data=api;
  window.dispatchEvent(new CustomEvent('luvia:data-ready',{detail:{version:VERSION}}));
  if(navigator.onLine)setTimeout(flush,1000);
})();
