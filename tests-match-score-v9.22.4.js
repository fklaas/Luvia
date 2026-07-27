'use strict';
const assert=require('node:assert/strict');
function calculateMatchScore(place){let score=58;const rating=Number(place?.rating)||0,reviews=Number(place?.userRatingCount)||0,distance=Number(place?.distanceMeters);score+=Math.max(0,(rating-3.5)*14);score+=Math.min(10,Math.log10(Math.max(1,reviews))*3);if(place?.features?.servesVegetarianFood===true)score+=7;if(place?.features?.reservable===true)score+=4;if(Number.isFinite(distance))score+=distance<1500?8:distance<5000?5:distance<12000?2:-3;return Math.max(55,Math.min(98,Math.round(score)))}
function withMatchScore(place,preferredScore){const existing=Number(preferredScore??place?.matchScore);const matchScore=Number.isFinite(existing)?Math.max(55,Math.min(98,Math.round(existing))):calculateMatchScore(place);return {...place,matchScore}}
const preview=withMatchScore({id:'place-1',rating:4.7,userRatingCount:3203,distanceMeters:1300,features:{servesVegetarianFood:false,reservable:false}});
const details=withMatchScore({...preview,features:{servesVegetarianFood:true,reservable:true},editorialSummary:'More provider details'},preview.matchScore);
assert.equal(details.matchScore,preview.matchScore,'List and detail must keep the identical normalized score');
assert.equal(withMatchScore(preview).matchScore,preview.matchScore,'Repeated normalization must be stable');
assert.equal(withMatchScore({matchScore:120}).matchScore,98,'Stored scores remain bounded');
assert.equal(withMatchScore({matchScore:30}).matchScore,55,'Stored scores remain bounded');
console.log(`OK: identical match score ${preview.matchScore}% in list and detail`);
