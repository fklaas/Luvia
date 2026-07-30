const fs=require('fs'),vm=require('vm'),assert=require('assert');
const context={window:{},console,Date,Math};vm.createContext(context);vm.runInContext(fs.readFileSync('core/places/photo-spot-intelligence-service.js','utf8'),context);
const svc=context.window.LuviaPhotoSpotIntelligence;assert(svc&&svc.version==='4.8.1');
const result=svc.analyze({name:'Aussichtspunkt West',types:['tourist_attraction','park'],location:{latitude:48.137,longitude:11.575}},{date:'2026-08-01'});
assert(result.lightMoment.value);assert(result.bestLight.value);assert(result.viewDirection.value);assert(result.desiredSubject.value);assert(result.indoorOutdoor.value);assert(result.access.value);console.log('Photo spot intelligence: OK');
