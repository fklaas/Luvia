(() => {
  'use strict';
  let root=null,active='dashboard',mountedRestaurant=false,unsubscribe=null;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const store=()=>window.LuviaTripStore?.snapshot?.();
  const trip=()=>store()?.activeTrip||null;
  function formatDate(value){if(!value)return'';const d=new Date(value+'T12:00:00');return Number.isNaN(d)?'':d.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})}
  function hideLegacy(){
    [...document.body.children].forEach(node=>{if(node.id!=='luviaV11Root'&&node.id!=='luviaV11Boot'&&node.tagName!=='SCRIPT')node.style.setProperty('display','none','important')});
    document.documentElement.classList.remove('luvia-shell-active','luvia-shell-built');
  }
  function dashboard(t){const destination=t.destination?.name||t.destinationName||'Reiseziel noch offen';const dates=t.startDate?(t.endDate?`${formatDate(t.startDate)} – ${formatDate(t.endDate)}`:`Ab ${formatDate(t.startDate)}`):'Zeitraum noch offen';return `<section class="lv11-dashboard"><article class="lv11-hero"><span class="lv11-kicker">Aktive Reise</span><div class="lv11-hero-line"><span class="lv11-symbol">${esc(t.symbol||'❤️')}</span><div><h1>${esc(t.title||t.tripName||'Unsere Reise')}</h1><div class="lv11-meta"><span>📍 ${esc(destination)}</span><span>📅 ${esc(dates)}</span></div></div></div><div class="lv11-actions"><button class="lv11-primary" data-open="restaurants">Restaurants öffnen</button><button class="lv11-secondary" data-invite>Personen einladen</button><button class="lv11-secondary" data-edit>Reise bearbeiten</button></div></article><div class="lv11-grid"><article class="lv11-card"><h2>Heute</h2><p>Das neue Dashboard wächst ab jetzt nur mit wirklich fertigen Modulen. Restaurants ist der erste aktive Baustein.</p></article><article class="lv11-card"><h2>Reiseziel</h2><p>${esc(destination)} ist die zentrale Grundlage für Restaurants, Places, Karten und alle späteren Ortsfunktionen.</p></article></div></section>`}
  function dock(t){const enabled=window.LuviaModuleRegistry?.enabledForTrip(t)||['restaurants'];return `<div class="lv11-dock-wrap"><nav class="lv11-dock" aria-label="Reisebereiche"><button class="lv11-nav ${active==='dashboard'?'on':''}" data-open="dashboard">🏠 Dashboard</button>${enabled.map(id=>{const m=window.LuviaModuleRegistry.get(id);return `<button class="lv11-nav ${active===id?'on':''}" data-open="${id}">${m.icon} ${esc(m.title)}</button>`}).join('')}</nav></div>`}
  async function mountRestaurant(host,t){
    const source=document.getElementById('restaurants-module');
    if(source&&source.parentElement!==host)host.appendChild(source);
    source?.style.setProperty('display','block','important');
    try{await window.LuviaModules?.mountModule?.('restaurants',t);mountedRestaurant=true}catch(e){console.error('[LuviaV11] Restaurant mount',e);host.innerHTML='<div class="lv11-card"><h2>Restaurants</h2><p>Das Restaurantmodul konnte nicht geladen werden.</p></div>'}
  }
  async function show(id='dashboard'){
    const t=trip();if(!root||!t)return;active=id;
    const stage=root.querySelector('[data-stage]');
    if(id==='dashboard'){if(mountedRestaurant){window.LuviaModules?.unmountModule?.('restaurants');mountedRestaurant=false}stage.innerHTML=dashboard(t)}else if(id==='restaurants'){stage.innerHTML='<section class="lv11-module-host" data-module-host></section>';await mountRestaurant(stage.querySelector('[data-module-host]'),t)}else return show('dashboard');
    root.querySelector('.lv11-dock-wrap')?.remove();root.querySelector('.lv11-app').insertAdjacentHTML('beforeend',dock(t));stage.scrollTop=0;
  }
  function render(){
    const snap=store();const t=snap?.activeTrip;
    if(!t){root.innerHTML='<div class="lv11-empty"><section><h1>Noch keine aktive Reise</h1><p>Erstellt oder wählt zuerst eine Reise aus.</p><button class="lv11-primary" data-create>Reise erstellen</button></section></div>';return}
    root.style.setProperty('--trip-accent',t.accent||'#ee6f83');root.innerHTML=`<div class="lv11-app"><header class="lv11-head"><span class="lv11-logo"></span><div class="lv11-trip"><strong>${esc(t.title||t.tripName||'Unsere Reise')}</strong><small>${esc(t.destination?.name||t.destinationName||'Reiseziel offen')}</small></div><div class="lv11-head-actions"><button class="lv11-icon-btn" data-invite>＋ <span class="lv11-label">Einladen</span></button><button class="lv11-icon-btn" data-edit>⚙️ <span class="lv11-label">Reise</span></button></div></header><main class="lv11-stage" data-stage></main></div>`;show(active==='restaurants'?'restaurants':'dashboard')
  }
  function bind(){root.addEventListener('click',e=>{const open=e.target.closest('[data-open]');if(open)return show(open.dataset.open);if(e.target.closest('[data-create]'))return window.LuviaTripCreator?.open?.();if(e.target.closest('[data-invite]'))return window.LuviaTripExperience?.openInvite?.(trip());if(e.target.closest('[data-edit]'))return window.LuviaTripExperience?.openEdit?.(trip())})}
  async function boot(){
    let bootNode=document.getElementById('luviaV11Boot');if(!bootNode){bootNode=document.createElement('div');bootNode.id='luviaV11Boot';bootNode.className='lv11-boot';bootNode.innerHTML='<div class="lv11-boot-card"><div class="lv11-boot-logo"></div><p>Luvia wird vorbereitet …</p></div>';document.body.appendChild(bootNode)}
    await window.LuviaRuntime?.boot?.({client:window.ParisCloud?.client});
    root=document.createElement('div');root.id='luviaV11Root';document.body.appendChild(root);hideLegacy();bind();render();unsubscribe=window.LuviaTripStore?.subscribe?.(()=>render());bootNode.remove();document.documentElement.classList.remove('luvia-v11-boot');document.documentElement.classList.add('luvia-v11-ready');
  }
  window.LuviaAppShellV11=Object.freeze({version:'3.0.0',boot,show,render});
  window.addEventListener('load',()=>setTimeout(boot,0),{once:true});
})();
