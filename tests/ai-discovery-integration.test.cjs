/* Build 13.17.0 – AI plans/ranks behind hard Google validation for Places and Move */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
async function main(){
 let rankInput=null;const window={LuviaAI:{async rankCandidates(input){rankInput=input;return input.candidates.map(place=>({...place,aiMatchScore:place.providerPlaceId==='valid'?95:10}))}},LuviaPlaces:{async textSearch(query){assert(['romantic hotel','quiet resort'].includes(query));return{data:{places:[{id:'places/valid',primaryType:'lodging',types:['lodging'],rating:4.6,userRatingCount:200},{id:'places/airport',primaryType:'airport',types:['airport'],rating:5,userRatingCount:1000}]}}}}};
 const context=vm.createContext({window,console,Date,Math,Object,Array,Set,Map,JSON,String,Number,Boolean,Promise});
 vm.runInContext(fs.readFileSync('core/preferences/discovery-contract-service.js','utf8'),context);
 const contract={id:'ai-hotel',domain:'places',query:'Hotel',includedTypes:['lodging'],excludedTypes:['airport'],strictTypeFiltering:true,strictDestination:false,searchMode:'text',aiSearchPlans:[{query:'romantic hotel',includedTypes:['lodging']},{query:'quiet resort',includedTypes:['lodging']}]};
 const result=await window.LuviaDiscoveryContracts.search({contract,destination:{name:'München'}});
 assert.deepStrictEqual(Array.from(result.data.places,p=>p.providerPlaceId),['valid']);
 assert.strictEqual(rankInput.candidates.length,1,'invalid provider candidate reached AI reranker');
 assert.strictEqual(result.meta.strategies.aiPlanned,true);
 assert.strictEqual(result.meta.strategies.aiRanked,true);
 const places=fs.readFileSync('modules/places-shell.js','utf8'),move=fs.readFileSync('modules/move-shell.js','utf8');
 assert(places.includes("planDiscovery('places'")&&move.includes("planDiscovery('move'"));
 assert(!fs.readFileSync('modules/mobility/mobility-module.js','utf8').includes('Zur Timeline'));
 console.log('AI Discovery integrates after strict validation in Places and Move: OK');
}
main().catch(error=>{console.error(error);process.exit(1)});
