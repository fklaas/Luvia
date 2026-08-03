/* Build 13.17.0 – minimum necessary context and write policy */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
async function main(){
 const window={dispatchEvent(){},LuviaAICapabilities:null,LuviaTripContext:{getActiveTrip(){return{id:'trip-a',title:'Paris',email:'hidden@test',destination:{name:'Paris',country:'Frankreich'},startDate:'2026-08-01',endDate:'2026-08-04',participants:[1,2]}}},LuviaUserPreferences:{get(){return{dietaryPreferences:['vegetarian'],email:'hidden@test'}}},LuviaTravelContext:{snapshot(){return{now:'2026-08-03T12:00:00Z',today:'2026-08-03',phase:'during',location:{latitude:48.85,longitude:2.35,accuracy:30,address_exact:'secret'}}}},LuviaAIMemory:{snapshot(){return{signals:[{signal_key:'quiet_cafes',confidence:.8}]}}},LuviaScheduleIntelligence:{snapshot(){return{events:[{id:'e1',title:'Museum',date:'2026-08-03',time:'11:00',booking_number:'secret'}]}}},LuviaTodayIntelligence:{snapshot(){return{status:'ready',conflicts:[]}}},LuviaRecommendations:{snapshot(){return{lastEvents:[]}}},LuviaPlaceRuntime:{snapshot(){return{types:{restaurant:{records:[{providerPlaceId:'p1',status:'favorite',isFavorite:true,entity:{name:'Café',email:'secret'}}]}}}}}};
 const context=vm.createContext({window,console,Date,Object,Array,Map,Set,WeakSet,JSON,String,Number,Boolean,Promise,CustomEvent:class{}});
 for(const file of ['core/ai/ai-capability-registry.js','core/ai/ai-policy-service.js','core/ai/ai-tool-registry.js','core/ai/ai-context-service.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
 const clean=window.LuviaAIPolicy.sanitize({email:'a@b',token:'x',nested:{phone:'1',safe:'yes'}});
 assert.deepStrictEqual(JSON.parse(JSON.stringify(clean)),{nested:{safe:'yes'}});
 const assembled=await window.LuviaAIContext.assemble('dashboard.brief',{currentMoment:{surface:'dashboard'}});
 const serialized=JSON.stringify(assembled);
 assert(serialized.includes('vegetarian')&&serialized.includes('Museum'),'required context missing');
 for(const secret of ['hidden@test','booking_number','address_exact','secret'])assert(!serialized.includes(secret),`private field leaked: ${secret}`);
 assert.strictEqual(window.LuviaAIPolicy.canExecute({actionType:'timeline.add'},{confirmed:false}),false);
 assert.strictEqual(window.LuviaAIPolicy.canExecute({actionType:'timeline.add'},{confirmed:true}),true);
 console.log('AI minimum-context privacy and confirmation policy: OK');
}
main().catch(error=>{console.error(error);process.exit(1)});
