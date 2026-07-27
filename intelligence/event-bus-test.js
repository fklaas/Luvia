(function(){
  'use strict';
  async function run(){
    const productionBus=window.LuviaKernelEvents;
    if(!productionBus)throw new Error('Event Bus fehlt.');
    const before=productionBus.diagnostics();
    const bus=productionBus.createIsolated();
    const eventName='developer.event-bus.test.'+Date.now();
    const calls=[];
    const stops=[];
    stops.push(bus.on(eventName,()=>calls.push('normal'),{label:'normal'}));
    stops.push(bus.on(eventName,()=>calls.push('priority'),{priority:10,label:'priority'}));
    stops.push(bus.once(eventName,()=>calls.push('once'),{priority:5,label:'once'}));
    stops.push(bus.on(eventName,()=>{calls.push('error');throw new Error('Absichtlicher Testfehler');},{priority:2,label:'error'}));
    const removable=bus.on(eventName,()=>calls.push('removed'),{label:'removed'});removable();
    const first=await bus.emit(eventName,{round:1},{source:'event-bus-test'});
    const second=await bus.emit(eventName,{round:2},{source:'event-bus-test'});
    stops.forEach(stop=>stop());
    const checks={
      multipleListeners:first.listenerCount===4,
      priorityOrder:calls[0]==='priority'&&calls[1]==='once'&&calls[2]==='error'&&calls[3]==='normal',
      onceListener:calls.filter(x=>x==='once').length===1&&second.listenerCount===3,
      unsubscribe:!calls.includes('removed'),
      errorIsolation:first.errorCount===1&&first.successCount===3&&second.errorCount===1&&second.successCount===2,
      history:bus.history(10).some(x=>x.event?.id===first.event.id)&&bus.history(10).some(x=>x.event?.id===second.event.id),
      diagnostics:bus.diagnostics().status==='ready'
    };
    return{ok:Object.values(checks).every(Boolean),message:'Event senden, empfangen, Priorität, Once, Abmelden, Fehlerisolierung und Historie geprüft.',checks,first,second,calls,diagnostics:bus.diagnostics(),productionUnchanged:JSON.stringify(before.stats)===JSON.stringify(productionBus.diagnostics().stats)&&before.historyCount===productionBus.diagnostics().historyCount};
  }
  window.LuviaEventBusTest=Object.freeze({run});
})();
