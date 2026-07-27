(function(){
'use strict';
const ID_KEY='parisIdentityV1';
function newTrip(){window.LuviaTripCreator?.open?.()}
function mountProfile(){
  const bar=document.getElementById('liveTripBar');
  if(!bar||bar.querySelector('.luvia-trip-profile'))return;
  const button=document.createElement('button');
  button.type='button';button.className='luvia-trip-profile';button.title='Profil und Reisen bearbeiten';button.setAttribute('aria-label','Profil und Reisen bearbeiten');button.innerHTML=`<svg viewBox="0 0 48 48" aria-hidden="true"><path class="lp-cloud" d="M8 15c1.7-4.5 8.6-4.8 10.7-.7 2.2-2.4 6.5-1.8 7.8 1.2 3.5-.5 6.2 1.5 6.5 4.5H8.7C6.1 20 5.2 16.6 8 15Z"/><path class="lp-route" d="M10 33c6-7 13 4 20-3 2.4-2.4 4.8-4.1 8-4"/><path class="lp-plane" d="m34 21 8 3-8 3 1.5 4-2 .8-3.5-4.1-5.6 1.7-1.2-1.7 6-4.4 3.5-5 2 .8L34 21Z"/><rect class="lp-case" x="11" y="24" width="15" height="14" rx="4"/><path class="lp-handle" d="M15.5 24v-2.2c0-1.5 1.2-2.8 2.8-2.8h.4c1.6 0 2.8 1.3 2.8 2.8V24"/><path class="lp-heart" d="M16 30c0-2.2 3-2.7 3.8-.8.8-1.9 3.8-1.4 3.8.8 0 2.4-3.8 4.5-3.8 4.5S16 32.4 16 30Z"/></svg>`;
  button.onclick=()=>window.ParisProfileCenter?.open?.('profile');
  bar.appendChild(button);
}
function mountNewTrip(){
  const overlay=document.querySelector('.pc-overlay');
  if(!overlay||overlay.querySelector('.pc-global-new-trip'))return;
  const button=document.createElement('button');button.type='button';button.className='pc-global-new-trip';button.innerHTML='<span>＋</span><span>Neue Reise</span>';button.onclick=newTrip;overlay.appendChild(button);
}
const moduleTargets={
  '[data-ld-open-plan]':'assistant','[data-ld-memories]':'liveMoments','[data-ld-checklist]':'memories','[data-ld-review]':'review','[data-ld-book]':'travelBook',
  '[href="#travelAssistant"]':'assistant','[href="#live-moments"]':'liveMoments','[href="#erinnerungen"]':'memories','[href="#reise-revue"]':'review','[href="#reisebuch"]':'travelBook'
};
function bindDashboardDelegation(){
 document.addEventListener('click',e=>{
   for(const [selector,id] of Object.entries(moduleTargets)){
     if(e.target.closest(selector)){e.preventDefault();e.stopPropagation();window.LuviaAppShell?.show?.(id);return}
   }
 },true);
}
function heal(){mountProfile();mountNewTrip();window.LuviaAppShell?.render?.()}
function start(){heal();bindDashboardDelegation();new MutationObserver(()=>{mountProfile();mountNewTrip()}).observe(document.body,{childList:true,subtree:true});window.addEventListener('luvia:trip-changed',heal);window.addEventListener('pageshow',heal)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
