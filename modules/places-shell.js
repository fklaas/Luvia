(() => {
  'use strict';
  const VERSION='4.25.0';
  const MODULES={photo_spots:{title:'Fotospots',host:'photo-spots-module'},attractions:{title:'Sehenswürdigkeiten & Aktivitäten',host:'attractions-module'},restaurants:{title:'Restaurants',host:'restaurants-module'},accommodations:{title:'Unterkünfte',host:'accommodations-module'},nature:{title:'Natur & Ausflüge',host:'nature-module'},shopping:{title:'Shopping',host:'shopping-module'}};
  let state={root:null,trip:null,mounted:null,view:'planning'};
  const enabled=()=> (window.LuviaModuleRegistry?.enabledForTrip?.(state.trip)||[]).filter(id=>MODULES[id]);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function open(id,payload){
    if(!MODULES[id]||!enabled().includes(id)) return showBrowse();
    if(state.mounted) await window.LuviaModules?.unmountModule?.(state.mounted);
    state.mounted=id;state.view='catalog';
    state.root.innerHTML=`<section class="places-experience is-catalog-mode"><div class="places-experience-nav"><button class="places-back" data-back-planning>← Zur Planung</button><button class="places-direct-link" data-all-catalog>Alle Bereiche</button></div><div id="${MODULES[id].host}"></div></section>`;
    await window.LuviaModules?.mountModule?.(id,state.trip);
    if(payload) requestAnimationFrame(()=>window.dispatchEvent(new CustomEvent('luvia:open-place',{detail:payload})));
    bind();
  }
  async function showBrowse(){
    if(state.mounted) await window.LuviaModules?.unmountModule?.(state.mounted);state.mounted=null;state.view='catalog-hub';
    state.root.innerHTML=`<section class="places-hub places-hub-direct"><header><span class="rv2-kicker">Bewusster Katalogmodus</span><h1>Alle Places durchsuchen.</h1><p>Der bestehende Places Core bleibt für freie Recherche erhalten. Er startet ausschließlich auf euren ausdrücklichen Wunsch und verändert die Planning Session nicht.</p><button type="button" class="places-guided-return" data-back-planning>← Zur neuen Planung</button></header><div class="places-hub-grid">${enabled().map(id=>`<button class="places-hub-tile" data-place-module="${esc(id)}"><span class="places-hub-copy"><strong>${esc(MODULES[id].title)}</strong><small>Kanonischen Cloud-Katalog öffnen</small></span><span class="places-hub-open">Bereich öffnen</span></button>`).join('')}</div></section>`;bind();
  }
  async function showHub(){
    if(state.mounted) await window.LuviaModules?.unmountModule?.(state.mounted);state.mounted=null;state.view='focus';
    const categories=[['🍽️','Essen & Trinken'],['🎟️','Aktivitäten'],['🏛️','Sehenswürdigkeiten'],['🎭','Kultur'],['🌿','Natur & Erholung'],['🛍️','Shopping'],['🌙','Nachtleben'],['🧰','Praktisch unterwegs']];
    state.root.innerHTML=`<section class="places-focus-reset"><header><span class="rv2-kicker">Places wird fokussiert</span><h1>Orte, die wirklich zu euch passen.</h1><p>Der experimentelle Mehrziel-Planer ist deaktiviert. Im nächsten Baustein sucht Luvia wieder genau einen Wunsch zurzeit – persönlich, verständlich und mit höchstens fünf echten Orten.</p></header><div class="places-focus-categories">${categories.map(([icon,label])=>`<span><b>${icon}</b>${esc(label)}</span>`).join('')}</div><div class="places-focus-actions"><button type="button" class="places-focus-primary" data-all-catalog>Bestehenden Places-Katalog öffnen</button><small>Freie KI-Suche folgt mit 13.26.0 · Places Final Foundation.</small></div></section>`;
    bind();return true;
  }
  function bind(){state.root?.querySelectorAll('[data-place-module]').forEach(button=>button.onclick=()=>open(button.dataset.placeModule));state.root?.querySelectorAll('[data-back-planning]').forEach(button=>button.onclick=showHub);state.root?.querySelector('[data-all-catalog]')?.addEventListener('click',showBrowse)}
  async function mount(root,trip,options={}){state.root=root;state.trip=trip;if(options.tileId&&MODULES[options.tileId])await open(options.tileId,options.payload);else if(options.catalog)await showBrowse();else await showHub()}
  async function unmount(){if(state.mounted)await window.LuviaModules?.unmountModule?.(state.mounted);state={root:null,trip:null,mounted:null,view:'planning'}}
  function openPlace(payload={}){const type=payload.type||payload.placeType||'';const map={restaurant:'restaurants',accommodation:'accommodations',attraction:'attractions',photo_spot:'photo_spots',nature:'nature',shopping:'shopping'};return open(map[type]||'attractions',payload)}
  window.LuviaPlacesShell=Object.freeze({version:VERSION,mount,unmount,open,openPlace,showHub,showBrowse,active:()=>state.mounted,view:()=>state.view,modules:()=>Object.keys(MODULES)});
})();
