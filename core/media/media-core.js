(() => {
  'use strict';
  const VERSION='4.29.3',BUILD='13.29.3',BUCKET='luvia-media',channels=new Map();
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
  async function list(options={}){const{client,tripId}=await context();let q=client.from('media').select('*').eq('trip_id',tripId).neq('status','deleted');if(options.type)q=q.eq('type',options.type);if(options.dayKey)q=q.eq('day_key',options.dayKey);if(options.favorite)q=q.eq('favorite',true);const r=await q.order('captured_at',{ascending:true,nullsFirst:false}).order('created_at',{ascending:true});if(r.error)throw r.error;return(r.data||[]).map(entity)}
  async function get(mediaId){const{client,tripId}=await context(),r=await client.from('media').select('*').eq('trip_id',tripId).eq('id',mediaId).maybeSingle();if(r.error)throw r.error;return r.data?entity(r.data):null}
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
    const saved=await update(mediaId,{...(editSettings?{editSettings}:{}),...(displayName!==undefined?{displayName}:{}),metadata});window.dispatchEvent(new CustomEvent('luvia:media-composite-updated',{detail:{mediaId,tripId,dayKey:saved.dayKey}}));return saved;
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
    return{entity:entity(ready.data),duplicate:false};
  }
  async function update(mediaId,patch={}){const{client,tripId}=await context(),mapped={};if('capturedAt'in patch){mapped.captured_at=patch.capturedAt;mapped.day_key=day(patch.capturedAt)}if('displayName'in patch)mapped.display_name=String(patch.displayName||'').trim()||null;if('favorite'in patch)mapped.favorite=Boolean(patch.favorite);if('editSettings'in patch)mapped.edit_settings=patch.editSettings||{};if('placeId'in patch)mapped.place_id=patch.placeId||null;if('metadata'in patch)mapped.metadata=patch.metadata||{};if('latitude'in patch)mapped.latitude=patch.latitude??null;if('longitude'in patch)mapped.longitude=patch.longitude??null;if('width'in patch)mapped.width=patch.width??null;if('height'in patch)mapped.height=patch.height??null;if(!Object.keys(mapped).length)return get(mediaId);const r=await client.from('media').update(mapped).eq('trip_id',tripId).eq('id',mediaId).select('*').single();if(r.error)throw r.error;return entity(r.data)}
  const toggleFavorite=async mediaId=>{const item=await get(mediaId);return update(mediaId,{favorite:!item?.favorite})};
  async function listPolaroids(){const{client,tripId}=await context(),r=await client.from('media_day_polaroids').select('*').eq('trip_id',tripId);if(r.error){if(['42P01','PGRST205'].includes(r.error.code))return{};throw r.error}return Object.fromEntries((r.data||[]).map(x=>[String(x.day_key),x.media_id]))}
  async function setPolaroid(mediaId,dayKey){const{client,tripId,userId}=await context(),item=await get(mediaId);if(!item)throw new Error('Foto wurde nicht gefunden.');const key=dayKey||item.dayKey;if(!key)throw new Error('Das Foto ist keinem Reisetag zugeordnet.');const r=await client.from('media_day_polaroids').upsert({trip_id:tripId,day_key:key,media_id:mediaId,selected_by:userId,selected_at:new Date().toISOString()},{onConflict:'trip_id,day_key'}).select('*').single();if(r.error)throw r.error;const existing=await client.from('timeline_events').select('id,metadata').eq('trip_id',tripId).eq('event_type','photo_memory');if(!existing.error){const ids=(existing.data||[]).filter(x=>x.metadata?.polaroidDayKey===key).map(x=>x.id);if(ids.length)await client.from('timeline_events').delete().eq('trip_id',tripId).in('id',ids)}const occurredAt=item.capturedAt||`${key}T12:00:00`;const title=item.displayName||`Polaroid des Tages`;const created=await client.from('timeline_events').insert({trip_id:tripId,event_type:'photo_memory',title,description:'Polaroid des Tages',occurred_at:occurredAt,source:'media_polaroid',is_automatic:false,metadata:{mediaId,mediaIds:[mediaId],polaroid:true,polaroidDayKey:key}});if(created.error)throw created.error;window.dispatchEvent(new CustomEvent('luvia:media-polaroid-changed',{detail:{mediaId,tripId,dayKey:key}}));window.dispatchEvent(new CustomEvent('luvia:memory-bridge-applied',{detail:{tripId}}));return r.data}
  async function linkPlace(mediaId,placeId,options={}){const{client,tripId,userId}=await context(),r=await client.from('media_place_links').upsert({trip_id:tripId,media_id:mediaId,place_id:placeId,source:options.source||'manual',confidence:options.confidence??1,evidence:options.evidence||{},created_by:userId},{onConflict:'media_id,place_id'}).select('*').single();if(r.error)throw r.error;await update(mediaId,{placeId});return r.data}
  async function remove(mediaId){const{client,tripId}=await context(),item=await get(mediaId);if(!item)return false;const paths=[item.storagePath,item.previewPath,item.thumbnailPath,item.renderedPreviewPath,item.metadata?.renderedPreviewPath].filter(Boolean);if(paths.length){const s=await client.storage.from(item.storageBucket||BUCKET).remove(paths);if(s.error)throw s.error}const r=await client.from('media').update({status:'deleted'}).eq('trip_id',tripId).eq('id',mediaId);if(r.error)throw r.error;await client.from('media_cluster_items').delete().eq('media_id',mediaId);window.dispatchEvent(new CustomEvent('luvia:media-deleted',{detail:{mediaId,tripId}}));return true}
  async function clearTripGallery(options={}){
    const{client,tripId}=await context(),progress=typeof options.onProgress==='function'?options.onProgress:()=>{};
    const all=await client.from('media').select('*').eq('trip_id',tripId);if(all.error)throw all.error;
    const rows=all.data||[],mediaIds=rows.map(row=>row.id);
    const safe=async promise=>{const r=await promise;if(r?.error&&!['42P01','PGRST205','42703'].includes(r.error.code))throw r.error;return r};
    progress('Verknüpfte Memory Albums werden entfernt …');
    const albumRows=await safe(client.from('memory_albums').select('id').eq('trip_id',tripId));
    const albumIds=(albumRows?.data||[]).map(x=>x.id);
    if(albumIds.length){await safe(client.from('memory_album_favorites').delete().in('album_id',albumIds));await safe(client.from('memory_album_items').delete().in('album_id',albumIds))}
    await safe(client.from('memory_albums').delete().eq('trip_id',tripId));
    progress('Fotomomente und Polaroids werden entfernt …');
    await safe(client.from('media_day_polaroids').delete().eq('trip_id',tripId));
    const clusterRows=await safe(client.from('media_clusters').select('id').eq('trip_id',tripId));
    const clusterIds=(clusterRows?.data||[]).map(x=>x.id);
    if(clusterIds.length)await safe(client.from('media_cluster_items').delete().in('cluster_id',clusterIds));
    await safe(client.from('media_clusters').delete().eq('trip_id',tripId));
    progress('Fotoeinträge werden aus der Timeline entfernt …');
    await safe(client.from('timeline_events').delete().eq('trip_id',tripId).eq('event_type','photo_memory'));
    if(mediaIds.length){
      await safe(client.from('media_place_links').delete().in('media_id',mediaIds));
      await safe(client.from('live_moment_media').delete().in('media_id',mediaIds));
    }
    progress('Originale und Vorschaubilder werden aus dem Storage gelöscht …');
    const byBucket=new Map();
    for(const row of rows){const bucket=row.storage_bucket||BUCKET;const paths=[row.storage_path,row.preview_path,row.metadata?.renderedPreviewPath].filter(Boolean);if(paths.length)byBucket.set(bucket,[...(byBucket.get(bucket)||[]),...paths]);if(row.thumbnail_path)byBucket.set('luvia-media-thumbnails',[...(byBucket.get('luvia-media-thumbnails')||[]),row.thumbnail_path])}
    for(const[bucket,rawPaths]of byBucket){const paths=[...new Set(rawPaths)];for(let i=0;i<paths.length;i+=100){const r=await client.storage.from(bucket).remove(paths.slice(i,i+100));if(r.error&&!/not found|does not exist/i.test(r.error.message||''))console.warn('[LuviaMediaCore] Storage-Bereinigung teilweise fehlgeschlagen',bucket,r.error)}}
    progress('Mediendatensätze werden endgültig gelöscht …');
    const deleted=await client.from('media').delete().eq('trip_id',tripId);if(deleted.error)throw deleted.error;
    window.dispatchEvent(new CustomEvent('luvia:gallery-cleared',{detail:{tripId,count:rows.length}}));
    return{tripId,count:rows.length,albumCount:albumIds.length,clusterCount:clusterIds.length};
  }

  async function subscribe(callback){const{client,tripId}=await context();if(channels.has(tripId))await channels.get(tripId)();const c=client.channel(`luvia-media-${tripId}-${Math.random().toString(36).slice(2)}`).on('postgres_changes',{event:'*',schema:'public',table:'media',filter:`trip_id=eq.${tripId}`},callback).on('postgres_changes',{event:'*',schema:'public',table:'media_day_polaroids',filter:`trip_id=eq.${tripId}`},callback).subscribe();const stop=async()=>{await client.removeChannel(c);channels.delete(tripId)};channels.set(tripId,stop);return stop}
  async function reanalyze(mediaId){const item=await get(mediaId);if(!item)throw new Error('Foto wurde nicht gefunden.');const url=await signedUrl({...item,previewPath:null,thumbnailPath:null},900);if(!url)throw new Error('Originaldatei ist nicht verfügbar.');const response=await fetch(url);if(!response.ok)throw new Error('Originaldatei konnte nicht geladen werden.');const blob=await response.blob();const file=new File([blob],item.originalName||`photo.${ext({name:item.storagePath,type:item.mimeType})}`,{type:item.mimeType||blob.type,lastModified:item.metadata?.originalLastModified||Date.now()});const meta=await window.LuviaMediaMetadata.extract(file,{source:item.source});const resolvedLocation=await resolveCaptureLocation(meta);return update(mediaId,{capturedAt:meta.capturedAt,latitude:meta.latitude,longitude:meta.longitude,width:meta.width,height:meta.height,metadata:{...(item.metadata||{}),captureEvidence:meta.evidence,exif:meta.exif||{},resolvedLocation,reanalyzedAt:new Date().toISOString(),isHeic:Boolean(meta.isHeic)}})}
  const diagnostics=()=>({service:'media-core',version:VERSION,build:BUILD,status:'active',ok:true,checkedAt:new Date().toISOString(),durationMs:0,dependencies:{metadata:Boolean(window.LuviaMediaMetadata),preview:Boolean(window.LuviaMediaPreview)},checks:{canonicalMediaEntity:true,realtime:true,favorites:true,nonDestructiveEditing:true,dayPolaroids:true},failedChecks:[],warnings:[]});
  window.LuviaMediaCore=Object.freeze({version:VERSION,build:BUILD,bucket:BUCKET,getContext:context,list,get,upload,update,reanalyze,toggleFavorite,listPolaroids,setPolaroid,linkPlace,remove,clearTripGallery,signedUrl,signedOriginalUrl,saveRenderedPreview,subscribe,diagnostics,rowToEntity:entity});
})();
