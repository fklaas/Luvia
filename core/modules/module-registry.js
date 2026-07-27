(() => {
  'use strict';
  const catalog = new Map([
    ['restaurants', Object.freeze({id:'restaurants', title:'Restaurants', longTitle:'Restaurants & Reservierungen', icon:'🍽️', description:'Restaurants entdecken, speichern und Reservierungen planen.', status:'available', defaultEnabled:true})]
  ]);
  const normalize = ids => [...new Set((Array.isArray(ids)?ids:[]).filter(id=>catalog.has(id)))];
  function enabledForTrip(trip){
    const selected=normalize(trip?.modules||trip?.selectedModules);
    return selected.length?selected:[...catalog.values()].filter(x=>x.defaultEnabled).map(x=>x.id);
  }
  function list(){return [...catalog.values()]}
  function get(id){return catalog.get(id)||null}
  function updateTripModules(trip,ids){
    const modules=normalize(ids);
    return {...trip,modules,selectedModules:modules,updatedAt:new Date().toISOString()};
  }
  window.LuviaModuleRegistry=Object.freeze({version:'3.0.0',list,get,normalize,enabledForTrip,updateTripModules});
})();
