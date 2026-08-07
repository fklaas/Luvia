(function(){
'use strict';
const VERSION='0.3.0';
function createSupabaseRepository(client){
 if(!client?.from)throw new Error('Supabase-Client erforderlich.');
 const fail=(label,error)=>{if(error)throw new Error(`${label}: ${error.message||error}`);};
 return Object.freeze({
  async create(input){const {data,error}=await client.from('bookings').insert(input).select('*').single();fail('Booking konnte nicht erstellt werden',error);return data;},
  async get(id){const {data,error}=await client.from('bookings').select('*').eq('id',id).maybeSingle();fail('Booking konnte nicht geladen werden',error);return data;},
  async listForTrip(tripId){const {data,error}=await client.from('bookings').select('*').eq('trip_id',tripId).order('start_at',{ascending:true,nullsFirst:false}).order('created_at',{ascending:false});fail('Bookings konnten nicht geladen werden',error);return data||[];},
  async transition(id,status,patch={}){const {data,error}=await client.rpc('luvia_transition_booking',{p_booking_id:id,p_status:status,p_patch:patch});fail('Booking-Status konnte nicht geändert werden',error);return data;},
  async addMessage(input){const {data,error}=await client.from('booking_messages').insert(input).select('*').single();fail('Booking-Nachricht konnte nicht gespeichert werden',error);return data;},
  async updateMessage(id,patch){const {data,error}=await client.from('booking_messages').update(patch).eq('id',id).select('*').single();fail('Booking-Nachricht konnte nicht aktualisiert werden',error);return data;},
  async messages(id){const {data,error}=await client.from('booking_messages').select('*').eq('booking_id',id).order('created_at',{ascending:true});fail('Booking-Nachrichten konnten nicht geladen werden',error);return data||[];},
  async findMessageByIdempotency(key){if(!key)return null;const {data,error}=await client.from('booking_messages').select('*').eq('idempotency_key',key).maybeSingle();fail('Booking-Nachricht konnte nicht geprüft werden',error);return data;}
 });
}
window.LuviaBookingRepository=Object.freeze({version:VERSION,createSupabaseRepository});
})();
