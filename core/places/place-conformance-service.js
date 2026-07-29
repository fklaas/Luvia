(function(){
'use strict';
const VERSION='4.5.0.1';
const forbidden=[
 {name:'localStorage in Place-Modulen',pattern:/localStorage\s*\./g},
 {name:'direkter trip_places Zugriff',pattern:/\.from\(\s*['"]trip_places['"]\s*\)/g},
 {name:'direkter trip_place_data Zugriff',pattern:/\.from\(\s*['"]trip_place_data['"]\s*\)/g},
 {name:'nicht-kanonischer Favoritenstatus',pattern:/['"]favorited['"]/g}
];
function runtime(){
 const contracts=window.LuviaPlaceTypeContracts?.all?.()||[]; const violations=[];
 contracts.forEach(c=>{const v=window.LuviaPlaceTypeContracts.validate(c);v.errors.forEach(message=>violations.push({type:c.type,area:'contract',message}));});
 const requiredGlobals=['LuviaPlaceExperience','LuviaPlaceCollections','LuviaPlaceDetails','LuviaTimelineCore','LuviaPlaceIntelligence','LuviaTripPlaceData'];
 requiredGlobals.forEach(name=>{if(!window[name])violations.push({area:'runtime',message:`Global fehlt: ${name}`})});
 return{ok:violations.length===0,contracts:contracts.length,violations,checks:{contracts:contracts.length>=3,sharedShell:Boolean(window.LuviaPlaceExperience),sharedCollections:Boolean(window.LuviaPlaceCollections),sharedDetails:Boolean(window.LuviaPlaceDetails),timeline:Boolean(window.LuviaTimelineCore),intelligence:Boolean(window.LuviaPlaceIntelligence),cloudAuthoritative:Boolean(window.LuviaTripPlaceData)}};
}
async function scanSources(){
 const manifest=['modules/restaurants-v2/restaurant-module.js','modules/accommodations/accommodation-module.js'];const violations=[];
 for(const path of manifest){try{const text=await fetch(path,{cache:'no-store'}).then(r=>r.text());for(const rule of forbidden){rule.pattern.lastIndex=0;if(rule.pattern.test(text))violations.push({file:path,area:'source',message:rule.name})}}catch(error){violations.push({file:path,area:'source',message:'Quelle nicht prüfbar: '+error.message})}}
 return{ok:violations.length===0,files:manifest,violations};
}
async function runAll(){const r=runtime(),s=await scanSources();return{version:VERSION,ok:r.ok&&s.ok,contracts:r.contracts,violations:[...r.violations,...s.violations],checks:{...r.checks,sourceGuard:s.ok}}}
function diagnostics(){return{version:VERSION,status:'ready',rules:['valid-contract','canonical-lifecycle','shared-shell','shared-detail','shared-collections','shared-timeline','no-localStorage','no-direct-place-table-writes']}}
window.LuviaPlaceConformance=Object.freeze({version:VERSION,runtime,scanSources,runAll,diagnostics});
})();
