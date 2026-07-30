(function(){
'use strict';
const VERSION='4.9.1';
const adapters=new Map();const capabilityRenderers=new Map();const detailCache=new Map();const detailInflight=new Map();const photoCache=new Map();const photoInflight=new Map();let current=null;
const esc=v=>window.LuviaPlaceExperience?.esc?.(v)||String(v??'');
const LABELS={discovered:'Entdeckt',idea:'Entdeckt',saved:'Favorisiert',favorite:'Favorisiert',planned:'Geplant',reserved:'Reserviert',selected:'Ausgewählt',booked:'Gebucht',checked_in:'Eingecheckt',checked_out:'Ausgecheckt',visited:'Besucht',rated:'Bewertet',rejected:'Verworfen',archived:'Archiviert'};

function cacheKey(id,options={}){return `${String(id||'').replace(/^places\//,'')}|${String(options.regionCode||'DE')}`}
async function fetchDetails(id,options={}){
 const key=cacheKey(id,options),cached=detailCache.get(key);
 if(cached&&Date.now()-cached.at<15*60*1000)return cached.value;
 if(detailInflight.has(key))return detailInflight.get(key);
 const task=Promise.resolve(window.LuviaPlaces.details(id,options)).then(value=>{detailCache.set(key,{at:Date.now(),value});detailInflight.delete(key);return value}).catch(error=>{detailInflight.delete(key);throw error});
 detailInflight.set(key,task);return task;
}
async function resolvePhoto(photo,options={}){
 const name=String(photo?.name||photo||'');if(!name)return null;const key=`${name}|${Number(options.maxWidthPx||1200)}|${Number(options.maxHeightPx||900)}`;
 if(photoCache.has(key))return photoCache.get(key);if(photoInflight.has(key))return photoInflight.get(key);
 const task=Promise.resolve(window.LuviaPlaces.photo(name,{maxWidthPx:Number(options.maxWidthPx||1200),maxHeightPx:Number(options.maxHeightPx||900)})).then(r=>{const value=r?.data?.photoUri?{uri:r.data.photoUri,attribution:photo?.authorAttributions?.[0]?.displayName||''}:null;photoInflight.delete(key);if(value)photoCache.set(key,value);return value}).catch(error=>{photoInflight.delete(key);throw error});
 photoInflight.set(key,task);return task;
}
async function prepare(id,options={}){
 const seed=options.seedPlace||{};
 const limit=Math.max(1,Math.min(6,Number(options.photoLimit||3)));
 const seedPhotoTask=Promise.allSettled((seed.photos||[]).slice(0,limit).map(photo=>resolvePhoto(photo,options)));
 const response=await fetchDetails(id,options),place={...seed,...(response?.data?.place||{})};
 const seedPhotos=(await seedPhotoTask).map(x=>x.status==='fulfilled'?x.value:null).filter(Boolean);
 const remaining=Math.max(0,limit-seedPhotos.length);
 const extra=remaining?(await Promise.allSettled((place.photos||[]).slice(0,limit).map(photo=>resolvePhoto(photo,options)))).map(x=>x.status==='fulfilled'?x.value:null).filter(Boolean):[];
 const photos=[...seedPhotos,...extra].filter((x,i,a)=>x?.uri&&a.findIndex(y=>y?.uri===x.uri)===i).slice(0,limit);
 return{response,place,photos}
}
function prefetch(ids=[],options={}){return Promise.allSettled([...new Set(ids.filter(Boolean))].slice(0,6).map(id=>prepare(id,{...options,photoLimit:1})))}

function close(){if(current?.close)current.close();current=null}
function openLoading(c={}){close();const b=window.LuviaPlaceExperience.openOverlay(`<article class="rv2-experience luv-place-detail is-loading" role="dialog" aria-modal="true"><button class="rv2-experience-close" data-close-place aria-label="Schließen">×</button><div class="rv2-experience-loading"><span></span><strong>${esc(c.typeLabel||'Place')}-Erlebnis wird geladen …</strong></div></article>`);current={backdrop:b.node,node:b.node.querySelector('.rv2-experience'),close:b.close};return current}
function gallery(p={},photos=[]){const sym=window.LuviaPlaceUI?.typeMeta?.(p)?.[0]||'📍';return `<div class="rv2-hero-gallery ${photos.length?'':'empty'}">${photos.length?photos.map((x,i)=>`<button type="button" data-place-gallery="${i}" class="rv2-gallery-photo ${i===0?'primary':''}"><img src="${esc(x.uri||x.url)}" alt="${esc(p.name)} Foto ${i+1}" loading="eager" fetchpriority="${i===0?'high':'auto'}" decoding="sync"></button>`).join(''):`<div class="rv2-gallery-fallback">${sym}<span>${esc(p.name)}</span></div>`}</div>`}
function facts(p={},i={}){const type=p.primaryType||'restaurant',slots=window.LuviaPlaceUIContract?.forType?.(type)?.card?.factSlots||['rating','distance','bestTimeToVisit','priceLevel','openingState'];const a=[];for(const slot of slots){if(slot==='rating'&&p.rating)a.push(`⭐ ${Number(p.rating).toFixed(1).replace('.',',')} <small>${Number(p.userRatingCount||0).toLocaleString('de-DE')} Bewertungen</small>`);if(slot==='distance'&&i.distanceLabel)a.push(`📍 ${esc(i.distanceLabel)} von deinem Standort`);if(slot==='bestTimeToVisit'&&i.bestTime)a.push(`✨ Beste Zeit ${esc(i.bestTime)}${/:/.test(String(i.bestTime))?' Uhr':''}`);if(slot==='priceLevel'){const raw=i.priceLabel||p.priceLabel||p.priceLevel||'';const label=window.LuviaPlaceProviderFields?.formatPriceLevel?.(raw)||raw;if(label)a.push(`💶 ${esc(label)}`)};if(slot==='openingState'&&i.openLabel)a.push(`${/geöffnet/i.test(i.openLabel)?'🟢':'🕒'} ${esc(i.openLabel)}`)}return `<div class="rv2-facts luv-place-detail-facts">${a.map(x=>`<span>${x}</span>`).join('')}</div>`}
function lifecycle(c={}){const order=(c.order?.length?c.order:['discovered','favorite','planned','visited','rated']);let n=order.indexOf(c.status||'discovered');if(n<0)n=0;return `<div class="rv2-lifecycle"><span>${esc(c.title||'Place-Lebenszyklus')}</span><div>${order.map((x,i)=>`<em class="${i<=n?'done':''}" title="${esc(LABELS[x]||x)}">${i<n?'✓':i===n?'●':'○'}</em>`).join('')}</div><strong>${esc(LABELS[order[n]]||order[n])}</strong></div>`}
function canonicalActions(html=''){return String(html||'').replace(/<button(?![^>]*\bluv-place-primary-action\b)/g,'<button class="luv-place-primary-action"')}
function section(t,h,c=''){return h?`<section class="rv2-summary ${c}"><span>${esc(t)}</span>${h}</section>`:''}
function registerCapabilityRenderer(type,renderer){const key=String(type||'').trim();if(!key||typeof renderer!=='function')throw new Error('Place-Typ und Capability-Renderer sind erforderlich.');capabilityRenderers.set(key,renderer);return renderer}
function capabilityContent(c,p,i){if(Object.prototype.hasOwnProperty.call(c,'capabilityContent'))return c.capabilityContent||'';const type=String(c.placeType||p.primaryType||'').trim(),renderer=capabilityRenderers.get(type);if(!renderer)return'';try{return String(renderer({place:p,intelligence:i,context:c})||'')}catch(error){console.warn(`[Luvia Place Detail] Capability-Bereich für ${type} konnte nicht gerendert werden.`,error);return''}}
function render(c={}){const p=c.place||{},i=c.intelligence||{},m=window.LuviaPlaceUI?.typeMeta?.(p)||['📍','Ort'];const provider=window.LuviaPlaceProviderFields?.render?.(p)||'';const alternatives=c.alternativesContent||window.LuviaPlaceUIStates?.empty?.('Aktuell wurden keine passenden Alternativen gefunden.')||'<p>Keine Alternativen verfügbar.</p>';const capabilities=capabilityContent(c,p,i);return `<button class="rv2-experience-close" data-close-place aria-label="Schließen">×</button>${gallery(p,c.photos||[])}<div class="rv2-experience-body luv-place-detail__body"><div class="rv2-experience-title"><div><span class="rv2-detail-kicker">${esc(c.typeLabel||m[1])} · ${esc(c.destination||'')}</span><h2>${esc(p.name)}</h2><p>📍 ${esc(p.address||p.formattedAddress||c.destination||'')}</p></div></div><div class="rv2-detail-primary-actions luv-place-actions">${canonicalActions(c.primaryActions||'')}</div>${facts(p,i)}${c.tags||''}${lifecycle(c.lifecycle||{})}${p.editorialSummary?`<section class="rv2-summary"><span>Überblick</span><p>${esc(p.editorialSummary)}</p></section>`:''}${provider}${window.LuviaPlaceUI?.assessment?.(i)||''}${capabilities}${section('Alternativen',alternatives,'luv-place-alternatives')}${c.extraContent||''}${c.footerActions||''}<div hidden data-place-prepared-sections>${c.participantContent||''}${c.suggestionsContent||''}${c.scheduleCard||''}</div></div>`}
function bindGallery(r,photos,p){r.querySelectorAll('[data-place-gallery]').forEach(b=>b.onclick=()=>{const n=Number(b.dataset.placeGallery),l=document.createElement('div');l.className='rv2-lightbox';l.innerHTML=`<button type="button">×</button><img src="${esc(photos[n]?.uri||photos[n]?.url)}" alt="${esc(p.name)}"><span>${n+1} / ${photos.length}</span>`;document.body.appendChild(l);l.onclick=e=>{if(e.target===l||e.target.closest('button'))l.remove()}})}
function update(o,c={}){if(!o?.node?.isConnected)return o;o.node.classList.remove('is-loading');o.node.innerHTML=render(c);bindGallery(o.node,c.photos||[],c.place||{});return o}
function open(c={}){const o=openLoading(c);return update(o,c)}
function registerAdapter(t,a){adapters.set(t,a);return a}
async function openExperience(t,s={},c={}){const a=adapters.get(t);if(!a)throw new Error(`No place detail adapter registered for ${t}`);const o=openLoading({typeLabel:a.label||t});const m=await a.load(s,c);update(o,m);await a.bind?.(o,m,c);return o}
function diagnostics(){return{version:VERSION,status:'ready',adapters:[...adapters.keys()],capabilityRenderers:[...capabilityRenderers.keys()],contract:['single-overlay','progressive-loading','restaurant-derived-renderer','lifecycle','schedule','provider-details','recommendation','considerations','alternatives','hidden-intelligence-slots','capability-renderers','capabilities','gps-only-distance']}}
window.addEventListener('luvia:place-detail-committed',()=>close());
const api=Object.freeze({version:VERSION,open,openLoading,update,openExperience,registerAdapter,registerCapabilityRenderer,close,lifecycle,fetchDetails,resolvePhoto,prepare,prefetch,diagnostics});
window.LuviaPlaceDetail=api;
window.LuviaPlaceDetails=api;
})();
