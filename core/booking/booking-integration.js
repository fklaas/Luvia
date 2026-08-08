(() => {
  'use strict';
  const VERSION='1.2.0';
  let client=null, repository=null, initialized=false, initPromise=null;

  const mapType=type=>({
    restaurant:'restaurant',
    accommodation:'hotel',
    attraction:'activity',
    mobility:'transport'
  }[String(type||'').toLowerCase()]||'other');

  const activeTrip=()=>window.LuviaTripStore?.snapshot?.()?.activeTrip||null;
  const activeTripId=()=>activeTrip()?.id||activeTrip()?.tripId||null;
  const clean=v=>String(v??'').trim();

  function providerId(place={}){
    return clean(place.providerPlaceId||place.provider_place_id||place.googlePlaceId||place.google_place_id||place.name||place.id);
  }

  function internalUuid(value){
    const v=clean(value);
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)?v:null;
  }

  async function init(){
    if(initialized)return api;
    if(initPromise)return initPromise;
    initPromise=(async()=>{
      client=await window.LuviaSupabaseService.start();
      repository=window.LuviaBookingRepository.createSupabaseRepository(client);
      window.LuviaBookingCore.configure({repository});
      window.LuviaBookingCommunication?.configure?.({repository,mode:'production'});
      initialized=true;
      window.dispatchEvent(new CustomEvent('luvia:booking-ready',{detail:{version:VERSION}}));
      return api;
    })().catch(error=>{initPromise=null;throw error;});
    return initPromise;
  }

  async function createForPlace(input={}){
    await init();
    const tripId=input.tripId||activeTripId();
    if(!tripId)throw new Error('Keine aktive Reise verfügbar.');
    const place=input.place||{};
    const placeType=String(input.placeType||place.primaryType||place.primary_type||'other').toLowerCase();
    const startAt=input.startAt||null;
    const endAt=input.endAt||null;
    const contactEmail=clean(input.email||place.email||place.contactEmail||place.contact_email);
    const contactPhone=clean(place.phone||place.phoneNumber||place.internationalPhoneNumber);
    const website=clean(place.website||place.websiteUri||place.website_uri);
    const row=await window.LuviaBookingCore.create({
      tripId,
      tripPlaceId:internalUuid(input.tripPlaceId||place.tripPlaceId||place.trip_place_id),
      placeId:internalUuid(input.placeId||place.internalPlaceId||place.place_id),
      type:mapType(placeType),
      status:'draft',
      channel:contactEmail?'email':'manual',
      title:clean(input.title||place.name)||'Buchungsanfrage',
      startAt,
      endAt,
      partySize:Number(input.partySize||1),
      contact:{
        ...(contactEmail?{email:contactEmail}:{}),
        ...(contactPhone?{phone:contactPhone}:{}),
        ...(website?{website}:{}),
      },
      request:{
        requesterName:clean(input.requesterName),
        note:clean(input.note),
        providerPlaceId:providerId(place),
        sourcePlaceType:placeType,
        source:'luvia_places',
        website:website||null,
        reservationUrl:clean(place.reservationUrl||place.reservation_url||place.bookingUrl||place.booking_url)||null
      },
      metadata:{
        integrationVersion:VERSION,
        destination:activeTrip()?.destination||null
      }
    });
    let ready=await window.LuviaBookingCore.transition(row.id,'ready',{metadata:{createdFrom:'places'}});
    window.dispatchEvent(new CustomEvent('luvia:booking-changed',{detail:{booking:ready,action:'created'}}));
    if(!ready?.contact?.email){
      try{await resolveRoute(ready.id);ready=await get(ready.id)||ready}catch(error){console.warn('[Luvia Booking] automatische Buchungskanal-Ermittlung nicht verfügbar',error)}
    }
    return ready;
  }

  async function listForTrip(tripId=activeTripId()){
    await init();
    if(!tripId)return [];
    const {data,error}=await client.from('booking_integration_summary').select('*').eq('trip_id',tripId).order('start_at',{ascending:true,nullsFirst:false}).order('created_at',{ascending:false});
    if(error)throw error;
    return data||[];
  }

  async function get(id){
    await init();
    const {data,error}=await client.from('booking_integration_summary').select('*').eq('id',id).maybeSingle();
    if(error)throw error;
    return data;
  }

  async function transition(id,status,patch={}){
    await init();
    const {data,error}=await client.rpc('luvia_transition_booking',{p_booking_id:id,p_status:status,p_patch:patch||{}});
    if(error)throw new Error(error.message||'Booking-Status konnte nicht geändert werden.');
    window.dispatchEvent(new CustomEvent('luvia:booking-changed',{detail:{booking:data,action:'transition',status}}));
    return data;
  }

  async function functionError(error,fallback){
    if(!error)return new Error(fallback);
    try{
      const ctx=error.context;
      if(ctx&&typeof ctx.json==='function'){const body=await ctx.json();const detail=body?.details||body?.error||body?.message;if(detail)return new Error(String(detail));}
    }catch{}
    return new Error(error.message||fallback);
  }

  async function planRoute(id,excludedChannels=[]){
    await init();
    const {data,error}=await client.rpc('luvia_booking_plan_route',{
      p_booking_id:id,
      p_excluded_channels:Array.isArray(excludedChannels)?excludedChannels:[]
    });
    if(error)throw error;
    return data;
  }


  async function updateContact(id,email){
    await init();
    const booking=await get(id);
    if(!booking)throw new Error('Buchung wurde nicht gefunden.');
    const value=clean(email).toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))throw new Error('Bitte eine gültige E-Mail-Adresse eingeben.');
    const contact={...(booking.contact||{}),email:value};
    const {data,error}=await client.from('bookings').update({contact,channel:'email',metadata:{...(booking.metadata||{}),manualContact:{addedAt:new Date().toISOString(),source:'luvia_ui'}}}).eq('id',id).select('*').single();
    if(error)throw error;
    window.dispatchEvent(new CustomEvent('luvia:booking-changed',{detail:{booking:data,action:'contact-updated'}}));
    return data;
  }

  async function resolvePlaceRoute(place={}){
    await init();
    const payload={
      name:clean(place.name),
      website:clean(place.website||place.websiteUri||place.website_uri),
      reservationUrl:clean(place.reservationUrl||place.reservation_url||place.bookingUrl||place.booking_url)
    };
    if(!payload.name)throw new Error('Ort konnte nicht eindeutig bestimmt werden.');
    const {data,error}=await client.functions.invoke('booking-route-resolve',{body:{place:payload}});
    if(error)throw await functionError(error,'Buchungsweg konnte derzeit nicht geprüft werden.');
    if(data?.error)throw new Error(data.details||data.error);
    return data||{resolved:false};
  }

  async function resolveRoute(id){
    await init();
    const {data,error}=await client.functions.invoke('booking-route-resolve',{body:{bookingId:id}});
    if(error)throw await functionError(error,'Automatische Buchungskanal-Suche ist derzeit nicht verfügbar.');
    if(data?.error)throw new Error(data.details||data.error);
    window.dispatchEvent(new CustomEvent('luvia:booking-changed',{detail:{bookingId:id,action:'route-resolved',result:data}}));
    return data;
  }

  async function resolveContact(id){return resolveRoute(id);}

  async function sendEmail(id,{requesterName,note}={}){
    await init();
    const booking=await get(id);
    if(!booking)throw new Error('Buchung wurde nicht gefunden.');
    if(!booking.contact?.email)throw new Error('Für diesen Ort ist noch keine bestätigte E-Mail-Adresse verfügbar.');
    const {data,error}=await client.functions.invoke('booking-email-send',{
      body:{bookingId:id,requesterName:requesterName||undefined,note:note||undefined}
    });
    if(error)throw await functionError(error,'Versand der Buchungsanfrage ist fehlgeschlagen.');
    if(data?.error)throw new Error(data.details||data.error);
    window.dispatchEvent(new CustomEvent('luvia:booking-changed',{detail:{bookingId:id,action:'email-sent',result:data}}));
    return data;
  }

  async function cancel(id){
    return transition(id,'cancelled',{metadata:{cancelledFrom:'luvia_ui'}});
  }

  const api=Object.freeze({
    version:VERSION,init,createForPlace,listForTrip,get,transition,planRoute,resolvePlaceRoute,resolveRoute,resolveContact,updateContact,sendEmail,cancel,mapType,
    diagnostics:()=>({version:VERSION,initialized,activeTripId:activeTripId(),coreVersion:window.LuviaBookingCore?.version||null})
  });
  window.LuviaBooking=api;
  window.addEventListener('luvia:supabase-client-ready',()=>init().catch(console.warn));
})();