(() => {
  'use strict';
  const listeners=new Set();
  const LOCATION_PREF='luvia.travel-context.location-enabled.v1';
  const LOCATION_CACHE='luvia.travel-context.location.v1';
  let watchId=null,requestPromise=null;
  const initial=(()=>{try{return JSON.parse(localStorage.getItem(LOCATION_CACHE)||'null')}catch{return null}})();
  const state={now:new Date(),location:initial&&Date.now()-(initial.updatedAt||0)<86400000?initial:null,permission:'unknown',requesting:false,error:null};
  const clone=v=>JSON.parse(JSON.stringify(v));
  const dateOnly=d=>{const x=new Date(d);x.setHours(0,0,0,0);return x};
  const trip=()=>window.LuviaTripContext?.getActiveTrip?.()||window.LuviaAppState?.getSnapshot?.()?.trip?.trip||{};
  function tripDates(t=trip()){const start=t.startDate||t.start_date,end=t.endDate||t.end_date;return{start:start?new Date(`${start}T00:00:00`):null,end:end?new Date(`${end}T23:59:59`):null}}
  function phase(t=trip(),now=state.now){const {start,end}=tripDates(t);if(!start||!end)return'planning';if(now<start)return'before';if(now>end)return'after';return'during'}
  function tripDay(t=trip(),now=state.now){const {start,end}=tripDates(t);if(!start||!end||now<start||now>end)return null;return Math.floor((dateOnly(now)-dateOnly(start))/86400000)+1}
  function daysUntil(value,now=state.now){const target=value instanceof Date?value:new Date(value);if(Number.isNaN(target.getTime()))return null;return Math.ceil((target-now)/86400000)}
  function eventCountdown(date,time='12:00',label='Termin'){if(!date)return null;const target=new Date(`${date}T${time||'12:00'}:00`);if(Number.isNaN(target.getTime()))return null;const diff=target-state.now;if(diff<=-21600000)return{state:'past',label:`${label} liegt hinter euch.`,target:target.toISOString()};if(diff<=0)return{state:'now',label:`${label} ist jetzt ✨`,target:target.toISOString()};const days=Math.floor(diff/86400000),hours=Math.floor(diff/3600000)%24,minutes=Math.floor(diff/60000)%60;return{state:'future',label:days>0?`Noch ${days} ${days===1?'Tag':'Tage'} und ${hours} Std. bis ${label}`:`Noch ${hours} Std. und ${minutes} Min. bis ${label}`,target:target.toISOString(),milliseconds:diff}}
  function haversine(a,b){if(!a||!b)return null;const lat1=Number(a.latitude??a.lat),lon1=Number(a.longitude??a.lng),lat2=Number(b.latitude??b.lat),lon2=Number(b.longitude??b.lng);if(![lat1,lon1,lat2,lon2].every(Number.isFinite))return null;const r=6371000,toRad=x=>x*Math.PI/180,dLat=toRad(lat2-lat1),dLon=toRad(lon2-lon1);const h=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;return Math.round(2*r*Math.asin(Math.sqrt(h)))}
  function snapshot(){const t=trip();return Object.freeze({now:state.now.toISOString(),today:state.now.toISOString().slice(0,10),weekday:new Intl.DateTimeFormat('de-DE',{weekday:'long'}).format(state.now),phase:phase(t),tripDay:tripDay(t),trip:t,location:state.location?clone(state.location):null,permission:state.permission,requesting:state.requesting,error:state.error})}
  function emit(reason='changed'){const value=snapshot();listeners.forEach(fn=>{try{fn(value)}catch(e){console.warn('[LuviaTravelContext]',e)}});window.dispatchEvent(new CustomEvent('luvia:travel-context-changed',{detail:{...value,reason}}));return value}
  async function permission(){try{state.permission=(await navigator.permissions?.query?.({name:'geolocation'}))?.state||'unknown'}catch{state.permission='unknown'}return state.permission}
  function save(coords,reason='location'){state.location={latitude:Number(coords.latitude??coords.lat),longitude:Number(coords.longitude??coords.lng),accuracy:Number(coords.accuracy??999),updatedAt:Number(coords.timestamp||Date.now())};state.requesting=false;state.error=null;state.permission='granted';localStorage.setItem(LOCATION_PREF,'1');localStorage.setItem(LOCATION_CACHE,JSON.stringify(state.location));emit(reason);return state.location}
  function ingestLocation(coords,{reason='global-location'}={}){if(!coords)return null;const next=save(coords,reason);return clone(next)}
  function fail(error){state.requesting=false;state.permission=error?.code===1?'denied':state.permission;state.error=error?.code===1?'Standortzugriff wurde abgelehnt. Du kannst ihn jederzeit in den Website-Einstellungen erlauben.':'Der Standort konnte gerade nicht ermittelt werden.';emit('location-error')}
  function startWatch(){if(watchId!==null||!navigator.geolocation)return;watchId=navigator.geolocation.watchPosition(p=>save(p.coords),e=>{if(e?.code===1)fail(e)},{enableHighAccuracy:false,maximumAge:60000,timeout:30000})}
  async function requestLocation(){if(state.location&&Date.now()-(state.location.updatedAt||0)<300000){startWatch();return state.location}if(requestPromise)return requestPromise;requestPromise=(async()=>{if(!window.isSecureContext)throw new Error('Standort benötigt HTTPS.');if(!navigator.geolocation)throw new Error('Dieser Browser unterstützt keinen Standort.');await permission();state.requesting=true;state.error=null;emit('requesting');try{const pos=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:false,maximumAge:120000,timeout:20000}));save(pos.coords);startWatch();return state.location}catch(e){fail(e);throw e}finally{requestPromise=null}})();return requestPromise}
  function clearLocation(){if(watchId!==null)navigator.geolocation?.clearWatch?.(watchId);watchId=null;localStorage.removeItem(LOCATION_PREF);localStorage.removeItem(LOCATION_CACHE);state.location=null;state.error=null;emit('location-cleared')}
  setInterval(()=>{state.now=new Date();emit('clock')},60000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){state.now=new Date();emit('visible')}});
  window.addEventListener('luvia:trip-context-changed',()=>emit('trip'));
  permission().then(()=>emit('ready'));
  window.addEventListener('luvia:global-location-updated',event=>{const position=event.detail?.position;if(position)ingestLocation(position,{reason:'global-location'})});
  window.LuviaTravelContext=Object.freeze({version:'1.1.1',snapshot,subscribe(fn){listeners.add(fn);fn(snapshot());return()=>listeners.delete(fn)},requestLocation,ingestLocation,clearLocation,distanceTo(target){return haversine(state.location,target)},haversine,eventCountdown,phase,tripDay,daysUntil});
})();
