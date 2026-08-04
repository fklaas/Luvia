(() => {
  'use strict';
  const VERSION = '4.22.1';
  const SCHEMA_VERSION = 3;
  const memory = new Map();
  const clean = value => JSON.parse(JSON.stringify(value ?? null));
  const key = (tripId, surface='plan') => `luvia:planning-session:${tripId || 'unknown'}:${surface}`;
  const uid = () => globalThis.crypto?.randomUUID?.() || `plan-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  function constraintList(value){if(Array.isArray(value))return clean(value);return Object.entries(value||{}).map(([key,item])=>({key,value:String(item),label:String(key)}))}
  function normalizeGoal(goal={}) {
    return {
      id: goal.id || uid(),
      type: String(goal.type || 'open'),
      label: String(goal.label || ''),
      status: goal.status || 'draft',
      hardConstraints: constraintList(goal.hardConstraints),
      softPreferences: constraintList(goal.softPreferences),
      timeWindow: clean(goal.timeWindow || null),
      source: goal.source || 'user'
    };
  }
  function normalizeQuestion(question){
    if(!question || !question.text) return null;
    return {id:question.id||uid(),text:String(question.text),reason:String(question.reason||''),options:(question.options||[]).slice(0,5).map(option=>({label:String(option.label||option.value||''),value:String(option.value||option.label||'')})),allowFreeText:question.allowFreeText!==false,answeredAt:question.answeredAt||null,answer:question.answer??null};
  }
  function migrate(session={}){
    const migrated={...session,schemaVersion:SCHEMA_VERSION,dialogue:{status:'idle',turns:[],pendingQuestion:null,summary:null,confidence:0,...clean(session.dialogue||{})}};
    migrated.goals=(migrated.goals||[]).map(normalizeGoal);
    migrated.constraints={hard:constraintList(migrated.constraints?.hard),soft:constraintList(migrated.constraints?.soft)};
    migrated.dialogue.pendingQuestion=normalizeQuestion(migrated.dialogue.pendingQuestion);
    return migrated;
  }
  function create({tripId=null, surface='plan', participants=[], userGoal='', context={}}={}) {
    const now = new Date().toISOString();
    const session = migrate({id:uid(),tripId,surface,status:'draft',createdAt:now,updatedAt:now,userGoal:String(userGoal||''),goals:[],constraints:{hard:{},soft:{}},preferenceLayers:{globalProfile:{},trip:{},moment:{},session:{}},participants:clean(participants),context:clean(context),decisions:[],rejectedOptions:[],candidateSets:[],draftPlan:null,research:{status:'idle',startedAt:null,completedAt:null},legacy:{catalogOpened:false,source:null}});
    memory.set(key(tripId,surface),session);persist(session);emit('created',session);return clean(session);
  }
  function persist(session){session.updatedAt=new Date().toISOString();memory.set(key(session.tripId,session.surface),session);try{sessionStorage.setItem(key(session.tripId,session.surface),JSON.stringify(session))}catch{}return session}
  function load(tripId,surface='plan'){const k=key(tripId,surface);if(memory.has(k))return clean(memory.get(k));try{const raw=sessionStorage.getItem(k);if(raw){const parsed=migrate(JSON.parse(raw));memory.set(k,parsed);persist(parsed);return clean(parsed)}}catch{}return null}
  function ensure(options={}){return load(options.tripId,options.surface)||create(options)}
  function update(tripId,surface='plan',patch={}){const current=load(tripId,surface)||create({tripId,surface});const next=migrate({...current,...clean(patch),id:current.id,schemaVersion:SCHEMA_VERSION});persist(next);emit('updated',next);return clean(next)}
  function setGoal(tripId,surface,userGoal){const current=load(tripId,surface)||create({tripId,surface});current.userGoal=String(userGoal||'');current.status=userGoal?'clarifying':'draft';current.goals=[];current.constraints={hard:{},soft:{}};current.dialogue={status:userGoal?'understanding':'idle',turns:userGoal?[{role:'user',content:String(userGoal),at:new Date().toISOString()}]:[],pendingQuestion:null,summary:null,confidence:0};persist(current);emit('goal-set',current);return clean(current)}
  function applyDialogue(tripId,surface,result={}){const current=load(tripId,surface)||create({tripId,surface});current.goals=(result.goals||[]).map(normalizeGoal);current.constraints={hard:clean(result.hardConstraints||[]),soft:clean(result.softPreferences||[])};current.dialogue={...current.dialogue,status:result.followUpQuestion?'question':'ready',pendingQuestion:normalizeQuestion(result.followUpQuestion),summary:clean(result.summary||null),confidence:Number(result.confidence||0),understanding:String(result.understanding||''),unknowns:clean(result.unknowns||[]),source:String(result.source||'unknown'),aiAvailable:Boolean(result.aiAvailable),errorCode:result.errorCode||null};current.status=result.followUpQuestion?'clarifying':'ready';persist(current);emit('dialogue-updated',current);return clean(current)}
  function answerQuestion(tripId,surface,answer){const current=load(tripId,surface)||create({tripId,surface});const question=current.dialogue?.pendingQuestion;if(question){question.answer=clean(answer);question.answeredAt=new Date().toISOString();current.dialogue.turns=[...(current.dialogue.turns||[]),{role:'assistant',content:question.text,at:new Date().toISOString()},{role:'user',content:typeof answer==='string'?answer:JSON.stringify(answer),at:new Date().toISOString()}];current.preferenceLayers.session={...(current.preferenceLayers.session||{}),[question.id]:clean(answer)};current.dialogue.pendingQuestion=null;current.dialogue.status='understanding';current.status='clarifying';persist(current);emit('question-answered',current)}return clean(current)}
  function confirm(tripId,surface){const current=load(tripId,surface)||create({tripId,surface});current.status='ready-for-research';current.dialogue.status='confirmed';current.decisions=[...(current.decisions||[]),{type:'dialogue-confirmed',at:new Date().toISOString()}];persist(current);emit('confirmed',current);return clean(current)}
  function setPreferenceLayer(tripId,surface,layer,value){const current=load(tripId,surface)||create({tripId,surface});if(!Object.hasOwn(current.preferenceLayers,layer))throw new Error(`Unknown preference layer: ${layer}`);current.preferenceLayers[layer]=clean(value||{});persist(current);emit('preferences-updated',current);return clean(current)}
  function markLegacyCatalog(tripId,surface,source){const current=load(tripId,surface)||create({tripId,surface});current.legacy={catalogOpened:true,source:source||surface};persist(current);emit('legacy-opened',current);return clean(current)}
  function clear(tripId,surface='plan'){memory.delete(key(tripId,surface));try{sessionStorage.removeItem(key(tripId,surface))}catch{}emit('cleared',{tripId,surface})}
  function emit(type,detail){window.dispatchEvent(new CustomEvent(`luvia:planning-session-${type}`,{detail:clean(detail)}))}
  function diagnostics(){return{version:VERSION,schemaVersion:SCHEMA_VERSION,inMemory:memory.size}}
  window.LuviaPlanningSession=Object.freeze({version:VERSION,create,ensure,load,update,setGoal,applyDialogue,answerQuestion,confirm,setPreferenceLayer,markLegacyCatalog,clear,diagnostics});
})();
