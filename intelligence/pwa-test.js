(function(){
'use strict';
const scriptUrl=new URL(document.currentScript?.src||'intelligence/pwa-test.js',document.baseURI);
const appRoot=new URL('../',scriptUrl);
const rootUrl=path=>new URL(path,appRoot).toString();
async function run(){
  const p=window.LuviaPWA;
  if(!p)return{ok:false,message:'LuviaPWA API fehlt.',checks:{pwaApi:false}};
  const s=p.snapshot();
  let manifest=null,offline=false,manifestUrl=rootUrl('manifest.webmanifest');
  try{const r=await fetch(manifestUrl,{cache:'no-store'});manifest=r.ok?await r.json():null}catch{}
  try{const r=await fetch(rootUrl('offline.html'),{cache:'no-store'});offline=r.ok}catch{}
  const resolvedStart=manifest?new URL(manifest.start_url||'./',manifestUrl).toString():'';
  const resolvedScope=manifest?new URL(manifest.scope||'./',manifestUrl).toString():'';
  const diagnosticsMode=window.LUVIA_DIAGNOSTICS_MODE===true;
  const effectiveRegistration=Boolean(s.registered||s.controller||navigator.serviceWorker?.controller);
  const checks={
    serviceWorkerSupported:s.supported,
    serviceWorkerRegistered:diagnosticsMode?effectiveRegistration:s.registered,
    activeWorker:Boolean(s.active||navigator.serviceWorker.controller),
    manifestLoaded:Boolean(manifest),
    startUrlInsideApp:Boolean(resolvedStart&&resolvedStart.startsWith(appRoot.toString())),
    scopeMatchesApp:resolvedScope===appRoot.toString(),
    standaloneDisplay:['standalone','fullscreen'].includes(manifest?.display),
    icons192:Boolean(manifest?.icons?.some(i=>String(i.sizes).includes('192x192'))),
    icons512:Boolean(manifest?.icons?.some(i=>String(i.sizes).includes('512x512'))),
    offlineShell:offline,
    secureContext:window.isSecureContext
  };
  const ok=Object.values(checks).every(Boolean);
  const message=ok?(diagnosticsMode?'PWA-Grundlage im lokalen Diagnosemodus bereit.':'PWA-Grundlage ist bereit.'):'PWA-Grundlage ist noch unvollständig.';
  return{ok,message,skippedRegistration:diagnosticsMode&&!s.registered,checks,snapshot:s,manifest,appRoot:appRoot.toString()};
}
window.LuviaPWATest=Object.freeze({run});
})();
