const fs=require('fs'),path=require('path'),assert=require('assert');const root=path.resolve(__dirname,'..');const move=fs.readFileSync(path.join(root,'modules/move-shell.js'),'utf8');
for(const token of ['LuviaPlanningFoundation',"surface:'move'",'LuviaMobility?.configureView','LuviaMobility?.openPlace','data-move-module'])assert(move.includes(token),`Move shell missing ${token}`);
for(const forbidden of ['LuviaGuidedDiscovery','LuviaConversationalDiscovery','LuviaAISearchEvidencePipeline.execute'])assert(!move.includes(forbidden),`Move shell still uses ${forbidden}`);
console.log('Move domain separation under planning reset: OK');
