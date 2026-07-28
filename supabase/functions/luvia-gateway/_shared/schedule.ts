type SupabaseClient={rpc:(name:string,args:Record<string,unknown>)=>Promise<{data:any,error:any}>};
export async function scheduleAction(action:string,payload:any,client:SupabaseClient){
  const tripId=String(payload?.tripId||'');
  if(!tripId)throw Object.assign(new Error('Trip-ID fehlt.'),{code:'TRIP_ID_REQUIRED',status:400});
  if(action==='schedule.list'){
    const {data,error}=await client.rpc('luvia_list_schedule_events',{p_trip_id:tripId});
    if(error)throw Object.assign(new Error(error.message||'Tagesplan konnte nicht geladen werden.'),{code:'SCHEDULE_LIST_FAILED',status:400});
    return{data:{events:Array.isArray(data)?data:[]}};
  }
  if(action==='schedule.upsert'){
    const event=payload?.event||{};
    const {data,error}=await client.rpc('luvia_upsert_schedule_event',{p_trip_id:tripId,p_event:event});
    if(error)throw Object.assign(new Error(error.message||'Tagesplaneintrag konnte nicht gespeichert werden.'),{code:'SCHEDULE_UPSERT_FAILED',status:400});
    return{data};
  }
  if(action==='schedule.delete'){
    const sourceKey=String(payload?.sourceKey||'');
    if(!sourceKey)throw Object.assign(new Error('Schedule-Schlüssel fehlt.'),{code:'SCHEDULE_SOURCE_KEY_REQUIRED',status:400});
    const {data,error}=await client.rpc('luvia_delete_schedule_event',{p_trip_id:tripId,p_source_key:sourceKey});
    if(error)throw Object.assign(new Error(error.message||'Tagesplaneintrag konnte nicht gelöscht werden.'),{code:'SCHEDULE_DELETE_FAILED',status:400});
    return{data:{deleted:Boolean(data)}};
  }
  throw Object.assign(new Error('Schedule-Aktion unbekannt.'),{code:'ACTION_NOT_FOUND',status:404});
}
