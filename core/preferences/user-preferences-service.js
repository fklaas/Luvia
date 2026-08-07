(() => {
  'use strict';

  const VERSION = '3.0.1';
  const listeners = new Set();
  let revision = 0;
  let state = {value:null, loaded:false, syncing:false, error:null, source:'profile-cache', updatedAt:null};
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const schema = () => window.LuviaPreferenceSchema;
  const profileState = () => window.LuviaProfileService?.snapshot?.() || {};
  const profile = () => profileState().profile || {};
  const normalize = input => schema()?.normalizePreferences?.(input || {}) || input || {};

  function snapshot() {
    const value = state.value || normalize(profile());
    return Object.freeze({...state, revision, value:clone(value)});
  }

  function emit(reason) {
    revision += 1;
    const next = snapshot();
    listeners.forEach(listener => {
      try { listener(next, reason); } catch (error) { console.warn('[LuviaUserPreferences]', error); }
    });
    window.dispatchEvent(new CustomEvent('luvia:user-preferences-changed', {detail:{reason, snapshot:next}}));
    return next;
  }

  function refresh(reason = 'profile') {
    const profileSnapshot = profileState();
    state = {
      value: normalize(profileSnapshot.profile || {}),
      loaded: Boolean(profileSnapshot.loaded),
      syncing: Boolean(profileSnapshot.syncing),
      error: profileSnapshot.error || null,
      source: profileSnapshot.loaded ? 'supabase-user_profiles' : 'profile-cache',
      updatedAt: profileSnapshot.profile?.preferencesUpdatedAt || profileSnapshot.lastSyncedAt || null
    };
    return emit(reason);
  }

  async function load(options = {}) {
    const force = options.force === true;
    const current = profileState();
    if (force || !current.loaded) {
      const client = await window.LuviaSupabaseService.start();
      await window.LuviaProfileService.load(client);
    } else {
      refresh('load-cache');
    }
    return get();
  }

  function get() {
    if (!state.value) state.value = normalize(profile());
    return clone(state.value);
  }

  function merge(current, patch = {}) {
    const familyPreferences = patch.familyPreferences || patch.family_preferences;
    const accessibilityPreferences = patch.accessibilityPreferences || patch.accessibility_preferences;
    return normalize({
      ...current,
      ...patch,
      familyPreferences: familyPreferences ? {...(current.familyPreferences || {}), ...familyPreferences} : current.familyPreferences,
      accessibilityPreferences: accessibilityPreferences ? {...(current.accessibilityPreferences || {}), ...accessibilityPreferences} : current.accessibilityPreferences,
      travelPreferences: {...(current.travelPreferences || {}), ...(patch.travelPreferences || patch.travel_preferences || {})}
    });
  }

  async function update(patch = {}, options = {}) {
    const current = get();
    const now = new Date().toISOString();
    const next = merge(current, {...patch, preferencesUpdatedAt:patch.preferencesUpdatedAt || patch.preferences_updated_at || now});
    state = {...state, value:next, syncing:true, error:null};
    emit(options.reason || 'saving');
    try {
      const saved = await window.LuviaProfileService.save(schema().toProfilePatch(next));
      state = {value:normalize(saved), loaded:true, syncing:false, error:null, source:'supabase-user_profiles', updatedAt:saved.preferencesUpdatedAt || now};
      emit(options.reason || 'saved');
      return get();
    } catch (error) {
      state = {value:current, loaded:true, syncing:false, error, source:'supabase-user_profiles', updatedAt:current.preferencesUpdatedAt || null};
      emit('save-failed');
      throw error;
    }
  }

  async function replaceCategory(category, value, options = {}) {
    const aliases = {
      dietary:'dietaryPreferences',
      interests:'travelInterests',
      styles:'travelStyles',
      activities:'activityPreferences',
      entertainment:'entertainmentPreferences',
      dining:'diningPreferences',
      mobility:'mobilityPreferences',
      atmosphere:'atmospherePreferences',
      pace:'travelPace',
      budget:'budgetPreference',
      family:'familyPreferences',
      accessibility:'accessibilityPreferences'
    };
    const key = aliases[category] || category;
    return update({[key]:value}, {...options, reason:options.reason || `replace:${key}`});
  }

  async function completeOnboarding(input = {}, options = {}) {
    const now = new Date().toISOString();
    const preferences = merge(get(), {...input, preferenceSchemaVersion:schema().profileVersion, preferencesCompletedAt:input.preferencesCompletedAt || input.preferences_completed_at || get().preferencesCompletedAt || now, preferencesUpdatedAt:now});
    return update(preferences, {...options, reason:options.reason || 'onboarding-completed'});
  }

  function getDiscoveryContext(domain, extra = {}) {
    const globalPreferences = get();
    return Object.freeze({
      domain,
      preferences:clone(globalPreferences),
      globalPreferences:clone(globalPreferences),
      searchOverrides:clone(extra.searchOverrides || {}),
      userId:profile().userId || null,
      source:'supabase-user_profiles',
      generatedAt:new Date().toISOString(),
      ...extra
    });
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') throw new Error('PREFERENCE_LISTENER_REQUIRED');
    listeners.add(listener);
    listener(snapshot(), 'subscribe');
    return () => listeners.delete(listener);
  }

  window.addEventListener('luvia:profile-changed', event => refresh(event.detail?.reason || 'profile-changed'));
  window.LuviaUserPreferences = Object.freeze({version:VERSION, schemaVersion:3, load, get, update, replaceCategory, completeOnboarding, getDiscoveryContext, snapshot, subscribe});
})();
