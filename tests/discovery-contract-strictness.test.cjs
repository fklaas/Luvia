/* Build 13.17.0 – strict Google Places result validation */
const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
async function main(){
 const window={};
 const context=vm.createContext({window,console,Date,Math,Object,Array,Set,Map,JSON,String,Number,Boolean,Promise});
 vm.runInContext(fs.readFileSync('core/preferences/discovery-contract-service.js','utf8'),context,{filename:'discovery-contract-service.js'});
 const service=window.LuviaDiscoveryContracts;
 const mixed=[
  {id:'places/valid',name:'Vegetarisches Bistro',primaryType:'vegetarian_restaurant',types:['vegetarian_restaurant','restaurant'],rating:4.5,userRatingCount:120,distanceMeters:800,features:{servesVegetarianFood:true}},
  {id:'places/wrong',name:'Flughafen',primaryType:'airport',types:['airport'],rating:4.7,userRatingCount:900,distanceMeters:900,features:{}},
  {id:'places/no-feature',name:'Restaurant ohne Nachweis',primaryType:'restaurant',types:['restaurant'],rating:4.7,userRatingCount:90,distanceMeters:700,features:{servesVegetarianFood:false}},
  {id:'places/closed',name:'Geschlossenes Bistro',primaryType:'vegetarian_restaurant',types:['vegetarian_restaurant'],rating:4.8,userRatingCount:80,distanceMeters:500,businessStatus:'CLOSED_PERMANENTLY',features:{servesVegetarianFood:true}}
 ];
 window.LuviaPlaces={
  nearbySearch:async()=>({ok:true,data:{places:mixed}}),
  textSearch:async()=>({ok:true,data:{places:mixed}})
 };
 const contract={id:'places:culinary:dinner:test',domain:'places',query:'Vegetarisches Restaurant',includedTypes:['vegetarian_restaurant','restaurant'],excludedTypes:['airport'],strictTypeFiltering:true,strictDestination:true,maxDistanceMeters:5000,minRating:3.5,minUserRatingCount:5,featureRequirements:{servesVegetarianFood:true},searchMode:'hybrid'};
 const response=await service.search({type:'restaurant',contract,destination:{name:'München'},maxResultCount:20});
 assert.strictEqual(response.ok,true);
 assert.deepStrictEqual(Array.from(response.data.places,p=>p.providerPlaceId),['valid']);
 assert.strictEqual(response.data.exact,true);
 assert.strictEqual(response.data.rejectedFallbacks,true);
 assert.strictEqual(response.meta.noCrossCategoryFallback,true);
 console.log('Strict discovery contract and no cross-category fallback: OK');
}
main().catch(error=>{console.error(error);process.exit(1)});
