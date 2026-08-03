(() => {
  'use strict';
  const VERSION='1.0.0';
  const tools=new Map();
  const clone=value=>{try{return value==null?value:JSON.parse(JSON.stringify(value))}catch{return null}};
  function register(def={}){if(!def.name||typeof def.read!=='function')throw new Error('AI_TOOL_INVALID');tools.set(def.name,Object.freeze({...def,mode:'READ'}));return def}
  register({name:'trip.current',description:'Aktive Reise ohne private Kontakt- oder Buchungsdaten.',read:()=>window.LuviaTripContext?.getActiveTrip?.()||window.LuviaAppState?.getSnapshot?.()?.trip?.trip||null});
  register({name:'preferences.current',description:'Ausdrücklich bestätigte globale Nutzerpräferenzen.',read:()=>window.LuviaUserPreferences?.get?.()||{}});
  register({name:'travel.context',description:'Zeit, Reisephase und optional grober Standort.',read:()=>window.LuviaTravelContext?.snapshot?.()||{}});
  register({name:'places.saved',description:'Bereits gespeicherte Reiseorte als Evidence.',read:()=>window.LuviaPlaceRuntime?.snapshot?.()||window.LuviaPlaceCollections?.diagnostics?.()||{}});
  register({name:'schedule.current',description:'Aktuelle geplante Ereignisse.',read:()=>window.LuviaScheduleIntelligence?.snapshot?.()||{}});
  register({name:'today.current',description:'Aktueller Tageskontext, freie Fenster und Konflikte.',read:()=>window.LuviaTodayIntelligence?.snapshot?.()||{}});
  register({name:'recommendations.current',description:'Bestehende Empfehlungen und Entscheidungen.',read:()=>window.LuviaRecommendations?.snapshot?.()||{}});
  register({name:'memory.signals',description:'Belegte, getrennt vom Profil gespeicherte Lernsignale.',read:async()=>{await window.LuviaAIMemory?.load?.();return window.LuviaAIMemory?.snapshot?.()||{signals:[]}}});
  async function invoke(name,args={}){const tool=tools.get(name);if(!tool)throw new Error(`AI_TOOL_NOT_FOUND:${name}`);return clone(await tool.read(args))}
  async function collect(names=[],args={}){const result={};for(const name of names){try{result[name]=await invoke(name,args)}catch(error){result[name]={unavailable:true,reason:error?.message||String(error)}}}return result}
  function list(){return[...tools.values()].map(({read,...definition})=>definition)}
  function diagnostics(){return{version:VERSION,count:tools.size,tools:list()}}
  window.LuviaAITools=Object.freeze({version:VERSION,register,invoke,collect,list,diagnostics});
})();
