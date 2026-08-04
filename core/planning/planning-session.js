(() => {
  'use strict';
  const VERSION = '4.21.0';
  const SCHEMA_VERSION = 1;
  const memory = new Map();
  const clean = v => JSON.parse(JSON.stringify(v ?? null));
  const key = (tripId, surface='plan') => `luvia:planning-session:${tripId || 'unknown'}:${surface}`;
  const uid = () => globalThis.crypto?.randomUUID?.() || `plan-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  function normalizeGoal(goal={}) {
    return {
      id: goal.id || uid(),
      type: String(goal.type || 'open'),
      label: String(goal.label || ''),
      status: goal.status || 'draft',
      hardConstraints: clean(goal.hardConstraints || {}),
      softPreferences: clean(goal.softPreferences || {}),
      timeWindow: clean(goal.timeWindow || null),
      source: goal.source || 'user'
    };
  }

  function create({tripId=null, surface='plan', participants=[], userGoal='', context={}}={}) {
    const now = new Date().toISOString();
    const session = {
      schemaVersion: SCHEMA_VERSION,
      id: uid(), tripId, surface,
      status: 'draft',
      createdAt: now, updatedAt: now,
      userGoal: String(userGoal || ''),
      goals: [], constraints: {hard:{}, soft:{}},
      preferenceLayers: {globalProfile:{}, trip:{}, moment:{}, session:{}},
      participants: clean(participants),
      context: clean(context),
      decisions: [], rejectedOptions: [], candidateSets: [], draftPlan: null,
      research: {status:'idle', startedAt:null, completedAt:null},
      legacy: {catalogOpened:false, source:null}
    };
    memory.set(key(tripId,surface), session);
    persist(session);
    emit('created', session);
    return clean(session);
  }

  function persist(session) {
    session.updatedAt = new Date().toISOString();
    memory.set(key(session.tripId,session.surface), session);
    try { sessionStorage.setItem(key(session.tripId,session.surface), JSON.stringify(session)); } catch {}
    return session;
  }

  function load(tripId, surface='plan') {
    const k=key(tripId,surface);
    if (memory.has(k)) return clean(memory.get(k));
    try {
      const raw=sessionStorage.getItem(k);
      if(raw){ const parsed=JSON.parse(raw); memory.set(k,parsed); return clean(parsed); }
    } catch {}
    return null;
  }

  function ensure(options={}) { return load(options.tripId,options.surface) || create(options); }
  function update(tripId, surface='plan', patch={}) {
    const current=load(tripId,surface) || create({tripId,surface});
    const next={...current,...clean(patch),id:current.id,schemaVersion:SCHEMA_VERSION};
    persist(next); emit('updated',next); return clean(next);
  }
  function setGoal(tripId,surface,userGoal){ return update(tripId,surface,{userGoal:String(userGoal||''),status:userGoal?'clarifying':'draft'}); }
  function addGoal(tripId,surface,goal){ const current=load(tripId,surface)||create({tripId,surface}); current.goals=[...current.goals,normalizeGoal(goal)]; persist(current); emit('goal-added',current); return clean(current); }
  function setPreferenceLayer(tripId,surface,layer,value){ const current=load(tripId,surface)||create({tripId,surface}); if(!Object.hasOwn(current.preferenceLayers,layer)) throw new Error(`Unknown preference layer: ${layer}`); current.preferenceLayers[layer]=clean(value||{}); persist(current); emit('preferences-updated',current); return clean(current); }
  function markLegacyCatalog(tripId,surface,source){ const current=load(tripId,surface)||create({tripId,surface}); current.legacy={catalogOpened:true,source:source||surface}; persist(current); emit('legacy-opened',current); return clean(current); }
  function clear(tripId,surface='plan'){ memory.delete(key(tripId,surface)); try{sessionStorage.removeItem(key(tripId,surface));}catch{} emit('cleared',{tripId,surface}); }
  function emit(type,detail){ window.dispatchEvent(new CustomEvent(`luvia:planning-session-${type}`,{detail:clean(detail)})); }
  function diagnostics(){ return {version:VERSION,schemaVersion:SCHEMA_VERSION,inMemory:memory.size}; }
  window.LuviaPlanningSession=Object.freeze({version:VERSION,create,ensure,load,update,setGoal,addGoal,setPreferenceLayer,markLegacyCatalog,clear,diagnostics});
})();
