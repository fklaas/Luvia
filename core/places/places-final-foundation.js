(() => {
  'use strict';
  const VERSION='4.27.0';
  const MAX_RESULTS=5;
  const CATEGORY_DEFS=Object.freeze({
    food:{icon:'🍽️',label:'Essen & Trinken',type:'restaurant',includedType:'restaurant',query:'Restaurants Cafés Bars Essen',keywords:['essen','restaurant','nudeln','pasta','vegetar','vegan','café','cafe','frühstück','bar','trinken']},
    activities:{icon:'🎟️',label:'Aktivitäten',type:'activity',includedType:'',query:'Aktivitäten Erlebnisse Freizeit',keywords:['aktivität','aktivitäten','unternehmen','erleben','freizeit','indoor','outdoor','spielen','spaß']},
    sights:{icon:'🏛️',label:'Sehenswürdigkeiten',type:'attraction',includedType:'tourist_attraction',query:'Sehenswürdigkeiten Wahrzeichen besondere Orte',keywords:['sehenswürdigkeit','wahrzeichen','besichtigen','aussicht','historisch']},
    culture:{icon:'🎭',label:'Kultur',type:'attraction',includedType:'',query:'Museen Kino Theater Kultur',keywords:['museum','kino','film','theater','galerie','kultur','konzert']},
    nature:{icon:'🌿',label:'Natur & Erholung',type:'nature',includedType:'park',query:'Parks Gärten Natur Erholung',keywords:['natur','park','garten','strand','see','wandern','spazieren','erholung']},
    shopping:{icon:'🛍️',label:'Shopping',type:'shopping',includedType:'',query:'Shopping Märkte besondere Geschäfte',keywords:['shopping','einkaufen','markt','boutique','souvenir','geschäft']},
    nightlife:{icon:'🌙',label:'Nachtleben',type:'custom',includedType:'',query:'Bars Clubs Rooftops Nachtleben Live Musik',keywords:['nachtleben','club','rooftop','cocktail','live musik','abend']},
    practical:{icon:'🧰',label:'Praktisch unterwegs',type:'custom',includedType:'',query:'Apotheke Supermarkt Parkplatz Toilette Ladestation',keywords:['apotheke','supermarkt','toilette','parkplatz','laden','ladestation','geldautomat','waschsalon','tankstelle']}
  });
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clean=v=>String(v??'').trim();
  const providerId=p=>clean(p?.providerPlaceId||p?.id||'').replace(/^places\//,'');
  const destination=trip=>clean(trip?.destination?.name||trip?.destination?.formattedAddress||trip?.destinationName||trip?.name||'');
  const tripId=trip=>clean(trip?.id||trip?.tripId||window.LuviaTripContext?.getActiveTrip?.()?.tripId||window.LuviaTripStore?.snapshot?.()?.activeTripId);
  const state={root:null,trip:null,phase:'entry',input:'',category:null,activeGoal:null,pendingGoals:[],question:null,answer:'',results:[],loading:false,error:null,details:new Map(),rejected:new Set(),known:new Map(),sequence:0,lastAction:null,lastError:null,lastStartedAt:null,lastCompletedAt:null};
  function storageKey(){return `luvia:places-final:${tripId(state.trip)}`}
  function loadLocal(){try{const v=JSON.parse(sessionStorage.getItem(storageKey())||'{}');state.rejected=new Set(v.rejected||[]);state.pendingGoals=Array.isArray(v.pendingGoals)?v.pendingGoals:[]}catch{state.rejected=new Set();state.pendingGoals=[]}}
  function saveLocal(){try{sessionStorage.setItem(storageKey(),JSON.stringify({rejected:[...state.rejected],pendingGoals:state.pendingGoals.slice(0,5)}))}catch{}}
  function categoryFor(text){const q=clean(text).toLowerCase();let best='activities',score=0;for(const [key,def] of Object.entries(CATEGORY_DEFS)){const n=def.keywords.reduce((sum,k)=>sum+(q.includes(k)?1:0),0);if(n>score){best=key;score=n}}return best}
  function splitGoals(input){const raw=clean(input);if(!raw)return[];const parts=raw.split(/\b(?:danach|anschließend|und dann|später noch)\b/i).map(clean).filter(Boolean);return parts.length?parts:[raw]}
  function currentPreferences(){return window.LuviaUserPreferences?.snapshot?.()||window.LuviaTravelPreferences?.snapshot?.()||window.LuviaProfileService?.snapshot?.()?.preferences||{}}
  function participants(){const trip=state.trip||{};return trip.participants||trip.members||window.LuviaCollaboration?.snapshot?.()?.members||[]}
  function personalImpulses(){const prefs=JSON.stringify(currentPreferences()).toLowerCase(),dest=destination(state.trip)||'eurem Reiseziel',withChild=JSON.stringify(participants()).toLowerCase().match(/baby|kind|livi/);return [
    prefs.includes('vegetar')?`Vegetarisch essen in ${dest}`:`Schön essen in ${dest}`,
    withChild?`Eine entspannte Aktivität mit Kind in ${dest}`:`Eine besondere Aktivität in ${dest}`,
    `Einen ruhigen Ort in ${dest} entdecken`,
    `Etwas finden, das nicht jeder Tourist kennt`
  ];}
  async function loadKnown(){state.known.clear();try{const res=await window.LuviaPlaceEntities?.list?.({tripId:tripId(state.trip)});for(const e of res?.data?.entities||[]){const p=e.place||{},tp=e.tripPlace||{};state.known.set(clean(p.provider_place_id||p.source_id),{status:tp.lifecycle_status||tp.status||'idea',planned:Boolean(tp.planned_date||tp.planned_time),tripPlaceId:tp.id})}}catch{}}
  function createGoal(text,category=null){const key=category||categoryFor(text);return{id:crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`,text:clean(text),category:key,createdAt:new Date().toISOString()}}
  async function understand(input,category=null){const goals=splitGoals(input).map((x,i)=>createGoal(x,i===0?category:null));if(!goals.length)return null;state.activeGoal=goals[0];state.pendingGoals=goals.slice(1);saveLocal();
    // Nur eine Rückfrage, wenn der Wunsch wirklich zu offen ist.
    const words=state.activeGoal.text.split(/\s+/).filter(Boolean);if(words.length<2&&!category){state.question={text:'Was ist euch dabei besonders wichtig?',options:['Ganz in der Nähe','Besonders ruhig','Mit Kind geeignet','Etwas Besonderes']};state.phase='question';render();return null}
    state.question=null;return state.activeGoal;
  }
  function searchQuery(goal){const def=CATEGORY_DEFS[goal.category]||CATEGORY_DEFS.activities;let q=goal.text||def.query;const dest=destination(state.trip);if(dest&&!q.toLowerCase().includes(dest.toLowerCase()))q=`${q} ${dest}`;return q}
  function validForCategory(place,category){const types=new Set(place?.types||[]),def=CATEGORY_DEFS[category]||CATEGORY_DEFS.activities;if(!providerId(place)||clean(place?.name).length<2)return false;if(category==='food')return [...types].some(t=>/restaurant|cafe|bakery|bar|meal|food/.test(t))||/restaurant|café|cafe|bistro|pizza|bar/i.test(place.name||'');if(category==='culture'&&/kino|cinema|film/i.test(state.activeGoal?.text||''))return types.has('movie_theater');if(category==='nature')return [...types].some(t=>/park|garden|natural|beach|campground/.test(t));if(category==='shopping')return [...types].some(t=>/store|shopping|market|mall/.test(t));if(category==='practical')return [...types].some(t=>/pharmacy|supermarket|parking|toilet|gas_station|charging|atm|laundry/.test(t));return true}
  function score(place){const known=state.known.get(providerId(place));let s=0;s+=Math.min(25,Number(place.rating||0)*5);s+=Math.min(15,Math.log10(Math.max(1,Number(place.userRatingCount||0)))*5);if(place.currentOpeningHours?.openNow===true||place.openNow===true)s+=10;if(place.formattedAddress||place.address)s+=5;if(place.location||place.latitude)s+=5;if(known?.planned)s-=18;if(/visited|checked_in|checked_out/.test(known?.status||''))s-=15;const q=(state.activeGoal?.text||'').toLowerCase();const hay=`${place.name||''} ${place.editorialSummary?.text||place.editorialSummary||''} ${(place.types||[]).join(' ')}`.toLowerCase();for(const token of q.split(/\W+/).filter(x=>x.length>3))if(hay.includes(token))s+=2;return s}
  async function enrich(list){const output=[];for(const p of list.slice(0,10)){try{const prep=await window.LuviaPlaceDetails?.prepare?.(providerId(p),{seedPlace:p,photoLimit:1,regionCode:window.LuviaPlaces?.activeDestination?.()?.countryCode||'DE'});output.push({...p,...(prep?.place||{}),_photo:prep?.photos?.[0]?.uri||null})}catch{output.push(p)}}return output}
  async function search(goal=state.activeGoal){
    if(!goal){state.lastError='NO_ACTIVE_GOAL';state.error='Bitte beschreibt zuerst, wonach ihr sucht.';state.phase='empty';render();return false}
    if(state.loading)return false;
    const seq=++state.sequence;
    state.loading=true;state.error=null;state.lastError=null;state.lastAction='search';state.lastStartedAt=new Date().toISOString();state.results=[];state.phase='loading';render();
    try{
      if(!window.LuviaPlaceEntities?.searchPlaces)throw new Error('Places-Suche ist noch nicht vollständig geladen. Bitte die App einmal aktualisieren.');
      await loadKnown();
      const def=CATEGORY_DEFS[goal.category]||CATEGORY_DEFS.activities;
      const response=await window.LuviaPlaceEntities.searchPlaces({tripId:tripId(state.trip),type:def.type,includedType:def.includedType,query:searchQuery(goal),maxResultCount:14,strictDestination:true});
      if(seq!==state.sequence)return false;
      let places=(response?.data?.places||[]).filter(p=>!state.rejected.has(providerId(p))).filter(p=>validForCategory(p,goal.category));
      places=await enrich(places);
      const unique=[];const seen=new Set();
      for(const p of places){const id=providerId(p);if(!id||seen.has(id))continue;seen.add(id);unique.push(p)}
      state.results=unique.sort((a,b)=>score(b)-score(a)).slice(0,MAX_RESULTS);
      state.phase=state.results.length?'results':'empty';
      if(!state.results.length&&!state.error)state.error='Für diesen Wunsch wurden gerade keine ausreichend passenden Orte gefunden.';
      state.lastCompletedAt=new Date().toISOString();
      return true;
    }catch(error){
      state.lastError=error?.code||error?.message||String(error);
      state.error=error?.message||'Die Places-Suche konnte nicht gestartet werden.';
      state.phase='empty';
      console.error('[Luvia Places Final] Suche fehlgeschlagen',error);
      return false;
    }finally{state.loading=false;render()}
  }
  function mapsUrl(place){const id=providerId(place),query=encodeURIComponent(`${place.name||''} ${place.formattedAddress||place.address||''}`);return id?`https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${encodeURIComponent(id)}`:`https://www.google.com/maps/search/?api=1&query=${query}`}
  function openMaps(place){window.open(mapsUrl(place),'_blank','noopener,noreferrer')}
  async function importEntity(place,status='idea'){const def=CATEGORY_DEFS[state.activeGoal?.category]||CATEGORY_DEFS.activities;const response=await window.LuviaPlaceEntities.importPlace(providerId(place),{tripId:tripId(state.trip),type:def.type,providerPlace:place,tripPlace:{status}});return response?.data?.entity||response?.data||response}
  async function markDiscovered(place,button){button.disabled=true;try{await importEntity(place,'idea');toast('Als entdeckt gespeichert.');await loadKnown();render()}catch(e){toast(e.message||'Ort konnte nicht gespeichert werden.',true)}finally{button.disabled=false}}
  function planningDialog(place){const now=new Date();const defaultDate=state.trip?.startDate||state.trip?.start_date||now.toISOString().slice(0,10);const modal=document.createElement('div');modal.className='places-final-modal';modal.innerHTML=`<form class="places-final-modal-card"><button type="button" class="places-final-modal-close" aria-label="Schließen">×</button><span class="rv2-kicker">Zur Timeline hinzufügen</span><h2>${esc(place.name)}</h2><label>Reisetag<input name="date" type="date" required value="${esc(defaultDate)}"></label><label>Uhrzeit<input name="time" type="time" value="12:00"></label><label>Notiz<textarea name="note" placeholder="Optional"></textarea></label><button class="places-final-primary" type="submit">Einplanen</button></form>`;document.body.appendChild(modal);modal.querySelector('.places-final-modal-close').onclick=()=>modal.remove();modal.onclick=e=>{if(e.target===modal)modal.remove()};modal.querySelector('form').onsubmit=async e=>{e.preventDefault();const submit=e.submitter;submit.disabled=true;try{const fd=new FormData(e.currentTarget),date=fd.get('date'),time=fd.get('time')||'12:00',plannedAt=new Date(`${date}T${time}:00`).toISOString(),entity=await importEntity(place,'planned'),tp=entity?.tripPlace||entity?.trip_place||entity?.data?.tripPlace||{},p=entity?.place||entity?.data?.place||{};if(!tp.id)throw new Error('Place-Verknüpfung konnte nicht erstellt werden.');const def=CATEGORY_DEFS[state.activeGoal?.category]||CATEGORY_DEFS.activities;const activeTripId=tripId(state.trip);const fields={planned_at:plannedAt,notes:clean(fd.get('note')),place_name:place.name};if(window.LuviaPlaceCollections?.saveDateFields){await window.LuviaPlaceCollections.saveDateFields({tripId:activeTripId,placeType:def.type,tripPlaceId:tp.id,placeId:p.id||tp.place_id,fields});}else{await window.LuviaTripPlaceData.upsert({tripId:activeTripId,tripPlaceId:tp.id,placeId:p.id||tp.place_id,placeType:def.type,fields});}await window.LuviaPlaceEntities?.updateLifecycle?.(tp.id,'planned',{}, {tripId:activeTripId});await window.LuviaTimelineCore?.hydrate?.(activeTripId);window.dispatchEvent(new CustomEvent('luvia:place-plan-changed',{detail:{tripId:activeTripId,type:def.type,tripPlaceId:tp.id,fields}}));window.dispatchEvent(new CustomEvent('luvia:timeline-invalidated',{detail:{tripId:activeTripId,type:def.type,tripPlaceId:tp.id}}));window.dispatchEvent(new CustomEvent('luvia:in-window-data-changed',{detail:{tripId:activeTripId,placeType:def.type,tripPlaceId:tp.id}}));window.dispatchEvent(new CustomEvent('luvia:dashboard-widget-refresh',{detail:{id:'today'}}));modal.remove();toast('Zur Timeline hinzugefügt.');await continueFlow(place)}catch(err){toast(err.message||'Planung fehlgeschlagen.',true)}finally{submit.disabled=false}}}
  async function reject(place){state.rejected.add(providerId(place));saveLocal();state.results=state.results.filter(p=>providerId(p)!==providerId(place));toast('Luvia berücksichtigt diese Ablehnung.');if(!state.results.length)state.phase='empty';render()}
  async function continueFlow(){if(state.pendingGoals.length){state.activeGoal=state.pendingGoals.shift();saveLocal();state.phase='continue';render()}else{state.phase='results';render()}}
  function toast(message,error=false){window.LuviaUIKit?.toast?.(message,{type:error?'error':'success'})||(()=>{const el=document.createElement('div');el.className=`places-final-toast ${error?'is-error':''}`;el.textContent=message;document.body.appendChild(el);setTimeout(()=>el.remove(),2500)})()}
  function resultCard(place,index){const known=state.known.get(providerId(place)),open=place.currentOpeningHours?.openNow??place.openNow,photo=place._photo;return `<article class="places-final-result ${index===0?'is-primary':''}">${photo?`<img src="${esc(photo)}" alt="${esc(place.name)}" loading="lazy">`:`<div class="places-final-photo-fallback">${CATEGORY_DEFS[state.activeGoal?.category]?.icon||'📍'}</div>`}<div class="places-final-result-body"><div class="places-final-result-top"><span>${index===0?'Luvias Empfehlung':`Alternative ${index+1}`}</span>${known?`<em>${known.planned?'Geplant':'Entdeckt'}</em>`:''}</div><h2>${esc(place.name)}</h2><p class="places-final-address">${esc(place.formattedAddress||place.address||destination(state.trip))}</p><div class="places-final-facts">${place.rating?`<span>★ ${Number(place.rating).toFixed(1).replace('.',',')}</span>`:''}${place.userRatingCount?`<span>${Number(place.userRatingCount).toLocaleString('de-DE')} Bewertungen</span>`:''}${open===true?'<span>Heute geöffnet</span>':open===false?'<span>Aktuell geschlossen</span>':''}</div><p class="places-final-reason">${esc(reason(place,index))}</p><div class="places-final-actions"><button class="places-final-primary" data-plan="${esc(providerId(place))}">Zur Timeline</button><button data-maps="${esc(providerId(place))}">In Google Maps</button><button data-discover="${esc(providerId(place))}">${known?'Entdeckt':'Als entdeckt merken'}</button><button data-reject="${esc(providerId(place))}">Nicht passend</button></div></div></article>`}
  function reason(place,index){const category=CATEGORY_DEFS[state.activeGoal?.category]?.label||'eurem Wunsch';const opening=(place.currentOpeningHours?.openNow??place.openNow)===true?' und ist aktuell geöffnet':'';return index===0?`Dieser Ort passt unter den geprüften Treffern am besten zu „${state.activeGoal?.text}“${opening}.`:`Eine weitere reale Option aus ${category}, die Luvia für euren aktuellen Reisemoment geprüft hat${opening}.`}
  function entryHtml(){return `<section class="places-final"><header class="places-final-hero"><span class="rv2-kicker">Luvia Places</span><h1>Was möchtet ihr entdecken?</h1><p>Beschreibt einen Wunsch frei oder startet mit einer persönlichen Idee. Luvia sucht immer nur einen Ortstyp zurzeit und zeigt höchstens fünf echte Treffer.</p><div class="places-final-impulses">${personalImpulses().map(x=>`<button data-impulse="${esc(x)}">${esc(x)}</button>`).join('')}</div><form class="places-final-search" novalidate><textarea name="query" placeholder="Zum Beispiel: vegetarisch essen, am liebsten Nudeln" required>${esc(state.input)}</textarea><button type="submit" class="places-final-primary" data-search-submit>Luvia suchen lassen</button><p class="places-final-inline-status" data-search-status aria-live="polite"></p></form></header><div class="places-final-categories"><div><span>Direkt entdecken</span><h2>Oder mit einer Kategorie starten</h2></div><div class="places-final-category-grid">${Object.entries(CATEGORY_DEFS).map(([key,d])=>`<button data-category="${key}"><b>${d.icon}</b><span>${esc(d.label)}</span></button>`).join('')}</div></div><button class="places-final-catalog" data-catalog>Alle Places im klassischen Katalog ansehen</button></section>`}
  function loadingHtml(){return `<section class="places-final places-final-centered"><div class="places-final-loader"><div class="places-final-orbit"><span></span><i></i><b></b></div><span class="rv2-kicker">Luvia prüft echte Orte</span><h1>${esc(state.activeGoal?.text||'Passende Orte finden')}</h1><p>Zielgebiet, Place-Typen, Details, Öffnungszeiten und eure persönlichen Signale werden zusammengeführt.</p></div></section>`}
  function questionHtml(){return `<section class="places-final places-final-centered"><div class="places-final-question"><span class="rv2-kicker">Eine Sache fehlt noch</span><h1>${esc(state.question?.text)}</h1><div>${(state.question?.options||[]).map(x=>`<button data-answer="${esc(x)}">${esc(x)}</button>`).join('')}</div><form data-free-answer><input name="answer" placeholder="Oder frei antworten"><button class="places-final-primary">Übernehmen</button></form><button data-reset>Wunsch bearbeiten</button></div></section>`}
  function resultsHtml(){return `<section class="places-final"><header class="places-final-results-head"><span class="rv2-kicker">${esc(CATEGORY_DEFS[state.activeGoal?.category]?.label||'Places')}</span><h1>${state.results.length} passende ${state.results.length===1?'Idee':'Ideen'} für euch.</h1><p>Keine künstliche Kombination: Jeder Treffer beantwortet nur euren aktuellen Wunsch „${esc(state.activeGoal?.text)}“.</p></header><div class="places-final-results">${state.results.map(resultCard).join('')}</div>${state.pendingGoals.length?`<aside class="places-final-next"><span>Danach gemerkt</span><strong>${esc(state.pendingGoals[0].text)}</strong><p>Nach eurer Auswahl führt Luvia mit diesem Wunsch weiter.</p></aside>`:''}<div class="places-final-footer"><button data-reset>Neue Suche</button><button data-catalog>Gesamten Katalog öffnen</button></div></section>`}
  function emptyHtml(){return `<section class="places-final places-final-centered"><div class="places-final-empty"><span class="rv2-kicker">Luvia bleibt ehrlich</span><h1>Noch kein Treffer passt zuverlässig.</h1><p>${esc(state.error||'Verfeinert euren aktuellen Wunsch oder startet direkt über eine Kategorie. Andere erkannte Wünsche bleiben erhalten.')}</p><button class="places-final-primary" data-reset>Wunsch verfeinern</button><button data-catalog>Katalog öffnen</button></div></section>`}
  function continueHtml(){return `<section class="places-final places-final-centered"><div class="places-final-question"><span class="rv2-kicker">Nächster Wunsch</span><h1>${esc(state.activeGoal?.text)}</h1><p>Der vorherige Ort ist ausgewählt. Luvia sucht jetzt bewusst nur nach diesem nächsten Wunsch.</p><button class="places-final-primary" data-continue>Jetzt weitersuchen</button><button data-reset>Neue Suche beginnen</button></div></section>`}
  function render(){if(!state.root)return;state.root.innerHTML=state.phase==='loading'?loadingHtml():state.phase==='question'?questionHtml():state.phase==='results'?resultsHtml():state.phase==='empty'?emptyHtml():state.phase==='continue'?continueHtml():entryHtml();bind()}
  function findResult(id){return state.results.find(p=>providerId(p)===id)}
  function bind(){
    const r=state.root;
    const runEntrySearch=async(event)=>{
      event?.preventDefault?.();event?.stopPropagation?.();
      if(state.loading)return;
      const form=r.querySelector('.places-final-search');
      const textarea=form?.querySelector('textarea[name="query"]');
      state.input=clean(textarea?.value||state.input);
      if(!state.input){textarea?.focus();const status=form?.querySelector('[data-search-status]');if(status)status.textContent='Bitte beschreibt kurz, wonach ihr sucht.';return}
      const goal=await understand(state.input);
      if(goal)await search(goal);
    };
    r.querySelectorAll('[data-impulse]').forEach(b=>b.onclick=async()=>{state.input=b.dataset.impulse;const goal=await understand(state.input);if(goal)await search(goal)});
    r.querySelectorAll('[data-category]').forEach(b=>b.onclick=async()=>{const key=b.dataset.category,def=CATEGORY_DEFS[key];state.input=def.query;const goal=await understand(def.query,key);if(goal)await search(goal)});
    const form=r.querySelector('.places-final-search');
    form?.addEventListener('submit',runEntrySearch);
    form?.querySelector('[data-search-submit]')?.addEventListener('click',runEntrySearch);
    form?.querySelector('textarea[name="query"]')?.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')runEntrySearch(e)});
    r.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>{state.activeGoal.text=`${state.activeGoal.text}, ${b.dataset.answer}`;state.question=null;search(state.activeGoal)});
    r.querySelector('[data-free-answer]')?.addEventListener('submit',e=>{e.preventDefault();const a=clean(new FormData(e.currentTarget).get('answer'));if(a)state.activeGoal.text=`${state.activeGoal.text}, ${a}`;state.question=null;search(state.activeGoal)});
    r.querySelectorAll('[data-plan]').forEach(b=>b.onclick=()=>planningDialog(findResult(b.dataset.plan)));
    r.querySelectorAll('[data-maps]').forEach(b=>b.onclick=()=>openMaps(findResult(b.dataset.maps)));
    r.querySelectorAll('[data-discover]').forEach(b=>b.onclick=()=>markDiscovered(findResult(b.dataset.discover),b));
    r.querySelectorAll('[data-reject]').forEach(b=>b.onclick=()=>reject(findResult(b.dataset.reject)));
    r.querySelectorAll('[data-reset]').forEach(b=>b.onclick=()=>{state.phase='entry';state.input='';state.activeGoal=null;state.pendingGoals=[];state.question=null;state.results=[];state.error=null;saveLocal();render()});
    r.querySelectorAll('[data-catalog]').forEach(b=>b.onclick=()=>window.LuviaPlacesShell?.showBrowse?.());
    r.querySelector('[data-continue]')?.addEventListener('click',()=>search(state.activeGoal));
  }
  async function mount(root,trip){state.root=root;state.trip=trip;state.phase='entry';state.input='';state.category=null;state.activeGoal=null;state.question=null;state.results=[];state.error=null;loadLocal();await loadKnown();render();return true}
  function unmount(){state.sequence++;state.root=null;state.trip=null;state.results=[];state.details.clear()}
  window.LuviaPlacesFinal=Object.freeze({version:VERSION,mount,unmount,search:(text,category)=>understand(text,category).then(g=>g&&search(g)),categories:()=>cloneCategories(),diagnostics:()=>({version:VERSION,status:'ready',maxResults:MAX_RESULTS,singleActiveGoal:true,sequentialGoals:true,phase:state.phase,loading:state.loading,rejected:state.rejected.size,lastAction:state.lastAction,lastError:state.lastError,lastStartedAt:state.lastStartedAt,lastCompletedAt:state.lastCompletedAt,dependencies:{placeEntities:Boolean(window.LuviaPlaceEntities?.searchPlaces),places:Boolean(window.LuviaPlaces?.textSearch),backend:Boolean(window.LuviaBackend?.request)}})});
  function cloneCategories(){return JSON.parse(JSON.stringify(CATEGORY_DEFS))}
})();
