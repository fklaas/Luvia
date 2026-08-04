(() => {
  'use strict';

  const VERSION = '4.20.0';
  // LuviaGuidedDiscovery compatibility · hideBrowse:true · LuviaUserPreferences?.get · the former fixed slide flow is retained as a legacy API, while the primary UI is conversational.
  const TILES = Object.freeze({
    flights:{title:'Flüge',icon:'✈️',description:'Flughäfen und Terminals für eure An- oder Abreise.',tags:['Flughäfen','Terminals','Anreise'],preset:'flights'},
    rail:{title:'Bahn',icon:'🚆',description:'Fern-, Regional- und wichtige Umsteigebahnhöfe.',tags:['Fernverkehr','Regionalbahn','Bahnhöfe'],preset:'rail'},
    coaches:{title:'Bus & Fernbus',icon:'🚌',description:'Fernbusbahnhöfe und zentrale Busstationen.',tags:['Fernbus','Busbahnhöfe','Haltestellen'],preset:'coaches'},
    ferries:{title:'Fähren',icon:'⛴️',description:'Fährterminals und relevante Hafenverbindungen.',tags:['Fähren','Terminals','Häfen'],preset:'ferries'},
    local:{title:'Nahverkehr',icon:'🚇',description:'Metro, U-Bahn, S-Bahn, Straßenbahn und Bus vor Ort.',tags:['Metro','Tram','Bus'],preset:'local'},
    taxi:{title:'Taxi & Fahrdienste',icon:'🚕',description:'Taxistände und lokale Fahrdienste für flexible Wege.',tags:['Taxi','Transfer','Tür zu Tür'],preset:'taxi'},
    rental:{title:'Vermietung',icon:'🚗',description:'Mietwagen, Leihfahrzeuge und Sharing-Angebote.',tags:['Mietwagen','Sharing','Abholung'],preset:'rental'},
    parking:{title:'Parken & Laden',icon:'🅿️',description:'Parkhäuser, Park-and-Ride und Ladepunkte.',tags:['Parken','P+R','Laden'],preset:'parking'}
  });
  const SECTIONS = Object.freeze([
    {eyebrow:'An- & Abreise',title:'Wie kommt ihr hin und wieder zurück?',description:'Die großen Etappen eurer Reise – klar nach Verkehrsmittel getrennt.',tiles:['flights','rail','coaches','ferries']},
    {eyebrow:'Vor Ort',title:'Wie bewegt ihr euch am Reiseziel?',description:'Nahverkehr, flexible Fahrten, Vermietung sowie Parken und Laden.',tiles:['local','taxi','rental','parking']}
  ]);

  let state = {root:null,trip:null,active:null,mounted:false,view:'guided',contract:null};
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const enabled = () => window.LuviaModuleRegistry?.isEnabled?.(state.trip,'mobility') === true;
  const profile = () => window.LuviaProfileService?.snapshot?.().profile || {};

  function tile(id,index) {
    const item = TILES[id];
    return `<button class="places-hub-tile move-hub-tile" data-move-module="${esc(id)}" aria-label="${esc(item.title)} öffnen"><span class="places-hub-tile-top"><span class="places-hub-icon" aria-hidden="true">${item.icon}</span><span class="places-hub-number">Move ${String(index + 1).padStart(2,'0')}</span></span><span class="places-hub-copy"><strong>${esc(item.title)}</strong><small>${esc(item.description)}</small></span><span class="places-hub-tags" aria-hidden="true">${item.tags.map(tag => `<span>${esc(tag)}</span>`).join('')}</span><span class="places-hub-open">Bereich öffnen</span></button>`;
  }

  function storyCanvas(contract) {
    const chips = (window.LuviaDiscoveryContracts?.summaryChips?.(contract) || []).slice(0,4);
    return `<section class="guided-result-story guided-result-story-move"><div class="guided-result-story-copy"><span class="guided-result-kicker">Eure Reise bewegt sich</span><h1>Jeder gemeinsame Weg wird Teil der Geschichte.</h1><p>Move zeigt zuerst nur die Mobilitätspunkte, die zu diesem Reisemoment und eurem globalen Reisekompass passen.</p></div><div class="guided-result-scene" aria-hidden="true"><span class="guided-result-sun">✦</span><span class="guided-result-path"></span><span class="guided-result-plane">➜</span>${chips.map((chip,index) => `<i style="--story-index:${index}">${esc(chip)}</i>`).join('')}</div></section>`;
  }

  function catalogGate(item) {
    return `<section class="guided-catalog-gate"><div><span class="guided-result-kicker">Noch nicht der richtige Weg?</span><h3>Dann öffnen wir bewusst den gesamten ${esc(item.title)}-Bereich.</h3><p>Erst danach werden freie Suche und alle Katalogmöglichkeiten sichtbar. Die aktuelle Move-Auswahl verändert dein Reiseprofil nicht.</p></div><button type="button" data-guided-open-catalog>Gesamten Bereich öffnen <span>→</span></button></section>`;
  }

  function renderGuided() {
    state.active = null; state.contract = null; state.view = 'guided'; if (!state.root) return;
    state.root.innerHTML = '<div class="move-guided-host" data-move-guided></div>';
    const host=state.root.querySelector('[data-move-guided]'); const complete=async result => { const contract=window.LuviaAI?.planDiscovery ? await window.LuviaAI.planDiscovery('move',{contract:result.contract,answers:result.answers||{},freeText:result.freeText}) : result.contract; return showCurated(contract.moveTile||contract.mobilityTile||'local',contract); }; if(window.LuviaConversationalDiscovery?.mount) window.LuviaConversationalDiscovery.mount(host,{domain:'move',trip:state.trip,onComplete:complete}); else window.LuviaGuidedDiscovery?.mount?.(host,{domain:'move',trip:state.trip,hideBrowse:true,initialPreferences:window.LuviaUserPreferences?.get?.()||profile(),onComplete:complete});
  }

  async function showCurated(id,contract) {
    state.active=id; state.contract=contract; state.view='curated';
    state.root.innerHTML='<div class="move-curated-host" data-move-curated></div>';
    let result; try { result=await window.LuviaAISearchEvidencePipeline.execute({domain:'move',contract,destination:state.trip?.destination||{},maxResultCount:3}); } catch(error) { result={ok:false,data:{places:[],insufficientQuality:true},error}; }
    window.LuviaCuratedTravelCanvas.render(state.root.querySelector('[data-move-curated]'),{domain:'move',result,contract,onSelect:option=>open(id,option,null),onRefine:()=>renderGuided(),onCatalog:()=>open(id,null,null)});
  }

  function renderBrowseHub() {
    state.active = null;
    state.contract = null;
    state.view = 'browse';
    let counter = 0;
    const sections = SECTIONS.map(section => `<section class="move-hub-group"><header class="move-hub-group-head"><span class="rv2-kicker">${esc(section.eyebrow)}</span><h2>${esc(section.title)}</h2><p>${esc(section.description)}</p></header><div class="places-hub-grid move-hub-grid">${section.tiles.map(id => tile(id,counter++)).join('')}</div></section>`).join('');
    state.root.innerHTML = `<section class="places-hub move-hub move-hub-direct"><header><span class="rv2-kicker">Der ganze Mobilitätskatalog</span><h1>Alle Wege – erst jetzt vollständig geöffnet.</h1><p>Hier könnt ihr frei nach Verkehrsmitteln und Mobilitätspunkten suchen. Für eine neue persönliche Richtung startet ihr einfach wieder den Move-Flow.</p><button type="button" class="places-guided-return" data-move-guided-return>✦ Eine neue Move-Idee entstehen lassen</button></header>${enabled() ? sections : '<div class="places-hub-empty">Move ist für diese Reise nicht aktiviert.</div>'}</section>`;
    bind();
  }

  async function open(id,payload,contract = null) {
    const item = TILES[id];
    if (!item || !enabled()) return renderGuided();
    if (state.mounted) await window.LuviaModules?.unmountModule?.('mobility');
    state.active = id;
    state.mounted = true;
    state.view = contract ? 'guided-results' : 'catalog';
    state.contract = contract || null;
    window.LuviaMobility?.configureView?.(item.preset);
    const guided = Boolean(contract);
    const banner = guided ? window.LuviaDiscoveryContracts?.banner?.(contract,{title:'Diese Move-Vorschläge sind aus eurem Reisemoment entstanden'}) || '' : '';
    const navigation = guided
      ? '<button class="places-back" data-move-back>← Neue Move-Idee</button><span class="places-experience-context">Persönliche Auswahl</span>'
      : '<button class="places-back" data-move-back>← Neu von Move führen lassen</button><button class="places-direct-link" data-move-browse>Alle Bereiche</button>';
    state.root.innerHTML = `<section class="places-experience move-experience ${guided ? 'is-guided-results' : 'is-catalog-mode'} is-switching"><div class="places-experience-nav">${navigation}</div>${guided ? storyCanvas(contract) + banner : ''}<div id="mobility-module"></div>${guided ? catalogGate(item) : ''}</section>`;
    requestAnimationFrame(() => state.root.querySelector('.move-experience')?.classList.remove('is-switching'));
    if (contract) window.LuviaDiscoveryContracts?.setPending?.(contract);
    await window.LuviaModules?.mountModule?.('mobility',state.trip);
    if (contract) {
      try { await window.LuviaMobility?.search?.(contract.query,{discoveryContract:contract,sortBy:'distance'}); }
      finally { window.LuviaDiscoveryContracts?.clearPending?.(contract); }
    }
    if (payload) {
      await window.LuviaMobility?.load?.();
      await window.LuviaMobility?.openPlace?.({...payload,type:'mobility'});
    }
    bind();
  }

  async function openCatalog() {
    const id = state.active;
    if (!id) return showBrowse();
    await open(id,null,null);
  }

  async function showHub() {
    if (!state.root) return false;
    if (state.mounted) await window.LuviaModules?.unmountModule?.('mobility');
    state.mounted = false;
    renderGuided();
    return true;
  }

  async function showBrowse() {
    if (state.mounted) await window.LuviaModules?.unmountModule?.('mobility');
    state.mounted = false;
    renderBrowseHub();
  }

  function bind() {
    state.root?.querySelectorAll('[data-move-module]').forEach(button => button.onclick = () => open(button.dataset.moveModule));
    state.root?.querySelector('[data-move-back]')?.addEventListener('click',showHub);
    state.root?.querySelector('[data-move-browse]')?.addEventListener('click',showBrowse);
    state.root?.querySelector('[data-move-guided-return]')?.addEventListener('click',showHub);
    state.root?.querySelector('[data-guided-refine]')?.addEventListener('click',showHub);
    state.root?.querySelector('[data-guided-open-catalog]')?.addEventListener('click',openCatalog);
  }

  async function mount(root,trip,options = {}) {
    state.root = root;
    state.trip = trip;
    const requested = options.tileId || options.preset || (options.payload ? inferTile(options.payload) : null);
    if (requested && TILES[requested]) await open(requested,options.payload,options.contract || null);
    else renderGuided();
  }

  async function unmount() {
    if (state.mounted) await window.LuviaModules?.unmountModule?.('mobility');
    state = {root:null,trip:null,active:null,mounted:false,view:'guided',contract:null};
  }

  function inferTile(payload = {}) {
    const explicit = payload.moveTile || payload.mobilityTile || payload.preset;
    if (explicit && TILES[explicit]) return explicit;
    const place = payload.seedPlace || payload.place || {};
    const mode = window.LuviaTransportIntelligence?.mode?.(place)?.value || '';
    if (/Flughafen/.test(mode)) return 'flights';
    if (/Bahn/.test(mode)) return 'rail';
    if (/Bus/.test(mode)) return 'coaches';
    if (/Fähre/.test(mode)) return 'ferries';
    if (/Metro|Stadtbahn|Straßenbahn|ÖPNV/.test(mode)) return 'local';
    if (/Taxi/.test(mode)) return 'taxi';
    if (/Mietwagen|Sharing/.test(mode)) return 'rental';
    if (/Park|Ladestation/.test(mode)) return 'parking';
    return 'local';
  }

  function openPlace(payload = {}) { return open(inferTile(payload),payload); }

  window.LuviaMoveShell = Object.freeze({version:VERSION,mount,unmount,open,openPlace,showHub,showBrowse,active:() => state.active,view:() => state.view,tiles:() => Object.keys(TILES)});
})();
