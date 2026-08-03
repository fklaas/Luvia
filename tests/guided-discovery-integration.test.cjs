/* Build 13.16.1 – registration, profile, Places and Move integration */
const fs=require('fs');
const assert=require('assert');
const read=file=>fs.readFileSync(file,'utf8');
const index=read('index.html'),sw=read('sw.js'),entry=read('app/public-entry.js'),session=read('auth/session.js'),profile=read('core/profiles/profile-foundation.js'),profileService=read('core/profiles/profile-service.js'),userPrefs=read('core/preferences/user-preferences-service.js'),places=read('modules/places-shell.js'),move=read('modules/move-shell.js'),mobility=read('modules/mobility/mobility-module.js'),css=read('core/preferences/guided-discovery-sequence.css'),guided=read('core/preferences/guided-discovery-sequence.js'),migration=read('supabase/migrations/20260803_037_core_v4_16_1_global_user_preference_persistence.sql');
for(const asset of ['core/preferences/preference-schema.js','core/preferences/user-preferences-service.js','core/preferences/discovery-contract-service.js','core/preferences/guided-discovery-sequence.js','core/preferences/guided-discovery-sequence.css']){assert(index.includes(asset),`index missing ${asset}`);assert(sw.includes(asset),`service worker missing ${asset}`)}
for(const token of ["domain: 'onboarding'",'state.registration.preferences','preferences: state.registration.preferences'])assert(entry.includes(token),`registration missing ${token}`);
for(const token of ['luvia_preferences','preference_schema_version','onboarding_completed_at'])assert(session.includes(token),`auth metadata missing ${token}`);
for(const token of ["['preferences','Vorlieben'",'LuviaGuidedDiscovery?.open',"domain:'profile'",'LuviaUserPreferences.completeOnboarding'])assert(profile.includes(token),`profile preference center missing ${token}`);
for(const token of ['luvia_upsert_my_profile_v2','p_dietary_preferences','p_travel_interests','p_mobility_preferences','p_accessibility_preferences','save-failed'])assert(profileService.includes(token),`cloud preference persistence missing ${token}`);
for(const token of ['load','update','replaceCategory','completeOnboarding','getDiscoveryContext','supabase-user_profiles'])assert(userPrefs.includes(token),`central preference core missing ${token}`);
for(const token of ["domain:'places'",'LuviaGuidedDiscovery','Direkt stöbern','LuviaUserPreferences?.get'])assert(places.includes(token),`Places guided flow missing ${token}`);
for(const token of ["domain:'move'",'LuviaGuidedDiscovery','Direkt stöbern','LuviaUserPreferences?.get'])assert(move.includes(token),`Move guided flow missing ${token}`);
for(const token of ['dietary_preferences text[]','travel_interests text[]','mobility_preferences text[]','accessibility_preferences jsonb','on_auth_user_created_luvia_profile','auth.uid() = user_id'])assert(migration.includes(token),`migration missing ${token}`);
assert(!mobility.includes('Zur Timeline'),'Move Timeline CTA reintroduced');
assert(!mobility.includes('openTimelineDialog'),'Move global Timeline action reintroduced');
for(const token of ['gds-cloud','gds-flight-track','gds-plane','prefers-reduced-motion','gds-profile-hint'])assert(css.includes(token),`guided visual language missing ${token}`);
for(const token of ['pointermove','touchstart','navigator.vibrate','is-confirmed','Mehr entdecken','sessionStorage','Cloud-Speicherung fehlgeschlagen'])assert(guided.includes(token),`guided sequence behavior missing ${token}`);
console.log('Guided Discovery registration/profile/Places/Move integration: OK');
