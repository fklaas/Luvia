/* Build 13.7.0 – static architecture regression test */
const fs=require('fs');
const assert=require('assert');
const files=['modules/restaurants-v2/restaurant-module.js','modules/accommodations/accommodation-module.js','modules/attractions/attraction-module.js'];
for(const file of files){const text=fs.readFileSync(file,'utf8');assert(text.includes('LuviaPlaceExperience.discovery'),`${file}: global discovery shell missing`);assert(text.includes('LuviaPlaceCollections.favoritePanel'),`${file}: global favorite panel missing`);assert(text.includes('LuviaPlaceUI.card'),`${file}: global card missing`);assert(!/function\s+(setFavorite|toggleFavorite|clearFavorites)\s*\(/.test(text),`${file}: local favorite writer forbidden`);assert(!/LuviaPlaceEntities\.updateLifecycle\([^)]*isFavorite/.test(text),`${file}: direct favorite lifecycle write forbidden`);}
const index=fs.readFileSync('index.html','utf8');assert(index.includes('place-runtime-store.js'));assert(index.includes('place-command-service.js'));
console.log('Place architecture static regression: OK');
