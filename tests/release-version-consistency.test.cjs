/* Build 13.17.0 – Luvia Brain release, PWA and documentation consistency */
const fs=require('fs');
const path=require('path');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const build='13.17.0',core='4.17.0',title='Luvia Brain Foundation';
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const must=[
 ['intelligence/kernel/version.js',build,core,title,'2026-08-03T20:26:00+02:00'],
 ['intelligence/runtime-config.json',build,core,title,'"ai": true','provider-independent-luvia-brain'],
 ['index.html',`?v=${build}`,'core/ai/ai-core.js','core/ai/ai-dashboard-service.js','core/ai/ai-brain.css'],
 ['sw.js',`luvia-shell-v${build}`,'core/ai/ai-core.js','core/ai/ai-brain.css'],
 ['intelligence/pwa-service.js',`luvia-shell-v${build}`,core],
 ['force-update.html',`appv=${build}`],
 ['core/ai/ai-core.js',core,'planDiscovery','rankCandidates','proposeAction'],
 ['core/ai/ai-capability-registry.js','discovery.plan','dashboard.brief','timeline.propose','memory.extract'],
 ['core/ai/ai-policy-service.js','confirmation-required','sanitize'],
 ['core/ai/ai-memory-service.js','confirmSignal','dismissSignal','explicit-confirmation-only'],
 ['core/profiles/profile-foundation.js','Luvias lernendes Gedächtnis','data-pf-ai-confirm','data-pf-ai-dismiss'],
 ['core/ai/ai-command-proposal-service.js','AI_CONFIRMATION_REQUIRED','timeline.batch'],
 ['core/preferences/discovery-contract-service.js','1.3.0','aiSearchPlans','rankCandidates'],
 ['modules/places-shell.js',core,"planDiscovery('places'"],
 ['modules/move-shell.js',core,"planDiscovery('move'"],
 ['supabase/functions/luvia-intelligence/index.ts',build,core,'brain.run','brain.health'],
 ['supabase/functions/luvia-intelligence/providers/openai.ts','gpt-5.6-luna','gpt-5.6-terra','gpt-5.6-sol','store:false'],
 ['supabase/migrations/20260803_038_core_v4_17_0_luvia_brain_foundation.sql','ai_learning_signals','ai_action_proposals','ai_usage_events','auth.uid() = user_id'],
 ['RELEASE-v13.17.0.md',build,core,title],
 ['DEPLOYMENT-v13.17.0.md','supabase db push','supabase functions deploy luvia-intelligence','OPENAI_API_KEY'],
 ['TEST-v13.17.0.md',build,'Luvia Brain','Live-Tests'],
 ['LUVIA-AI-SETUP-v13.17.0.md','Schritt 1','OPENAI_API_KEY','force-update.html'],
 ['COMMIT-v13.17.0.txt','feat(ai): establish Luvia Brain as central app intelligence'],
 ['DELETED-FILES-v13.17.0.txt','Keine Dateien gelöscht'],
 ['CHANGED-FILES-v13.17.0.txt','core/ai/ai-core.js','supabase/functions/luvia-intelligence/index.ts']
];
const failures=[];
for(const [file,...tokens] of must){const full=path.join(root,file);if(!fs.existsSync(full)){failures.push(`${file}: Datei fehlt`);continue}const text=fs.readFileSync(full,'utf8');for(const token of tokens)if(!text.includes(token))failures.push(`${file}: ${token} fehlt`)}
assert(!read('modules/mobility/mobility-module.js').includes('Zur Timeline'),'Move Timeline CTA reintroduced');
assert(read('supabase/config.toml').includes('[functions.luvia-intelligence]'),'intelligence function config missing');
if(failures.length){console.error(failures.join('\n'));process.exit(1)}
console.log('Luvia Brain release version consistency: OK');
