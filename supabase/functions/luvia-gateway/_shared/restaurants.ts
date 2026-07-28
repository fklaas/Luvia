import { placesAction } from './places.ts';

type SupabaseClient = { rpc:(name:string,args:Record<string,unknown>)=>Promise<{data:any,error:any}> };
const metrics={imports:0,successes:0,failures:0,placesCreated:0,placesReused:0,duplicatesPrevented:0,lists:0,lastImportAt:null as string|null,lastError:null as unknown};

function dbPlace(place:any){
  return {
    provider:'google-places',provider_place_id:String(place?.id||'').replace(/^places\//,''),name:place?.name||place?.displayName||'',
    address:place?.formattedAddress||place?.shortAddress||'',latitude:place?.location?.latitude??null,longitude:place?.location?.longitude??null,
    maps_url:place?.mapsUri||null,website:place?.website||null,phone:place?.phone||null,rating:place?.rating??null,
    rating_count:place?.userRatingCount??0,price_level:Number.isFinite(Number(place?.priceLevel))?Number(place.priceLevel):null,
    categories:Array.isArray(place?.types)?place.types:[],attributes:{primaryType:place?.primaryType||null,primaryTypeLabel:place?.primaryTypeLabel||null,businessStatus:place?.businessStatus||null,openNow:place?.openNow??null,features:place?.features||{},accessibility:place?.accessibility||null},
    opening_hours:place?.openingHours||[],raw_provider_data:place?.raw||place,source_updated_at:new Date().toISOString()
  };
}

export async function restaurantAction(action:string,payload:any,client:SupabaseClient){
  if(action==='restaurant.health')return{data:{status:'ok',service:'restaurant-lifecycle',version:'3.7.1',metrics:{...metrics}}};
  if(action==='restaurant.list'){
    const tripId=String(payload?.tripId||''); if(!tripId)throw Object.assign(new Error('Trip-ID fehlt.'),{code:'TRIP_ID_REQUIRED',status:400});
    const {data,error}=await client.rpc('luvia_list_restaurant_entities',{p_trip_id:tripId});
    if(error)throw Object.assign(new Error(error.message||'Restaurants konnten nicht geladen werden.'),{code:'RESTAURANT_LIST_FAILED',status:400});
    metrics.lists++; return{data:{entities:Array.isArray(data)?data:[]}};
  }
  if(action==='restaurant.lifecycle.update'){
    const tripId=String(payload?.tripId||''),tripPlaceId=String(payload?.tripPlaceId||''),status=String(payload?.status||'');
    if(!tripId||!tripPlaceId||!status)throw Object.assign(new Error('Trip-ID, Restaurant-Verknüpfung und Status werden benötigt.'),{code:'LIFECYCLE_INPUT_REQUIRED',status:400});
    const rawPatch=payload?.patch&&typeof payload.patch==='object'?payload.patch:{};
    const cleanPatch=Object.fromEntries(Object.entries(rawPatch).filter(([,value])=>value!==undefined&&value!==null));
    const allowedReservationStatuses=new Set(['idea','requested','reserved','confirmed','cancelled','visited']);
    if('reservationStatus' in cleanPatch&&!allowedReservationStatuses.has(String(cleanPatch.reservationStatus)))delete cleanPatch.reservationStatus;
    const {data,error}=await client.rpc('luvia_update_restaurant_lifecycle',{p_trip_id:tripId,p_trip_place_id:tripPlaceId,p_status:status,p_patch:cleanPatch});
    if(error){
      const constraint=String(error.message||'').includes('restaurants_reservation_status_check');
      throw Object.assign(new Error(constraint?'Der Reservierungsstatus war ungültig und wurde nicht gespeichert. Bitte erneut versuchen.':error.message||'Restaurantstatus konnte nicht gespeichert werden.'),{code:constraint?'RESERVATION_STATUS_INVALID':'LIFECYCLE_UPDATE_FAILED',status:400});
    }
    return{data};
  }
  if(action==='restaurant.remove'){
    const tripId=String(payload?.tripId||''),tripPlaceId=String(payload?.tripPlaceId||'');
    if(!tripId||!tripPlaceId)throw Object.assign(new Error('Trip-ID und Restaurant-Verknüpfung werden benötigt.'),{code:'REMOVE_INPUT_REQUIRED',status:400});
    const {data,error}=await client.rpc('luvia_remove_restaurant_from_trip',{p_trip_id:tripId,p_trip_place_id:tripPlaceId});
    if(error)throw Object.assign(new Error(error.message||'Restaurant konnte nicht entfernt werden.'),{code:'RESTAURANT_REMOVE_FAILED',status:400});
    return{data:{removed:Boolean(data)}};
  }
  if(action==='restaurant.clear'){
    const tripId=String(payload?.tripId||''),scope=String(payload?.scope||'saved');
    if(!tripId||!['saved','favorites'].includes(scope))throw Object.assign(new Error('Trip-ID oder Löschbereich ist ungültig.'),{code:'CLEAR_INPUT_REQUIRED',status:400});
    const {data,error}=await client.rpc('luvia_clear_restaurants',{p_trip_id:tripId,p_scope:scope});
    if(error)throw Object.assign(new Error(error.message||'Restaurants konnten nicht entfernt werden.'),{code:'RESTAURANT_CLEAR_FAILED',status:400});
    return{data:{affected:Number(data||0),scope}};
  }
  if(action==='restaurant.feedback'){
    const tripId=String(payload?.tripId||'');if(!tripId)throw Object.assign(new Error('Trip-ID fehlt.'),{code:'TRIP_ID_REQUIRED',status:400});
    const {data,error}=await client.rpc('luvia_record_place_recommendation_feedback',{p_trip_id:tripId,p_place_id:payload?.placeId||null,p_provider_place_id:payload?.providerPlaceId||null,p_decision:payload?.decision||'shown',p_match_score:payload?.matchScore??null,p_reasons:payload?.reasons||[],p_context:payload?.context||{}});
    if(error)throw Object.assign(new Error(error.message||'Empfehlungsentscheidung konnte nicht gespeichert werden.'),{code:'FEEDBACK_FAILED',status:400});
    return{data:{id:data}};
  }
  if(action!=='restaurant.import')throw Object.assign(new Error('Restaurant-Aktion unbekannt.'),{code:'ACTION_NOT_FOUND',status:404});
  const tripId=String(payload?.tripId||''); const providerPlaceId=String(payload?.providerPlaceId||payload?.placeId||'').replace(/^places\//,'');
  if(!tripId)throw Object.assign(new Error('Trip-ID fehlt.'),{code:'TRIP_ID_REQUIRED',status:400});
  if(!providerPlaceId)throw Object.assign(new Error('Google Place ID fehlt.'),{code:'PLACE_ID_REQUIRED',status:400});
  metrics.imports++;
  try{
    const details=await placesAction('places.details',{placeId:providerPlaceId,languageCode:payload?.languageCode||'de',regionCode:payload?.regionCode||'DE'});
    const place=details?.data?.place; if(!place?.id)throw Object.assign(new Error('Restaurant wurde beim Provider nicht gefunden.'),{code:'PLACE_NOT_FOUND',status:404});
    const {data,error}=await client.rpc('luvia_import_restaurant_entity',{p_trip_id:tripId,p_place:dbPlace(place),p_trip_place:{module_key:'restaurants',status:payload?.tripPlace?.status||'idea',position:payload?.tripPlace?.position||0,is_favorite:payload?.tripPlace?.isFavorite===true,user_notes:payload?.tripPlace?.userNotes||null,planned_date:payload?.tripPlace?.plannedDate||null,planned_time:payload?.tripPlace?.plannedTime||null},p_restaurant:{reservation_status:payload?.restaurant?.reservationStatus||'idea',reservation_date:payload?.restaurant?.reservationDate||null,reservation_time:payload?.restaurant?.reservationTime||null,reservation_name:payload?.restaurant?.reservationName||null,reservation_url:payload?.restaurant?.reservationUrl||null,menu_url:payload?.restaurant?.menuUrl||null,metadata:{importedBy:'luvia-gateway',provider:'google-places'}}});
    if(error){const code=String(error.message||'').includes('NOT_AUTHORIZED')?'NOT_AUTHORIZED':'PLACE_IMPORT_FAILED';throw Object.assign(new Error(error.message||'Restaurant konnte nicht importiert werden.'),{code,status:code==='NOT_AUTHORIZED'?403:400});}
    metrics.successes++;metrics.lastImportAt=new Date().toISOString();
    if(data?.created?.place)metrics.placesCreated++;else metrics.placesReused++;
    if(data?.alreadyAdded)metrics.duplicatesPrevented++;
    return{data:{success:true,...data,providerPlace:place}};
  }catch(error){metrics.failures++;metrics.lastError={at:new Date().toISOString(),message:error instanceof Error?error.message:String(error)};throw error;}
}
export function restaurantDiagnostics(){return{version:'3.7.1',metrics:{...metrics}};}
