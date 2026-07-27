(() => {
  'use strict';
  const requireClient=client=>{const value=client||window.ParisCloud?.client||window.ParisSupabaseClient;if(!value)throw new Error('Cloud-Verbindung ist noch nicht bereit.');return value};
  async function listTrips(client){const response=await requireClient(client).rpc('paris_list_my_trips');if(response.error)throw response.error;return response.data||[]}
  async function joinTrip(client,{code,memberName}){const response=await requireClient(client).rpc('join_trip_by_code',{join_code:String(code||'').trim().toUpperCase(),member_name:String(memberName||'').trim()});if(response.error)throw response.error;return response.data}
  window.LuviaLegacyParisCloud=Object.freeze({listTrips,joinTrip});
})();
