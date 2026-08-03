const fs=require('fs'),assert=require('assert');
const cycling=fs.readFileSync('supabase/functions/luvia-gateway/_shared/cycling.ts','utf8');
const google=fs.readFileSync('supabase/functions/luvia-gateway/_shared/cycling-google.ts','utf8');
const index=fs.readFileSync('supabase/functions/luvia-gateway/index.ts','utf8');
for(const token of ['cycling.health','cycling.search','cycling.search.google','cycling.search.generated','cycling.search.routes','cycling.search.trails','cycling.details','OVERPASS_API_URL','OPENROUTESERVICE_API_KEY','cycling-mountain','round_trip','routeRelationsQuery','mtb:scale','geometrySegments'])assert(cycling.includes(token),`cycling gateway token missing: ${token}`);
for(const token of ['GOOGLE_PLACES_API_KEY','GOOGLE_MAPS_API_KEY','places:searchText','directions/v2:computeRoutes',"travelMode: 'BICYCLE'",'syntheticAnchors','generated_round_trip'])assert(google.includes(token),`Google cycling provider token missing: ${token}`);
assert(index.includes('CYCLING_ACTIONS'));assert(index.includes('cyclingDiagnostics()'));assert(index.includes('cyclingAction(action'));
assert(!cycling.includes('OPENSTREETMAP_API_KEY'),'Overpass must not require an invented API key');
console.log('Cycling provider gateway: OK');
