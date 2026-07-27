(() => {
  'use strict';
  const widgets=new Map();
  function register(def){if(!def?.id||typeof def.render!=='function')throw new Error('Ungültiges Dashboard-Widget.');widgets.set(def.id,Object.freeze({...def}));return def;}
  function list(){return [...widgets.values()].sort((a,b)=>(a.order||100)-(b.order||100));}
  function render(context){return list().filter(w=>w.enabled?.(context)!==false).map(w=>`<article class="lv-card lv-widget" data-widget-id="${w.id}">${w.render(context)}</article>`).join('');}
  register({id:'today',order:10,title:'Heute',render:()=>'<h2>Heute</h2><p>Das Dashboard wächst über eine zentrale Widget Registry. Neue Widgets können später ergänzt, sortiert und pro Reise konfiguriert werden.</p>'});
  register({id:'destination',order:20,title:'Reiseziel',render:({trip,esc})=>`<h2>Reiseziel</h2><p><strong>${esc(trip.destination?.name||'Noch offen')}</strong>${trip.destination?.country?`<br>${esc(trip.destination.country)}`:''}<br><span>Grundlage für Places, Restaurants, Karten und weitere Ortsmodule.</span></p>`});
  register({id:'profile',order:30,title:'Profil',render:({profile,esc})=>`<h2>Persönlich für ${esc(profile?.displayName||'dich')}</h2><p>Theme, Präferenzen und Reiseauswahl werden geräteübergreifend synchronisiert.</p><button class="lv-link-btn" data-profile-open="profile">Profil öffnen</button>`});
  window.LuviaDashboardWidgets=Object.freeze({version:'1.0.0',register,list,render});
})();
