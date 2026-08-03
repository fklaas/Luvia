/* Build 13.15.0 – static architecture regression test */
const fs=require('fs');
const assert=require('assert');
const files=['modules/restaurants-v2/restaurant-module.js','modules/accommodations/accommodation-module.js','modules/attractions/attraction-module.js','modules/photo-spots/photo-spot-module.js','modules/shopping/shopping-module.js','modules/nature/nature-module.js','modules/mobility/mobility-module.js'];
for(const file of files){const text=fs.readFileSync(file,'utf8');assert(text.includes('LuviaPlaceExperience.discovery'),`${file}: global discovery shell missing`);assert(text.includes('LuviaPlaceCollections.favoritePanel'),`${file}: global favorite panel missing`);assert(text.includes('LuviaPlaceUI.card'),`${file}: global card missing`);assert(!/function\s+(setFavorite|toggleFavorite|clearFavorites)\s*\(/.test(text),`${file}: local favorite writer forbidden`);assert(!/LuviaPlaceEntities\.updateLifecycle\([^)]*isFavorite/.test(text),`${file}: direct favorite lifecycle write forbidden`);}
const index=fs.readFileSync('index.html','utf8');
const placeUi=fs.readFileSync('core/places/place-ui.js','utf8');
for(const token of ['place-runtime-store.js','place-command-service.js','shopping-intelligence-service.js','modules/shopping/shopping-module.js','nature-intelligence-service.js','modules/nature/nature-module.js','transport-intelligence-service.js','modules/mobility/mobility-module.js','modules/move-shell.js'])assert(index.includes(token),`index missing ${token}`);
assert(placeUi.includes('function insightGrid'),'global insight renderer missing');
const placesShell=fs.readFileSync('modules/places-shell.js','utf8'),moveShell=fs.readFileSync('modules/move-shell.js','utf8');
assert(!placesShell.includes("mobility:{"),'Move must not be rendered in the Places hub');
assert(moveShell.includes('places-hub-grid')&&moveShell.includes('places-hub-tile'),'Move must reuse the shared Places hub UI primitives');
for(const forbidden of ['cycling-route-service.js','cycling-route-intelligence-service.js','modules/cycling-routes/cycling-route-module.js'])assert(!index.includes(forbidden),`retired cycling asset still loaded: ${forbidden}`);
console.log('Place architecture static regression: OK');
