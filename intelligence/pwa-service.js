(function(){
'use strict';
const VERSION='3.0.2.12-diagnostics-consistent';
const SCRIPT_URL=new URL(document.currentScript?.src||'intelligence/pwa-service.js',document.baseURI);
const APP_ROOT_URL=new URL('../',SCRIPT_URL);
const SW_URL=new URL('sw.js',APP_ROOT_URL).toString();
const SW_SCOPE=APP_ROOT_URL.pathname;
const EXPECTED_CACHE='luvia-shell-v11.2.12';
const listeners=new Set();
let registration=null,deferredPrompt=null,updateAvailable=false,lastUpdateCheck=null,lastError=null;
const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const ios=()=>/iphone|ipad|ipod/i.test(navigator.userAgent);
const emit=()=>{const s=snapshot();listeners.forEach(fn=>{try{fn(s)}catch{}});window.dispatchEvent(new CustomEvent('luvia:pwa-state',{detail:s}))};
function snapshot(){return{version:VERSION,supported:'serviceWorker'in navigator,registered:Boolean(registration),controller:Boolean(navigator.serviceWorker?.controller),scope:registration?.scope||null,installable:Boolean(deferredPrompt),installed:standalone(),standalone:standalone(),ios:ios(),online:navigator.onLine,updateAvailable,waiting:Boolean(registration?.waiting),installing:Boolean(registration?.installing),active:Boolean(registration?.active),lastUpdateCheck,lastError}};
async function removeWrongRegistrations(){const regs=await navigator.serviceWorker.getRegistrations();for(const reg of regs){const script=reg.active?.scriptURL||reg.waiting?.scriptURL||reg.installing?.scriptURL||'';if(script.endsWith('/sw.js')&&reg.scope!==APP_ROOT_URL.toString())await reg.unregister()}}
async function clearOldCaches(){if(!('caches'in window))return[];const keys=await caches.keys(),removed=[];for(const key of keys){if(key.startsWith('luvia-')&&key!==EXPECTED_CACHE){await caches.delete(key);removed.push(key)}}return removed}
async function register(){if(!('serviceWorker'in navigator))return snapshot();try{await removeWrongRegistrations();await clearOldCaches();registration=await navigator.serviceWorker.register(SW_URL,{scope:SW_SCOPE,updateViaCache:'none'});bindRegistration(registration);await registration.update();await navigator.serviceWorker.ready;lastError=null;emit();return snapshot()}catch(e){lastError=e.message||String(e);emit();throw e}}
function activateWaiting(reg){if(!reg?.waiting)return;updateAvailable=true;sessionStorage.setItem('luvia-pwa-reloading','1');reg.waiting.postMessage({type:'SKIP_WAITING'});emit()}
function bindRegistration(reg){if(reg.__luviaBound)return;reg.__luviaBound=true;const inspect=()=>{if(reg.waiting)activateWaiting(reg);else emit()};reg.addEventListener('updatefound',()=>{const worker=reg.installing;if(worker)worker.addEventListener('statechange',()=>{if(worker.state==='installed')inspect()});inspect()});inspect()}
async function checkForUpdate(){lastUpdateCheck=new Date().toISOString();if(!registration)await register();try{await registration.update();if(registration.waiting)activateWaiting(registration);lastError=null}catch(e){lastError=e.message||String(e)}emit();return snapshot()}
async function activateUpdate(){if(!registration?.waiting)return false;activateWaiting(registration);return true}
async function install(){if(!deferredPrompt)return{available:false,reason:ios()?'ios-manual':'prompt-unavailable'};deferredPrompt.prompt();const choice=await deferredPrompt.userChoice;deferredPrompt=null;emit();return{available:true,outcome:choice.outcome}}
async function cacheInfo(){if(!('caches'in window))return[];const keys=await caches.keys();return Promise.all(keys.map(async name=>{const cache=await caches.open(name),requests=await cache.keys();return{name,entries:requests.length}}))}
function subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;emit()});window.addEventListener('appinstalled',()=>{deferredPrompt=null;emit()});window.addEventListener('online',emit);window.addEventListener('offline',emit);
if('serviceWorker'in navigator)navigator.serviceWorker.addEventListener('controllerchange',()=>{if(sessionStorage.getItem('luvia-pwa-reloading')){sessionStorage.removeItem('luvia-pwa-reloading');location.reload()}else emit()});
window.LuviaPWA=Object.freeze({version:VERSION,register,checkForUpdate,activateUpdate,install,snapshot,cacheInfo,clearOldCaches,subscribe});
})();
