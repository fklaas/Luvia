(() => {
  'use strict';
  const requireClient=client=>{const value=client||window.ParisCloud?.client||window.ParisSupabaseClient;if(!value)throw new Error('Cloud-Verbindung ist noch nicht bereit.');return value};
  const parseJson=value=>{if(value&&typeof value==='object')return value;try{return JSON.parse(value||'null')||{}}catch{return {}}};
  async function listTrips(client){
    const response=await requireClient(client).rpc('paris_list_my_trips');
    if(response.error)throw response.error;
    return (response.data||[]).map(row=>{
      const destination=parseJson(row.destination_context);
      return {...row,destination:{...destination,name:destination.name||row.destination_name||row.destination||'',country:destination.country||row.destination_country||'',countryCode:destination.countryCode||row.destination_country_code||'',placeId:destination.placeId||row.destination_place_id||'',formattedAddress:destination.formattedAddress||row.destination_formatted_address||'',latitude:destination.latitude??row.destination_latitude??null,longitude:destination.longitude??row.destination_longitude??null}};
    });
  }

  async function saveProfile(client,trip){
    const t=trip||{},d=t.destination&&typeof t.destination==='object'?t.destination:{};
    const response=await requireClient(client).rpc('luvia_save_trip_profile',{p_trip_id:t.id||t.tripId,p_trip_name:t.title||t.tripName||'Unsere Reise',p_destination_context:d,p_symbol:t.symbol||'❤️',p_accent:t.accent||'#ee6f83',p_start_date:t.startDate||null,p_end_date:t.endDate||null});
    if(response.error)throw response.error;return response.data;
  }
  async function joinTrip(client,{code,memberName}){const response=await requireClient(client).rpc('join_trip_by_code',{join_code:String(code||'').trim().toUpperCase(),member_name:String(memberName||'').trim()});if(response.error)throw response.error;return response.data}
  window.LuviaLegacyParisCloud=Object.freeze({listTrips,saveProfile,joinTrip});
})();
