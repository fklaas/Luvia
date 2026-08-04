(() => {
  'use strict';

  const VERSION = '4.19.1';
  // LuviaGuidedDiscovery compatibility · hideBrowse:true · LuviaUserPreferences?.get · the former fixed slide flow is retained as a legacy API, while the primary UI is conversational.
  const PLACE_MODULES = {
    photo_spots:{type:'photo_spot',title:'Fotospots',icon:'📸',description:'Aussichten, Lichtstimmungen und besondere Fotomomente entdecken.',tags:['Golden Hour','Aussicht','Erinnerungen'],host:'photo-spots-module'},
    attractions:{type:'attraction',title:'Sehenswürdigkeiten & Aktivitäten',icon:'✨',description:'Museen, Parks, Aussichtspunkte und Erlebnisse entdecken.',tags:['Kultur','Aktivitäten','Highlights'],host:'attractions-module'},
    restaurants:{type:'restaurant',title:'Restaurants',icon:'🍽️',description:'Genuss, Cafés und besondere Restaurantmomente entdecken.',tags:['Restaurants','Cafés','Genuss'],host:'restaurants-module'},
    accommodations:{type:'accommodation',title:'Unterkünfte',icon:'🏨',description:'Hotels, Apartments und besondere Unterkünfte finden.',tags:['Hotels','Apartments','Reisebasis'],host:'accommodations-module'},
    nature:{type:'nature',title:'Natur & Ausflüge',icon:'🌿',description:'Parks, Landschaften und besondere Ausflugsziele entdecken.',tags:['Natur','Ruhe','Ausflüge'],host:'nature-module'},
    shopping:{type:'shopping',title:'Shopping',icon:'🛍️',description:'Märkte, Boutiquen, Souvenirs und besondere Einkaufsorte entdecken.',tags:['Märkte','Boutiquen','Souvenirs'],host:'shopping-module'}
  };

  let state = {root:null,trip:null,active:null,mounted:null,view:'guided',contract:null};
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const enabled = () => (window.LuviaModuleRegistry?.enabledForTrip?.(state.trip) || []).filter(id => PLACE_MODULES[id]);
  const profile = () => window.LuviaProfileService?.snapshot?.().profile || {};
  const destination = () => state.trip?.destination?.name || state.trip?.destination?.formattedAddress || 'eurer Reise';

  function tile(id,index) {
    const module = PLACE_MODULES[id];
    return `<button class="places-hub-tile" data-place-module="${esc(id)}" aria-label="${esc(module.title)} öffnen"><span class="places-hub-tile-top"><span class="places-hub-icon" aria-hidden="true">${module.icon}</span><span class="places-hub-number">Place ${String(index + 1).padStart(2,'0')}</span></span><span class="places-hub-copy"><strong>${esc(module.title)}</strong><small>${esc(module.description)}</small></span><span class="places-hub-tags" aria-hidden="true">${module.tags.map(tag => `<span>${esc(tag)}</span>`).join('')}</span><span class="places-hub-open">Bereich öffnen</span></button>`;
  }

  function storyCanvas(contract) {
    const chips = (window.LuviaDiscoveryContracts?.summaryChips?.(contract) || []).slice(0,4);
    return `<section class="guided-result-story guided-result-story-places"><div class="guided-result-story-copy"><span class="guided-result-kicker">Aus einer Idee wird eure Geschichte</span><h1>Eure nächsten Erinnerungen warten schon.</h1><p>Luvia zeigt zuerst nur die Orte, die aus eurer geführten Auswahl und eurem persönlichen Reisekompass entstanden sind.</p></div><div class="guided-result-scene" aria-hidden="true"><span class="guided-result-sun">✦</span><span class="guided-result-path"></span><span class="guided-result-plane">✈</span>${chips.map((chip,index) => `<i style="--story-index:${index}">${esc(chip)}</i>`).join('')}</div></section>`;
  }

  function catalogGate(module) {
    return `<section class="guided-catalog-gate"><div><span class="guided-result-kicker">Noch nicht eure Geschichte?</span><h3>Dann öffnen wir bewusst den ganzen ${esc(module.title)}-Bereich.</h3><p>Erst hier erscheinen freie Suche, Kategorien und weitere Filter. Eure geführte Auswahl bleibt davon getrennt.</p></div><button type="button" data-guided-open-catalog>Gesamten Bereich öffnen <span>→</span></button></section>`;
  }

  function renderGuided() {
    state.active = null; state.contract = null; state.view = 'guided'; if (!state.root) return;
    state.root.innerHTML = '<div class="places-guided-host" data-places-guided></div>';
    const host=state.root.querySelector('[data-places-guided]'); const complete=async result => { const contract=window.LuviaAI?.planDiscovery ? await window.LuviaAI.planDiscovery('places',{contract:result.contract,answers:result.answers||{},freeText:result.freeText}) : result.contract; const id=contract.moduleId||contract.placesTile||'attractions'; return open(id,null,contract); }; if(window.LuviaConversationalDiscovery?.mount) window.LuviaConversationalDiscovery.mount(host,{domain:'places',trip:state.trip,onComplete:complete}); else window.LuviaGuidedDiscovery?.mount?.(host,{domain:'places',trip:state.trip,hideBrowse:true,initialPreferences:window.LuviaUserPreferences?.get?.()||profile(),onComplete:complete});
  }

  function renderBrowseHub() {
    state.active = null;
    state.contract = null;
    state.view = 'browse';
    const modules = enabled();
    state.root.innerHTML = `<section class="places-hub places-hub-direct"><header><span class="rv2-kicker">Der ganze Reisekatalog</span><h1>Alle Places – offen, klar und bereit für eure eigene Richtung.</h1><p>Diese Ansicht öffnet Luvia erst bewusst nach der persönlichen Inspiration. Hier könnt ihr frei in allen Bereichen stöbern.</p><button type="button" class="places-guided-return" data-places-guided-return>✦ Eine neue persönliche Idee entstehen lassen</button></header><div class="places-hub-grid">${modules.map(tile).join('') || '<div class="places-hub-empty">Für diese Reise ist noch kein Places-Bereich aktiviert.</div>'}</div></section>`;
    bind();
  }

  async function applyContract(contract) {
    if (!contract) return;
    const api = {
      restaurants:window.LuviaRestaurantsV2,
      accommodations:window.LuviaAccommodations,
      attractions:window.LuviaAttractions,
      photo_spots:window.LuviaPhotoSpots,
      shopping:window.LuviaShopping,
      nature:window.LuviaNature
    }[contract.moduleId];
    await api?.search?.(contract.moduleId === 'restaurants' ? contract : contract.query, {discoveryContract:contract});
  }

  async function open(id,payload,contract = null) {
    if (!PLACE_MODULES[id] || !enabled().includes(id)) return renderGuided();
    if (state.mounted) await window.LuviaModules?.unmountModule?.(state.mounted);
    state.active = id;
    state.mounted = id;
    state.view = contract ? 'guided-results' : 'catalog';
    state.contract = contract || null;
    const module = PLACE_MODULES[id];
    const guided = Boolean(contract);
    const banner = guided ? window.LuviaDiscoveryContracts?.banner?.(contract,{title:'Diese Places sind aus eurer Reiseidee entstanden'}) || '' : '';
    const navigation = guided
      ? '<button class="places-back" data-places-back>← Neue Inspiration</button><span class="places-experience-context">Persönliche Auswahl</span>'
      : '<button class="places-back" data-places-back>← Neu inspirieren lassen</button><button class="places-direct-link" data-places-browse>Alle Bereiche</button>';
    state.root.innerHTML = `<section class="places-experience ${guided ? 'is-guided-results' : 'is-catalog-mode'} is-switching"><div class="places-experience-nav">${navigation}</div>${guided ? storyCanvas(contract) + banner : ''}<div id="${module.host}"></div>${guided ? catalogGate(module) : ''}</section>`;
    requestAnimationFrame(() => state.root.querySelector('.places-experience')?.classList.remove('is-switching'));
    if (contract) window.LuviaDiscoveryContracts?.setPending?.(contract);
    await window.LuviaModules.mountModule(id,state.trip);
    if (contract) {
      try { await applyContract(contract); }
      finally { window.LuviaDiscoveryContracts?.clearPending?.(contract); }
    }
    if (payload) requestAnimationFrame(() => window.dispatchEvent(new CustomEvent('luvia:open-place',{detail:payload})));
    bind();
  }

  async function openCatalog() {
    const id = state.active;
    if (!id) return showBrowse();
    await open(id,null,null);
  }

  async function showHub() {
    if (!state.root) return false;
    if (state.mounted) await window.LuviaModules?.unmountModule?.(state.mounted);
    state.mounted = null;
    renderGuided();
    return true;
  }

  async function showBrowse() {
    if (state.mounted) await window.LuviaModules?.unmountModule?.(state.mounted);
    state.mounted = null;
    renderBrowseHub();
  }

  function bind() {
    state.root?.querySelectorAll('[data-place-module]').forEach(button => button.onclick = () => open(button.dataset.placeModule));
    state.root?.querySelector('[data-places-back]')?.addEventListener('click',showHub);
    state.root?.querySelector('[data-places-browse]')?.addEventListener('click',showBrowse);
    state.root?.querySelector('[data-places-guided-return]')?.addEventListener('click',showHub);
    state.root?.querySelector('[data-guided-refine]')?.addEventListener('click',showHub);
    state.root?.querySelector('[data-guided-open-catalog]')?.addEventListener('click',openCatalog);
  }

  async function mount(root,trip,options = {}) {
    state.root = root;
    state.trip = trip;
    const requested = options.moduleId || null;
    if (requested && enabled().includes(requested)) await open(requested,options.payload,options.contract || null);
    else renderGuided();
  }

  async function unmount() {
    if (state.mounted) await window.LuviaModules?.unmountModule?.(state.mounted);
    state = {root:null,trip:null,active:null,mounted:null,view:'guided',contract:null};
  }

  function openPlace(payload = {}) {
    const id = payload.type === 'restaurant' ? 'restaurants' : payload.type === 'accommodation' ? 'accommodations' : payload.type === 'attraction' ? 'attractions' : payload.type === 'photo_spot' ? 'photo_spots' : payload.type === 'shopping' ? 'shopping' : payload.type === 'nature' ? 'nature' : null;
    return id ? open(id,payload) : false;
  }

  window.LuviaPlacesShell = Object.freeze({version:VERSION,mount,unmount,open,openPlace,showHub,showBrowse,active:() => state.active,view:() => state.view});
})();
