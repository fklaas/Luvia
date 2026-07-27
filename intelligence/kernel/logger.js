(function(){
  'use strict';
  const MAX_ENTRIES = 250;
  const entries = [];
  const listeners = new Set();
  function clone(value){ try{return structuredClone(value)}catch(_){try{return JSON.parse(JSON.stringify(value))}catch(__){return String(value)}} }
  function write(level, source, message, context){
    const entry = Object.freeze({id:crypto?.randomUUID?.()||('log-'+Date.now()+'-'+Math.random()),at:new Date().toISOString(),level,source:source||'kernel',message:String(message||''),context:context===undefined?null:clone(context)});
    entries.push(entry); if(entries.length>MAX_ENTRIES)entries.splice(0,entries.length-MAX_ENTRIES);
    listeners.forEach(fn=>{try{fn(entry)}catch(_){}});
    const method=level==='error'?'error':level==='warn'?'warn':'debug';
    console[method]?.('[Luvia]',entry.source,entry.message,entry.context||'');
    return entry;
  }
  const api={
    debug:(s,m,c)=>write('debug',s,m,c),info:(s,m,c)=>write('info',s,m,c),warn:(s,m,c)=>write('warn',s,m,c),error:(s,m,c)=>write('error',s,m,c),
    list:(filter={})=>entries.filter(x=>(!filter.level||x.level===filter.level)&&(!filter.source||x.source===filter.source)).slice(),
    latest:(count=25)=>entries.slice(-Math.max(0,count)),clear:()=>{entries.length=0},
    subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)},
    diagnostics:()=>({status:'ready',entries:entries.length,maxEntries:MAX_ENTRIES,lastError:[...entries].reverse().find(x=>x.level==='error')||null})
  };
  window.LuviaKernelLogger=Object.freeze(api);
})();
