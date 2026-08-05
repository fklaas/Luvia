(() => {
  'use strict';

  const VERSION = '4.28.6.4';
  const BUILD = '13.28.6.4';
  const REALTIME_DEBOUNCE_MS = 650;
  const FILTERS = {
    none: ['Original', ''], warm: ['Golden Hour', 'sepia(.18) saturate(1.15) contrast(1.04)'], cool: ['Blue Sky', 'hue-rotate(10deg) saturate(1.08)'], vivid: ['Pop', 'saturate(1.45) contrast(1.1)'], soft: ['Soft', 'contrast(.92) saturate(.88) brightness(1.04)'], mono: ['Mono', 'grayscale(1) contrast(1.08)'],
    paris: ['Paris', 'sepia(.12) saturate(1.16) contrast(1.06) hue-rotate(-6deg)'], sunset: ['Sunset', 'sepia(.24) saturate(1.35) hue-rotate(-12deg)'], rose: ['Rosé', 'sepia(.12) saturate(1.2) hue-rotate(325deg)'], cinema: ['Cinema', 'contrast(1.2) saturate(.78) sepia(.1)'], noir: ['Noir', 'grayscale(1) contrast(1.35) brightness(.92)'], retro: ['Retro', 'sepia(.38) saturate(.82) contrast(.92)'], film: ['Film', 'contrast(1.12) saturate(.9) brightness(.98)'], dreamy: ['Dreamy', 'brightness(1.08) contrast(.88) saturate(.86)'], tropical: ['Tropical', 'saturate(1.45) hue-rotate(-8deg) contrast(1.04)'], aqua: ['Aqua', 'saturate(1.2) hue-rotate(18deg)'], candy: ['Candy', 'saturate(1.4) hue-rotate(335deg) brightness(1.04)'], matte: ['Matte', 'contrast(.86) saturate(.78) brightness(1.06)'],
    crisp: ['Crisp', 'contrast(1.22) saturate(1.12)'], faded: ['Faded', 'contrast(.82) saturate(.68) brightness(1.1)'], night: ['Night', 'brightness(.86) contrast(1.22) saturate(1.18) hue-rotate(8deg)'], bwsoft: ['B&W Soft', 'grayscale(1) contrast(.9) brightness(1.08)'], bwdramatic: ['B&W Drama', 'grayscale(1) contrast(1.5)'], travel: ['Travel', 'saturate(1.22) contrast(1.08) sepia(.06)']
  };
  const STICKERS = ['', '✨','💫','⭐','🌟','❤️','💕','💖','📍','🗺️','✈️','🚗','🚆','🌸','🌹','🥂','🍾','🎉','🎈','☀️','🌅','🌙','🏰','🗼','🎡','🎢','🛍️','🍝','☕','📸','👨‍👩‍👧','👶'];
  const FRAMES = ['', 'polaroid', 'rounded', 'film', 'postcard', 'story', 'classic', 'white', 'shadow', 'stamp', 'cinema', 'travel'];

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
  let dayLimit = 10;
  let modalScrollY = 0;
  function lockPageScroll(){if(document.body.classList.contains('lv-photo-modal-open'))return;modalScrollY=window.scrollY||0;document.body.style.top=`-${modalScrollY}px`;document.body.classList.add('lv-photo-modal-open');}
  function unlockPageScroll(){if(!document.body.classList.contains('lv-photo-modal-open'))return;document.body.classList.remove('lv-photo-modal-open');document.body.style.top='';window.scrollTo(0,modalScrollY);}
  function mountOverlay(overlay){lockPageScroll();document.body.appendChild(overlay);return()=>{overlay.remove();if(!document.querySelector('.lv-photo-overlay'))unlockPageScroll()}}
  const urlCache = new Map();
  const urlFailureCache = new Map();

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const cssEsc = value => window.CSS?.escape ? CSS.escape(String(value)) : String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  const dateKey = value => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'unknown' : `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  };
  const fmtDate = value => value ? new Intl.DateTimeFormat('de-DE',{weekday:'long',day:'2-digit',month:'long',year:'numeric'}).format(new Date(value)) : 'Ohne Datum';
  const fmtTime = value => value ? new Intl.DateTimeFormat('de-DE',{hour:'2-digit',minute:'2-digit'}).format(new Date(value)) : '–';
  const suggestName = () => '';
  const displayName = item => item.displayName || 'Titel hinzufügen';
  const locationName = item => item?.metadata?.resolvedLocation?.name || item?.metadata?.resolvedLocation?.address || item?.metadata?.captureLocation?.name || (item?.latitude!=null&&item?.longitude!=null?'GPS-Standort gespeichert':'Kein Standort gespeichert');
  const normalizeOverlay=o=>({type:o?.type==='text'?'text':'sticker',value:String(o?.value||''),x:Math.max(0,Math.min(1,Number(o?.x??.5)>1?Number(o.x)/100:Number(o?.x??.5))),y:Math.max(0,Math.min(1,Number(o?.y??.5)>1?Number(o.y)/100:Number(o?.y??.5))),size:Math.max(.025,Math.min(.5,Number(o?.size)||(((o?.type==='text') ? .07 : .13)*Number(o?.scale||1)))),rotation:Number(o?.rotation||0),schema:'image-v2'});
  const settings = item => {const value={brightness:100,contrast:100,saturation:100,temperature:0,blur:0,vignette:0,exposure:0,highlights:0,shadows:0,clarity:0,hue:0,grain:0,filter:'none',rotation:0,frame:'',sticker:'',caption:'',overlays:[],...item.editSettings};value.overlays=(value.overlays||[]).map(normalizeOverlay);return value};
  const editCss = item => {
    const edit = settings(item);
    const preset = FILTERS[edit.filter]?.[1] || '';
    const temperature = Number(edit.temperature || 0);
    const temperatureFilter = temperature > 0 ? `sepia(${Math.min(.35,temperature/180)}) hue-rotate(${-temperature/6}deg)` : temperature < 0 ? `hue-rotate(${Math.abs(temperature)/4}deg)` : '';
    const exposure=100+Number(edit.exposure||0),contrast=Number(edit.contrast)+Number(edit.clarity||0)*.25,shadowBoost=Math.max(0,Number(edit.shadows||0))*.12,highlightCut=Math.max(0,-Number(edit.highlights||0))*.08;return `brightness(${exposure*Number(edit.brightness)/100+shadowBoost-highlightCut}%) contrast(${contrast}%) saturate(${Number(edit.saturation)}%) hue-rotate(${Number(edit.hue||0)}deg) blur(${Number(edit.blur)}px) ${temperatureFilter} ${preset}`.trim();
  };
  const overlayMarkup = edit => `<span class="lv-saved-overlays" style="--image-rotation:${Number(edit.rotation||0)}deg">${(edit.overlays||[]).map(raw=>{const o=normalizeOverlay(raw);return `<span class="lv-saved-overlay ${o.type==='text'?'is-text':'is-sticker'}" style="--overlay-x:${o.x*100};--overlay-y:${o.y*100};--overlay-rotation:${o.rotation}deg;--overlay-size:${o.size}">${esc(o.value||'')}</span>`}).join('')}</span>`;
  const photoVisual = (item, attrs='') => {
    const edit = settings(item),baked=Boolean(item?.metadata?.renderedPreviewPath||item?.renderedPreviewPath);
    return `<span class="lv-photo-visual ${baked?'is-baked':`frame-${esc(edit.frame||'none')}`}" ${attrs}><span class="lv-photo-media-canvas"><img alt="${esc(displayName(item))}" ${baked?'':`style="filter:${esc(editCss(item))};transform:rotate(${Number(edit.rotation||0)}deg)"`}><i>Bild wird geladen …</i>${baked?'':`${edit.vignette?`<b class="lv-photo-vignette" style="opacity:${Math.min(.8,Number(edit.vignette)/100)}"></b>`:''}${overlayMarkup(edit)}`}</span></span>`;
  };

  function syncOverlayGeometry(scope=document){scope.querySelectorAll('.lv-photo-media-canvas,.lv-lightbox-canvas').forEach(canvas=>{const img=canvas.querySelector(':scope > img'),stage=canvas.querySelector(':scope > .lv-saved-overlays');if(!img||!stage)return;const sync=()=>{const bw=img.clientWidth,bh=img.clientHeight,nw=img.naturalWidth,nh=img.naturalHeight;if(!bw||!bh||!nw||!nh)return;const scale=Math.min(bw/nw,bh/nh),w=nw*scale,h=nh*scale;stage.style.left=`${(bw-w)/2}px`;stage.style.top=`${(bh-h)/2}px`;stage.style.width=`${w}px`;stage.style.height=`${h}px`};img.addEventListener('load',sync,{once:true});if(img.complete)requestAnimationFrame(sync);if(!img.dataset.overlayObserved){img.dataset.overlayObserved='1';new ResizeObserver(sync).observe(img)}})}

  async function renderComposite(item,state){
    const sourceUrl=await window.LuviaMediaCore.signedOriginalUrl(item,1800);if(!sourceUrl)throw new Error('Originalfoto konnte nicht geladen werden.');
    const response=await fetch(sourceUrl);if(!response.ok)throw new Error('Originalfoto konnte nicht geladen werden.');
    const bitmap=await createImageBitmap(await response.blob()),max=2400,scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height)),w=Math.max(1,Math.round(bitmap.width*scale)),h=Math.max(1,Math.round(bitmap.height*scale));
    const base=document.createElement('canvas');base.width=w;base.height=h;const ctx=base.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.filter=editCss({editSettings:state});ctx.drawImage(bitmap,0,0,w,h);ctx.filter='none';bitmap.close?.();
    if(Number(state.vignette||0)>0){const g=ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*.22,w/2,h/2,Math.max(w,h)*.72);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,`rgba(0,0,0,${Math.min(.72,Number(state.vignette)/125)})`);ctx.fillStyle=g;ctx.fillRect(0,0,w,h)}
    for(const raw of state.overlays||[]){const o=normalizeOverlay(raw),x=o.x*w,y=o.y*h,size=Math.max(12,o.size*w);ctx.save();ctx.translate(x,y);ctx.rotate(Number(o.rotation||0)*Math.PI/180);ctx.textAlign='center';ctx.textBaseline='middle';if(o.type==='text'){ctx.font=`700 ${size}px system-ui,-apple-system,sans-serif`;ctx.lineWidth=Math.max(2,size*.08);ctx.strokeStyle='rgba(0,0,0,.65)';ctx.strokeText(o.value,0,0);ctx.fillStyle='#fff';ctx.fillText(o.value,0,0)}else{ctx.font=`${size}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;ctx.fillText(o.value,0,0)}ctx.restore()}
    let final=base,rotation=((Number(state.rotation||0)%360)+360)%360;if(rotation){const swap=rotation===90||rotation===270,out=document.createElement('canvas');out.width=swap?h:w;out.height=swap?w:h;const oc=out.getContext('2d',{alpha:false});oc.fillStyle='#fff';oc.fillRect(0,0,out.width,out.height);oc.translate(out.width/2,out.height/2);oc.rotate(rotation*Math.PI/180);oc.drawImage(base,-w/2,-h/2);final=out}
    return await new Promise((resolve,reject)=>final.toBlob(blob=>blob?resolve(blob):reject(new Error('Bearbeitete Fotodatei konnte nicht erzeugt werden.')),'image/jpeg',.92));
  }
  function shell() {
    return `<section class="lv-gallery-view">
      <header class="lv-gallery-hero">
        <div><span>📸 Realtime Galerie</span><h1>Eure gemeinsamen Reisefotos</h1><p>Momente, Reisetage, Favoriten und kreative Bearbeitung – ohne sichtbares Neuladen.</p></div>
        <div class="lv-gallery-upload-actions"><button type="button" data-gallery-download>Galerie herunterladen</button><button type="button" class="lv-gallery-upload" data-gallery-add>Fotos hinzufügen</button></div>
        <input class="lv-gallery-file-input" type="file" accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif,.avif" multiple data-gallery-input>
      </header>
      <div class="lv-gallery-status" data-gallery-status>Galerie wird geladen …</div>
      <section class="lv-gallery-section"><div class="lv-gallery-section-head"><div><span>⭐ Auswahl</span><h2>Favoriten</h2></div><strong data-favorite-count>0</strong></div><div class="lv-favorites" data-gallery-favorites></div></section>
      <section class="lv-gallery-section"><div class="lv-gallery-section-head"><div><span>🗓️ Reisetage</span><h2>Fototage</h2></div><strong data-gallery-count>0 Fotos</strong></div><div data-gallery-days></div></section>
    </section>`;
  }

  async function urlFor(item) {
    const cacheKey=`${item.id}:${item.metadata?.renderedPreviewPath||item.renderedPreviewPath||item.previewPath||item.storagePath}:${item.updatedAt||''}`;
    if (urlCache.has(cacheKey)) return urlCache.get(cacheKey);
    if ((urlFailureCache.get(item.id)||0)>Date.now()) return '';
    try {
      const url = await window.LuviaMediaCore.signedUrl(item, 1800);
      if (url) {urlCache.set(cacheKey, url);urlFailureCache.delete(item.id);return url}
      urlFailureCache.set(item.id,Date.now()+300000);return '';
    } catch {urlFailureCache.set(item.id,Date.now()+300000);return ''}
  }
  const safeFileName=(value,fallback='foto')=>{const v=String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/-{2,}/g,'-').replace(/^-+|-+$/g,'');return(v||fallback).slice(0,90)};
  const extensionFor=(item,url='')=>{const mime=String(item?.metadata?.renderedPreviewPath?'image/jpeg':item?.mimeType||'').split('/')[1];if(mime)return mime.replace('jpeg','jpg');return String(item?.originalName||url).match(/\.([a-z0-9]{2,5})(?:$|[?#])/i)?.[1]?.toLowerCase()||'jpg'};
  const downloadFileName=(item,index=1,url='')=>`${String(index).padStart(2,'0')}-${safeFileName(displayName(item)||item?.originalName||`foto-${index}`)}.${extensionFor(item,url)}`;
  function triggerDownload(source,name){const href=typeof source==='string'?source:URL.createObjectURL(source),a=document.createElement('a');a.href=href;a.download=name;a.rel='noopener';document.body.appendChild(a);a.click();a.remove();if(typeof source!=='string')setTimeout(()=>URL.revokeObjectURL(href),5000)}
  const encoder=new TextEncoder(),crcTable=(()=>{const t=new Uint32Array(256);for(let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=(c&1)?0xEDB88320^(c>>>1):c>>>1;t[i]=c>>>0}return t})();
  function crc32(bytes){let c=0xFFFFFFFF;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0}
  function zipBlob(files){const local=[],central=[];let offset=0;for(const f of files){const data=f.bytes,name=encoder.encode(f.name),crc=crc32(data),lh=new Uint8Array(30+name.length),lv=new DataView(lh.buffer);lv.setUint32(0,0x04034b50,true);lv.setUint16(4,20,true);lv.setUint16(8,0,true);lv.setUint32(14,crc,true);lv.setUint32(18,data.length,true);lv.setUint32(22,data.length,true);lv.setUint16(26,name.length,true);lh.set(name,30);local.push(lh,data);const ch=new Uint8Array(46+name.length),cv=new DataView(ch.buffer);cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint32(16,crc,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);cv.setUint16(28,name.length,true);cv.setUint32(42,offset,true);ch.set(name,46);central.push(ch);offset+=lh.length+data.length}const size=central.reduce((n,x)=>n+x.length,0),end=new Uint8Array(22),ev=new DataView(end.buffer);ev.setUint32(0,0x06054b50,true);ev.setUint16(8,files.length,true);ev.setUint16(10,files.length,true);ev.setUint32(12,size,true);ev.setUint32(16,offset,true);return new Blob([...local,...central,end],{type:'application/zip'})}
  async function ensureMedia(id){return items.find(x=>String(x.id)===String(id))||await window.LuviaMediaCore.get(id)}
  async function downloadPhotoAsset(idOrItem){const item=typeof idOrItem==='string'?await ensureMedia(idOrItem):idOrItem,url=await urlFor(item);if(!url)throw new Error('Foto konnte nicht geladen werden.');const r=await fetch(url);if(!r.ok)throw new Error('Foto konnte nicht heruntergeladen werden.');triggerDownload(await r.blob(),downloadFileName(item,1,url));return true}
  async function downloadCollection(ids,label='Luvia-Galerie'){const files=[];for(let i=0;i<ids.length;i++){const item=await ensureMedia(typeof ids[i]==='string'?ids[i]:ids[i].id),url=item?await urlFor(item):'';if(!url)continue;const r=await fetch(url);if(!r.ok)continue;files.push({name:downloadFileName(item,files.length+1,url),bytes:new Uint8Array(await r.arrayBuffer())})}if(!files.length)throw new Error('Keine Bilder konnten geladen werden.');triggerDownload(zipBlob(files),`${safeFileName(label,'Luvia-Galerie')}.zip`);return true}
  async function shareCollection(ids,label='Luvia-Album'){const files=[];for(let i=0;i<ids.length;i++){const item=await ensureMedia(ids[i]),url=item?await urlFor(item):'';if(!url)continue;const r=await fetch(url);if(!r.ok)continue;const blob=await r.blob();files.push(new File([blob],downloadFileName(item,files.length+1,url),{type:blob.type||'image/jpeg'}))}if(files.length&&navigator.canShare?.({files})&&navigator.share){await navigator.share({title:label,text:`${label} · ${files.length} Fotos`,files});return true}await downloadCollection(ids,label);return false}
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
      items: items.map(item => [item.id,item.favorite,item.displayName,item.dayKey,item.previewPath,item.editSettings,item.status]),
      clusters: clusters.map(cluster => [cluster.id,cluster.title,cluster.state,cluster.mediaIds]),
      polaroids
    });
  }
  function scheduleLoad(reason='Realtime', options={}) {
    if (Date.now() < suppressRealtimeUntil && options.realtime) return;
    clearTimeout(loadTimer);
    pending = {reason, ...options};
    loadTimer = setTimeout(() => {const queued=pending||{};pending=null;load(queued)}, options.immediate ? 0 : REALTIME_DEBOUNCE_MS);
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
        if (url) { const image=node.querySelector('img'); if(image) image.src=url; else node.style.backgroundImage = `url("${url}")`; node.querySelector('i')?.remove(); }
        else node.innerHTML = '<i>Vorschau nicht verfügbar</i>';
      });
    }));
    syncOverlayGeometry(root);
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
    const root = host?.querySelector('[data-gallery-days]');
    if (!root) return;
    const groups = await dayGroups();
    if (!groups.length) { root.innerHTML = '<div class="lv-gallery-empty"><b>📷</b><h3>Noch keine Reisefotos</h3></div>'; return; }
    if (activeDay) {
      const group = groups.find(entry => entry.key === activeDay);
      if (!group) activeDay = null;
      else {
        const hero = group.key !== 'other' && polaroids[group.key] ? group.items.find(item => item.id === polaroids[group.key]) : null;
        root.innerHTML = `<div class="lv-day-page is-entering"><div class="lv-day-page-toolbar"><button type="button" class="lv-day-back" data-day-back>← Alle Fototage</button><span>${group.items.length} Foto${group.items.length===1?'':'s'}</span></div><header class="lv-day-page-hero"><div><small>${group.key==='other'?'WEITERE AUFNAHMEN':'EUER REISETAG'}</small><h3>${esc(group.label)}</h3><p>${group.items.length ? 'Alle Bilder dieses Tages – gemeinsam, bearbeitbar und in Echtzeit.' : 'Für diesen Tag wurden noch keine Fotos gespeichert.'}</p></div></header>${hero?`<button type="button" class="lv-polaroid-card" data-photo-open="${esc(hero.id)}">${photoVisual(hero,`data-photo-image="${esc(hero.id)}"`)}<b>Polaroid des Tages</b><small>${esc(displayName(hero))}</small></button>`:''}<div class="lv-gallery-grid">${group.items.map(item=>card(item)).join('')}</div></div>`;
        root.querySelector('[data-day-back]').onclick = () => { root.querySelector('.lv-day-page')?.classList.add('is-leaving'); setTimeout(()=>{activeDay=null;renderDays();},180); };
        await hydrateImages(root,group.items); bindPhotoActions(root); return;
      }
    }
    const visible = groups.slice(0, dayLimit);
    const hidden = Math.max(0, groups.length-visible.length);
    root.innerHTML = `<div class="lv-day-tiles">${visible.map(group => {
      const cover = (group.key!=='other' && polaroids[group.key] ? group.items.find(item=>item.id===polaroids[group.key]) : null) || group.items[0] || null;
      return `<button type="button" class="lv-day-tile ${group.items.length?'has-photos':'is-empty'}" data-day-open="${esc(group.key)}"><span class="lv-day-tile-cover" ${cover?`data-photo-image="${esc(cover.id)}"`:''}><i>${cover?'Bild wird geladen …':'Noch frei'}</i></span><div><small>${group.key==='other'?'WEITERE AUFNAHMEN':'REISETAG'}</small><strong>${esc(group.label)}</strong><em>${group.items.length} Foto${group.items.length===1?'':'s'}</em></div><b>→</b></button>`;
    }).join('')}</div>${groups.length>10?`<div class="lv-day-more"><button type="button" data-days-toggle>${dayLimit<groups.length?`Mehr Tage anzeigen (${hidden})`:'Weniger Tage anzeigen'}</button></div>`:''}`;
    await hydrateImages(root, visible.flatMap(group=>group.items.slice(0,1)));
    root.querySelectorAll('[data-day-open]').forEach(button => button.onclick = () => { activeDay=button.dataset.dayOpen; renderDays(); });
    root.querySelector('[data-days-toggle]')?.addEventListener('click',()=>{dayLimit=dayLimit<groups.length?groups.length:10;renderDays()});
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
      suppressRealtimeUntil=Date.now()+1600; await window.LuviaMediaClustering.dissolve(button.dataset.clusterDismiss); await window.LuviaTimelineCore?.removePhotoMemoryByCluster?.(button.dataset.clusterDismiss); await load({silent:true,analyze:false,force:true});
    });
  }

  async function openCluster(id) {
    const cluster = clusters.find(entry=>String(entry.id)===String(id)); if (!cluster) return;
    const selected = items.filter(item=>cluster.mediaIds.includes(item.id));
    const overlay=document.createElement('div'); overlay.className='lv-photo-overlay';
    overlay.innerHTML=`<section class="lv-cluster-dialog"><button data-close>×</button><span>✨ Fotomoment</span><h2>${esc(cluster.title||'Gemeinsamer Fotomoment')}</h2><p>${esc(clusterReason(cluster))}</p><div class="lv-cluster-detail-grid">${selected.map(item=>`<button type="button" data-cluster-photo="${esc(item.id)}">${photoVisual(item,`data-photo-image="${esc(item.id)}"`)}</button>`).join('')}</div></section>`;
    const removeOverlay=mountOverlay(overlay); await hydrateImages(overlay,selected);
    overlay.querySelector('[data-close]').onclick=()=>removeOverlay(); overlay.onclick=e=>{if(e.target===overlay)removeOverlay()};
    overlay.querySelectorAll('[data-cluster-photo]').forEach(button=>button.onclick=()=>{removeOverlay();openLightbox(button.dataset.clusterPhoto)});
  }

  async function openLightbox(id) {
    let item=items.find(entry=>entry.id===id);if(!item){item=await window.LuviaMediaCore.get(id).catch(()=>null);if(item)items=[...items,item]}if(!item)return;
    const url=await urlFor(item),overlay=document.createElement('div');overlay.className='lv-photo-overlay';
    overlay.innerHTML=`<section class="lv-photo-dialog"><button data-close>×</button><div class="lv-photo-large">${url?`<img class="lv-photo-direct-image" src="${esc(url)}" alt="${esc(displayName(item))}">`:'<p>Bild konnte nicht geladen werden.</p>'}</div><footer><div><strong>${esc(displayName(item))}</strong><small>${esc(fmtDate(item.capturedAt))} · ${esc(fmtTime(item.capturedAt))}</small><small class="lv-photo-location">📍 ${esc(locationName(item))}</small></div><button data-light-download>⬇ Herunterladen</button><button data-light-fav>${item.favorite?'★ Favorit':'☆ Favorit'}</button><button data-light-edit>✎ Bearbeiten</button></footer></section>`;
    const removeOverlay=mountOverlay(overlay),close=()=>removeOverlay();overlay.querySelector('[data-close]').onclick=close;overlay.onclick=e=>{if(e.target===overlay)close()};
    overlay.querySelector('[data-light-download]').onclick=async()=>{try{await downloadPhotoAsset(item)}catch(error){showError(error)}};
    overlay.querySelector('[data-light-fav]').onclick=async()=>{suppressRealtimeUntil=Date.now()+1200;await window.LuviaMediaCore.toggleFavorite(id);close();await load({silent:true,force:true})};
    overlay.querySelector('[data-light-edit]').onclick=()=>{close();openEditor(id)};
  }

  function editorControls(edit) {
    const filterButtons=Object.entries(FILTERS).map(([key,[label]])=>`<button type="button" class="lv-filter-chip ${edit.filter===key?'is-active':''}" data-filter="${key}">${esc(label)}</button>`).join('');
    const stickerButtons=STICKERS.filter(Boolean).map(sticker=>`<button type="button" class="lv-sticker-chip" data-quick-sticker="${esc(sticker)}">${esc(sticker)}</button>`).join('');
    return `<nav class="lv-studio-tools" aria-label="Foto-Werkzeuge">
      <button type="button" data-studio-tab="look" class="is-active"><b>◐</b><span>Looks</span></button>
      <button type="button" data-studio-tab="adjust"><b>☷</b><span>Anpassen</span></button>
      <button type="button" data-studio-tab="decorate"><b>✦</b><span>Kreativ</span></button>
      <button type="button" data-studio-tab="title"><b>T</b><span>Titel</span></button>
    </nav>
    <div class="lv-studio-drawer is-open" data-studio-drawer>
      
      <div class="lv-studio-pane is-active" data-studio-pane="look"><div class="lv-filter-browser"><div>${filterButtons}</div></div></div>
      <div class="lv-studio-pane" data-studio-pane="adjust"><div class="lv-editor-sliders"><label>Helligkeit <input type="range" min="50" max="150" value="${Number(edit.brightness)}" data-ed="brightness"><output>${Number(edit.brightness)}%</output></label><label>Kontrast <input type="range" min="50" max="160" value="${Number(edit.contrast)}" data-ed="contrast"><output>${Number(edit.contrast)}%</output></label><label>Sättigung <input type="range" min="0" max="200" value="${Number(edit.saturation)}" data-ed="saturation"><output>${Number(edit.saturation)}%</output></label><label>Wärme <input type="range" min="-50" max="50" value="${Number(edit.temperature)}" data-ed="temperature"><output>${Number(edit.temperature)}</output></label><label>Belichtung <input type="range" min="-40" max="40" value="${Number(edit.exposure||0)}" data-ed="exposure"><output>${Number(edit.exposure||0)}</output></label><label>Lichter <input type="range" min="-50" max="50" value="${Number(edit.highlights||0)}" data-ed="highlights"><output>${Number(edit.highlights||0)}</output></label><label>Schatten <input type="range" min="-50" max="50" value="${Number(edit.shadows||0)}" data-ed="shadows"><output>${Number(edit.shadows||0)}</output></label><label>Klarheit <input type="range" min="-40" max="40" value="${Number(edit.clarity||0)}" data-ed="clarity"><output>${Number(edit.clarity||0)}</output></label><label>Weichzeichnen <input type="range" min="0" max="8" step=".5" value="${Number(edit.blur)}" data-ed="blur"><output>${Number(edit.blur)}</output></label><label>Vignette <input type="range" min="0" max="100" value="${Number(edit.vignette)}" data-ed="vignette"><output>${Number(edit.vignette)}%</output></label><label>Farbton <input type="range" min="-180" max="180" value="${Number(edit.hue||0)}" data-ed="hue"><output>${Number(edit.hue||0)}</output></label></div></div>
      <div class="lv-studio-pane" data-studio-pane="decorate"><div class="lv-editor-fun"><label>Rahmen <select data-ed="frame">${FRAMES.map(frame=>`<option value="${frame}">${frame?frame[0].toUpperCase()+frame.slice(1):'Kein Rahmen'}</option>`).join('')}</select></label><div class="lv-sticker-browser">${stickerButtons}</div><label>Text im Bild <input type="text" maxlength="60" value="${esc(edit.caption||'')}" data-ed="caption" placeholder="Euer Moment …"></label><div class="lv-tool-row"><button type="button" data-add-text>Text hinzufügen</button><button type="button" data-rotate>↻ 90° drehen</button></div></div></div>
      <div class="lv-studio-pane" data-studio-pane="title"><div class="lv-editor-name"><input value="" placeholder="Eigener Fototitel" data-edit-name><button type="button" data-ai-title>✨ KI-Titel aus Bild, Zeit und Ort erkennen</button><small data-metadata-summary></small></div></div>
    </div>`;
  }

  function placeContextFor(item){const trip=window.LuviaTripStore?.snapshot?.().activeTrip||{};const known=item.placeId&&window.LuviaPlaceCore?.getPlace?.(item.placeId);const destination=trip.destination||{};return{placeName:item.metadata?.resolvedLocation?.name||known?.name||known?.title||null,placeAddress:item.metadata?.resolvedLocation?.address||null,destinationName:destination.name||trip.destinationName||null,destinationLatitude:destination.latitude??null,destinationLongitude:destination.longitude??null};}
  async function aiTitleFor(item) {
    const url = await urlFor(item);
    if (!url) throw new Error('Für dieses Foto ist keine sichere Vorschau verfügbar.');
    if (!window.LuviaOpenAIProvider?.run) throw new Error('Luvia Bildanalyse ist noch nicht geladen.');
    const result = await window.LuviaOpenAIProvider.run({capability:'media.describe',tier:'fast',input:{imageUrl:url,language:'de',instruction:'Erzeuge einen kurzen, warmen und konkreten deutschen Fototitel. Nutze nachweisbare Aufnahmezeit, EXIF-GPS, Reiseziel und erkannten Ort. Wenn Koordinaten oder ein Ortsname vorliegen, darf der Titel z. B. Unser Nachmittag in Paris oder Bei der Galerie Lafayette lauten. Keine unbelegten Details erfinden.'},context:{capturedAt:item.capturedAt,latitude:item.latitude,longitude:item.longitude,dayKey:item.dayKey,...placeContextFor(item)}} ,{timeoutMs:45000});
    return result?.data?.result?.title || result?.result?.title || '';
  }

  async function openEditor(id) {
    let item=items.find(entry=>entry.id===id); if(!item){item=await window.LuviaMediaCore.get(id).catch(()=>null);if(item)items=[...items,item]} if(!item)return;
    const validPolaroid=(await tripDays()).includes(item.dayKey),url=await urlFor(item),edit=settings(item),state={...edit,overlays:[...(edit.overlays||[])]},overlay=document.createElement('div');
    if(edit.sticker && !(edit.overlays||[]).length)state.overlays.push({type:'sticker',value:edit.sticker,x:.84,y:.16,size:.13,rotation:0,schema:'image-v2'});
    if(edit.caption && !(edit.overlays||[]).some(x=>x.type==='text'))state.overlays.push({type:'text',value:edit.caption,x:.5,y:.78,size:.07,rotation:0,schema:'image-v2'});
    state.sticker=''; state.caption=''; overlay.className='lv-photo-overlay';
    overlay.innerHTML=`<section class="lv-editor-dialog lv-editor-pro"><header class="lv-editor-topbar"><div><span>🎨 Luvia Photo Studio</span><strong>Foto bearbeiten</strong></div><button data-close aria-label="Editor schließen">×</button></header><div class="lv-editor-workspace"><div class="lv-editor-preview-shell"><div class="lv-editor-preview frame-${esc(edit.frame||'none')}"><img src="${esc(url)}" alt="${esc(displayName(item))}"><b class="lv-photo-vignette"></b><div class="lv-editor-overlay-stage" data-overlay-stage></div></div></div><aside class="lv-editor-panel">${editorControls(edit)}</aside></div><div class="lv-editor-actions"><button data-reset>Zurücksetzen</button><button data-polaroid ${validPolaroid?'':'disabled'}>Polaroid des Tages</button><button class="primary" data-save>Speichern</button></div></section>`;
    const removeOverlay=mountOverlay(overlay);
    const preview=overlay.querySelector('.lv-editor-preview'),img=preview.querySelector('img'),vignette=preview.querySelector('.lv-photo-vignette'),overlayStage=preview.querySelector('[data-overlay-stage]');
    const syncOverlayStage=()=>{overlayStage.style.left=`${img.offsetLeft}px`;overlayStage.style.top=`${img.offsetTop}px`;overlayStage.style.width=`${img.offsetWidth}px`;overlayStage.style.height=`${img.offsetHeight}px`;overlayStage.style.transform=`rotate(${Number(state.rotation||0)}deg)`;overlayStage.style.transformOrigin='center';};img.addEventListener('load',()=>requestAnimationFrame(syncOverlayStage));if(img.complete)requestAnimationFrame(syncOverlayStage);img.addEventListener('error',()=>{if(!img.alt)img.alt='Vorschau nicht verfügbar'});new ResizeObserver(()=>syncOverlayStage()).observe(preview);
    overlay.querySelector('[data-ed="frame"]').value=state.frame||''; const nameInput=overlay.querySelector('[data-edit-name]'); if(nameInput) nameInput.value=item.displayName||''; const summary=overlay.querySelector('[data-metadata-summary]'); if(summary) summary.textContent=[item.capturedAt?`${fmtDate(item.capturedAt)} · ${fmtTime(item.capturedAt)}`:'',item.metadata?.resolvedLocation?.name?`Ort: ${item.metadata.resolvedLocation.name}`:item.latitude!=null&&item.longitude!=null?'EXIF-GPS vorhanden, Ort noch nicht benannt':'Kein GPS in der gelieferten Datei',item.metadata?.captureEvidence||item.metadata?.exif?.gpsAvailable?'Metadaten verfügbar':''].filter(Boolean).join(' · ');
    const renderOverlays=()=>{overlayStage.innerHTML=(state.overlays||[]).map((raw,i)=>{const o=normalizeOverlay(raw);state.overlays[i]=o;return `<div class="lv-canvas-item ${o.type==='text'?'is-text':'is-sticker'}" data-overlay-index="${i}" style="left:${o.x*100}%;top:${o.y*100}%;--overlay-size:${o.size};transform:translate(-50%,-50%) rotate(${o.rotation}deg)"><span>${esc(o.value||'')}</span><button type="button" data-overlay-delete="${i}">×</button><i data-overlay-handle="${i}" title="Größe ziehen · Doppeltippen dreht">↗</i><output>${Math.round(o.size*100)}%</output></div>`}).join('');bindCanvasItems()};
    const bindCanvasItems=()=>{overlayStage.querySelectorAll('.lv-canvas-item').forEach(node=>{let start=null;node.onpointerdown=e=>{if(e.target.closest('button,i'))return;node.setPointerCapture(e.pointerId);const r=overlayStage.getBoundingClientRect(),o=state.overlays[Number(node.dataset.overlayIndex)];start={x:e.clientX,y:e.clientY,ox:o.x,oy:o.y,r};};node.onpointermove=e=>{if(!start)return;const o=state.overlays[Number(node.dataset.overlayIndex)];o.x=Math.max(0,Math.min(1,start.ox+(e.clientX-start.x)/start.r.width));o.y=Math.max(0,Math.min(1,start.oy+(e.clientY-start.y)/start.r.height));node.style.left=(o.x*100)+'%';node.style.top=(o.y*100)+'%'};node.onpointerup=()=>start=null;});overlayStage.querySelectorAll('[data-overlay-delete]').forEach(b=>b.onclick=()=>{state.overlays.splice(Number(b.dataset.overlayDelete),1);renderOverlays()});overlayStage.querySelectorAll('[data-overlay-handle]').forEach(h=>{let startDistance=0,base=.13;h.onpointerdown=e=>{e.preventDefault();e.stopPropagation();const node=h.parentElement,r=node.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;startDistance=Math.max(1,Math.hypot(e.clientX-cx,e.clientY-cy));base=state.overlays[Number(h.dataset.overlayHandle)].size||.13;h.setPointerCapture(e.pointerId)};h.onpointermove=e=>{if(!h.hasPointerCapture(e.pointerId))return;const node=h.parentElement,r=node.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,d=Math.max(1,Math.hypot(e.clientX-cx,e.clientY-cy)),o=state.overlays[Number(h.dataset.overlayHandle)];o.size=Math.max(.025,Math.min(.5,base*(d/startDistance)));node.style.setProperty('--overlay-size',o.size);const out=node.querySelector('output');if(out)out.textContent=Math.round(o.size*100)+'%'};h.onpointerup=e=>{try{h.releasePointerCapture(e.pointerId)}catch{}};h.onpointercancel=h.onpointerup;h.ondblclick=()=>{const o=state.overlays[Number(h.dataset.overlayHandle)];o.rotation=(Number(o.rotation||0)+15)%360;renderOverlays()}})};
    const apply=()=>{img.style.filter=editCss({editSettings:state});img.style.transform=`rotate(${Number(state.rotation||0)}deg)`;preview.className=`lv-editor-preview frame-${state.frame||'none'}`;vignette.style.opacity=Math.min(.8,Number(state.vignette||0)/100);syncOverlayStage();renderOverlays()}; apply();
    overlay.querySelectorAll('input[type=range]').forEach(input=>input.oninput=()=>{state[input.dataset.ed]=Number(input.value);input.nextElementSibling.textContent=input.dataset.ed==='temperature'||input.dataset.ed==='blur'?input.value:`${input.value}%`;apply()});
    overlay.querySelectorAll('[data-filter]').forEach(button=>button.onclick=()=>{state.filter=button.dataset.filter;overlay.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('is-active',x===button));apply()});
    {const control=overlay.querySelector('[data-ed="frame"]');control.onchange=()=>{state.frame=control.value;apply()}}
    overlay.querySelector('[data-rotate]').onclick=()=>{state.rotation=(Number(state.rotation||0)+90)%360;apply()};
    const drawer=overlay.querySelector('[data-studio-drawer]');
    overlay.querySelectorAll('[data-studio-tab]').forEach(button=>button.onclick=()=>{const key=button.dataset.studioTab;overlay.querySelectorAll('[data-studio-tab]').forEach(x=>x.classList.toggle('is-active',x===button));overlay.querySelectorAll('[data-studio-pane]').forEach(x=>x.classList.toggle('is-active',x.dataset.studioPane===key));drawer?.classList.add('is-open')});
    overlay.querySelector('[data-ai-title]').onclick=async()=>{const button=overlay.querySelector('[data-ai-title]');button.disabled=true;button.textContent='✨ Bild wird erkannt …';try{const title=await aiTitleFor(item);overlay.querySelector('[data-edit-name]').value=title||''}catch(error){showError(error)}finally{button.disabled=false;button.textContent='✨ KI-Titel erkennen'}};
    overlay.querySelectorAll('[data-quick-sticker]').forEach(button=>button.addEventListener('click',()=>{const value=button.dataset.quickSticker;if(!value)return;state.overlays=[...(state.overlays||[]),{type:'sticker',value,x:.5,y:.5,size:.13,rotation:0,schema:'image-v2'}];apply()}));
    overlay.querySelector('[data-add-text]')?.addEventListener('click',()=>{const value=overlay.querySelector('[data-ed="caption"]')?.value?.trim()||'Euer Moment';state.overlays=[...(state.overlays||[]),{type:'text',value,x:.5,y:.78,size:.07,rotation:0,schema:'image-v2'}];apply()});
    overlay.querySelector('[data-reset]').onclick=()=>{Object.assign(state,{brightness:100,contrast:100,saturation:100,temperature:0,blur:0,vignette:0,exposure:0,highlights:0,shadows:0,clarity:0,hue:0,grain:0,filter:'none',rotation:0,frame:'',sticker:'',caption:'',overlays:[]});const textInput=overlay.querySelector('[data-ed="caption"]'); if(textInput) textInput.value=''; apply();overlay.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('is-active',x.dataset.filter==='none'))};
    const polaroidButton=overlay.querySelector('[data-polaroid]'); if(polaroidButton&&!polaroidButton.disabled)polaroidButton.onclick=async()=>{suppressRealtimeUntil=Date.now()+1200;await window.LuviaMediaCore.setPolaroid(id,item.dayKey);removeOverlay();await load({silent:true,force:true});status('Polaroid des Tages gespeichert.','ready')};
    overlay.querySelector('[data-save]').onclick=async()=>{const button=overlay.querySelector('[data-save]');button.disabled=true;button.textContent='Wird fest gespeichert …';try{suppressRealtimeUntil=Date.now()+2200;const blob=await renderComposite(item,state),name=overlay.querySelector('[data-edit-name]')?.value||item.displayName||'';await window.LuviaMediaCore.saveRenderedPreview(id,blob,{displayName:name,editSettings:state});urlCache.clear();removeOverlay();await load({silent:true,force:true});status('Foto wurde als feste bearbeitete Ansicht gespeichert.','ready')}catch(error){showError(error);button.disabled=false;button.textContent='Speichern'}};
    const close=()=>removeOverlay(); overlay.querySelector('[data-close]').onclick=close; overlay.onclick=e=>{if(e.target===overlay)close()};
  }

  async function openMemoryBridge(clusterId) {
    try {
      const proposal=await window.LuviaAIMemoryBridge.analyze(clusterId),overlay=document.createElement('div'); overlay.className='lv-photo-overlay';
      overlay.innerHTML=`<section class="lv-editor-dialog"><button data-close>×</button><span>✨ AI Memory Bridge</span><h2>${esc(proposal.title)}</h2><p>${esc(proposal.explanation)}</p><div class="lv-inline-empty"><b>Warum wurde dieser Moment erkannt?</b><ul>${(proposal.evidenceSummary?.facts||proposal.context?.summary?.facts||[]).map(f=>`<li>${esc(f)}</li>`).join('')}</ul></div>${proposal.actions.map((action,index)=>`<label class="lv-memory-option"><input type="checkbox" data-memory-action="${index}" checked><span><b>${esc(action.label)}</b><small>${Math.round((action.confidence||0)*100)} % Sicherheit</small></span></label>`).join('')}<div class="lv-editor-actions"><button data-cancel>Abbrechen</button><button class="primary" data-confirm>Bestätigen & verknüpfen</button></div></section>`;
      const removeOverlay=mountOverlay(overlay); const close=()=>removeOverlay(); overlay.querySelector('[data-close]').onclick=close; overlay.querySelector('[data-cancel]').onclick=close;
      overlay.querySelector('[data-confirm]').onclick=async()=>{const selected=proposal.actions.filter((_,i)=>overlay.querySelector(`[data-memory-action="${i}"]`)?.checked);await window.LuviaAIMemoryBridge.apply(proposal,{confirmed:true,selectedActions:selected});close();status('Erinnerung wurde bestätigt und verknüpft.','ready')};
    } catch(error) { showError(error); }
  }

  async function readData({analyze=false}={}) {
    items=await window.LuviaMediaCore.list({type:'image'});
    const pendingMetadata=items.filter(item=>!item.metadata?.captureEvidence&&!item.metadata?.metadataAutoCheckedAt).slice(0,4);
    for(const candidate of pendingMetadata){try{const refreshed=await window.LuviaMediaCore.reanalyze(candidate.id);items=items.map(x=>x.id===refreshed.id?refreshed:x)}catch{}}
    polaroids=await window.LuviaMediaCore.listPolaroids();
    if (analyze) {
      const generated=window.LuviaMediaClustering.generate(items);
      clusters=await window.LuviaMediaClustering.syncGenerated(generated);
    } else clusters=await window.LuviaMediaClustering.listPersisted();
  }
  async function renderAll({force=false}={}) {
    const next=fingerprint(); if(!force && next===lastFingerprint)return; lastFingerprint=next;
    const countNode=host?.querySelector('[data-gallery-count]'); if(!countNode)return; countNode.textContent=`${items.length} Foto${items.length===1?'':'s'}`;
    await renderFavorites(); await renderDays();
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
    if(window.LuviaTravelContext?.requestLocation){try{return await window.LuviaTravelContext.requestLocation()}catch{}}
    return new Promise(resolve=>navigator.geolocation.getCurrentPosition(position=>resolve({latitude:position.coords.latitude,longitude:position.coords.longitude,accuracy:position.coords.accuracy,capturedAt:new Date().toISOString()}),()=>resolve(null),{enableHighAccuracy:true,timeout:8000,maximumAge:30000}));
  }
  async function upload(files,{camera=false}={}) {
    const list=[...files]; if(!list.length)return;
    suppressRealtimeUntil=Date.now()+10000;
    let location=window.LuviaPresenceVisitCore?.diagnostics?.()?.lastPosition||null;
    if(camera&&!location) location=await currentLocation();
    status(`${list.length} Foto${list.length===1?'':'s'} werden hochgeladen …`);
    for(let i=0;i<list.length;i++){
      status(`Upload ${i+1}/${list.length}: ${list[i].name||'Foto'}`);
      await window.LuviaMediaCore.upload(list[i],{source:camera?'app_camera':'user_upload',captureSource:camera?'app_camera':'file_picker',capturedAt:camera?new Date().toISOString():undefined,captureLocation:location,deviceMetadata:camera?{userAgent:navigator.userAgent,platform:navigator.platform,language:navigator.language}:null});
    }
    await load({silent:false,analyze:true,force:true});
  }

  function mediaRealtime(payload) {
    const relevant=['media','media_day_polaroids'].includes(payload?.table||'');
    if(!relevant)return;
    const event=payload?.eventType || payload?.event;
    const analyze=event==='INSERT'||event==='DELETE'||(event==='UPDATE'&&['captured_at','day_key','status'].some(key=>payload?.old?.[key]!==payload?.new?.[key]));
    scheduleLoad('Media Realtime',{realtime:true,silent:true,analyze,force:false});
  }
  function clusterRealtime() { scheduleLoad('Cluster Realtime',{realtime:true,silent:true,analyze:false,force:false}); }

  async function mount(target) {
    host=target; host.innerHTML=shell();
    const input=host.querySelector('[data-gallery-input]');
    host.querySelector('[data-gallery-download]').onclick=async()=>{try{const trip=window.LuviaTripStore?.snapshot?.()?.activeTrip||{};await downloadCollection(items.map(x=>x.id),`${trip.title||trip.name||'Luvia'} Galerie`)}catch(error){showError(error)}};
    host.querySelector('[data-gallery-add]').onclick=()=>{try{input.showPicker?input.showPicker():input.click()}catch{input.click()}};
    input.onchange=async()=>{const files=[...input.files];input.value='';try{await upload(files)}catch(error){showError(error)}};
        unsubMedia=await window.LuviaMediaCore.subscribe(mediaRealtime);
    unsubClusters=await window.LuviaMediaClustering.subscribe(clusterRealtime);
    await load({silent:false,analyze:true,force:true});
    return ()=>unmount();
  }
  async function unmount(){clearTimeout(loadTimer);await unsubMedia?.();await unsubClusters?.();unsubMedia=unsubClusters=null;urlCache.clear();urlFailureCache.clear();if(host)host.innerHTML='';host=null;activeDay=null;lastFingerprint=''}

  window.LuviaGalleryView=Object.freeze({version:VERSION,build:BUILD,mount,unmount,refresh:options=>load({silent:false,force:true,...options}),openPhoto:openLightbox,openEditor,renderVisual:(item,attrs='')=>photoVisual(item,attrs),hydrateVisuals:(root,list)=>hydrateImages(root,list),locationName,downloadPhoto:downloadPhotoAsset,downloadCollection,shareCollection});
})();
