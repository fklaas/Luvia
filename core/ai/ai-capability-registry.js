(() => {
  'use strict';
  const VERSION='4.22.1';
  const entries=new Map();
  const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
  function register(definition={}){
    const id=String(definition.id||'').trim();
    if(!id)throw new Error('AI_CAPABILITY_ID_REQUIRED');
    const entry=Object.freeze({
      id,
      tier:definition.tier||'default',
      mode:definition.mode||'READ',
      schema:definition.schema||'assistant_response',
      tools:Object.freeze([...(definition.tools||[])]),
      timeoutMs:Number(definition.timeoutMs||20000),
      cacheTtlMs:Number(definition.cacheTtlMs||0),
      description:String(definition.description||'')
    });
    entries.set(id,entry);return entry;
  }
  [
    {id:'brain.ask',tier:'default',mode:'READ',schema:'assistant_response',tools:['trip.current','preferences.current','travel.context','journey.context','journey.evidence','memory.signals'],timeoutMs:30000,description:'Allgemeines kontextbezogenes Luvia-Gespräch.'},
    {id:'planning.dialogue',tier:'default',mode:'READ',schema:'planning_dialogue',tools:[],timeoutMs:15000,cacheTtlMs:0,description:'Zerlegt einen Planungswunsch, stellt höchstens eine gezielte Rückfrage und startet keine Recherche.'},
    {id:'discovery.plan',tier:'default',mode:'READ',schema:'discovery_plan',tools:['trip.current','preferences.current','travel.context','memory.signals'],cacheTtlMs:300000,description:'Erzeugt kontrollierte Suchstrategien aus Guided Discovery.'},
    {id:'discovery.rank',tier:'default',mode:'READ',schema:'candidate_ranking',tools:['trip.current','preferences.current','travel.context','memory.signals'],cacheTtlMs:180000,description:'Ordnet bereits fachlich validierte Providerkandidaten persönlich.'},
    {id:'dashboard.brief',tier:'default',mode:'READ',schema:'dashboard_brief',tools:['trip.current','preferences.current','travel.context','journey.context','journey.events','journey.reservations','journey.evidence','schedule.current','today.current','recommendations.current','memory.signals'],cacheTtlMs:300000,description:'Erstellt ein ehrliches Reisebriefing für das Dashboard.'},
    {id:'timeline.propose',tier:'deep',mode:'DRAFT',schema:'timeline_proposal',tools:['trip.current','preferences.current','travel.context','journey.context','journey.events','journey.reservations','journey.evidence','schedule.current','today.current','places.saved','memory.signals'],cacheTtlMs:0,description:'Bereitet bestätigungspflichtige Timeline-Änderungen vor.'},
    {id:'memory.extract',tier:'fast',mode:'DRAFT',schema:'memory_signals',tools:['preferences.current'],cacheTtlMs:0,description:'Leitet belegte Lernsignale aus Nutzerentscheidungen ab.'},
    {id:'memory.compose',tier:'default',mode:'DRAFT',schema:'memory_composition',tools:[],cacheTtlMs:0,description:'Erzeugt aus Reisebildern und belegtem Kontext gemeinsam Titel, Erinnerungstext, Caption und Highlights.'},
    {id:'text.summarize',tier:'fast',mode:'READ',schema:'summary',tools:[],cacheTtlMs:600000,description:'Kurze, kontrollierte Zusammenfassungen.'}
  ].forEach(register);
  function get(id){return entries.get(String(id||''))||null}
  function list(){return [...entries.values()].map(clone)}
  function diagnostics(){return{version:VERSION,count:entries.size,capabilities:list()}}
  window.LuviaAICapabilities=Object.freeze({version:VERSION,register,get,list,diagnostics});
})();
