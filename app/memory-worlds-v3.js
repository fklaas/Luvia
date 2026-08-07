(() => {
'use strict';
const VERSION='4.36.1',BUILD='13.36.1';
let host=null,stopCards=null,urlCache=new Map(),homeState=null;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const me=()=>window.ParisAuth?.getState?.()?.user||{};
const REACTIONS=['❤️','🥹','😂','🥰','🤩','🫶','✨','☀️','🌊','🍝','☕','🎢','🏙️','🌿','🎶','📸','😌','🤭','😋','🥳','🤯','🙈','💫','🔥'];
const QUESTIONS=['Was sieht man auf diesen Bildern nicht?','Was würdest du jemandem erzählen, der nicht dabei war?','Welches kleine Detail ist dir davon geblieben?','Was war hier anders als geplant?','Was hat diesen Moment für dich ausgemacht?'];
const VIBES=[['spontaneous','Völlig spontan','⚡'],['planned','Lange geplant','🗓️'],['quiet','Klein, aber besonders','🤍'],['funny','Einfach lustig','😂'],['highlight','Echtes Highlight','✨'],['chaos','Schönes Chaos','🫠']];
const fmt=v=>{if(!v)return'';const d=new Date(v);return Number.isNaN(d.getTime())?'':new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'long'}).format(d)};
async function signed(m){if(!m)return'';const k=String(m.id);if(urlCache.has(k))return urlCache.get(k);const u=await window.LuviaMediaCore?.signedUrl?.(m,3600).catch(()=>null)||'';urlCache.set(k,u);return u}
async function putImg(el,m){if(!el||!m)return;const u=await signed(m);if(u&&el.isConnected)el.innerHTML=`<img src="${esc(u)}" alt="Reisefoto" loading="lazy" decoding="async">`}
const whoName=(card,members)=>members.find(x=>String(x.id)===String(card.author_id))?.displayName||'Reisender';
const weightLabel=n=>Number(n)>=3?'Herzstück':Number(n)===2?'Wichtig':'Erinnerung';
const typeIcon=t=>({photo:'📸',quote:'💬',vibe:'✨',reaction:'💛',place:'📍',food:'🍝',weather:'☀️',inside_joke:'🤭'}[t]||'◌');
const cardTone=t=>({photo:'photo',quote:'quote',vibe:'vibe',reaction:'reaction',place:'place',food:'food',weather:'weather',inside_joke:'joke'}[t]||'note');
function clusterForKey(key,clusters){if(!key?.startsWith('cluster:'))return null;const id=key.slice(8);return clusters.find(c=>String(c.id)===String(id))||null}
function seeded(key,index){let h=2166136261;for(const ch of `${key}:${index}`){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return((h>>>0)%10000)/10000}

async function renderHome(){
  if(!host||!window.LuviaMemoryCards||!window.LuviaMemoryJourneys)return;
  host.innerHTML='<section class="mc-home"><div class="mc-loading">Erinnerungen werden gesammelt …</div></section>';
  let src,cards,members;
  try{[src,cards,members]=await Promise.all([window.LuviaMemoryJourneys.source(),window.LuviaMemoryCards.list(),window.LuviaMemoryCards.members()])}catch(e){host.innerHTML=`<section class="mc-home"><div class="mc-error"><h2>Memory Cards sind noch nicht bereit</h2><p>${esc(e.message||e)}</p></div></section>`;return}
  const clusters=(src.clusters||[]).filter(c=>Array.isArray(c.mediaIds)&&c.mediaIds.length);
  const meId=me().id;
  const touched=new Set(cards.filter(c=>String(c.author_id)===String(meId)&&c.cluster_id).map(c=>String(c.cluster_id)));
  const pending=clusters.filter(c=>!touched.has(String(c.id)));
  const grouped=new Map();for(const c of cards){const key=c.cluster_id?`cluster:${c.cluster_id}`:`free:${c.id}`;if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(c)}
  const stacks=[...grouped.entries()].reverse();
  homeState={src,cards,members,clusters,grouped};
  host.innerHTML=`<section class="mc-home">
    <header class="mc-hero"><div><span class="mc-eyebrow">LUVIA MEMORIES</span><h1>Kleine Dinge. Echte Erinnerungen.</h1><p>Ihr müsst keine Reise beschreiben. Wählt, reagiert, ergänzt einen Satz – Luvia bewahrt die Bausteine eurer gemeinsamen Geschichte.</p></div><div class="mc-stats"><b>${cards.length}</b><span>Memory Cards</span><b>${members.length}</b><span>Reisende</span></div></header>
    <section class="mc-section"><div class="mc-section-title"><div><small>GEMEINSAM ERINNERN</small><h2>${pending.length?'Diese Momente warten auf deinen Blick':'Für den Moment ist alles entdeckt'}</h2></div><p>Ein paar schnelle Entscheidungen reichen. Danach landet der Moment als Kartenstapel bei euren Erinnerungen.</p></div><div class="mc-discover-grid">${pending.slice(0,8).map((c,i)=>`<button class="mc-discover" data-cluster="${esc(c.id)}" data-i="${i}"><div class="mc-discover-photo"></div><div class="mc-discover-copy"><span>${c.mediaIds.length} Fotos</span><strong>${fmt(c.started_at||c.created_at)||'Gemeinsamer Moment'}</strong><em>Erinnerung öffnen →</em></div></button>`).join('')||'<div class="mc-empty">Neue Foto-Momente erscheinen hier automatisch, sobald es etwas zu entdecken gibt.</div>'}</div></section>
    <section class="mc-section mc-decks-section"><div class="mc-section-title"><div><small>EURE KARTENSTAPEL</small><h2>Was von der Reise wirklich hängen bleibt</h2></div><p>Jeder Stapel gehört zu einem Moment. Tippen oder klicken, um die Karten wieder vor euch auszubreiten.</p></div><div class="mc-deck-grid">${stacks.map(([key,items],i)=>renderStack(key,items,members,i)).join('')||'<div class="mc-empty">Noch keine Kartenstapel. Öffnet oben den ersten Moment.</div>'}</div></section>
  </section>`;
  for(const b of host.querySelectorAll('[data-cluster]')){const c=pending[Number(b.dataset.i)];const media=await window.LuviaMemoryAlbums.mediaByIds(c.mediaIds);putImg(b.querySelector('.mc-discover-photo'),media[0]);b.onclick=()=>openDiscovery(c,media,members)}
  await paintCardPhotos(host,cards,src.media||[]);
  for(const el of host.querySelectorAll('[data-stack]'))el.onclick=()=>openDeck(el.dataset.stack);
}

function renderStack(key,items,members,index){
  const hero=items.find(x=>x.card_type==='photo')||items[0];
  const rot=((seeded(key,index)-.5)*3.2).toFixed(2),lift=Math.round((seeded(key,index+9)-.5)*12);
  const topQuote=items.find(x=>x.content&&x.card_type!=='photo');
  const people=[...new Set(items.map(x=>String(x.author_id)))];
  return `<button class="mc-deck" data-stack="${esc(key)}" style="--deck-rot:${rot}deg;--deck-lift:${lift}px">
    <span class="mc-deck-layer layer-3"></span><span class="mc-deck-layer layer-2"></span><span class="mc-deck-layer layer-1"></span>
    <span class="mc-deck-front tone-${cardTone(hero.card_type)}"><span class="mc-deck-photo" data-card-media="${esc(hero.media_id||'')}">${hero.media_id?'':`<b>${typeIcon(hero.card_type)}</b>`}</span><span class="mc-deck-info"><small>${items.length} ${items.length===1?'Card':'Cards'} · ${people.length} ${people.length===1?'Stimme':'Stimmen'}</small><strong>${topQuote?esc(topQuote.content):'Diesen Moment wieder öffnen'}</strong><i>${items.some(x=>Number(x.weight)>=3)?'♥ Herzstück dabei':'Memory Moment'}</i></span></span>
  </button>`
}
async function paintCardPhotos(root,cards,media){const map=new Map(media.map(m=>[String(m.id),m]));for(const el of root.querySelectorAll('[data-card-media]')){const m=map.get(String(el.dataset.cardMedia));if(m)await putImg(el,m)}}

function overlay({deck=false}={}){const root=document.createElement('div');root.className=deck?'mc-overlay mc-deck-overlay':'mc-overlay';root.innerHTML='<div class="mc-flow"></div><div class="mc-overlay-nav"><button class="mc-back" aria-label="Zurück">←</button><button class="mc-x" aria-label="Schließen">×</button></div>';document.body.append(root);document.body.classList.add('mc-open');const close=()=>{root.classList.add('closing');setTimeout(()=>{root.remove();document.body.classList.remove('mc-open')},260)};root.querySelector('.mc-x').onclick=close;return{root,flow:root.querySelector('.mc-flow'),back:root.querySelector('.mc-back'),close}}
async function swap(ctx,html,{motion='fade',showBack=true}={}){
  const old=ctx.flow.firstElementChild;
  if(old){old.classList.add('is-leaving');await new Promise(r=>setTimeout(r,180));old.remove()}
  const n=document.createElement('section');n.className=`mc-screen motion-${motion}`;n.innerHTML=html;ctx.flow.append(n);ctx.back.hidden=!showBack;requestAnimationFrame(()=>requestAnimationFrame(()=>n.classList.add('is-visible')));return n
}

async function openDiscovery(cluster,media,members,startStep=0){
  const ctx=overlay(),cards=await window.LuviaMemoryCards.list({clusterId:cluster.id}),uid=String(me().id||'');
  const state={step:startStep,photoId:cards.find(c=>String(c.author_id)===uid&&c.card_type==='photo')?.media_id||null,answer:cards.find(c=>String(c.author_id)===uid&&c.card_type==='quote')?.content||'',reaction:cards.find(c=>String(c.author_id)===uid&&c.card_type==='reaction')?.reaction||'',vibe:cards.find(c=>String(c.author_id)===uid&&c.card_type==='vibe')?.metadata?.value||'',question:QUESTIONS[Math.floor(Math.random()*QUESTIONS.length)]};
  ctx.back.onclick=()=>{if(state.step<=0){ctx.close();return}state.step--;show()};
  async function show(){
    if(state.step===0){const p=await swap(ctx,`<div class="mc-intro-copy"><small>MEMORY MOMENT</small><h1>Welches Bild bringt dich am schnellsten zurück?</h1><p>Es gibt kein richtiges Bild. Es geht nur um deinen Blick.</p></div><div class="mc-photo-choice">${media.slice(0,6).map((m,i)=>`<button data-photo="${esc(m.id)}" data-pi="${i}" class="${String(state.photoId)===String(m.id)?'picked':''}"><figure></figure><span>${String(state.photoId)===String(m.id)?'✓ Meins':'Auswählen'}</span></button>`).join('')}</div><button class="mc-primary" data-next ${state.photoId?'':'disabled'}>Weiter</button>`,{motion:'focus',showBack:false});for(const b of p.querySelectorAll('[data-photo]')){putImg(b.querySelector('figure'),media[Number(b.dataset.pi)]);b.onclick=()=>{state.photoId=b.dataset.photo;p.querySelectorAll('[data-photo]').forEach(x=>{const hit=String(x.dataset.photo)===String(state.photoId);x.classList.toggle('picked',hit);x.querySelector('span').textContent=hit?'✓ Meins':'Auswählen'});p.querySelector('[data-next]').disabled=false}}p.querySelector('[data-next]').onclick=async()=>{await window.LuviaMemoryCards.save({cardType:'photo',sourceType:'cluster-discovery',clusterId:cluster.id,mediaId:state.photoId,weight:2,dedupeKey:`cluster:${cluster.id}:author:${uid}:photo`,metadata:{choice:'personal-favorite'}});state.step=1;show()}}
    else if(state.step===1){const p=await swap(ctx,`<div class="mc-question"><small>DEIN BLICK</small><h1>${esc(state.question)}</h1><textarea maxlength="240" placeholder="Ein Satz reicht völlig.">${esc(state.answer)}</textarea><div class="mc-counter"><span data-count>${state.answer.length}</span>/240</div><div class="mc-question-actions"><button class="mc-link" data-other>↻ Andere Frage</button><button class="mc-primary" data-next>So lassen</button></div></div>`,{motion:'soft'});const ta=p.querySelector('textarea');setTimeout(()=>ta.focus(),220);ta.oninput=()=>{state.answer=ta.value;p.querySelector('[data-count]').textContent=ta.value.length};p.querySelector('[data-other]').onclick=async()=>{const title=p.querySelector('h1');title.classList.add('text-swap');await new Promise(r=>setTimeout(r,140));state.question=QUESTIONS[(QUESTIONS.indexOf(state.question)+1)%QUESTIONS.length];title.textContent=state.question;requestAnimationFrame(()=>title.classList.remove('text-swap'))};p.querySelector('[data-next]').onclick=async()=>{if(state.answer.trim())await window.LuviaMemoryCards.save({cardType:'quote',sourceType:'cluster-discovery',clusterId:cluster.id,content:state.answer,dedupeKey:`cluster:${cluster.id}:author:${uid}:quote`,metadata:{question:state.question}});state.step=2;show()}}
    else if(state.step===2){const p=await swap(ctx,`<div class="mc-vibe"><small>OHNE VIELE WORTE</small><h1>Was war das für ein Moment?</h1><div class="mc-vibe-grid">${VIBES.map(([k,l,e])=>`<button data-vibe="${k}" class="${state.vibe===k?'picked':''}"><b>${e}</b><span>${l}</span></button>`).join('')}</div><h2>Und welches Gefühl passt sofort?</h2><div class="mc-reactions">${REACTIONS.map(r=>`<button data-react="${r}" class="${state.reaction===r?'picked':''}">${r}</button>`).join('')}</div><button class="mc-primary" data-next>Aufdecken</button></div>`,{motion:'rise'});p.querySelectorAll('[data-vibe]').forEach(b=>b.onclick=()=>{state.vibe=b.dataset.vibe;p.querySelectorAll('[data-vibe]').forEach(x=>x.classList.toggle('picked',x===b))});p.querySelectorAll('[data-react]').forEach(b=>b.onclick=()=>{state.reaction=b.dataset.react;p.querySelectorAll('[data-react]').forEach(x=>x.classList.toggle('picked',x===b))});p.querySelector('[data-next]').onclick=async()=>{if(state.vibe){const hit=VIBES.find(x=>x[0]===state.vibe);await window.LuviaMemoryCards.save({cardType:'vibe',sourceType:'cluster-discovery',clusterId:cluster.id,content:hit?.[1]||'',dedupeKey:`cluster:${cluster.id}:author:${uid}:vibe`,metadata:{value:state.vibe}})}if(state.reaction)await window.LuviaMemoryCards.save({cardType:'reaction',sourceType:'cluster-discovery',clusterId:cluster.id,reaction:state.reaction,dedupeKey:`cluster:${cluster.id}:author:${uid}:reaction`});state.step=3;show()}}
    else {const fresh=await window.LuviaMemoryCards.list({clusterId:cluster.id});const p=await swap(ctx,`<div class="mc-reveal-head"><small>AUFGEDECKT</small><h1>So erinnert ihr euch daran.</h1><p>${members.length>1?'Jede Perspektive darf anders sein. Genau daraus entsteht später eure gemeinsame Geschichte.':'Deine Cards sind gespeichert. Sobald weitere Reisende beitragen, erscheinen ihre Perspektiven hier.'}</p></div><div class="mc-reveal">${fresh.map((c,i)=>renderLooseCard(c,members,i,'reveal')).join('')}</div><div class="mc-finish"><button class="mc-primary" data-done>Zum Kartenstapel</button><span>${fresh.length} Cards entstanden</span></div>`,{motion:'scatter'});await paintLoosePhotos(p,fresh,media);p.querySelectorAll('[data-weight][data-own="1"]').forEach(b=>b.onclick=async()=>{const c=fresh.find(x=>String(x.id)===String(b.dataset.weight));const next=Number(c.weight)>=3?1:Number(c.weight)+1;await window.LuviaMemoryCards.setWeight(c.id,next);b.textContent=weightLabel(next);c.weight=next});p.querySelectorAll('[data-weight][data-own="0"]').forEach(b=>b.disabled=true);p.querySelector('[data-done]').onclick=()=>{ctx.close();setTimeout(renderHome,300)}}
  }
  show();
}

function renderLooseCard(c,members,i,mode='deck'){
  const uid=String(me().id||''),rot=((seeded(c.id,i)-.5)*(mode==='deck'?4.2:2.4)).toFixed(2),x=Math.round((seeded(c.id,i+10)-.5)*24),y=Math.round((seeded(c.id,i+20)-.5)*20);
  const content=c.content?`<p>${esc(c.content)}</p>`:'';
  const reaction=c.reaction?`<strong>${esc(c.reaction)}</strong>`:'';
  return `<article class="mc-loose-card tone-${cardTone(c.card_type)} w${c.weight}" data-loose-card="${esc(c.id)}" style="--card-rot:${rot}deg;--card-x:${x}px;--card-y:${y}px;--card-i:${i}"><div class="mc-loose-media" data-mid="${esc(c.media_id||'')}">${c.media_id?'':`<span>${typeIcon(c.card_type)}</span>`}</div><div class="mc-loose-copy"><small>${esc(whoName(c,members))}</small>${content}${reaction}<button class="mc-weight" data-weight="${esc(c.id)}" data-own="${String(c.author_id)===uid?'1':'0'}">${weightLabel(c.weight)}</button></div></article>`
}
async function paintLoosePhotos(root,cards,media){const map=new Map(media.map(m=>[String(m.id),m]));for(const el of root.querySelectorAll('[data-mid]')){const m=map.get(String(el.dataset.mid));if(m)await putImg(el,m)}}

async function openDeck(key){
  if(!homeState)return;
  const items=homeState.grouped.get(key)||[];if(!items.length)return;
  const cluster=clusterForKey(key,homeState.clusters);const media=cluster?await window.LuviaMemoryAlbums.mediaByIds(cluster.mediaIds):homeState.src.media||[];
  const ctx=overlay({deck:true});ctx.back.hidden=true;
  const showSpread=async()=>{const p=await swap(ctx,`<div class="mc-deck-stage-head"><small>MEMORY MOMENT</small><h2>${cluster?fmt(cluster.started_at||cluster.created_at)||'Eure Karten':'Eure Karten'}</h2><span>${items.length} ${items.length===1?'Erinnerung':'Erinnerungen'}</span></div><div class="mc-spread">${items.map((c,i)=>renderLooseCard(c,homeState.members,i,'deck')).join('')}</div>${cluster?'<button class="mc-continue" data-continue>Moment weiter ergänzen</button>':''}`,{motion:'deck',showBack:false});await paintLoosePhotos(p,items,media);for(const card of p.querySelectorAll('[data-loose-card]'))card.onclick=e=>{if(e.target.closest('button'))return;openCardDetail(ctx,items.find(x=>String(x.id)===String(card.dataset.looseCard)),homeState.members,media,showSpread)};p.querySelectorAll('[data-weight][data-own="1"]').forEach(b=>b.onclick=async e=>{e.stopPropagation();const c=items.find(x=>String(x.id)===String(b.dataset.weight));const next=Number(c.weight)>=3?1:Number(c.weight)+1;await window.LuviaMemoryCards.setWeight(c.id,next);c.weight=next;b.textContent=weightLabel(next);b.closest('.mc-loose-card')?.classList.remove('w1','w2','w3');b.closest('.mc-loose-card')?.classList.add(`w${next}`)});if(cluster)p.querySelector('[data-continue]').onclick=()=>{ctx.close();setTimeout(()=>openDiscovery(cluster,media,homeState.members,0),270)}};
  showSpread();
}
async function openCardDetail(ctx,card,members,media,onBack){
  const p=await swap(ctx,`<div class="mc-card-focus-wrap">${renderLooseCard(card,members,0,'focus')}<div class="mc-card-focus-note"><small>MEMORY CARD</small><h2>${card.card_type==='photo'?'Dein gewählter Blick':card.content?esc(card.content):card.reaction?esc(card.reaction):'Kleine Erinnerung'}</h2><p>${esc(whoName(card,members))} · ${weightLabel(card.weight)}</p><span>Tippe auf Zurück, um die Karten wieder auszubreiten.</span></div></div>`,{motion:'focus',showBack:true});await paintLoosePhotos(p,[card],media);const detail=p.querySelector('.mc-loose-card');detail.classList.add('is-focus');ctx.back.onclick=async()=>{ctx.back.onclick=null;await onBack()}
}

async function mount(node){host=node;await renderHome();stopCards=await window.LuviaMemoryCards.subscribe(()=>setTimeout(renderHome,350));return()=>{stopCards?.();stopCards=null;host=null}}
window.LuviaAlbumsView=Object.freeze({version:VERSION,build:BUILD,mount,render:renderHome,experience:'memory-card-deck-experience',model:'cards -> decks -> moments -> journeys -> studio'});
})();
