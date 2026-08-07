(() => {
'use strict';
const VERSION='4.36.4',BUILD='13.36.4';
let host=null,stopCards=null,stopIdentities=null,urlCache=new Map(),homeState=null;
const deckSessionSeed=Math.random().toString(36).slice(2);
const validColor=v=>/^#[0-9a-f]{6}$/i.test(String(v||'').trim())?String(v).trim():null;
const tripAccent=()=>validColor(window.LuviaTripContext?.getAccent?.())||validColor(getComputedStyle(document.documentElement).getPropertyValue('--trip-accent'))||'#ee6f83';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const me=()=>window.ParisAuth?.getState?.()?.user||{};
const REACTIONS=['❤️','🥹','😂','🥰','🤩','🫶','✨','☀️','🌊','🍝','☕','🎢','🏙️','🌿','🎶','📸','😌','🤭','😋','🥳','🤯','🙈','💫','🔥'];
const QUESTIONS=['Was sieht man auf diesen Bildern nicht?','Was würdest du jemandem erzählen, der nicht dabei war?','Welches kleine Detail ist dir davon geblieben?','Was war hier anders als geplant?','Was hat diesen Moment für dich ausgemacht?'];
const VIBES=[['spontaneous','Völlig spontan','⚡'],['planned','Lange geplant','🗓️'],['quiet','Klein, aber besonders','🤍'],['funny','Einfach lustig','😂'],['highlight','Echtes Highlight','✨'],['chaos','Schönes Chaos','🫠']];
const fmt=v=>{if(!v)return'';const d=new Date(v);return Number.isNaN(d.getTime())?'':new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'long'}).format(d)};
async function signed(m){if(!m)return'';const k=String(m.id);if(urlCache.has(k))return urlCache.get(k);const u=await window.LuviaMediaCore?.signedUrl?.(m,3600).catch(()=>null)||'';urlCache.set(k,u);return u}
async function putImg(el,m){if(!el||!m)return;const u=await signed(m);if(u&&el.isConnected)el.innerHTML=`<img src="${esc(u)}" alt="Reisefoto" loading="lazy" decoding="async">`}
const whoName=(card,members)=>members.find(x=>String(x.id)===String(card.author_id))?.displayName||'Reisender';
const weightLabel=n=>Number(n)>=3?'Herzstück':Number(n)===2?'Im Fokus':'Im Stapel';
const typeIcon=t=>({photo:'📸',quote:'💬',vibe:'✨',reaction:'💛',place:'📍',food:'🍝',weather:'☀️',inside_joke:'🤭'}[t]||'◌');
const typeName=t=>({photo:'Lieblingsblick',quote:'Gedanke',vibe:'Momentgefühl',reaction:'Reaktion',place:'Ort',food:'Genuss',weather:'Atmosphäre',inside_joke:'Insider'}[t]||'Erinnerung');
const memberColor=(id,members)=>validColor(members.find(x=>String(x.id)===String(id))?.avatarColor);
const contributorPalette=(people,members)=>[...new Set(people.map(id=>memberColor(id,members)).filter(Boolean))];
const deckColor=(card,members,people)=>{if(people.length<=1)return tripAccent();const palette=contributorPalette(people,members);return memberColor(card.author_id,members)||palette[0]||tripAccent()};
const stagePalette=(people,members)=>{if(people.length<=1){const trip=tripAccent();return[trip,trip]}const palette=contributorPalette(people,members);const first=palette[0]||tripAccent();return[first,palette[1]||first]};
const deckPeople=items=>[...new Set(items.map(x=>String(x.author_id)).filter(Boolean))];
const shuffled=(items,salt='')=>{const a=[...items];for(let i=a.length-1;i>0;i--){const r=Math.abs(Math.sin(Date.now()*0.00037+i*17+salt.length*13+Math.random()*97));const j=Math.floor(r*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const memberInitial=(id,members)=>{const n=members.find(x=>String(x.id)===String(id))?.displayName||'?';return n.trim().charAt(0).toUpperCase()||'?'};
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
  for(const el of host.querySelectorAll('[data-stack]'))el.onclick=()=>openDeck(el.dataset.stack,el);
}

function renderStack(key,items,members,index){
  const people=deckPeople(items),photos=items.filter(x=>x.card_type==='photo'&&x.media_id);
  const hero=(photos.length?photos[Math.floor(Math.random()*photos.length)]:items[Math.floor(Math.random()*items.length)])||items[0];
  const rot=((Math.random()-.5)*2.0).toFixed(2),lift=Math.round((Math.random()-.5)*8);
  const rest=shuffled(items.filter(x=>String(x.id)!==String(hero.id)),`${deckSessionSeed}:${key}:${index}`);
  const visible=Math.min(6,Math.max(3,items.length));
  const layers=Array.from({length:visible},(_,i)=>{
    const c=rest[i%Math.max(1,rest.length)]||hero; const color=deckColor(c,members,people);
    return `<span class="mc-deck-layer layer-${i+1}" style="--layer-color:${esc(color)};--layer-i:${i}"></span>`;
  }).join('');
  const palette=contributorPalette(people,members);
  const voices=people.map(id=>`<span class="mc-voice-dot" style="--voice:${esc(people.length<=1?tripAccent():(memberColor(id,members)||palette[0]||tripAccent()))}" title="${esc(members.find(x=>String(x.id)===id)?.displayName||'Reisender')}">${esc(memberInitial(id,members))}</span>`).join('');
  const accent=deckColor(hero,members,people);
  const cluster=clusterForKey(key,homeState?.clusters||[]);
  const momentLabel=cluster?(fmt(cluster.started_at||cluster.created_at)||'Memory Moment'):'Eure Erinnerungen';
  return `<button class="mc-deck" data-stack="${esc(key)}" style="--deck-rot:${rot}deg;--deck-lift:${lift}px;--deck-accent:${esc(accent)}">
    ${layers}
    <span class="mc-deck-front tone-${cardTone(hero.card_type)}" style="--person-color:${esc(accent)}"><span class="mc-deck-photo" data-card-media="${esc(hero.media_id||'')}">${hero.media_id?'':`<b>${typeIcon(hero.card_type)}</b>`}</span><span class="mc-deck-info"><span class="mc-deck-meta"><small>${items.length} ${items.length===1?'Card':'Cards'} · ${people.length} ${people.length===1?'Stimme':'Stimmen'}</small><span class="mc-voices">${voices}</span></span><strong>${esc(momentLabel)}</strong><i>${people.length>1?'Mehrere Perspektiven · ein gemeinsamer Stapel':items.some(x=>Number(x.weight)>=3)?'Ein Herzstück ist dabei':'Euer Moment als Kartenstapel'}</i></span></span>
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
  const uid=String(me().id||''),rot=((seeded(c.id,i)-.5)*(mode==='deck'?3.0:1.6)).toFixed(2),x=Math.round((seeded(c.id,i+10)-.5)*22),y=Math.round((seeded(c.id,i+20)-.5)*18);
  const people=homeState?.grouped?[...homeState.grouped.values()].find(list=>list.some(x=>String(x.id)===String(c.id)))?deckPeople([...homeState.grouped.values()].find(list=>list.some(x=>String(x.id)===String(c.id)))):[]:[];
  const accent=deckColor(c,members,people),name=whoName(c,members),label=typeName(c.card_type);
  const content=c.content?`<p>${esc(c.content)}</p>`:'';
  const reaction=c.reaction?`<strong>${esc(c.reaction)}</strong>`:'';
  return `<article class="mc-loose-card tone-${cardTone(c.card_type)} w${c.weight}" data-loose-card="${esc(c.id)}" style="--card-rot:${rot}deg;--card-x:${x}px;--card-y:${y}px;--card-i:${i};--person-color:${esc(accent)}"><div class="mc-card-ribbon"></div><div class="mc-loose-media" data-mid="${esc(c.media_id||'')}">${c.media_id?'':`<span class="mc-card-symbol">${typeIcon(c.card_type)}</span><em>${esc(label)}</em>`}</div><div class="mc-loose-copy"><div class="mc-card-author"><span style="--avatar:${esc(accent)}">${esc(memberInitial(c.author_id,members))}</span><small>${esc(name)}</small></div>${content}${reaction}<div class="mc-card-foot"><i>${esc(label)}</i><button class="mc-weight" data-weight="${esc(c.id)}" data-own="${String(c.author_id)===uid?'1':'0'}">${weightLabel(c.weight)}</button></div></div></article>`
}
async function paintLoosePhotos(root,cards,media){const map=new Map(media.map(m=>[String(m.id),m]));for(const el of root.querySelectorAll('[data-mid]')){const m=map.get(String(el.dataset.mid));if(m)await putImg(el,m)}}

async function openDeck(key,sourceEl){
  if(!homeState)return;
  const items=homeState.grouped.get(key)||[];if(!items.length)return;
  const cluster=clusterForKey(key,homeState.clusters);const media=cluster?await window.LuviaMemoryAlbums.mediaByIds(cluster.mediaIds):homeState.src.media||[];
  const home=host.querySelector('.mc-home');const decks=[...host.querySelectorAll('.mc-deck')];decks.forEach(d=>d.classList.toggle('is-source',d===sourceEl));home?.classList.add('is-deck-opening');
  await new Promise(r=>setTimeout(r,520));
  const ctx=overlay({deck:true});ctx.root.classList.add('mc-canvas-overlay');
  const baseClose=ctx.close;ctx.close=()=>{ctx.root.classList.add('closing');setTimeout(()=>{ctx.root.remove();document.body.classList.remove('mc-open');home?.classList.remove('is-deck-opening');decks.forEach(d=>d.classList.remove('is-source'));},420)};ctx.root.querySelector('.mc-x').onclick=ctx.close;
  const people=deckPeople(items),previewItems=shuffled(items,`${key}:launch`).slice(0,Math.min(6,items.length));
  const [stageA,stageB]=stagePalette(people,homeState.members);ctx.root.style.setProperty('--mc-stage-a',stageA);ctx.root.style.setProperty('--mc-stage-b',stageB);ctx.root.style.setProperty('--mc-stage-trip',tripAccent());
  const launch=await swap(ctx,`<div class="mc-deck-launch"><div class="mc-launch-stack">${previewItems.map((c,i)=>`<span style="--launch-i:${i};--launch-color:${esc(deckColor(c,homeState.members,people))}"></span>`).join('')}</div><small>${items.length} ${items.length===1?'Card':'Cards'} · ${people.length} ${people.length===1?'Stimme':'Stimmen'}</small></div>`,{motion:'focus',showBack:true});
  const launchStack=launch.querySelector('.mc-launch-stack');requestAnimationFrame(()=>launchStack?.classList.add('alive','breathing'));
  ctx.back.onclick=()=>ctx.close();
  await new Promise(r=>setTimeout(r,2350));
  const showSpread=async()=>{
    const arranged=shuffled(items,`${key}:${Math.random()}`);
    const p=await swap(ctx,`<div class="mc-deck-stage-head"><div class="mc-stage-head-surface"><small>MEMORY MOMENT</small><h2>${cluster?fmt(cluster.started_at||cluster.created_at)||'Eure Karten':'Eure Karten'}</h2><span>${items.length} ${items.length===1?'Erinnerung':'Erinnerungen'} · ${people.length} ${people.length===1?'Stimme':'Stimmen'}</span></div></div><div class="mc-stage-decor" aria-hidden="true"><i>✦</i><i>✈</i><i>⌖</i><i>♡</i><i>↝</i></div><div class="mc-spread" data-count="${items.length}">${arranged.map((c,i)=>renderLooseCard(c,homeState.members,i,'deck')).join('')}</div>${cluster?'<button class="mc-continue" data-continue>Moment weiter ergänzen</button>':''}`,{motion:'scatter',showBack:true});
    await paintLoosePhotos(p,arranged,media);positionSpread(p.querySelector('.mc-spread'),arranged,true);
    for(const card of p.querySelectorAll('[data-loose-card]'))card.onclick=e=>{if(e.target.closest('button'))return;openCardDetail(ctx,items.find(x=>String(x.id)===String(card.dataset.looseCard)),homeState.members,media,showSpread)};
    p.querySelectorAll('[data-weight][data-own="1"]').forEach(b=>b.onclick=async e=>{e.stopPropagation();const c=items.find(x=>String(x.id)===String(b.dataset.weight));const next=Number(c.weight)>=3?1:Number(c.weight)+1;await window.LuviaMemoryCards.setWeight(c.id,next);c.weight=next;b.textContent=weightLabel(next);b.closest('.mc-loose-card')?.classList.remove('w1','w2','w3');b.closest('.mc-loose-card')?.classList.add(`w${next}`)});
    if(cluster)p.querySelector('[data-continue]').onclick=()=>{ctx.close();setTimeout(()=>openDiscovery(cluster,media,homeState.members,0),460)};
    ctx.back.onclick=()=>closeSpread();
  };
  const closeSpread=async()=>{
    const spread=ctx.flow.querySelector('.mc-spread');if(spread){spread.classList.add('is-gathering');await new Promise(r=>setTimeout(r,900))}
    ctx.close();
  };
  await showSpread();
}
function positionSpread(root,items,reroll=false){
  if(!root)return;const cards=[...root.querySelectorAll('.mc-loose-card')],mobile=matchMedia('(max-width:800px)').matches,rnd=()=>Math.random();
  if(mobile){cards.forEach((el,i)=>{const side=i%3===0?-1:i%3===1?1:0;const x=side*(5+rnd()*12),y=(rnd()-.5)*8;el.style.setProperty('--spread-x',`${x.toFixed(1)}px`);el.style.setProperty('--spread-y',`${y.toFixed(1)}px`);el.style.setProperty('--spread-r',`${((rnd()-.5)*1.8).toFixed(2)}deg`);el.style.zIndex=String(20+i)});return}
  const count=cards.length;
  const templates=count<=4?[[32,30],[68,30],[35,70],[65,70]]:count<=6?[[22,28],[50,25],[78,28],[28,70],[58,69],[82,70]]:count<=9?[[20,22],[50,20],[80,23],[23,51],[51,50],[78,51],[20,79],[50,78],[80,78]]:[[15,23],[38,20],[62,21],[85,24],[18,52],[40,50],[63,51],[84,52],[17,80],[39,79],[62,79],[84,78]];
  const order=shuffled(templates,`${Date.now()}:${Math.random()}`);
  cards.forEach((el,i)=>{const p=order[i%order.length],jx=(rnd()-.5)*4.5,jy=(rnd()-.5)*4.5;el.style.setProperty('--spread-left',`${Math.max(12,Math.min(88,p[0]+jx))}%`);el.style.setProperty('--spread-top',`${Math.max(17,Math.min(83,p[1]+jy))}%`);el.style.setProperty('--spread-r',`${((rnd()-.5)*3.2).toFixed(2)}deg`);el.style.zIndex=String(20+i)})
}
async function openCardDetail(ctx,card,members,media,onBack){
  const group=homeState?.grouped?[...homeState.grouped.values()].find(list=>list.some(x=>String(x.id)===String(card.id))):null;
  const cardPeople=group?deckPeople(group):[];
  const focusAccent=deckColor(card,members,cardPeople);
  const p=await swap(ctx,`<div class="mc-card-focus-wrap" style="--focus-accent:${esc(focusAccent)}"><div class="mc-card-focus-scene"><div class="mc-focus-aura" aria-hidden="true"><i></i><i></i><i></i></div>${renderLooseCard(card,members,0,'focus')}</div><div class="mc-card-focus-note"><small>${typeName(card.card_type).toUpperCase()}</small><h2>${card.card_type==='photo'?'Ein Blick, der geblieben ist':card.content?esc(card.content):card.reaction?esc(card.reaction):'Kleine Erinnerung'}</h2><p>${esc(whoName(card,members))}${Number(card.weight)>=3?' · Herzstück':Number(card.weight)===2?' · im Fokus':''}</p><span>Klick oder tippe auf die freie Fläche, um die Karten neu auszubreiten.</span></div></div>`,{motion:'focus',showBack:true});
  await paintLoosePhotos(p,[card],media);const detail=p.querySelector('.mc-loose-card');detail.classList.add('is-focus');
  const back=async()=>{ctx.back.onclick=null;await onBack()};ctx.back.onclick=back;
  p.onclick=e=>{if(e.target.closest('.mc-loose-card,.mc-card-focus-note,button'))return;back()};
}
async function mount(node){host=node;await renderHome();stopCards=await window.LuviaMemoryCards.subscribe(()=>setTimeout(renderHome,350));stopIdentities=await window.LuviaMemoryCards.subscribeIdentities?.(()=>{window.LuviaMemoryCards.members().then(m=>{if(!homeState)return;homeState.members=m;renderHome()})});return()=>{stopCards?.();stopIdentities?.();stopCards=null;stopIdentities=null;host=null}}
window.LuviaAlbumsView=Object.freeze({version:VERSION,build:BUILD,mount,render:renderHome,experience:'memory-deck-visual-cohesion-focus-polish',model:'cards -> decks -> moments -> journeys -> studio'});
})();
