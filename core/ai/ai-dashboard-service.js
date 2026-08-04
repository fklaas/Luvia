(() => {
  'use strict';
  const VERSION='4.19.1';
  const state=new Map();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const tripId=trip=>String(trip?.id||trip?.tripId||'');
  function placeholder(){return{headline:'Luvia verbindet gerade eure Reise.',message:'Vorlieben, Reiseplan und aktueller Moment werden zu einer persönlichen Geschichte zusammengesetzt.',highlights:[],suggestedActions:[]}}
  function render({trip}={}){
    const id=tripId(trip),entry=state.get(id)||{data:placeholder(),loading:false,error:null};const data=entry.data||placeholder();
    queueMicrotask(()=>refresh(trip).catch(()=>{}));
    return `<div class="luv-ai-widget ${entry.loading?'is-loading':''}"><header><span class="luv-ai-orbit" aria-hidden="true"><i></i><b>✦</b></span><div><span class="luv-ai-kicker">Luvia Brain</span><h2>${esc(data.headline)}</h2></div><button type="button" data-ai-brief-refresh aria-label="Luvia Briefing aktualisieren">↻</button></header><p>${esc(data.message)}</p>${data.highlights?.length?`<div class="luv-ai-highlights">${data.highlights.map(item=>`<span>${esc(item)}</span>`).join('')}</div>`:''}<div class="luv-ai-widget-actions"><button type="button" data-ai-timeline-check>Tag gemeinsam prüfen</button><button type="button" data-ai-ask-open>Mit Luvia sprechen</button></div>${entry.error?`<small class="luv-ai-note">Regelbasierter Modus aktiv: ${esc(entry.error)}</small>`:'<small class="luv-ai-note">KI-Vorschläge verändern eure Reise niemals ohne Bestätigung.</small>'}</div>`;
  }
  async function refresh(trip,{force=false}={}){
    const id=tripId(trip);if(!id)return null;const current=state.get(id);if(current?.loading)return current;if(current?.updatedAt&&!force&&Date.now()-current.updatedAt<60000)return current;
    state.set(id,{...(current||{}),data:current?.data||placeholder(),loading:true,error:null});window.dispatchEvent(new CustomEvent('luvia:dashboard-widget-refresh',{detail:{id:'aiBrain'}}));
    const journey=await window.LuviaJourneyKnowledgeGraph?.load?.({force}).catch(()=>null);
    const response=await window.LuviaAI.run('dashboard.brief',{currentMoment:{surface:'dashboard'},journey,plannedVisits:journey?.plannedVisits||[],instruction:'Nenne alle geplanten Einträge des relevanten Tages vollständig und chronologisch. Ein Timeline-Eintrag ist ein geplanter Besuch. Fehlende Buchungsdaten sind niemals eine Warnung.'},{fallback:true});
    const next={data:response.data,loading:false,error:response.meta?.fallback?'Die Cloud-KI war nicht erreichbar.':'' ,updatedAt:Date.now()};state.set(id,next);window.dispatchEvent(new CustomEvent('luvia:dashboard-widget-refresh',{detail:{id:'aiBrain'}}));return next;
  }
  function askModal(){
    const overlay=document.createElement('div');overlay.className='luv-ai-proposal-overlay';overlay.innerHTML='<section class="luv-ai-proposal luv-ai-chat" role="dialog" aria-modal="true"><span class="luv-ai-kicker">Mit Luvia sprechen</span><h2>Was soll Luvia für eure Reise durchdenken?</h2><textarea rows="4" placeholder="Zum Beispiel: Was passt heute noch zwischen Museum und Abendessen?"></textarea><div data-ai-answer></div><div class="luv-ai-proposal-actions"><button type="button" data-ai-close>Schließen</button><button type="button" data-ai-send>Fragen</button></div></section>';document.body.appendChild(overlay);
    overlay.querySelector('[data-ai-close]').onclick=()=>overlay.remove();overlay.addEventListener('click',event=>{if(event.target===overlay)overlay.remove()});
    overlay.querySelector('[data-ai-send]').onclick=async()=>{const button=overlay.querySelector('[data-ai-send]'),text=overlay.querySelector('textarea').value.trim(),answer=overlay.querySelector('[data-ai-answer]');if(!text)return;button.disabled=true;button.textContent='Luvia denkt …';try{const response=await window.LuviaAI.ask(text,{currentMoment:{surface:window.LuviaApp?.activeView?.()||'global-assistant'}});answer.innerHTML=`<div class="luv-ai-answer">${esc(response.data?.answer||'Dazu konnte Luvia gerade keine sichere Antwort formulieren.')}</div>`}catch(error){answer.innerHTML=`<div class="luv-ai-answer is-error">${esc(error.message)}</div>`}finally{button.disabled=false;button.textContent='Fragen'}};
  }
  if(window.LuviaDashboardWidgets?.register)window.LuviaDashboardWidgets.register({id:'aiBrain',order:5,title:'Luvia Brain',icon:'✦',render});
  document.addEventListener('click',async event=>{
    const button=event.target.closest?.('[data-ai-brief-refresh],[data-ai-timeline-check],[data-ai-ask-open]');if(!button)return;
    if(button.matches('[data-ai-ask-open]'))return askModal();
    const trip=window.LuviaTripContext?.getActiveTrip?.()||window.LuviaAppState?.getSnapshot?.()?.trip?.trip||{};
    if(button.matches('[data-ai-brief-refresh]')){button.disabled=true;await refresh(trip,{force:true}).catch(error=>window.LuviaUIKit?.toast?.(error.message,{type:'error'}));button.disabled=false;return}
    if(button.matches('[data-ai-timeline-check]')){button.disabled=true;button.textContent='Luvia prüft …';try{await window.LuviaAI.proposeAction({currentMoment:{surface:'dashboard',intent:'optimize-today'}})}catch(error){window.LuviaUIKit?.toast?.(error.message||'Der Tag konnte nicht geprüft werden.',{type:'error'})}finally{button.disabled=false;button.textContent='Tag gemeinsam prüfen'}}
  });
  window.addEventListener('luvia:journey-context-changed',()=>{const trip=window.LuviaTripContext?.getActiveTrip?.()||{};if(tripId(trip))refresh(trip,{force:true}).catch(()=>{})});
  window.LuviaAIDashboard=Object.freeze({version:VERSION,render,refresh,openChat:askModal,diagnostics:()=>({version:VERSION,entries:state.size,widget:'aiBrain'})});
})();
