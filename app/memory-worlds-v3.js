(() => {
'use strict';
const VERSION='4.36.11',BUILD='13.36.11';
let host=null,stopCards=null,stopIdentities=null,stopTrip=null,stopTheme=null,urlCache=new Map(),homeState=null;
const deckSessionSeed=Math.random().toString(36).slice(2);
const validColor=v=>/^#[0-9a-f]{6}$/i.test(String(v||'').trim())?String(v).trim().toLowerCase():null;
const tripRecord=()=>{
  const store=window.LuviaTripStore?.snapshot?.()||{},canonical=store.activeTrip||null;
  if(canonical)return canonical;
  return window.LuviaTripContext?.getActiveTrip?.()||window.LuviaTripContext?.getSnapshot?.()?.activeTrip||{};
};
const inheritedAccent=()=>{const nodes=[document.documentElement,document.body,document.querySelector('.lv-dashboard'),document.querySelector('.lv-shell'),document.querySelector('#app'),host].filter(Boolean),props=['--trip-accent','--lv-accent','--module-accent'];for(const node of nodes){const css=getComputedStyle(node);for(const prop of props){const hit=validColor(css.getPropertyValue(prop));if(hit)return hit}}return null};
const tripAccent=()=>{
  // Canonical visual source: exactly the active trip accent already applied by LuviaTheme/dashboard.
  const themed=validColor(getComputedStyle(document.documentElement).getPropertyValue('--trip-accent'));if(themed)return themed;
  const t=tripRecord(),storeTrip=window.LuviaTripStore?.snapshot?.()?.activeTrip||{},contextTrip=window.LuviaTripContext?.getSnapshot?.()?.trip||window.LuviaTripContext?.getActiveTrip?.()||{};
  const canonical=[storeTrip.accent,contextTrip.accent,t.accent,storeTrip.accent_color,contextTrip.accent_color,t.accent_color,storeTrip.color,contextTrip.color,t.color].map(validColor).find(Boolean);
  if(canonical)return canonical;
  const coreAccent=validColor(window.LuviaMemoryCards?.tripAccent?.());if(coreAccent)return coreAccent;
  return inheritedAccent()||'#ee6f83';
};
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
const focusTitle=(card,name)=>({photo:`Ein Lieblingsblick von ${name}`,quote:`Ein Gedanke von ${name}`,vibe:`So fühlte sich der Moment für ${name} an`,reaction:`Eine spontane Reaktion von ${name}`,place:`Ein Ort, der ${name} geblieben ist`,food:`Ein Genussmoment von ${name}`,weather:`So war die Atmosphäre für ${name}`,inside_joke:`Ein Insider von ${name}`}[card?.card_type]||`Eine Erinnerung von ${name}`);
const focusMeaning=card=>({photo:'Ein Foto, das diesen Moment aus einer persönlichen Perspektive festhält.',quote:'Ein Satz, der bewahrt, was auf den Fotos allein nicht zu sehen ist.',vibe:'Die Stimmung dieses Moments – festgehalten ohne lange Erklärung.',reaction:'Die spontane Reaktion, die genau zu diesem Augenblick gehört.',place:'Der Ort als Teil der Erinnerung – nicht nur als Adresse.',food:'Ein Geschmack oder Genussmoment, der zur Reisegeschichte gehört.',weather:'Die Atmosphäre, die diesen Moment geprägt hat.',inside_joke:'Ein kleines gemeinsames Detail, das nur für euch seine ganze Bedeutung hat.'}[card?.card_type]||'Ein Baustein eures gemeinsamen Memory Moments.');
const memberColor=(id,members)=>{const m=members.find(x=>String(x.id)===String(id))||{};return [m.avatarColor,m.avatar_color,m.profileColor,m.profile_color,m.accent,m.color].map(validColor).find(Boolean)||null};
const contributorPalette=(people,members)=>[...new Set(people.map(id=>memberColor(id,members)).filter(Boolean))];
function resolveMemoryVisualPalette(items,members){
  const people=deckPeople(items),trip=tripAccent();
  if(people.length<=1)return Object.freeze({mode:'single',people,trip,contributors:[],primary:trip,secondary:trip,stackLayers:[trip,trip,trip,trip,trip,trip]});
  const contributors=contributorPalette(people,members);
  const usable=contributors.length?contributors:[trip];
  return Object.freeze({mode:'multi',people,trip,contributors,primary:usable[0],secondary:usable[1]||usable[0],stackLayers:Array.from({length:6},(_,i)=>usable[i%usable.length])});
}
const deckColor=(card,members,people,items)=>{const visual=resolveMemoryVisualPalette(items?.length?items:(homeState?.grouped?[...homeState.grouped.values()].find(list=>list.some(x=>String(x.id)===String(card?.id)))||[]:[]),members);if(visual.mode==='single')return visual.trip;return memberColor(card?.author_id,members)||visual.stackLayers[0]};
const stagePalette=(items,members)=>{const visual=resolveMemoryVisualPalette(items,members);return[visual.primary,visual.secondary]};
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
  const visual=resolveMemoryVisualPalette(items,members),people=visual.people,photos=items.filter(x=>x.card_type==='photo'&&x.media_id);
  const hero=(photos.length?photos[Math.floor(Math.random()*photos.length)]:items[Math.floor(Math.random()*items.length)])||items[0];
  const rot=((Math.random()-.5)*2.0).toFixed(2),lift=Math.round((Math.random()-.5)*8);
  const rest=shuffled(items.filter(x=>String(x.id)!==String(hero.id)),`${deckSessionSeed}:${key}:${index}`);
  const visible=Math.min(6,Math.max(3,items.length));
  const layers=Array.from({length:visible},(_,i)=>{
    const c=rest[i%Math.max(1,rest.length)]||hero; const color=visual.stackLayers[i%visual.stackLayers.length];
    return `<span class="mc-deck-layer layer-${i+1}" style="--layer-color:${esc(color)};--layer-i:${i}"></span>`;
  }).join('');
  const voices=people.map(id=>`<span class="mc-voice-dot" style="--voice:${esc(visual.mode==='single'?visual.trip:(memberColor(id,members)||visual.primary))}" title="${esc(members.find(x=>String(x.id)===id)?.displayName||'Reisender')}">${esc(memberInitial(id,members))}</span>`).join('');
  const accent=visual.mode==='single'?visual.trip:(memberColor(hero.author_id,members)||visual.primary);
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
  const group=homeState?.grouped?[...homeState.grouped.values()].find(list=>list.some(x=>String(x.id)===String(c.id)))||[]:[];const visual=resolveMemoryVisualPalette(group.length?group:[c],members);const accent=memberColor(c.author_id,members)||(visual.mode==='multi'?visual.primary:visual.trip),name=whoName(c,members),label=typeName(c.card_type);
  const content=c.content?`<p>${esc(c.content)}</p>`:'';
  const reaction=c.reaction?`<strong>${esc(c.reaction)}</strong>`:'';
  const textLength=String(c.content||c.reaction||'').trim().length,textClass=textLength>100?'text-long':textLength>48?'text-medium':'text-short';
  return `<article class="mc-loose-card tone-${cardTone(c.card_type)} w${c.weight} ${textClass}" data-loose-card="${esc(c.id)}" style="--card-rot:${rot}deg;--card-x:${x}px;--card-y:${y}px;--card-i:${i};--person-color:${esc(accent)}"><div class="mc-card-ribbon"></div><div class="mc-loose-media" data-mid="${esc(c.media_id||'')}">${c.media_id?'':`<span class="mc-card-symbol">${typeIcon(c.card_type)}</span><em>${esc(label)}</em>`}</div><div class="mc-loose-copy"><div class="mc-card-author"><span style="--avatar:${esc(accent)}">${esc(memberInitial(c.author_id,members))}</span><small>${esc(name)}</small></div>${content}${reaction}<div class="mc-card-foot"><i>${esc(label)}</i><button class="mc-weight" data-weight="${esc(c.id)}" data-own="${String(c.author_id)===uid?'1':'0'}">${weightLabel(c.weight)}</button></div>${mode==='deck'?`<div class="mc-album-review" aria-label="Auswahl fürs zukünftige Memory Album"><button type="button" data-album-review="excluded" data-card-id="${esc(c.id)}" title="Nicht ins Album"><b>←</b><span>Nicht ins Album</span></button><button type="button" data-album-review="included" data-card-id="${esc(c.id)}" title="Für Album behalten"><span>Für Album</span><b>→</b></button></div>`:''}</div></article>`
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
  const visual=resolveMemoryVisualPalette(items,homeState.members),people=visual.people,previewItems=shuffled(items,`${key}:launch`).slice(0,Math.min(6,items.length));
  const [stageA,stageB]=stagePalette(items,homeState.members);ctx.root.style.setProperty('--mc-stage-a',stageA);ctx.root.style.setProperty('--mc-stage-b',stageB);ctx.root.style.setProperty('--mc-stage-trip',tripAccent());
  const launch=await swap(ctx,`<div class="mc-deck-launch"><div class="mc-launch-stack">${previewItems.map((c,i)=>`<span style="--launch-i:${i};--launch-color:${esc(visual.stackLayers[i%visual.stackLayers.length])}"></span>`).join('')}</div><small>${items.length} ${items.length===1?'Card':'Cards'} · ${people.length} ${people.length===1?'Stimme':'Stimmen'}</small></div>`,{motion:'focus',showBack:true});
  const launchStack=launch.querySelector('.mc-launch-stack');requestAnimationFrame(()=>launchStack?.classList.add('alive','breathing'));
  ctx.back.onclick=()=>ctx.close();
  await new Promise(r=>setTimeout(r,2350));
  const showSpread=async()=>{
    const arranged=shuffled(items,`${key}:${Math.random()}`);
    const mobile=matchMedia('(max-width:800px)').matches;
    const cardsMarkup=mobile?`<div class="mc-mobile-throw" data-throw-deck><div class="mc-throw-stack">${arranged.map((c,i)=>`<section class="mc-throw-card" data-throw-card="${i}" style="--throw-order:${i}">${renderLooseCard(c,homeState.members,i,'deck')}</section>`).join('')}<div class="mc-swipe-feedback mc-swipe-feedback-left" data-swipe-feedback="excluded"><b>←</b><strong>Nicht ins Album</strong><small>Die Erinnerung bleibt erhalten.</small></div><div class="mc-swipe-feedback mc-swipe-feedback-right" data-swipe-feedback="included"><strong>Für Album behalten</strong><b>→</b><small>Für euer späteres Memory Album vorgemerkt.</small></div></div><div class="mc-throw-meta"><span><b data-throw-index>1</b> von ${arranged.length}</span><em>Wische links oder rechts und entscheide fürs Album.</em></div><div class="mc-review-complete" data-review-complete hidden><small>REVIEW ABGESCHLOSSEN</small><h3>Alle Karten geprüft.</h3><p><b data-review-included-count>0</b> fürs Album behalten · <b data-review-excluded-count>0</b> nicht ausgewählt</p><div><button type="button" data-review-again>Auswahl erneut prüfen</button><button type="button" class="is-primary" data-review-close>Zurück zu Erinnerungen</button></div></div></div>`:`<div class="mc-spread" data-count="${items.length}">${arranged.map((c,i)=>renderLooseCard(c,homeState.members,i,'deck')).join('')}</div>`;
    const p=await swap(ctx,`<div class="mc-deck-stage-head"><div class="mc-stage-head-surface"><small>MEMORY MOMENT</small><h2>${cluster?fmt(cluster.started_at||cluster.created_at)||'Eure Karten':'Eure Karten'}</h2><span>${items.length} ${items.length===1?'Erinnerung':'Erinnerungen'} · ${people.length} ${people.length===1?'Stimme':'Stimmen'}</span></div></div><div class="mc-stage-atmosphere" aria-hidden="true"><span class="mc-route mc-route-a"></span><span class="mc-route mc-route-b"></span><span class="mc-route mc-route-c"></span><span class="mc-postmark">LUVIA · MOMENT</span><span class="mc-travel-sketch mc-sketch-ticket">BON VOYAGE</span><span class="mc-travel-sketch mc-sketch-photo">MEMORY</span><span class="mc-travel-sketch mc-sketch-pin">⌖</span><span class="mc-travel-sketch mc-sketch-heart">♡</span><span class="mc-travel-sketch mc-sketch-plane">✈︎</span></div><div class="mc-stage-decor" aria-hidden="true"><i>✦</i><i>✈</i><i>⌖</i><i>♡</i><i>↝</i><i>⌾</i><i>⌁</i><i>✦</i><i>△</i><i>· · ·</i></div>${cardsMarkup}${cluster?'<button class="mc-continue" data-continue>Moment weiter ergänzen</button>':''}`,{motion:'scatter',showBack:true});
    await paintLoosePhotos(p,arranged,media);
    let reviews={};try{reviews=await window.LuviaMemoryCards.albumReviews?.(arranged.map(c=>c.id))||{};p.querySelectorAll('[data-album-review]').forEach(b=>b.classList.toggle('is-selected',reviews[String(b.dataset.cardId)]===b.dataset.albumReview));}catch(error){console.warn('[MemoryReview] Bestehende Auswahl konnte nicht geladen werden.',error)}
    if(!mobile)positionSpread(p.querySelector('.mc-spread'),arranged,true);
    else bindThrowDeck(p.querySelector('[data-throw-deck]'),arranged,reviews,()=>closeSpread());
    for(const card of p.querySelectorAll('[data-loose-card]'))card.onclick=e=>{if(e.target.closest('button')||card.closest('.mc-throw-card')?.dataset.dragged==='1')return;openCardDetail(ctx,items.find(x=>String(x.id)===String(card.dataset.looseCard)),homeState.members,media,showSpread)};
    p.querySelectorAll('[data-weight][data-own="1"]').forEach(b=>b.onclick=async e=>{e.stopPropagation();const c=items.find(x=>String(x.id)===String(b.dataset.weight));const next=Number(c.weight)>=3?1:Number(c.weight)+1;await window.LuviaMemoryCards.setWeight(c.id,next);c.weight=next;b.textContent=weightLabel(next);b.closest('.mc-loose-card')?.classList.remove('w1','w2','w3');b.closest('.mc-loose-card')?.classList.add(`w${next}`)});
    p.querySelectorAll('[data-album-review]').forEach(b=>b.onclick=async e=>{e.stopPropagation();b.disabled=true;try{await window.LuviaMemoryCards.setAlbumReview(b.dataset.cardId,b.dataset.albumReview);reviews[String(b.dataset.cardId)]=b.dataset.albumReview;const row=b.closest('.mc-album-review'),card=b.closest('.mc-loose-card');row?.querySelectorAll('button').forEach(x=>x.classList.toggle('is-selected',x===b));card?.classList.toggle('is-album-included',b.dataset.albumReview==='included');card?.classList.toggle('is-album-excluded',b.dataset.albumReview==='excluded');}catch(error){console.warn('[MemoryReview]',error)}finally{b.disabled=false}});
    if(cluster)p.querySelector('[data-continue]').onclick=()=>{ctx.close();setTimeout(()=>openDiscovery(cluster,media,homeState.members,0),460)};
    ctx.back.onclick=()=>closeSpread();
  };
  const closeSpread=async()=>{
    const spread=ctx.flow.querySelector('.mc-spread');if(spread){spread.classList.add('is-gathering');await new Promise(r=>setTimeout(r,900))}
    ctx.close();
  };
  await showSpread();
}
function bindThrowDeck(root,items,initialReviews={},onClose){
  const total=items.length;
  if(!root)return;
  const stack=root.querySelector('.mc-throw-stack'),indexEl=root.querySelector('[data-throw-index]'),complete=root.querySelector('[data-review-complete]'),includedEl=root.querySelector('[data-review-included-count]'),excludedEl=root.querySelector('[data-review-excluded-count]');
  if(!stack)return;
  const cards=[...stack.querySelectorAll('.mc-throw-card')],feedbackLeft=stack.querySelector('[data-swipe-feedback="excluded"]'),feedbackRight=stack.querySelector('[data-swipe-feedback="included"]');let cursor=0,active=null,startX=0,startY=0,lastX=0,lastT=0,velocity=0,reviews={...initialReviews};
  const depthPreset=[
    {x:0,y:0,r:0,scale:1,opacity:1},
    {x:-13,y:21,r:-2.6,scale:.981,opacity:.93},
    {x:15,y:40,r:2.9,scale:.961,opacity:.84},
    {x:-9,y:58,r:-3.3,scale:.941,opacity:.74}
  ];
  const feedback=(x=0,threshold=120)=>{const amount=Math.min(1,Math.abs(x)/Math.max(1,threshold));if(feedbackLeft){feedbackLeft.style.setProperty('--swipe-feedback',x<0?String(amount):'0');feedbackLeft.classList.toggle('is-armed',x<0&&amount>.72)}if(feedbackRight){feedbackRight.style.setProperty('--swipe-feedback',x>0?String(amount):'0');feedbackRight.classList.toggle('is-armed',x>0&&amount>.72)}};
  const updateComplete=()=>{const values=items.map(x=>reviews[String(x.id)]),inc=values.filter(x=>x==='included').length,exc=values.filter(x=>x==='excluded').length;if(includedEl)includedEl.textContent=String(inc);if(excludedEl)excludedEl.textContent=String(exc)};
  const refresh=()=>{cards.forEach((card,i)=>{const rel=i-cursor,depth=Math.max(0,rel),preset=depthPreset[Math.min(depth,depthPreset.length-1)];card.hidden=rel<0||rel>3;card.style.setProperty('--throw-depth',String(depth));card.style.setProperty('--stack-x',`${preset.x}px`);card.style.setProperty('--stack-y',`${preset.y}px`);card.style.setProperty('--stack-r',`${preset.r}deg`);card.style.setProperty('--stack-scale',String(preset.scale));card.style.setProperty('--stack-opacity',String(preset.opacity));card.classList.toggle('is-front',rel===0)});if(indexEl)indexEl.textContent=String(Math.min(cursor+1,total));const done=cursor>=total;root.classList.toggle('is-complete',done);if(complete)complete.hidden=!done;updateComplete();feedback(0)};
  const settle=card=>{card.classList.add('is-settling');card.style.setProperty('--drag-x','0px');card.style.setProperty('--drag-y','0px');card.style.setProperty('--drag-r','0deg');feedback(0);setTimeout(()=>{card.classList.remove('is-settling');card.style.removeProperty('--drag-x');card.style.removeProperty('--drag-y');card.style.removeProperty('--drag-r')},300)};
  const throwAway=(card,dir,y)=>{const cardId=items[cursor]?.id||card.querySelector('[data-loose-card]')?.dataset.looseCard,decision=dir>0?'included':'excluded';if(cardId){reviews[String(cardId)]=decision;window.LuviaMemoryCards?.setAlbumReview?.(cardId,decision).catch(error=>console.warn('[MemoryReview]',error))}const target=dir>0?feedbackRight:feedbackLeft;target?.classList.add('is-committed');const distance=Math.max(innerWidth*1.32,680)*dir;card.dataset.dragged='1';card.classList.add('is-thrown');card.style.setProperty('--drag-x',`${distance}px`);card.style.setProperty('--drag-y',`${Math.max(-150,Math.min(150,y*.50))}px`);card.style.setProperty('--drag-r',`${dir*22}deg`);setTimeout(()=>{cursor++;refresh();card.hidden=true;card.classList.remove('is-thrown');card.style.removeProperty('--drag-x');card.style.removeProperty('--drag-y');card.style.removeProperty('--drag-r');target?.classList.remove('is-committed');setTimeout(()=>{card.dataset.dragged='0'},90)},360)};
  stack.addEventListener('pointerdown',e=>{const card=e.target.closest('.mc-throw-card.is-front');if(!card||e.target.closest('button'))return;active=card;startX=lastX=e.clientX;startY=e.clientY;lastT=performance.now();velocity=0;card.dataset.dragged='0';card.classList.add('is-dragging');card.setPointerCapture?.(e.pointerId)});
  stack.addEventListener('pointermove',e=>{if(!active)return;const x=e.clientX-startX,y=e.clientY-startY,now=performance.now(),dt=Math.max(8,now-lastT),threshold=Math.min(125,stack.clientWidth*.27);velocity=(e.clientX-lastX)/dt;lastX=e.clientX;lastT=now;if(Math.abs(x)>7)active.dataset.dragged='1';active.style.setProperty('--drag-x',`${x}px`);active.style.setProperty('--drag-y',`${y*.22}px`);active.style.setProperty('--drag-r',`${Math.max(-14,Math.min(14,x*.04))}deg`);feedback(x,threshold);e.preventDefault()});
  const release=e=>{if(!active)return;const card=active,x=e.clientX-startX,y=e.clientY-startY,threshold=Math.min(125,stack.clientWidth*.27),shouldThrow=Math.abs(x)>=threshold||Math.abs(velocity)>.68;card.classList.remove('is-dragging');active=null;if(shouldThrow)throwAway(card,(x||velocity)>=0?1:-1,y);else{settle(card);setTimeout(()=>{card.dataset.dragged='0'},320)}};
  stack.addEventListener('pointerup',release);stack.addEventListener('pointercancel',release);
  root.querySelector('[data-review-again]')?.addEventListener('click',()=>{cursor=0;cards.forEach(c=>{c.hidden=false;c.dataset.dragged='0'});refresh()});
  root.querySelector('[data-review-close]')?.addEventListener('click',()=>onClose?.());
  refresh();
}
function positionSpread(root,items,reroll=false){
  if(!root||matchMedia('(max-width:800px)').matches)return;
  const cards=[...root.querySelectorAll('.mc-loose-card')];if(!cards.length)return;
  const rnd=Math.random,count=cards.length,box=root.getBoundingClientRect();
  const compact=box.width<1450||box.height<650,maxWidth=compact?220:252;
  const dynamicWidth=Math.round(Math.max(170,Math.min(maxWidth,Math.sqrt(Math.max(1,box.width*box.height/count))*.46)));
  root.style.setProperty('--mc-card-width',`${dynamicWidth}px`);
  const cw=dynamicWidth,ch=dynamicWidth*1.4,cx=box.width/2,cy=box.height/2;
  const edgeX=Math.max(cw*.58,32),edgeY=Math.max(ch*.52,28);
  const rx=Math.max(cw*.95,Math.min(box.width*.39,box.width/2-edgeX));
  const ry=Math.max(ch*.62,Math.min(box.height*.34,box.height/2-edgeY));
  root.style.setProperty('--mc-radius-x',`${Math.round(rx)}px`);root.style.setProperty('--mc-radius-y',`${Math.round(ry)}px`);
  const startAngle=rnd()*Math.PI*2,placed=[];
  const overlapRatio=(a,b)=>{const dx=Math.abs(a.x-b.x),dy=Math.abs(a.y-b.y),ox=Math.max(0,cw-dx),oy=Math.max(0,ch-dy);return(ox*oy)/(cw*ch)};
  for(let i=0;i<count;i++){
    const base=startAngle+(Math.PI*2*i/count),ring=i%3===0?.48:.72+rnd()*.20;let best=null,bestScore=-1e9;
    for(let n=0;n<80;n++){
      const angle=base+(rnd()-.5)*Math.min(.46,Math.PI/count*.72),radius=Math.max(.34,Math.min(.96,ring+(rnd()-.5)*.22));
      const c={x:cx+Math.cos(angle)*rx*radius,y:cy+Math.sin(angle)*ry*radius};
      const overlaps=placed.map(p=>overlapRatio(c,p)),worst=overlaps.length?Math.max(...overlaps):0;
      const minDist=placed.length?Math.min(...placed.map(p=>Math.hypot(c.x-p.x,c.y-p.y))):cw*2;
      const targetMin=cw*.72,tooClose=Math.max(0,targetMin-minDist)/targetMin;
      const score=4-worst*34-tooClose*8-Math.abs(radius-.72)*.35+rnd()*.22;
      if(score>bestScore){best=c;bestScore=score}
    }
    placed.push(best||{x:cx,y:cy});
  }
  cards.forEach((el,i)=>{const p=placed[i];el.style.setProperty('--spread-left',`${(p.x/box.width*100).toFixed(2)}%`);el.style.setProperty('--spread-top',`${(p.y/box.height*100).toFixed(2)}%`);el.style.setProperty('--spread-r',`${((rnd()-.5)*7).toFixed(2)}deg`);el.style.zIndex=String(20+i)});
}

async function openCardDetail(ctx,card,members,media,onBack){
  const entry=homeState?.grouped?[...homeState.grouped.entries()].find(([,list])=>list.some(x=>String(x.id)===String(card.id))):null;
  const key=entry?.[0]||'',group=entry?.[1]||[card],visual=resolveMemoryVisualPalette(group,members),focusAccent=visual.mode==='single'?visual.trip:(memberColor(card.author_id,members)||visual.primary);
  const name=whoName(card,members),cluster=clusterForKey(key,homeState?.clusters||[]),dateLabel=cluster?(fmt(cluster.started_at||cluster.created_at)||'diesem Reisetag'):'diesem Moment',cardIndex=Math.max(0,group.findIndex(x=>String(x.id)===String(card.id)))+1;
  const p=await swap(ctx,`<div class="mc-card-focus-wrap" style="--focus-accent:${esc(focusAccent)}"><div class="mc-card-focus-scene"><div class="mc-focus-aura" aria-hidden="true"><i></i><i></i><i></i></div>${renderLooseCard(card,members,0,'focus')}</div><aside class="mc-card-focus-note"><small>${typeName(card.card_type).toUpperCase()} · IM FOKUS</small><h2>${esc(focusTitle(card,name))}</h2><p class="mc-focus-context">Aus eurem Memory Moment vom ${esc(dateLabel)} · Karte ${cardIndex} von ${group.length}</p><p class="mc-focus-meaning">${esc(focusMeaning(card))}</p><span>Tippe oder klicke auf die freie Fläche, um diese Karte zurück in den Stapel zu legen.</span></aside></div>`,{motion:'focus',showBack:true});
  await paintLoosePhotos(p,[card],media);const detail=p.querySelector('.mc-loose-card');detail.classList.add('is-focus');
  const back=async()=>{ctx.back.onclick=null;await onBack()};ctx.back.onclick=back;
  p.onclick=e=>{if(e.target.closest('.mc-loose-card,.mc-card-focus-note,button'))return;back()};
}

async function mount(node){host=node;await renderHome();stopCards=await window.LuviaMemoryCards.subscribe(()=>setTimeout(renderHome,350));stopIdentities=await window.LuviaMemoryCards.subscribeIdentities?.(()=>{window.LuviaMemoryCards.members().then(m=>{if(!homeState)return;homeState.members=m;renderHome()})});stopTrip=window.LuviaTripStore?.subscribe?.(()=>{if(host)setTimeout(renderHome,80)});const onTheme=()=>{if(host)setTimeout(renderHome,60)};window.addEventListener('luvia:theme-changed',onTheme);stopTheme=()=>window.removeEventListener('luvia:theme-changed',onTheme);return()=>{stopCards?.();stopIdentities?.();stopTrip?.();stopTheme?.();stopCards=null;stopIdentities=null;stopTrip=null;stopTheme=null;host=null}}
window.LuviaAlbumsView=Object.freeze({version:VERSION,build:BUILD,mount,render:renderHome,experience:'memory-review-feedback-radial-deck-composition',model:'cards -> decks -> moments -> journeys -> studio'});
})();
