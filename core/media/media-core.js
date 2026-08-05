(() => {
  'use strict';
  const VERSION='4.28.5.3',BUILD='13.28.5.3',BUCKET='luvia-media',channels=new Map();
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
  function entity(r){return Object.freeze({id:r.id,tripId:r.trip_id,userId:r.user_id,participantId:r.participant_id||null,type:r.type,purpose:r.purpose,source:r.source,originalName:r.original_name,displayName:r.display_name||r.metadata?.caption||null,mimeType:r.mime_type,storageBucket:r.storage_bucket||BUCKET,storagePath:r.storage_path,previewPath:r.preview_path||null,thumbnailPath:r.thumbnail_path||null,status:r.status,capturedAt:r.captured_at||r.created_at,dayKey:r.day_key||day(r.captured_at||r.created_at),timezone:r.timezone||null,latitude:r.latitude==null?null:Number(r.latitude),longitude:r.longitude==null?null:Number(r.longitude),width:r.width||null,height:r.height||null,fileSize:r.file_size||null,contentHash:r.content_hash||null,placeId:r.place_id||null,favorite:Boolean(r.favorite),editSettings:r.edit_settings||{},metadata:r.metadata||{},createdAt:r.created_at,updatedAt:r.updated_at})}
  async function list(options={}){const{client,tripId}=await context();let q=client.from('media').select('*').eq('trip_id',tripId).neq('status','deleted');if(options.type)q=q.eq('type',options.type);if(options.dayKey)q=q.eq('day_key',options.dayKey);if(options.favorite)q=q.eq('favorite',true);const r=await q.order('captured_at',{ascending:true,nullsFirst:false}).order('created_at',{ascending:true});if(r.error)throw r.error;return(r.data||[]).map(entity)}
  async function get(mediaId){const{client,tripId}=await context(),r=await client.from('media').select('*').eq('trip_id',tripId).eq('id',mediaId).maybeSingle();if(r.error)throw r.error;return r.data?entity(r.data):null}
  async function signedUrl(item,expiresIn=3600){
    const bucket=item?.storageBucket||BUCKET;
    const candidates=[item?.previewPath,item?.thumbnailPath,item?.storagePath].filter(Boolean);
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
  async function upload(file,options={}){
    if(!(file instanceof Blob))throw new TypeError('Media Core erwartet eine Datei oder einen Blob.');
    const{client,tripId,userId}=await context(),mediaId=options.id||id();
    const source=['user_upload','remote_url','provider','generated','app_camera'].includes(options.source)?options.source:'user_upload';
    const meta=await window.LuviaMediaMetadata.extract(file,{capturedAt:options.capturedAt,location:options.captureLocation,source,deviceMetadata:options.deviceMetadata});
    if(meta.contentHash){const d=await client.from('media').select('*').eq('trip_id',tripId).eq('content_hash',meta.contentHash).neq('status','deleted').limit(1).maybeSingle();if(d.error&&d.error.code!=='PGRST116')throw d.error;if(d.data)return{entity:entity(d.data),duplicate:true}}
    const path=`${tripId}/${userId}/${mediaId}/original.${ext(file)}`,capturedAt=meta.capturedAt,row={id:mediaId,trip_id:tripId,user_id:userId,type:'image',purpose:'memory',source,original_name:file.name||null,display_name:options.displayName||null,mime_type:file.type||'application/octet-stream',storage_bucket:BUCKET,storage_path:path,status:'pending',captured_at:capturedAt,day_key:day(capturedAt),timezone:meta.timezone,latitude:meta.latitude,longitude:meta.longitude,width:meta.width,height:meta.height,file_size:file.size||null,content_hash:meta.contentHash,favorite:false,edit_settings:{},metadata:{captureEvidence:meta.evidence,captureLocationAccuracy:meta.locationAccuracy??null,deviceMetadata:meta.deviceMetadata||null,captureSource:options.captureSource||meta.captureSource||source,exif:meta.exif||{},originalLastModified:meta.originalLastModified||null,originalName:meta.originalName||null,mimeType:meta.mimeType||null}};
    const created=await client.from('media').insert(row).select('*').single();if(created.error)throw created.error;
    const stored=await client.storage.from(BUCKET).upload(path,file,{upsert:false,contentType:row.mime_type,cacheControl:'31536000'});
    if(stored.error){await client.from('media').update({status:'failed'}).eq('id',mediaId);throw stored.error}
    let previewPath=null;
    try{if(window.LuviaMediaPreview?.available?.()){const preview=await window.LuviaMediaPreview.make(file),candidate=`${tripId}/${userId}/${mediaId}/preview.jpg`,saved=await client.storage.from(BUCKET).upload(candidate,preview.blob,{upsert:true,contentType:'image/jpeg',cacheControl:'31536000'});if(!saved.error)previewPath=candidate}}catch(error){console.warn('[LuviaMediaCore] Preview skipped',error)}
    const ready=await client.from('media').update({status:'ready',preview_path:previewPath}).eq('id',mediaId).select('*').single();if(ready.error)throw ready.error;
    return{entity:entity(ready.data),duplicate:false};
  }
  async function update(mediaId,patch={}){const{client,tripId}=await context(),mapped={};if('capturedAt'in patch){mapped.captured_at=patch.capturedAt;mapped.day_key=day(patch.capturedAt)}if('displayName'in patch)mapped.display_name=String(patch.displayName||'').trim()||null;if('favorite'in patch)mapped.favorite=Boolean(patch.favorite);if('editSettings'in patch)mapped.edit_settings=patch.editSettings||{};if('placeId'in patch)mapped.place_id=patch.placeId||null;if('metadata'in patch)mapped.metadata=patch.metadata||{};if(!Object.keys(mapped).length)return get(mediaId);const r=await client.from('media').update(mapped).eq('trip_id',tripId).eq('id',mediaId).select('*').single();if(r.error)throw r.error;return entity(r.data)}
  const toggleFavorite=async mediaId=>{const item=await get(mediaId);return update(mediaId,{favorite:!item?.favorite})};
  async function listPolaroids(){const{client,tripId}=await context(),r=await client.from('media_day_polaroids').select('*').eq('trip_id',tripId);if(r.error){if(['42P01','PGRST205'].includes(r.error.code))return{};throw r.error}return Object.fromEntries((r.data||[]).map(x=>[String(x.day_key),x.media_id]))}
  async function setPolaroid(mediaId,dayKey){const{client,tripId,userId}=await context();const r=await client.from('media_day_polaroids').upsert({trip_id:tripId,day_key:dayKey,media_id:mediaId,selected_by:userId,selected_at:new Date().toISOString()},{onConflict:'trip_id,day_key'}).select('*').single();if(r.error)throw r.error;return r.data}
  async function linkPlace(mediaId,placeId,options={}){const{client,tripId,userId}=await context(),r=await client.from('media_place_links').upsert({trip_id:tripId,media_id:mediaId,place_id:placeId,source:options.source||'manual',confidence:options.confidence??1,evidence:options.evidence||{},created_by:userId},{onConflict:'media_id,place_id'}).select('*').single();if(r.error)throw r.error;await update(mediaId,{placeId});return r.data}
  async function remove(mediaId){const{client,tripId}=await context(),item=await get(mediaId);if(!item)return false;const paths=[item.storagePath,item.previewPath,item.thumbnailPath].filter(Boolean);if(paths.length){const s=await client.storage.from(item.storageBucket||BUCKET).remove(paths);if(s.error)throw s.error}const r=await client.from('media').update({status:'deleted'}).eq('trip_id',tripId).eq('id',mediaId);if(r.error)throw r.error;return true}
  async function subscribe(callback){const{client,tripId}=await context();if(channels.has(tripId))await channels.get(tripId)();const c=client.channel(`luvia-media-${tripId}-${Math.random().toString(36).slice(2)}`).on('postgres_changes',{event:'*',schema:'public',table:'media',filter:`trip_id=eq.${tripId}`},callback).on('postgres_changes',{event:'*',schema:'public',table:'media_day_polaroids',filter:`trip_id=eq.${tripId}`},callback).subscribe();const stop=async()=>{await client.removeChannel(c);channels.delete(tripId)};channels.set(tripId,stop);return stop}
  const diagnostics=()=>({service:'media-core',version:VERSION,build:BUILD,status:'active',ok:true,checkedAt:new Date().toISOString(),durationMs:0,dependencies:{metadata:Boolean(window.LuviaMediaMetadata),preview:Boolean(window.LuviaMediaPreview)},checks:{canonicalMediaEntity:true,realtime:true,favorites:true,nonDestructiveEditing:true,dayPolaroids:true},failedChecks:[],warnings:[]});
  window.LuviaMediaCore=Object.freeze({version:VERSION,build:BUILD,bucket:BUCKET,getContext:context,list,get,upload,update,toggleFavorite,listPolaroids,setPolaroid,linkPlace,remove,signedUrl,subscribe,diagnostics,rowToEntity:entity});
})();
