/* Build 13.16.1 – Guided Move domain and UI separation */
const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

async function main(){
 const places=fs.readFileSync('modules/places-shell.js','utf8');
 const move=fs.readFileSync('modules/move-shell.js','utf8');
 const mobility=fs.readFileSync('modules/mobility/mobility-module.js','utf8');
 const schema=fs.readFileSync('core/preferences/preference-schema.js','utf8');
 const registry=fs.readFileSync('core/modules/module-registry.js','utf8');
 const app=fs.readFileSync('app/app-shell.js','utf8');
 const index=fs.readFileSync('index.html','utf8');
 const sw=fs.readFileSync('sw.js','utf8');
 const css=fs.readFileSync('modules/move-shell.css','utf8');

 assert(!places.includes("mobility:{"),'mobility still appears as a Places hub tile');
 assert(!places.includes("payload.type==='mobility'"),'Places shell still routes Move entries');
 assert(move.includes('(options.payload?inferTile(options.payload):null)'),'Move opens a detail tile without a payload instead of showing its guided entry');
 for(const token of ["domain:'move'",'LuviaGuidedDiscovery','Direkt stöbern','An- & Abreise','Vor Ort','data-move-module','places-hub-grid','LuviaMobility?.configureView','LuviaMobility?.openPlace'])assert(move.includes(token),`Move shell missing ${token}`);
 for(const token of ['Wobei soll Move euch gerade helfen?','Wie möchtet ihr euch am Reiseziel bewegen?','Was ist euch unterwegs besonders wichtig?'])assert(schema.includes(token),`Move flow schema missing ${token}`);
 for(const tile of ['flights','rail','coaches','ferries','local','taxi','rental','parking'])assert(move.includes(`${tile}:{`),`Move tile missing: ${tile}`);
 assert(css.includes('.move-hub-grid'),'Move hub layout missing');
 assert(css.includes('.move-hub-tile'),'Move hub tile styling missing');
 assert(registry.includes("CORE_PLACE_MODULES=Object.freeze(['accommodations','restaurants','attractions','photo_spots','shopping','nature'])"),'Places domain still contains mobility');
 assert(registry.includes("CORE_MOVE_MODULES=Object.freeze(['mobility'])"),'Move domain does not own mobility');
 assert(registry.includes("domains:Object.freeze({places:CORE_PLACE_MODULES,move:CORE_MOVE_MODULES})"),'domain diagnostics missing');
 for(const token of ['data-view="places">📍 Places','data-view="move">🚉 Move',"show('move',{payload})",'LuviaMoveShell.mount','LuviaMoveShell.showHub'])assert(app.includes(token),`app shell missing ${token}`);
 for(const token of ['modules/move-shell.css','modules/move-shell.js','core/preferences/guided-discovery-sequence.js']){assert(index.includes(token),`index missing ${token}`);assert(sw.includes(token),`service worker missing ${token}`)}
 for(const token of ['LuviaPlaceExperience.moduleShell','LuviaPlaceExperience.discovery','LuviaPlaceUI.card','LuviaPlaceCollections.favoritePanel',"placeType:'mobility'",'SEARCH_PLANS','acceptsPlan','isMobilityPlace','displayNameFor'])assert(mobility.includes(token),`mobility module missing shared/core token ${token}`);
 assert(!mobility.includes('LuviaTravelContext.snapshot'),'Move search still overwrites destination distance with device distance');
 assert(!mobility.includes('Zur Timeline'),'Move still contains a Timeline CTA');
 assert(mobility.includes("'Fähren':[")&&mobility.includes("type:'ferry_service'"),'ferry-specific search plan missing');
 assert(mobility.includes("type:'train_ticket_office'"),'train service point type missing');
 assert(mobility.includes('Luvia zeigt bewusst keine fachfremden Treffer'),'strict empty state missing');

 // Runtime regression: normal navigation must mount the guided sequence, not a default category.
 const root={innerHTML:'',querySelectorAll(){return[]},querySelector(selector){return selector==='[data-move-guided]'?{}:null}};
 let guidedMount=null;
 const window={
  LuviaModuleRegistry:{isEnabled(){return true}},
  LuviaProfileService:{snapshot(){return{profile:{}}}},
  LuviaGuidedDiscovery:{mount(host,options){guidedMount={host,options}}}
 };
 const context=vm.createContext({window,console,requestAnimationFrame:fn=>fn(),CustomEvent:class{}});
 vm.runInContext(move,context,{filename:'modules/move-shell.js'});
 await window.LuviaMoveShell.mount(root,{id:'trip-1'},{});
 assert(root.innerHTML.includes('data-move-guided'),'Move guided host was not rendered on normal navigation');
 assert.strictEqual(guidedMount?.options?.domain,'move','Move did not mount the global guided sequence');
 assert(!root.innerHTML.includes('id="mobility-module"'),'Move opened a category without a user decision');
 console.log('Guided Move domain separation and shared Place Core conformance: OK');
}
main().catch(error=>{console.error(error);process.exit(1)});
