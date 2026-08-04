const fs=require('fs');const path=require('path');const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const service=read('core/places/place-lifecycle-service.js');
const hub=read('core/places/place-lifecycle-hub.js');
const app=read('app/app-shell.js');
const hubs=read('app/module-hubs.js');
const index=read('index.html');
const sw=read('sw.js');
function ok(v,m){if(!v)throw new Error(m)}
ok(service.includes("states:['discovered','planned','visited','remembered']"),'vier Lifecycle-Zustände fehlen');
ok(service.includes('markVisited')&&service.includes('place_visits'),'Besuchs-Persistenz fehlt');
ok(service.includes('linkMemory')&&service.includes('place_memory_linked'),'Memory-Verknüpfung fehlt');
ok(service.includes('setGpsEnabled'),'GPS-Steuerung fehlt');
ok(hub.includes('Entdeckt')&&hub.includes('Geplant')&&hub.includes('Besucht')&&hub.includes('Erinnert'),'Lifecycle UI fehlt');
ok(hubs.includes("action:'places-lifecycle'"),'Lifecycle-Hub ist nicht verlinkt');
ok(app.includes("view==='places-lifecycle'")&&app.includes('LuviaPlaceLifecycleHub.mount'),'App-Shell mountet Lifecycle nicht');
ok(index.includes('place-lifecycle-service.js?v=13.27.0')&&index.includes('place-lifecycle-hub.css?v=13.27.0'),'Index-Einbindung fehlt');
ok(sw.includes('place-lifecycle-service.js')&&sw.includes("luvia-shell-v13.27.0"),'Service Worker fehlt');
console.log('places lifecycle v13.27.0 ok');
