(function(){
'use strict';
const VERSION='4.3.3';
function generic(place={},context={}){const rating=Number(place.rating||0),distance=Number(place.distanceMeters||Infinity);let score=50;if(rating)score+=Math.min(28,Math.round((rating-3)*14));if(Number.isFinite(distance))score+=distance<3000?18:distance<10000?10:distance<30000?4:0;score=Math.max(35,Math.min(96,score));return{score,distanceLabel:place.distanceLabel||null,openLabel:place.openNow===true?'Heute geöffnet':place.openNow===false?'Heute geschlossen':'Details verfügbar',reasons:['Liegt am aktiven Reiseziel','Ist mit Schedule, Timeline und Today verbunden','Nutzt eure gemeinsamen Reiseinformationen'],warnings:[]}}
function analyze(type,place,context={}){if(type==='restaurant'&&window.LuviaRestaurantIntelligence?.analyze){try{return window.LuviaRestaurantIntelligence.analyze(place,context)}catch{}}return generic(place,context)}
function diagnostics(){return{version:VERSION,status:'ready',types:window.LuviaPlaceRegistry?.diagnostics?.().registeredTypes||0,restaurantCompatibility:Boolean(window.LuviaRestaurantIntelligence),services:{recommendations:Boolean(window.LuviaRecommendations),schedule:Boolean(window.LuviaScheduleIntelligence),timeline:Boolean(window.LuviaTimelineCore),today:Boolean(window.LuviaTodayIntelligence),presence:Boolean(window.LuviaPresenceVisit),crossModule:Boolean(window.LuviaCrossModuleRecommendations),liveDay:Boolean(window.LuviaLiveDayCompanion)}}}
window.LuviaPlaceIntelligence=Object.freeze({version:VERSION,analyze,generic,diagnostics});
})();
