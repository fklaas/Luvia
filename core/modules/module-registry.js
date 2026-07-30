(() => {
  'use strict';
  const entries=[
    {id:'accommodations',title:'Unterkünfte',longTitle:'Unterkünfte & Aufenthalt',icon:'🏨',description:'Unterkünfte suchen, speichern sowie Check-in und Check-out verwalten.',status:'available',defaultEnabled:true,order:5},
    {id:'attractions',title:'Aktivitäten',longTitle:'Sehenswürdigkeiten & Aktivitäten',icon:'✨',description:'Sehenswürdigkeiten, Museen, Parks und Erlebnisse entdecken und planen.',status:'available',defaultEnabled:true,order:8},
    {id:'photo_spots',title:'Fotospots',longTitle:'Fotospots & Lichtmomente',icon:'📸',description:'Aussichten, Lichtstimmungen und besondere Fotomomente entdecken und planen.',status:'available',defaultEnabled:true,order:9},
    {id:'shopping',title:'Shopping',longTitle:'Shopping & besondere Geschäfte',icon:'🛍️',description:'Märkte, Boutiquen, Souvenirs und besondere Einkaufsorte entdecken und planen.',status:'available',defaultEnabled:true,order:10},
    {id:'restaurants',title:'Restaurants',longTitle:'Restaurants & Reservierungen',icon:'🍽️',description:'Restaurants entdecken, speichern und Reservierungen planen.',status:'available',defaultEnabled:true,order:11},
    {id:'maps',title:'Karten',longTitle:'Karten & gespeicherte Orte',icon:'🗺️',description:'Orte, Wege und Reiseziele auf einer gemeinsamen Karte.',status:'planned',defaultEnabled:false,order:20},
    {id:'weather',title:'Wetter',longTitle:'Wetter & Tageshinweise',icon:'☀️',description:'Wetter am Reiseziel und passende Hinweise für eure Tage.',status:'planned',defaultEnabled:false,order:30},
    {id:'budget',title:'Budget',longTitle:'Budget & Ausgaben',icon:'💶',description:'Reisekosten, Kategorien und gemeinsame Ausgaben.',status:'planned',defaultEnabled:false,order:40},
    {id:'checklist',title:'Packliste',longTitle:'Packlisten & Aufgaben',icon:'✓',description:'Gemeinsame Vorbereitungen, Zuständigkeiten und Fortschritt.',status:'planned',defaultEnabled:false,order:50},
    {id:'memories',title:'Erinnerungen',longTitle:'Erinnerungen & Bucketlist',icon:'♡',description:'Wünsche, besondere Momente und gemeinsame Vorhaben.',status:'planned',defaultEnabled:false,order:60},
    {id:'gallery',title:'Fotos',longTitle:'Fotos & gemeinsame Galerie',icon:'📸',description:'Fotos sammeln, sortieren und später im Reisebuch nutzen.',status:'planned',defaultEnabled:false,order:70},
    {id:'live',title:'Live',longTitle:'Live Moments & Standort',icon:'📍',description:'Gemeinsame Live-Momente und spätere Standortfreigaben.',status:'planned',defaultEnabled:false,order:80},
    {id:'documents',title:'Dokumente',longTitle:'Dokumente & Buchungen',icon:'📄',description:'Tickets, Reservierungen und wichtige Reisedokumente.',status:'planned',defaultEnabled:false,order:90},
    {id:'timeline',title:'Timeline',longTitle:'Reise-Timeline',icon:'🕘',description:'Der chronologische Ablauf eurer gemeinsamen Reise.',status:'planned',defaultEnabled:false,order:100}
  ];
  const catalog=new Map(entries.map(x=>[x.id,Object.freeze(x)]));
  const available=()=>entries.filter(x=>x.status==='available');
  const CORE_PLACE_MODULES=Object.freeze(['accommodations','restaurants','attractions','photo_spots','shopping']);
  const normalize=ids=>[...new Set((Array.isArray(ids)?ids:[]).filter(id=>catalog.has(id)&&catalog.get(id).status==='available'))];
  function enabledForTrip(trip){const selected=normalize(trip?.modules||trip?.selectedModules),defaults=available().filter(x=>x.defaultEnabled).map(x=>x.id);return normalize([...CORE_PLACE_MODULES,...defaults,...selected])}
  function list(options={}){return entries.filter(x=>options.includePlanned!==false||x.status==='available').sort((a,b)=>a.order-b.order)}
  function get(id){return catalog.get(id)||null}
  function isEnabled(trip,id){return enabledForTrip(trip).includes(id)}
  function updateTripModules(trip,ids){const modules=normalize(ids);return {...trip,modules,selectedModules:modules,updatedAt:new Date().toISOString()}}
  window.LuviaModuleRegistry=Object.freeze({version:'4.9.0',list,get,normalize,enabledForTrip,isEnabled,updateTripModules});
})();
