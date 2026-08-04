(() => {
  'use strict';
  const VERSION='4.26.1';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const tile=(x)=>`<button type="button" class="lv-hub-tile ${x.primary?'is-primary':''} ${x.preview?'is-preview':''}" data-hub-action="${esc(x.action||'')}" ${x.disabled?'disabled':''}><span class="lv-hub-icon">${x.icon}</span><span class="lv-hub-copy"><strong>${esc(x.title)}</strong><small>${esc(x.description)}</small>${x.meta?`<em>${esc(x.meta)}</em>`:''}</span><span class="lv-hub-arrow">${x.preview?'Demnächst':'→'}</span></button>`;
  function tripStats(trip){const id=trip?.id||trip?.tripId;const places=window.LuviaPlaceCore?.getPlaces?.({tripId:id})||[];const planned=places.filter(p=>p?.metadata?.plannedAt||p?.metadata?.tripPlace?.planned_at).length;return {places:places.length,planned};}
  function shell({eyebrow,title,description,hero,tiles,footer=''}){return `<section class="lv-hub"><header class="lv-hub-head"><span>${esc(eyebrow)}</span><h1>${esc(title)}</h1><p>${esc(description)}</p></header>${hero||''}<div class="lv-hub-grid">${tiles.map(tile).join('')}</div>${footer}</section>`;}
  function plan(trip){const stats=tripStats(trip);return shell({eyebrow:'Gemeinsam vorbereiten',title:'Was möchtet ihr planen?',description:'Alle Werkzeuge für eure Reise – klar gegliedert und ohne unnötige Komplexität.',hero:`<button class="lv-hub-hero" data-hub-action="places"><span>Places entdecken</span><strong>Restaurants, Aktivitäten und besondere Orte finden.</strong><small>${stats.planned?`${stats.planned} Orte bereits geplant`:'Noch keinen Ort geplant'}</small><b>Places öffnen →</b></button>`,tiles:[
    {icon:'📍',title:'Places',description:'Orte entdecken und zur Timeline hinzufügen.',meta:`${stats.places} Orte im Reisekontext`,action:'places',primary:true},
    {icon:'📅',title:'Timeline',description:'Reisetage und geplante Momente ordnen.',action:'timeline'},
    {icon:'✅',title:'Checklisten',description:'Vor und während der Reise nichts vergessen.',action:'checklists'},
    {icon:'💶',title:'Budget',description:'Ausgaben und gemeinsames Reisebudget im Blick behalten.',action:'budget'},
    {icon:'🗺️',title:'Routen',description:'Geplante Orte als Etappen in Google Maps öffnen.',action:'routes'},
    {icon:'💬',title:'Sprachhilfe',description:'Situationen im Restaurant, Hotel oder unterwegs.',action:'language'},
    {icon:'☀️',title:'Wetter',description:'Vorbereitung und passende Hinweise für eure Tage.',action:'weather'},
    {icon:'🤝',title:'Community',description:'Reisende mit ähnlichen Interessen entdecken.',preview:true,disabled:true}
  ]});}
  function tripHub(activeTrip){return shell({eyebrow:'Unterwegs zusammen',title:'Eure Reise im Moment.',description:'Tagesablauf, Teilnehmer und Erlebnisse an einem Ort.',tiles:[
    {icon:'🗓️',title:'Tagesübersicht',description:'Was heute ansteht und was als Nächstes kommt.',action:'today',primary:true},
    {icon:'📅',title:'Timeline',description:'Alle Reisetage und geplanten Orte.',action:'timeline'},
    {icon:'👥',title:'Teilnehmer',description:'Gemeinsam planen und den Reisestatus sehen.',action:'participants'},
    {icon:'📍',title:'Besuchte Orte',description:'Per GPS oder manuell bestätigte Erlebnisse.',preview:true,disabled:true},
    {icon:'✨',title:'Live-Momente',description:'Kleine gemeinsame Momente während der Reise.',preview:true,disabled:true},
    {icon:'ℹ️',title:'Reisedaten',description:'Ziel, Zeitraum und zentrale Informationen.',action:'trip-settings'}
  ]});}
  function memories(){return shell({eyebrow:'Für immer erinnern',title:'Aus Momenten wird eure Geschichte.',description:'Fotos, Orte und gemeinsame Erinnerungen werden später automatisch zusammengeführt.',tiles:[
    {icon:'📸',title:'Fotogalerie',description:'Alle Reisefotos nach Tag und Ort sortiert.',action:'gallery',primary:true},
    {icon:'🖼️',title:'Alben',description:'Automatische Cluster aus Fotos am gleichen Ort.',preview:true,disabled:true},
    {icon:'📖',title:'Reisebuch',description:'Aus Timeline, Orten und Momenten entsteht euer Buch.',action:'travel-book'},
    {icon:'🎞️',title:'Reise-Revue',description:'Eure Reise wie ein persönlicher Jahresrückblick.',action:'review'},
    {icon:'⭐',title:'Highlights',description:'Lieblingsorte und besondere gemeinsame Momente.',preview:true,disabled:true}
  ]});}
  function more(){return shell({eyebrow:'Luvia anpassen',title:'Alles Weitere an seinem Platz.',description:'Persönliche Einstellungen, Reisekompass und Verwaltung.',tiles:[
    {icon:'👤',title:'Profil',description:'Name, Foto und persönliche Angaben.',action:'profile',primary:true},
    {icon:'🧭',title:'Reisekompass',description:'Vorlieben, Reisestil und persönliche Wünsche.',action:'preferences'},
    {icon:'⚙️',title:'Reiseeinstellungen',description:'Reise bearbeiten, Teilnehmer und Module.',action:'trip-settings'},
    {icon:'🔔',title:'Benachrichtigungen',description:'Hinweise und Erinnerungen steuern.',preview:true,disabled:true},
    {icon:'📤',title:'Export',description:'Reisedaten und Erinnerungen später exportieren.',preview:true,disabled:true},
    {icon:'❓',title:'Hilfe',description:'Antworten und Unterstützung rund um Luvia.',preview:true,disabled:true}
  ]});}
  function render(view,activeTrip){if(view==='plan')return plan(activeTrip);if(view==='trip')return tripHub(activeTrip);if(view==='memories')return memories();if(view==='more')return more();return '';}
  window.LuviaModuleHubs=Object.freeze({version:VERSION,render,diagnostics:()=>({version:VERSION,hubs:['plan','trip','memories','more']})});
})();
