(() => {
  'use strict';
  const VERSION='4.22.1';
  const inFlight=new Map();
  const cooldown=new Map();
  const clone=value=>JSON.parse(JSON.stringify(value??null));
  const text=value=>String(value||'').trim();
  const has=(source,words)=>words.some(word=>source.includes(word));
  const toMap=items=>Object.fromEntries((items||[]).filter(x=>x?.key).map(x=>[x.key,x.value]));
  const labels=items=>(items||[]).map(x=>x?.label).filter(Boolean);
  function localDecompose(input={}){
    const phrase=text(input.userGoal).toLowerCase(),surface=input.surface||'places',goals=[],hard=[],soft=[];
    if(surface==='move'){
      goals.push({type:'route',label:text(input.userGoal)||'Eine passende Verbindung planen',hardConstraints:[],softPreferences:[],timeWindow:null,source:'user'});
      if(has(phrase,['wenig laufen','kurzer fußweg','wenig fußweg']))hard.push({key:'maxWalking',value:'low',label:'Wenig Fußweg'});
      if(has(phrase,['wenig umsteigen','ohne umsteigen']))hard.push({key:'maxTransfers',value:has(phrase,['ohne umsteigen'])?'0':'1',label:has(phrase,['ohne umsteigen'])?'Ohne Umsteigen':'Höchstens einmal umsteigen'});
      if(has(phrase,['schnell','schnellste']))soft.push({key:'priority',value:'speed',label:'Möglichst schnell'});else if(has(phrase,['günstig','billig']))soft.push({key:'priority',value:'cost',label:'Möglichst günstig'});else if(has(phrase,['entspannt','komfortabel']))soft.push({key:'priority',value:'comfort',label:'Möglichst entspannt'});
    }else{
      if(has(phrase,['essen','restaurant','frühstück','mittag','abendessen','café','cafe']))goals.push({type:'meal',label:has(phrase,['vegetar'])?'Vegetarisch essen':'Essen gehen',hardConstraints:has(phrase,['vegetar'])?[{key:'dietary',value:'vegetarian',label:'Vegetarisch'}]:[],softPreferences:[],timeWindow:null,source:'user'});
      if(has(phrase,['vegetar']))hard.push({key:'dietary',value:'vegetarian',label:'Vegetarisch'});
      if(has(phrase,['indoor','museum','aktivität','erleben','unternehmen','ausflug','spazieren','park']))goals.push({type:'activity',label:has(phrase,['indoor'])?'Eine Indoor-Aktivität erleben':has(phrase,['spazieren'])?'Schön spazieren gehen':'Etwas erleben',hardConstraints:has(phrase,['indoor'])?[{key:'environment',value:'indoor',label:'Indoor'}]:[],softPreferences:[],timeWindow:null,source:'user'});
      if(has(phrase,['kind','livi','baby','kinderwagen']))hard.push({key:'familyContext',value:'true',label:'Mit Kind geeignet'});
      if(has(phrase,['nicht weit','kurze wege','in der nähe','nah']))hard.push({key:'travelDistance',value:'short',label:'Kurze Wege'});
      if(has(phrase,['ruhig','entspannt']))soft.push({key:'atmosphere',value:'calm',label:'Entspannte Atmosphäre'});
      if(has(phrase,['besonders','außergewöhnlich','nicht jeder tourist']))soft.push({key:'character',value:'special',label:'Etwas Besonderes'});
      if(!goals.length)goals.push({type:'open',label:text(input.userGoal)||'Reisemoment planen',hardConstraints:[],softPreferences:[],timeWindow:null,source:'user'});
    }
    let followUpQuestion=null;
    if(surface==='move'&&!has(phrase,['nach ',' zum ',' zur ',' von ']))followUpQuestion={text:'Wohin möchtet ihr fahren oder gehen?',reason:'Für eine Verbindung braucht Luvia ein Ziel.',options:[],allowFreeText:true};
    else if(surface==='move'&&!soft.some(x=>x.key==='priority'))followUpQuestion={text:'Was ist euch für diesen Weg am wichtigsten?',reason:'Damit Luvia die späteren Verbindungen passend vergleichen kann.',options:[{label:'Möglichst entspannt',value:'comfort'},{label:'Möglichst schnell',value:'speed'},{label:'Möglichst günstig',value:'cost'}],allowFreeText:true};
    const goalLabels=goals.map(g=>g.label);
    return{understanding:text(input.userGoal),goals,hardConstraints:hard,softPreferences:soft,followUpQuestion,summary:{headline:surface==='move'?'So habe ich euren Weg verstanden':'So habe ich euren Plan verstanden',intro:surface==='move'?'Luvia bereitet einen klaren Mobilitätsauftrag vor.':'Luvia hat euren Wunsch in konkrete Planungsziele zerlegt.',goalLabels,hardLabels:labels(hard),softLabels:labels(soft)},unknowns:followUpQuestion?[followUpQuestion.reason]:[],confidence:.66,source:'local_fallback',aiAvailable:false,errorCode:null};
  }
  function compactPreferences(value={}){const out={};for(const [k,v] of Object.entries(value||{}).slice(0,30)){if(['string','number','boolean'].includes(typeof v))out[k]=v;else if(Array.isArray(v))out[k]=v.slice(0,12).map(String)}return out}
  function compactContext(session={},trip={}){return{surface:session.surface,userGoal:text(session.userGoal).slice(0,800),answers:clone(session.preferenceLayers?.session||{}),destination:trip?.destination?.name||trip?.destination?.formattedAddress||trip?.name||'',participants:(session.participants||[]).slice(0,6).map(p=>({name:p.name||p.displayName||'',role:p.role||''})),globalPreferences:compactPreferences(session.preferenceLayers?.globalProfile||{}),tripPreferences:compactPreferences(session.preferenceLayers?.trip||{})}}
  function signature(payload){const s=JSON.stringify(payload);let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(36)}
  async function analyze(session,trip={}){
    const payload=compactContext(session,trip),local=localDecompose(payload),key=signature(payload),blocked=cooldown.get(key);
    if(blocked&&blocked>Date.now())return{...local,errorCode:'PLANNING_AI_COOLDOWN'};
    if(inFlight.has(key))return inFlight.get(key);
    const task=(async()=>{
      if(!window.LuviaAI?.run)return local;
      try{const response=await window.LuviaAI.run('planning.dialogue',payload,{fallback:false});return{...(response?.data||local),source:'ai',aiAvailable:true,errorCode:null}}
      catch(error){cooldown.set(key,Date.now()+15000);return{...local,source:'local_fallback',aiAvailable:false,errorCode:error?.code||'PLANNING_AI_FAILED'}}
      finally{inFlight.delete(key)}
    })();inFlight.set(key,task);return task;
  }
  function impulses(surface,trip={},preferences={}){const destination=trip?.destination?.name||trip?.destination?.formattedAddress||trip?.name||'eurer Reise',dietary=JSON.stringify(preferences).toLowerCase().includes('vegetar');if(surface==='move')return['Zum nächsten geplanten Ort – möglichst entspannt',`Von der Unterkunft ins Zentrum von ${destination}`,'Eine Verbindung mit wenig Fußweg und Umstiegen','Den Rückweg zur Unterkunft planen'];return[`Einen entspannten halben Tag in ${destination} planen`,dietary?'Vegetarisch essen und danach etwas Schönes erleben':'Schön essen und danach etwas Besonderes erleben','Etwas mit Kind planen, ohne weite Wege','Nur einen außergewöhnlichen Ort für heute finden']}
  window.LuviaPlanningDialogue=Object.freeze({version:VERSION,analyze,localDecompose,impulses,compactContext,toMap,diagnostics:()=>({version:VERSION,capability:'planning.dialogue',research:false,singleQuestion:true,inFlight:inFlight.size})});
})();