(() => {
  'use strict';
  const VERSION='4.26.0';
  const items=Object.freeze([
    {id:'today',label:'Heute',icon:'🏠',description:'Tagesbriefing und das Wichtigste für heute.'},
    {id:'plan',label:'Planen',icon:'✨',description:'Orte, Timeline, Checklisten und Reisevorbereitung.'},
    {id:'trip',label:'Reise',icon:'🧳',description:'Tagesverlauf, Teilnehmer und besuchte Orte.'},
    {id:'memories',label:'Erinnerungen',icon:'📸',description:'Fotos, Alben, Reisebuch und Revue.'},
    {id:'more',label:'Mehr',icon:'•••',description:'Profil, Reisekompass und Einstellungen.'}
  ]);
  const aliases=Object.freeze({dashboard:'today',places:'places',move:'plan',mobility:'plan'});
  const normalize=id=>aliases[id]||id||'today';
  window.LuviaNavigationRegistry=Object.freeze({version:VERSION,items:()=>items.slice(),get:id=>items.find(x=>x.id===normalize(id))||null,normalize,diagnostics:()=>({version:VERSION,items:items.map(x=>x.id),aliases})});
})();
