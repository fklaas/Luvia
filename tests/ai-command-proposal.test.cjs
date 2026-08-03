/* Build 13.17.0 – draft/confirm/execute command safety */
const fs=require('fs'),vm=require('vm'),assert=require('assert');
async function main(){
 const statuses=[],events=[];
 const query={update(){return this},eq(){return this},select(){return this},async single(){return{data:{id:'p1',status:'executed'},error:null}}};
 const client={from(){return query}};
 const window={dispatchEvent(){},ParisAuth:{getState(){return{user:{id:'u1'}}}},LuviaTripContext:{getActiveTrip(){return{id:'t1'}}},LuviaSupabaseService:{async start(){return client}},LuviaAIPolicy:{sanitize:value=>value},LuviaScheduleIntelligence:{upsertEvent(event){events.push(['upsert',event])},removeEvent(id){events.push(['remove',id])}},LuviaUIKit:{toast(){}},addEventListener(){}};
 const context=vm.createContext({window,console,Date,Object,Array,Map,Set,JSON,String,Number,Boolean,Promise,crypto:{randomUUID:()=>`id-${events.length}`},document:{},CustomEvent:class{}});
 vm.runInContext(fs.readFileSync('core/ai/ai-command-proposal-service.js','utf8'),context);
 const proposal={id:'p1',action_payload:{changes:[{action:'add',date:'2026-08-03',time:'12:00',title:'Café',durationMinutes:60},{action:'remove',eventId:'old'}]}};
 await assert.rejects(()=>window.LuviaAIProposals.execute(proposal,{confirmed:false}),/AI_CONFIRMATION_REQUIRED/);
 await window.LuviaAIProposals.execute(proposal,{confirmed:true});
 assert.deepStrictEqual(events.map(item=>item[0]),['upsert','remove']);
 console.log('AI action proposals require confirmation before Core execution: OK');
}
main().catch(error=>{console.error(error);process.exit(1)});
