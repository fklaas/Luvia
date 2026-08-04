const fs=require('fs'),path=require('path'),assert=require('assert');const root=path.resolve(__dirname,'..');const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const profile=read('core/profiles/profile-foundation.js');assert(profile.includes('LuviaUserPreferences.completeOnboarding'));
const places=read('modules/places-shell.js'),move=read('modules/move-shell.js');
for(const text of [places,move]){assert(text.includes('LuviaPlanningFoundation'));assert(text.includes('showBrowse'));assert(!text.includes('LuviaGuidedDiscovery'))}
console.log('Guided discovery integration superseded by Planning Foundation Reset');
