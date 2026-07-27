(function(){
  'use strict';

  const ID_KEY='parisIdentityV1';
  const SHELL_ID='luviaAppShell';
  const SOURCE_CLASS='luvia-shell-source-hidden';
  const titles={hero:'Countdown & Reise-Story',assistant:'Reiseassistent',liveMoments:'Live Moments',apps:'Must-have Apps',language:'Sprachcoach',mobility:'Anreise & Mobilität',restaurants:'Restaurants',budget:'Budget-Tracker',gallery:'Reisegalerie',photoSpots:'Fotospots',memories:'Erinnerungen',dayPlans:'Reisetage',review:'Cinematic Revue',travelBook:'Reisebuch',closing:'Reiseabschluss'};
  const icons={dashboard:'⌂',hero:'⏳',assistant:'✨',liveMoments:'📍',apps:'📱',language:'🗣️',mobility:'🚗',restaurants:'🍽️',budget:'💶',gallery:'📸',photoSpots:'📷',memories:'♡',dayPlans:'🗓️',review:'🎬',travelBook:'📖',closing:'❤️'};

  let active='dashboard';
  let touchStart=null;
  let introTimer=null;
  let built=false;
  let scheduled=false;
  let transitioning=false;
  const DASHBOARD_WIDGETS={hero:'.ld-hero',today:'.ld-today',live:'.ld-live',weather:'.ld-weather',budget:'.ld-budget',memories:'.ld-memory',calendar:'.ld-calendar',checklist:'.ld-checklist',review:'.ld-review',book:'.ld-book'};

  function parse(value,fallback=null){try{const parsed=JSON.parse(value);return parsed==null?fallback:parsed}catch{return fallback}}
  function trip(){return window.LuviaAppState?.getSnapshot?.().trip?.trip||window.LuviaTripContext?.getActiveTrip?.()||parse(localStorage.getItem(ID_KEY),null)}
  function isOfficial(value){return window.LuviaModules?.isOfficialParis?.(value)||value?.templateId==='paris-official'||value?.isParisOfficial===true}
  function selected(value){return Array.isArray(value?.selectedModules)?[...new Set(value.selectedModules.filter(Boolean))]:[]}
  function catalog(){return window.LuviaModules?.getCatalog?.()||[]}
  function main(){return document.querySelector('main.wrap')}
  function appIsUnlocked(){
    const state=window.LuviaAppState?.getSnapshot?.();
    if(state)return state.unlocked;
    const gateway=document.getElementById('appGateway');
    return !document.body.classList.contains('app-gateway-locked') && (!gateway || gateway.hidden || gateway.classList.contains('is-authenticated'));
  }
  function depth(node){let count=0;for(let cursor=node;cursor;cursor=cursor.parentElement)count++;return count}
  function escapeHtml(value){return String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]))}

  function reportShellError(error,stage='build'){
    console.error(`[LuviaAppShell] ${stage} failed`,error);
    document.documentElement.classList.remove('luvia-shell-active','luvia-shell-built','luvia-module-transitioning');
    const existing=document.getElementById('luviaShellRecovery');
    if(existing)existing.remove();
    const host=main();
    if(!host)return;
    const notice=document.createElement('section');
    notice.id='luviaShellRecovery';
    notice.className='luvia-shell-recovery';
    notice.innerHTML=`<div><span>♡</span><h2>Luvia konnte die Reiseansicht nicht vollständig aufbauen</h2><p>Die vorhandene Reise bleibt nutzbar. Du kannst die Ansicht erneut laden oder zur Reiseauswahl zurückkehren.</p><div><button type="button" data-shell-retry>Ansicht erneut laden</button><button type="button" class="secondary" data-shell-trips>Reise auswählen</button></div><small>${escapeHtml(error?.message||String(error||'Unbekannter Fehler'))}</small></div>`;
    host.prepend(notice);
    notice.querySelector('[data-shell-retry]')?.addEventListener('click',()=>location.reload());
    notice.querySelector('[data-shell-trips]')?.addEventListener('click',()=>window.ParisProfileCenter?.open?.('trips'));
  }

  function uniqueRoots(nodes){
    const unique=[...new Set(nodes.filter(Boolean))];
    return unique.filter(node=>!unique.some(other=>other!==node&&other.contains(node)));
  }

  function collectModuleRoots(){
    const root=main();
    const records=[];
    let sequence=0;
    for(const definition of catalog()){
      const matches=[];
      for(const selector of definition.selectors||[]){
        try{document.querySelectorAll(selector).forEach(node=>{if(root?.contains(node))matches.push(node)})}catch(error){console.warn('Ungültiger Modul-Selektor',selector,error)}
      }
      for(const node of uniqueRoots(matches))records.push({id:definition.id,node,sequence:sequence++,depth:depth(node)});
    }
    // Verschachtelte Spezialmodule zuerst herauslösen. Danach können ihre Eltern
    // als eigener Screen verschoben werden, ohne Inhalte mitzunehmen.
    records.sort((a,b)=>b.depth-a.depth||a.sequence-b.sequence);
    return records;
  }

  function createScreen(id,definition,value){
    const section=document.createElement('section');
    section.className='luvia-app-screen';
    section.dataset.screen=id;
    section.hidden=id!=='dashboard';
    if(id==='dashboard'){
      section.innerHTML='<div class="luvia-screen-content" data-screen-content="dashboard"></div>';
      return section;
    }
    section.innerHTML=`<div class="luvia-screen-content" data-screen-content="${escapeHtml(id)}"></div>`;
    return section;
  }

  function build(){
    const rootMain=main();
    const appState=window.LuviaAppState?.getSnapshot?.();
    const value=appState?.trip?.trip||trip();
    if(!rootMain||!value||!value.tripId||isOfficial(value)||!appIsUnlocked())return false;
    if(document.getElementById(SHELL_ID)){built=true;return true}

    const definitions=new Map(catalog().map(item=>[item.id,item]));
    const shell=document.createElement('div');
    shell.id=SHELL_ID;
    shell.className='luvia-app-shell';
    shell.innerHTML='<div class="luvia-app-viewport" data-shell-viewport></div><div class="luvia-module-intro" data-module-intro aria-hidden="true" hidden><div class="luvia-module-intro-card"><span class="luvia-module-intro-kicker">Luvia Reisemodul</span><span class="luvia-module-intro-icon" data-intro-icon>✨</span><strong data-intro-title>Modul</strong><small data-intro-destination>Unsere Reise</small><i aria-hidden="true"></i></div></div><nav class="luvia-shell-nav" aria-label="Reisemodule"></nav>';
    const viewport=shell.querySelector('[data-shell-viewport]');

    const dashboard=createScreen('dashboard',null,value);
    viewport.appendChild(dashboard);
    for(const definition of catalog())viewport.appendChild(createScreen(definition.id,definition,value));

    // Originale DOM-Knoten verschieben: Event Listener, IDs und bestehende
    // Modulskripte bleiben dadurch vollständig erhalten.
    const dashboardNode=document.getElementById('luvia-dashboard');
    if(dashboardNode)dashboard.querySelector('[data-screen-content="dashboard"]').appendChild(dashboardNode);

    for(const record of collectModuleRoots()){
      const content=viewport.querySelector(`[data-screen-content="${CSS.escape(record.id)}"]`);
      if(content&&record.node.isConnected)content.appendChild(record.node);
    }

    // Alles, was nicht eindeutig Dashboard oder Modul ist, bleibt als Quelle im
    // Dokument, wird in modularen Reisen aber niemals angezeigt. So können keine
    // Paris-Blöcke oder Standardbereiche mehr in einen Screen durchsickern.
    [...rootMain.children].forEach(child=>child.classList.add(SOURCE_CLASS));
    rootMain.prepend(shell);

    shell.addEventListener('click',event=>{
      const navButton=event.target.closest('[data-shell-screen]');
      if(navButton){show(navButton.dataset.shellScreen);return}
      const moduleLink=event.target.closest('a[href^="#"],button[data-target],button[data-module]');
      if(!moduleLink)return;
      const token=(moduleLink.getAttribute('href')||moduleLink.dataset.target||moduleLink.dataset.module||'').replace(/^#/,'');
      const moduleId=findModuleForToken(token);
      if(moduleId&&selected(trip()).includes(moduleId)){event.preventDefault();show(moduleId)}
    });

    const viewportNode=shell.querySelector('[data-shell-viewport]');
    viewportNode.addEventListener('touchstart',event=>{
      if(event.touches.length!==1||transitioning)return;
      const target=event.target;
      touchStart={
        x:event.touches[0].clientX,
        y:event.touches[0].clientY,
        time:performance.now(),
        blocked:isGestureOwnedByContent(target),
        target
      };
    },{passive:true});
    viewportNode.addEventListener('touchend',event=>{
      if(!touchStart||event.changedTouches.length!==1)return;
      const start=touchStart;
      touchStart=null;
      if(start.blocked||transitioning)return;
      const dx=event.changedTouches[0].clientX-start.x;
      const dy=event.changedTouches[0].clientY-start.y;
      const elapsed=Math.max(1,performance.now()-start.time);
      const velocity=Math.abs(dx)/elapsed;
      const horizontal=Math.abs(dx)>Math.abs(dy)*1.45;
      if(horizontal&&Math.abs(dx)>=82&&(velocity>.18||Math.abs(dx)>=125)){
        step(dx<0?1:-1);
        return;
      }
      if(Math.abs(dy)>=145&&Math.abs(dy)>Math.abs(dx)*1.8){
        const currentScreen=shell.querySelector(`.luvia-app-screen[data-screen="${CSS.escape(active)}"]`);
        const atTop=!currentScreen||currentScreen.scrollTop<6;
        const atBottom=!currentScreen||currentScreen.scrollHeight-currentScreen.scrollTop-currentScreen.clientHeight<6;
        if(dy<0&&atBottom)step(1);
        if(dy>0&&atTop)step(-1);
      }
    },{passive:true});

    document.documentElement.classList.add('luvia-shell-active','luvia-shell-built');
    document.getElementById('luviaShellRecovery')?.remove();
    built=true;
    render();
    requestAnimationFrame(syncMobileShellHeight);
    return true;
  }


  function syncMobileShellHeight(){
    if(!window.matchMedia('(max-width:760px)').matches){
      document.documentElement.style.removeProperty('--luvia-mobile-shell-height');
      return;
    }
    const root=main();
    if(!root)return;
    const rect=root.getBoundingClientRect();
    const viewportHeight=window.visualViewport?.height||window.innerHeight;
    const available=Math.max(280,Math.floor(viewportHeight-Math.max(0,rect.top)));
    document.documentElement.style.setProperty('--luvia-mobile-shell-height',available+'px');
  }

  function isGestureOwnedByContent(target){
    if(!(target instanceof Element))return false;
    if(target.closest('input,textarea,select,button,a,[contenteditable="true"],[data-no-shell-swipe],.luvia-shell-nav'))return true;
    const explicit=target.closest('.horizontal-scroll,.scroll-row,.chip-row,.tabs,.tab-list,.category-tabs,.language-categories,.phrase-categories,.gallery-strip,.photo-strip,.restaurant-tools,[data-horizontal-scroll]');
    if(explicit)return true;
    let node=target;
    const shell=document.getElementById(SHELL_ID);
    while(node&&node!==shell){
      const style=getComputedStyle(node);
      const overflowX=style.overflowX;
      if((overflowX==='auto'||overflowX==='scroll')&&node.scrollWidth>node.clientWidth+8)return true;
      node=node.parentElement;
    }
    return false;
  }

  function moduleSurfaceColor(id){
    const shell=document.getElementById(SHELL_ID);
    const screen=shell?.querySelector(`.luvia-app-screen[data-screen="${CSS.escape(id)}"]`);
    const content=screen?.querySelector('.luvia-screen-content');
    const first=[...content?.children||[]].find(node=>node instanceof HTMLElement);
    for(const node of [first,content,screen]){
      if(!node)continue;
      const color=getComputedStyle(node).backgroundColor;
      if(color&&color!=='rgba(0, 0, 0, 0)'&&color!=='transparent')return color;
    }
    return 'rgba(255,255,255,.97)';
  }

  function parseHexColor(hex){
    const raw=String(hex||'').trim().replace('#','');
    const value=raw.length===3?raw.split('').map(c=>c+c).join(''):raw;
    if(!/^[0-9a-f]{6}$/i.test(value))return [231,111,145];
    return [0,2,4].map(i=>parseInt(value.slice(i,i+2),16));
  }

  function toHex(rgb){
    return '#'+rgb.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
  }

  function mixHex(a,b,weight){
    const A=parseHexColor(a),B=parseHexColor(b),w=Math.max(0,Math.min(1,weight));
    return toHex(A.map((v,i)=>v*(1-w)+B[i]*w));
  }

  function relativeLuminance(hex){
    const rgb=parseHexColor(hex).map(v=>v/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);
    return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
  }

  function contrastRatio(a,b){
    const L1=relativeLuminance(a),L2=relativeLuminance(b);
    return (Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05);
  }

  function bestInk(background){
    const candidates=['#ffffff','#172f40','#201823'];
    return candidates.sort((a,b)=>contrastRatio(b,background)-contrastRatio(a,background))[0];
  }

  function accentPalette(accent){
    const deep=mixHex(accent,'#172f40',.34);
    const hover=mixHex(accent,bestInk(accent)==='#ffffff'?'#ffffff':'#172f40',bestInk(accent)==='#ffffff'?.13:.12);
    const soft=mixHex(accent,'#ffffff',.84);
    const softer=mixHex(accent,'#ffffff',.92);
    const pale=mixHex(accent,'#ffffff',.96);
    const mid=mixHex(accent,'#ffffff',.32);
    return {
      accent,deep,hover,soft,softer,pale,mid,
      ink:bestInk(accent),
      deepInk:bestInk(deep),
      hoverInk:bestInk(hover),
      softInk:bestInk(soft)
    };
  }


  function enhanceModuleAssets(root=document){
    root.querySelectorAll?.('.apple-mark').forEach(mark=>{
      if(mark.dataset.svgReady)return;
      mark.dataset.svgReady='1';
      mark.setAttribute('aria-hidden','true');
      mark.innerHTML='<svg class="luvia-apple-logo" viewBox="0 0 32 38" focusable="false" aria-hidden="true"><path d="M23.6 20.1c0-4.1 3.4-6.1 3.6-6.2-1.9-2.8-4.9-3.2-6-3.2-2.5-.3-5 1.5-6.3 1.5-1.3 0-3.4-1.5-5.6-1.4-2.9 0-5.6 1.7-7.1 4.3-3.1 5.3-.8 13.1 2.2 17.4 1.5 2.1 3.2 4.5 5.5 4.4 2.2-.1 3.1-1.4 5.8-1.4 2.7 0 3.5 1.4 5.8 1.4 2.4 0 3.9-2.1 5.4-4.3 1.7-2.5 2.4-4.9 2.4-5-.1 0-5.7-2.2-5.7-7.5ZM19.5 8c1.2-1.5 2-3.5 1.8-5.5-1.8.1-4 .12-5.3 1.7-1.2 1.3-2.2 3.4-1.9 5.3 2 .2 4.1-1 5.4-2.5Z"/></svg>';
    });
    const flags={fr:['fr','Französisch'],en:['gb','Englisch']};
    Object.entries(flags).forEach(([lang,[code,label]])=>{
      root.querySelectorAll?.(`[data-coach-language="${lang}"]`).forEach(button=>{
        if(button.querySelector('.luvia-language-flag'))return;
        button.textContent=button.textContent.replace(/^[^\p{L}\p{N}]+/u,'').trim()||label;
        const flag=document.createElement('span');
        flag.className=`luvia-language-flag flag-${code}`;
        flag.setAttribute('aria-hidden','true');
        button.prepend(flag);
      });
    });
  }

  function normalizeModuleAccent(id){
    const shell=document.getElementById(SHELL_ID);
    const screen=shell?.querySelector(`.luvia-app-screen[data-screen="${CSS.escape(id)}"]`);
    const content=screen?.querySelector('.luvia-screen-content');
    if(!content)return;
    enhanceModuleAssets(content);
    const accent=(trip()?.accent||'#e76f91').trim();
    const palette=accentPalette(accent);
    content.classList.add('luvia-accent-normalized');
    const paletteVars={
      '--luvia-accent-contrast':palette.ink,
      '--luvia-accent-deep':palette.deep,
      '--luvia-accent-deep-ink':palette.deepInk,
      '--luvia-accent-hover':palette.hover,
      '--luvia-accent-hover-ink':palette.hoverInk,
      '--luvia-accent-soft':palette.soft,
      '--luvia-accent-soft-ink':palette.softInk,
      '--luvia-accent-softer':palette.softer,
      '--luvia-accent-pale':palette.pale,
      '--luvia-accent-mid':palette.mid
    };
    Object.entries(paletteVars).forEach(([name,value])=>content.style.setProperty(name,value));
    const variables=['--accent','--rose','--module-accent','--memory-accent','--weather-accent','--route-accent','--card-accent','--language-accent','--budget-accent','--gallery-accent','--trip-accent'];
    [content,...content.querySelectorAll('[style]')].forEach(node=>{
      variables.forEach(name=>node.style.setProperty(name,accent,'important'));
    });
  }

  function prepareModuleUnderIntro(id){
    const shell=document.getElementById(SHELL_ID);
    const next=shell?.querySelector(`.luvia-app-screen[data-screen="${CSS.escape(id)}"]`);
    if(!next)return null;
    hydrateModuleScreens();
    normalizeModuleAccent(id);
    next.hidden=false;
    next.scrollTop=0;
    next.classList.remove('is-active','is-leaving','from-left','from-right','to-left','to-right','is-under-intro');
    next.classList.add('is-preparing');
    return next;
  }

  function commitModuleUnderIntro(id){
    const shell=document.getElementById(SHELL_ID);
    const previous=shell?.querySelector(`.luvia-app-screen[data-screen="${CSS.escape(active)}"]`);
    const next=shell?.querySelector(`.luvia-app-screen[data-screen="${CSS.escape(id)}"]`);
    if(!next)return;
    const previousId=active;
    if(previous&&previous!==next){
      previous.hidden=true;
      previous.classList.remove('is-active','is-leaving','to-left','to-right','from-left','from-right','is-preparing','is-under-intro');
    }
    next.hidden=false;
    next.classList.remove('is-preparing','from-left','from-right','is-leaving');
    next.classList.add('is-active','is-under-intro');
    active=id;
    const nav=shell.querySelector('.luvia-shell-nav');
    nav?.querySelectorAll('[data-shell-screen]').forEach(button=>{
      const on=button.dataset.shellScreen===id;
      button.classList.toggle('is-active',on);
      button.setAttribute('aria-current',on?'page':'false');
      if(on)button.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'});
    });
    window.LuviaAppState?.setScreen?.(id);
    history.replaceState(history.state,'',id==='dashboard'?location.pathname+location.search:`${location.pathname}${location.search}#module=${encodeURIComponent(id)}`);
    requestAnimationFrame(()=>next.classList.remove('is-under-intro'));
  }

  async function waitForModuleReady(id){
    const shell=document.getElementById(SHELL_ID);
    const screen=shell?.querySelector(`.luvia-app-screen[data-screen="${CSS.escape(id)}"]`);
    const content=screen?.querySelector('.luvia-screen-content');
    const started=performance.now();
    while((!content||!content.children.length)&&performance.now()-started<1800){
      hydrateModuleScreens();
      await new Promise(resolve=>requestAnimationFrame(resolve));
    }
    if(document.fonts?.ready)await Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,700))]);
    const images=[...(content?.querySelectorAll('img')||[])].filter(img=>!img.complete);
    await Promise.race([
      Promise.allSettled(images.map(img=>new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true})}))),
      new Promise(resolve=>setTimeout(resolve,1200))
    ]);
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  }

  async function playModuleIntro(id,readyPromise){
    const shell=document.getElementById(SHELL_ID);
    const intro=shell?.querySelector('[data-module-intro]');
    if(!intro||id==='dashboard'||matchMedia('(prefers-reduced-motion: reduce)').matches){
      await readyPromise;
      commitModuleUnderIntro(id);
      return;
    }
    const value=trip()||{};
    intro.querySelector('[data-intro-icon]').textContent=icons[id]||'✨';
    intro.querySelector('[data-intro-title]').textContent=titles[id]||id;
    intro.querySelector('[data-intro-destination]').textContent=value.destination||value.tripName||'Unsere Reise';
    intro.style.setProperty('--intro-module-surface',moduleSurfaceColor(id));
    clearTimeout(introTimer);
    intro.hidden=false;
    intro.setAttribute('aria-hidden','false');
    intro.classList.remove('is-leaving');
    intro.classList.add('is-visible','is-covering');
    try{
      const minimum=new Promise(resolve=>setTimeout(resolve,760));
      await Promise.all([minimum,readyPromise]);
      // Erst jetzt wird das vollständig geladene Modul unter die weiterhin
      // deckende Bühne gesetzt. Während des Fade-outs ist nur die Bühne sichtbar.
      commitModuleUnderIntro(id);
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      intro.classList.add('is-leaving');
      await new Promise(resolve=>setTimeout(resolve,360));
    }finally{
      intro.classList.remove('is-visible','is-leaving','is-covering');
      intro.setAttribute('aria-hidden','true');
      intro.hidden=true;
    }
  }

  function performTransition(id,direction){
    const shell=document.getElementById(SHELL_ID);
    const previous=shell?.querySelector(`.luvia-app-screen[data-screen="${CSS.escape(active)}"]`);
    const next=shell?.querySelector(`.luvia-app-screen[data-screen="${CSS.escape(id)}"]`);
    if(!next){transitioning=false;return}
    const dir=direction||Math.sign(enabledIds().indexOf(id)-enabledIds().indexOf(active))||1;
    next.hidden=false;
    next.classList.remove('is-active','is-leaving','from-left','from-right','to-left','to-right');
    next.classList.add(dir>0?'from-right':'from-left');
    next.scrollTop=0;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      previous?.classList.add('is-leaving',dir>0?'to-left':'to-right');
      previous?.classList.remove('is-active');
      next.classList.remove('from-left','from-right');
      next.classList.add('is-active');
    }));
    const previousId=active;
    active=id;
    const nav=shell.querySelector('.luvia-shell-nav');
    nav?.querySelectorAll('[data-shell-screen]').forEach(button=>{
      const on=button.dataset.shellScreen===id;
      button.classList.toggle('is-active',on);
      button.setAttribute('aria-current',on?'page':'false');
      if(on)button.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'});
    });
    setTimeout(()=>{
      if(previous&&previous.dataset.screen===previousId){
        previous.hidden=true;
        previous.classList.remove('is-leaving','to-left','to-right');
      }
    },430);
    history.replaceState(history.state,'',id==='dashboard'?location.pathname+location.search:`${location.pathname}${location.search}#module=${encodeURIComponent(id)}`);
  }

  function findModuleForToken(token){
    if(!token)return null;
    for(const definition of catalog()){
      for(const selector of definition.selectors||[]){
        if(selector===`#${token}`)return definition.id;
        try{const node=document.getElementById(token);if(node&&node.matches(selector))return definition.id}catch{}
      }
    }
    return null;
  }

  function enabledIds(){return ['dashboard',...selected(trip()).filter(id=>catalog().some(item=>item.id===id))]}

  function dashboardSelection(value){
    const defaults=['hero','today','live','weather','budget','memories','calendar','checklist','review','book'];
    return Array.isArray(value?.dashboardWidgets)?value.dashboardWidgets:defaults;
  }

  function applyDashboardPreferences(value){
    const dashboard=document.querySelector(`#${SHELL_ID} [data-screen-content="dashboard"]`);
    if(!dashboard)return;
    const enabled=new Set(dashboardSelection(value));
    Object.entries(DASHBOARD_WIDGETS).forEach(([id,selector])=>{
      dashboard.querySelectorAll(selector).forEach(node=>{
        node.hidden=!enabled.has(id);
        node.classList.toggle('luvia-dashboard-widget-off',!enabled.has(id));
      });
    });
    dashboard.classList.toggle('is-dashboard-empty',enabled.size===0);
    let empty=dashboard.querySelector('[data-dashboard-empty]');
    if(enabled.size===0){
      if(!empty){
        empty=document.createElement('section');
        empty.dataset.dashboardEmpty='1';
        empty.className='luvia-dashboard-empty';
        empty.innerHTML='<span>♡</span><h2>Euer Dashboard ist bereit</h2><p>Im Profil könnt ihr genau auswählen, welche Informationen hier erscheinen sollen.</p><button type="button" data-open-dashboard-settings>Dashboard gestalten</button>';
        dashboard.appendChild(empty);
        empty.querySelector('button').onclick=()=>window.ParisProfileCenter?.open?.('dashboard');
      }
      empty.hidden=false;
    }else if(empty)empty.hidden=true;
  }

  function hydrateModuleScreens(){
    const shell=document.getElementById(SHELL_ID);
    if(!shell)return;
    for(const record of collectModuleRoots()){
      const content=shell.querySelector(`[data-screen-content="${CSS.escape(record.id)}"]`);
      if(content&&record.node.isConnected&&!content.contains(record.node))content.appendChild(record.node);
    }
  }

  function render(){
    const shell=document.getElementById(SHELL_ID);
    const value=trip();
    if(!shell||!value||isOfficial(value))return;
    hydrateModuleScreens();
    const ids=enabledIds();
    if(!ids.includes(active))active='dashboard';
    applyDashboardPreferences(value);
    document.documentElement.style.setProperty('--shell-accent',value.accent||'#e76f91');
    ids.filter(id=>id!=='dashboard').forEach(normalizeModuleAccent);

    shell.querySelectorAll('.luvia-app-screen').forEach(screen=>{
      const enabled=ids.includes(screen.dataset.screen);
      screen.dataset.enabled=String(enabled);
      if(!enabled||screen.dataset.screen!==active){screen.hidden=true;screen.classList.remove('is-active')}
      else{screen.hidden=false;requestAnimationFrame(()=>screen.classList.add('is-active'))}
    });

    const nav=shell.querySelector('.luvia-shell-nav');
    nav.innerHTML=ids.map(id=>`<button type="button" data-shell-screen="${id}" class="${id===active?'is-active':''}" aria-current="${id===active?'page':'false'}"><span>${icons[id]||'✨'}</span><b>${id==='dashboard'?'Dashboard':escapeHtml(titles[id]||id)}</b></button>`).join('');
    nav.hidden=ids.length<=1;

    shell.style.setProperty('--enabled-module-count',String(Math.max(0,ids.length-1)));
  }

  function show(id,direction=0){
    if(!enabledIds().includes(id))id='dashboard';
    if(id===active||transitioning)return;
    transitioning=true;
    // Die deckende Bühne wird zuerst synchron sichtbar. Erst darunter wird das
    // Zielmodul vorbereitet; so blitzt weder das alte noch das neue Modul auf.
    const shell=document.getElementById(SHELL_ID);
    const intro=shell?.querySelector('[data-module-intro]');
    if(intro&&id!=='dashboard'&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
      const value=trip()||{};
      intro.querySelector('[data-intro-icon]').textContent=icons[id]||'✨';
      intro.querySelector('[data-intro-title]').textContent=titles[id]||id;
      intro.querySelector('[data-intro-destination]').textContent=value.destination||value.tripName||'Unsere Reise';
      intro.style.setProperty('--intro-module-surface','rgba(255,255,255,.995)');
      intro.hidden=false;
      intro.setAttribute('aria-hidden','false');
      intro.classList.remove('is-leaving');
      intro.classList.add('is-visible','is-covering');
    }
    requestAnimationFrame(()=>{
      prepareModuleUnderIntro(id);
      const readiness=waitForModuleReady(id);
      playModuleIntro(id,readiness).catch(error=>{
        console.warn('Modul-Opener konnte nicht sauber beendet werden',error);
        commitModuleUnderIntro(id);
      }).finally(()=>{transitioning=false});
    });
  }

  function step(direction){
    if(transitioning)return;
    const ids=enabledIds();
    const current=Math.max(0,ids.indexOf(active));
    const next=Math.min(ids.length-1,Math.max(0,current+direction));
    if(next!==current)show(ids[next],direction);
  }

  function schedule(){
    if(scheduled)return;
    scheduled=true;
    setTimeout(()=>{
      scheduled=false;
      try{
        const appState=window.LuviaAppState?.getSnapshot?.();
        const value=appState?.trip?.trip||trip();
        if(!value?.tripId||isOfficial(value)||!appIsUnlocked())return;
        if(!built)build();
        else render();
      }catch(error){
        reportShellError(error,'schedule');
      }
    },80);
  }

  function start(){
    // Fail-safe: Eine Intro-Bühne darf nach Reload oder einem abgebrochenen
    // Wechsel niemals die App verdecken. Sie wird ausschließlich von show()
    // für einen aktiven Modulwechsel geöffnet.
    document.querySelectorAll('[data-module-intro]').forEach(intro=>{
      intro.classList.remove('is-visible','is-leaving','is-covering');
      intro.setAttribute('aria-hidden','true');
      intro.hidden=true;
    });
    document.documentElement.classList.remove('luvia-module-transitioning');
    const hashMatch=location.hash.match(/module=([^&]+)/);
    if(hashMatch)active=decodeURIComponent(hashMatch[1]);
    const observer=new MutationObserver(schedule);
    observer.observe(document.body,{attributes:true,attributeFilter:['class'],childList:true,subtree:false});
    schedule();
  }

  window.LuviaAppShell={show,render,rebuild:()=>location.reload(),get active(){return active}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('luvia:trip-changed',schedule);
  window.addEventListener('luvia:trip-modules-changed',schedule);
  window.addEventListener('luvia:dashboard-changed',schedule);
  window.addEventListener('luvia:app-state-changed',schedule);
  document.addEventListener('luvia:trip-context-changed',schedule);
  document.addEventListener('paris:auth-changed',schedule);

  window.addEventListener('resize',()=>requestAnimationFrame(syncMobileShellHeight),{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(syncMobileShellHeight,120),{passive:true});
  window.visualViewport?.addEventListener('resize',()=>requestAnimationFrame(syncMobileShellHeight),{passive:true});
})();
