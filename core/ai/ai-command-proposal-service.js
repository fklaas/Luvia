(() => {
  'use strict';
  const VERSION='1.0.0';
  const listeners=new Set();
  const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
  const userId=()=>window.ParisAuth?.getState?.()?.user?.id||null;
  const tripId=()=>window.LuviaTripContext?.getActiveTrip?.()?.id||window.LuviaTripContext?.getActiveTrip?.()?.tripId||null;
  const emit=(reason,proposal)=>{listeners.forEach(fn=>{try{fn(clone(proposal),reason)}catch{}});window.dispatchEvent(new CustomEvent('luvia:ai-proposal-changed',{detail:{reason,proposal:clone(proposal)}}))};
  async function create(input={}){
    const uid=userId();if(!uid)throw new Error('AUTH_REQUIRED');
    const row={user_id:uid,trip_id:input.tripId||tripId()||null,capability:input.capability||'timeline.propose',action_type:input.actionType||'timeline.batch',action_payload:window.LuviaAIPolicy.sanitize(input.actionPayload||input.payload||{}),explanation:String(input.explanation||''),status:'draft'};
    const client=await window.LuviaSupabaseService.start();const {data,error}=await client.from('ai_action_proposals').insert(row).select().single();if(error)throw error;emit('created',data);return data;
  }
  async function setStatus(proposal,status,errorText=null){
    if(!proposal?.id)return proposal;
    const client=await window.LuviaSupabaseService.start();
    const patch={status,updated_at:new Date().toISOString()};
    if(['accepted','rejected'].includes(status))patch.decided_at=new Date().toISOString();
    if(status==='executed')patch.executed_at=new Date().toISOString();
    if(errorText)patch.error_text=String(errorText).slice(0,1000);
    const {data,error}=await client.from('ai_action_proposals').update(patch).eq('id',proposal.id).select().single();if(error)throw error;emit(status,data);return data;
  }
  function eventFromChange(change={}){return{id:change.eventId||crypto.randomUUID(),tripId:tripId(),title:change.title||'Reisemoment',date:change.date,time:change.time,durationMinutes:Number(change.durationMinutes||90),entityType:'ai-proposed',source:{ai:true,reason:change.reason||''}}}
  async function execute(proposal,{confirmed=false}={}){
    if(!confirmed)throw new Error('AI_CONFIRMATION_REQUIRED');
    const payload=proposal.action_payload||proposal.actionPayload||{};
    const changes=Array.isArray(payload.changes)?payload.changes:[];
    await setStatus(proposal,'accepted');
    try{
      for(const change of changes){
        if(change.action==='remove')window.LuviaScheduleIntelligence?.removeEvent?.(change.eventId,{tripId:tripId()});
        else if(change.action==='update'){
          const current=window.LuviaScheduleIntelligence?.snapshot?.()?.events?.find?.(event=>String(event.id)===String(change.eventId));
          window.LuviaScheduleIntelligence?.upsertEvent?.({...current,...eventFromChange(change),id:change.eventId||current?.id});
        }else if(change.action==='add')window.LuviaScheduleIntelligence?.upsertEvent?.(eventFromChange(change));
      }
      const done=await setStatus(proposal,'executed');
      window.LuviaUIKit?.toast?.('Die bestätigten Reiseänderungen wurden übernommen.',{type:'success'});return done;
    }catch(error){await setStatus(proposal,'failed',error?.message||String(error)).catch(()=>{});throw error}
  }
  function modal(proposal={}){
    const payload=proposal.action_payload||proposal.actionPayload||{};const changes=payload.changes||[];
    const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    return new Promise(resolve=>{
      const overlay=document.createElement('div');overlay.className='luv-ai-proposal-overlay';
      overlay.innerHTML=`<section class="luv-ai-proposal" role="dialog" aria-modal="true"><span class="luv-ai-kicker">Luvia denkt mit – du entscheidest</span><h2>${esc(payload.title||'Vorschlag für euren Reisetag')}</h2><p>${esc(proposal.explanation||payload.explanation||'Diese Änderungen werden erst nach deiner Bestätigung gespeichert.')}</p><div class="luv-ai-proposal-list">${changes.map(change=>`<article><b>${esc(change.action==='remove'?'Entfernen':change.action==='update'?'Ändern':'Einplanen')}</b><span>${esc(change.date||'')} ${esc(change.time||'')} · ${esc(change.title||change.eventId||'Eintrag')}</span><small>${esc(change.reason||'')}</small></article>`).join('')||'<article><span>Keine ausführbaren Änderungen vorhanden.</span></article>'}</div><div class="luv-ai-proposal-actions"><button type="button" data-ai-reject>Nicht übernehmen</button><button type="button" data-ai-confirm ${changes.length?'':'disabled'}>Änderungen übernehmen</button></div></section>`;
      document.body.appendChild(overlay);
      const close=value=>{overlay.remove();resolve(value)};
      overlay.addEventListener('click',event=>{if(event.target===overlay)close(false)});
      overlay.querySelector('[data-ai-reject]').onclick=()=>close(false);
      overlay.querySelector('[data-ai-confirm]').onclick=()=>close(true);
    });
  }
  async function present(input={}){
    const proposal=input.id?input:await create(input);
    const confirmed=await modal(proposal);
    if(!confirmed){await setStatus(proposal,'rejected').catch(()=>{});return{ok:false,confirmed:false,proposal}}
    const executed=await execute(proposal,{confirmed:true});return{ok:true,confirmed:true,proposal:executed};
  }
  function subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)}
  window.LuviaAIProposals=Object.freeze({version:VERSION,create,present,execute,setStatus,subscribe,diagnostics:()=>({version:VERSION,confirmationRequired:true,allowedActions:['timeline.add','timeline.update','timeline.remove']})});
})();
