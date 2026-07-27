(() => {
  'use strict';
  const widgets=new Map();
  function register(def){if(!def?.id||typeof def.render!=='function')throw new Error('Ungültiges Dashboard-Widget.');widgets.set(def.id,Object.freeze({...def}));return def;}
  function list(){return [...widgets.values()].sort((a,b)=>(a.order||100)-(b.order||100));}
  function normalizeConfig(profile){
    const defs=list(),saved=Array.isArray(profile?.dashboardWidgets)?profile.dashboardWidgets:[];
    const map=new Map(saved.filter(x=>x?.id).map(x=>[x.id,x]));
    return defs.map((def,index)=>({id:def.id,enabled:map.has(def.id)?map.get(def.id).enabled!==false:true,position:Number.isFinite(map.get(def.id)?.position)?map.get(def.id).position:index,title:def.title,icon:def.icon||'▦'})).sort((a,b)=>a.position-b.position);
  }
  function configured(profile){return normalizeConfig(profile).map(item=>({...item,definition:widgets.get(item.id)}));}
  function render(context){return configured(context?.profile).filter(item=>item.enabled&&item.definition?.enabled?.(context)!==false).map(item=>`<article class="lv-card lv-widget" data-widget-id="${item.id}">${item.definition.render(context)}</article>`).join('');}
  register({id:'today',order:10,title:'Heute',icon:'📅',render:()=>'<h2>Heute</h2><p>Das Dashboard wächst über eine zentrale Widget Registry. Neue Widgets können später ergänzt, sortiert und persönlich ein- oder ausgeblendet werden.</p>'});
  register({id:'destination',order:20,title:'Reiseziel',icon:'📍',render:({trip,esc})=>`<h2>Reiseziel</h2><p><strong>${esc(trip.destination?.name||'Noch offen')}</strong>${trip.destination?.country?`<br>${esc(trip.destination.country)}`:''}<br><span>Grundlage für Places, Restaurants, Karten und weitere Ortsmodule.</span></p>`});
  register({id:'members',order:25,title:'Gemeinsam unterwegs',icon:'👥',render:({trip,esc})=>{const members=window.LuviaJoinFlow?.snapshot?.()||[];queueMicrotask(()=>window.LuviaJoinFlow?.watchMembers?.(trip.id||trip.tripId));return `<h2>Gemeinsam unterwegs</h2><p>${members.length?members.map(m=>`<span class="lv-member-chip">${m.role==='owner'?'★':'✓'} ${esc(m.display_name||'Mitreisende Person')}</span>`).join(''):'Teilnehmer werden aus der Cloud geladen …'}</p><button class="lv-link-btn" data-invite>Personen einladen</button>`}});
  register({id:'profile',order:30,title:'Persönlich für dich',icon:'✨',render:({profile,esc})=>`<h2>Persönlich für ${esc(profile?.displayName||'dich')}</h2><p>Theme, Präferenzen und Reiseauswahl werden geräteübergreifend synchronisiert.</p><button class="lv-link-btn" data-profile-open="dashboard">Dashboard anpassen</button>`});
  window.LuviaDashboardWidgets=Object.freeze({version:'1.2.0',register,list,configured,normalizeConfig,render});
})();
