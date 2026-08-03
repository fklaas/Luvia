/* Build 13.17.0 – dynamic Supabase payload and rollback test */
const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
async function main(){
 const storage=new Map(); let fail=false; let lastRpc=null;
 const user={id:'11111111-1111-1111-1111-111111111111',email:'fabian@example.test',user_metadata:{display_name:'Fabian'}};
 const client={async rpc(name,payload){lastRpc={name,payload};if(fail)return{data:null,error:new Error('rpc failed')};return{error:null,data:{user_id:user.id,display_name:payload.p_display_name,dietary_preferences:payload.p_dietary_preferences,travel_interests:payload.p_travel_interests,travel_styles:payload.p_travel_styles,activity_preferences:payload.p_activity_preferences,entertainment_preferences:payload.p_entertainment_preferences,dining_preferences:payload.p_dining_preferences,mobility_preferences:payload.p_mobility_preferences,atmosphere_preferences:payload.p_atmosphere_preferences,travel_pace:payload.p_travel_pace,budget_preference:payload.p_budget_preference,family_preferences:payload.p_family_preferences,accessibility_preferences:payload.p_accessibility_preferences,preference_schema_version:payload.p_preference_schema_version,preferences_completed_at:payload.p_preferences_completed_at,preferences_updated_at:payload.p_preferences_updated_at,settings:payload.p_settings,theme_mode:payload.p_theme_mode}}}};
 const window={dispatchEvent(){},ParisAuth:{getState(){return{authenticated:true,user}}},LuviaSupabaseService:{async start(){return client}}};
 const context=vm.createContext({window,console,Date,Math,Object,Array,Set,Map,JSON,String,Number,Boolean,Intl,structuredClone,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail}}});
 vm.runInContext(fs.readFileSync('core/preferences/preference-schema.js','utf8'),context);
 vm.runInContext(fs.readFileSync('core/profiles/profile-service.js','utf8'),context);
 const api=window.LuviaProfileService;
 const completed='2026-08-03T12:00:00.000Z';
 await api.save({displayName:'Fabian',dietaryPreferences:['vegetarian'],travelInterests:['culture'],travelStyles:['romantic'],activityPreferences:['outdoor'],entertainmentPreferences:['live_music'],diningPreferences:['cafe'],mobilityPreferences:['rail'],atmospherePreferences:['relaxed'],travelPace:'relaxed',budgetPreference:'medium',familyPreferences:{needs:['baby']},accessibilityPreferences:{needs:['step_free']},preferenceSchemaVersion:3,preferencesCompletedAt:completed});
 assert.strictEqual(lastRpc.name,'luvia_upsert_my_profile_v2');
 const payload=lastRpc.payload;
 for(const key of ['p_dietary_preferences','p_travel_interests','p_travel_styles','p_activity_preferences','p_entertainment_preferences','p_dining_preferences','p_mobility_preferences','p_atmosphere_preferences','p_travel_pace','p_budget_preference','p_family_preferences','p_accessibility_preferences','p_preference_schema_version','p_preferences_completed_at','p_preferences_updated_at'])assert(Object.prototype.hasOwnProperty.call(payload,key),`RPC payload missing ${key}`);
 assert.deepStrictEqual(Array.from(payload.p_dietary_preferences),['vegetarian']);
 assert.strictEqual(payload.p_preference_schema_version,3);
 const before=api.snapshot().profile; fail=true;
 await assert.rejects(()=>api.save({dietaryPreferences:['vegan']}),/rpc failed/);
 assert.deepStrictEqual(Array.from(api.snapshot().profile.dietaryPreferences),Array.from(before.dietaryPreferences),'profile cache did not roll back after RPC failure');
 console.log('Profile Supabase payload and rollback: OK');
}
main().catch(error=>{console.error(error);process.exit(1)});
