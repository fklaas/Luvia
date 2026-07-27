(() => {
  'use strict';

  const SYMBOLS=['❤️','✈️','🌍','🏖️','🏔️','🏙️','🚗','🚆','⛺','✨','🌅','🎡'];
  const COLORS=['#ee6f83','#e76f91','#f29f67','#e2b95f','#67a98f','#4f9aa8','#6688c7','#8c73bd','#b56f9e','#6e7f91'];
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const code=()=>Array.from({length:6},()=> 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random()*32)]).join('');
  const uuid=()=>crypto.randomUUID?.()||`luvia-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
  let layer=null;

  function styles(){
    if(document.getElementById('luviaTripCreatorStyles'))return;
    const style=document.createElement('style');
    style.id='luviaTripCreatorStyles';
    style.textContent=`
      .ltc{position:fixed;inset:0;z-index:1000080;background:linear-gradient(145deg,#fff8f6 0%,#f0faf8 56%,#f5f1fb 100%);font-family:Inter,system-ui,sans-serif;color:#2e4357;overflow:auto}
      .ltc *{box-sizing:border-box}.ltc-shell{width:min(920px,100%);min-height:100dvh;margin:auto;padding:24px;display:grid;align-content:center}
      .ltc-card{background:rgba(255,255,255,.94);border:1px solid rgba(72,91,110,.1);border-radius:32px;box-shadow:0 30px 90px rgba(44,63,78,.16);overflow:hidden}
      .ltc-top{display:flex;align-items:center;gap:14px;padding:24px 28px;border-bottom:1px solid #edf0f2}.ltc-logo{width:44px;height:44px;background:url('luvia-logo.svg') center/contain no-repeat;flex:0 0 auto}
      .ltc-top h2{margin:0;font:800 30px/1.05 'Playfair Display',Georgia,serif}.ltc-top p{margin:5px 0 0;color:#7b8994}.ltc-close{margin-left:auto;width:42px;height:42px;border:0;border-radius:50%;background:#f2f5f6;color:#526676;font-size:24px;cursor:pointer}
      .ltc-progress{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:18px 28px 0}.ltc-progress i{height:5px;border-radius:99px;background:#e8edef;transition:.25s}.ltc-progress i.on{background:var(--ltc-accent,#ee6f83)}
      .ltc-body{padding:28px}.ltc-step{display:none;animation:ltcIn .25s ease}.ltc-step.on{display:block}@keyframes ltcIn{from{opacity:0;transform:translateY(8px)}}
      .ltc-kicker{display:block;color:var(--ltc-accent,#ee6f83);font-weight:900;font-size:12px;letter-spacing:.12em;text-transform:uppercase}.ltc-step h3{margin:8px 0 8px;font:800 35px/1.08 'Playfair Display',Georgia,serif}.ltc-copy{margin:0 0 24px;color:#758592;line-height:1.55}
      .ltc-field{display:grid;gap:8px;margin-bottom:17px}.ltc-field label{font-weight:800;font-size:14px}.ltc-field input{width:100%;min-height:54px;padding:0 16px;border:1px solid #dbe3e7;border-radius:16px;background:#fff;font:600 16px Inter,system-ui;color:#30495e;outline:none}.ltc-field input:focus{border-color:var(--ltc-accent,#ee6f83);box-shadow:0 0 0 4px color-mix(in srgb,var(--ltc-accent,#ee6f83) 13%,transparent)}
      .ltc-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.ltc-symbols{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}.ltc-symbol{aspect-ratio:1;border:1px solid #e0e6e8;border-radius:17px;background:#fff;font-size:25px;cursor:pointer}.ltc-symbol.on{border-color:var(--ltc-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--ltc-accent) 18%,transparent);transform:translateY(-1px)}
      .ltc-colors{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}.ltc-color{height:46px;border:4px solid #fff;border-radius:15px;background:var(--swatch);box-shadow:0 0 0 1px #dfe5e7;cursor:pointer}.ltc-color.on{box-shadow:0 0 0 3px var(--swatch)}
      .ltc-preview{margin-top:22px;padding:24px;border-radius:24px;background:linear-gradient(135deg,color-mix(in srgb,var(--ltc-accent) 20%,white),#fff);border:1px solid color-mix(in srgb,var(--ltc-accent) 20%,#e3e8ea)}.ltc-preview span{font-size:34px}.ltc-preview h4{margin:10px 0 4px;font:800 27px/1.1 'Playfair Display',Georgia,serif}.ltc-preview p{margin:0;color:#6f7f8b}
      .ltc-summary{display:grid;grid-template-columns:120px 1fr;gap:22px;align-items:center;padding:22px;border:1px solid #e3e9eb;border-radius:24px}.ltc-summary-icon{display:grid;place-items:center;aspect-ratio:1;border-radius:28px;background:linear-gradient(135deg,color-mix(in srgb,var(--ltc-accent) 28%,white),#fff);font-size:48px}.ltc-summary h4{margin:0 0 7px;font:800 29px/1.1 'Playfair Display',Georgia,serif}.ltc-summary p{margin:4px 0;color:#71818e}
      .ltc-actions{display:flex;align-items:center;gap:12px;padding:20px 28px 26px}.ltc-btn{min-height:48px;padding:0 20px;border:0;border-radius:15px;font-weight:900;cursor:pointer}.ltc-back{background:#f1f4f5;color:#536979}.ltc-next{margin-left:auto;background:linear-gradient(100deg,var(--ltc-accent),color-mix(in srgb,var(--ltc-accent) 68%,#f5b36d));color:#fff;box-shadow:0 10px 28px color-mix(in srgb,var(--ltc-accent) 25%,transparent)}.ltc-btn:disabled{opacity:.55;cursor:wait}.ltc-error{display:none;margin:0 28px 18px;padding:12px 15px;border-radius:14px;background:#fff1f2;color:#a33b4c;font-weight:700}.ltc-error.on{display:block}
      @media(max-width:650px){.ltc-shell{padding:0;align-content:stretch}.ltc-card{min-height:100dvh;border:0;border-radius:0}.ltc-top{padding:20px 18px}.ltc-top h2{font-size:25px}.ltc-body{padding:25px 18px}.ltc-progress{padding:15px 18px 0}.ltc-step h3{font-size:31px}.ltc-grid{grid-template-columns:1fr}.ltc-symbols{grid-template-columns:repeat(4,1fr)}.ltc-colors{grid-template-columns:repeat(5,1fr)}.ltc-summary{grid-template-columns:82px 1fr}.ltc-summary-icon{border-radius:21px;font-size:37px}.ltc-actions{position:sticky;bottom:0;background:rgba(255,255,255,.94);backdrop-filter:blur(12px);padding:15px 18px}.ltc-btn{flex:1}.ltc-next{margin-left:0}}
    `;
    document.head.appendChild(style);
  }

  function ownerName(){
    const auth=window.ParisAuth?.getState?.();
    return auth?.profile?.displayName||auth?.user?.user_metadata?.full_name||auth?.user?.email?.split('@')[0]||'Reisebesitzer';
  }

  function form(initial={}){
    const destination=typeof initial.destination==='object'?initial.destination:{name:initial.destination||''};
    return {
      title:initial.title||initial.tripName||'',
      destination:{name:destination.name||'',country:destination.country||'',placeId:destination.placeId||'',latitude:destination.latitude??null,longitude:destination.longitude??null},
      symbol:initial.symbol||'❤️',accent:initial.accent||'#ee6f83',startDate:initial.startDate||'',endDate:initial.endDate||''
    };
  }

  function template(data){return `
    <div class="ltc-shell"><section class="ltc-card" role="dialog" aria-modal="true" aria-label="Neue Reise erstellen">
      <header class="ltc-top"><span class="ltc-logo"></span><div><h2>Neue Reise</h2><p>In wenigen Schritten zu eurem nächsten Abenteuer.</p></div><button class="ltc-close" type="button" aria-label="Schließen">×</button></header>
      <div class="ltc-progress">${[0,1,2,3].map(i=>`<i data-progress="${i}"></i>`).join('')}</div>
      <main class="ltc-body">
        <section class="ltc-step" data-step="0"><span class="ltc-kicker">Schritt 1 von 4</span><h3>Wie soll eure Reise heißen?</h3><p class="ltc-copy">Der Name erscheint später auf dem Dashboard und in eurer Reiseübersicht.</p><div class="ltc-field"><label for="ltcTitle">Name der Reise</label><input id="ltcTitle" maxlength="80" autocomplete="off" placeholder="Zum Beispiel: Paris · Unser Hochzeitstag" value="${esc(data.title)}"></div></section>
        <section class="ltc-step" data-step="1"><span class="ltc-kicker">Schritt 2 von 4</span><h3>Wohin geht es?</h3><p class="ltc-copy">Das Reiseziel wird zentral gespeichert und später von Wetter, Restaurants, Karten und weiteren Modulen verwendet.</p><div class="ltc-field"><label for="ltcDestination">Reiseziel</label><input id="ltcDestination" maxlength="100" autocomplete="off" placeholder="Zum Beispiel: Paris" value="${esc(data.destination.name)}"></div><div class="ltc-field"><label for="ltcCountry">Land oder Region <small>(optional)</small></label><input id="ltcCountry" maxlength="80" autocomplete="off" placeholder="Zum Beispiel: Frankreich" value="${esc(data.destination.country)}"></div></section>
        <section class="ltc-step" data-step="2"><span class="ltc-kicker">Schritt 3 von 4</span><h3>Gebt der Reise ihren Stil</h3><p class="ltc-copy">Symbol und Farbe begleiten euch durch die gesamte App.</p><div class="ltc-field"><label>Reisesymbol</label><div class="ltc-symbols">${SYMBOLS.map(s=>`<button type="button" class="ltc-symbol${s===data.symbol?' on':''}" data-symbol="${s}">${s}</button>`).join('')}</div></div><div class="ltc-field"><label>Reisefarbe</label><div class="ltc-colors">${COLORS.map(c=>`<button type="button" class="ltc-color${c===data.accent?' on':''}" style="--swatch:${c}" data-color="${c}" aria-label="Farbe ${c}"></button>`).join('')}</div></div><div class="ltc-preview"><span data-preview-symbol>${data.symbol}</span><h4 data-preview-title>${esc(data.title||'Unsere Reise')}</h4><p data-preview-destination>📍 ${esc(data.destination.name||'Euer Reiseziel')}</p></div></section>
        <section class="ltc-step" data-step="3"><span class="ltc-kicker">Schritt 4 von 4</span><h3>Wann seid ihr unterwegs?</h3><p class="ltc-copy">Die Daten können später jederzeit geändert werden.</p><div class="ltc-grid"><div class="ltc-field"><label for="ltcStart">Startdatum</label><input id="ltcStart" type="date" value="${esc(data.startDate)}"></div><div class="ltc-field"><label for="ltcEnd">Enddatum</label><input id="ltcEnd" type="date" value="${esc(data.endDate)}"></div></div><div class="ltc-summary"><div class="ltc-summary-icon" data-summary-icon>${data.symbol}</div><div><h4 data-summary-title>${esc(data.title||'Unsere Reise')}</h4><p data-summary-destination>📍 ${esc(data.destination.name||'Reiseziel noch offen')}</p><p data-summary-dates>📅 Zeitraum noch offen</p></div></div></section>
      </main>
      <div class="ltc-error" data-error></div>
      <footer class="ltc-actions"><button class="ltc-btn ltc-back" type="button" data-back>Zurück</button><button class="ltc-btn ltc-next" type="button" data-next>Weiter</button></footer>
    </section></div>`}

  async function save(data){
    const client=window.ParisCloud?.client||window.ParisSupabaseClient;
    let id=uuid(),joinCode=code(),cloud=false;
    if(client){
      const session=(await client.auth.getSession()).data?.session;
      if(session?.user){
        const created=await client.rpc('create_trip_with_code',{trip_name:data.title,trip_code:joinCode,owner_name:ownerName()});
        if(created.error)throw created.error;
        id=created.data;cloud=true;
        const details=await client.rpc('paris_update_trip_details',{p_trip_id:id,p_trip_name:data.title,p_destination:data.destination.name,p_symbol:data.symbol,p_accent:data.accent,p_start_date:data.startDate||null,p_end_date:data.endDate||null});
        if(details.error)console.warn('[LuviaTripCreator] Reisedetails konnten nicht vollständig in der Cloud ergänzt werden.',details.error);
      }
    }
    const now=new Date().toISOString();
    const trip={id,tripId:id,ownerId:null,title:data.title,tripName:data.title,destination:{...data.destination},destinationName:data.destination.name,joinCode,memberName:ownerName(),role:'owner',isOwner:true,mode:'shared',symbol:data.symbol,accent:data.accent,startDate:data.startDate||null,endDate:data.endDate||null,tripType:'couple',modules:[],selectedModules:[],moduleSettings:{},dashboardWidgets:[],createdAt:now,updatedAt:now,lastOpenedAt:now,cloud};
    window.LuviaTripStore.upsert(trip,{activate:true});
    window.LuviaTripContext?.refresh?.();
    window.LuviaRuntime?.refresh?.();
    return trip;
  }

  function open(initial={}){
    styles();layer?.remove();
    const data=form(initial);let step=0,saving=false;
    layer=document.createElement('div');layer.className='ltc';layer.style.setProperty('--ltc-accent',data.accent);layer.innerHTML=template(data);document.body.appendChild(layer);
    const $=selector=>layer.querySelector(selector);const $$=selector=>[...layer.querySelectorAll(selector)];
    const sync=()=>{
      $('[data-preview-symbol]').textContent=data.symbol;$('[data-summary-icon]').textContent=data.symbol;
      $('[data-preview-title]').textContent=data.title||'Unsere Reise';$('[data-summary-title]').textContent=data.title||'Unsere Reise';
      $('[data-preview-destination]').textContent=`📍 ${data.destination.name||'Euer Reiseziel'}`;$('[data-summary-destination]').textContent=`📍 ${data.destination.name||'Reiseziel noch offen'}`;
      $('[data-summary-dates]').textContent=data.startDate&&data.endDate?`📅 ${new Date(data.startDate+'T12:00:00').toLocaleDateString('de-DE')} – ${new Date(data.endDate+'T12:00:00').toLocaleDateString('de-DE')}`:data.startDate?`📅 Ab ${new Date(data.startDate+'T12:00:00').toLocaleDateString('de-DE')}`:'📅 Zeitraum noch offen';
    };
    const show=()=>{$$('.ltc-step').forEach((el,i)=>el.classList.toggle('on',i===step));$$('[data-progress]').forEach((el,i)=>el.classList.toggle('on',i<=step));$('[data-back]').style.visibility=step?'visible':'hidden';$('[data-next]').textContent=step===3?'Reise erstellen':'Weiter';sync()};
    const error=message=>{const el=$('[data-error]');el.textContent=message||'';el.classList.toggle('on',Boolean(message))};
    const read=()=>{data.title=$('#ltcTitle').value.trim();data.destination.name=$('#ltcDestination').value.trim();data.destination.country=$('#ltcCountry').value.trim();data.startDate=$('#ltcStart').value;data.endDate=$('#ltcEnd').value};
    const validate=()=>{read();if(step===0&&!data.title)return'Bitte gib deiner Reise einen Namen.';if(step===1&&!data.destination.name)return'Bitte trage ein Reiseziel ein.';if(step===3&&data.startDate&&data.endDate&&data.endDate<data.startDate)return'Das Enddatum darf nicht vor dem Startdatum liegen.';return''};
    layer.addEventListener('input',()=>{read();sync();error('')});
    $$('[data-symbol]').forEach(button=>button.onclick=()=>{data.symbol=button.dataset.symbol;$$('[data-symbol]').forEach(x=>x.classList.toggle('on',x===button));sync()});
    $$('[data-color]').forEach(button=>button.onclick=()=>{data.accent=button.dataset.color;layer.style.setProperty('--ltc-accent',data.accent);$$('[data-color]').forEach(x=>x.classList.toggle('on',x===button))});
    $('[data-back]').onclick=()=>{if(step>0){step--;error('');show()}};
    $('[data-next]').onclick=async()=>{if(saving)return;const message=validate();if(message)return error(message);if(step<3){step++;show();return}saving=true;const button=$('[data-next]');button.disabled=true;button.textContent='Reise wird erstellt …';try{const trip=await save(data);layer.remove();layer=null;window.dispatchEvent(new CustomEvent('luvia:trip-created',{detail:{trip}}));window.LuviaTripExperience?.openInvite?.(trip)}catch(err){console.error('[LuviaTripCreator]',err);error(err?.message||'Die Reise konnte nicht erstellt werden.');saving=false;button.disabled=false;button.textContent='Reise erstellen'}};
    $('.ltc-close').onclick=()=>{layer.remove();layer=null};
    show();setTimeout(()=>$('#ltcTitle')?.focus(),50);
  }

  window.LuviaTripCreator=Object.freeze({open,save});
})();
