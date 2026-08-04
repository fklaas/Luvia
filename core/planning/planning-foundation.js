(() => {
  'use strict';
  const VERSION='4.21.0';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const tripId=trip=>trip?.id||trip?.tripId||null;
  const destination=trip=>trip?.destination?.name||trip?.destination?.formattedAddress||trip?.name||'eurer Reise';
  function contextFor(trip,surface){return {destination:destination(trip),surface,tripId:tripId(trip),generatedAt:new Date().toISOString()}}
  function suggestions(surface,trip){
    const place=[`Einen entspannten halben Tag in ${destination(trip)} planen`,'Vegetarisch essen und danach etwas Schönes erleben','Etwas mit Kind planen, ohne weite Wege','Nur einen besonderen Ort finden'];
    const move=['Zum nächsten geplanten Ort kommen','Eine entspannte Verbindung mit wenig Fußweg prüfen','Vom aktuellen Standort zur Unterkunft','Nur eine bestimmte Verbindung vergleichen'];
    return surface==='move'?move:place;
  }
  function mount(host,{surface='places',trip,onCatalog,onContinue}={}){
    if(!host) throw new Error('Planning host missing');
    const id=tripId(trip); const session=window.LuviaPlanningSession.ensure({tripId:id,surface,context:contextFor(trip,surface)});
    const title=surface==='move'?'Wie möchtet ihr euren nächsten Weg planen?':'Was möchtet ihr als Nächstes planen?';
    const copy=surface==='move'?'Luvia Plan verbindet Ziel, Zeit und Komfort. Noch wird keine Verbindung gesucht – zuerst entsteht ein sauberer Planungsauftrag.':'Luvia Plan denkt nicht mehr in Suchlisten. Erst entsteht ein Planungsziel; Places, Wege und Timeline werden später nur als Werkzeuge eingesetzt.';
    const legacy=surface==='move'?'Move-Katalog öffnen':'Places-Katalog öffnen';
    host.innerHTML=`<section class="luv-plan-reset" data-plan-reset="${esc(surface)}"><div class="luv-plan-reset__aura" aria-hidden="true"></div><header><span class="luv-plan-reset__kicker">Planning Foundation Reset</span><h1>${esc(title)}</h1><p>${esc(copy)}</p></header><div class="luv-plan-reset__grid"><section class="luv-plan-reset__composer"><label for="luv-plan-goal-${esc(surface)}">Euer Planungswunsch</label><textarea id="luv-plan-goal-${esc(surface)}" data-plan-goal placeholder="Zum Beispiel: Morgen entspannt mit Kind unterwegs sein, mittags vegetarisch essen und später etwas Indoor machen.">${esc(session.userGoal)}</textarea><div class="luv-plan-reset__actions"><button type="button" class="primary" data-plan-continue>Planungsziel festhalten</button><button type="button" class="secondary" data-plan-new>Neu beginnen</button></div><small>Noch keine automatische Suche. Keine Google-Ergebnisse. Keine KI-Fallbacks.</small></section><aside class="luv-plan-reset__aside"><span>Persönliche Planungsimpulse</span><div class="luv-plan-reset__suggestions">${suggestions(surface,trip).map(text=>`<button type="button" data-plan-suggestion="${esc(text)}">${esc(text)}</button>`).join('')}</div><div class="luv-plan-reset__status"><strong>Was 13.21.0 bereits trennt</strong><ul><li>Planungsziel statt Suchanfrage</li><li>Session statt Ergebniszustand</li><li>Places und Move nur noch als Tools</li><li>Katalog ausschließlich auf Wunsch</li></ul></div></aside></div><footer><button type="button" data-plan-catalog>${esc(legacy)}</button><span>Der bestehende Core bleibt cloud-autoritativ und wird nicht dupliziert.</span></footer></section>`;
    const input=host.querySelector('[data-plan-goal]');
    host.querySelectorAll('[data-plan-suggestion]').forEach(btn=>btn.onclick=()=>{input.value=btn.dataset.planSuggestion||'';input.focus()});
    host.querySelector('[data-plan-new]').onclick=()=>{window.LuviaPlanningSession.clear(id,surface);input.value='';input.focus()};
    host.querySelector('[data-plan-continue]').onclick=()=>{
      const value=input.value.trim(); if(!value){input.focus();host.querySelector('.luv-plan-reset__composer').classList.add('is-invalid');return}
      const next=window.LuviaPlanningSession.setGoal(id,surface,value); window.dispatchEvent(new CustomEvent('luvia:planning-goal-ready',{detail:next})); onContinue?.(next); renderCaptured(host,next,surface,trip,onCatalog,onContinue);
    };
    host.querySelector('[data-plan-catalog]').onclick=()=>{window.LuviaPlanningSession.markLegacyCatalog(id,surface,surface);onCatalog?.()};
  }
  function renderCaptured(host,session,surface,trip,onCatalog,onContinue){
    host.innerHTML=`<section class="luv-plan-reset luv-plan-reset--captured"><div class="luv-plan-reset__aura" aria-hidden="true"></div><span class="luv-plan-reset__kicker">Planungsziel gespeichert</span><h1>Der neue Planning Core hat euren Wunsch übernommen.</h1><blockquote>${esc(session.userGoal)}</blockquote><div class="luv-plan-reset__foundation"><article><strong>Jetzt vorhanden</strong><p>Eine eigenständige Planning Session mit klar getrennten Präferenz- und Zustandsbereichen.</p></article><article><strong>Bewusst noch nicht aktiv</strong><p>Keine automatische Recherche, kein Ranking und kein alter Discovery-Fallback.</p></article><article><strong>Nächster Architekturbaustein</strong><p>Goal Decomposition und gezielte Einzelrückfragen auf dieser Session.</p></article></div><div class="luv-plan-reset__actions"><button class="primary" data-plan-edit type="button">Wunsch weiter bearbeiten</button><button class="secondary" data-plan-catalog type="button">${surface==='move'?'Move-':'Places-'}Katalog bewusst öffnen</button></div></section>`;
    host.querySelector('[data-plan-edit]').onclick=()=>mount(host,{surface,trip,onCatalog,onContinue});
    host.querySelector('[data-plan-catalog]').onclick=()=>{window.LuviaPlanningSession.markLegacyCatalog(tripId(trip),surface,surface);onCatalog?.()};
  }
  window.LuviaPlanningFoundation=Object.freeze({version:VERSION,mount,contextFor,suggestions,diagnostics:()=>({version:VERSION,status:'foundation-reset',automaticSearch:false,legacyCatalog:'explicit-only'})});
})();
