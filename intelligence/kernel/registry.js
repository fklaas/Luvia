(function(){
  'use strict';
  const components = new Map();
  function register(name,component,meta={}){
    if(!name)throw new Error('Komponentenname erforderlich.');
    if(components.has(name)&&meta.replace!==true)throw new Error('Komponente bereits registriert: '+name);
    const record={name,component,kind:meta.kind||'component',version:meta.version||component?.version||'unknown',registeredAt:new Date().toISOString(),status:'registered',meta:{...meta,replace:undefined}};
    components.set(name,record);window.LuviaKernelLogger?.info('registry','Komponente registriert',{name,kind:record.kind,version:record.version});window.LuviaKernelEvents?.emit('kernel.component.registered',{name,kind:record.kind,version:record.version});return component;
  }
  function unregister(name){const existed=components.delete(name);if(existed)window.LuviaKernelEvents?.emit('kernel.component.unregistered',{name});return existed}
  function get(name){return components.get(name)?.component||null}
  function record(name){return components.get(name)||null}
  function list(kind){return [...components.values()].filter(x=>!kind||x.kind===kind).map(x=>({...x,component:undefined}))}
  function setStatus(name,status){const r=components.get(name);if(!r)return false;r.status=status;return true}
  function diagnostics(){const listAll=list();return{status:'ready',count:listAll.length,byKind:listAll.reduce((a,x)=>(a[x.kind]=(a[x.kind]||0)+1,a),{}),components:listAll}}
  window.LuviaKernelRegistry=Object.freeze({register,unregister,get,record,list,setStatus,has:name=>components.has(name),diagnostics});
})();
