(function(){
  'use strict';
  async function run(options={}){
    const backend=window.LuviaBackend;
    if(!backend)return{ok:false,message:'LuviaBackend API fehlt.',checks:{api:false}};
    const contract=backend.testContract();
    let remote={skipped:true,message:'Remote-Probe wurde nicht angefordert.'};
    if(options.remote===true)remote=await backend.probe();
    return{service:'backend',ok:contract.ok,message:contract.message,checks:contract.checks,remote,diagnostics:backend.diagnostics()};
  }
  window.LuviaBackendTest=Object.freeze({run});
})();
