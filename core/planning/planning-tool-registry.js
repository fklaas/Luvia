(() => {
  'use strict';
  const VERSION='4.21.0';
  const tools=new Map();
  function register(definition={}){
    if(!definition.id || typeof definition.execute!=='function') throw new Error('Planning tool requires id and execute');
    const normalized=Object.freeze({id:String(definition.id),domain:String(definition.domain||'general'),mode:definition.mode||'READ',legacyAdapter:Boolean(definition.legacyAdapter),description:String(definition.description||''),execute:definition.execute});
    tools.set(normalized.id,normalized); return normalized;
  }
  function has(id){return tools.has(id)}
  function describe(){return [...tools.values()].map(({execute,...tool})=>tool)}
  async function invoke(id,input={},context={}){const tool=tools.get(id); if(!tool) throw new Error(`Unknown planning tool: ${id}`); return tool.execute(input,context)}
  function registerCoreAdapters(){
    if(!has('journey.read')) register({id:'journey.read',domain:'journey',description:'Read compact journey context',execute:async(input)=>window.LuviaJourneyKnowledgeGraph?.load?.({force:Boolean(input?.force)})||null});
    if(!has('places.openCatalog')) register({id:'places.openCatalog',domain:'places',legacyAdapter:true,description:'Open the canonical legacy Places catalog on explicit request',execute:async()=>({ok:true,action:'open-catalog'})});
    if(!has('move.openCatalog')) register({id:'move.openCatalog',domain:'move',legacyAdapter:true,description:'Open the canonical legacy Move catalog on explicit request',execute:async()=>({ok:true,action:'open-catalog'})});
  }
  registerCoreAdapters();
  window.LuviaPlanningTools=Object.freeze({version:VERSION,register,has,describe,invoke,diagnostics:()=>({version:VERSION,count:tools.size,tools:describe()})});
})();
