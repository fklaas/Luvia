/* Build 13.16.2 – release, PWA and documentation consistency */
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const build='13.16.2',core='4.16.2',title='Guided Travel Canvas Focus Mode';
const must=[
 ['intelligence/kernel/version.js',build,core,title,'2026-08-03T19:25:00+02:00'],
 ['intelligence/runtime-config.json',build,core,title],
 ['index.html',`?v=${build}`,'core/preferences/user-preferences-service.js','core/preferences/guided-discovery-sequence.js'],
 ['sw.js',`luvia-shell-v${build}`,'core/preferences/guided-discovery-sequence.css','modules/places-shell.css','modules/move-shell.css'],
 ['intelligence/pwa-service.js',`luvia-shell-v${build}`,core],
 ['force-update.html',`appv=${build}`],
 ['core/preferences/guided-discovery-sequence.js','1.2.0','updateMultiSelectionUI','suspendUnderlyingSurface'],
 ['core/preferences/guided-discovery-sequence.css','Smooth composite-only atmosphere','gds-cloud-shape'],
 ['core/preferences/preference-schema.js','3.1.0','preferenceLayers','mutatesGlobalProfile: false'],
 ['core/preferences/discovery-contract-service.js','1.2.0','globales Reiseprofil'],
 ['core/profiles/profile-foundation.js',build,core,'Dein globaler Reisekompass','Aktueller Reisemoment'],
 ['core/profiles/profile-foundation.css','Global travel compass & layered preferences','pf-overlay.is-guided-suspended'],
 ['core/places/place-experience-shell.js',core],
 ['modules/places-shell.js',core,"domain:'places'",'hideBrowse:true','data-guided-open-catalog'],
 ['modules/move-shell.js',core,"domain:'move'",'hideBrowse:true','data-guided-open-catalog'],
 ['modules/places-shell.css','Guided travel canvas & focused suggestion mode','is-guided-results'],
 ['modules/move-shell.css','Move story canvas'],
 ['modules/mobility/mobility-module.js',core,"placeType:'mobility'"],
 ['core/places/place-type-definitions.js',build,core,"type:'mobility'",'planning:false'],
 ['RELEASE-v13.16.2.md',build,core,title],
 ['DEPLOYMENT-v13.16.2.md',build,'Keine neue Datenbankmigration','Kein supabase functions deploy erforderlich'],
 ['TEST-v13.16.2.md',build,'Browser-Laufzeittest','Move ohne Timeline'],
 ['COMMIT-v13.16.2.txt','feat(discovery): turn Places and Move into guided travel canvases'],
 ['DELETED-FILES-v13.16.2.txt','Keine Dateien gelöscht'],
 ['CHANGED-FILES-v13.16.2.txt','core/preferences/guided-discovery-sequence.js','modules/places-shell.js'],
 ['00_UNBEDINGT_IMMER_LESEN_PLACES_ARCHITEKTUR.md','Build 13.16.2','Fokussierter Vorschlagsmodus']
];
const failures=[];
for(const [file,...tokens] of must){const full=path.join(root,file);if(!fs.existsSync(full)){failures.push(`${file}: Datei fehlt`);continue}const text=fs.readFileSync(full,'utf8');for(const token of tokens)if(!text.includes(token))failures.push(`${file}: ${token} fehlt`);}
const migration=fs.readFileSync(path.join(root,'supabase/migrations/20260803_037_core_v4_16_1_global_user_preference_persistence.sql'),'utf8');
if(!migration.includes('13.16.1')||!migration.includes('4.16.1'))failures.push('Historische Preference-Migration wurde unzulässig auf 13.16.2 umversioniert');
const gatewayFiles=['supabase/functions/luvia-gateway/index.ts','supabase/functions/luvia-gateway/_shared/places.ts','supabase/functions/luvia-gateway/_shared/place-entities.ts'];
for(const file of gatewayFiles){const text=fs.readFileSync(path.join(root,file),'utf8');if(text.includes(build)||text.includes(core))failures.push(`${file}: Gateway wurde für den UI-Build unnötig versioniert`);}
const mobility=fs.readFileSync(path.join(root,'modules/mobility/mobility-module.js'),'utf8');
if(mobility.includes('Zur Timeline')||mobility.includes('openTimelineDialog')||mobility.includes('planned_at'))failures.push('Move: Timeline/Planning action is active');
if(failures.length){console.error(failures.join('\n'));process.exit(1)}
console.log('Release version consistency: OK');
