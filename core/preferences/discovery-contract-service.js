(() => {
  'use strict';

  const VERSION = '1.1.0';
  let pendingContract = null;
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const unique = values => [...new Set((Array.isArray(values) ? values : []).map(value => String(value || '').trim()).filter(Boolean))];
  const providerId = place => String(place?.id || place?.providerPlaceId || place?.provider_place_id || place?.sourceId || '').replace(/^places\//, '');
  const rawTypes = place => new Set([place?.primaryType, place?.primary_type, ...(place?.types || [])].filter(Boolean));

  function matchesType(place, contract = {}) {
    const types = rawTypes(place);
    const included = unique(contract.includedTypes);
    const excluded = unique(contract.excludedTypes);
    if (excluded.some(type => types.has(type))) return false;
    if (!included.length) return true;
    return included.some(type => types.has(type));
  }

  function matchesFeatures(place, contract = {}) {
    const requirements = contract.featureRequirements || {};
    const features = place?.features || {};
    for (const [key, expected] of Object.entries(requirements)) {
      if (expected === true && features[key] !== true) return false;
      if (expected === false && features[key] !== false) return false;
      if (expected != null && expected !== true && expected !== false && features[key] !== expected) return false;
    }
    return true;
  }

  function matchesEvidence(place, contract = {}) {
    const terms = unique(contract.requiredEvidenceTerms).map(term => term.toLocaleLowerCase('de-DE'));
    if (!terms.length) return true;
    const text = [place?.name, place?.displayName, place?.editorialSummary, place?.primaryTypeLabel, ...(place?.types || [])]
      .filter(Boolean).join(' ').toLocaleLowerCase('de-DE');
    return terms.some(term => text.includes(term));
  }

  function matchesQuality(place, contract = {}) {
    if (Number.isFinite(Number(contract.minRating)) && Number(place?.rating || 0) < Number(contract.minRating)) return false;
    if (Number.isFinite(Number(contract.minUserRatingCount)) && Number(place?.userRatingCount || 0) < Number(contract.minUserRatingCount)) return false;
    if (Number.isFinite(Number(contract.maxDistanceMeters)) && place?.distanceMeters != null && Number(place.distanceMeters) > Number(contract.maxDistanceMeters)) return false;
    if (place?.businessStatus === 'CLOSED_PERMANENTLY') return false;
    return true;
  }

  function matches(place, contract = {}) {
    return Boolean(providerId(place)) && matchesType(place, contract) && matchesFeatures(place, contract) && matchesEvidence(place, contract) && matchesQuality(place, contract);
  }

  function score(place, contract = {}) {
    const types = rawTypes(place);
    const included = unique(contract.includedTypes);
    let value = 0;
    if (place?.primaryType && included.includes(place.primaryType)) value += 60;
    else if (included.some(type => types.has(type))) value += 40;
    value += Math.min(20, Math.max(0, Number(place?.rating || 0) * 4));
    value += Math.min(12, Math.log10(Math.max(1, Number(place?.userRatingCount || 0))) * 4);
    if (place?.distanceMeters != null && Number(contract.maxDistanceMeters) > 0) value += Math.max(0, 10 - (Number(place.distanceMeters) / Number(contract.maxDistanceMeters)) * 10);
    return Math.round(value * 10) / 10;
  }

  function normalizeResponse(response, contract, merged) {
    for (const place of response?.data?.places || []) {
      const id = providerId(place);
      if (!id || !matches(place, contract)) continue;
      const candidate = { ...place, providerPlaceId: id, discoveryContractId: contract.id, discoveryScore: score(place, contract) };
      const existing = merged.get(id);
      if (!existing || candidate.discoveryScore > existing.discoveryScore) merged.set(id, candidate);
    }
  }

  async function nearbyPlan(contract, destination, maxResultCount, searchOptions) {
    if (!window.LuviaPlaces?.nearbySearch) return null;
    return window.LuviaPlaces.nearbySearch({
      destination,
      includedTypes: unique(contract.includedTypes).slice(0, 50),
      excludedTypes: unique(contract.excludedTypes).slice(0, 50),
      radius: Math.min(50000, Math.max(500, Number(contract.maxDistanceMeters || 18000))),
      maxResultCount: Math.min(20, Math.max(1, maxResultCount)),
      rankPreference: contract.sortBy === 'distance' ? 'DISTANCE' : 'POPULARITY',
      ...searchOptions
    });
  }

  async function textPlans(contract, destination, maxResultCount, searchOptions) {
    if (!window.LuviaPlaces?.textSearch) return [];
    const includedTypes = unique(contract.includedTypes).slice(0, 8);
    const plans = includedTypes.length ? includedTypes : [''];
    const perPlan = Math.max(4, Math.min(20, Math.ceil(maxResultCount / Math.max(1, plans.length)) + 2));
    return Promise.all(plans.map(includedType => window.LuviaPlaces.textSearch(contract.query, {
      destination,
      includedType,
      strictTypeFiltering: Boolean(includedType && contract.strictTypeFiltering !== false),
      strictDestination: contract.strictDestination !== false,
      maxResultCount: perPlan,
      maxDistanceMeters: contract.maxDistanceMeters || 0,
      minRating: contract.minRating ?? null,
      minUserRatingCount: contract.minUserRatingCount || 0,
      sortBy: contract.sortBy || 'relevance',
      ...searchOptions
    }).catch(error => ({ ok: false, error, data: { places: [] } }))));
  }

  async function search({ tripId, type, contract, destination, maxResultCount = 20, searchOptions = {} } = {}) {
    void tripId; void type;
    if (!contract) throw new Error('DISCOVERY_CONTRACT_REQUIRED');
    if (!window.LuviaPlaces) throw new Error('PLACE_SEARCH_UNAVAILABLE');
    const merged = new Map();
    const requests = [];
    const useNearby = contract.strictDestination !== false && contract.searchMode !== 'text';
    if (useNearby) requests.push(nearbyPlan(contract, destination, maxResultCount, searchOptions));
    const needsText = contract.searchMode === 'text' || contract.strictDestination === false || Object.keys(contract.featureRequirements || {}).length > 0 || unique(contract.requiredEvidenceTerms).length > 0;
    if (needsText || !useNearby) requests.push(...await textPlans(contract, destination, maxResultCount, searchOptions));
    const responses = (await Promise.all(requests.filter(Boolean).map(request => Promise.resolve(request).catch(error => ({ ok: false, error, data: { places: [] } }))))).filter(Boolean);
    responses.forEach(response => normalizeResponse(response, contract, merged));
    const places = [...merged.values()]
      .sort((a, b) => Number(b.discoveryScore || 0) - Number(a.discoveryScore || 0) || Number(a.distanceMeters ?? Infinity) - Number(b.distanceMeters ?? Infinity))
      .slice(0, Math.max(1, maxResultCount));
    return {
      ok: true,
      data: {
        places,
        discoveryContract: clone(contract),
        exact: true,
        requestedTypes: unique(contract.includedTypes),
        rejectedFallbacks: true
      },
      meta: {
        provider: 'google-places-new',
        strictTypeFiltering: contract.strictTypeFiltering !== false,
        noCrossCategoryFallback: true,
        requestCount: responses.length,
        strategies: { nearby: useNearby, text: needsText || !useNearby }
      }
    };
  }

  function summaryChips(contract = {}) {
    const labels = contract.labels || {};
    return [labels.intent, labels.subintent, labels.purpose, labels.mode, ...(labels.context || []), ...(labels.priorities || []), labels.distance].filter(Boolean);
  }

  function banner(contract = {}, options = {}) {
    const chips = summaryChips(contract);
    if (!chips.length) return '';
    const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]));
    return `<section class="luv-discovery-contract-banner"><div><span>${esc(options.eyebrow || 'Geführt von Luvia')}</span><h3>${esc(options.title || 'Diese Auswahl passt zu euren Antworten')}</h3><div>${chips.map(chip => `<em>${esc(chip)}</em>`).join('')}</div></div><button type="button" data-guided-refine>Auswahl ändern</button></section>`;
  }

  function setPending(contract = null) { pendingContract = contract ? clone(contract) : null; return pendingContract; }
  function clearPending(contract = null) { if (!contract || pendingContract?.id === contract?.id) pendingContract = null; }
  function pendingFor(moduleId) { return pendingContract && (!moduleId || pendingContract.moduleId === moduleId) ? clone(pendingContract) : null; }

  window.LuviaDiscoveryContracts = Object.freeze({ version: VERSION, matches, matchesType, matchesFeatures, matchesEvidence, matchesQuality, score, search, summaryChips, banner, setPending, clearPending, pendingFor });
})();
