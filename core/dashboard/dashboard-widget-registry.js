(() => {
  'use strict';
  const widgets=new Map();
  const relative=value=>{if(!value)return'gerade eben';const seconds=Math.max(0,Math.round((Date.now()-new Date(value).getTime())/1000));if(seconds<45)return'gerade eben';if(seconds<3600)return`vor ${Math.floor(seconds/60)} Min.`;if(seconds<86400)return`vor ${Math.floor(seconds/3600)} Std.`;if(seconds<172800)return'gestern';return new Date(value).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})};
  const activityIcon=type=>({'member.joined':'👋','trip.created':'✨','trip.updated':'✏️','restaurant.updated':'🍽️','restaurant.saved':'❤️','photo.uploaded':'📸','moment.created':'💫','checklist.completed':'✅'}[type]||'•');
  function register(def){if(!def?.id||typeof def.render!=='function')throw new Error('Ungültiges Dashboard-Widget.');widgets.set(def.id,Object.freeze({...def}));return def;}
  function list(){return [...widgets.values()].sort((a,b)=>(a.order||100)-(b.order||100));}
  function normalizeConfig(profile){
    const defs=list(),saved=Array.isArray(profile?.dashboardWidgets)?profile.dashboardWidgets:[];
    const map=new Map(saved.filter(x=>x?.id).map(x=>[x.id,x]));
    return defs.map((def,index)=>({id:def.id,enabled:map.has(def.id)?map.get(def.id).enabled!==false:true,position:Number.isFinite(map.get(def.id)?.position)?map.get(def.id).position:index,title:def.title,icon:def.icon||'▦'})).sort((a,b)=>a.position-b.position);
  }
  function configured(profile){return normalizeConfig(profile).map(item=>({...item,definition:widgets.get(item.id)}));}
  function render(context){return configured(context?.profile).filter(item=>item.enabled&&item.definition?.enabled?.(context)!==false).map(item=>`<article class="lv-card lv-widget" data-widget-id="${item.id}">${item.definition.render(context)}</article>`).join('');}
  register({id:'today',order:10,title:'Heute',icon:'📅',render:({trip,esc})=>{
    const currentToday=window.LuviaTodayIntelligence?.snapshot?.()||{};
    if(!currentToday.generatedAt||Date.now()-new Date(currentToday.generatedAt).getTime()>60000)queueMicrotask(()=>window.LuviaTodayIntelligence?.refresh?.({tripId:trip.id||trip.tripId}).catch?.(()=>{}));
    const t=currentToday;
    const fmt=value=>value?new Date(value).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}):'';
    const statusCopy={
      empty:['Heute ist noch offen','Luvia hat passende Ideen für euren Tag.'],
      upcoming:['Als Nächstes',t.next?.title||'Nächster Programmpunkt'],
      leave_soon:['Bald losfahren',t.next?.title||'Nächster Programmpunkt'],
      leave_now:['Jetzt losfahren',t.next?.title||'Nächster Programmpunkt'],
      late:['Ihr seid knapp dran',t.next?.title||'Nächster Programmpunkt'],
      current:['Gerade bei',t.current?.title||'Aktueller Programmpunkt'],
      completed:['Euer Tag ist geschafft',`${t.completed?.length||0} Programmpunkte erlebt`]
    };
    const [headline,subline]=statusCopy[t.status]||statusCopy.empty;
    const focus=t.current||t.next;
    const departure=t.departureAdvice;
    const timeline=(t.timeline||[]).slice(0,4).map(item=>`<button class="lv-today-timeline-item is-${esc(item.phase)}" data-view="${item.entityType==='restaurant'?'restaurants':'dashboard'}"><span class="lv-today-dot"></span><span class="lv-today-time">${esc(item.time||fmt(item.startAt))}</span><span class="lv-today-icon">${esc(item.icon||'📍')}</span><span class="lv-today-copy"><strong>${esc(item.title)}</strong><small>${item.phase==='current'?'Jetzt':item.phase==='completed'?'Erledigt':'Geplant'}</small></span></button>`).join('');
    const primary=(t.actions||[]).find(a=>a.primary),secondary=(t.actions||[]).find(a=>!a.primary);
    const free=t.freeWindows?.[0],conflict=t.conflicts?.[0];
    return `<div class="lv-today-card is-${esc(t.status||'empty')}">
      <div class="lv-widget-title"><div><h2>Heute</h2><small>${esc(t.dayLoad?.label?`Euer Tag ist ${t.dayLoad.label} geplant`:'Live aus eurem Tagesablauf')}</small></div><span class="lv-live-pulse"></span></div>
      <div class="lv-today-focus">
        <span class="lv-today-focus-icon">${focus?({restaurant:'🍽️',attraction:'🏛️',activity:'🎟️',photo_spot:'📸'}[focus.entityType]||'📍'):'✨'}</span>
        <div><span class="lv-today-kicker">${esc(headline)}</span><strong>${esc(focus?(focus.time?`${focus.time} Uhr · `:'')+focus.title:subline)}</strong>${focus?`<small>${esc(subline)}</small>`:''}</div>
      </div>
      ${departure&&t.next?`<div class="lv-today-advice ${departure.status==='late'?'is-alert':''}"><span>⏱</span><div><strong>${departure.status==='late'?'Abfahrt verpasst':departure.status==='leave_now'?'Jetzt losfahren':`Losfahren um ${fmt(departure.recommendedAt)} Uhr`}</strong><small>${departure.travelMinutes==null?'Wegzeit wird noch ergänzt':`${departure.travelMinutes} Min. Weg · ${departure.bufferMinutes} Min. Puffer`}</small></div></div>`:''}
      ${conflict?`<div class="lv-today-advice is-alert"><span>⚠️</span><div><strong>${conflict.severity==='hard'?'Plan anpassen':'Knapp geplant'}</strong><small>${esc(conflict.message)}</small></div></div>`:''}
      ${free?`<div class="lv-today-advice"><span>↔</span><div><strong>${free.minutes} Minuten frei</strong><small>Ein kurzer zusätzlicher Ort könnte gut passen.</small></div></div>`:''}
      ${timeline?`<div class="lv-today-timeline">${timeline}</div>`:''}
      <div class="lv-today-actions">${primary?`<button class="lv-primary" data-view="${esc(primary.view||'dashboard')}">${esc(primary.label)}</button>`:''}${secondary?`<button class="lv-secondary" data-view="${esc(secondary.view||'dashboard')}">${esc(secondary.label)}</button>`:''}</div>
    </div>`;
  }});
  register({id:'destination',order:20,title:'Reiseziel',icon:'📍',render:({trip,esc})=>`<h2>Reiseziel</h2><p><strong>${esc(trip.destination?.name||'Noch offen')}</strong>${trip.destination?.country?`<br>${esc(trip.destination.country)}`:''}<br><span>Grundlage für Places, Restaurants, Karten und weitere Ortsmodule.</span></p>`});
  register({id:'members',order:25,title:'Gemeinsam live',icon:'👥',render:({trip,esc})=>{const members=window.LuviaJoinFlow?.snapshot?.()||[],presence=window.LuviaCollaboration?.snapshot?.().presence||[],presenceMap=new Map(presence.map(p=>[p.user_id,p]));queueMicrotask(()=>window.LuviaJoinFlow?.watchMembers?.(trip.id||trip.tripId));return `<div class="lv-widget-title"><div><h2>Gemeinsam live</h2><small>${presence.filter(p=>p.status==='online').length} gerade aktiv</small></div><span class="lv-live-pulse"></span></div><div class="lv-presence-list">${members.length?members.map(m=>{const p=presenceMap.get(m.user_id),status=p?.status||'offline',label=status==='online'?'Gerade aktiv':status==='away'?'Vor Kurzem aktiv':p?.last_seen_at?`Zuletzt ${relative(p.last_seen_at)}`:'Noch nicht aktiv';return `<div class="lv-presence-person"><span class="lv-presence-avatar">${m.role==='owner'?'★':'✓'}</span><div><strong>${esc(m.display_name||'Mitreisende Person')}</strong><small>${esc(label)}${p?.current_view?` · ${esc(p.current_view)}`:''}</small></div><i class="lv-presence-dot ${status}"></i></div>`}).join(''):'<p>Teilnehmer werden live aus der Cloud geladen …</p>'}</div><button class="lv-link-btn" data-invite>Personen einladen</button>`}});
  register({id:'restaurantIntelligence',order:28,title:'Restaurant Intelligence',icon:'🍽️',render:({trip,esc})=>{queueMicrotask(()=>window.LuviaRestaurantIntelligence?.refresh?.({tripId:trip.id||trip.tripId}).catch?.(()=>{}));const state=window.LuviaRestaurantIntelligence?.snapshot?.()||{};const primary=state.primary,nearby=state.nearby,missing=state.reservationMissing,departure=state.departure,better=state.betterAlternative;if(state.loading&&!primary)return '<div class="lv-widget-title"><div><h2>Restaurant für heute</h2><small>Luvia wertet eure Restaurants aus …</small></div><span class="lv-live-pulse"></span></div><p>Match, Standort, Besuchszeit und Reservierung werden live zusammengeführt.</p>';if(!primary)return '<h2>Restaurant für heute</h2><p>Speichert oder plant ein Restaurant. Luvia zeigt hier anschließend den besten Vorschlag für euren Tag.</p><button class="lv-link-btn" data-view="restaurants">Restaurants entdecken</button>';const intel=primary.intelligence||{};const rows=[["✨","Restaurant für heute",`${primary.name} · ${intel.score||55} % Match`],["📍","Jetzt in eurer Nähe",nearby?`${nearby.name}${nearby.intelligence?.distanceLabel?' · '+nearby.intelligence.distanceLabel:''}`:'Standort freigeben, um Nähe zu sehen'],["📅","Reservierung fehlt noch",missing?`${missing.name} · ${missing.intelligence?.reservationHint||'Reservierung empfohlen'}`:'Für eure aktuellen Pläne ist alles vorbereitet'],["⏰",departure?`In ${departure.minutes} Minuten losgehen`:`Beste Zeit ${intel.bestTime||'18:45'} Uhr`,departure?`${departure.restaurant.name} · Abfahrt ${departure.time} Uhr`:`${primary.name} · ${intel.walkMinutes?intel.walkMinutes+' Min. zu Fuß':'Wegzeit nach Standortfreigabe'}`],["↗","Bessere Alternative verfügbar",better?`${better.name} · ${better.intelligence?.score||55} % Match`:'Aktuell ist euer Hauptvorschlag die beste Wahl']];return `<div class="lv-widget-title"><div><h2>Restaurant Intelligence</h2><small>Live für euren heutigen Reisekontext</small></div><span class="lv-live-pulse"></span></div><div class="lv-restaurant-intelligence-list">${rows.map(([icon,title,copy],index)=>`<div><span>${icon}</span><div><strong>${esc(title)}</strong><small>${esc(copy)}</small></div>${index===0?`<b class="lv-restaurant-score">${esc(intel.score||55)} %</b>`:''}</div>`).join('')}</div><button class="lv-link-btn" data-view="restaurants">Restaurant Intelligence öffnen</button>`}});
  register({id:'profile',order:30,title:'Persönlich für dich',icon:'✨',render:({profile,esc})=>`<h2>Persönlich für ${esc(profile?.displayName||'dich')}</h2><p>Theme, Präferenzen, Dashboard und Reiseauswahl werden geräteübergreifend synchronisiert.</p><button class="lv-link-btn" data-profile-open="dashboard">Dashboard anpassen</button>`});
  window.LuviaDashboardWidgets=Object.freeze({version:'1.7.0',register,list,configured,normalizeConfig,render});
})();
