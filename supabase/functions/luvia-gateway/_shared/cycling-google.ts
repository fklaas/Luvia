const VERSION = '4.13.0';
const PLACES_BASE = 'https://places.googleapis.com/v1';
const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const CACHE_TTL_MS = 30 * 60_000;
const PROVIDER_TIMEOUT_MS = 8500;
const cache = new Map<string, { expires: number; value: any }>();
const metrics = { searches: 0, placeRequests: 0, routeRequests: 0, successes: 0, failures: 0, lastError: null as any };

const clean = (value: unknown) => String(value ?? '').trim();
const finite = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : null;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function placesKey() {
  return clean(Deno.env.get('GOOGLE_PLACES_API_KEY') || Deno.env.get('GOOGLE_MAPS_API_KEY'));
}
function routesKey() {
  return clean(Deno.env.get('GOOGLE_MAPS_API_KEY') || Deno.env.get('GOOGLE_PLACES_API_KEY'));
}
function center(payload: any) {
  const raw = payload?.destination?.location || payload?.destination?.center || payload?.destination?.canonicalCity?.center || payload?.location || {};
  const latitude = finite(raw.latitude ?? raw.lat);
  const longitude = finite(raw.longitude ?? raw.lng);
  if (latitude === null || longitude === null) throw Object.assign(new Error('Das Reiseziel besitzt keine gültigen Koordinaten.'), { code: 'CYCLING_DESTINATION_MISSING', status: 400 });
  return { latitude, longitude };
}
function destinationName(payload: any) {
  return clean(payload?.destination?.canonicalCity?.name || payload?.destination?.name || payload?.destination?.displayName || 'eurem Reiseziel');
}
function countryCode(payload: any) {
  const code = clean(payload?.destination?.countryCode || payload?.destination?.country?.code || payload?.destination?.canonicalCity?.countryCode).toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

function profile(value: unknown) {
  const p = clean(value).toLowerCase();
  return ['mtb', 'gravel', 'city', 'family', 'touring'].includes(p) ? p : 'touring';
}
function hash(value: unknown) {
  const text = JSON.stringify(value);
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}
function cached(key: string) {
  const item = cache.get(key);
  if (!item) return null;
  if (item.expires <= Date.now()) { cache.delete(key); return null; }
  return item.value;
}
function store(key: string, value: any) {
  cache.set(key, { expires: Date.now() + CACHE_TTL_MS, value });
  return value;
}
function withTimeout(ms = PROVIDER_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('provider-timeout'), ms);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
}
function radians(value: number) { return value * Math.PI / 180; }
function haversine(a: any, b: any) {
  const R = 6371000;
  const dLat = radians(Number(b.latitude) - Number(a.latitude));
  const dLon = radians(Number(b.longitude) - Number(a.longitude));
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(radians(Number(a.latitude))) * Math.cos(radians(Number(b.latitude))) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
function offsetPoint(origin: any, distanceMeters: number, bearingDegrees: number) {
  const R = 6371000;
  const delta = distanceMeters / R;
  const theta = radians(bearingDegrees);
  const lat1 = radians(origin.latitude);
  const lon1 = radians(origin.longitude);
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(delta) + Math.cos(lat1) * Math.sin(delta) * Math.cos(theta));
  const lon2 = lon1 + Math.atan2(Math.sin(theta) * Math.sin(delta) * Math.cos(lat1), Math.cos(delta) - Math.sin(lat1) * Math.sin(lat2));
  return { latitude: lat2 * 180 / Math.PI, longitude: lon2 * 180 / Math.PI };
}
function point(value: any) {
  return { location: { latLng: { latitude: Number(value.latitude), longitude: Number(value.longitude) } } };
}
function durationSeconds(value: any) {
  const match = clean(value).match(/^([0-9.]+)s$/);
  return match ? Number(match[1]) : null;
}
function decodePolyline(encoded = '') {
  let index = 0, lat = 0, lng = 0;
  const points: Array<{ lat: number; lon: number }> = [];
  while (index < encoded.length) {
    let result = 0, shift = 0, byte = 0;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20 && index <= encoded.length);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    result = 0; shift = 0;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20 && index <= encoded.length);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    points.push({ lat: lat / 1e5, lon: lng / 1e5 });
  }
  if (points.length <= 360) return points;
  const step = Math.ceil(points.length / 360);
  return points.filter((_, i) => i % step === 0 || i === points.length - 1);
}

const BLOCKED_TYPES = new Set([
  'restaurant', 'cafe', 'bar', 'lodging', 'hotel', 'clothing_store', 'shoe_store', 'shopping_mall',
  'department_store', 'grocery_store', 'supermarket', 'convenience_store', 'bicycle_store', 'car_dealer'
]);
const PROFILE_CONFIG: Record<string, any> = {
  mtb: {
    label: 'Mountainbike', icon: '🚵', lengths: [14000, 24000, 38000, 56000],
    queries: ['mountain bike trail', 'bike park', 'trail center', 'pump track', 'mountain biking forest'],
    anchorWords: /bike|trail|mtb|mountain|forest|forêt|wald|park|pump|downhill|enduro/i
  },
  gravel: {
    label: 'Gravel', icon: '🪨', lengths: [24000, 38000, 58000, 82000],
    queries: ['gravel cycling route', 'forest cycling', 'nature reserve', 'lake cycling', 'river cycling'],
    anchorWords: /gravel|forest|forêt|wald|nature|lake|lac|river|rivière|park|reserve/i
  },
  city: {
    label: 'City', icon: '🏙️', lengths: [8000, 14000, 22000, 32000],
    queries: ['city park', 'landmark', 'waterfront', 'viewpoint', 'botanical garden'],
    anchorWords: /park|garden|jardin|landmark|monument|water|river|view|point|square|plaza/i
  },
  family: {
    label: 'Familie', icon: '👨‍👩‍👧', lengths: [7000, 11000, 17000, 24000],
    queries: ['family park', 'lake', 'botanical garden', 'zoo', 'large park'],
    anchorWords: /park|garden|jardin|lake|lac|zoo|family|botanic|nature/i
  },
  touring: {
    label: 'Radtour', icon: '🚲', lengths: [18000, 32000, 50000, 72000],
    queries: ['cycling route', 'large park', 'lake', 'forest', 'castle'],
    anchorWords: /cycle|bike|park|forest|forêt|wald|lake|lac|castle|château|nature|river/i
  }
};
function configFor(value: unknown) { return PROFILE_CONFIG[profile(value)] || PROFILE_CONFIG.touring; }

async function googleTextSearch(query: string, payload: any) {
  const apiKey = placesKey();
  if (!apiKey) throw Object.assign(new Error('Google Places ist nicht konfiguriert.'), { code: 'GOOGLE_PLACES_KEY_MISSING', status: 503 });
  const c = center(payload);
  const name = destinationName(payload);
  const timeout = withTimeout(5200);
  metrics.placeRequests++;
  try {
    const requestBody: any = {
      textQuery: `${query} near ${name}`,
      languageCode: 'de',
      pageSize: 8,
      locationBias: { circle: { center: c, radius: 50000 } },
      rankPreference: 'RELEVANCE'
    };
    const region = countryCode(payload);
    if (region) requestBody.regionCode = region;
    const response = await fetch(`${PLACES_BASE}/places:searchText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.shortFormattedAddress,places.location,places.googleMapsUri,places.primaryType,places.types,places.rating,places.userRatingCount,places.editorialSummary,places.websiteUri,places.photos'
      },
      body: JSON.stringify(requestBody),
      signal: timeout.signal
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(body?.error?.message || `Google Places ${response.status}`), { code: 'GOOGLE_PLACES_CYCLING_FAILED', status: response.status >= 500 ? 502 : 400 });
    return Array.isArray(body?.places) ? body.places : [];
  } finally { timeout.done(); }
}
function normalizedAnchor(raw: any, payload: any, requestedProfile: string) {
  const name = clean(raw?.displayName?.text || raw?.displayName || 'Fahrrad-Ziel');
  const location = raw?.location ? { latitude: Number(raw.location.latitude), longitude: Number(raw.location.longitude) } : null;
  const c = center(payload);
  const distance = location ? Math.round(haversine(c, location)) : null;
  const primaryType = clean(raw?.primaryType);
  const types = Array.isArray(raw?.types) ? raw.types : [];
  return {
    id: `google-anchor-${clean(raw?.id).replace(/^places\//, '')}`,
    providerPlaceId: `google-anchor-${clean(raw?.id).replace(/^places\//, '')}`,
    sourceId: clean(raw?.id).replace(/^places\//, ''),
    provider: 'google-places', source: 'google_places',
    name, displayName: name,
    formattedAddress: clean(raw?.formattedAddress), shortAddress: clean(raw?.shortFormattedAddress || raw?.formattedAddress),
    description: clean(raw?.editorialSummary?.text || raw?.editorialSummary) || 'Relevanter Startpunkt, Bikepark oder Ausflugsanker für eine Fahrradtour.',
    editorialSummary: clean(raw?.editorialSummary?.text || raw?.editorialSummary) || null,
    location, primaryType: 'cycling_route', primaryTypeLabel: 'Tourstart & Fahrradziel',
    types: ['cycling_route', 'cycling_anchor', requestedProfile, primaryType, ...types].filter(Boolean),
    mapsUri: clean(raw?.googleMapsUri) || (location ? `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}` : null),
    website: clean(raw?.websiteUri) || null,
    rating: finite(raw?.rating), userRatingCount: Number(raw?.userRatingCount || 0), photos: raw?.photos || [], openNow: null,
    distanceMeters: distance, matchScore: 76,
    routeData: {
      profile: requestedProfile, profileLabel: configFor(requestedProfile).label,
      resultKind: 'cycling_anchor', resultKindLabel: 'Tourstart & Fahrradziel', matchTier: 'related',
      isCompleteRoute: false, generated: false, roundTrip: false, distanceFromDestinationMeters: distance,
      qualityScore: 76, source: 'Google Places', attribution: 'Ortsdaten © Google', dataConfidence: 'hoch',
      anchorPlaceId: clean(raw?.id).replace(/^places\//, ''), anchorPrimaryType: primaryType
    },
    raw: { provider: 'google-places', place: raw }
  };
}
async function searchAnchors(payload: any) {
  const requestedProfile = profile(payload?.profile);
  const cfg = configFor(requestedProfile);
  const key = `anchors:${hash([center(payload), requestedProfile, destinationName(payload)])}`;
  const hit = cached(key);
  if (hit) return hit;
  const settled = await Promise.allSettled(cfg.queries.slice(0, 3).map((query: string) => googleTextSearch(query, payload)));
  const byId = new Map<string, any>();
  for (const item of settled) {
    if (item.status !== 'fulfilled') continue;
    for (const raw of item.value) {
      const id = clean(raw?.id).replace(/^places\//, '');
      if (!id || !raw?.location) continue;
      const type = clean(raw?.primaryType);
      const text = `${raw?.displayName?.text || ''} ${type} ${(raw?.types || []).join(' ')}`;
      if (BLOCKED_TYPES.has(type)) continue;
      if (!cfg.anchorWords.test(text) && !/(park|tourist_attraction|sports_complex|stadium|natural_feature|national_park|zoo|botanical_garden)/i.test(text)) continue;
      byId.set(id, normalizedAnchor(raw, payload, requestedProfile));
    }
  }
  const anchors = [...byId.values()]
    .sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0) || Number(a.distanceMeters || Infinity) - Number(b.distanceMeters || Infinity))
    .slice(0, 18);
  return store(key, { anchors, failures: settled.filter(item => item.status === 'rejected').length });
}
function syntheticAnchors(start: any, targetLength: number, seed: number) {
  const radius = clamp(targetLength / 5.8, 1400, 18000);
  return [
    offsetPoint(start, radius, (seed * 47 + 25) % 360),
    offsetPoint(start, radius * 1.08, (seed * 47 + 155) % 360),
    offsetPoint(start, radius * 0.82, (seed * 47 + 270) % 360)
  ];
}
function selectWaypoints(anchors: any[], start: any, targetLength: number, seed: number) {
  const desired = targetLength / 3.2;
  const usable = anchors.filter(anchor => anchor.location && Number(anchor.distanceMeters || 0) > 800)
    .sort((a, b) => Math.abs(Number(a.distanceMeters || 0) - desired) - Math.abs(Number(b.distanceMeters || 0) - desired));
  if (usable.length >= 2) {
    const first = usable[seed % Math.min(usable.length, 6)];
    const second = usable.find((candidate: any) => candidate.providerPlaceId !== first.providerPlaceId && haversine(first.location, candidate.location) > 1200);
    if (second) return { points: [first.location, second.location], names: [first.name, second.name], anchorIds: [first.sourceId, second.sourceId] };
  }
  return { points: syntheticAnchors(start, targetLength, seed), names: [], anchorIds: [] };
}
function googleMapsDirections(start: any, points: any[], destination = start) {
  const wp = points.map(point => `${Number(point.latitude).toFixed(6)},${Number(point.longitude).toFixed(6)}`).join('|');
  const origin = `${Number(start.latitude).toFixed(6)},${Number(start.longitude).toFixed(6)}`;
  const end = `${Number(destination.latitude).toFixed(6)},${Number(destination.longitude).toFixed(6)}`;
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(end)}&travelmode=bicycling&waypoints=${encodeURIComponent(wp)}`;
}
async function computeLoop(start: any, waypoints: any[]) {
  const apiKey = routesKey();
  if (!apiKey) throw Object.assign(new Error('Google Routes ist nicht konfiguriert.'), { code: 'GOOGLE_ROUTES_KEY_MISSING', status: 503 });
  const destination = offsetPoint(start, 85, 95);
  const request = async (viaPoints: any[]) => {
    const timeout = withTimeout(PROVIDER_TIMEOUT_MS);
    metrics.routeRequests++;
    try {
      const response = await fetch(ROUTES_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'routes.duration,routes.staticDuration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.description,routes.routeLabels,routes.warnings'
        },
        body: JSON.stringify({
          origin: point(start), destination: point(destination),
          intermediates: viaPoints.map(value => ({ ...point(value), via: true })),
          travelMode: 'BICYCLE', languageCode: 'de-DE', units: 'METRIC',
          polylineQuality: 'OVERVIEW', polylineEncoding: 'ENCODED_POLYLINE'
        }),
        signal: timeout.signal
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw Object.assign(new Error(body?.error?.message || `Google Routes ${response.status}`), { code: 'GOOGLE_CYCLING_ROUTE_FAILED', status: response.status >= 500 ? 502 : 400 });
      const route = body?.routes?.[0];
      if (!route?.polyline?.encodedPolyline) throw Object.assign(new Error('Google Routes lieferte keine Routengeometrie.'), { code: 'GOOGLE_CYCLING_ROUTE_EMPTY', status: 502 });
      return { route, destination, usedWaypoints: viaPoints };
    } finally { timeout.done(); }
  };
  try { return await request(waypoints); }
  catch (firstError) {
    if (waypoints.length <= 1) throw firstError;
    return request(waypoints.slice(0, 2));
  }
}

function generatedName(requestedProfile: string, meters: number, name: string, anchors: string[]) {
  const cfg = configFor(requestedProfile);
  const km = Math.max(1, Math.round(meters / 1000));
  const via = anchors.length ? ` über ${anchors.slice(0, 2).join(' & ')}` : '';
  const prefix = requestedProfile === 'mtb' ? 'MTB-Erkundungsrunde' : requestedProfile === 'gravel' ? 'Gravel-Erkundungsrunde' : requestedProfile === 'city' ? 'City-Runde' : requestedProfile === 'family' ? 'Familienrunde' : 'Fahrradrunde';
  return `${prefix} · ${km} km${via || (name ? ` bei ${name}` : '')}`;
}
async function generateRoute(payload: any, anchors: any[], targetLength: number, seed: number) {
  const requestedProfile = profile(payload?.profile);
  const start = center(payload);
  const selection = selectWaypoints(anchors, start, targetLength, seed);
  const computed = await computeLoop(start, selection.points);
  const route = computed.route;
  const meters = Math.round(Number(route?.distanceMeters || targetLength));
  const seconds = durationSeconds(route?.duration) || durationSeconds(route?.staticDuration);
  const geometry = decodePolyline(clean(route?.polyline?.encodedPolyline));
  const id = `google-cycle-${requestedProfile}-${targetLength}-${seed}-${hash([start, selection.points])}`;
  const warnings = ['Google-Radrouten befinden sich beim Provider in der Beta-Phase und können unvollständige Radwege enthalten.'];
  if (requestedProfile === 'mtb' || requestedProfile === 'gravel') warnings.push('Trail-Schwierigkeit und Untergrund werden von Google Routes nicht verlässlich klassifiziert und müssen vor Ort geprüft werden.');
  const name = generatedName(requestedProfile, meters, destinationName(payload), selection.names);
  return {
    id, providerPlaceId: id, provider: 'google-routes', source: 'google_routes', sourceId: id,
    name, displayName: name, formattedAddress: destinationName(payload), shortAddress: destinationName(payload),
    description: requestedProfile === 'mtb' || requestedProfile === 'gravel'
      ? 'Von Luvia mit Google Routes berechnete Erkundungsrunde. Sie folgt dem Fahrrad-Wegenetz; MTB-Trailstatus und Untergrund sind nicht kuratiert.'
      : 'Von Luvia mit Google Routes berechnete Fahrradstrecke durch passende Ziele rund um das Reiseziel.',
    editorialSummary: 'Für euch berechnete Fahrradroute mit vollständiger Geometrie, Distanz und Fahrzeit.',
    location: start, primaryType: 'cycling_route', primaryTypeLabel: configFor(requestedProfile).label,
    types: ['cycling_route', requestedProfile, 'generated_round_trip', 'google_routes'],
    mapsUri: googleMapsDirections(start, computed.usedWaypoints, computed.destination), website: null, rating: null, userRatingCount: 0, openNow: null, photos: [],
    matchScore: requestedProfile === 'mtb' || requestedProfile === 'gravel' ? 88 : 94,
    routeData: {
      profile: requestedProfile, profileLabel: configFor(requestedProfile).label,
      resultKind: 'generated_round_trip', resultKindLabel: 'Für euch berechnete Route', matchTier: 'exact',
      requestedProfile, isCompleteRoute: true, canLoadDetails: false, generated: true, roundTrip: true,
      distanceMeters: meters, estimatedDurationMinutes: seconds == null ? null : Math.max(1, Math.round(seconds / 60)),
      elevationGainMeters: null, elevationLossMeters: null, surface: null,
      difficulty: requestedProfile === 'family' ? 'Leicht geplant' : requestedProfile === 'city' ? 'Leicht bis moderat' : 'Vor Ort prüfen',
      geometrySegments: [geometry], geometryPointCount: geometry.length,
      generationProfile: 'google-routes-bicycle', generationSeed: seed, generationTargetLengthMeters: targetLength,
      viaPoints: computed.usedWaypoints, viaNames: selection.names, anchorPlaceIds: selection.anchorIds, loopClosureMeters: Math.round(haversine(start, computed.destination)),
      qualityScore: requestedProfile === 'mtb' || requestedProfile === 'gravel' ? 88 : 94,
      dataConfidence: 'mittel', warnings, source: 'Google Routes', attribution: 'Routendaten © Google',
      betaWarning: warnings[0]
    },
    raw: { provider: 'google-routes', routeLabels: route?.routeLabels || [], providerWarnings: route?.warnings || [], description: route?.description || null }
  };
}

export async function googleCyclingSearch(payload: any) {
  const requestedProfile = profile(payload?.profile);
  const cfg = configFor(requestedProfile);
  const requestedCount = clamp(Number(payload?.maxGeneratedResultCount || 4), 2, 4);
  const key = `google-cycling:${hash([center(payload), requestedProfile, requestedCount, destinationName(payload)])}`;
  const hit = cached(key);
  if (hit) return { data: hit, cache: { hit: true, key } };
  metrics.searches++;
  const started = Date.now();
  try {
    const anchorPromise = searchAnchors(payload).catch(error => ({ anchors: [], failures: 1, error: error?.message || String(error) }));
    const fastAnchors = await Promise.race([
      anchorPromise,
      new Promise(resolve => setTimeout(() => resolve({ anchors: [], failures: 0, pending: true }), 1800))
    ]) as any;
    const presets = cfg.lengths.slice(0, requestedCount);
    const routePromise = Promise.allSettled(presets.map((length: number, index: number) => generateRoute(payload, fastAnchors.anchors || [], length, index + 1)));
    const [anchorResult, settled] = await Promise.all([anchorPromise, routePromise]);
    const anchors = anchorResult.anchors || [];
    const routes = settled.filter((item): item is PromiseFulfilledResult<any> => item.status === 'fulfilled').map(item => item.value);
    const failures = settled.filter(item => item.status === 'rejected').map((item: any) => item.reason?.message || String(item.reason));
    const value = {
      routes, anchors,
      provider: 'google-cycling', stage: 'primary', configured: Boolean(placesKey() && routesKey()),
      warning: routes.length ? null : (failures[0] || anchorResult.error || 'Google konnte keine Fahrradroute berechnen.'),
      summary: { selectedCount: routes.length, anchorCount: anchors.length, failedRouteCount: failures.length, resultMode: routes.length ? 'google-generated' : anchors.length ? 'anchors-only' : 'empty', fastAnchorCount: Number(fastAnchors?.anchors?.length || 0) },
      attribution: 'Orts- und Routendaten © Google', generatedAt: new Date().toISOString(), durationMs: Date.now() - started,
      searchContext: { center: center(payload), destination: destinationName(payload), profile: requestedProfile, targetLengths: presets }
    };
    metrics.successes++;
    metrics.lastError = null;
    return { data: store(key, value), cache: { hit: false, key } };
  } catch (error) {
    metrics.failures++;
    metrics.lastError = { message: error instanceof Error ? error.message : String(error), at: new Date().toISOString() };
    throw error;
  }
}

export function googleCyclingDiagnostics() {
  return {
    version: VERSION,
    configured: Boolean(placesKey() && routesKey()),
    providers: { places: Boolean(placesKey()), routes: Boolean(routesKey()) },
    capabilities: { anchorDiscovery: true, generatedBicycleRoutes: true, syntheticWaypointFallback: true, profileSpecificAnchors: true, routesDoNotWaitForSlowPlaces: true, routeRetryWithReducedWaypoints: true },
    performance: { timeoutMs: PROVIDER_TIMEOUT_MS, cacheTtlMs: CACHE_TTL_MS, cacheEntries: cache.size },
    metrics: { ...metrics }
  };
}
