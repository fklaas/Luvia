
(() => {
  'use strict';

  const ID_KEY = 'parisIdentityV1';
  const REG_KEY = 'parisTripRegistryV1';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const parse = (value, fallback = null) => { try { return JSON.parse(value) ?? fallback; } catch { return fallback; } };
  const identity = () => parse(localStorage.getItem(ID_KEY), {});
  const registry = () => parse(localStorage.getItem(REG_KEY), []);
  const activeTrip = () => window.LuviaTripContext?.getActiveTrip?.() || (() => {
    const current = identity();
    return registry().find(item => item?.tripId === current?.tripId) || current || {};
  })();
  const setText = (selector, value) => { const element = $(selector); if (element) element.textContent = value; };
  const euro = value => Number(value || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  const dateValue = value => {
    if (!value) return null;
    const date = new Date(String(value).length === 10 ? `${value}T00:00:00` : value);
    return Number.isNaN(date.getTime()) ? null : date;
  };
  const formatDate = date => date?.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) || 'Noch offen';
  const numberFrom = value => Number(String(value || '').replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.')) || 0;

  function tripDates(trip) {
    const start = dateValue(trip.startDate || trip.start_date || '2026-07-31');
    const end = dateValue(trip.endDate || trip.end_date || '2026-08-02');
    if (end) end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  function phase(trip) {
    const now = new Date();
    const { start, end } = tripDates(trip);
    if (!start || !end) return 'planning';
    if (now < start) return 'before';
    if (now <= end) return 'during';
    return 'after';
  }

  function emotionalCopy(currentPhase, diffDays) {
    if (currentPhase === 'before') {
      if (diffDays <= 1) return ['✈️', 'Morgen beginnt euer Abenteuer.', 'Nur noch einmal schlafen – dann wird aus Vorfreude eine Erinnerung.'];
      if (diffDays <= 5) return ['❤️', `Noch ${diffDays} Sonnenaufgänge.`, 'Eure nächste gemeinsame Geschichte ist schon ganz nah.'];
      return ['🧳', 'Die Vorfreude reist schon mit.', 'Plant in Ruhe – Luvia bewahrt alles, was euch wichtig ist.'];
    }
    if (currentPhase === 'during') return ['✨', 'Ihr seid mittendrin.', 'Genießt die kleinen Augenblicke. Genau daraus werden die großen Erinnerungen.'];
    if (currentPhase === 'after') return ['📖', 'Eure Reise bleibt.', 'Schaut zurück, sammelt Lieblingsmomente und bewahrt eure Geschichte.'];
    return ['💗', 'Eine neue Geschichte wartet.', 'Gebt eurer Reise einen Ort, einen Zeitraum und ganz viel Vorfreude.'];
  }

  function agendaFor(trip, currentPhase) {
    const destination = trip.destination || 'euer Reiseziel';
    if (currentPhase === 'before') return [
      ['Heute', 'Reise gemeinsam vorbereiten', 'Tickets, Reservierungen und Lieblingsorte prüfen.'],
      ['Danach', 'Packliste vervollständigen', 'Nur noch das eintragen, was euch unterwegs Ruhe gibt.'],
      ['Später', 'Vorfreude teilen', `Gemeinsam schon einmal auf ${destination} einstimmen.`]
    ];
    if (currentPhase === 'after') return [
      ['Heute', 'Lieblingsmomente auswählen', 'Fotos markieren und die schönsten Erinnerungen festhalten.'],
      ['Danach', 'Reiseabschluss ansehen', 'Statistiken, Orte und gemeinsame Highlights sammeln.'],
      ['Später', 'Nächste Reise träumen', 'Eine neue Geschichte kann jederzeit beginnen.']
    ];
    const now = new Date();
    const dayKey = now.toISOString().slice(0, 10);
    const staticPlans = {
      '2026-07-31': [['Vormittag', 'Ankommen & Paris entdecken', 'In Ruhe einchecken und die Stadt genießen.'], ['19:00', 'Perruche Rooftop', 'Gemeinsames Abendessen mit Blick über Paris.'], ['Abends', 'Ersten Tag festhalten', 'Lieblingsmoment und Tagesabschluss sichern.']],
      '2026-08-01': [['Morgens', 'Gemeinsam frühstücken', 'Ausgiebig starten und alles für Disneyland einpacken.'], ['Tagsüber', 'Disneyland Paris', 'Attraktionen, Pausen und Familienmomente.'], ['Abends', 'Feuerwerk & Hochzeitstag', 'Den Tag ohne Eile gemeinsam ausklingen lassen.']],
      '2026-08-02': [['Vormittag', 'Letzte Lieblingsorte', 'Noch einmal entspannt durch Paris.'], ['17:30', 'Dinner im Elio', 'Gemeinsamer Abschluss eurer Reise.'], ['Danach', 'Heimreise', 'Fotos sichern und Erinnerungen mitnehmen.']]
    };
    return staticPlans[dayKey] || [
      ['Jetzt', 'Euren Tag gemeinsam beginnen', `Schaut, was in ${destination} als Nächstes wartet.`],
      ['Später', 'Einen Moment festhalten', 'Foto, Ort oder kleinen Gedanken hinzufügen.'],
      ['Abends', 'Gemeinsam zurückblicken', 'Was war heute euer schönster Augenblick?']
    ];
  }

  function renderAgenda(trip, currentPhase) {
    const host = $('[data-ld-agenda]');
    if (!host) return;
    const items = agendaFor(trip, currentPhase);
    host.innerHTML = items.map(([time, title, copy]) => `
      <div class="ld-agenda-item">
        <div class="ld-agenda-time">${time}</div>
        <div class="ld-agenda-copy"><strong>${title}</strong><small>${copy}</small></div>
        <div class="ld-agenda-state">♡</div>
      </div>`).join('');
    setText('[data-ld-today-title]', currentPhase === 'after' ? 'Euer Rückblick' : currentPhase === 'before' ? 'Heute vorbereiten' : 'Heute auf eurer Reise');
    setText('[data-ld-today-tag]', currentPhase === 'after' ? 'Erinnern' : currentPhase === 'before' ? 'Vorfreude' : 'Live');
  }

  function weather() {
    const trip = activeTrip();
    const { start } = tripDates(trip);
    const now = new Date();
    const targetKey = (now < start ? start : now).toISOString().slice(0, 10);
    const card = $(`.weather-card[data-weather-date="${targetKey}"]`) || $('.weather-card');
    if (!card) return;
    const headline = $('[data-weather="headline"]', card)?.textContent?.trim() || 'Wetter für die Reise';
    const description = $('[data-weather="description"]', card)?.textContent?.trim() || 'Die Prognose erscheint kurz vor dem Reisetag.';
    const max = $('[data-weather="max"]', card)?.textContent?.trim();
    const text = `${headline}${max ? ` · ${max}` : ''}`;
    const lower = `${headline} ${description}`.toLowerCase();
    const icon = /regen|schauer|rain/.test(lower) ? '🌧️' : /sonne|sonnig|sun/.test(lower) ? '☀️' : /gewitter|storm/.test(lower) ? '⛈️' : '🌤️';
    setText('[data-ld-weather-icon]', icon);
    setText('[data-ld-weather-title]', text);
    setText('[data-ld-weather-copy]', description);
  }

  function stats() {
    const trip = activeTrip();
    const stats = trip.stats || {};
    const photoText = $('#galleryTotal')?.textContent || stats.photos || 0;
    const momentCandidates = [
      stats.moments,
      $('[data-moment-count]')?.textContent,
      $$('.moment-card,.live-moment-card,[data-moment-id]').length
    ];
    const closureCandidates = [
      stats.closures,
      $$('.day-closure.is-complete,.day-closure[data-complete="true"]').length
    ];
    setText('[data-ld-photos]', numberFrom(photoText));
    setText('[data-ld-moments]', numberFrom(momentCandidates.find(value => Number(value) > 0) || 0));
    setText('[data-ld-closures]', numberFrom(closureCandidates.find(value => Number(value) > 0) || 0));
  }

  function budget() {
    const total = numberFrom($('#budgetTotal')?.textContent);
    const limit = Number($('#budgetLimit')?.value || 0);
    const remaining = Math.max(0, limit - total);
    setText('[data-ld-budget-total]', euro(total));
    setText('[data-ld-budget-note]', limit ? `${euro(remaining)} von ${euro(limit)} bleiben für eure Reise.` : 'Legt ein Budget fest, um euren Spielraum zu sehen.');
    const bar = $('[data-ld-budget-progress]');
    if (bar) bar.style.width = `${limit ? Math.min(100, total / limit * 100) : 0}%`;
  }

  function participants(trip) {
    const count = Math.max(1, Number(trip.memberCount || 1));
    const memberName = trip.memberName || identity().memberName || 'Ihr';
    const initials = memberName.split(/\s+/).filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'L';
    const host = $('[data-ld-avatars]');
    if (host) {
      host.innerHTML = `<div class="ld-avatar" title="${memberName}">${initials}</div>${count > 1 ? `<div class="ld-avatar more">+${count - 1}</div>` : ''}`;
    }
    setText('[data-ld-participants]', `${count} ${count === 1 ? 'Person' : 'Personen'} online`);
    const gallery = numberFrom($('#galleryTotal')?.textContent);
    const activity = gallery ? `${gallery} Fotos gemeinsam gespeichert` : count > 1 ? 'Reisegruppe ist verbunden' : 'Reise geöffnet';
    setText('[data-ld-activity]', activity);
  }

  function countdown(trip) {
    const { start, end } = tripDates(trip);
    const now = new Date();
    const currentPhase = phase(trip);
    renderTripBar(trip);renderCalendar(trip);assistantPreview();checklistStats();
    let target = start;
    if (currentPhase === 'during') target = end;
    const diff = Math.max(0, target - now);
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor(diff / 3600000) % 24;
    const minutes = Math.floor(diff / 60000) % 60;
    const seconds = Math.floor(diff / 1000) % 60;
    setText('[data-ld-countdown-days]', currentPhase === 'after' ? '♡' : days);
    setText('[data-ld-hours]', String(hours).padStart(2, '0'));
    setText('[data-ld-minutes]', String(minutes).padStart(2, '0'));
    setText('[data-ld-seconds]', String(seconds).padStart(2, '0'));
    setText('[data-ld-countdown-label]', currentPhase === 'during' ? 'Zeit für eure Reise' : currentPhase === 'after' ? 'Eure Geschichte' : 'Bis zu eurem Abenteuer');
    setText('[data-ld-countdown-text]', currentPhase === 'during' ? 'Tage, die gerade Erinnerungen werden' : currentPhase === 'after' ? 'Für immer in Luvia bewahrt' : days === 1 ? 'Tag voller Vorfreude' : 'Tage voller Vorfreude');
    const emotion = emotionalCopy(currentPhase, Math.max(1, Math.ceil((start - now) / 86400000)));
    setText('[data-ld-emotion-icon]', emotion[0]);
    setText('[data-ld-emotion-title]', emotion[1]);
    setText('[data-ld-emotion-copy]', emotion[2]);
  }


  function dateRange(start,end){if(!start||!end)return[];const out=[],d=new Date(start),last=new Date(end);d.setHours(0,0,0,0);last.setHours(0,0,0,0);while(d<=last&&out.length<370){out.push(new Date(d));d.setDate(d.getDate()+1)}return out}
  function sampleDates(dates,max=7){if(dates.length<=max)return dates;const indexes=new Set([0,dates.length-1]);for(let i=1;i<max-1;i++)indexes.add(Math.round(i*(dates.length-1)/(max-1)));return[...indexes].sort((a,b)=>a-b).slice(0,max).map(i=>dates[i])}
  function ensureDayTargets(){
    $$('.day-ribbon[id^="day-"]').forEach(marker=>{
      const group=marker.closest('.day-group');
      if(!group)return;
      if(!group.id)group.id=marker.id;
      marker.removeAttribute('id');
    });
  }
  function findDayTarget(key){
    ensureDayTargets();
    return document.getElementById(`day-${key}`)
      || document.querySelector(`.day-group:has([data-weather-date="${key}"])`)
      || document.querySelector(`[data-day-closure="${key}"]`)?.closest('.day-group');
  }
  function scrollToTripDay(key){
    const target=findDayTarget(key);
    if(!target)return;
    const bar=$('#liveTripBar');
    bar?.classList.add('is-fading','is-collapsed');
    const top=target.getBoundingClientRect().top+window.scrollY-18;
    window.scrollTo({top:Math.max(0,top),behavior:'smooth'});
  }
  function renderTripBar(trip){const bar=$('#liveTripBar'),progress=$('#liveTripProgress');if(!bar||!progress)return;ensureDayTargets();const{start,end}=tripDates(trip),all=dateRange(start,end),sample=sampleDates(all,7),today=new Date().toISOString().slice(0,10);setText('[data-trip-symbol]',trip.symbol||'❤️');setText('[data-trip-name]',trip.tripName||'Unsere Reise');progress.style.setProperty('--trip-step-count',Math.max(1,sample.length));progress.innerHTML=sample.map((date,index)=>{const key=date.toISOString().slice(0,10),dayIndex=all.findIndex(x=>x.toISOString().slice(0,10)===key),label=index===0?'Start':index===sample.length-1?'Abreise':`Tag ${dayIndex+1}`;return`<button class="live-trip-step${key===today?' active':key<today?' done':''}" type="button" data-trip-day="${key}" aria-label="${date.toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})}"><span class="live-trip-dot">${String(date.getDate()).padStart(2,'0')}</span><small>${label}</small></button>`}).join('');progress.querySelectorAll('[data-trip-day]').forEach(btn=>btn.onclick=()=>scrollToTripDay(btn.dataset.tripDay));const p=phase(trip),now=new Date();if(p==='before'){const days=Math.max(0,Math.ceil((start-now)/86400000));setText('#liveTripTitle','Reisevorfreude');setText('#liveTripCountdown',`Noch ${days} ${days===1?'Tag':'Tage'} bis ${trip.destination||'zu eurem Abenteuer'}`)}else if(p==='during'){const day=Math.max(1,Math.floor((now-start)/86400000)+1);setText('#liveTripTitle',`Reisetag ${day}`);setText('#liveTripCountdown',`${trip.destination||trip.tripName||'Eure Reise'} · gemeinsam unterwegs`)}else{setText('#liveTripTitle','Eure Reise bleibt');setText('#liveTripCountdown','Alle Erinnerungen warten in Luvia ✨')}}
  function bindTripBarFade(){
    const bar=$('#liveTripBar');
    if(!bar||bar.dataset.fadeBound)return;
    bar.dataset.fadeBound='1';
    let lastY=Math.max(0,window.scrollY),downDistance=0,upDistance=0,collapseTimer=null;
    const mobile=()=>matchMedia('(max-width:760px)').matches;
    const show=()=>{
      clearTimeout(collapseTimer);
      bar.classList.remove('is-fading','is-collapsed');
      downDistance=0;
    };
    const fade=()=>{
      if(bar.classList.contains('is-fading')||window.scrollY<(mobile()?22:80))return;
      bar.classList.add('is-fading');
      collapseTimer=setTimeout(()=>bar.classList.add('is-collapsed'),mobile()?120:220);
    };
    const onScroll=()=>{
      const y=Math.max(0,window.scrollY),delta=y-lastY;
      lastY=y;
      if(y<(mobile()?12:55)){show();upDistance=0;return;}
      if(delta>0){
        downDistance+=delta;
        upDistance=0;
        if(downDistance>(mobile()?26:105))fade();
      }else if(delta<0){
        upDistance+=Math.abs(delta);
        downDistance=0;
        if(upDistance>(mobile()?65:90))show();
      }
    };
    addEventListener('scroll',onScroll,{passive:true});
    addEventListener('pageshow',()=>{lastY=Math.max(0,window.scrollY);if(lastY<(mobile()?12:55))show()},{passive:true});
  }
  function assistantPreview(){[['#assistantNextIcon','#assistantNextTitle','#assistantNextText'],['#assistantWeatherIcon','#assistantWeatherTitle','#assistantWeatherText'],['#assistantMobilityIcon','#assistantMobilityTitle','#assistantMobilityText']].forEach((s,i)=>{setText(`[data-ld-assistant-icon-${i+1}]`,$(s[0])?.textContent?.trim()||['🕒','🌤️','🧭'][i]);setText(`[data-ld-assistant-title-${i+1}]`,$(s[1])?.textContent?.trim()||'Hinweis');setText(`[data-ld-assistant-copy-${i+1}]`,$(s[2])?.textContent?.trim()||'Wird vorbereitet …')})}
  function renderCalendar(trip){const host=$('[data-ld-calendar]');if(!host)return;const{start,end}=tripDates(trip),focus=start||new Date(),year=focus.getFullYear(),month=focus.getMonth(),first=new Date(year,month,1),offset=(first.getDay()+6)%7,gridStart=new Date(year,month,1-offset),tripKeys=new Set(dateRange(start,end).map(d=>d.toISOString().slice(0,10))),today=new Date().toISOString().slice(0,10);setText('[data-ld-calendar-month]',focus.toLocaleDateString('de-DE',{month:'long',year:'numeric'}));let days=['Mo','Di','Mi','Do','Fr','Sa','So'].map(x=>`<div class="ld-cal-weekday">${x}</div>`).join('');for(let i=0;i<42;i++){const d=new Date(gridStart);d.setDate(gridStart.getDate()+i);const key=d.toISOString().slice(0,10),inside=d.getMonth()===month,isTrip=tripKeys.has(key);days+=`<button type="button" class="ld-cal-day${inside?'':' is-outside'}${isTrip?' is-trip':''}${key===today?' is-today':''}" data-calendar-day="${key}" ${isTrip?'':'disabled'}>${d.getDate()}</button>`}host.innerHTML=days;host.querySelectorAll('.is-trip').forEach(btn=>btn.onclick=()=>scrollToTripDay(btn.dataset.calendarDay))}
  function checklistStats(){const inputs=$$('#erinnerungen input[type="checkbox"]'),done=inputs.filter(x=>x.checked).length,total=inputs.length,pct=total?Math.round(done/total*100):0;setText('[data-ld-memory-done]',done);setText('[data-ld-memory-title]',total?`${done} von ${total} Erinnerungen erledigt`:'Noch alles offen');setText('[data-ld-memory-copy]',total?(pct===100?'Alles geschafft – eure Reise ist bereit.':`${100-pct}% warten noch darauf, gemeinsam abgehakt zu werden.`):'Hakt Erinnerungen gemeinsam ab und seht euren Fortschritt.');$('.ld-checklist-ring')?.style.setProperty('--memory-progress',`${pct}%`)}
  function personalizeLegacy(trip){const destination=trip.destination||'euer Reiseziel',title=$('#countdown-title');if(title)title.textContent=`Noch ein bisschen Vorfreude auf ${destination}`;const copy=title?.parentElement?.querySelector('p');if(copy){const city=destination.toLowerCase();copy.textContent=city.includes('paris')?'Eiffelturm, Seine, kleine Cafés und gemeinsame Tage voller Erinnerungen.':city.includes('rom')?'Antike Gassen, italienische Abende und gemeinsame Momente zwischen Geschichte und Dolce Vita.':city.includes('toskana')?'Sanfte Hügel, kleine Orte, gutes Essen und ganz viel gemeinsame Zeit.':city.includes('nordsee')?'Meeresluft, weite Horizonte und ruhige Augenblicke, die nur euch gehören.':`Neue Lieblingsorte, besondere Augenblicke und gemeinsame Tage in ${destination}.`}if($('#liveMomentEyebrow'))$('#liveMomentEyebrow').textContent=`🧳 Vorfreude auf ${destination}`;if($('#liveMomentTitle')&&/Paris/.test($('#liveMomentTitle').textContent))$('#liveMomentTitle').textContent=`Noch seid ihr zuhause – aber ${destination} rückt näher.`;if($('#reiseAppsTitle'))$('#reiseAppsTitle').textContent=`Eure Must-have Apps für ${destination}`;if($('#sprachcoachTitle'))$('#sprachcoachTitle').textContent=`Sicher sprechen rund um ${destination}`}

  function render() {
    const dashboard = $('#luvia-dashboard');
    if (!dashboard) return;
    const trip = activeTrip();
    const accent = trip.accent || '#ee6f83';
    document.documentElement.style.setProperty('--trip-accent', accent);
    document.body.style.setProperty('--trip-accent', accent);

    setText('[data-ld-title]', `${trip.symbol || '❤️'} ${trip.tripName || 'Unsere Reise'}`);
    const subtitleNode=document.querySelector('[data-ld-subtitle]');if(subtitleNode)subtitleNode.textContent=trip.subtitle||'Gemeinsam planen, erleben und für immer erinnern.';
    setText('[data-ld-destination]', `📍 ${trip.destination || 'Reiseziel noch offen'}`);
    const { start, end } = tripDates(trip);
    setText('[data-ld-dates]', `📅 ${formatDate(start)} – ${formatDate(end)}`);
    const owner = trip.isOwner || ['owner', 'admin'].includes(trip.role) || Number(trip.memberCount) === 1;
    setText('[data-ld-role]', owner ? '♛ Reisebesitzer' : '♡ Mitreisend');

    const currentPhase = phase(trip);
    setText('[data-ld-phase]', currentPhase === 'before' ? '✦ Eure Reise rückt näher' : currentPhase === 'during' ? '✦ Ihr seid gerade unterwegs' : currentPhase === 'after' ? '✦ Eure Reisegeschichte' : '✦ Eure aktive Reise');
    renderAgenda(trip, currentPhase);
    participants(trip);
    stats();
    budget();
    weather();
    countdown(trip);
  }

  function openSection(selector) {
    const moduleMap={
      '#travelAssistant':'assistant',
      '#live-moments':'liveMoments',
      '#erinnerungen':'memories',
      '#reise-revue':'review',
      '#reisebuch':'travelBook'
    };
    const moduleId=moduleMap[selector];
    if(moduleId&&window.LuviaAppShell?.show){window.LuviaAppShell.show(moduleId);return}
    const target = $(selector);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function bind() {
    $('[data-ld-profile]')?.addEventListener('click', () => window.ParisProfileCenter?.open?.('profile'));
    $('[data-ld-trips]')?.addEventListener('click', () => window.ParisProfileCenter?.open?.('trips'));
    $('[data-ld-people]')?.addEventListener('click', () => window.ParisProfileCenter?.open?.('people'));
    $('[data-ld-map]')?.addEventListener('click', () => window.ParisProfileCenter?.open?.('map'));
    $('[data-ld-invite]')?.addEventListener('click', () => {
      const trip = activeTrip();
      if (window.LuviaEntry?.showInvite) window.LuviaEntry.showInvite(trip);
      else window.ParisProfileCenter?.open?.('people');
    });
    $('[data-ld-open-plan]')?.addEventListener('click', () => openSection('#travelAssistant'));
    $('[data-ld-memories]')?.addEventListener('click',()=>openSection('#live-moments'));
    $('[data-ld-checklist]')?.addEventListener('click',()=>openSection('#erinnerungen'));
    $('[data-ld-review]')?.addEventListener('click',()=>openSection('#reise-revue'));
    $('[data-ld-book]')?.addEventListener('click',()=>{openSection('#reisebuch');setTimeout(()=>document.getElementById('createTravelBook')?.focus(),500)});

    const observed = ['#galleryTotal', '#budgetTotal', '#budgetLimit', '.weather-card', '#liveMoments'];
    observed.forEach(selector => $$(selector).forEach(element => {
      new MutationObserver(render).observe(element, { subtree: true, childList: true, characterData: true, attributes: true });
      element.addEventListener?.('input', render);
    }));

    document.addEventListener('paris:auth-changed', event => {
      if (event.detail?.authenticated) {
        setTimeout(() => {
          render();
          $('#luvia-dashboard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
      }
    });
    window.addEventListener('storage',render);
    document.addEventListener('luvia:trip-context-changed', event => {
      const trip = event.detail?.trip || activeTrip();
      personalizeLegacy(trip);
      render();
    });
    bindTripBarFade();document.querySelectorAll('#erinnerungen input[type="checkbox"]').forEach(x=>x.addEventListener('change',checklistStats));
  }

  function init() {
    const trip = activeTrip();
    personalizeLegacy(trip);
    render();
    bind();
    window.setInterval(() => countdown(activeTrip()), 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
