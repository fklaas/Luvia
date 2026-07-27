(function(){
  'use strict';
  async function checkUrl(label, url){
    try{
      const response = await fetch(url, {method:'GET', cache:'no-store'});
      return {label, url, ok: response.ok, status: response.status};
    }catch(error){
      return {label, url, ok:false, status:0, error:error.message};
    }
  }
  async function run(){
    if(!window.LuviaEnvironment) throw new Error('LuviaEnvironment ist nicht geladen.');
    const env = LuviaEnvironment.snapshot();
    const urls = [
      ['App', env.appIndex],
      ['Diagnose', env.diagnostics],
      ['Core', LuviaEnvironment.assetUrl('intelligence/core.js')],
      ['Data Layer', LuviaEnvironment.assetUrl('intelligence/data-layer.js')],
      ['Auth-Konfiguration', LuviaEnvironment.assetUrl('auth/config.js')]
    ];
    const checks = [];
    for(const [label,url] of urls) checks.push(await checkUrl(label,url));
    return {ok: checks.every(item=>item.ok), environment:env, checks, testedAt:new Date().toISOString()};
  }
  window.LuviaEnvironmentTest = {run};
})();
