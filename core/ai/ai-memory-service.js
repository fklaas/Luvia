(() => {
  'use strict';

  const VERSION = '1.1.0';
  const listeners = new Set();
  let state = {signals:[], loaded:false, loading:false, error:null, updatedAt:null};

  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const userId = () => window.ParisAuth?.getState?.()?.user?.id || null;
  const tripId = () => window.LuviaTripContext?.getActiveTrip?.()?.id || window.LuviaTripContext?.getActiveTrip?.()?.tripId || null;
  const text = value => String(value ?? '').trim();
  const values = value => [...new Set((Array.isArray(value) ? value : [value]).map(text).filter(Boolean))];

  const CATEGORY_TARGETS = Object.freeze({
    dietary:{key:'dietaryPreferences', type:'array'},
    diet:{key:'dietaryPreferences', type:'array'},
    dietary_preferences:{key:'dietaryPreferences', type:'array'},
    travel_interests:{key:'travelInterests', type:'array'},
    interests:{key:'travelInterests', type:'array'},
    travel_styles:{key:'travelStyles', type:'array'},
    styles:{key:'travelStyles', type:'array'},
    activities:{key:'activityPreferences', type:'array'},
    activity:{key:'activityPreferences', type:'array'},
    entertainment:{key:'entertainmentPreferences', type:'array'},
    dining:{key:'diningPreferences', type:'array'},
    mobility:{key:'mobilityPreferences', type:'array'},
    atmosphere:{key:'atmospherePreferences', type:'array'},
    travel_pace:{key:'travelPace', type:'scalar'},
    pace:{key:'travelPace', type:'scalar'},
    budget:{key:'budgetPreference', type:'scalar'},
    family:{key:'familyPreferences', type:'needs'},
    accessibility:{key:'accessibilityPreferences', type:'needs'}
  });

  function snapshot(){
    return Object.freeze({...state, signals:clone(state.signals)});
  }

  function emit(reason){
    const value = snapshot();
    listeners.forEach(listener => {
      try { listener(value, reason); } catch (error) { console.warn('[LuviaAIMemory]', error); }
    });
    window.dispatchEvent(new CustomEvent('luvia:ai-memory-changed', {detail:{reason, snapshot:value}}));
    return value;
  }

  async function load({force=false}={}){
    if (state.loading) return snapshot();
    if (state.loaded && !force) return snapshot();
    const uid = userId();
    if (!uid) {
      state = {signals:[], loaded:true, loading:false, error:null, updatedAt:new Date().toISOString()};
      return emit('anonymous');
    }
    state = {...state, loading:true, error:null};
    emit('loading');
    try {
      const client = await window.LuviaSupabaseService.start();
      const {data,error} = await client.from('ai_learning_signals')
        .select('*')
        .eq('user_id', uid)
        .neq('status', 'dismissed')
        .order('last_observed_at', {ascending:false})
        .limit(100);
      if (error) throw error;
      state = {signals:data || [], loaded:true, loading:false, error:null, updatedAt:new Date().toISOString()};
      return emit('loaded');
    } catch (error) {
      state = {...state, loaded:true, loading:false, error:error?.message || String(error)};
      emit('load-error');
      return snapshot();
    }
  }

  async function recordSignal(signal={}, options={}){
    const uid = userId();
    if (!uid) throw new Error('AUTH_REQUIRED');
    const client = await window.LuviaSupabaseService.start();
    const params = {
      p_trip_id:options.tripId || tripId() || null,
      p_scope_key:signal.scopeKey || options.scopeKey || 'global',
      p_signal_key:text(signal.signalKey || signal.signal_key),
      p_category:text(signal.category || 'general').toLowerCase(),
      p_value:signal.value || {},
      p_confidence:Number(signal.confidence ?? .5),
      p_source_summary:signal.sourceSummary || {evidence:signal.evidence || '', capability:options.capability || 'memory.extract'},
      p_status:signal.status || 'inferred'
    };
    if (!params.p_signal_key) throw new Error('SIGNAL_KEY_REQUIRED');
    const {data,error} = await client.rpc('luvia_record_ai_learning_signal', params);
    if (error) throw error;
    await load({force:true});
    return data;
  }

  async function updateSignalStatus(signalOrId, status){
    const uid = userId();
    if (!uid) throw new Error('AUTH_REQUIRED');
    if (!['inferred','confirmed','dismissed'].includes(status)) throw new Error('AI_SIGNAL_STATUS_INVALID');
    const id = typeof signalOrId === 'string' ? signalOrId : signalOrId?.id;
    if (!id) throw new Error('AI_SIGNAL_ID_REQUIRED');
    const client = await window.LuviaSupabaseService.start();
    const {data,error} = await client.from('ai_learning_signals')
      .update({status, updated_at:new Date().toISOString()})
      .eq('id', id)
      .eq('user_id', uid)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    await load({force:true});
    return data;
  }

  function preferencePatch(signal={}){
    const category = text(signal.category).toLowerCase();
    const target = CATEGORY_TARGETS[category];
    const label = text(signal.value?.label || signal.value?.value || signal.label);
    if (!target || !label) throw new Error('AI_SIGNAL_NOT_CONFIRMABLE');
    const current = window.LuviaUserPreferences?.get?.() || {};
    if (target.type === 'array') return {[target.key]:values([...(current[target.key] || []), label])};
    if (target.type === 'scalar') return {[target.key]:label};
    const currentObject = current[target.key] && typeof current[target.key] === 'object' ? current[target.key] : {};
    return {[target.key]:{...currentObject, needs:values([...(currentObject.needs || []), label])}};
  }

  async function confirmSignal(signal={}){
    const patch = preferencePatch(signal);
    await window.LuviaUserPreferences.update(patch, {reason:'ai-signal-confirmed'});
    const updated = await updateSignalStatus(signal, 'confirmed');
    await recordInteraction({
      capability:'memory.confirm',
      eventType:'signal.confirmed',
      entityType:'ai_learning_signal',
      entityId:signal.id,
      payload:{signalKey:signal.signal_key || signal.signalKey, category:signal.category}
    });
    return updated;
  }

  async function dismissSignal(signal={}){
    const updated = await updateSignalStatus(signal, 'dismissed');
    await recordInteraction({
      capability:'memory.review',
      eventType:'signal.dismissed',
      entityType:'ai_learning_signal',
      entityId:signal.id,
      payload:{signalKey:signal.signal_key || signal.signalKey, category:signal.category}
    });
    return updated;
  }

  async function recordInteraction(event={}){
    const uid = userId();
    if (!uid) return null;
    const client = await window.LuviaSupabaseService.start();
    const row = {
      user_id:uid,
      trip_id:event.tripId || tripId() || null,
      capability:event.capability || 'unknown',
      event_type:event.eventType || event.type || 'observed',
      entity_type:event.entityType || null,
      entity_id:event.entityId ? String(event.entityId) : null,
      payload:window.LuviaAIPolicy.sanitize(event.payload || {})
    };
    const {data,error} = await client.from('ai_interaction_events').insert(row).select().maybeSingle();
    if (error) throw error;
    return data;
  }

  async function learnFromEvent(event={}){
    try {
      await recordInteraction(event);
      const result = await window.LuviaAI?.run?.('memory.extract', {input:event}, {fallback:true});
      for (const signal of result?.data?.signals || []) await recordSignal(signal, {capability:'memory.extract'});
      return result;
    } catch (error) {
      console.warn('[LuviaAIMemory] Lernereignis konnte nicht verarbeitet werden.', error);
      return null;
    }
  }

  function subscribe(listener){
    listeners.add(listener);
    listener(snapshot(), 'subscribe');
    return () => listeners.delete(listener);
  }

  window.addEventListener('luvia:recommendations-changed', event => {
    const detail = event.detail || {};
    if (/^decision\.(accepted|rejected|converted)$/.test(detail.name || '')) {
      learnFromEvent({
        capability:'recommendation.learning',
        eventType:detail.name,
        entityType:detail.recommendation?.entityType,
        entityId:detail.recommendation?.entityId,
        payload:{reason:detail.reason || null, action:detail.action || null, module:detail.recommendation?.module || null}
      });
    }
  });
  window.addEventListener('luvia:place-collection-changed', event => {
    const detail = event.detail || {};
    if (['favorite-added','favorite-removed','favorites-cleared'].includes(detail.action)) {
      learnFromEvent({
        capability:'place.learning',
        eventType:detail.action,
        entityType:detail.placeType || 'place',
        entityId:detail.providerPlaceId || detail.tripPlaceId || null,
        payload:{isFavorite:detail.isFavorite, placeType:detail.placeType}
      });
    }
  });
  window.addEventListener('luvia:user-preferences-changed', () => load({force:true}).catch(() => {}));
  window.addEventListener('luvia:auth-changed', () => load({force:true}).catch(() => {}));
  window.addEventListener('luvia:ai-ready', () => load().catch(() => {}), {once:true});

  window.LuviaAIMemory = Object.freeze({
    version:VERSION,
    load,
    snapshot,
    recordSignal,
    updateSignalStatus,
    confirmSignal,
    dismissSignal,
    recordInteraction,
    learnFromEvent,
    subscribe,
    diagnostics:() => ({version:VERSION, ...snapshot(), source:'supabase.ai_learning_signals', profileMutation:'explicit-confirmation-only'})
  });
})();
