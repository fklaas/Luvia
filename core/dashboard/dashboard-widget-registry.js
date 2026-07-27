(() => {
  'use strict';
  const widgets=new Map();
  function register(def){if(!def?.id||typeof def.render!=='function')throw new Error('Ungültiges Dashboard-Widget.');widgets.set(def.id,Object.freeze({...def}));return def;}
  function list(){return [...widgets.values()].sort((a,b)=>(a.order||100)-(b.order||100));}
  function render(context){return list().filter(w=>w.enabled?.(context)!==false).map(w=>`<article class="lv-card lv-widget" data-widget-id="${w.id}">${w.render(context)}</article>`).join('');}
  register({id:'today',order:10,title:'Heute',render:()=>'<h2>Heute</h2><p>Das Dashboard wächst über eine zentrale Widget Registry. Neue Widgets können später ergänzt, sortiert und pro Reise konfiguriert werden.</p>'});
  register({id:'destination',order:20,title:'Reiseziel',render:({trip,esc})=>`<h2>Reiseziel</h2><p><strong>${esc(trip.destination?.name||'Noch offen')}</strong>${trip.destination?.country?`<br>${esc(trip.destination.country)}`:''}<br><span>Grundlage für Places, Restaurants, Karten und weitere Ortsmodule.</span></p>`});
  register({id:'members',order:25,title:'Teilnehmer',render:({trip,esc})=>{const members=window.LuviaJoinFlow?.snapshot?.()||[];queueMicrotask(()=>window.LuviaJoinFlow?.watchMembers?.(trip.id||trip.tripId));return `<h2>Gemeinsam unterwegs</h2><p>${members.length?members.map(m=>`<span style="display:inline-flex;margin:4px 5px 4px 0;padding:7px 10px;border-radius:999px;background:var(--lv-surface-soft)">${m.role==='owner'?'★':'✓'} ${esc(m.display_name||'Mitreisende Person')}</span>`).join(''):'Teilnehmer werden aus der Cloud geladen …'}</p><button class="lv-link-btn" data-invite>Personen einladen</button>`}});
  register({id:'profile',order:30,title:'Profil',render:({profile,esc})=>`<h2>Persönlich für ${esc(profile?.displayName||'dich')}</h2><p>Theme, Präferenzen und Reiseauswahl werden geräteübergreifend synchronisiert.</p><button class="lv-link-btn" data-profile-open="profile">Profil öffnen</button>`});
  window.LuviaDashboardWidgets=Object.freeze({version:'1.1.0',register,list,render});
})();
