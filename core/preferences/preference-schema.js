(() => {
  'use strict';

  const VERSION = '3.1.0';
  const PROFILE_VERSION = 3;
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const unique = values => [...new Set((Array.isArray(values) ? values : []).map(value => String(value || '').trim()).filter(Boolean))];

  const TONES = Object.freeze({
    rose: '#f7bfd0',
    peach: '#ffd0ae',
    lavender: '#d7c9f4',
    cream: '#f6e9cf',
    mint: '#c9eadf',
    sky: '#cce4f5'
  });

  const OPTIONS = Object.freeze({
    culinary: { id: 'culinary', label: 'Kulinarik entdecken', icon: '🍽️', tone: 'peach' },
    culture: { id: 'culture', label: 'Kultur & Geschichten', icon: '🏛️', tone: 'lavender' },
    nature: { id: 'nature', label: 'Natur & Ruhe', icon: '🌿', tone: 'cream' },
    family: { id: 'family', label: 'Familienzeit', icon: '♡', tone: 'rose' },
    photography: { id: 'photography', label: 'Tolle Fotos', icon: '📸', tone: 'lavender' },
    shopping: { id: 'shopping', label: 'Besondere Läden', icon: '🛍️', tone: 'peach' },
    wellness: { id: 'wellness', label: 'Wellness & Entspannung', icon: '🫧', tone: 'cream' },
    nightlife: { id: 'nightlife', label: 'Abend & Nachtleben', icon: '🌙', tone: 'lavender' },
    local: { id: 'local', label: 'Lokal & authentisch', icon: '✨', tone: 'rose' },
    beach: { id: 'beach', label: 'Wasser & Strand', icon: '🌊', tone: 'sky' },
    adventure: { id: 'adventure', label: 'Etwas Spannendes', icon: '⚡', tone: 'peach' },
    accommodation: { id: 'accommodation', label: 'Besonders übernachten', icon: '🛏️', tone: 'cream' },

    vegetarian: { id: 'vegetarian', label: 'Vegetarisch', icon: '🥬', tone: 'mint' },
    vegan: { id: 'vegan', label: 'Vegan', icon: '🌱', tone: 'mint' },
    mixed: { id: 'mixed', label: 'Gemischt', icon: '🍴', tone: 'peach' },
    halal: { id: 'halal', label: 'Halal', icon: '◌', tone: 'cream' },
    gluten_free: { id: 'gluten_free', label: 'Glutenfrei', icon: '🌾', tone: 'cream' },
    lactose_free: { id: 'lactose_free', label: 'Laktosefrei', icon: '🥛', tone: 'sky' },
    no_diet: { id: 'no_diet', label: 'Keine besondere Vorgabe', icon: '✨', tone: 'lavender' },

    romantic: { id: 'romantic', label: 'Romantisch', icon: '♡', tone: 'rose' },
    family_friendly: { id: 'family_friendly', label: 'Familienfreundlich', icon: '👨‍👩‍👧', tone: 'cream' },
    spontaneous: { id: 'spontaneous', label: 'Spontan & frei', icon: '✦', tone: 'peach' },
    planned: { id: 'planned', label: 'Gern gut geplant', icon: '🗓️', tone: 'lavender' },
    comfort: { id: 'comfort', label: 'Komfortabel', icon: '☁️', tone: 'cream' },
    authentic: { id: 'authentic', label: 'Möglichst authentisch', icon: '📍', tone: 'rose' },
    sustainable: { id: 'sustainable', label: 'Nachhaltig', icon: '♻️', tone: 'mint' },
    accessible: { id: 'accessible', label: 'Barrierearm', icon: '♿', tone: 'sky' },

    indoor: { id: 'indoor', label: 'Lieber Indoor', icon: '🏠', tone: 'lavender' },
    outdoor: { id: 'outdoor', label: 'Lieber draußen', icon: '☀️', tone: 'peach' },
    active: { id: 'active', label: 'Aktiv unterwegs', icon: '⚡', tone: 'peach' },
    relaxed: { id: 'relaxed', label: 'Entspannt erleben', icon: '☁️', tone: 'cream' },
    live_music: { id: 'live_music', label: 'Live-Musik', icon: '🎵', tone: 'lavender' },
    theatre: { id: 'theatre', label: 'Theater & Shows', icon: '🎭', tone: 'rose' },
    events: { id: 'events', label: 'Events & besondere Abende', icon: '✨', tone: 'peach' },
    water_fun: { id: 'water_fun', label: 'Wasser & Strand', icon: '🌊', tone: 'sky' },

    low: { id: 'low', label: 'Preisbewusst', icon: '€', tone: 'mint' },
    medium: { id: 'medium', label: 'Ausgewogen', icon: '€€', tone: 'cream' },
    premium: { id: 'premium', label: 'Etwas Besonderes', icon: '€€€', tone: 'lavender' },
    pace_relaxed: { id: 'relaxed', label: 'Ganz entspannt', icon: '☁️', tone: 'cream' },
    pace_balanced: { id: 'balanced', label: 'Eine gute Mischung', icon: '↔', tone: 'lavender' },
    pace_active: { id: 'active', label: 'Viel erleben', icon: '⚡', tone: 'peach' },

    full_meal: { id: 'full_meal', label: 'Ein richtig schönes Essen', icon: '🍽️', tone: 'peach' },
    cafe: { id: 'cafe', label: 'Café & Kaffee', icon: '☕', tone: 'cream' },
    sweet: { id: 'sweet', label: 'Etwas Süßes', icon: '🍰', tone: 'rose' },
    snack: { id: 'snack', label: 'Kleine Snacks', icon: '🥐', tone: 'peach' },
    fine_dining: { id: 'fine_dining', label: 'Besonderes Dinner', icon: '✨', tone: 'lavender' },
    local_food: { id: 'local_food', label: 'Lokale Küche', icon: '📍', tone: 'rose' },

    museum: { id: 'museum', label: 'Museum', icon: '🏛️', tone: 'lavender' },
    art: { id: 'art', label: 'Kunst & Galerien', icon: '🎨', tone: 'rose' },
    history: { id: 'history', label: 'Geschichte & Denkmäler', icon: '⌛', tone: 'cream' },
    stage: { id: 'stage', label: 'Theater & Bühne', icon: '🎭', tone: 'peach' },
    architecture: { id: 'architecture', label: 'Architektur', icon: '🏙️', tone: 'sky' },

    park: { id: 'park', label: 'Park & Garten', icon: '🌳', tone: 'mint' },
    botanical: { id: 'botanical', label: 'Botanischer Garten', icon: '🌺', tone: 'rose' },
    waterside: { id: 'waterside', label: 'Wasser & Strand', icon: '🌊', tone: 'sky' },
    hiking: { id: 'hiking', label: 'Wandern & Aussicht', icon: '🥾', tone: 'peach' },
    wild_nature: { id: 'wild_nature', label: 'Naturgebiet', icon: '🌿', tone: 'cream' },

    playground: { id: 'playground', label: 'Spielplatz', icon: '🛝', tone: 'peach' },
    indoor_play: { id: 'indoor_play', label: 'Indoor-Spielwelt', icon: '🏠', tone: 'lavender' },
    animals: { id: 'animals', label: 'Tiere entdecken', icon: '🐘', tone: 'mint' },
    amusement: { id: 'amusement', label: 'Freizeitpark', icon: '🎡', tone: 'rose' },
    family_water: { id: 'family_water', label: 'Wasserpark', icon: '💦', tone: 'sky' },

    observation: { id: 'observation', label: 'Aussichtsplattform', icon: '🔭', tone: 'lavender' },
    scenic: { id: 'scenic', label: 'Besonderer Aussichtspunkt', icon: '🌅', tone: 'peach' },
    landmark: { id: 'landmark', label: 'Ikonisches Motiv', icon: '✨', tone: 'rose' },
    photo_garden: { id: 'photo_garden', label: 'Garten & Naturmotiv', icon: '🌺', tone: 'mint' },
    photo_water: { id: 'photo_water', label: 'Wasser & Küste', icon: '🌊', tone: 'sky' },

    market: { id: 'market', label: 'Markt', icon: '🧺', tone: 'peach' },
    mall: { id: 'mall', label: 'Shoppingcenter', icon: '🏬', tone: 'lavender' },
    fashion: { id: 'fashion', label: 'Mode & Boutiquen', icon: '👗', tone: 'rose' },
    gifts: { id: 'gifts', label: 'Souvenirs & Geschenke', icon: '🎁', tone: 'cream' },
    flea: { id: 'flea', label: 'Flohmarkt & Vintage', icon: '✨', tone: 'mint' },

    spa: { id: 'spa', label: 'Spa & Wellness', icon: '🫧', tone: 'lavender' },
    sauna: { id: 'sauna', label: 'Sauna', icon: '♨️', tone: 'peach' },
    massage: { id: 'massage', label: 'Massage', icon: '☁️', tone: 'cream' },
    yoga: { id: 'yoga', label: 'Yoga & Ruhe', icon: '🧘', tone: 'mint' },
    pool: { id: 'pool', label: 'Schwimmbad', icon: '🏊', tone: 'sky' },

    concert: { id: 'concert', label: 'Live-Musik & Konzerte', icon: '🎵', tone: 'lavender' },
    bar: { id: 'bar', label: 'Bar & Cocktails', icon: '🍸', tone: 'rose' },
    performance: { id: 'performance', label: 'Theater & Oper', icon: '🎭', tone: 'peach' },
    comedy: { id: 'comedy', label: 'Comedy', icon: '☺', tone: 'cream' },
    cinema: { id: 'cinema', label: 'Kino', icon: '🎬', tone: 'sky' },

    hotel: { id: 'hotel', label: 'Hotel', icon: '🏨', tone: 'lavender' },
    apartment: { id: 'apartment', label: 'Apartment & Gästezimmer', icon: '🏠', tone: 'cream' },
    hostel: { id: 'hostel', label: 'Hostel', icon: '🛏️', tone: 'mint' },
    resort: { id: 'resort', label: 'Resort', icon: '🌴', tone: 'peach' },
    camping: { id: 'camping', label: 'Camping', icon: '⛺', tone: 'sky' },

    nearby: { id: 'nearby', label: 'Ganz in der Nähe', icon: '⌖', tone: 'mint' },
    citywide: { id: 'citywide', label: 'Im ganzen Reiseziel', icon: '🏙️', tone: 'lavender' },
    explore_area: { id: 'explore_area', label: 'Auch etwas außerhalb', icon: '🧭', tone: 'peach' },
    surprise: { id: 'surprise', label: 'Überrasch uns', icon: '✦', tone: 'rose' },

    arrival: { id: 'arrival', label: 'An- oder Abreise', icon: '🧳', tone: 'peach' },
    local_move: { id: 'local_move', label: 'Unterwegs am Reiseziel', icon: '🚇', tone: 'lavender' },
    transfer: { id: 'transfer', label: 'Transfer organisieren', icon: '↔', tone: 'cream' },
    daytrip: { id: 'daytrip', label: 'Tagesausflug', icon: '🧭', tone: 'mint' },
    vehicle: { id: 'vehicle', label: 'Fahrzeug finden', icon: '🚗', tone: 'rose' },
    parking_charge: { id: 'parking_charge', label: 'Parken oder Laden', icon: '🅿️', tone: 'sky' },

    flight: { id: 'flight', label: 'Flug', icon: '✈️', tone: 'sky' },
    rail: { id: 'rail', label: 'Bahn', icon: '🚆', tone: 'lavender' },
    coach: { id: 'coach', label: 'Bus & Fernbus', icon: '🚌', tone: 'peach' },
    ferry: { id: 'ferry', label: 'Fähre', icon: '⛴️', tone: 'sky' },
    local_transit: { id: 'local_transit', label: 'Metro & Nahverkehr', icon: '🚇', tone: 'lavender' },
    taxi: { id: 'taxi', label: 'Taxi & Fahrdienst', icon: '🚕', tone: 'peach' },
    rental: { id: 'rental', label: 'Mietwagen & Sharing', icon: '🚗', tone: 'rose' },
    parking: { id: 'parking', label: 'Parken & Laden', icon: '🅿️', tone: 'cream' },

    simple: { id: 'simple', label: 'Möglichst einfach', icon: '✨', tone: 'cream' },
    few_changes: { id: 'few_changes', label: 'Wenig Umstiege', icon: '↔', tone: 'lavender' },
    fast: { id: 'fast', label: 'Schnell', icon: '⚡', tone: 'peach' },
    affordable: { id: 'affordable', label: 'Günstig', icon: '€', tone: 'mint' },
    luggage: { id: 'luggage', label: 'Mit Gepäck angenehm', icon: '🧳', tone: 'cream' },
    stroller: { id: 'stroller', label: 'Mit Kinderwagen', icon: '👶', tone: 'rose' },
    flexible: { id: 'flexible', label: 'Flexibel', icon: '↗', tone: 'sky' },
    walking: { id: 'walking', label: 'Viel zu Fuß', icon: '🚶', tone: 'cream' },
    cycling: { id: 'cycling', label: 'Fahrrad & E-Bike', icon: '🚲', tone: 'mint' },
    car: { id: 'car', label: 'Eigenes Auto', icon: '🚗', tone: 'peach' },
    traveling_with_children: { id: 'traveling_with_children', label: 'Reisen mit Kindern', icon: '👨‍👩‍👧', tone: 'rose' },
    baby: { id: 'baby', label: 'Mit Baby', icon: '👶', tone: 'cream' },
    no_family_needs: { id: 'no_family_needs', label: 'Keine besonderen Familienbedürfnisse', icon: '✨', tone: 'lavender' },
    step_free: { id: 'step_free', label: 'Stufenlos erreichbar', icon: '↔', tone: 'sky' },
    wheelchair: { id: 'wheelchair', label: 'Rollstuhlgerecht', icon: '♿', tone: 'sky' },
    hearing_support: { id: 'hearing_support', label: 'Unterstützung fürs Hören', icon: '◌', tone: 'lavender' },
    visual_support: { id: 'visual_support', label: 'Unterstützung fürs Sehen', icon: '◉', tone: 'cream' },
    quiet_spaces: { id: 'quiet_spaces', label: 'Ruhige, reizärmere Orte', icon: '☁️', tone: 'mint' },
    no_accessibility: { id: 'no_accessibility', label: 'Keine besonderen Anforderungen', icon: '✨', tone: 'lavender' }
  });

  const option = id => ({ ...(OPTIONS[id] || { id, label: id, icon: '•', tone: 'cream' }) });
  const options = ids => ids.map(option);

  const ONBOARDING_SCENES = Object.freeze([
    { id: 'interests', eyebrow: 'Dein globaler Reisekompass', title: 'Was bedeutet Reisen grundsätzlich für dich?', copy: 'Wähle bis zu vier Dinge. Diese Werte begleiten dich in ganz Luvia – unabhängig von einer einzelnen Suche.', mode: 'multi', min: 1, max: 4, featured: options(['culinary','culture','nature','family','photography','adventure']), more: options(['shopping','wellness','nightlife','local','beach']) },
    { id: 'dietary', eyebrow: 'Genuss, der zu dir passt', title: 'Wie möchtest du dich unterwegs ernähren?', copy: 'Mehrere Angaben sind möglich. Unpassende Restauranttreffer werden später konsequent ausgefiltert.', mode: 'multi', min: 1, max: 4, featured: options(['vegetarian','vegan','mixed','no_diet']), more: options(['halal','gluten_free','lactose_free']) },
    { id: 'travelStyles', eyebrow: 'Dein Reisegefühl', title: 'Wie soll sich eine gute Reise für dich anfühlen?', copy: 'Wähle bis zu vier Reisegefühle, die wirklich zu dir passen.', mode: 'multi', min: 1, max: 4, featured: options(['romantic','family_friendly','spontaneous','planned','comfort','authentic']), more: options(['sustainable','accessible']) },
    { id: 'activityPreferences', eyebrow: 'Eure gemeinsame Zeit', title: 'Welche Aktivitäten machen dir am meisten Spaß?', copy: 'Diese Angaben helfen Luvia bei Aktivitäten und Tagesideen.', mode: 'multi', min: 1, max: 5, featured: options(['indoor','outdoor','active','relaxed','water_fun']), more: options(['hiking','cycling','walking']) },
    { id: 'entertainmentPreferences', eyebrow: 'Abend & Unterhaltung', title: 'Wie verbringst du besondere Abende?', copy: 'Optional – Luvia nutzt die Auswahl für Events und Abendideen.', mode: 'multi', min: 0, max: 4, optional: true, featured: options(['live_music','theatre','events','cinema']), more: options(['concert','bar','comedy']) },
    { id: 'mobilityPreferences', eyebrow: 'Dein allgemeiner Mobilitätsstil', title: 'Wie möchtest du dich auf Reisen grundsätzlich bewegen?', copy: 'Optional – diese globale Tendenz fließt in Move ein. Die konkrete Auswahl triffst du weiterhin für jeden Reisemoment neu.', mode: 'multi', min: 0, max: 5, optional: true, featured: options(['rail','local_transit','walking','cycling','rental','taxi']), more: options(['car','sustainable']) },
    { id: 'familyPreferences', eyebrow: 'Familienbedürfnisse', title: 'Was soll Luvia für eure Familie berücksichtigen?', copy: 'Optional – diese Angaben helfen bei passenden Orten und Wegen.', mode: 'multi', min: 0, max: 4, optional: true, featured: options(['traveling_with_children','baby','stroller','family_friendly','no_family_needs']) },
    { id: 'accessibilityNeeds', eyebrow: 'Besondere Anforderungen', title: 'Was soll unterwegs berücksichtigt werden?', copy: 'Optional und privat. Diese Angaben werden nur in deinem Profil gespeichert.', mode: 'multi', min: 0, max: 5, optional: true, featured: options(['step_free','wheelchair','quiet_spaces','no_accessibility']), more: options(['hearing_support','visual_support']) },
    { id: 'pace', eyebrow: 'Euer Tempo', title: 'Wie viel möchtet ihr an einem Reisetag erleben?', copy: 'Das Tempo beeinflusst Empfehlungen und die Dichte späterer Vorschläge.', mode: 'single', min: 1, featured: options(['pace_relaxed','pace_balanced','pace_active']) },
    { id: 'budget', eyebrow: 'Der passende Rahmen', title: 'Welcher Budgetstil fühlt sich richtig an?', copy: 'Luvia zeigt weiterhin Auswahl, priorisiert aber passend zu deinem Stil.', mode: 'single', min: 1, featured: options(['low','medium','premium']) }
  ]);

  const PLACE_SUBSCENES = Object.freeze({
    culinary: { id: 'subintent', eyebrow: 'Kulinarik', title: 'Worauf habt ihr gerade Lust?', copy: 'Luvia sucht danach nur innerhalb eindeutig passender Google-Place-Typen.', mode: 'single', min: 1, featured: options(['full_meal','cafe','sweet','snack','fine_dining','local_food']) },
    culture: { id: 'subintent', eyebrow: 'Kultur & Geschichten', title: 'Was möchtet ihr entdecken?', copy: 'Wähle die Art von Kultur, die heute zu euch passt.', mode: 'single', min: 1, featured: options(['museum','art','history','stage','architecture']) },
    nature: { id: 'subintent', eyebrow: 'Natur & Ruhe', title: 'Wie möchtet ihr Natur erleben?', copy: 'Die Auswahl wird direkt auf passende Ortstypen abgebildet.', mode: 'single', min: 1, featured: options(['park','botanical','waterside','hiking','wild_nature']) },
    family: { id: 'subintent', eyebrow: 'Familienzeit', title: 'Was passt heute am besten zu euch?', copy: 'Luvia zeigt nur Orte, die fachlich in die gewählte Familienkategorie gehören.', mode: 'single', min: 1, featured: options(['playground','indoor_play','animals','amusement','family_water']) },
    photography: { id: 'subintent', eyebrow: 'Tolle Fotos', title: 'Welche Motive sucht ihr?', copy: 'Wir nutzen klare Ortstypen statt beliebiger Fotografie-Suchbegriffe.', mode: 'single', min: 1, featured: options(['observation','scenic','landmark','photo_garden','photo_water']) },
    adventure: { id: 'subintent', eyebrow: 'Etwas Spannendes', title: 'Welche Art Abenteuer darf es sein?', copy: 'Luvia bleibt bei klar dokumentierten Erlebnis- und Aktivitätstypen.', mode: 'single', min: 1, featured: options(['adventure']) },
    shopping: { id: 'subintent', eyebrow: 'Shopping', title: 'Was möchtet ihr entdecken?', copy: 'Die Suche bleibt innerhalb des gewählten Einkaufstyps.', mode: 'single', min: 1, featured: options(['market','mall','fashion','gifts','flea']) },
    wellness: { id: 'subintent', eyebrow: 'Wellness & Entspannung', title: 'Welche Art von Auszeit passt?', copy: 'Luvia verwendet ausschließlich passende Wellness-Ortstypen.', mode: 'single', min: 1, featured: options(['spa','sauna','massage','yoga','pool']) },
    nightlife: { id: 'subintent', eyebrow: 'Abend & Nachtleben', title: 'Wie soll euer Abend aussehen?', copy: 'Wähle eine eindeutige Kategorie für stimmige Ergebnisse.', mode: 'single', min: 1, featured: options(['concert','bar','performance','comedy','cinema']) },
    accommodation: { id: 'subintent', eyebrow: 'Unterkünfte', title: 'Wie möchtet ihr übernachten?', copy: 'Luvia sucht nur in der gewählten Unterkunftsart.', mode: 'single', min: 1, featured: options(['hotel','apartment','hostel','resort','camping']) }
  });

  const PLACE_CONTEXT_SCENE = Object.freeze({ id: 'context', eyebrow: 'Euer Moment', title: 'Welche Stimmung soll diesmal dazu passen?', copy: 'Diese Auswahl gilt nur für die aktuelle Inspiration. Dein globales Reiseprofil bleibt unverändert und ergänzt die Reihenfolge im Hintergrund.', mode: 'multi', min: 0, max: 3, optional: true, featured: options(['romantic','family_friendly','indoor','outdoor','relaxed','active']), more: options(['accessible','authentic']) });
  const PLACE_DISTANCE_SCENE = Object.freeze({ id: 'distance', eyebrow: 'Wie weit darf es gehen?', title: 'Wo soll Luvia für euch suchen?', copy: 'Die Suche bleibt immer am aktiven Reiseziel gebunden.', mode: 'single', min: 1, featured: options(['nearby','citywide','explore_area']) });

  const MOVE_MODE_SCENES = Object.freeze({
    arrival: { id: 'mode', eyebrow: 'An- & Abreise', title: 'Wie möchtet ihr reisen?', copy: 'Wähle das Verkehrsmittel, für das Move passende Infrastruktur finden soll.', mode: 'single', min: 1, featured: options(['flight','rail','coach','ferry','rental']) },
    local_move: { id: 'mode', eyebrow: 'Vor Ort', title: 'Wie möchtet ihr euch am Reiseziel bewegen?', copy: 'Move sucht danach nur in den passenden Mobilitätstypen.', mode: 'single', min: 1, featured: options(['local_transit','taxi','rental','parking']) },
    transfer: { id: 'mode', eyebrow: 'Transfer', title: 'Welche Option soll Move für euch vorbereiten?', copy: 'Live-Verbindungen folgen später; jetzt findet Move verlässliche Stationen und Anbieter.', mode: 'single', min: 1, featured: options(['taxi','local_transit','rental']) },
    daytrip: { id: 'mode', eyebrow: 'Tagesausflug', title: 'Wie möchtet ihr den Ausflug erreichen?', copy: 'Move findet passende Bahnhöfe, Busstationen, Fähren oder Vermietungen.', mode: 'single', min: 1, featured: options(['rail','coach','ferry','rental']) },
    vehicle: { id: 'mode', eyebrow: 'Fahrzeug', title: 'Was möchtet ihr mieten?', copy: 'Die Suche bleibt bei offiziellen Vermietungs- und Sharing-Orten.', mode: 'single', min: 1, featured: options(['rental']) },
    parking_charge: { id: 'mode', eyebrow: 'Parken & Laden', title: 'Wobei soll Move helfen?', copy: 'Move findet Park-and-Ride, Parkhäuser und Ladepunkte.', mode: 'single', min: 1, featured: options(['parking']) }
  });

  function object(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? clone(value) : {};
  }

  function normalizePreferences(input = {}) {
    const travel = object(input.travelPreferences || input.travel_preferences || input);
    const dietary = input.dietaryPreferences || input.dietary_preferences || travel.dietary || [];
    const noDiet = unique(dietary).includes('no_diet');
    const familyRaw = object(input.familyPreferences || input.family_preferences || travel.familyPreferences || travel.family_preferences);
    const accessibilityRaw = object(input.accessibilityPreferences || input.accessibility_preferences || travel.accessibilityPreferences || travel.accessibility_preferences);
    const travelPace = input.travelPace || input.travel_pace || travel.pace;
    const budgetPreference = input.budgetPreference || input.budget_preference || travel.budget;
    const preferencesCompletedAt = input.preferencesCompletedAt || input.preferences_completed_at || travel.onboardingCompletedAt || travel.onboarding_completed_at || null;
    const preferencesUpdatedAt = input.preferencesUpdatedAt || input.preferences_updated_at || travel.preferencesUpdatedAt || travel.preferences_updated_at || null;
    const accessibilityNeeds = unique(accessibilityRaw.needs || input.accessibilityNeeds || input.accessibility_needs || travel.accessibilityNeeds || travel.accessibility_needs).filter(value => value !== 'no_accessibility');
    const familyNeeds = unique(familyRaw.needs || input.familyNeeds || input.family_needs).filter(value => value !== 'no_family_needs');
    const normalized = {
      preferenceVersion: PROFILE_VERSION,
      preferenceSchemaVersion: Number(input.preferenceSchemaVersion || input.preference_schema_version || travel.preferenceVersion || travel.preference_version || PROFILE_VERSION) || PROFILE_VERSION,
      dietaryPreferences: noDiet ? [] : unique(dietary),
      travelInterests: unique(input.travelInterests || input.travel_interests || travel.interests),
      travelStyles: unique(input.travelStyles || input.travel_styles || travel.travelStyles || travel.travel_styles),
      activityPreferences: unique(input.activityPreferences || input.activity_preferences || travel.activityPreferences || travel.activity_preferences),
      entertainmentPreferences: unique(input.entertainmentPreferences || input.entertainment_preferences || travel.entertainmentPreferences || travel.entertainment_preferences),
      diningPreferences: unique(input.diningPreferences || input.dining_preferences || travel.diningPreferences || travel.dining_preferences),
      mobilityPreferences: unique(input.mobilityPreferences || input.mobility_preferences || travel.mobilityPreferences || travel.mobility_preferences),
      atmospherePreferences: unique(input.atmospherePreferences || input.atmosphere_preferences || travel.atmospherePreferences || travel.atmosphere_preferences),
      travelPace: ['relaxed','balanced','active'].includes(travelPace) ? travelPace : 'balanced',
      budgetPreference: ['low','medium','premium'].includes(budgetPreference) ? budgetPreference : 'medium',
      familyPreferences: {...familyRaw, needs: familyNeeds, stroller: familyRaw.stroller === true || familyNeeds.includes('stroller'), travelingWithChildren: familyRaw.travelingWithChildren === true || familyNeeds.some(value => ['traveling_with_children','baby','stroller','family_friendly'].includes(value))},
      accessibilityPreferences: {...accessibilityRaw, needs: accessibilityNeeds},
      accessibilityNeeds,
      preferencesCompletedAt,
      preferencesUpdatedAt
    };
    normalized.travelPreferences = {
      pace: normalized.travelPace,
      budget: normalized.budgetPreference,
      interests: [...normalized.travelInterests],
      travelStyles: [...normalized.travelStyles],
      activityPreferences: [...normalized.activityPreferences],
      entertainmentPreferences: [...normalized.entertainmentPreferences],
      diningPreferences: [...normalized.diningPreferences],
      mobilityPreferences: [...normalized.mobilityPreferences],
      accessibilityNeeds: [...normalized.accessibilityNeeds],
      atmospherePreferences: [...normalized.atmospherePreferences],
      familyPreferences: clone(normalized.familyPreferences),
      accessibilityPreferences: clone(normalized.accessibilityPreferences),
      onboardingCompletedAt: normalized.preferencesCompletedAt,
      preferencesUpdatedAt: normalized.preferencesUpdatedAt,
      preferenceVersion: PROFILE_VERSION
    };
    return normalized;
  }

  function toProfilePatch(input = {}) {
    const prefs = normalizePreferences(input);
    return {
      dietaryPreferences: [...prefs.dietaryPreferences],
      travelInterests: [...prefs.travelInterests],
      travelStyles: [...prefs.travelStyles],
      activityPreferences: [...prefs.activityPreferences],
      entertainmentPreferences: [...prefs.entertainmentPreferences],
      diningPreferences: [...prefs.diningPreferences],
      mobilityPreferences: [...prefs.mobilityPreferences],
      atmospherePreferences: [...prefs.atmospherePreferences],
      travelPace: prefs.travelPace,
      budgetPreference: prefs.budgetPreference,
      familyPreferences: clone(prefs.familyPreferences),
      accessibilityPreferences: clone(prefs.accessibilityPreferences),
      preferenceSchemaVersion: PROFILE_VERSION,
      preferencesCompletedAt: prefs.preferencesCompletedAt,
      preferencesUpdatedAt: prefs.preferencesUpdatedAt,
      travelPreferences: clone(prefs.travelPreferences)
    };
  }

  function answersFromPreferences(input = {}) {
    const prefs = normalizePreferences(input);
    const family = unique(prefs.familyPreferences.needs);
    const accessibility = unique(prefs.accessibilityPreferences.needs);
    return {
      interests: [...prefs.travelInterests],
      dietary: prefs.dietaryPreferences.length ? [...prefs.dietaryPreferences] : ['no_diet'],
      travelStyles: [...prefs.travelStyles],
      activityPreferences: [...prefs.activityPreferences],
      entertainmentPreferences: [...prefs.entertainmentPreferences],
      mobilityPreferences: [...prefs.mobilityPreferences],
      familyPreferences: family.length ? family : ['no_family_needs'],
      accessibilityNeeds: accessibility.length ? accessibility : ['no_accessibility'],
      pace: [prefs.travelPace],
      budget: [prefs.budgetPreference]
    };
  }

  function preferencesFromAnswers(answers = {}, base = {}) {
    const current = normalizePreferences(base);
    const now = new Date().toISOString();
    const familyNeeds = unique(answers.familyPreferences).filter(value => value !== 'no_family_needs');
    const accessibilityNeeds = unique(answers.accessibilityNeeds).filter(value => value !== 'no_accessibility');
    return normalizePreferences({
      ...current,
      dietaryPreferences: unique(answers.dietary).filter(value => value !== 'no_diet'),
      travelInterests: unique(answers.interests),
      travelStyles: unique(answers.travelStyles),
      activityPreferences: unique(answers.activityPreferences),
      entertainmentPreferences: unique(answers.entertainmentPreferences),
      mobilityPreferences: unique(answers.mobilityPreferences),
      travelPace: unique(answers.pace)[0] || current.travelPace,
      budgetPreference: unique(answers.budget)[0] || current.budgetPreference,
      familyPreferences: {...current.familyPreferences, needs: familyNeeds, stroller: familyNeeds.includes('stroller'), travelingWithChildren: familyNeeds.some(value => ['traveling_with_children','baby','stroller','family_friendly'].includes(value))},
      accessibilityPreferences: {...current.accessibilityPreferences, needs: accessibilityNeeds},
      preferenceSchemaVersion: PROFILE_VERSION,
      preferencesCompletedAt: now,
      preferencesUpdatedAt: now
    });
  }

  function placeScenes(answers = {}) {
    const intent = unique(answers.intent)[0];
    const first = { id: 'intent', eyebrow: 'Luvia Places', title: 'Was möchtet ihr auf eurer Reise gerade erleben?', copy: 'Wähle einen Gedanken. Luvia führt euch danach Schritt für Schritt zu einer eindeutigen Suche.', mode: 'single', min: 1, featured: options(['culinary','adventure','nature','culture','family','photography']), more: options(['shopping','wellness','nightlife','accommodation']) };
    const sub = PLACE_SUBSCENES[intent] || { id: 'subintent', eyebrow: 'Mehr entdecken', title: 'Welche Richtung passt am besten?', copy: 'Wähle eine eindeutige Kategorie.', mode: 'single', min: 1, featured: options(['culture','nature','family','photography']) };
    return [first, sub, PLACE_CONTEXT_SCENE, PLACE_DISTANCE_SCENE];
  }

  function moveScenes(answers = {}) {
    const purpose = unique(answers.purpose)[0];
    const first = { id: 'purpose', eyebrow: 'Luvia Move', title: 'Wobei soll Move euch gerade helfen?', copy: 'Wähle den Anlass. Danach grenzt Luvia das passende Verkehrsmittel ein.', mode: 'single', min: 1, featured: options(['arrival','local_move','transfer','daytrip','vehicle','parking_charge']) };
    const mode = MOVE_MODE_SCENES[purpose] || MOVE_MODE_SCENES.local_move;
    const priorities = { id: 'priorities', eyebrow: 'Euer Weg in diesem Moment', title: 'Was ist euch für diese Verbindung besonders wichtig?', copy: 'Diese Auswahl gilt nur für die aktuelle Move-Inspiration. Globale Bedürfnisse aus dem Reiseprofil fließen zusätzlich ein.', mode: 'multi', min: 0, max: 4, optional: true, featured: options(['simple','few_changes','fast','affordable','luggage','stroller']), more: options(['accessible','flexible','sustainable']) };
    const distance = { ...PLACE_DISTANCE_SCENE, eyebrow: 'Suchbereich', title: 'Wie weit darf Move suchen?' };
    return [first, mode, priorities, distance];
  }

  function scenes(domain, answers = {}) {
    if (domain === 'onboarding' || domain === 'profile') return clone(ONBOARDING_SCENES);
    if (domain === 'places') return placeScenes(answers).map(clone);
    if (domain === 'move') return moveScenes(answers).map(clone);
    return [];
  }

  const PLACE_CONTRACTS = Object.freeze({
    culinary: {
      moduleId: 'restaurants', placeType: 'restaurant',
      sub: {
        full_meal: { query: 'Restaurant', includedTypes: ['restaurant'] },
        cafe: { query: 'Café', includedTypes: ['cafe','coffee_shop'] },
        sweet: { query: 'Dessert', includedTypes: ['dessert_shop','ice_cream_shop','bakery','cake_shop'] },
        snack: { query: 'Snack', includedTypes: ['snack_bar','sandwich_shop','bakery','fast_food_restaurant'] },
        fine_dining: { query: 'Fine Dining', includedTypes: ['fine_dining_restaurant'] },
        local_food: { query: 'Lokales Restaurant', includedTypes: ['restaurant','bistro'] }
      }
    },
    culture: {
      moduleId: 'attractions', placeType: 'attraction',
      sub: {
        museum: { query: 'Museum', includedTypes: ['museum','art_museum','history_museum'] },
        art: { query: 'Kunstgalerie', includedTypes: ['art_gallery','art_museum','art_studio'] },
        history: { query: 'Historischer Ort', includedTypes: ['historical_landmark','historical_place','monument','cultural_landmark'] },
        stage: { query: 'Theater', includedTypes: ['performing_arts_theater','opera_house','concert_hall'] },
        architecture: { query: 'Architektur und Wahrzeichen', includedTypes: ['cultural_landmark','historical_landmark','monument'] }
      }
    },
    nature: {
      moduleId: 'nature', placeType: 'nature',
      sub: {
        park: { query: 'Park', includedTypes: ['park','city_park','garden'] },
        botanical: { query: 'Botanischer Garten', includedTypes: ['botanical_garden','garden'] },
        waterside: { query: 'Strand und Wasser', includedTypes: ['beach','lake','river','marina'] },
        hiking: { query: 'Wandern', includedTypes: ['hiking_area','scenic_spot','national_park'] },
        wild_nature: { query: 'Naturgebiet', includedTypes: ['nature_preserve','wildlife_refuge','national_park','state_park','woods'] }
      }
    },
    family: {
      moduleId: 'attractions', placeType: 'attraction',
      sub: {
        playground: { query: 'Spielplatz', includedTypes: ['playground'] },
        indoor_play: { query: 'Indoor Spielplatz', includedTypes: ['indoor_playground','amusement_center'] },
        animals: { query: 'Zoo und Aquarium', includedTypes: ['zoo','aquarium','wildlife_park'] },
        amusement: { query: 'Freizeitpark', includedTypes: ['amusement_park'] },
        family_water: { query: 'Wasserpark', includedTypes: ['water_park'] }
      }
    },
    photography: {
      moduleId: 'photo_spots', placeType: 'photo_spot',
      sub: {
        observation: { query: 'Aussichtsplattform', includedTypes: ['observation_deck'] },
        scenic: { query: 'Aussichtspunkt', includedTypes: ['scenic_spot'] },
        landmark: { query: 'Wahrzeichen', includedTypes: ['historical_landmark','cultural_landmark','monument','tourist_attraction'] },
        photo_garden: { query: 'Fotogener Garten', includedTypes: ['botanical_garden','garden'] },
        photo_water: { query: 'Fotospot am Wasser', includedTypes: ['beach','marina','lake','river'] }
      }
    },
    shopping: {
      moduleId: 'shopping', placeType: 'shopping',
      sub: {
        market: { query: 'Markt', includedTypes: ['market','farmers_market'] },
        mall: { query: 'Shoppingcenter', includedTypes: ['shopping_mall','department_store'] },
        fashion: { query: 'Mode und Boutiquen', includedTypes: ['clothing_store','womens_clothing_store','shoe_store'] },
        gifts: { query: 'Souvenirs und Geschenke', includedTypes: ['gift_shop'] },
        flea: { query: 'Flohmarkt und Vintage', includedTypes: ['flea_market','thrift_store'] }
      }
    },
    wellness: {
      moduleId: 'attractions', placeType: 'attraction',
      sub: {
        spa: { query: 'Spa und Wellness', includedTypes: ['spa','wellness_center','massage_spa'] },
        sauna: { query: 'Sauna', includedTypes: ['sauna'] },
        massage: { query: 'Massage', includedTypes: ['massage','massage_spa'] },
        yoga: { query: 'Yoga', includedTypes: ['yoga_studio'] },
        pool: { query: 'Schwimmbad', includedTypes: ['swimming_pool','public_bath'] }
      }
    },
    nightlife: {
      moduleId: 'attractions', placeType: 'attraction',
      sub: {
        concert: { query: 'Live Musik', includedTypes: ['live_music_venue','concert_hall','philharmonic_hall'] },
        bar: { query: 'Cocktailbar', includedTypes: ['cocktail_bar','bar','wine_bar','lounge_bar'] },
        performance: { query: 'Theater und Oper', includedTypes: ['performing_arts_theater','opera_house'] },
        comedy: { query: 'Comedy Club', includedTypes: ['comedy_club'] },
        cinema: { query: 'Kino', includedTypes: ['movie_theater'] }
      }
    },
    accommodation: {
      moduleId: 'accommodations', placeType: 'accommodation',
      sub: {
        hotel: { query: 'Hotel', includedTypes: ['hotel','lodging'] },
        apartment: { query: 'Apartment und Gästezimmer', includedTypes: ['private_guest_room','guest_house','bed_and_breakfast'] },
        hostel: { query: 'Hostel', includedTypes: ['hostel'] },
        resort: { query: 'Resort Hotel', includedTypes: ['resort_hotel'] },
        camping: { query: 'Camping', includedTypes: ['campground','camping_cabin'] }
      }
    },
    adventure: {
      moduleId: 'attractions', placeType: 'attraction',
      sub: {
        adventure: { query: 'Abenteuer und Erlebnis', includedTypes: ['adventure_sports_center','amusement_center','go_karting_venue','sports_activity_location'] }
      }
    }
  });

  const MOVE_CONTRACTS = Object.freeze({
    flight: { moveTile: 'flights', query: 'Flughäfen', includedTypes: ['airport','international_airport'] },
    rail: { moveTile: 'rail', query: 'Bahn', includedTypes: ['train_station','train_ticket_office'] },
    coach: { moveTile: 'coaches', query: 'Bus & Fernbus', includedTypes: ['bus_station','bus_stop'] },
    ferry: { moveTile: 'ferries', query: 'Fähren', includedTypes: ['ferry_terminal','ferry_service'] },
    local_transit: { moveTile: 'local', query: 'Nahverkehr', includedTypes: ['subway_station','light_rail_station','tram_stop','bus_station','bus_stop','transit_station'] },
    taxi: { moveTile: 'taxi', query: 'Taxi', includedTypes: ['taxi_stand','taxi_service'] },
    rental: { moveTile: 'rental', query: 'Vermietung', includedTypes: ['car_rental','bike_sharing_station'] },
    parking: { moveTile: 'parking', query: 'Parken & Laden', includedTypes: ['park_and_ride','parking','parking_garage','parking_lot','electric_vehicle_charging_station','ebike_charging_station'] }
  });

  function radiusFromAnswers(answers = {}) {
    const value = unique(answers.distance)[0];
    return value === 'nearby' ? 5000 : value === 'explore_area' ? 35000 : 18000;
  }

  function buildPlacesContract(answers = {}, context = {}) {
    const intent = unique(answers.intent)[0] || 'culture';
    const subintent = unique(answers.subintent)[0] || Object.keys(PLACE_CONTRACTS[intent]?.sub || {})[0];
    const base = PLACE_CONTRACTS[intent] || PLACE_CONTRACTS.culture;
    const chosen = base.sub[subintent] || Object.values(base.sub)[0];
    const profile = normalizePreferences(context.preferences || {});
    const contextSelections = unique(answers.context);
    const dietary = profile.dietaryPreferences;
    const featureRequirements = {};
    const requiredEvidenceTerms = [];
    let specializedTypes = [...chosen.includedTypes];
    let query = chosen.query;
    let searchMode = 'nearby';
    if (base.placeType === 'restaurant') {
      if (dietary.includes('vegan')) {
        specializedTypes = ['vegan_restaurant'];
        query = `vegan ${chosen.query}`;
        searchMode = 'text';
      } else if (dietary.includes('vegetarian')) {
        specializedTypes.unshift('vegetarian_restaurant');
        featureRequirements.servesVegetarianFood = true;
        query = `vegetarisch ${chosen.query}`;
        searchMode = 'text';
      } else if (dietary.includes('halal')) {
        specializedTypes = ['halal_restaurant'];
        query = `halal ${chosen.query}`;
        searchMode = 'text';
      }
      if (dietary.includes('gluten_free')) requiredEvidenceTerms.push('gluten');
      if (dietary.includes('lactose_free')) requiredEvidenceTerms.push('laktose', 'lactose');
      if (requiredEvidenceTerms.length) searchMode = 'text';
    }
    return Object.freeze({
      version: VERSION,
      id: `places:${intent}:${subintent}:${Date.now()}`,
      domain: 'places',
      intent,
      subintent,
      moduleId: base.moduleId,
      placeType: base.placeType,
      query,
      includedTypes: unique(specializedTypes),
      excludedTypes: [],
      strictTypeFiltering: true,
      strictDestination: true,
      maxDistanceMeters: radiusFromAnswers(answers),
      minRating: base.placeType === 'restaurant' || base.placeType === 'shopping' ? 3.5 : null,
      minUserRatingCount: base.placeType === 'restaurant' ? 5 : 0,
      sortBy: 'relevance',
      featureRequirements,
      requiredEvidenceTerms,
      searchMode,
      contextSelections,
      profileSelections: {
        dietary: [...dietary],
        travelStyles: [...profile.travelPreferences.travelStyles],
        activityPreferences: [...profile.activityPreferences],
        entertainmentPreferences: [...profile.entertainmentPreferences],
        familyPreferences: clone(profile.familyPreferences),
        accessibilityNeeds: [...profile.accessibilityNeeds],
        pace: profile.travelPreferences.pace,
        budget: profile.travelPreferences.budget
      },
      preferenceLayers: Object.freeze({
        globalProfile: Object.freeze({
          source: 'supabase-user_profiles',
          dietary: [...dietary],
          interests: [...profile.travelInterests],
          styles: [...profile.travelStyles],
          activities: [...profile.activityPreferences],
          entertainment: [...profile.entertainmentPreferences],
          family: clone(profile.familyPreferences),
          accessibility: [...profile.accessibilityNeeds],
          pace: profile.travelPace,
          budget: profile.budgetPreference
        }),
        moduleMoment: Object.freeze({intent, subintent, context: [...contextSelections], distance: unique(answers.distance)[0] || 'citywide'}),
        mergePolicy: 'global-profile-context-plus-explicit-module-moment',
        mutatesGlobalProfile: false
      }),
      labels: {
        intent: option(intent).label,
        subintent: option(subintent).label,
        context: contextSelections.map(value => option(value).label),
        distance: option(unique(answers.distance)[0] || 'citywide').label
      },
      createdAt: new Date().toISOString()
    });
  }

  function buildMoveContract(answers = {}, context = {}) {
    const purpose = unique(answers.purpose)[0] || 'local_move';
    const mode = unique(answers.mode)[0] || (purpose === 'arrival' ? 'rail' : 'local_transit');
    const base = MOVE_CONTRACTS[mode] || MOVE_CONTRACTS.local_transit;
    const selectedRadius = radiusFromAnswers(answers);
    const maxDistanceMeters = mode === 'flight' ? Math.max(120000, selectedRadius) : mode === 'ferry' ? Math.max(80000, selectedRadius) : selectedRadius;
    return Object.freeze({
      version: VERSION,
      id: `move:${purpose}:${mode}:${Date.now()}`,
      domain: 'move',
      purpose,
      mode,
      moveTile: base.moveTile,
      moduleId: 'mobility',
      placeType: 'mobility',
      query: base.query,
      includedTypes: [...base.includedTypes],
      excludedTypes: [],
      strictTypeFiltering: true,
      strictDestination: !['flight','ferry'].includes(mode),
      maxDistanceMeters,
      searchMode: ['flight','ferry'].includes(mode) ? 'text' : 'nearby',
      minRating: null,
      minUserRatingCount: 0,
      sortBy: 'distance',
      priorities: unique(answers.priorities),
      profileSelections: (() => {
        const profile = normalizePreferences(context.preferences || {});
        return {
          mobilityPreferences: [...profile.mobilityPreferences],
          accessibilityNeeds: [...profile.accessibilityNeeds],
          familyPreferences: clone(profile.familyPreferences),
          travelStyles: [...profile.travelStyles],
          pace: profile.travelPace,
          budget: profile.budgetPreference
        };
      })(),
      preferenceLayers: (() => {
        const profile = normalizePreferences(context.preferences || {});
        return Object.freeze({
          globalProfile: Object.freeze({
            source: 'supabase-user_profiles',
            mobility: [...profile.mobilityPreferences],
            accessibility: [...profile.accessibilityNeeds],
            family: clone(profile.familyPreferences),
            styles: [...profile.travelStyles],
            pace: profile.travelPace,
            budget: profile.budgetPreference
          }),
          moduleMoment: Object.freeze({purpose, mode, priorities: unique(answers.priorities), distance: unique(answers.distance)[0] || 'citywide'}),
          mergePolicy: 'global-profile-context-plus-explicit-module-moment',
          mutatesGlobalProfile: false
        });
      })(),
      labels: {
        purpose: option(purpose).label,
        mode: option(mode).label,
        priorities: unique(answers.priorities).map(value => option(value).label),
        distance: option(unique(answers.distance)[0] || 'citywide').label
      },
      createdAt: new Date().toISOString()
    });
  }

  function buildContract(domain, answers = {}, context = {}) {
    if (domain === 'places') return buildPlacesContract(answers, context);
    if (domain === 'move') return buildMoveContract(answers, context);
    return null;
  }

  function summary(input = {}) {
    const prefs = normalizePreferences(input);
    const values = [
      ...prefs.travelInterests,
      ...prefs.dietaryPreferences,
      ...prefs.travelStyles,
      ...prefs.activityPreferences,
      ...prefs.entertainmentPreferences,
      ...prefs.mobilityPreferences,
      ...prefs.familyPreferences.needs,
      ...prefs.accessibilityPreferences.needs,
      prefs.travelPace,
      prefs.budgetPreference
    ];
    return unique(values).map(value => option(value)).filter(Boolean);
  }

  window.LuviaPreferenceSchema = Object.freeze({
    version: VERSION,
    profileVersion: PROFILE_VERSION,
    tones: TONES,
    option,
    options,
    scenes,
    normalizePreferences,
    toProfilePatch,
    answersFromPreferences,
    preferencesFromAnswers,
    buildContract,
    buildPlacesContract,
    buildMoveContract,
    summary
  });
})();
