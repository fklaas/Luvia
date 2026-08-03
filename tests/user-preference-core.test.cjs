/* Build 13.17.0 – runtime test for the central LuviaUserPreferences service */
const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
async function main(){
 const events={};
 let profile={userId:'user-a',dietaryPreferences:['vegetarian'],travelInterests:['culture'],travelStyles:[],activityPreferences:[],entertainmentPreferences:[],diningPreferences:[],mobilityPreferences:['rail'],atmospherePreferences:[],travelPace:'balanced',budgetPreference:'medium',familyPreferences:{needs:[]},accessibilityPreferences:{needs:['step_free']},preferenceSchemaVersion:3,preferencesCompletedAt:'2026-08-03T10:00:00Z',preferencesUpdatedAt:'2026-08-03T10:00:00Z'};
 let shouldFail=false; let savedPatch=null;
 const window={
  addEventListener(name,fn){events[name]=fn},dispatchEvent(){},
  LuviaProfileService:{snapshot(){return{profile,loaded:true,syncing:false,error:null,lastSyncedAt:profile.preferencesUpdatedAt}},async save(patch){savedPatch=patch;if(shouldFail)throw new Error('cloud down');profile={...profile,...patch};return profile;}},
  LuviaSupabaseService:{async start(){return{}}}
 };
 const context=vm.createContext({window,console,Date,Math,Object,Array,Set,Map,JSON,String,Number,Boolean,Intl,CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail}}});
 vm.runInContext(fs.readFileSync('core/preferences/preference-schema.js','utf8'),context);
 vm.runInContext(fs.readFileSync('core/preferences/user-preferences-service.js','utf8'),context);
 const api=window.LuviaUserPreferences;
 assert(api&&api.version==='3.0.0');
 assert.deepStrictEqual(Array.from(api.get().dietaryPreferences),['vegetarian']);
 await api.replaceCategory('mobility',['walking','cycling']);
 assert.deepStrictEqual(Array.from(savedPatch.mobilityPreferences),['walking','cycling']);
 const ctx=api.getDiscoveryContext('move',{searchOverrides:{mobilityPreferences:['taxi']}});
 assert.deepStrictEqual(Array.from(ctx.globalPreferences.mobilityPreferences),['walking','cycling']);
 assert.deepStrictEqual(Array.from(ctx.searchOverrides.mobilityPreferences),['taxi']);
 assert.deepStrictEqual(Array.from(api.get().mobilityPreferences),['walking','cycling'],'search override changed global profile');
 const before=api.get(); shouldFail=true;
 await assert.rejects(()=>api.update({dietaryPreferences:['vegan']}),/cloud down/);
 assert.deepStrictEqual(Array.from(api.get().dietaryPreferences),Array.from(before.dietaryPreferences),'failed cloud save was not rolled back');
 console.log('Central user preference runtime and rollback: OK');
}
main().catch(error=>{console.error(error);process.exit(1)});
