(() => {
  'use strict';
  const VERSION='4.29.2',BUILD='13.29.2',BUCKET='luvia-media',channels=new Map();
  const queryCache=new Map(),queryTtlMs=15000,previewObjectUrls=new Map(),previewFetches=new Map(),PREVIEW_CACHE='luvia-media-previews-v13.29.2';
  const id=()=>crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const ext=f=>(f?.name?.split('.').pop()||f?.type?.split('/').pop()||'jpg').replace(/[^a-z0-9]/gi,'').toLowerCase()||'jpg';
  const day=iso=>{const d=new Date(iso);return Number.isNaN(d.getTime())?null:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
  async function context(){
    const client=window.LuviaSupabaseService?.getClient?.()||window.LuviaSupabase?.getClient?.()||window.LuviaSupabase?.client?.()||window.ParisSupabaseClient||window.ParisCloud?.client;
    const trip=window.LuviaTripContext?.getActiveTrip?.()||window.LuviaTripContext?.getSnapshot?.()?.trip||window.LuviaTripStore?.snapshot?.()?.activeTrip||null;
    const tripId=String(trip?.id||trip?.tripId||window.LuviaTripContext?.getSnapshot?.()?.tripId||window.LuviaTripStore?.snapshot?.()?.activeTripId||'');
    let userId=window.ParisAuth?.getState?.()?.user?.id||window.LuviaRuntime?.getSnapshot?.()?.auth?.user?.id||null;
    if(!userId&&client?.auth?.getSession){const session=await client.auth.getSession();if(session?.error)throw session.error;userId=session?.data?.session?.user?.id||null}
    if(!client)throw new Error('Media Core benötigt eine aktive Supabase-Verbindung.');
    if(!userId)throw new Error('Media Core benötigt eine gültige Anmeldung.');
    if(!tripId)throw new Error('Media Core benötigt eine aktive Reise.');
    return{client,tripId,userId,trip};
  }

  const distance=(a,b)=>{const R=6371000,dLat=(Number(b.latitude)-Number(a.latitude))*Math.PI/180,dLon=(Number(b.longitude)-Number(a.longitude))*Math.PI/180,x=Math.sin(dLat/2)**2+Math.cos(Number(a.latitude)*Math.PI/180)*Math.cos(Number(b.latitude)*Math.PI/180)*Math.sin(dLon/2)**2;return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))};
  async function resolveCaptureLocation(meta){
    if(!Number.isFinite(Number(meta?.latitude))||!Number.isFinite(Number(meta?.longitude)))return null;
    const location={latitude:Number(meta.latitude),longitude:Number(meta.longitude)};
    if(!window.LuviaPlaces?.nearbySearch)return{latitude:location.latitude,longitude:location.longitude,source:'exif',status:'coordinates_only'};
    try{const response=await window.LuviaPlaces.nearbySearch({location,radius:350,maxResultCount:10,rankPreference:'DISTANCE',strictDestination:false,languageCode:'de'}),places=response?.data?.places||[];const ranked=places.map(place=>({place,distanceMeters:distance(location,place.location||place.coordinates||{latitude:place.latitude,longitude:place.longitude})})).filter(x=>Number.isFinite(x.distanceMeters)).sort((a,b)=>a.distanceMeters-b.distanceMeters),best=ranked[0];if(!best)return{...location,source:'exif',status:'coordinates_only'};return{...location,source:'exif+google_places',status:'resolved',name:best.place.displayName||best.place.name||null,address:best.place.formattedAddress||best.place.shortAddress||best.place.address||null,providerPlaceId:String(best.place.providerPlaceId||best.place.id||'').replace(/^places\//,''),primaryType:best.place.primaryType||null,distanceMeters:Math.round(best.distanceMeters),confidence:best.distanceMeters<=80?.98:best.distanceMeters<=180?.88:.72}}catch(error){console.warn('[LuviaMediaCore] Ortsauflösung fehlgeschlagen',error);return{...location,source:'exif',status:'resolver_failed',error:error?.code||error?.message||'resolver_failed'}}
  }

  function entity(r){return Object.freeze({id:r.id,tripId:r.trip_id,userId:r.user_id,participantId:r.participant_id||null,type:r.type,purpose:r.purpose,source:r.source,originalName:r.original_name,displayName:r.display_name||r.metadata?.caption||null,mimeType:r.mime_type,storageBucket:r.storage_bucket||BUCKET,storagePath:r.storage_path,previewPath:r.preview_path||null,thumbnailPath:r.thumbnail_path||null,status:r.status,capturedAt:r.captured_at||r.created_at,dayKey:r.day_key||day(r.captured_at||r.created_at),timezone:r.timezone||null,latitude:r.latitude==null?null:Number(r.latitude),longitude:r.longitude==null?null:Number(r.longitude),width:r.width||null,height:r.height||null,fileSize:r.file_size||null,contentHash:r.content_hash||null,placeId:r.place_id||null,favorite:Boolean(r.favorite),editSettings:r.edit_settings||{},metadata:r.metadata||{},renderedPreviewPath:r.metadata?.renderedPreviewPath||null,createdAt:r.created_at,updatedAt:r.updated_at})}
  async function cachedQuery(key,loader,ttl=queryTtlMs){const hit=queryCache.get(key),now=Date.now();if(hit&&hit.value&&now-hit.at<ttl)return hit.value;if(hit?.promise)return hit.promise;const promise=Promise.resolve().then(loader).then(value=>{queryCache.set(key,{value,at:Date.now()});return value}).finally(()=>{const current=queryCache.get(key);if(current?.promise)queryCache.delete(key)});queryCache.set(key,{promise,at:now});return promise}
  function invalidateQueries(prefix=''){for(const key of queryCache.keys())if(!prefix||key.startsWith(prefix))queryCache.delete(key)}
  async function list(options={}){const{client,tripId}=await context();const key=`media:list:${tripId}:${options.type||''}:${options.dayKey||''}:${options.favorite?'1':'0'}`;return cachedQuery(key,async()=>{let q=client.from('media').select('*').eq('trip_id',tripId).neq('status','deleted');if(options.type)q=q.eq('type',options.type);if(options.dayKey)q=q.eq('day_key',options.dayKey);if(options.favorite)q=q.eq('favorite',true);const r=await q.order('captured_at',{ascending:true,nullsFirst:false}).order('created_at',{ascending:true});if(r.error)throw r.error;return(r.data||[]).map(entity)})}
  async function get(mediaId){const{client,tripId}=await context(),r=await client.from('media').select('*').eq('trip_id',tripId).eq('id',mediaId).maybeSingle();if(r.error)throw r.error;return r.data?entity(r.data):null}
  async function listByIds(ids=[]){const unique=[...new Set((ids||[]).map(String).filter(Boolean))];if(!unique.length)return[];const{client,tripId}=await context();const key=`media:ids:${tripId}:${[...unique].sort().join(',')}`;return cachedQuery(key,async()=>{const chunks=[];for(let i=0;i<unique.length;i+=100)chunks.push(unique.slice(i,i+100));const rows=[];for(const chunk of chunks){const r=await client.from('media').select('*').eq('trip_id',tripId).in('id',chunk).neq('status','deleted');if(r.error)throw r.error;rows.push(...(r.data||[]))}const map=new Map(rows.map(r=>[String(r.id),entity(r)]));return unique.map(id=>map.get(id)).filter(Boolean)})}
  async function signedUrl(item,expiresIn=3600){
    const bucket=item?.storageBucket||BUCKET;
    const candidates=[item?.renderedPreviewPath,item?.metadata?.renderedPreviewPath,item?.previewPath,item?.thumbnailPath,item?.storagePath].filter(Boolean);
    if(!candidates.length)return null;
    const{client}=await context();
    let lastError=null;
    for(const path of [...new Set(candidates)]){
      const r=await client.storage.from(bucket).createSignedUrl(path,expiresIn);
      if(!r.error&&r.data?.signedUrl)return r.data.signedUrl;
      lastError=r.error||null;
    }
    if(lastError)throw lastError;
    return null;
  }


  function previewVersion(item){return encodeURIComponent(String(item?.metadata?.renderedAt||item?.updatedAt||item?.previewPath||item?.thumbnailPath||item?.storagePath||'v1'))}
  function previewCacheRequest(item){return new Request(`${location.origin}/__luvia_media_cache__/${encodeURIComponent(item.id)}/${previewVersion(item)}`,{method:'GET'})}
  async function cachedPreviewUrl(item,{refresh=false}={}){
    if(!item?.id)return'';const key=`${item.id}:${previewVersion(item)}`;
    if(previewObjectUrls.has(key))return previewObjectUrls.get(key);
    if('caches'in window){try{const cache=await caches.open(PREVIEW_CACHE),hit=await cache.match(previewCacheRequest(item));if(hit){const blob=await hit.blob(),url=URL.createObjectURL(blob);previewObjectUrls.set(key,url);if(refresh)void refreshPreview(item,key,cache);return url}}catch{}}
    return refreshPreview(item,key);
  }
  async function refreshPreview(item,key,providedCache=null){
    if(previewFetches.has(key))return previewFetches.get(key);const task=(async()=>{try{const remote=await signedUrl(item,86400);if(!remote)return'';const response=await fetch(remote,{cache:'force-cache'});if(!response.ok)return'';const blob=await response.blob();if('caches'in window){const cache=providedCache||await caches.open(PREVIEW_CACHE);await cache.put(previewCacheRequest(item),new Response(blob,{headers:{'Content-Type':blob.type||'image/jpeg','Cache-Control':'public,max-age=31536000,immutable'}}))}const url=URL.createObjectURL(blob),old=previewObjectUrls.get(key);if(old)URL.revokeObjectURL(old);previewObjectUrls.set(key,url);return url}catch{return''}finally{previewFetches.delete(key)}})();previewFetches.set(key,task);return task
  }
  async function prewarm(items=[],limit=12){const list=[...new Map(items.filter(Boolean).map(x=>[String(x.id),x])).values()].slice(0,limit);await Promise.allSettled(list.map(x=>cachedPreviewUrl(x)));return list.length}
  async function clearPreviewCache(){for(const url of previewObjectUrls.values())URL.revokeObjectURL(url);previewObjectUrls.clear();previewFetches.clear();if('caches'in window)await caches.delete(PREVIEW_CACHE)}

  async function signedOriginalUrl(item,expiresIn=3600){
    const bucket=item?.storageBucket||BUCKET,candidates=[item?.previewPath,item?.thumbnailPath,item?.storagePath].filter(Boolean);
    if(!candidates.length)return null;const{client}=await context();let lastError=null;
    for(const path of [...new Set(candidates)]){const r=await client.storage.from(bucket).createSignedUrl(path,expiresIn);if(!r.error&&r.data?.signedUrl)return r.data.signedUrl;lastError=r.error||null}
    if(lastError)throw lastError;return null;
  }
  async function saveRenderedPreview(mediaId,blob,{editSettings=null,displayName,metadataPatch={}}={}){
    if(!(blob instanceof Blob))throw new TypeError('Gerenderte Fotovorschau fehlt.');
    const{client,tripId,userId}=await context(),item=await get(mediaId);if(!item)throw new Error('Foto wurde nicht gefunden.');
    const path=`${tripId}/${userId}/${mediaId}/rendered.jpg`;
    const stored=await client.storage.from(item.storageBucket||BUCKET).upload(path,blob,{upsert:true,contentType:'image/jpeg',cacheControl:'0'});if(stored.error)throw stored.error;
    const metadata={...(item.metadata||{}),...(metadataPatch||{}),renderedPreviewPath:path,renderedAt:new Date().toISOString(),renderSchema:'image-composite-v1'};
    invalidateQueries('media:');const saved=await update(mediaId,{...(editSettings?{editSettings}:{}),...(displayName!==undefined?{displayName}:{}),metadata});window.dispatchEvent(new CustomEvent('luvia:media-composite-updated',{detail:{mediaId,tripId,dayKey:saved.dayKey}}));return saved;
  }
  async function upload(file,options={}){
    if(!(file instanceof Blob))throw new TypeError('Media Core erwartet eine Datei oder einen Blob.');
    const{client,tripId,userId}=await context(),mediaId=options.id||id();
    const source=['user_upload','remote_url','provider','generated','app_camera'].includes(options.source)?options.source:'user_upload';
    const meta=await window.LuviaMediaMetadata.extract(file,{capturedAt:options.capturedAt,location:options.captureLocation,source,deviceMetadata:options.deviceMetadata});
    const resolvedLocation=await resolveCaptureLocation(meta);
    if(meta.contentHash){const d=await client.from('media').select('*').eq('trip_id',tripId).eq('content_hash',meta.contentHash).neq('status','deleted').limit(1).maybeSingle();if(d.error&&d.error.code!=='PGRST116')throw d.error;if(d.data)return{entity:entity(d.data),duplicate:true}}
    const path=`${tripId}/${userId}/${mediaId}/original.${ext(file)}`,capturedAt=meta.capturedAt,row={id:mediaId,trip_id:tripId,user_id:userId,type:'image',purpose:'memory',source,original_name:file.name||null,display_name:options.displayName||null,mime_type:file.type||'application/octet-stream',storage_bucket:BUCKET,storage_path:path,status:'pending',captured_at:capturedAt,day_key:day(capturedAt),timezone:meta.timezone,latitude:meta.latitude,longitude:meta.longitude,width:meta.width,height:meta.height,file_size:file.size||null,content_hash:meta.contentHash,favorite:false,edit_settings:{},metadata:{captureEvidence:meta.evidence,captureLocationAccuracy:meta.locationAccuracy??null,deviceMetadata:meta.deviceMetadata||null,captureSource:options.captureSource||meta.captureSource||source,exif:meta.exif||{},resolvedLocation,originalLastModified:meta.originalLastModified||null,originalName:meta.originalName||null,mimeType:meta.mimeType||null,isHeic:Boolean(meta.isHeic)}};
    const created=await client.from('media').insert(row).select('*').single();if(created.error)throw created.error;
    const stored=await client.storage.from(BUCKET).upload(path,file,{upsert:false,contentType:row.mime_type,cacheControl:'31536000'});
    if(stored.error){await client.from('media').update({status:'failed'}).eq('id',mediaId);throw stored.error}
    let previewPath=null;
    try{if(window.LuviaMediaPreview?.available?.()){const preview=await window.LuviaMediaPreview.make(file),candidate=`${tripId}/${userId}/${mediaId}/preview.jpg`,saved=await client.storage.from(BUCKET).upload(candidate,preview.blob,{upsert:true,contentType:'image/jpeg',cacheControl:'31536000'});if(!saved.error)previewPath=candidate}}catch(error){console.warn('[LuviaMediaCore] Preview skipped',error)}
    const ready=await client.from('media').update({status:'ready',preview_path:previewPath}).eq('id',mediaId).select('*').single();if(ready.error)throw ready.error;
    invalidateQueries('media:');return{entity:entity(ready.data),duplicate:false};
  }
  async function update(mediaId,patch={}){const{client,tripId}=await context(),mapped={};if('capturedAt'in patch){mapped.captured_at=patch.capturedAt;mapped.day_key=day(patch.capturedAt)}if('displayName'in patch)mapped.display_name=String(patch.displayName||'').trim()||null;if('favorite'in patch)mapped.favorite=Boolean(patch.favorite);if('editSettings'in patch)mapped.edit_settings=patch.editSettings||{};if('placeId'in patch)mapped.place_id=patch.placeId||null;if('metadata'in patch)mapped.metadata=patch.metadata||{};if('latitude'in patch)mapped.latitude=patch.latitude??null;if('longitude'in patch)mapped.longitude=patch.longitude??null;if('width'in patch)mapped.width=patch.width??null;if('height'in patch)mapped.height=patch.height??null;if(!Object.keys(mapped).length)return get(mediaId);const r=await client.from('media').update(mapped).eq('trip_id',tripId).eq('id',mediaId).select('*').single();if(r.error)throw r.error;invalidateQueries('media:');return entity(r.data)}
  const toggleFavorite=async mediaId=>{const item=await get(mediaId);return update(mediaId,{favorite:!item?.favorite})};
  async function listPolaroids(){const{client,tripId}=await context(),r=await client.from('media_day_polaroids').select('*').eq('trip_id',tripId);if(r.error){if(['42P01','PGRST205'].includes(r.error.code))return{};throw r.error}return Object.fromEntries((r.data||[]).map(x=>[String(x.day_key),x.media_id]))}
  async function setPolaroid(mediaId,dayKey){const{client,tripId,userId}=await context(),item=await get(mediaId);if(!item)throw new Error('Foto wurde nicht gefunden.');const key=dayKey||item.dayKey;if(!key)throw new Error('Das Foto ist keinem Reisetag zugeordnet.');const r=await client.from('media_day_polaroids').upsert({trip_id:tripId,day_key:key,media_id:mediaId,selected_by:userId,selected_at:new Date().toISOString()},{onConflict:'trip_id,day_key'}).select('*').single();if(r.error)throw r.error;const existing=await client.from('timeline_events').select('id,metadata').eq('trip_id',tripId).eq('event_type','photo_memory');if(!existing.error){const ids=(existing.data||[]).filter(x=>x.metadata?.polaroidDayKey===key).map(x=>x.id);if(ids.length)await client.from('timeline_events').delete().eq('trip_id',tripId).in('id',ids)}const occurredAt=item.capturedAt||`${key}T12:00:00`;const title=item.displayName||`Polaroid des Tages`;const created=await client.from('timeline_events').insert({trip_id:tripId,event_type:'photo_memory',title,description:'Polaroid des Tages',occurred_at:occurredAt,source:'media_polaroid',is_automatic:false,metadata:{mediaId,mediaIds:[mediaId],polaroid:true,polaroidDayKey:key}});if(created.error)throw created.error;window.dispatchEvent(new CustomEvent('luvia:media-polaroid-changed',{detail:{mediaId,tripId,dayKey:key}}));window.dispatchEvent(new CustomEvent('luvia:memory-bridge-applied',{detail:{tripId}}));return r.data}
  async function linkPlace(mediaId,placeId,options={}){const{client,tripId,userId}=await context(),r=await client.from('media_place_links').upsert({trip_id:tripId,media_id:mediaId,place_id:placeId,source:options.source||'manual',confidence:options.confidence??1,evidence:options.evidence||{},created_by:userId},{onConflict:'media_id,place_id'}).select('*').single();if(r.error)throw r.error;await update(mediaId,{placeId});return r.data}
  async function remove(mediaId){const{client,tripId}=await context(),item=await get(mediaId);if(!item)return false;const paths=[item.storagePath,item.previewPath,item.thumbnailPath,item.renderedPreviewPath,item.metadata?.renderedPreviewPath].filter(Boolean);if(paths.length){const s=await client.storage.from(item.storageBucket||BUCKET).remove(paths);if(s.error)throw s.error}const r=await client.from('media').update({status:'deleted'}).eq('trip_id',tripId).eq('id',mediaId);if(r.error)throw r.error;await client.from('media_cluster_items').delete().eq('media_id',mediaId);window.dispatchEvent(new CustomEvent('luvia:media-deleted',{detail:{mediaId,tripId}}));return true}
  async function subscribe(callback){const{client,tripId}=await context();if(channels.has(tripId))await channels.get(tripId)();const c=client.channel(`luvia-media-${tripId}-${Math.random().toString(36).slice(2)}`).on('postgres_changes',{event:'*',schema:'public',table:'media',filter:`trip_id=eq.${tripId}`},callback).on('postgres_changes',{event:'*',schema:'public',table:'media_day_polaroids',filter:`trip_id=eq.${tripId}`},callback).subscribe();const stop=async()=>{await client.removeChannel(c);channels.delete(tripId)};channels.set(tripId,stop);return stop}
  async function reanalyze(mediaId){const item=await get(mediaId);if(!item)throw new Error('Foto wurde nicht gefunden.');const url=await signedUrl({...item,previewPath:null,thumbnailPath:null},900);if(!url)throw new Error('Originaldatei ist nicht verfügbar.');const response=await fetch(url);if(!response.ok)throw new Error('Originaldatei konnte nicht geladen werden.');const blob=await response.blob();const file=new File([blob],item.originalName||`photo.${ext({name:item.storagePath,type:item.mimeType})}`,{type:item.mimeType||blob.type,lastModified:item.metadata?.originalLastModified||Date.now()});const meta=await window.LuviaMediaMetadata.extract(file,{source:item.source});const resolvedLocation=await resolveCaptureLocation(meta);return update(mediaId,{capturedAt:meta.capturedAt,latitude:meta.latitude,longitude:meta.longitude,width:meta.width,height:meta.height,metadata:{...(item.metadata||{}),captureEvidence:meta.evidence,exif:meta.exif||{},resolvedLocation,reanalyzedAt:new Date().toISOString(),isHeic:Boolean(meta.isHeic)}})}
  const diagnostics=()=>({service:'media-core',version:VERSION,build:BUILD,status:'active',ok:true,checkedAt:new Date().toISOString(),durationMs:0,dependencies:{metadata:Boolean(window.LuviaMediaMetadata),preview:Boolean(window.LuviaMediaPreview)},checks:{canonicalMediaEntity:true,realtime:true,favorites:true,nonDestructiveEditing:true,dayPolaroids:true},failedChecks:[],warnings:[]});
  window.LuviaMediaCore=Object.freeze({version:VERSION,build:BUILD,bucket:BUCKET,getContext:context,list,listByIds,get,upload,update,reanalyze,toggleFavorite,listPolaroids,setPolaroid,linkPlace,remove,signedUrl,cachedPreviewUrl,prewarm,clearPreviewCache,invalidateQueries,signedOriginalUrl,saveRenderedPreview,subscribe,diagnostics,rowToEntity:entity});
})();
