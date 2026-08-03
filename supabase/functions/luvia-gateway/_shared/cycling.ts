const DEFAULT_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];

const VERSION = '4.11.2';
const ROUTE_PROVIDER_TIMEOUT_MS = 5200;
const TRAIL_PROVIDER_TIMEOUT_MS = 5600;
const MAX_RADIUS_METERS = 300000;
const cache = new Map<string, { expires: number; value: any }>();
const metrics = {
  requests: 0,
  successes: 0,
  failures: 0,
  timeouts: 0,
  routeSearches: 0,
  trailSearches: 0,
  lastRequestAt: null as string | null,
  lastSuccessAt: null as string | null,
  lastError: null as unknown,
  lastDurationMs: null as number | null
};

const clean = (value: unknown) => String(value ?? '').trim();
const finite = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : null;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function endpoints() {
  const configured = clean(Deno.env.get('OVERPASS_API_URL'));
  return [...new Set([configured, ...DEFAULT_ENDPOINTS].filter(Boolean))];
}

function center(payload: any) {
  const raw = payload?.location || payload?.destination?.location || payload?.destination?.center || payload?.destination?.coordinates || {};
  const latitude = finite(raw.latitude ?? raw.lat);
  const longitude = finite(raw.longitude ?? raw.lng);
  if (latitude === null || longitude === null) {
    throw Object.assign(new Error('Für Fahrradrouten werden Zielkoordinaten benötigt.'), {
      code: 'CYCLING_LOCATION_REQUIRED',
      status: 400
    });
  }
  return { latitude, longitude };
}

function hash(value: unknown) {
  let h = 2166136261;
  for (const c of JSON.stringify(value)) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function cached(key: string) {
  const found = cache.get(key);
  if (!found) return null;
  if (found.expires < Date.now()) {
    cache.delete(key);
    return null;
  }
  return found.value;
}

function store(key: string, value: any, ttl = 15 * 60_000) {
  cache.set(key, { expires: Date.now() + ttl, value });
}

async function fetchOverpass(endpoint: string, query: string, controller: AbortController, delayMs: number, timeoutMs: number) {
  if (delayMs) await wait(delayMs);
  const timer = setTimeout(() => controller.abort('provider-timeout'), timeoutMs);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'Accept': 'application/json',
        'User-Agent': `Luvia-Travel-App/${VERSION}`
      },
      body: new URLSearchParams({ data: query }),
      signal: controller.signal
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.remark || `Overpass ${response.status}`);
    return { body, endpoint };
  } finally {
    clearTimeout(timer);
  }
}

async function overpass(query: string, stage: 'routes' | 'trails' | 'details', timeoutMs: number) {
  const started = Date.now();
  const providers = endpoints();
  const controllers = providers.map(() => new AbortController());
  metrics.requests++;
  metrics.lastRequestAt = new Date().toISOString();
  if (stage === 'routes') metrics.routeSearches++;
  if (stage === 'trails') metrics.trailSearches++;
  try {
    const attempts = providers.map((endpoint, index) => fetchOverpass(endpoint, query, controllers[index], index * 160, timeoutMs));
    const result = await Promise.any(attempts);
    metrics.successes++;
    metrics.lastSuccessAt = new Date().toISOString();
    metrics.lastError = null;
    metrics.lastDurationMs = Date.now() - started;
    return result;
  } catch (error) {
    metrics.failures++;
    metrics.lastDurationMs = Date.now() - started;
    const message = error instanceof Error ? error.message : String(error);
    if (/abort|timeout/i.test(message)) metrics.timeouts++;
    metrics.lastError = message;
    throw Object.assign(new Error('OpenStreetMap-Routendaten sind vorübergehend nicht erreichbar.'), {
      code: 'CYCLING_PROVIDER_ERROR',
      status: 502,
      cause: error
    });
  } finally {
    controllers.forEach(controller => controller.abort('winner-selected'));
  }
}

function routeProfile(tags: any = {}) {
  const all = [
    tags.route,
    tags['mtb:type'],
    tags['mtb:scale'],
    tags['bicycle:mtb'],
    tags.name,
    tags.description,
    tags.surface,
    tags.tracktype,
    tags.network,
    tags.ref,
    tags.sport,
    tags.leisure
  ].filter(Boolean).join(' ').toLowerCase();
  if (tags.route === 'mtb' || tags['mtb:scale'] !== undefined || tags['mtb:scale:imba'] !== undefined || tags['mtb:type'] !== undefined || tags['bicycle:mtb'] !== undefined || /mountain|\bmtb\b|singletrail|downhill|enduro|freeride|bikepark|trailcenter|trail centre/.test(all)) return 'mtb';
  if (/gravel|schotter|unpaved|fine_gravel|compacted|ground|tracktype/.test(all)) return 'gravel';
  if (/city|urban|stadt|metropolitan|local cycle|\blcn\b|veloroute|voie verte/.test(all)) return 'city';
  if (/family|familie|children|kinder/.test(all)) return 'family';
  return 'touring';
}

function profileLabel(profile: string) {
  return ({
    mtb: 'Mountainbike-Trail',
    gravel: 'Gravel-Tour',
    city: 'City-Radtour',
    family: 'Familienroute',
    touring: 'Radtour'
  } as Record<string, string>)[profile] || 'Fahrradroute';
}

function resultKindLabel(kind: string) {
  return ({
    route_relation: 'Ausgeschilderte Route',
    trail_segment: 'Trailsegment',
    trail_area: 'Trailgebiet',
    trail_center: 'Trailzentrum',
    cycling_area: 'Fahrradgebiet'
  } as Record<string, string>)[kind] || 'Fahrradroute';
}

function difficulty(tags: any = {}) {
  const scale = clean(tags['mtb:scale'] || tags['mtb:scale:imba']);
  if (scale) return `S${scale.replace(/^S/i, '')}`;
  const profile = routeProfile(tags);
  return profile === 'mtb' ? 'Vor Ort prüfen' : profile === 'gravel' ? 'Leicht bis mittel' : profile === 'city' || profile === 'family' ? 'Leicht' : 'Leicht bis mittel';
}

function parseDistance(value: unknown) {
  const text = clean(value).replace(',', '.').toLowerCase();
  if (!text) return null;
  const n = Number(text.match(/[0-9.]+/)?.[0]);
  if (!Number.isFinite(n)) return null;
  if (/mi|mile/.test(text)) return Math.round(n * 1609.344);
  if (/\bm\b|meter/.test(text) && !/km/.test(text)) return Math.round(n);
  return Math.round(n * 1000);
}

function elementCenter(element: any) {
  const c = element?.center || (element?.bounds && {
    lat: (element.bounds.minlat + element.bounds.maxlat) / 2,
    lon: (element.bounds.minlon + element.bounds.maxlon) / 2
  }) || {};
  return { latitude: finite(c.lat), longitude: finite(c.lon) };
}

function haversine(a: any, b: any) {
  const R = 6371000;
  const toRad = (x: number) => x * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function destinationDistance(location: any, searchCenter: any) {
  if (location?.latitude === null || location?.longitude === null) return null;
  return Math.round(haversine(
    { lat: searchCenter.latitude, lon: searchCenter.longitude },
    { lat: Number(location.latitude), lon: Number(location.longitude) }
  ));
}

function isUnpaved(tags: any = {}) {
  const text = [tags.surface, tags.tracktype, tags.highway, tags.description].filter(Boolean).join(' ').toLowerCase();
  return /gravel|fine_gravel|compacted|unpaved|ground|dirt|earth|mud|sand|track|path/.test(text);
}

function matchTier(profile: string, requestedProfile: string, tags: any = {}, resultKind = 'route_relation') {
  if (!requestedProfile || requestedProfile === 'all') return 'exact';
  if (profile === requestedProfile) return 'exact';
  if (requestedProfile === 'mtb') {
    if (profile === 'gravel' || resultKind === 'trail_area' || resultKind === 'trail_segment' || resultKind === 'trail_center') return 'related';
    return 'fallback';
  }
  if (requestedProfile === 'gravel') {
    if (profile === 'mtb' || (profile === 'touring' && isUnpaved(tags))) return 'related';
    return 'fallback';
  }
  if (requestedProfile === 'city') {
    if (profile === 'touring' || profile === 'family') return 'related';
    return 'fallback';
  }
  if (requestedProfile === 'family') {
    if (profile === 'city' || profile === 'touring') return 'related';
    return 'fallback';
  }
  return 'fallback';
}

function quality(tags: any, profile: string, osmType: string, requestedProfile: string, distanceFromCenter: number | null, radius: number, resultKind: string) {
  let score = 44;
  const name = clean(tags.name || tags.ref);
  const explicitName = Boolean(tags.name || tags.ref);
  const tier = matchTier(profile, requestedProfile, tags, resultKind);
  if (tier === 'exact') score += 25;
  else if (tier === 'related') score += 11;
  else score -= 4;
  if (resultKind === 'route_relation') score += 13;
  if (resultKind === 'trail_area') score += 8;
  if (resultKind === 'trail_center') score += 6;
  if (explicitName) score += 10;
  else if (resultKind === 'trail_segment') score -= 4;
  if (tags.distance || tags.length) score += 7;
  if (tags.network || tags.ref) score += 7;
  if (tags['mtb:scale'] || tags['mtb:scale:imba']) score += 10;
  if (tags.surface || tags.tracktype) score += 5;
  if (/bikepark|trailcenter|trail centre|singletrail|enduro|downhill/i.test([name, tags.description].join(' '))) score += 8;
  if (distanceFromCenter !== null) score += Math.max(-14, 10 - Math.round(distanceFromCenter / Math.max(10000, radius) * 18));
  return clamp(Math.round(score), 32, 98);
}

function mapUriFor(location: any, osmType: string, osmId: string) {
  if (['relation', 'way', 'node'].includes(osmType) && /^\d+$/.test(osmId)) return `https://www.openstreetmap.org/${osmType}/${osmId}`;
  if (location?.latitude !== null && location?.longitude !== null) {
    const lat = Number(location.latitude).toFixed(6);
    const lon = Number(location.longitude).toFixed(6);
    return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=14/${lat}/${lon}`;
  }
  return 'https://www.openstreetmap.org/';
}

function normalized(element: any, destinationName = '', searchCenter: any = null, requestedProfile = 'all', radius = 150000, forcedKind = '') {
  const tags = element?.tags || {};
  const profile = routeProfile(tags);
  const location = elementCenter(element);
  const osmType = element.type || 'relation';
  const osmId = String(element.id || '');
  const resultKind = forcedKind || element.resultKind || (osmType === 'relation' ? 'route_relation' : (tags.leisure || tags.sport ? 'trail_center' : 'trail_segment'));
  const providerPlaceId = element.providerPlaceId || `osm-${osmType}-${osmId}`;
  const distanceFromDestinationMeters = searchCenter ? destinationDistance(location, searchCenter) : null;
  const distanceText = distanceFromDestinationMeters === null ? '' : `${Math.max(1, Math.round(distanceFromDestinationMeters / 1000))} km vom Reiseziel`;
  const explicitName = clean(tags.name || tags.ref);
  const generatedName = resultKind === 'trail_area'
    ? `${profile === 'mtb' ? 'MTB-Trailgebiet' : profile === 'gravel' ? 'Gravel-Streckengebiet' : 'Fahrradgebiet'}${distanceText ? ` · ${distanceText}` : ''}`
    : resultKind === 'trail_center'
      ? `${profile === 'mtb' ? 'MTB-Trailzentrum' : 'Fahrradzentrum'}${distanceText ? ` · ${distanceText}` : ''}`
      : `${profileLabel(profile)}${distanceText ? ` · ${distanceText}` : ` ${osmId}`}`;
  const name = explicitName || generatedName;
  const description = clean(tags.description || tags.note) || `${resultKindLabel(resultKind)} aus OpenStreetMap-Routendaten.`;
  const distanceMeters = parseDistance(tags.distance || tags.length);
  const tier = matchTier(profile, requestedProfile, tags, resultKind);
  const qualityScore = quality(tags, profile, osmType, requestedProfile, distanceFromDestinationMeters, radius, resultKind);
  const canLoadDetails = ['relation', 'way'].includes(osmType) && /^\d+$/.test(osmId) && resultKind !== 'trail_area';
  return {
    id: providerPlaceId,
    providerPlaceId,
    provider: 'openstreetmap',
    source: 'openstreetmap',
    sourceId: element.sourceId || `${osmType}/${osmId}`,
    name,
    displayName: name,
    formattedAddress: destinationName || '',
    shortAddress: destinationName || '',
    description,
    editorialSummary: description,
    location,
    primaryType: 'cycling_route',
    primaryTypeLabel: profileLabel(profile),
    types: ['cycling_route', profile, resultKind, clean(tags.route)].filter(Boolean),
    mapsUri: mapUriFor(location, osmType, osmId),
    website: clean(tags.website || tags.url) || null,
    rating: null,
    userRatingCount: 0,
    openNow: null,
    photos: [],
    matchScore: qualityScore,
    routeData: {
      osmType,
      osmId,
      profile,
      profileLabel: profileLabel(profile),
      resultKind,
      resultKindLabel: resultKindLabel(resultKind),
      matchTier: tier,
      requestedProfile,
      isCompleteRoute: resultKind === 'route_relation',
      canLoadDetails,
      network: clean(tags.network) || null,
      reference: clean(tags.ref) || null,
      distanceMeters,
      distanceFromDestinationMeters,
      qualityScore,
      difficulty: difficulty(tags),
      surface: clean(tags.surface) || null,
      trackType: clean(tags.tracktype) || null,
      roundTrip: /yes|roundtrip|circular/i.test(clean(tags.roundtrip || tags.circular)),
      operator: clean(tags.operator) || null,
      signedDirection: clean(tags.signed_direction) || null,
      sourceObjectCount: Number(element.sourceObjectCount) || 1,
      source: 'OpenStreetMap',
      attribution: '© OpenStreetMap-Mitwirkende'
    },
    raw: {
      type: osmType,
      id: element.id,
      tags,
      center: element.center || null,
      bounds: element.bounds || null,
      members: element.members || null
    }
  };
}

const GENERIC_WORDS = new Set([
  'fahrrad', 'fahrräder', 'route', 'routen', 'tour', 'touren', 'radtour', 'radtouren', 'radweg', 'radwege',
  'trail', 'trails', 'mountainbike', 'mountainbiking', 'mtb', 'singletrail', 'singletrails', 'enduro', 'downhill',
  'gravel', 'schotter', 'city', 'stadt', 'familie', 'familien', 'bikepark', 'bikeparks', 'entdecken', 'cycling',
  'bicycle', 'strecke', 'strecken', 'rundtour', 'rundtouren', 'leicht', 'klassisch', 'klassische'
]);

function significantWords(query: string) {
  return clean(query).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter(word => word.length > 2 && !GENERIC_WORDS.has(word));
}

function matchesSemantic(route: any, query: string) {
  const words = significantWords(query);
  if (!words.length) return true;
  const text = [
    route.name,
    route.description,
    route.routeData?.profile,
    route.routeData?.network,
    route.routeData?.surface,
    route.routeData?.reference,
    route.routeData?.resultKindLabel
  ].filter(Boolean).join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return words.every(word => text.includes(word));
}

function routeRelationsQuery(latitude: number, longitude: number, radius: number) {
  return `[out:json][timeout:5];\n(\n relation(around:${radius},${latitude},${longitude})["type"="route"]["route"~"^(bicycle|mtb)$"];\n);\nout tags center 220;`;
}

function trailFeaturesQuery(latitude: number, longitude: number, radius: number, profile: string) {
  const localRadius = Math.min(radius, profile === 'mtb' ? 85000 : profile === 'gravel' ? 70000 : 50000);
  const mtb = `\n way(around:${localRadius},${latitude},${longitude})["highway"~"^(path|track|cycleway)$"]["mtb:scale"];\n way(around:${localRadius},${latitude},${longitude})["highway"~"^(path|track|cycleway)$"]["mtb:type"];\n way(around:${localRadius},${latitude},${longitude})["highway"~"^(path|track|cycleway)$"]["bicycle:mtb"];`;
  const gravel = `\n way(around:${Math.min(localRadius, 70000)},${latitude},${longitude})["highway"~"^(path|track|cycleway)$"]["bicycle"~"^(yes|designated)$"]["surface"~"^(gravel|fine_gravel|compacted|unpaved|ground|dirt|earth)$"];`;
  const facilities = `\n nwr(around:${Math.min(radius, 120000)},${latitude},${longitude})["leisure"~"^(track|sports_centre)$"]["sport"~"(cycling|mountain_biking|bmx)"];\n nwr(around:${Math.min(radius, 120000)},${latitude},${longitude})["sport"~"^(cycling|mountain_biking|bmx)$"]["name"];`;
  const featureParts = profile === 'mtb' ? mtb : profile === 'gravel' ? `${gravel}${mtb}` : `${mtb}${gravel}`;
  return `[out:json][timeout:6];\n(\n${featureParts}${facilities}\n);\nout tags center 260;`;
}

function detailsQuery(osmType: string, osmId: string) {
  if (osmType === 'way') return `[out:json][timeout:10];way(${osmId});out tags center geom;`;
  return `[out:json][timeout:10];relation(${osmId});out tags center;way(r);out tags center geom;`;
}

function cellKey(location: any, profile: string) {
  const lat = Number(location?.latitude);
  const lon = Number(location?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return `${profile}:${Math.round(lat / 0.035)}:${Math.round(lon / 0.045)}`;
}

function clusterTrailElements(elements: any[], destinationName: string, searchCenter: any, requestedProfile: string, radius: number) {
  const direct: any[] = [];
  const clusters = new Map<string, any[]>();
  for (const element of elements) {
    const tags = element?.tags || {};
    const location = elementCenter(element);
    const kind = tags.leisure || tags.sport ? 'trail_center' : 'trail_segment';
    if (kind === 'trail_center' || clean(tags.name || tags.ref)) {
      direct.push(normalized(element, destinationName, searchCenter, requestedProfile, radius, kind));
      continue;
    }
    const profile = routeProfile(tags);
    const key = cellKey(location, profile);
    if (!key) continue;
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key)!.push(element);
  }
  for (const [key, group] of clusters.entries()) {
    if (!group.length) continue;
    const centers = group.map(elementCenter).filter(c => c.latitude !== null && c.longitude !== null);
    if (!centers.length) continue;
    const centerValue = {
      lat: centers.reduce((sum, c) => sum + Number(c.latitude), 0) / centers.length,
      lon: centers.reduce((sum, c) => sum + Number(c.longitude), 0) / centers.length
    };
    const profiles = group.map(item => routeProfile(item.tags || {}));
    const profile = profiles.includes('mtb') ? 'mtb' : profiles.includes('gravel') ? 'gravel' : profiles[0] || 'touring';
    const scales = group.map(item => clean(item.tags?.['mtb:scale'] || item.tags?.['mtb:scale:imba'])).filter(Boolean).sort((a, b) => Number.parseFloat(b) - Number.parseFloat(a));
    const surfaces = group.map(item => clean(item.tags?.surface || item.tags?.tracktype)).filter(Boolean);
    const synthetic = {
      type: 'cluster',
      id: hash([key, group.map(item => item.id).sort()]),
      providerPlaceId: `osm-cluster-${hash([key, group.map(item => item.id).sort()])}`,
      sourceId: `cluster/${hash([key, group.length])}`,
      resultKind: 'trail_area',
      sourceObjectCount: group.length,
      center: centerValue,
      tags: {
        route: profile === 'mtb' ? 'mtb' : 'bicycle',
        'mtb:scale': scales[0] || undefined,
        surface: surfaces[0] || undefined,
        description: `${group.length} zusammenhängend gefundene, für ${profile === 'mtb' ? 'Mountainbike' : profile === 'gravel' ? 'Gravel' : 'Fahrrad'} relevante OSM-Wegsegmente.`
      },
      members: group.slice(0, 40).map(item => ({ type: item.type, ref: item.id }))
    };
    direct.push(normalized(synthetic, destinationName, searchCenter, requestedProfile, radius, 'trail_area'));
  }
  return direct;
}

function dedupeAndSelect(items: any[], requestedProfile: string, query: string, maxResultCount: number) {
  const semantic = items.filter(route => matchesSemantic(route, query));
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const unique = semantic.filter(route => {
    const id = clean(route.providerPlaceId);
    const nameKey = `${route.routeData?.profile}:${route.routeData?.resultKind}:${clean(route.name).toLowerCase().replace(/[^a-z0-9äöüß]+/g, ' ').trim()}`;
    if (seenIds.has(id) || (nameKey && seenNames.has(nameKey))) return false;
    seenIds.add(id);
    if (nameKey) seenNames.add(nameKey);
    return true;
  });
  unique.sort((a, b) => Number(b.routeData?.qualityScore || 0) - Number(a.routeData?.qualityScore || 0)
    || Number(a.routeData?.distanceFromDestinationMeters ?? Infinity) - Number(b.routeData?.distanceFromDestinationMeters ?? Infinity)
    || String(a.name).localeCompare(String(b.name), 'de'));

  const exact = unique.filter(route => route.routeData?.matchTier === 'exact');
  const related = unique.filter(route => route.routeData?.matchTier === 'related');
  const fallback = unique.filter(route => route.routeData?.matchTier === 'fallback');
  const max = Math.max(6, Math.min(42, maxResultCount || 30));
  let selected: any[];
  if (!requestedProfile || requestedProfile === 'all') selected = unique.slice(0, max);
  else if (exact.length >= 8) selected = [...exact.slice(0, Math.min(max, 24)), ...related.slice(0, Math.max(0, max - Math.min(max, 24)))].slice(0, max);
  else if (exact.length) selected = [...exact, ...related, ...fallback].slice(0, max);
  else selected = [...related, ...fallback].slice(0, max);

  return {
    selected,
    summary: {
      exactCount: exact.length,
      relatedCount: related.length,
      fallbackCount: fallback.length,
      selectedCount: selected.length,
      resultMode: !requestedProfile || requestedProfile === 'all' || exact.length ? 'exact' : related.length ? 'broadened' : fallback.length ? 'fallback' : 'empty'
    }
  };
}

function geometryDetails(elements: any[]) {
  const ways = elements.filter(el => el.type === 'way' && Array.isArray(el.geometry) && el.geometry.length > 1);
  const segments: any[] = [];
  const surfaces = new Map<string, number>();
  const scales: string[] = [];
  let distance = 0;
  for (const way of ways) {
    const geometry = way.geometry.filter((p: any) => finite(p.lat) !== null && finite(p.lon) !== null).map((p: any) => ({ lat: Number(p.lat), lon: Number(p.lon) }));
    if (geometry.length < 2) continue;
    for (let i = 1; i < geometry.length; i++) distance += haversine(geometry[i - 1], geometry[i]);
    segments.push(geometry);
    const surface = clean(way.tags?.surface || way.tags?.tracktype);
    if (surface) surfaces.set(surface, (surfaces.get(surface) || 0) + 1);
    const scale = clean(way.tags?.['mtb:scale'] || way.tags?.['mtb:scale:imba']);
    if (scale) scales.push(scale);
  }
  const totalPoints = segments.reduce((sum, segment) => sum + segment.length, 0);
  const step = Math.max(1, Math.ceil(totalPoints / 320));
  let cursor = 0;
  const simplified = segments.map(segment => segment.filter((_: any, index: number) => {
    const keep = cursor % step === 0 || index === segment.length - 1;
    cursor++;
    return keep;
  })).filter(segment => segment.length > 1);
  const all = simplified.flat();
  const first = all[0];
  const last = all[all.length - 1];
  const loop = first && last ? haversine(first, last) < 180 : false;
  const surface = [...surfaces.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name]) => name).join(', ') || null;
  const maxScale = scales.sort((a, b) => Number.parseFloat(b) - Number.parseFloat(a))[0] || null;
  return { segments: simplified, distanceMeters: Math.round(distance) || null, surface, maxMtbScale: maxScale, roundTrip: loop };
}

function estimatedDuration(distanceMeters: number | null, profile: string) {
  if (!distanceMeters) return null;
  const speed = profile === 'mtb' ? 12 : profile === 'gravel' ? 18 : profile === 'city' ? 15 : profile === 'family' ? 12 : 17;
  return Math.max(15, Math.round(distanceMeters / 1000 / speed * 60));
}

function detailNormalized(base: any, elements: any[]) {
  const relation = elements.find(el => el.type === base.routeData.osmType && String(el.id) === String(base.routeData.osmId)) || elements.find(el => el.tags) || {};
  const tags = { ...(base.raw?.tags || {}), ...(relation.tags || {}) };
  const geo = geometryDetails(elements);
  const profile = routeProfile(tags);
  const distanceMeters = parseDistance(tags.distance || tags.length) || geo.distanceMeters || base.routeData.distanceMeters;
  return {
    ...base,
    description: clean(tags.description || base.description),
    routeData: {
      ...base.routeData,
      profile,
      profileLabel: profileLabel(profile),
      distanceMeters,
      estimatedDurationMinutes: estimatedDuration(distanceMeters, profile),
      difficulty: geo.maxMtbScale ? `S${geo.maxMtbScale.replace(/^S/i, '')}` : difficulty(tags),
      surface: geo.surface || clean(tags.surface) || base.routeData.surface,
      roundTrip: /yes|roundtrip|circular/i.test(clean(tags.roundtrip || tags.circular)) || geo.roundTrip,
      geometrySegments: geo.segments,
      geometryPointCount: geo.segments.reduce((sum: number, s: any[]) => sum + s.length, 0),
      elevationGainMeters: null,
      elevationSource: null,
      dataConfidence: geo.segments.length ? 'hoch' : 'mittel'
    },
    raw: { ...base.raw, details: elements }
  };
}

async function routeSearch(payload: any) {
  const c = center(payload);
  const radius = clamp(Number(payload?.radiusMeters || payload?.destination?.searchRadiusMeters || 150000), 10000, MAX_RADIUS_METERS);
  const profile = clean(payload?.profile || 'all').toLowerCase();
  const destinationName = clean(payload?.destination?.displayName || payload?.destination?.name || '');
  const query = clean(payload?.query);
  const semanticQuery = significantWords(query).join(' ');
  const key = `routes:${hash([c, radius, profile, semanticQuery])}`;
  const hit = cached(key);
  if (hit) return { data: hit, cache: { hit: true, key } };
  const started = Date.now();
  let body: any = { elements: [] };
  let endpoint: string | null = null;
  let warning: string | null = null;
  try {
    const response = await overpass(routeRelationsQuery(c.latitude, c.longitude, radius), 'routes', ROUTE_PROVIDER_TIMEOUT_MS);
    body = response.body;
    endpoint = response.endpoint;
  } catch (error) {
    warning = error instanceof Error ? error.message : 'OSM-Routenrelationen sind vorübergehend nicht erreichbar.';
  }
  const normalizedRoutes = (body?.elements || []).map((element: any) => normalized(element, destinationName, c, profile, radius, 'route_relation'));
  const { selected, summary } = dedupeAndSelect(normalizedRoutes, profile, query, Number(payload?.maxResultCount || 30));
  const value = {
    routes: selected,
    provider: 'openstreetmap-overpass',
    stage: 'routes',
    endpoint,
    warning,
    summary,
    attribution: '© OpenStreetMap-Mitwirkende',
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    searchContext: { center: c, radiusMeters: radius, profile, query, semanticQuery }
  };
  store(key, value);
  return { data: value, cache: { hit: false, key } };
}

async function trailSearch(payload: any) {
  const c = center(payload);
  const radius = clamp(Number(payload?.radiusMeters || payload?.destination?.searchRadiusMeters || 150000), 10000, MAX_RADIUS_METERS);
  const profile = clean(payload?.profile || 'all').toLowerCase();
  const destinationName = clean(payload?.destination?.displayName || payload?.destination?.name || '');
  const query = clean(payload?.query);
  const semanticQuery = significantWords(query).join(' ');
  const key = `trails:${hash([c, radius, profile, semanticQuery])}`;
  const hit = cached(key);
  if (hit) return { data: hit, cache: { hit: true, key } };
  const started = Date.now();
  let body: any = { elements: [] };
  let endpoint: string | null = null;
  let warning: string | null = null;
  try {
    const response = await overpass(trailFeaturesQuery(c.latitude, c.longitude, radius, profile), 'trails', TRAIL_PROVIDER_TIMEOUT_MS);
    body = response.body;
    endpoint = response.endpoint;
  } catch (error) {
    warning = error instanceof Error ? error.message : 'OSM-Trailmerkmale sind vorübergehend nicht erreichbar.';
  }
  const trailFeatures = clusterTrailElements(body?.elements || [], destinationName, c, profile, radius);
  const { selected, summary } = dedupeAndSelect(trailFeatures, profile, query, Number(payload?.maxResultCount || 30));
  const value = {
    routes: selected,
    provider: 'openstreetmap-overpass',
    stage: 'trails',
    endpoint,
    warning,
    summary,
    attribution: '© OpenStreetMap-Mitwirkende',
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    searchContext: { center: c, radiusMeters: radius, profile, query, semanticQuery }
  };
  store(key, value);
  return { data: value, cache: { hit: false, key } };
}

function mergeStageResults(stages: any[], profile: string, query: string, maxResultCount: number) {
  const all = stages.flatMap(stage => stage?.data?.routes || stage?.routes || []);
  return dedupeAndSelect(all, profile, query, maxResultCount);
}

export async function cyclingAction(action: string, payload: any) {
  if (action === 'cycling.health') {
    return {
      data: {
        status: 'ok',
        service: 'cycling-routes',
        version: VERSION,
        configured: true,
        providers: {
          routeRelations: 'openstreetmap-overpass',
          trailFeatures: 'openstreetmap-overpass',
          approachRouting: 'google-routes-bicycle'
        },
        pipeline: {
          stagedDiscovery: true,
          actions: ['cycling.search.routes', 'cycling.search.trails', 'cycling.search'],
          broadenWhenExactEmpty: true,
          unnamedTrailClustering: true
        },
        performance: {
          parallelEndpoints: true,
          routeProviderTimeoutMs: ROUTE_PROVIDER_TIMEOUT_MS,
          trailProviderTimeoutMs: TRAIL_PROVIDER_TIMEOUT_MS,
          defaultRadiusMeters: 150000,
          maxRadiusMeters: MAX_RADIUS_METERS
        },
        metrics: { ...metrics },
        cache: { entries: cache.size }
      }
    };
  }

  if (action === 'cycling.search.routes') return routeSearch(payload);
  if (action === 'cycling.search.trails') return trailSearch(payload);

  if (action === 'cycling.search') {
    const profile = clean(payload?.profile || 'all').toLowerCase();
    const query = clean(payload?.query);
    const maxResultCount = Number(payload?.maxResultCount || 36);
    const [routes, trails] = await Promise.all([routeSearch(payload), trailSearch(payload)]);
    const merged = mergeStageResults([routes, trails], profile, query, maxResultCount);
    return {
      data: {
        routes: merged.selected,
        provider: 'openstreetmap-overpass',
        stage: 'combined',
        warning: [routes?.data?.warning, trails?.data?.warning].filter(Boolean).join(' ') || null,
        summary: merged.summary,
        stages: {
          routes: routes?.data?.summary || null,
          trails: trails?.data?.summary || null
        },
        attribution: '© OpenStreetMap-Mitwirkende',
        generatedAt: new Date().toISOString(),
        searchContext: routes?.data?.searchContext || trails?.data?.searchContext || null
      },
      cache: { hit: Boolean(routes?.cache?.hit && trails?.cache?.hit) }
    };
  }

  if (action === 'cycling.details') {
    const providerPlace = payload?.providerPlace || {};
    const route = providerPlace?.routeData ? providerPlace : normalized({
      type: payload?.osmType,
      id: payload?.osmId,
      tags: payload?.tags || {},
      center: payload?.center || null
    }, clean(payload?.destinationName || ''));
    const osmType = clean(payload?.osmType || route.routeData?.osmType);
    const osmId = clean(payload?.osmId || route.routeData?.osmId);
    if (!['relation', 'way'].includes(osmType) || !/^\d+$/.test(osmId)) {
      throw Object.assign(new Error('Für dieses Trailgebiet ist keine einzelne ladbare OSM-Route vorhanden.'), {
        code: 'CYCLING_ROUTE_DETAILS_UNAVAILABLE',
        status: 400
      });
    }
    const key = `details:${osmType}:${osmId}`;
    const hit = cached(key);
    if (hit) return { data: hit, cache: { hit: true, key } };
    const { body, endpoint } = await overpass(detailsQuery(osmType, osmId), 'details', 7200);
    const value = {
      route: detailNormalized(route, body?.elements || []),
      provider: 'openstreetmap-overpass',
      endpoint,
      attribution: '© OpenStreetMap-Mitwirkende',
      generatedAt: new Date().toISOString()
    };
    store(key, value, 30 * 60_000);
    return { data: value, cache: { hit: false, key } };
  }

  throw Object.assign(new Error('Fahrradrouten-Aktion unbekannt.'), { code: 'ACTION_NOT_FOUND', status: 404 });
}

export function cyclingDiagnostics() {
  return {
    version: VERSION,
    configured: true,
    providers: {
      routeRelations: 'openstreetmap-overpass',
      trailFeatures: 'openstreetmap-overpass',
      approachRouting: 'google-routes-bicycle'
    },
    pipeline: {
      stagedDiscovery: true,
      broadenWhenExactEmpty: true,
      unnamedTrailClustering: true
    },
    performance: {
      parallelEndpoints: true,
      routeProviderTimeoutMs: ROUTE_PROVIDER_TIMEOUT_MS,
      trailProviderTimeoutMs: TRAIL_PROVIDER_TIMEOUT_MS,
      defaultRadiusMeters: 150000,
      maxRadiusMeters: MAX_RADIUS_METERS
    },
    metrics: { ...metrics },
    cache: { entries: cache.size }
  };
}
