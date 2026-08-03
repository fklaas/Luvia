/* Build 13.17.0 – LuviaAI facade, planning, ranking and fallback */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
async function main(){
 const events=[];let fail=false;
 const window={dispatchEvent(event){events.push(event.type)},addEventListener(){},LuviaTripContext:{getActiveTrip(){return{id:'t1',title:'München',destination:{name:'München'}}}},LuviaUserPreferences:{get(){return{dietaryPreferences:['vegetarian'],travelStyles:['romantic']}}},LuviaTravelContext:{snapshot(){return{now:'2026-08-03T12:00:00Z',today:'2026-08-03',phase:'during'}}},LuviaScheduleIntelligence:{snapshot(){return{events:[]}}},LuviaTodayIntelligence:{snapshot(){return{status:'empty'}}},LuviaRecommendations:{snapshot(){return{}}},LuviaPlaceRuntime:{snapshot(){return{types:{}}}},LuviaAIMemory:{snapshot(){return{signals:[]}},learnFromEvent(){}}};
 const context=vm.createContext({window,console,Date,Math,Object,Array,Map,Set,WeakSet,JSON,String,Number,Boolean,Promise,performance:{now:()=>Date.now()},CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail}}});
 for(const file of ['core/ai/ai-capability-registry.js','core/ai/ai-model-router.js','core/ai/ai-policy-service.js','core/ai/ai-output-validator.js','core/ai/ai-tool-registry.js','core/ai/ai-context-service.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
 window.LuviaOpenAIProvider={async run(payload){if(fail)throw Object.assign(new Error('offline'),{code:'OFFLINE'});if(payload.capability==='discovery.plan')return{data:{result:{searchPlans:[{query:'romantisches vegetarisches Café',includedTypes:['cafe'],weight:1}],preferredSignals:['romantic'],mustHave:['correct_category'],excludedSignals:['night_club'],reasoningSummary:'passt',confidence:.9}},meta:{}};if(payload.capability==='discovery.rank')return{data:{result:{rankings:[{entityId:'a',score:94,confidence:.9,reasons:['ruhig'],unknowns:[]},{entityId:'b',score:60,confidence:.7,reasons:['nah'],unknowns:['atmosphere']}],summary:'geordnet'}},meta:{}};return{data:{result:{answer:'Hallo',suggestedActions:[]}},meta:{}}},async health(){return{ok:true}}};
 window.LuviaAIProposals={present:async value=>value,diagnostics(){return{confirmationRequired:true}}};
 vm.runInContext(fs.readFileSync('core/ai/ai-core.js','utf8'),context);
 const deterministic={id:'c1',domain:'places',moduleId:'accommodations',query:'Hotel',includedTypes:['lodging'],excludedTypes:['airport'],labels:{context:['romantic']}};
 const planned=await window.LuviaAI.planDiscovery('places',{contract:deterministic,answers:{context:['romantic']}});
 assert.strictEqual(planned.moduleId,'accommodations','AI changed hard module routing');
 assert.deepStrictEqual(Array.from(planned.includedTypes),['lodging'],'AI changed hard provider types');
 assert.strictEqual(planned.aiSearchPlans[0].query,'romantisches vegetarisches Café');
 assert.strictEqual(planned.mutatesGlobalProfile,false);
 const ranked=await window.LuviaAI.rankCandidates({domain:'places',contract:planned,candidates:[{id:'places/b',name:'B',discoveryScore:80},{id:'places/a',name:'A',discoveryScore:70}]});
 assert.strictEqual(ranked[0].providerPlaceId||ranked[0].id,'places/a');
 assert(ranked[0].aiMatchScore>ranked[1].aiMatchScore);
 fail=true;const fallback=await window.LuviaAI.run('dashboard.brief',{});assert.strictEqual(fallback.meta.fallback,true);
 assert(events.includes('luvia:ai-ready'));
 console.log('Central AI facade, hard-contract preservation, reranking and fallback: OK');
}
main().catch(error=>{console.error(error);process.exit(1)});
