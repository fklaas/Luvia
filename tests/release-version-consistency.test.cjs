/* Build 13.16.1 – release, PWA and documentation consistency */
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const build='13.16.1',core='4.16.1',title='Global User Preference Persistence';
const must=[
 ['intelligence/kernel/version.js',build,core,title,'2026-08-03T18:35:00+02:00'],
 ['intelligence/runtime-config.json',build,core,title],
 ['index.html',`?v=${build}`,'core/preferences/user-preferences-service.js','core/preferences/guided-discovery-sequence.js'],
 ['sw.js',`luvia-shell-v${build}`,'core/preferences/user-preferences-service.js'],
 ['intelligence/pwa-service.js',`luvia-shell-v${build}`],
 ['app/public-entry.js',build,"domain: 'onboarding'",'state.registration.preferences'],
 ['auth/session.js','luvia_preferences','preference_schema_version','onboarding_completed_at'],
 ['core/profiles/profile-service.js','luvia_upsert_my_profile_v2','p_travel_interests','p_accessibility_preferences','save-failed'],
 ['core/profiles/profile-foundation.js',"['preferences','Vorlieben'",'LuviaUserPreferences.completeOnboarding'],
 ['core/preferences/preference-schema.js','PROFILE_VERSION = 3','toProfilePatch','buildMoveContract'],
 ['core/preferences/user-preferences-service.js','LuviaUserPreferences','replaceCategory','getDiscoveryContext'],
 ['modules/places-shell.js',core,"domain:'places'",'LuviaUserPreferences?.get'],
 ['modules/move-shell.js',core,"domain:'move'",'LuviaUserPreferences?.get'],
 ['modules/mobility/mobility-module.js',core,"placeType:'mobility'"],
 ['core/places/place-type-definitions.js',build,core,"type:'mobility'",'planning:false'],
 ['supabase/migrations/20260803_037_core_v4_16_1_global_user_preference_persistence.sql',build,core,'dietary_preferences text[]','on_auth_user_created_luvia_profile','auth.uid() = user_id'],
 ['RELEASE-v13.16.1.md',build,core,title],
 ['DEPLOYMENT-v13.16.1.md',build,'supabase db push','Kein supabase functions deploy erforderlich'],
 ['TEST-v13.16.1.md',build,'LuviaUserPreferences','Move ohne Timeline'],
 ['COMMIT-v13.16.1.txt','fix(profile): persist global travel preferences per user'],
 ['DELETED-FILES-v13.16.1.txt','Keine Dateien gelöscht'],
 ['00_UNBEDINGT_IMMER_LESEN_PLACES_ARCHITEKTUR.md','Build 13.16.1','LuviaUserPreferences']
];
const failures=[];
for(const [file,...tokens] of must){const full=path.join(root,file);if(!fs.existsSync(full)){failures.push(`${file}: Datei fehlt`);continue}const text=fs.readFileSync(full,'utf8');for(const token of tokens)if(!text.includes(token))failures.push(`${file}: ${token} fehlt`);}
const gatewayFiles=['supabase/functions/luvia-gateway/index.ts','supabase/functions/luvia-gateway/_shared/places.ts','supabase/functions/luvia-gateway/_shared/place-entities.ts'];
for(const file of gatewayFiles){const text=fs.readFileSync(path.join(root,file),'utf8');if(text.includes(build)||text.includes(core))failures.push(`${file}: Gateway wurde für den reinen Profilbuild unnötig versioniert`);}
const mobility=fs.readFileSync(path.join(root,'modules/mobility/mobility-module.js'),'utf8');
if(mobility.includes('Zur Timeline')||mobility.includes('openTimelineDialog')||mobility.includes('planned_at'))failures.push('Move: Timeline/Planning action is active');
if(failures.length){console.error(failures.join('\n'));process.exit(1)}
console.log('Release version consistency: OK');
