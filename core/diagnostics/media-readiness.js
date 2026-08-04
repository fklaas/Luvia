(() => {
  'use strict';
  const VERSION='4.27.5';
  const BUILD='13.27.5';
  const now=()=>new Date().toISOString();
  const elapsed=start=>Math.max(0,Math.round((performance.now()-start)*100)/100);
  async function probeTable(client,table,columns='*'){
    const started=performance.now();
    try{const q=await client.from(table).select(columns,{head:true,count:'exact'}).limit(1);return{ok:!q.error,durationMs:elapsed(started),count:q.count??null,error:q.error?.message||null};}
    catch(error){return{ok:false,durationMs:elapsed(started),count:null,error:error?.message||String(error)}}
  }
  async function probeBucket(client,bucket,tripId){
    const started=performance.now();
    try{const r=await client.storage.from(bucket).list(tripId||'',{limit:1});return{ok:!r.error,durationMs:elapsed(started),error:r.error?.message||null,items:r.data?.length||0};}
    catch(error){return{ok:false,durationMs:elapsed(started),error:error?.message||String(error),items:0}}
  }
  async function run(options={}){
    const started=performance.now(), warnings=[], failedChecks=[];
    const checks={
      centralMediaContract:Boolean(window.LuviaKernelVersion?.core==='4.27.5'),
      legacyGallerySync:Boolean(window.ParisSync?.gallery||window.ParisSync?.get?.('gallery')),
      legacyLiveMomentSync:Boolean(window.ParisSync?.liveMoments||window.ParisSync?.get?.('liveMoments')),
      placeCore:Boolean(window.LuviaPlaceCore&&window.LuviaPlaceLifecycle),
      canonicalPlaceRegistry:Boolean(window.LuviaPlaceRegistry),
      timelineCore:Boolean(window.LuviaTimelineCore),
      diagnosticsRegistry:Boolean(window.LuviaServiceRegistry)
    };
    const client=window.ParisCloud?.client||window.LuviaSupabase?.client?.()||window.LuviaSupabase?.getClient?.()||null;
    const tripId=options.tripId||window.LuviaTripContext?.getActiveTripId?.()||window.LuviaTripContext?.get?.()?.id||null;
    const dependencies={client:Boolean(client),tripId:Boolean(tripId)};
    if(client){
      checks.mediaTable=await probeTable(client,'media','id,trip_id,user_id,entity_type,entity_id,storage_path,status,metadata');
      checks.galleryPhotosTable=await probeTable(client,'gallery_photos','id,trip_id,created_by,storage_path,taken_at');
      checks.liveMomentStatusTable=await probeTable(client,'live_moment_status','trip_id,moment_key,linked_photo_id,updated_at');
      checks.parisGalleryBucket=await probeBucket(client,'paris-gallery',tripId);
      for(const [name,value] of Object.entries(checks)) if(value&&typeof value==='object'&&value.ok===false) failedChecks.push(name);
    }else warnings.push('Kein initialisierter Supabase-Client; Cloud-, Tabellen- und Bucket-Prüfungen wurden nicht live ausgeführt.');
    if(!checks.centralMediaContract) failedChecks.push('centralMediaContract');
    warnings.push('gallery_photos/paris-gallery ist ein aktiver Legacy-Datenpfad neben der zentralen media-Tabelle.');
    warnings.push('live_moment_status referenziert maximal ein linked_photo_id; das Zielmodell null bis viele Media-Referenzen ist noch nicht umgesetzt.');
    return {service:'media-readiness',version:VERSION,build:BUILD,status:failedChecks.length?'degraded':'active',ok:failedChecks.length===0,checkedAt:now(),durationMs:elapsed(started),dependencies,checks,failedChecks,warnings,gate:'READY WITH MIGRATION'};
  }
  function diagnostics(){return{service:'media-readiness',version:VERSION,build:BUILD,status:'active',ok:true,checkedAt:now(),durationMs:0,dependencies:{placeCore:Boolean(window.LuviaPlaceCore),timelineCore:Boolean(window.LuviaTimelineCore),serviceRegistry:Boolean(window.LuviaServiceRegistry)},checks:{staticAuditComplete:true,newUploadImplemented:false},failedChecks:[],warnings:['Live-Prüfung über run() erforderlich.'],gate:'READY WITH MIGRATION'};}
  window.LuviaMediaReadiness=Object.freeze({version:VERSION,build:BUILD,run,diagnostics});
})();
