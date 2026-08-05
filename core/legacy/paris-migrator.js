(() => {
  'use strict';
  const OLD=Object.freeze({active:'parisIdentityV1',registry:'parisTripRegistryV1',tripId:'parisSupabaseTripIdV2',owner:'parisDeviceOwner'});
  const parse=(v,f)=>{try{return v==null?f:JSON.parse(v)}catch{return f}};
  const text=(...values)=>values.find(v=>typeof v==='string'&&v.trim())?.trim()||'';
  function destination(value,row={}){
    const source=value&&typeof value==='object'?value:{};
    return Object.freeze({
      name:text(source.name,source.label,row.destination_name,row.destinationName,typeof value==='string'?value:'',row.location,row.city),
      formattedAddress:text(source.formattedAddress,source.displayName,source.formatted_address,row.destination_formatted_address,row.formattedAddress),
      country:text(source.country,row.destination_country,row.destinationCountry,row.country),
      countryCode:text(source.countryCode,source.country_code,row.destination_country_code,row.countryCode).toUpperCase(),
      placeId:text(source.placeId,source.place_id,row.destination_place_id,row.placeId),
      latitude:Number.isFinite(Number(source.latitude??source.lat??source.center?.lat??row.destination_latitude??row.latitude))?Number(source.latitude??source.lat??source.center?.lat??row.destination_latitude??row.latitude):null,
      longitude:Number.isFinite(Number(source.longitude??source.lng??source.center?.lng??row.destination_longitude??row.longitude))?Number(source.longitude??source.lng??source.center?.lng??row.destination_longitude??row.longitude):null,
      timezone:text(source.timezone,row.timezone),
      provider:text(source.provider,source.source,row.destinationProvider,row.destination_provider)
    });
  }
  function normalize(row={}){
    const id=text(row.id,row.tripId,row.trip_id);
    const structuredDestination=(row.destination&&typeof row.destination==='object')?row.destination:(row.destinationModel||row.destination_context||row.destinationContext||row.destination);
    const dest=destination(structuredDestination,row);
    return {
      id,tripId:id,ownerId:text(row.ownerId,row.owner_id),title:text(row.title,row.tripName,row.trip_name)||'Unsere Reise',tripName:text(row.tripName,row.trip_name,row.title)||'Unsere Reise',
      destination:dest,destinationName:dest.name,joinCode:text(row.joinCode,row.join_code),memberName:text(row.memberName,row.member_name,localStorage.getItem(OLD.owner))||'Mitreisend',
      role:text(row.role,row.member_role)||(row.is_owner?'owner':'member'),isOwner:Boolean(row.isOwner||row.is_owner||['owner','admin'].includes(row.role||row.member_role)),mode:row.mode||'shared',
      symbol:row.symbol||'❤️',accent:row.accent||row.accent_color||row.themeColor||row.theme_color||row.color||row.settings?.accent||row.settings?.themeColor||row.settings?.theme_color||'#e76f91',tripType:row.tripType||row.trip_type||'couple',startDate:row.startDate||row.start_date||'',endDate:row.endDate||row.end_date||'',
      modules:Array.isArray(row.modules)?row.modules:(Array.isArray(row.selectedModules)?row.selectedModules:(Array.isArray(row.selected_modules)?row.selected_modules:[])),
      moduleSettings:row.moduleSettings||row.module_settings||{},dashboardWidgets:row.dashboardWidgets||[],createdAt:row.createdAt||row.created_at||null,updatedAt:row.updatedAt||row.updated_at||null,lastOpenedAt:row.lastOpenedAt||null,cloud:Boolean(row.cloud||row.trip_id)
    };
  }
  function readLegacy(){
    const registry=parse(localStorage.getItem(OLD.registry),[])||[];
    const active=parse(localStorage.getItem(OLD.active),null);
    const map=new Map();
    [...registry,active].filter(Boolean).forEach(item=>{const trip=normalize(item);if(trip.id)map.set(trip.id,{...(map.get(trip.id)||{}),...trip})});
    return {trips:[...map.values()],activeTripId:normalize(active||{}).id||localStorage.getItem(OLD.tripId)||null};
  }
  function toLegacy(trip){return {...trip,tripId:trip.id,tripName:trip.title,destination:trip.destination?.name||'',destinationModel:trip.destination,selectedModules:trip.modules}}
  function mirror({trips,activeTripId}){
    localStorage.setItem(OLD.registry,JSON.stringify((trips||[]).map(toLegacy)));
    const active=(trips||[]).find(t=>t.id===activeTripId);
    if(active){localStorage.setItem(OLD.active,JSON.stringify(toLegacy(active)));localStorage.setItem(OLD.tripId,active.id);if(active.memberName)localStorage.setItem(OLD.owner,active.memberName)}
    else{localStorage.removeItem(OLD.active);localStorage.removeItem(OLD.tripId)}
  }
  window.LuviaLegacyParisMigrator=Object.freeze({oldKeys:OLD,normalize,readLegacy,mirror,toLegacy});
})();
