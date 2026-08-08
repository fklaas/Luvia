(() => {
  'use strict';
  const VERSION = '3.0.1';
  const KEY = 'luviaUserProfileCacheV3';
  const LEGACY_KEYS = ['luviaUserProfileCacheV2','luviaUserProfileCacheV1'];
  const listeners = new Set();
  let state = {profile:null,loaded:false,syncing:false,error:null,lastSyncedAt:null};
  const clone = value => value == null ? value : structuredClone(value);
  const authPreferences = user => user?.user_metadata?.luvia_preferences || user?.user_metadata?.travel_preferences || {};
  const schema = () => window.LuviaPreferenceSchema;
  const normalizedPreferences = input => schema()?.normalizePreferences?.(input || {}) || {dietaryPreferences:[],travelInterests:[],travelStyles:[],activityPreferences:[],entertainmentPreferences:[],diningPreferences:[],mobilityPreferences:[],atmospherePreferences:[],travelPace:'balanced',budgetPreference:'medium',familyPreferences:{needs:[]},accessibilityPreferences:{needs:[]},accessibilityNeeds:[],preferenceSchemaVersion:3,preferencesCompletedAt:null,preferencesUpdatedAt:null,travelPreferences:{pace:'balanced',budget:'medium',interests:[],travelStyles:[],activityPreferences:[],entertainmentPreferences:[],diningPreferences:[],mobilityPreferences:[],accessibilityNeeds:[],atmospherePreferences:[],preferenceVersion:3}};
  const preferencePatch = input => schema()?.toProfilePatch?.(input || {}) || normalizedPreferences(input);

  function defaults(user) {
    const prefs = normalizedPreferences(authPreferences(user));
    return {
      userId:user?.id||null,email:user?.email||'',displayName:user?.user_metadata?.display_name||user?.user_metadata?.full_name||user?.email?.split('@')[0]||'Luvia Reisende:r',firstName:user?.user_metadata?.first_name||'',lastName:user?.user_metadata?.last_name||'',avatarUrl:'',avatarColor:'#ee6f83',language:'de',timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'Europe/Berlin',homeLocation:'',
      ...preferencePatch(prefs),
      themeMode:'system',density:'comfortable',reducedMotion:false,useTripAccent:true,defaultView:'dashboard',showArchivedTrips:false,personalizedRecommendations:true,activityData:true,locationSharing:false,notifications:false,activeTripId:null,archivedTripIds:[],coverPreferences:{mode:'accent'},dashboardWidgets:[],createdAt:null,updatedAt:null
    };
  }

  function read() {
    try {
      const value = localStorage.getItem(KEY) || LEGACY_KEYS.map(key => localStorage.getItem(key)).find(Boolean);
      return value ? JSON.parse(value) : null;
    } catch { return null; }
  }
  function write(value) {
    try {
      localStorage.setItem(KEY, JSON.stringify(value));
      LEGACY_KEYS.forEach(key => localStorage.removeItem(key));
    } catch {}
  }
  const snap = () => Object.freeze({...state,profile:state.profile?clone(state.profile):null});
  function emit(reason) {
    const snapshot=snap();
    listeners.forEach(fn=>{try{fn(snapshot)}catch(error){console.warn('[LuviaProfile]',error)}});
    window.dispatchEvent(new CustomEvent('luvia:profile-changed',{detail:{...snapshot,reason}}));
    return snapshot;
  }

  function mapRow(row,user) {
    const base=defaults(user),settings=row?.settings||{};
    const cloudPreferences=preferencePatch(normalizedPreferences(row||{}));
    return {
      ...base,
      userId:row?.user_id||base.userId,email:user?.email||base.email,displayName:row?.display_name||base.displayName,firstName:row?.first_name||base.firstName,lastName:row?.last_name||base.lastName,avatarUrl:row?.avatar_url||'',avatarColor:row?.avatar_color||base.avatarColor,language:row?.language||base.language,timezone:row?.timezone||base.timezone,homeLocation:row?.home_location||'',
      ...cloudPreferences,
      themeMode:row?.theme_mode||settings.themeMode||base.themeMode,density:settings.density||base.density,reducedMotion:Boolean(settings.reducedMotion),useTripAccent:settings.useTripAccent!==false,defaultView:settings.defaultView||base.defaultView,showArchivedTrips:Boolean(settings.showArchivedTrips),personalizedRecommendations:settings.personalizedRecommendations!==false,activityData:settings.activityData!==false,locationSharing:Boolean(settings.locationSharing),notifications:Boolean(settings.notifications),activeTripId:row?.active_trip_id||null,archivedTripIds:settings.archivedTripIds||[],coverPreferences:settings.coverPreferences||base.coverPreferences,dashboardWidgets:Array.isArray(settings.dashboardWidgets)?settings.dashboardWidgets:base.dashboardWidgets,createdAt:row?.created_at||null,updatedAt:row?.updated_at||null
    };
  }

  function mergeProfile(base,patch={}) {
    const preferences=preferencePatch(normalizedPreferences({...base,...patch,travelPreferences:{...(base.travelPreferences||{}),...(patch.travelPreferences||{})},familyPreferences:{...(base.familyPreferences||{}),...(patch.familyPreferences||{})},accessibilityPreferences:{...(base.accessibilityPreferences||{}),...(patch.accessibilityPreferences||{})}}));
    return {...base,...patch,...preferences,updatedAt:new Date().toISOString()};
  }

  function rowPayload(profile) {
    const p=mergeProfile(defaults({id:profile.userId,email:profile.email,user_metadata:{}}),profile);
    return {
      p_display_name:p.displayName,
      p_first_name:p.firstName||null,
      p_last_name:p.lastName||null,
      p_avatar_url:p.avatarUrl||null,
      p_avatar_color:p.avatarColor||'#ee6f83',
      p_language:p.language||'de',
      p_timezone:p.timezone||'Europe/Berlin',
      p_home_location:p.homeLocation||null,
      p_dietary_preferences:p.dietaryPreferences||[],
      p_travel_interests:p.travelInterests||[],
      p_travel_styles:p.travelStyles||[],
      p_activity_preferences:p.activityPreferences||[],
      p_entertainment_preferences:p.entertainmentPreferences||[],
      p_dining_preferences:p.diningPreferences||[],
      p_mobility_preferences:p.mobilityPreferences||[],
      p_atmosphere_preferences:p.atmospherePreferences||[],
      p_travel_pace:p.travelPace||'balanced',
      p_budget_preference:p.budgetPreference||'medium',
      p_family_preferences:p.familyPreferences||{},
      p_accessibility_preferences:p.accessibilityPreferences||{},
      p_preference_schema_version:Number(p.preferenceSchemaVersion||3),
      p_preferences_completed_at:p.preferencesCompletedAt||null,
      p_preferences_updated_at:p.preferencesUpdatedAt||new Date().toISOString(),
      p_legacy_travel_preferences:p.travelPreferences||{},
      p_theme_mode:p.themeMode||'system',
      p_active_trip_id:p.activeTripId||null,
      p_settings:{density:p.density,reducedMotion:Boolean(p.reducedMotion),useTripAccent:p.useTripAccent!==false,defaultView:p.defaultView||'dashboard',showArchivedTrips:Boolean(p.showArchivedTrips),personalizedRecommendations:p.personalizedRecommendations!==false,activityData:p.activityData!==false,locationSharing:Boolean(p.locationSharing),notifications:Boolean(p.notifications),archivedTripIds:p.archivedTripIds||[],coverPreferences:p.coverPreferences||{mode:'accent'},dashboardWidgets:Array.isArray(p.dashboardWidgets)?p.dashboardWidgets:[]}
    };
  }

  const durableFingerprint=p=>JSON.stringify({avatarColor:p?.avatarColor||null,dietaryPreferences:p?.dietaryPreferences||[],travelInterests:p?.travelInterests||[],travelStyles:p?.travelStyles||[],activityPreferences:p?.activityPreferences||[],entertainmentPreferences:p?.entertainmentPreferences||[],diningPreferences:p?.diningPreferences||[],mobilityPreferences:p?.mobilityPreferences||[],atmospherePreferences:p?.atmospherePreferences||[],travelPace:p?.travelPace||null,budgetPreference:p?.budgetPreference||null,familyPreferences:p?.familyPreferences||{},accessibilityPreferences:p?.accessibilityPreferences||{},preferencesCompletedAt:p?.preferencesCompletedAt||null});
  async function fetchCloudProfile(client,user){const response=await client.rpc('luvia_get_my_profile');if(response.error)throw response.error;const row=Array.isArray(response.data)?response.data[0]:response.data;if(!row)throw new Error('PROFILE_CLOUD_ROW_MISSING');return mapRow(row,user);}
  function assertDurableRoundtrip(expected,actual){if(durableFingerprint(expected)!==durableFingerprint(actual)){const error=new Error('PROFILE_CLOUD_ROUNDTRIP_MISMATCH');error.expected=durableFingerprint(expected);error.actual=durableFingerprint(actual);throw error;}return true;}

  async function load(client) {
    const auth=window.ParisAuth.getState(),user=auth.user;
    if(!auth.authenticated||!user){state={profile:null,loaded:true,syncing:false,error:null,lastSyncedAt:null};return emit('signed-out');}
    const cached=read();
    state={...state,profile:mergeProfile(defaults(user),cached?.userId===user.id?cached:{}),syncing:true,error:null};
    emit('cache-loaded');
    try {
      state.profile=await fetchCloudProfile(client,user);state.loaded=true;state.syncing=false;state.lastSyncedAt=new Date().toISOString();write(state.profile);emit('cloud-loaded');
      const meta=normalizedPreferences(authPreferences(user));
      if(Number(state.profile.preferenceSchemaVersion||0)<3&&(meta.preferencesCompletedAt||meta.travelInterests.length||meta.dietaryPreferences.length)){
        try {
          const migrated=await client.rpc('luvia_upsert_my_profile_v2',rowPayload({...state.profile,...preferencePatch(meta)}));
          if(migrated.error)throw migrated.error;
          const migratedRow=Array.isArray(migrated.data)?migrated.data[0]:migrated.data;
          state.profile=mapRow(migratedRow,user);write(state.profile);emit('legacy-auth-preferences-migrated');
        } catch(error) { console.warn('[LuviaProfile] Legacy-Metadaten konnten noch nicht in das neue Cloud-Schema migriert werden.',error); }
      }
      return snap();
    } catch(error) {
      console.warn('[LuviaProfile] Cloud-Profil nicht verfügbar.',error);
      state.loaded=true;state.syncing=false;state.error=error;
      return emit('offline-cache');
    }
  }

  async function save(patch) {
    const client=await window.LuviaSupabaseService.start(),auth=window.ParisAuth.getState();
    if(!auth.authenticated)throw new Error('Bitte zuerst anmelden.');
    // Profile writes must never race ahead of the Supabase auth session. This was the
    // source of intermittent Reisekompass RLS failures after session/bootstrap changes.
    let session=(await client.auth.getSession()).data?.session||null;
    if(!session){session=(await client.auth.refreshSession()).data?.session||null;}
    if(!session?.user?.id)throw new Error('Deine Anmeldung wird noch synchronisiert. Bitte erneut speichern.');
    const previous=clone(state.profile||defaults(auth.user));
    const next=mergeProfile(previous,patch);
    state.profile=next;state.syncing=true;state.error=null;emit('saving');
    try {
      const response=await client.rpc('luvia_upsert_my_profile_v2',rowPayload(next));
      if(response.error)throw response.error;
      const row=Array.isArray(response.data)?response.data[0]:response.data;
      const rpcProfile=mapRow(row,auth.user);const verified=await fetchCloudProfile(client,auth.user);assertDurableRoundtrip(next,verified);state.profile=verified;state.syncing=false;state.error=null;state.lastSyncedAt=new Date().toISOString();write(state.profile);emit('saved-cloud-verified');
      return clone(state.profile);
    } catch(error) {
      state.profile=previous;state.syncing=false;state.error=error;write(previous);emit('save-failed');
      throw error;
    }
  }

  async function setActiveTrip(id){const p=await save({activeTripId:id||null});return p.activeTripId;}
  async function archiveTrip(id,archived=true){const set=new Set(state.profile?.archivedTripIds||[]);archived?set.add(id):set.delete(id);return save({archivedTripIds:[...set]});}
  function completion(){const p=state.profile||{},prefs=normalizedPreferences(p);const fields=[p.displayName,p.homeLocation,p.timezone,prefs.dietaryPreferences.length||1,prefs.travelInterests.length,prefs.travelStyles.length,prefs.activityPreferences.length,prefs.travelPace,prefs.budgetPreference];return Math.round(fields.filter(Boolean).length/fields.length*100);}
  window.LuviaProfileService=Object.freeze({version:VERSION,load,save,setActiveTrip,archiveTrip,completion,snapshot:snap,subscribe(fn){listeners.add(fn);fn(snap());return()=>listeners.delete(fn)}});
})();
