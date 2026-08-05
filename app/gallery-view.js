(() => {
  'use strict';

  const VERSION = '4.28.4';
  const BUILD = '13.28.4';
  const REALTIME_DEBOUNCE_MS = 650;
  const FILTERS = {
    none: ['Original', ''], warm: ['Golden Hour', 'sepia(.18) saturate(1.15) contrast(1.04)'], cool: ['Blue Sky', 'hue-rotate(10deg) saturate(1.08)'], vivid: ['Pop', 'saturate(1.45) contrast(1.1)'], soft: ['Soft', 'contrast(.92) saturate(.88) brightness(1.04)'], mono: ['Mono', 'grayscale(1) contrast(1.08)'],
    paris: ['Paris', 'sepia(.12) saturate(1.16) contrast(1.06) hue-rotate(-6deg)'], sunset: ['Sunset', 'sepia(.24) saturate(1.35) hue-rotate(-12deg)'], rose: ['Rosé', 'sepia(.12) saturate(1.2) hue-rotate(325deg)'], cinema: ['Cinema', 'contrast(1.2) saturate(.78) sepia(.1)'], noir: ['Noir', 'grayscale(1) contrast(1.35) brightness(.92)'], retro: ['Retro', 'sepia(.38) saturate(.82) contrast(.92)'], film: ['Film', 'contrast(1.12) saturate(.9) brightness(.98)'], dreamy: ['Dreamy', 'brightness(1.08) contrast(.88) saturate(.86)'], tropical: ['Tropical', 'saturate(1.45) hue-rotate(-8deg) contrast(1.04)'], aqua: ['Aqua', 'saturate(1.2) hue-rotate(18deg)'], candy: ['Candy', 'saturate(1.4) hue-rotate(335deg) brightness(1.04)'], matte: ['Matte', 'contrast(.86) saturate(.78) brightness(1.06)'],
    crisp: ['Crisp', 'contrast(1.22) saturate(1.12)'], faded: ['Faded', 'contrast(.82) saturate(.68) brightness(1.1)'], night: ['Night', 'brightness(.86) contrast(1.22) saturate(1.18) hue-rotate(8deg)'], bwsoft: ['B&W Soft', 'grayscale(1) contrast(.9) brightness(1.08)'], bwdramatic: ['B&W Drama', 'grayscale(1) contrast(1.5)'], travel: ['Travel', 'saturate(1.22) contrast(1.08) sepia(.06)']
  };
  const STICKERS = ['', '✨', '❤️', '📍', '✈️', '🌸', '🥂', '🎉', '☀️', '🌙', '🏰', '🗼', '👨‍👩‍👧'];
  const FRAMES = ['', 'polaroid', 'rounded', 'film', 'postcard', 'story'];

  let host = null;
  let items = [];
  let clusters = [];
  let polaroids = {};
  let activeDay = null;
  let unsubMedia = null;
  let unsubClusters = null;
  let busy = false;
  let pending = null;
  let loadTimer = null;
  let suppressRealtimeUntil = 0;
  let lastFingerprint = '';
  const urlCache = new Map();

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const cssEsc = value => window.CSS?.escape ? CSS.escape(String(value)) : String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  const dateKey = value => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'unknown' : `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  };
  const fmtDate = value => value ? new Intl.DateTimeFormat('de-DE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}).format(new Date(value)) : 'Ohne Datum';
  const fmtTime = value => value ? new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit'}).format(new Date(value)) : '–';
  const suggestName = item => {
    const date = new Date(item.capturedAt);
    if (Number.isNaN(date.getTime())) return 'Reisefoto';
    const hour = date.getHours();
    const part = hour < 6 ? 'Nachtmoment' : hour < 11 ? 'Morgenmoment' : hour < 14 ? 'Mittagsmoment' : hour < 18 ? 'Nachmittagsmoment' : hour < 22 ? 'Abendmoment' : 'Nachtmoment';
    return `${part} · ${new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit'}).format(date)}`;
  };
  const displayName = item => item.displayName || suggestName(item);
  const settings = item => ({brightness:100,contrast:100,saturation:100,temperature:0,blur:0,vignette:0,filter:'none',rotation:0,frame:'',sticker:'',caption:'',...item.editSettings});
  const editCss = item => {
    const edit = settings(item);
    const preset = FILTERS[edit.filter]?.[1] || '';
    const temperature = Number(edit.temperature || 0);
    const temperatureFilter = temperature > 0 ? `sepia(${Math.min(.35,temperature/180)}) hue-rotate(${-temperature/6}deg)` : temperature < 0 ? `hue-rotate(${Math.abs(temperature)/4}deg)` : '';
    return `brightness(${Number(edit.brightness)}%) contrast(${Number(edit.contrast)}%) saturate(${Number(edit.saturation)}%) blur(${Number(edit.blur)}px) ${temperatureFilter} ${preset}`.trim();
  };
  const photoVisual = (item, attrs='') => {
    const edit = settings(item);
    return `<span class="lv-photo-visual frame-${esc(edit.frame||'none')}" ${attrs} style="filter:${esc(editCss(item))};transform:rotate(${Number(edit.rotation||0)}deg)"><i>Bild wird geladen …</i>${edit.vignette?`<b class="lv-photo-vignette" style="opacity:${Math.min(.8,Number(edit.vignette)/100)}"></b>`:''}${edit.sticker?`<em class="lv-photo-sticker">${esc(edit.sticker)}</em>`:''}${edit.caption?`<strong class="lv-photo-caption">${esc(edit.caption)}</strong>`:''}</span>`;
  };

  function shell() {
    return `<section class="lv-gallery-view">
      <header class="lv-gallery-hero">
        <div><span>📸 Realtime Galerie</span><h1>Eure gemeinsamen Reisefotos</h1><p>Momente, Reisetage, Favoriten und kreative Bearbeitung – ohne sichtbares Neuladen.</p></div>
        <div class="lv-gallery-upload-actions"><button type="button" data-gallery-camera>Foto aufnehmen</button><button type="button" class="lv-gallery-upload" data-gallery-add>Fotos hinzufügen</button></div>
        <input class="lv-gallery-file-input" type="file" accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif,.avif" multiple data-gallery-input>
        <input class="lv-gallery-file-input" type="file" accept="image/*" capture="environment" data-gallery-camera-input>
      </header>
      <div class="lv-gallery-status" data-gallery-status>Galerie wird geladen …</div>
      <section class="lv-gallery-section" data-gallery-cluster-section><div class="lv-gallery-section-head"><div><span>✨ Automatisch erkannt</span><h2>Gemeinsame Fotomomente</h2></div><button type="button" data-gallery-refresh>Neu analysieren</button></div><div data-gallery-clusters></div></section>
      <section class="lv-gallery-section"><div class="lv-gallery-section-head"><div><span>⭐ Auswahl</span><h2>Favoriten</h2></div><strong data-favorite-count>0</strong></div><div class="lv-favorites" data-gallery-favorites></div></section>
      <section class="lv-gallery-section"><div class="lv-gallery-section-head"><div><span>🗓️ Reisetage</span><h2>Fototage</h2></div><strong data-gallery-count>0 Fotos</strong></div><div data-gallery-days></div></section>
    </section>`;
  }

  async function urlFor(item) {
    if (urlCache.has(item.id)) return urlCache.get(item.id);
    try {
      const url = await window.LuviaMediaCore.signedUrl(item, 1800);
      if (url) urlCache.set(item.id, url);
      return url || '';
    } catch {
      return '';
    }
  }
  function status(text, type='') {
    const node = host?.querySelector('[data-gallery-status]');
    if (!node) return;
    node.textContent = text;
    node.dataset.state = type;
  }
  function showError(error) {
    console.error('[LuviaGalleryView]', error);
    status(error?.message || 'Galerie konnte nicht aktualisiert werden.', 'error');
  }
  function fingerprint() {
    return JSON.stringify({
      items: items.map(item => [item.id,item.updatedAt,item.favorite,item.displayName,item.dayKey,item.previewPath,item.editSettings]),
      clusters: clusters.map(cluster => [cluster.id,cluster.updated_at,cluster.state,cluster.mediaIds]),
      polaroids
    });
  }
  function scheduleLoad(reason='Realtime', options={}) {
    if (Date.now() < suppressRealtimeUntil && options.realtime) return;
    clearTimeout(loadTimer);
    pending = {reason, ...options};
    loadTimer = setTimeout(() => load(pending || {}), options.immediate ? 0 : REALTIME_DEBOUNCE_MS);
  }

  async function tripDays() {
    const context = await window.LuviaMediaCore.getContext();
    const trip = context.trip || {};
    const start = trip.start_date || trip.startDate || trip.startsAt || trip.start_at;
    const end = trip.end_date || trip.endDate || trip.endsAt || trip.end_at;
    if (!start || !end) return [];
    const from = new Date(start), to = new Date(end), result = [];
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return [];
    from.setHours(12,0,0,0); to.setHours(12,0,0,0);
    for (let day = new Date(from); day <= to; day.setDate(day.getDate()+1)) result.push(dateKey(day));
    return result;
  }
  async function dayGroups() {
    const days = await tripDays();
    const daySet = new Set(days);
    const groups = days.map(key => ({key,label:fmtDate(`${key}T12:00:00`),items:items.filter(item => item.dayKey === key)}));
    const other = items.filter(item => !daySet.has(item.dayKey));
    if (other.length) groups.push({key:'other',label:'Sonstige Reisebilder',items:other});
    return groups;
  }

  function card(item, compact=false) {
    return `<article class="lv-gallery-photo ${compact?'is-compact':''}" data-photo="${esc(item.id)}">
      <button type="button" class="lv-photo-open" data-photo-open="${esc(item.id)}">${photoVisual(item,`data-photo-image="${esc(item.id)}"`)}</button>
      <div class="lv-photo-meta"><strong>${esc(displayName(item))}</strong><small>${esc(fmtTime(item.capturedAt))}</small></div>
      <div class="lv-photo-actions"><button type="button" data-photo-favorite="${esc(item.id)}" class="${item.favorite?'is-on':''}" title="Favorit">${item.favorite?'★':'☆'}</button><button type="button" data-photo-edit="${esc(item.id)}" title="Bearbeiten">✎</button><button type="button" data-photo-remove="${esc(item.id)}" title="Löschen">×</button></div>
    </article>`;
  }
  async function hydrateImages(root, list) {
    await Promise.all(list.map(async item => {
      const url = await urlFor(item);
      root.querySelectorAll(`[data-photo-image="${cssEsc(item.id)}"]`).forEach(node => {
        if (url) { node.style.backgroundImage = `url("${url}")`; node.querySelector('i')?.remove(); }
        else node.innerHTML = '<i>Vorschau nicht verfügbar</i>';
      });
    }));
  }
  function bindPhotoActions(root) {
    root.querySelectorAll('[data-photo-open]').forEach(button => button.onclick = () => openLightbox(button.dataset.photoOpen));
    root.querySelectorAll('[data-photo-favorite]').forEach(button => button.onclick = async event => {
      event.stopPropagation(); suppressRealtimeUntil = Date.now()+1500;
      await window.LuviaMediaCore.toggleFavorite(button.dataset.photoFavorite);
      await load({reason:'Favorit',silent:true,analyze:false,force:true});
    });
    root.querySelectorAll('[data-photo-edit]').forEach(button => button.onclick = event => { event.stopPropagation(); openEditor(button.dataset.photoEdit); });
    root.querySelectorAll('[data-photo-remove]').forEach(button => button.onclick = async event => {
      event.stopPropagation();
      if (!confirm('Foto wirklich entfernen?')) return;
      suppressRealtimeUntil = Date.now()+1800;
      await window.LuviaMediaCore.remove(button.dataset.photoRemove);
      await load({reason:'Löschen',silent:true,analyze:true,force:true});
    });
  }

  async function renderFavorites() {
    const root = host.querySelector('[data-gallery-favorites]');
    const favorites = items.filter(item => item.favorite);
    host.querySelector('[data-favorite-count]').textContent = String(favorites.length);
    if (!favorites.length) { root.innerHTML = '<div class="lv-inline-empty">Noch keine Favoriten – tippe bei einem Foto auf ☆.</div>'; return; }
    root.innerHTML = favorites.map(item => card(item,true)).join('');
    await hydrateImages(root,favorites); bindPhotoActions(root);
  }

  async function renderDays() {
    const root = host.querySelector('[data-gallery-days]');
    const groups = await dayGroups();
    if (!groups.length) { root.innerHTML = '<div class="lv-gallery-empty"><b>📷</b><h3>Noch keine Reisefotos</h3></div>'; return; }
    if (activeDay) {
      const group = groups.find(entry => entry.key === activeDay);
      if (!group) activeDay = null;
      else {
        const hero = group.key !== 'other' && polaroids[group.key] ? group.items.find(item => item.id === polaroids[group.key]) : null;
        root.innerHTML = `<div class="lv-day-page is-entering"><button type="button" class="lv-day-back" data-day-back>← Alle Reisetage</button><header><div><span>${group.key==='other'?'📷':'🗓️'}</span><h3>${esc(group.label)}</h3><p>${group.items.length} Foto${group.items.length===1?'':'s'}</p></div></header>${hero?`<button type="button" class="lv-polaroid-card" data-photo-open="${esc(hero.id)}">${photoVisual(hero,`data-photo-image="${esc(hero.id)}"`)}<b>Polaroid des Tages</b><small>${esc(displayName(hero))}</small></button>`:''}<div class="lv-gallery-grid">${group.items.map(item=>card(item)).join('')}</div></div>`;
        root.querySelector('[data-day-back]').onclick = () => { root.querySelector('.lv-day-page')?.classList.add('is-leaving'); setTimeout(()=>{activeDay=null;renderDays();},180); };
        await hydrateImages(root,group.items); bindPhotoActions(root); return;
      }
    }
    root.innerHTML = `<div class="lv-day-tiles">${groups.map(group => {
      const cover = (group.key!=='other' && polaroids[group.key] ? group.items.find(item=>item.id===polaroids[group.key]) : null) || group.items[0] || null;
      return `<button type="button" class="lv-day-tile" data-day-open="${esc(group.key)}"><span class="lv-day-tile-cover" ${cover?`data-photo-image="${esc(cover.id)}"`:''}><i>${cover?'Bild wird geladen …':'Noch keine Fotos'}</i></span><div><small>${group.key==='other'?'Weitere Aufnahmen':'Reisetag'}</small><strong>${esc(group.label)}</strong><em>${group.items.length} Foto${group.items.length===1?'':'s'}</em></div><b>→</b></button>`;
    }).join('')}</div>`;
    await hydrateImages(root, groups.flatMap(group=>group.items.slice(0,1)));
    root.querySelectorAll('[data-day-open]').forEach(button => button.onclick = () => { activeDay=button.dataset.dayOpen; renderDays(); });
  }

  function clusterReason(cluster) {
    const related = items.filter(item => cluster.mediaIds?.includes(item.id));
    const gpsCount = related.filter(item => item.latitude != null && item.longitude != null).length;
    if (gpsCount === related.length && related.length) return `${related.length} Fotos in kurzer Folge mit Standortdaten.`;
    if (gpsCount > 0) return `${related.length} Fotos in kurzer Folge; Standortdaten teilweise vorhanden.`;
    return `${related.length} Fotos innerhalb weniger Minuten; keine Standortdaten vorhanden.`;
  }
  async function renderClusters() {
    const root = host.querySelector('[data-gallery-clusters]');
    const visible = clusters.filter(cluster => cluster.state !== 'dismissed' && cluster.mediaIds?.length);
    if (!visible.length) { root.innerHTML = '<div class="lv-gallery-empty compact"><b>✨</b><h3>Noch keine Fotomomente</h3><p>Mehrere Fotos innerhalb von 20 Minuten werden automatisch gruppiert.</p></div>'; return; }
    root.innerHTML = `<div class="lv-cluster-grid">${visible.map(cluster => `<article class="lv-cluster-card"><button class="lv-cluster-collage" data-cluster-open="${esc(cluster.id)}">${cluster.mediaIds.slice(0,4).map(id=>`<span data-cluster-image="${esc(id)}"></span>`).join('')}<b>${cluster.mediaIds.length} Fotos</b></button><div class="lv-cluster-copy"><small>${esc(fmtDate(cluster.start_at))} · ${esc(fmtTime(cluster.start_at))}</small><h3>${esc(cluster.title||'Gemeinsamer Fotomoment')}</h3><p>${esc(clusterReason(cluster))}</p><div><button type="button" data-memory-bridge="${esc(cluster.id)}">Erinnerung prüfen</button><button type="button" data-cluster-dismiss="${esc(cluster.id)}">Auflösen</button></div></div></article>`).join('')}</div>`;
    await Promise.all(visible.flatMap(cluster => cluster.mediaIds.slice(0,4).map(async id => {
      const item = items.find(entry=>entry.id===id), node = root.querySelector(`[data-cluster-image="${cssEsc(id)}"]`);
      if (!item || !node) return; const url = await urlFor(item); if (url) node.style.backgroundImage = `url("${url}")`;
    })));
    root.querySelectorAll('[data-cluster-open]').forEach(button => button.onclick = () => openCluster(button.dataset.clusterOpen));
    root.querySelectorAll('[data-memory-bridge]').forEach(button => button.onclick = () => openMemoryBridge(button.dataset.memoryBridge));
    root.querySelectorAll('[data-cluster-dismiss]').forEach(button => button.onclick = async () => {
      if (!confirm('Automatische Gruppierung auflösen?')) return;
      suppressRealtimeUntil=Date.now()+1600; await window.LuviaMediaClustering.dissolve(button.dataset.clusterDismiss); await load({silent:true,analyze:false,force:true});
    });
  }

  async function openCluster(id) {
    const cluster = clusters.find(entry=>String(entry.id)===String(id)); if (!cluster) return;
    const selected = items.filter(item=>cluster.mediaIds.includes(item.id));
    const overlay=document.createElement('div'); overlay.className='lv-photo-overlay';
    overlay.innerHTML=`<section class="lv-cluster-dialog"><button data-close>×</button><span>✨ Fotomoment</span><h2>${esc(cluster.title||'Gemeinsamer Fotomoment')}</h2><p>${esc(clusterReason(cluster))}</p><div class="lv-cluster-detail-grid">${selected.map(item=>`<button type="button" data-cluster-photo="${esc(item.id)}">${photoVisual(item,`data-photo-image="${esc(item.id)}"`)}</button>`).join('')}</div></section>`;
    document.body.appendChild(overlay); await hydrateImages(overlay,selected);
    overlay.querySelector('[data-close]').onclick=()=>overlay.remove(); overlay.onclick=e=>{if(e.target===overlay)overlay.remove()};
    overlay.querySelectorAll('[data-cluster-photo]').forEach(button=>button.onclick=()=>{overlay.remove();openLightbox(button.dataset.clusterPhoto)});
  }

  async function openLightbox(id) {
    const item=items.find(entry=>entry.id===id); if(!item)return; const url=await urlFor(item),edit=settings(item),overlay=document.createElement('div'); overlay.className='lv-photo-overlay';
    overlay.innerHTML=`<section class="lv-photo-dialog frame-${esc(edit.frame||'none')}"><button data-close>×</button><div class="lv-photo-large"><img src="${esc(url)}" alt="${esc(displayName(item))}" style="filter:${esc(editCss(item))};transform:rotate(${Number(edit.rotation||0)}deg)">${edit.vignette?`<b class="lv-photo-vignette" style="opacity:${Math.min(.8,Number(edit.vignette)/100)}"></b>`:''}${edit.sticker?`<em class="lv-photo-sticker">${esc(edit.sticker)}</em>`:''}${edit.caption?`<strong class="lv-photo-caption">${esc(edit.caption)}</strong>`:''}</div><footer><div><strong>${esc(displayName(item))}</strong><small>${esc(fmtDate(item.capturedAt))} · ${esc(fmtTime(item.capturedAt))}${item.latitude!=null?' · Standort gespeichert':''}</small></div><button data-light-fav>${item.favorite?'★ Favorit':'☆ Favorit'}</button><button data-light-edit>✎ Bearbeiten</button></footer></section>`;
    document.body.appendChild(overlay); const close=()=>overlay.remove(); overlay.querySelector('[data-close]').onclick=close; overlay.onclick=e=>{if(e.target===overlay)close()};
    overlay.querySelector('[data-light-fav]').onclick=async()=>{suppressRealtimeUntil=Date.now()+1200;await window.LuviaMediaCore.toggleFavorite(id);close();await load({silent:true,force:true})};
    overlay.querySelector('[data-light-edit]').onclick=()=>{close();openEditor(id)};
  }

  function editorControls(edit) {
    const filterButtons=Object.entries(FILTERS).map(([key,[label]])=>`<button type="button" class="lv-filter-chip ${edit.filter===key?'is-active':''}" data-filter="${key}">${esc(label)}</button>`).join('');
    return `<div class="lv-editor-sliders"><label>Helligkeit <input type="range" min="50" max="150" value="${Number(edit.brightness)}" data-ed="brightness"><output>${Number(edit.brightness)}%</output></label><label>Kontrast <input type="range" min="50" max="160" value="${Number(edit.contrast)}" data-ed="contrast"><output>${Number(edit.contrast)}%</output></label><label>Sättigung <input type="range" min="0" max="200" value="${Number(edit.saturation)}" data-ed="saturation"><output>${Number(edit.saturation)}%</output></label><label>Wärme <input type="range" min="-50" max="50" value="${Number(edit.temperature)}" data-ed="temperature"><output>${Number(edit.temperature)}</output></label><label>Weichzeichnen <input type="range" min="0" max="8" step=".5" value="${Number(edit.blur)}" data-ed="blur"><output>${Number(edit.blur)}</output></label><label>Vignette <input type="range" min="0" max="100" value="${Number(edit.vignette)}" data-ed="vignette"><output>${Number(edit.vignette)}%</output></label></div><div class="lv-filter-browser"><h3>Filter</h3><div>${filterButtons}</div></div><div class="lv-editor-fun"><label>Rahmen <select data-ed="frame">${FRAMES.map(frame=>`<option value="${frame}">${frame?frame[0].toUpperCase()+frame.slice(1):'Kein Rahmen'}</option>`).join('')}</select></label><label>Sticker <select data-ed="sticker">${STICKERS.map(sticker=>`<option value="${esc(sticker)}">${sticker||'Kein Sticker'}</option>`).join('')}</select></label><label>Text im Bild <input type="text" maxlength="60" value="${esc(edit.caption||'')}" data-ed="caption" placeholder="Euer Moment …"></label></div>`;
  }

  async function openEditor(id) {
    const item=items.find(entry=>entry.id===id); if(!item)return;
    const validPolaroid=(await tripDays()).includes(item.dayKey),url=await urlFor(item),edit=settings(item),state={...edit},overlay=document.createElement('div'); overlay.className='lv-photo-overlay';
    overlay.innerHTML=`<section class="lv-editor-dialog lv-editor-pro"><button data-close>×</button><span>🎨 Luvia Photo Studio</span><h2>Foto kreativ bearbeiten</h2><div class="lv-editor-layout"><div class="lv-editor-preview frame-${esc(edit.frame||'none')}"><img src="${esc(url)}"><b class="lv-photo-vignette"></b><em class="lv-photo-sticker"></em><strong class="lv-photo-caption"></strong></div><div class="lv-editor-panel"><div class="lv-editor-name"><input value="${esc(item.displayName||'')}" placeholder="Titel des Fotos" data-edit-name><button type="button" data-name-suggestion>✨ ${esc(suggestName(item))}</button></div>${editorControls(edit)}<button type="button" data-rotate>↻ 90° drehen</button></div></div><div class="lv-editor-actions"><button data-reset>Zurücksetzen</button><button data-polaroid ${validPolaroid?'':'disabled'}>Polaroid des Tages</button><button class="primary" data-save>Speichern</button></div></section>`;
    document.body.appendChild(overlay);
    const preview=overlay.querySelector('.lv-editor-preview'),img=preview.querySelector('img'),vignette=preview.querySelector('.lv-photo-vignette'),sticker=preview.querySelector('.lv-photo-sticker'),caption=preview.querySelector('.lv-photo-caption');
    overlay.querySelector('[data-ed="frame"]').value=state.frame||''; overlay.querySelector('[data-ed="sticker"]').value=state.sticker||'';
    const apply=()=>{img.style.filter=editCss({editSettings:state});img.style.transform=`rotate(${Number(state.rotation||0)}deg)`;preview.className=`lv-editor-preview frame-${state.frame||'none'}`;vignette.style.opacity=Math.min(.8,Number(state.vignette||0)/100);sticker.textContent=state.sticker||'';caption.textContent=state.caption||''}; apply();
    overlay.querySelectorAll('input[type=range]').forEach(input=>input.oninput=()=>{state[input.dataset.ed]=Number(input.value);input.nextElementSibling.textContent=input.dataset.ed==='temperature'||input.dataset.ed==='blur'?input.value:`${input.value}%`;apply()});
    overlay.querySelectorAll('[data-filter]').forEach(button=>button.onclick=()=>{state.filter=button.dataset.filter;overlay.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('is-active',x===button));apply()});
    ['frame','sticker','caption'].forEach(key=>{const control=overlay.querySelector(`[data-ed="${key}"]`);control.oninput=control.onchange=()=>{state[key]=control.value;apply()}});
    overlay.querySelector('[data-rotate]').onclick=()=>{state.rotation=(Number(state.rotation||0)+90)%360;apply()};
    overlay.querySelector('[data-name-suggestion]').onclick=()=>overlay.querySelector('[data-edit-name]').value=suggestName(item);
    overlay.querySelector('[data-reset]').onclick=()=>{Object.assign(state,{brightness:100,contrast:100,saturation:100,temperature:0,blur:0,vignette:0,filter:'none',rotation:0,frame:'',sticker:'',caption:''});apply();overlay.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('is-active',x.dataset.filter==='none'))};
    overlay.querySelector('[data-polaroid]').onclick=async()=>{suppressRealtimeUntil=Date.now()+1200;await window.LuviaMediaCore.setPolaroid(id,item.dayKey);overlay.remove();await load({silent:true,force:true});status('Polaroid des Tages gespeichert.','ready')};
    overlay.querySelector('[data-save]').onclick=async()=>{suppressRealtimeUntil=Date.now()+1200;await window.LuviaMediaCore.update(id,{displayName:overlay.querySelector('[data-edit-name]').value,editSettings:state});overlay.remove();await load({silent:true,force:true});status('Fotoänderungen gespeichert.','ready')};
    const close=()=>overlay.remove(); overlay.querySelector('[data-close]').onclick=close; overlay.onclick=e=>{if(e.target===overlay)close()};
  }

  async function openMemoryBridge(clusterId) {
    try {
      const proposal=await window.LuviaAIMemoryBridge.analyze(clusterId),overlay=document.createElement('div'); overlay.className='lv-photo-overlay';
      overlay.innerHTML=`<section class="lv-editor-dialog"><button data-close>×</button><span>✨ AI Memory Bridge</span><h2>${esc(proposal.title)}</h2><p>${esc(proposal.explanation)}</p><div class="lv-inline-empty"><b>Warum wurde dieser Moment erkannt?</b><ul>${(proposal.evidenceSummary?.facts||proposal.context?.summary?.facts||[]).map(f=>`<li>${esc(f)}</li>`).join('')}</ul></div>${proposal.actions.map((action,index)=>`<label class="lv-memory-option"><input type="checkbox" data-memory-action="${index}" checked><span><b>${esc(action.label)}</b><small>${Math.round((action.confidence||0)*100)} % Sicherheit</small></span></label>`).join('')}<div class="lv-editor-actions"><button data-cancel>Abbrechen</button><button class="primary" data-confirm>Bestätigen & verknüpfen</button></div></section>`;
      document.body.appendChild(overlay); const close=()=>overlay.remove(); overlay.querySelector('[data-close]').onclick=close; overlay.querySelector('[data-cancel]').onclick=close;
      overlay.querySelector('[data-confirm]').onclick=async()=>{const selected=proposal.actions.filter((_,i)=>overlay.querySelector(`[data-memory-action="${i}"]`)?.checked);await window.LuviaAIMemoryBridge.apply(proposal,{confirmed:true,selectedActions:selected});close();status('Erinnerung wurde bestätigt und verknüpft.','ready')};
    } catch(error) { showError(error); }
  }

  async function readData({analyze=false}={}) {
    items=await window.LuviaMediaCore.list({type:'image'});
    polaroids=await window.LuviaMediaCore.listPolaroids();
    if (analyze) {
      const generated=window.LuviaMediaClustering.generate(items);
      clusters=await window.LuviaMediaClustering.syncGenerated(generated);
    } else clusters=await window.LuviaMediaClustering.listPersisted();
  }
  async function renderAll({force=false}={}) {
    const next=fingerprint(); if(!force && next===lastFingerprint)return; lastFingerprint=next;
    host.querySelector('[data-gallery-count]').textContent=`${items.length} Foto${items.length===1?'':'s'}`;
    await renderClusters(); await renderFavorites(); await renderDays();
  }
  async function load(options={}) {
    if(!host)return;
    if(busy){pending={...pending,...options};return}
    busy=true;
    const silent=options.silent!==false;
    if(!silent)status('Galerie wird aktualisiert …');
    try { await readData({analyze:Boolean(options.analyze)}); await renderAll({force:Boolean(options.force)}); if(!silent)status(`${items.length} Fotos · ${clusters.filter(c=>c.state!=='dismissed'&&c.mediaIds?.length).length} Fotomomente · Realtime aktiv`,'ready'); else if(host.querySelector('[data-gallery-status]')?.dataset.state!=='ready') status(`${items.length} Fotos · Realtime aktiv`,'ready'); }
    catch(error){showError(error)}
    finally {busy=false; if(pending){const next=pending;pending=null;scheduleLoad(next.reason||'Nachlauf',next)}}
  }

  async function currentLocation() {
    if(!navigator.geolocation)return null;
    return new Promise(resolve=>navigator.geolocation.getCurrentPosition(position=>resolve({latitude:position.coords.latitude,longitude:position.coords.longitude,accuracy:position.coords.accuracy,capturedAt:new Date().toISOString()}),()=>resolve(null),{enableHighAccuracy:true,timeout:8000,maximumAge:30000}));
  }
  async function upload(files,{camera=false}={}) {
    const list=[...files]; if(!list.length)return;
    suppressRealtimeUntil=Date.now()+10000;
    let location=null;
    if(camera){status('Aufnahmestandort wird ermittelt …');location=await currentLocation()}
    status(`${list.length} Foto${list.length===1?'':'s'} werden hochgeladen …`);
    for(let i=0;i<list.length;i++){
      status(`Upload ${i+1}/${list.length}: ${list[i].name||'Foto'}`);
      await window.LuviaMediaCore.upload(list[i],{source:camera?'app_camera':'user_upload',capturedAt:camera?new Date().toISOString():undefined,captureLocation:location,deviceMetadata:camera?{userAgent:navigator.userAgent,platform:navigator.platform,language:navigator.language}:null});
    }
    await load({silent:false,analyze:true,force:true});
  }

  function mediaRealtime(payload) {
    const relevant=payload?.table==='media' || payload?.schema==='public';
    if(!relevant)return;
    const event=payload?.eventType || payload?.event;
    const analyze=event==='INSERT'||event==='DELETE'||(event==='UPDATE'&&['captured_at','day_key','status'].some(key=>payload?.old?.[key]!==payload?.new?.[key]));
    scheduleLoad('Media Realtime',{realtime:true,silent:true,analyze,force:true});
  }
  function clusterRealtime() { scheduleLoad('Cluster Realtime',{realtime:true,silent:true,analyze:false,force:true}); }

  async function mount(target) {
    host=target; host.innerHTML=shell();
    const input=host.querySelector('[data-gallery-input]'),cameraInput=host.querySelector('[data-gallery-camera-input]');
    host.querySelector('[data-gallery-add]').onclick=()=>{try{input.showPicker?input.showPicker():input.click()}catch{input.click()}};
    host.querySelector('[data-gallery-camera]').onclick=()=>{try{cameraInput.showPicker?cameraInput.showPicker():cameraInput.click()}catch{cameraInput.click()}};
    input.onchange=async()=>{const files=[...input.files];input.value='';try{await upload(files)}catch(error){showError(error)}};
    cameraInput.onchange=async()=>{const files=[...cameraInput.files];cameraInput.value='';try{await upload(files,{camera:true})}catch(error){showError(error)}};
    host.querySelector('[data-gallery-refresh]').onclick=()=>load({silent:false,analyze:true,force:true});
    unsubMedia=await window.LuviaMediaCore.subscribe(mediaRealtime);
    unsubClusters=await window.LuviaMediaClustering.subscribe(clusterRealtime);
    await load({silent:false,analyze:true,force:true});
    return ()=>unmount();
  }
  async function unmount(){clearTimeout(loadTimer);await unsubMedia?.();await unsubClusters?.();unsubMedia=unsubClusters=null;urlCache.clear();if(host)host.innerHTML='';host=null;activeDay=null;lastFingerprint=''}

  window.LuviaGalleryView=Object.freeze({version:VERSION,build:BUILD,mount,unmount,refresh:options=>load({silent:false,force:true,...options}),openPhoto:openLightbox});
})();
