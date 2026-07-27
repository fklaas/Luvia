(function(){
  'use strict';
  function parse(value){try{return JSON.parse(value)}catch{return null}}
  function isOfficial(trip){return !!trip && (trip.templateId==='paris-official'||trip.isParisOfficial===true);}
  const file=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const trip=parse(localStorage.getItem('parisIdentityV1'));
  if(!trip)return;
  const target=isOfficial(trip)?'paris-official.html':'trip.html';
  if(file!==target && file!=='index.html') location.replace(target+location.search+location.hash);
  window.LuviaRoute={isOfficial,currentFile:file,openTrip:function(next){
    if(next)localStorage.setItem('parisIdentityV1',JSON.stringify(next));
    const active=next||parse(localStorage.getItem('parisIdentityV1'));
    location.href=(isOfficial(active)?'paris-official.html':'trip.html');
  }};
})();
