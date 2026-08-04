(() => {
  'use strict';
  const VERSION='4.22.1';
  const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
  const text=(v,fallback='')=>String(v??fallback).trim();
  const list=(v,max=20)=>[...new Set((Array.isArray(v)?v:[]).map(x=>text(x)).filter(Boolean))].slice(0,max);
  const number=(v,min,max,fallback=0)=>{v=Number(v);return Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback};

  function planningDialogue(value={}){
    const item=x=>({key:text(x?.key),value:text(x?.value),label:text(x?.label)});
    const items=(v,max=20)=>(Array.isArray(v)?v:[]).slice(0,max).map(item).filter(x=>x.key&&x.label);
    const question=value.followUpQuestion&&value.followUpQuestion.text?{text:text(value.followUpQuestion.text),reason:text(value.followUpQuestion.reason),options:(Array.isArray(value.followUpQuestion.options)?value.followUpQuestion.options:[]).slice(0,5).map(option=>({label:text(option.label),value:text(option.value)})).filter(option=>option.label&&option.value),allowFreeText:value.followUpQuestion.allowFreeText!==false}:null;
    return{understanding:text(value.understanding),goals:(Array.isArray(value.goals)?value.goals:[]).slice(0,8).map(goal=>({type:text(goal.type,'open'),label:text(goal.label),hardConstraints:items(goal.hardConstraints,10),softPreferences:items(goal.softPreferences,10),timeWindow:goal.timeWindow?{label:text(goal.timeWindow.label),start:text(goal.timeWindow.start),end:text(goal.timeWindow.end),flexible:Boolean(goal.timeWindow.flexible)}:null,source:text(goal.source,'ai')})).filter(goal=>goal.label),hardConstraints:items(value.hardConstraints),softPreferences:items(value.softPreferences),followUpQuestion:question,summary:{headline:text(value.summary?.headline,'So habe ich euch verstanden'),intro:text(value.summary?.intro),goalLabels:list(value.summary?.goalLabels,8),hardLabels:list(value.summary?.hardLabels,10),softLabels:list(value.summary?.softLabels,10)},unknowns:list(value.unknowns,10),confidence:number(value.confidence,0,1,.5)}
  }
  function discoveryPlan(value={}){return{
    searchPlans:(Array.isArray(value.searchPlans)?value.searchPlans:[]).slice(0,6).map(plan=>({query:text(plan.query),includedTypes:list(plan.includedTypes,12),weight:number(plan.weight,0,1,1)})).filter(plan=>plan.query),
    preferredSignals:list(value.preferredSignals,20),mustHave:list(value.mustHave,20),excludedSignals:list(value.excludedSignals,20),
    reasoningSummary:text(value.reasoningSummary),confidence:number(value.confidence,0,1,.5)
  }}
  function ranking(value={}){return{rankings:(Array.isArray(value.rankings)?value.rankings:[]).slice(0,50).map(item=>({entityId:text(item.entityId),score:number(item.score,0,100,50),confidence:number(item.confidence,0,1,.5),reasons:list(item.reasons,6),unknowns:list(item.unknowns,6)})).filter(item=>item.entityId),summary:text(value.summary)}}
  function dashboard(value={}){return{headline:text(value.headline,'Eure Reise nimmt Form an.'),message:text(value.message,'Luvia verbindet eure Pläne, Vorlieben und den aktuellen Reisemoment.'),highlights:list(value.highlights,5),suggestedActions:(Array.isArray(value.suggestedActions)?value.suggestedActions:[]).slice(0,4).map(action=>({id:text(action.id),label:text(action.label),capability:text(action.capability),kind:text(action.kind,'refresh')})).filter(action=>action.label)}}
  function timeline(value={}){return{title:text(value.title,'Vorschlag für euren Reisetag'),explanation:text(value.explanation),changes:(Array.isArray(value.changes)?value.changes:[]).slice(0,10).map(change=>({action:text(change.action),eventId:text(change.eventId),date:text(change.date),time:text(change.time),title:text(change.title),durationMinutes:number(change.durationMinutes,15,720,90),reason:text(change.reason)})).filter(change=>['add','update','remove'].includes(change.action)),warnings:list(value.warnings,8),confidence:number(value.confidence,0,1,.5)}}
  function signals(value={}){return{signals:(Array.isArray(value.signals)?value.signals:[]).slice(0,8).map(signal=>({signalKey:text(signal.signalKey),category:text(signal.category,'general'),value:clone(signal.value||{}),confidence:number(signal.confidence,0,1,.5),evidence:text(signal.evidence)})).filter(signal=>signal.signalKey)}}
  function validate(schema,value){switch(schema){case'planning_dialogue':return planningDialogue(value);case'discovery_plan':return discoveryPlan(value);case'candidate_ranking':return ranking(value);case'dashboard_brief':return dashboard(value);case'timeline_proposal':return timeline(value);case'memory_signals':return signals(value);case'summary':return{summary:text(value?.summary||value)};default:return{answer:text(value?.answer||value?.message||value),suggestedActions:Array.isArray(value?.suggestedActions)?value.suggestedActions:[]}}}
  window.LuviaAIOutputValidator=Object.freeze({version:VERSION,validate,planningDialogue,discoveryPlan,ranking,dashboard,timeline,signals});
})();
