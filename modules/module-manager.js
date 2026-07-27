(function(){
  'use strict';
  const REGISTRY_KEY='parisTripRegistryV1', ID_KEY='parisIdentityV1';
  const catalog=[];
  const instances=new Map();
  const defaults=['hero','assistant','liveMoments','apps','language','mobility','restaurants','budget','gallery','photoSpots','memories','dayPlans','review','travelBook','closing'];
  const reminderPresets=[['photo','📷 Familien- oder Gruppenfoto'],['localFood','🍽️ Etwas Typisches probieren'],['sunset','🌅 Einen Sonnenuntergang genießen'],['souvenir','🎁 Ein besonderes Souvenir finden'],['quietMoment','❤️ Einen stillen Lieblingsmoment festhalten']];
  const parse=(v,f)=>{try{const x=JSON.parse(v);return x==null?f:x}catch{return f}};
  const registry=()=>parse(localStorage.getItem(REGISTRY_KEY),[]);
  const current=()=>{
    const active=parse(localStorage.getItem(ID_KEY),null);
    if(!active?.tripId)return active;
    const stored=registry().find(trip=>trip?.tripId===active.tripId);
    if(!stored)return active;
    return {
      ...stored,
      ...active,
      selectedModules:Array.isArray(active.selectedModules)&&active.selectedModules.length?active.selectedModules:(Array.isArray(stored.selectedModules)?stored.selectedModules:active.selectedModules),
      moduleSettings:active.moduleSettings&&Object.keys(active.moduleSettings).length?active.moduleSettings:(stored.moduleSettings||active.moduleSettings),
      moduleContent:active.moduleContent&&Object.keys(active.moduleContent).length?active.moduleContent:(stored.moduleContent||active.moduleContent),
    };
  };
  function isOfficialParis(trip){if(!trip)return false;if(trip.templateId==='paris-official'||trip.isParisOfficial===true)return true;const destination=String(trip.destination||'').trim().toLowerCase(),name=String(trip.tripName||'').trim().toLowerCase();return (destination==='paris'||name.includes('paris'))&&trip.startDate==='2026-07-31'&&trip.endDate==='2026-08-02'}
  function normalized(ids,trip){if(Array.isArray(ids))return [...new Set(ids.filter(Boolean))];return isOfficialParis(trip)?defaults.slice():[]}
  function normalizeDefinition(def){
    return {...def,version:2,selectors:Array.isArray(def.selectors)?def.selectors:[],schema:def.schema||{sections:[{id:'content',title:'Inhalte',description:'Texte, Links und Medien dieses Moduls.'}]},mount:def.mount||null,unmount:def.unmount||null,render:def.render||null};
  }
  function register(def){if(!def?.id||catalog.some(x=>x.id===def.id))return;catalog.push(normalizeDefinition(def))}
  function getCatalog(){return catalog.slice().sort((a,b)=>(a.order||99)-(b.order||99))}
  function getSelected(trip=current()){return normalized(trip?.selectedModules,trip)}
  function rootsFor(def){const out=[];const seen=new Set();for(const selector of def.selectors)document.querySelectorAll(selector).forEach(el=>{if(!seen.has(el)){seen.add(el);out.push(el)}});return out}
  function fieldKey(moduleId,type,index){return `${moduleId}.${type}.${index}`}
  function eligibleTextNodes(root){
    const selector='h1,h2,h3,h4,h5,h6,p,small,strong,button,a,label,li,[data-luvia-editable]';
    return [...root.querySelectorAll(selector)].filter(el=>{
      if(el.matches('[data-luvia-no-edit]'))return false;
      const text=(el.textContent||'').replace(/\s+/g,' ').trim();
      if(!text||text.length>700)return false;
      return ![...el.children].some(c=>c.matches('h1,h2,h3,h4,h5,h6,p,button,a,li'));
    });
  }
  function annotate(instance){
    let ti=0,li=0,ii=0;
    instance.roots.forEach((root,rootIndex)=>{
      root.dataset.luviaModule=instance.def.id;root.dataset.luviaModuleVersion='2';root.dataset.luviaModuleRoot=String(rootIndex);
      root.classList.add('luvia-module-v2-root');
      eligibleTextNodes(root).forEach(el=>{if(!el.dataset.luviaField)el.dataset.luviaField=fieldKey(instance.def.id,'text',ti++);});
      root.querySelectorAll('a[href]').forEach(el=>{if(!el.dataset.luviaLinkField)el.dataset.luviaLinkField=fieldKey(instance.def.id,'link',li++);});
      root.querySelectorAll('img[src]').forEach(el=>{if(!el.dataset.luviaImageField)el.dataset.luviaImageField=fieldKey(instance.def.id,'image',ii++);});
    });
  }
  function moduleContent(trip,moduleId){return trip?.moduleContent?.[moduleId]||{}}
  function applyContent(instance,trip=current()){
    const content=moduleContent(trip,instance.def.id);
    instance.roots.forEach(root=>{
      root.querySelectorAll('[data-luvia-field]').forEach(el=>{const key=el.dataset.luviaField;const value=content.texts?.[key];if(typeof value==='string')el.textContent=value});
      root.querySelectorAll('[data-luvia-link-field]').forEach(el=>{const key=el.dataset.luviaLinkField;const value=content.links?.[key];if(value&&typeof value.href==='string')el.setAttribute('href',value.href);if(value&&typeof value.label==='string')el.textContent=value.label});
      root.querySelectorAll('[data-luvia-image-field]').forEach(el=>{const key=el.dataset.luviaImageField;const value=content.images?.[key];if(value&&typeof value.src==='string')el.setAttribute('src',value.src);if(value&&typeof value.alt==='string')el.setAttribute('alt',value.alt)});
    });
  }
  function mountModule(id,trip=current()){
    const def=getCatalog().find(x=>x.id===id);if(!def)return null;
    let instance=instances.get(id);
    const roots=rootsFor(def);
    if(!instance){instance={id,def,roots,mounted:false,revision:0,lastTripId:null,lastContentSignature:null};instances.set(id,instance)}else instance.roots=roots;
    const contentRef=trip?.moduleContent?.[id]||null;
    let contentSignature='';try{contentSignature=JSON.stringify(contentRef||null)}catch{contentSignature=String(contentRef)}
    const shouldRender=typeof def.render==='function' && (!instance.mounted || instance.lastTripId!==(trip?.tripId||null) || instance.lastContentSignature!==contentSignature);
    if(shouldRender){
      if(instance.mounted){try{def.unmount?.(instance,{manager:api})}catch(e){console.error('Luvia Modul unmount vor Render fehlgeschlagen:',id,e)}instance.mounted=false}
      try{def.render(instance,{trip,manager:api})}catch(e){console.error('Luvia Modul render fehlgeschlagen:',id,e)}
    }
    annotate(instance);applyContent(instance,trip);
    if(!instance.mounted){try{def.mount?.(instance,{trip,manager:api})}catch(e){console.error('Luvia Modul mount fehlgeschlagen:',id,e)}instance.mounted=true}
    instance.lastTripId=trip?.tripId||null;instance.lastContentSignature=contentSignature;
    instance.revision++;return instance;
  }
  function mountAll(trip=current()){getCatalog().forEach(def=>mountModule(def.id,trip));document.documentElement.classList.add('luvia-modules-v2-ready')}
  function unmountModule(id){const instance=instances.get(id);if(!instance?.mounted)return;try{instance.def.unmount?.(instance,{manager:api})}catch(e){console.error('Luvia Modul unmount fehlgeschlagen:',id,e)}instance.mounted=false}
  function getBlueprint(id){
    const instance=instances.get(id)||mountModule(id);if(!instance)return null;
    const texts={},links={},images={};
    instance.roots.forEach(root=>{
      root.querySelectorAll('[data-luvia-field]').forEach(el=>texts[el.dataset.luviaField]=(el.textContent||'').replace(/\s+/g,' ').trim());
      root.querySelectorAll('[data-luvia-link-field]').forEach(el=>links[el.dataset.luviaLinkField]={label:(el.textContent||'').replace(/\s+/g,' ').trim(),href:el.getAttribute('href')||''});
      root.querySelectorAll('[data-luvia-image-field]').forEach(el=>images[el.dataset.luviaImageField]={alt:el.getAttribute('alt')||'',src:el.getAttribute('src')||''});
    });
    return {id,version:2,title:instance.def.title,schema:instance.def.schema,texts,links,images,defaults:instance.def.defaults||window.LuviaModuleDefaults?.[id]||null};
  }
  async function pushCloud(tripId,patch){const client=window.LuviaSupabaseService?.getClient?.()||window.ParisSupabaseClient||window.ParisCloud?.client;if(!client||!tripId)return;try{const modules=Array.isArray(patch.selectedModules)?patch.selectedModules:[];const r=await client.rpc('luvia_set_trip_modules',{p_trip_id:tripId,p_modules:modules,p_settings:{...(patch.moduleSettings||{}),moduleContent:patch.moduleContent||undefined}});if(r.error)throw r.error}catch(error){console.info('Modulkonfiguration bleibt lokal:',error?.message||error)}}
  function saveTripPatch(tripId,patch){const stamp=new Date().toISOString();patch={...patch,moduleSettings:{...(patch.moduleSettings||{}),_updatedAt:stamp}};const existing=registry(),found=existing.some(t=>t?.tripId===tripId),base=current()?.tripId===tripId?current():{tripId};const list=found?existing.map(t=>t?.tripId===tripId?{...t,...patch}:t):[{...base,...patch},...existing];localStorage.setItem(REGISTRY_KEY,JSON.stringify(list));const cur=current();if(cur?.tripId===tripId){const next={...cur,...patch};localStorage.setItem(ID_KEY,JSON.stringify(next));window.dispatchEvent(new CustomEvent('luvia:trip-modules-changed',{detail:next}))}pushCloud(tripId,patch)}
  function setModuleContent(moduleId,content,trip=current()){if(!trip?.tripId)return;const patch={moduleContent:{...(trip.moduleContent||{}),[moduleId]:{...(trip.moduleContent?.[moduleId]||{}),...content}}};const nextTrip={...trip,...patch};saveTripPatch(trip.tripId,patch);const instance=instances.get(moduleId);if(instance){instance.lastContentSignature=null;mountModule(moduleId,nextTrip)}else mountModule(moduleId,nextTrip);}
  function getModuleData(moduleId,trip=current()){const def=getCatalog().find(x=>x.id===moduleId);const stored=trip?.moduleContent?.[moduleId]?.data;const value=stored!=null?stored:(def?.defaults||{});return JSON.parse(JSON.stringify(value));}
  function setModuleData(moduleId,data,trip=current()){setModuleContent(moduleId,{data},trip);}
  function reconcileTrip(candidate=current()){const active=current()||{},incoming=candidate||{},sameTrip=!incoming.tripId||!active.tripId||incoming.tripId===active.tripId,base=sameTrip?{...active,...incoming}:{...incoming},activeModules=Array.isArray(active.selectedModules)?active.selectedModules:[],incomingModules=Array.isArray(incoming.selectedModules)?incoming.selectedModules:[];if(sameTrip&&activeModules.length&&!incomingModules.length)base.selectedModules=activeModules.slice();if(sameTrip&&active.moduleSettings&&Object.keys(active.moduleSettings).length&&(!incoming.moduleSettings||!Object.keys(incoming.moduleSettings).length))base.moduleSettings=active.moduleSettings;if(sameTrip&&active.moduleContent&&Object.keys(active.moduleContent).length&&(!incoming.moduleContent||!Object.keys(incoming.moduleContent).length))base.moduleContent=active.moduleContent;return base}
  function apply(input=current()){
    const trip=reconcileTrip(input);mountAll(trip);const official=isOfficialParis(trip),selected=new Set(official?defaults:getSelected(trip));document.documentElement.classList.add('luvia-modules-ready');document.documentElement.classList.toggle('luvia-paris-official',official);
    for(const def of getCatalog()){const instance=instances.get(def.id)||mountModule(def.id,trip);instance?.roots.forEach(el=>{el.classList.toggle('luvia-module-hidden',!selected.has(def.id));el.dataset.luviaModule=def.id});}
    document.documentElement.dataset.luviaModules=[...selected].join(',');
  }
  function pickerHtml(selected,settings={},options={}){const set=new Set(normalized(selected,options.trip));let group='',html='<div class="lm-picker-shell"><div class="lm-picker-toolbar"><span><b data-module-count>'+set.size+'</b> Module ausgewählt</span><span class="lm-toolbar-actions"><button type="button" class="lm-text-button" data-select-all-modules>Alle auswählen</button><button type="button" class="lm-text-button" data-clear-modules>Alle abwählen</button></span></div><div class="lm-picker">';for(const d of getCatalog()){if(d.group!==group){group=d.group;html+=`<div class="lm-group-title">${group||'Module'}</div>`}html+=`<label class="lm-option ${set.has(d.id)?'selected':''}" style="--lm-accent:${options.accent||current()?.accent||'#e76f91'}"><input type="checkbox" data-module-choice="${d.id}" ${set.has(d.id)?'checked':''}><span class="lm-check"></span><span class="lm-option-icon">${d.icon||'✨'}</span><span class="lm-option-copy"><strong>${d.title}</strong><small>${d.description||''}</small><em>V2 · Inhalte konfigurierbar</em></span></label>`;if(d.id==='memories')html+=`<div class="lm-reminder-config"><strong>Optionale Vorschläge</strong><p>Nur aktiv, wenn das Erinnerungsmodul gewählt ist.</p><div>${reminderPresets.map(([id,label])=>`<label><input type="checkbox" data-reminder-preset="${id}" ${(settings.reminderPresets||[]).includes(id)?'checked':''}> ${label}</label>`).join('')}</div></div>`}return html+'</div></div>'}
  function updatePicker(root){const count=root?.querySelectorAll('[data-module-choice]:checked').length||0,out=root?.querySelector('[data-module-count]');if(out)out.textContent=count;root?.querySelectorAll('.lm-option').forEach(label=>label.classList.toggle('selected',!!label.querySelector('[data-module-choice]')?.checked));const memories=root?.querySelector('[data-module-choice="memories"]'),config=root?.querySelector('.lm-reminder-config');if(config)config.classList.toggle('is-disabled',!memories?.checked)}
  function bindPicker(root){if(!root)return;root.addEventListener('change',e=>{if(e.target.matches('[data-module-choice]'))updatePicker(root)});root.querySelector('[data-select-all-modules]')?.addEventListener('click',()=>{root.querySelectorAll('[data-module-choice]').forEach(i=>i.checked=true);updatePicker(root)});root.querySelector('[data-clear-modules]')?.addEventListener('click',()=>{root.querySelectorAll('[data-module-choice]').forEach(i=>i.checked=false);updatePicker(root)});updatePicker(root)}
  function readPicker(root){return {selectedModules:[...root.querySelectorAll('[data-module-choice]:checked')].map(x=>x.dataset.moduleChoice),moduleSettings:{reminderPresets:[...root.querySelectorAll('[data-reminder-preset]:checked')].map(x=>x.dataset.reminderPreset)}}}
  function openEditor(trip=current(),onSave){if(!trip?.tripId)return;if(isOfficialParis(trip)){alert('Die offizielle Paris-Reise bleibt als Komplettvorlage geschützt. Inhalte können künftig über eine Kopie individualisiert werden.');return}const modal=document.createElement('div');modal.className='lm-modal';modal.innerHTML=`<div class="lm-modal-card"><div class="lm-modal-head"><div><span class="lm-eyebrow">Reise konfigurieren</span><h2>Module dieser Reise</h2><p>${trip.symbol||'❤️'} ${trip.tripName||'Unsere Reise'} · Neue Modultechnik V2</p></div><button class="lm-close">×</button></div>${pickerHtml(trip.selectedModules,trip.moduleSettings,{trip,accent:trip.accent})}<div class="lm-actions"><button class="pc-btn" data-cancel>Abbrechen</button><button class="pc-btn primary" data-save>Änderungen speichern</button></div></div>`;document.body.appendChild(modal);bindPicker(modal);const close=()=>modal.remove();modal.querySelector('.lm-close').onclick=close;modal.querySelector('[data-cancel]').onclick=close;modal.addEventListener('click',e=>{if(e.target===modal)close()});modal.querySelector('[data-save]').onclick=()=>{const data=readPicker(modal);saveTripPatch(trip.tripId,data);apply({...trip,...data});close();onSave?.(data)}}
  async function syncCloud(){const trip=current(),client=window.LuviaSupabaseService?.getClient?.()||window.ParisSupabaseClient||window.ParisCloud?.client;if(!trip?.tripId||!client||isOfficialParis(trip))return;try{const r=await client.rpc('luvia_get_trip_modules',{p_trip_id:trip.tripId});if(r.error)throw r.error;const remote=Array.isArray(r.data)?r.data[0]:r.data;if(remote&&Array.isArray(remote.modules)){const remoteSettings=remote.settings||{},localModules=Array.isArray(trip.selectedModules)?trip.selectedModules:[],remoteModules=remote.modules,localTime=Date.parse(trip.moduleSettings?._updatedAt||0)||0,remoteTime=Date.parse(remoteSettings?._updatedAt||0)||0;const localHasModules=localModules.length>0,remoteHasModules=remoteModules.length>0;const keepLocal=localHasModules&&(!remoteHasModules||!remoteTime||localTime>=remoteTime);if(keepLocal){await pushCloud(trip.tripId,{selectedModules:localModules,moduleSettings:trip.moduleSettings||{},moduleContent:trip.moduleContent||{}});apply(trip);return}if(remoteHasModules){const patch={selectedModules:remoteModules,moduleSettings:remoteSettings,moduleContent:remoteSettings.moduleContent||trip.moduleContent||{}};const existing=registry(),next=reconcileTrip({...trip,...patch});localStorage.setItem(REGISTRY_KEY,JSON.stringify(existing.some(t=>t?.tripId===trip.tripId)?existing.map(t=>t?.tripId===trip.tripId?{...t,...next}:t):[next,...existing]));localStorage.setItem(ID_KEY,JSON.stringify(next));apply(next);return}apply(trip)}}catch(error){console.info('Cloud-Modulkonfiguration nicht verfügbar:',error?.message||error)}}
  function repairOfficialParis(){const cur=current(),list=registry();let changed=false;const fix=t=>{if(!isOfficialParis(t))return t;const next={...t,templateId:'paris-official',isParisOfficial:true,selectedModules:defaults.slice(),moduleArchitecture:2};if(JSON.stringify(next)!==JSON.stringify(t))changed=true;return next};const nextList=list.map(fix);if(changed)localStorage.setItem(REGISTRY_KEY,JSON.stringify(nextList));if(cur&&isOfficialParis(cur))localStorage.setItem(ID_KEY,JSON.stringify(fix(cur)))}
  const api={register,getCatalog,getSelected,apply,mountAll,mountModule,unmountModule,getBlueprint,setModuleContent,getModuleData,setModuleData,pickerHtml,bindPicker,readPicker,openEditor,saveTripPatch,syncCloud,isOfficialParis,defaults:defaults.slice(),reminderPresets,instances};
  repairOfficialParis();window.LuviaModules=api;
  window.addEventListener('luvia:trip-changed',e=>{const active=current()||{},detail=e.detail||{},raw=detail.tripName||Array.isArray(detail.selectedModules)?detail:{...active,...(detail.changes||{}),tripId:detail.tripId||active.tripId};apply(reconcileTrip(raw))});window.addEventListener('luvia:trip-modules-changed',e=>apply(reconcileTrip(e.detail||current())));window.addEventListener('reisezeit:login-success',()=>setTimeout(()=>syncCloud(),50));
})();
