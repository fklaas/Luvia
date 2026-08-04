const fs=require('fs');const path=require('path');const root=path.resolve(__dirname,'..');
function read(p){return fs.readFileSync(path.join(root,p),'utf8')}
const hubs=read('app/module-hubs.js');
if(!hubs.includes('function tripHub('))throw new Error('tripHub fix missing');
if(!hubs.includes("return tripHub(activeTrip)"))throw new Error('trip render still shadows function');
const places=read('core/places/places-final-foundation.js');
for(const token of ['LuviaPlaceCollections.saveDateFields','updateLifecycle','luvia:place-plan-changed','luvia:in-window-data-changed','luvia:dashboard-widget-refresh'])if(!places.includes(token))throw new Error('timeline sync missing '+token);
const cors=read('supabase/functions/luvia-gateway/_shared/cors.ts');
if(!cors.includes('[...defaults,...configured]'))throw new Error('mandatory CORS origins are not merged');
if(!read('sw.js').includes('luvia-shell-v13.26.1'))throw new Error('cache version missing');
console.log('13.26.1 reliability checks passed');
