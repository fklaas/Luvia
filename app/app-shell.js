(() => {
  'use strict';
  let root, activeView='dashboard', mountedRestaurant=false, unsubscribeTrip=null, unsubscribeAuth=null,authHydration=0,lastAuthUserId=null;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const snap=()=>window.LuviaTripStore.snapshot();
  const activeTrip=()=>snap().activeTrip;
  const date=v=>v?new Date(v+'T12:00:00').toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}):'';
  function bootScreen(text='Luvia wird vorbereitet …'){root.innerHTML=`<main class="lv-boot"><div class="lv-boot-card"><span class="lv-logo"></span><h1>Luvia</h1><p>${esc(text)}</p></div></main>`}
  function errorScreen(error){root.innerHTML=`<main class="lv-empty"><section class="lv-card"><span class="lv-logo"></span><h1>Start nicht möglich</h1><div class="lv-error">${esc(error?.message||error||'Unbekannter Fehler')}</div><div class="lv-actions"><button class="lv-primary" data-retry>Erneut versuchen</button><a class="lv-secondary" href="intelligence/console.html">Developer Console</a></div></section></main>`}
  function signedOut(){root.innerHTML=`<main class="lv-auth lv-card"><header class="lv-auth-head"><span class="lv-logo"></span><h1>Willkommen bei Luvia</h1><p>Gemeinsam reisen. Für immer erinnern.</p></header><div class="lv-auth-slot" data-auth-slot></div></main>`;window.ParisAuthUI.renderAuthForm(root.querySelector('[data-auth-slot]'),'login')}
  function noTrips(){root.innerHTML=`<main class="lv-empty"><section class="lv-card"><span class="lv-logo"></span><h1>Eure erste Reise wartet</h1><p>Erstellt jetzt eine Reise und legt Reiseziel, Zeitraum, Stil und Restaurants fest.</p><div class="lv-actions" style="justify-content:center"><button class="lv-primary" data-create>Reise erstellen</button><button class="lv-secondary" data-signout>Abmelden</button></div></section></main>`}
  function dashboard(t){const destination=t.destination?.formattedAddress||t.destination?.name||t.destinationName||'Reiseziel noch offen';const dates=t.startDate?(t.endDate?`${date(t.startDate)} – ${date(t.endDate)}`:`Ab ${date(t.startDate)}`):'Zeitraum noch offen';return `<section class="lv-dashboard"><article class="lv-card lv-hero"><span class="lv-kicker">Aktive Reise</span><div class="lv-titleline"><span class="lv-symbol">${esc(t.symbol||'❤️')}</span><div><h1>${esc(t.title||t.tripName||'Unsere Reise')}</h1><div class="lv-meta"><span>📍 ${esc(destination)}</span><span>📅 ${esc(dates)}</span></div></div></div><div class="lv-actions"><button class="lv-primary" data-view="restaurants">Restaurants öffnen</button><button class="lv-secondary" data-invite>Personen einladen</button><button class="lv-secondary" data-edit>Reise bearbeiten</button></div></article><div class="lv-grid"><article class="lv-card"><h2>Heute</h2><p>Das Dashboard wächst nur mit vollständig migrierten Modulen. Restaurants ist der erste produktive Baustein.</p></article><article class="lv-card"><h2>Reiseziel</h2><p>${esc(destination)} ist die zentrale Grundlage für Places, Restaurants, Karten und spätere Ortsfunktionen.</p></article></div></section>`}
  function dock(t){const modules=window.LuviaModuleRegistry.enabledForTrip(t);return `<div class="lv-dock-wrap"><nav class="lv-dock"><button class="lv-nav ${activeView==='dashboard'?'on':''}" data-view="dashboard">🏠 Dashboard</button>${modules.map(id=>{const m=window.LuviaModuleRegistry.get(id);return `<button class="lv-nav ${activeView===id?'on':''}" data-view="${id}">${m.icon} ${esc(m.title)}</button>`}).join('')}</nav></div>`}
  async function unmountCurrent(){if(mountedRestaurant){window.LuviaModules?.unmountModule?.('restaurants');mountedRestaurant=false}}
  async function show(view='dashboard'){
    const t=activeTrip();if(!t)return render();await unmountCurrent();activeView=view;
    const stage=root.querySelector('[data-stage]');
    if(view==='restaurants'){
      stage.innerHTML='<section class="lv-module-host"><div id="restaurants-module"></div></section>';
      try{window.LuviaModules.mountModule('restaurants',window.LuviaLegacyParisMigrator.toLegacy(t));mountedRestaurant=true}catch(error){console.error(error);stage.innerHTML='<section class="lv-card" style="padding:24px"><h2>Restaurants</h2><div class="lv-error">Das Restaurantmodul konnte nicht geöffnet werden.</div></section>'}
    }else{activeView='dashboard';stage.innerHTML=dashboard(t)}
    root.querySelector('.lv-dock-wrap')?.remove();root.querySelector('.lv-shell')?.insertAdjacentHTML('beforeend',dock(t));window.scrollTo({top:0,behavior:'instant'});
  }
  function ready(){const t=activeTrip();if(!t)return noTrips();window.LuviaTheme?.apply?.(t);root.innerHTML=`<div class="lv-shell"><header class="lv-header"><span class="lv-logo"></span><div class="lv-trip"><strong>${esc(t.title||t.tripName||'Unsere Reise')}</strong><small>${esc(t.destination?.name||t.destinationName||'Reiseziel offen')}</small></div><span class="lv-spacer"></span><button class="lv-icon" data-invite>＋ <span class="lv-label">Einladen</span></button><button class="lv-icon" data-signout>↪ <span class="lv-label">Abmelden</span></button></header><main class="lv-stage" data-stage></main></div>`;show(activeView)}
  function render(){const auth=window.ParisAuth.getState();if(auth.loading)return bootScreen();if(!auth.authenticated)return signedOut();const trips=snap();if(!trips.loaded)return bootScreen('Reisen werden geladen …');if(!trips.hasTrips||!trips.hasActiveTrip)return noTrips();return ready()}
  async function hydrateForAuth(client,authState){
    const run=++authHydration;
    if(!authState?.authenticated){lastAuthUserId=null;render();return}
    const userId=authState.user?.id||null;
    bootScreen('Reisen werden aus der Cloud geladen …');
    await window.LuviaTripStore.loadRemote(client,{authoritative:true});
    if(run!==authHydration)return;
    lastAuthUserId=userId;
    window.LuviaRuntime.refresh();
    window.LuviaTheme?.apply?.(activeTrip());
    window.LuviaDestination?.refresh?.();
    render();
  }
  async function bootstrap(){bootScreen();try{const client=await window.LuviaSupabaseService.start();window.LuviaTripStore.initialize();await window.LuviaDestination?.init?.();window.LuviaPWA?.register?.().catch(error=>console.warn('[LuviaPWA]',error));unsubscribeTrip?.();unsubscribeAuth?.();unsubscribeTrip=window.LuviaTripStore.subscribe(()=>{if(activeView==='restaurants'&&mountedRestaurant)return;render()});unsubscribeAuth=window.ParisAuth.onChange(state=>{const uid=state?.user?.id||null;if(state?.authenticated&&uid!==lastAuthUserId)hydrateForAuth(client,state).catch(error=>errorScreen(error));else render()});await hydrateForAuth(client,window.ParisAuth.getState())}catch(error){console.error('[LuviaApp]',error);errorScreen(error)}}
  function bind(){root.addEventListener('click',async e=>{if(e.target.closest('[data-retry]'))return bootstrap();if(e.target.closest('[data-create]'))return window.LuviaTripCreator.open();if(e.target.closest('[data-signout]'))return window.ParisAuth.signOut();if(e.target.closest('[data-invite]'))return window.LuviaTripExperience.openInvite(activeTrip());if(e.target.closest('[data-edit]'))return window.LuviaTripExperience.openEdit(activeTrip());const view=e.target.closest('[data-view]')?.dataset.view;if(view)return show(view)})}
  window.LuviaApp=Object.freeze({version:'11.2.4',bootstrap,render,show});
  window.addEventListener('DOMContentLoaded',()=>{root=document.getElementById('app');bind();bootstrap()},{once:true});
})();
