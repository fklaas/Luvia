(() => {
  'use strict';
  const VERSION='4.22.0';
  const clone=value=>JSON.parse(JSON.stringify(value??null));
  const text=value=>String(value||'').trim();
  const has=(source,words)=>words.some(word=>source.includes(word));
  const surfaceGoal=(surface)=>surface==='move'?'route':'open';
  function localDecompose(input={}){
    const phrase=text(input.userGoal).toLowerCase();const surface=input.surface||'places';const goals=[];const hard={};const soft={};
    if(surface==='move'){
      goals.push({type:'route',label:text(input.userGoal)||'Eine passende Verbindung planen',source:'user'});
      if(has(phrase,['wenig laufen','kurzer fußweg','wenig fußweg']))hard.maxWalking='low';
      if(has(phrase,['wenig umsteigen','ohne umsteigen']))hard.maxTransfers=has(phrase,['ohne umsteigen'])?0:1;
      if(has(phrase,['schnell','schnellste']))soft.priority='speed';else if(has(phrase,['günstig','billig']))soft.priority='cost';else if(has(phrase,['entspannt','komfortabel']))soft.priority='comfort';
    }else{
      if(has(phrase,['essen','restaurant','frühstück','mittag','abendessen','café','cafe']))goals.push({type:'meal',label:has(phrase,['vegetar'])?'Vegetarisch essen':'Essen gehen',hardConstraints:has(phrase,['vegetar'])?{dietary:['vegetarian']}:{},source:'user'});
      if(has(phrase,['indoor','museum','aktivität','erleben','unternehmen','ausflug','spazieren','park']))goals.push({type:'activity',label:has(phrase,['indoor'])?'Eine Indoor-Aktivität erleben':has(phrase,['spazieren'])?'Schön spazieren gehen':'Etwas erleben',hardConstraints:has(phrase,['indoor'])?{environment:'indoor'}:{},source:'user'});
      if(has(phrase,['kind','livi','baby','kinderwagen']))hard.familyContext=true;
      if(has(phrase,['nicht weit','kurze wege','in der nähe','nah']))hard.travelDistance='short';
      if(has(phrase,['ruhig','entspannt']))soft.atmosphere='calm';
      if(has(phrase,['besonders','außergewöhnlich','nicht jeder tourist']))soft.character='special';
      if(!goals.length)goals.push({type:surfaceGoal(surface),label:text(input.userGoal)||'Reisemoment planen',source:'user'});
    }
    let followUpQuestion=null;
    if(surface==='move'&&!has(phrase,['nach ',' zum ',' zur ',' von ']))followUpQuestion={text:'Wohin möchtet ihr fahren oder gehen?',reason:'Für eine Route fehlt noch das Ziel.',options:[],allowFreeText:true};
    else if(surface==='move'&&!soft.priority)followUpQuestion={text:'Was ist euch für diesen Weg am wichtigsten?',reason:'Damit Luvia später passende Verbindungen vergleichen kann.',options:[{label:'Möglichst entspannt',value:'comfort'},{label:'Möglichst schnell',value:'speed'},{label:'Möglichst günstig',value:'cost'}],allowFreeText:true};
    else if(surface!=='move'&&goals.some(g=>g.type==='activity')&&!has(phrase,['heute','morgen','vormittag','mittag','nachmittag','abend','uhr','stunden']))followUpQuestion={text:'Für wann möchtet ihr diesen Reisemoment planen?',reason:'Zeit und Tagesphase beeinflussen später Öffnungszeiten und Wege.',options:[{label:'Heute',value:'today'},{label:'Morgen',value:'tomorrow'},{label:'Noch offen',value:'open'}],allowFreeText:true};
    const summary={headline:surface==='move'?'So habe ich euren Weg verstanden':'So habe ich euren Plan verstanden',intro:surface==='move'?'Luvia bereitet einen klaren Mobilitätsauftrag vor.':'Luvia hat euren Wunsch in konkrete Planungsziele zerlegt.',goalLabels:goals.map(g=>g.label),hardLabels:Object.entries(hard).map(([k,v])=>`${k}: ${Array.isArray(v)?v.join(', '):v}`),softLabels:Object.entries(soft).map(([k,v])=>`${k}: ${v}`)};
    return{understanding:text(input.userGoal),goals,hardConstraints:hard,softPreferences:soft,followUpQuestion,summary,unknowns:followUpQuestion?[followUpQuestion.reason]:[],confidence:.66};
  }
  function compactContext(session={},trip={}){return{surface:session.surface,userGoal:text(session.userGoal).slice(0,800),answers:clone(session.preferenceLayers?.session||{}),destination:trip?.destination?.name||trip?.destination?.formattedAddress||trip?.name||'',participants:(session.participants||[]).slice(0,8).map(p=>({name:p.name||p.displayName||'',role:p.role||''})),globalPreferences:clone(session.preferenceLayers?.globalProfile||{}),tripPreferences:clone(session.preferenceLayers?.trip||{})}}
  async function analyze(session,trip={}){
    const local=localDecompose(compactContext(session,trip));
    if(!window.LuviaAI?.run)return local;
    try{
      const response=await window.LuviaAI.run('planning.dialogue',{...compactContext(session,trip),localDraft:local},{fallback:true});
      return response?.data||local;
    }catch{return local}
  }
  function impulses(surface,trip={},preferences={}){
    const destination=trip?.destination?.name||trip?.destination?.formattedAddress||trip?.name||'eurer Reise';
    const dietary=JSON.stringify(preferences).toLowerCase().includes('vegetar');
    if(surface==='move')return[`Zum nächsten geplanten Ort – möglichst entspannt`,`Von der Unterkunft ins Zentrum von ${destination}`,'Eine Verbindung mit wenig Fußweg und Umstiegen','Den Rückweg zur Unterkunft planen'];
    return[`Einen entspannten halben Tag in ${destination} planen`,dietary?'Vegetarisch essen und danach etwas Schönes erleben':'Schön essen und danach etwas Besonderes erleben','Etwas mit Kind planen, ohne weite Wege','Nur einen außergewöhnlichen Ort für heute finden'];
  }
  window.LuviaPlanningDialogue=Object.freeze({version:VERSION,analyze,localDecompose,impulses,compactContext,diagnostics:()=>({version:VERSION,capability:'planning.dialogue',research:false,singleQuestion:true})});
})();
