const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

(async()=>{
  const sw=read('sw.js');
  const required=['core/places/place-type-contract.js','core/places/place-type-definitions.js','core/places/place-ui-actions.js','core/places/timeline-core.js','modules/shopping/shopping-module.js'];
  for(const file of required)if(!sw.includes(`'${file}'`))throw new Error(`PWA App Shell fehlt: ${file}`);
  if(!sw.includes('CRITICAL_SHELL'))throw new Error('Kritische Places-Startdateien blockieren keine unvollständige Service-Worker-Installation.');
  if(!sw.includes('ignoreSearch:true'))throw new Error('Versionierte Assets besitzen keinen query-unabhängigen Cache-Fallback.');
  if(!sw.includes('if(response.ok)'))throw new Error('HTTP-Fehler werden nicht auf den Cache zurückgeführt.');
  if(!read('intelligence/pwa-service.js').includes("EXPECTED_CACHE='luvia-shell-v13.9.0.1'"))throw new Error('PWA Runtime und Service Worker verwenden nicht denselben Cache-Namen.');

  const definitions=read('core/places/place-type-definitions.js');
  if(!definitions.includes('LuviaPlaceTypeDefinitions'))throw new Error('Place-Type-Definitions besitzen keinen Recovery-Bootstrap.');
  if(!definitions.includes('MAX_RECOVERY_ATTEMPTS=3'))throw new Error('Der Contract-Recovery besitzt keine begrenzten Wiederholungsversuche.');

  const listeners={};
  class CustomEvent{constructor(type,init={}){this.type=type;this.detail=init.detail}}
  const window={dispatchEvent:event=>{(listeners[event.type]||[]).forEach(fn=>fn(event))},addEventListener:(type,fn)=>{(listeners[type]||(listeners[type]=[])).push(fn)}};
  let attempts=0;
  let context;
  const document={
    currentScript:{src:'https://example.test/core/places/place-type-definitions.js?v=13.9.0.1'},
    baseURI:'https://example.test/',
    createElement:()=>({dataset:{},remove(){}}),
    head:{appendChild(script){
      attempts+=1;
      setTimeout(()=>{
        if(attempts===1){script.onerror?.();return;}
        vm.runInContext(read('core/places/place-type-contract.js'),context);
        script.onload?.();
      },0);
    }}
  };
  context={window,CustomEvent,console,document,URL,Promise,setTimeout,clearTimeout};
  vm.createContext(context);

  // Reproduziert den Screenshot: Definitions laden, obwohl der Contract-Request zunächst 503/Fehler liefert.
  vm.runInContext(definitions,context);
  const ready=await context.window.LuviaPlaceTypeDefinitions.ready;
  if(ready.status!=='ready')throw new Error(`Place Contract Recovery blieb im Status ${ready.status}.`);
  if(attempts!==2)throw new Error(`Recovery sollte nach einem Fehler im zweiten Versuch erfolgreich sein, tatsächlich: ${attempts}.`);

  vm.runInContext(read('core/places/place-ui-actions.js'),context);
  const expected={restaurant:'planned_at',accommodation:'check_in_at',attraction:'starts_at',photo_spot:'planned_at',shopping:'planned_at'};
  for(const [type,key] of Object.entries(expected)){
    const fields=await context.window.LuviaPlaceUIActions.ensureSchema(type);
    if(!fields.some(field=>field.key===key))throw new Error(`Timeline-Schema für ${type} fehlt nach Recovery.`);
  }
  if(context.window.LuviaPlaceTypeContracts.all().length!==5)throw new Error('Nicht alle fünf produktiven Place Contracts wurden registriert.');
  console.log('Place bootstrap & all-place timeline recovery: OK');
})().catch(error=>{console.error(error);process.exit(1)});
