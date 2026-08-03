/* Build 13.17.0 – inferred AI signals remain separate until explicit profile confirmation */
const fs=require('fs'),vm=require('vm'),assert=require('assert');

async function main(){
  const updates=[],statusUpdates=[],interactions=[],events=[];
  const signal={id:'signal-1',signal_key:'prefers_quiet_cafes',category:'atmosphere',value:{label:'Ruhige Cafés'},confidence:.82,evidence_count:4,status:'inferred'};
  const query={
    select(){return this},eq(){return this},neq(){return this},order(){return this},limit(){return Promise.resolve({data:[signal],error:null})},
    update(value){statusUpdates.push(value);return this},maybeSingle(){return Promise.resolve({data:{...signal,status:statusUpdates.at(-1)?.status||signal.status},error:null})},
    insert(row){interactions.push(row);return this}
  };
  const client={from(){return Object.create(query)},rpc(){return Promise.resolve({data:signal,error:null})}};
  const window={
    dispatchEvent(event){events.push(event.type)},addEventListener(){},
    ParisAuth:{getState(){return{user:{id:'user-1'}}}},
    LuviaTripContext:{getActiveTrip(){return{id:'trip-1'}}},
    LuviaSupabaseService:{start:async()=>client},
    LuviaAIPolicy:{sanitize:value=>value},
    LuviaUserPreferences:{
      get(){return{atmospherePreferences:['Romantisch'],familyPreferences:{needs:[]},accessibilityPreferences:{needs:[]}}},
      async update(patch,options){updates.push({patch,options});return patch}
    }
  };
  const context=vm.createContext({window,console,Date,Math,Object,Array,Map,Set,JSON,String,Number,Boolean,Promise,CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail}}});
  vm.runInContext(fs.readFileSync('core/ai/ai-memory-service.js','utf8'),context);
  await window.LuviaAIMemory.confirmSignal(signal);
  assert.deepStrictEqual(Array.from(updates[0].patch.atmospherePreferences),['Romantisch','Ruhige Cafés']);
  assert.strictEqual(updates[0].options.reason,'ai-signal-confirmed');
  assert.strictEqual(statusUpdates[0].status,'confirmed');
  assert(interactions.some(row=>row.event_type==='signal.confirmed'));
  assert.strictEqual(window.LuviaAIMemory.diagnostics().profileMutation,'explicit-confirmation-only');

  const profile=fs.readFileSync('core/profiles/profile-foundation.js','utf8');
  for(const token of ['Luvias lernendes Gedächtnis','data-pf-ai-confirm','data-pf-ai-dismiss','confirmSignal','dismissSignal'])assert(profile.includes(token),`profile review missing ${token}`);
  assert(profile.includes('Erst deine bewusste Bestätigung'),'profile does not explain explicit confirmation');
  assert(events.includes('luvia:ai-memory-changed'));
  console.log('AI learning signals, explicit profile confirmation and review UI: OK');
}
main().catch(error=>{console.error(error);process.exit(1)});
