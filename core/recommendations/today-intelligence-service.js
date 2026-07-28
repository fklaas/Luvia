(() => {
  'use strict';

  const VERSION = '4.1.0';
  const STORAGE_PREFIX = 'luvia.today.v4';
  const listeners = new Set();
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const pad = n => String(n).padStart(2, '0');
  const dayKey = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const nowIso = () => new Date().toISOString();
  const parse = value => { const d = new Date(value); return Number.isNaN(d.getTime()) ? null : d; };
  const activeTripId = () => String(window.LuviaTripContext?.getActiveTrip?.()?.tripId || window.LuviaTripStore?.snapshot?.()?.activeTripId || '');
  const timezone = () => window.LuviaTravelContext?.snapshot?.()?.destination?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const initialState = () => ({
    version: VERSION,
    status: 'empty',
    tripId: null,
    date: dayKey(new Date()),
    timezone: timezone(),
    generatedAt: null,
    current: null,
    next: null,
    upcoming: [],
    completed: [],
    timeline: [],
    departureAdvice: null,
    freeWindows: [],
    conflicts: [],
    dayLoad: { level: 'very_relaxed', score: 0, reasons: [] },
    actions: [],
    sourceState: { schedule: 'idle', places: 'ready', presence: 'inactive', realtime: 'ready', offline: !navigator.onLine },
    lastError: null
  });
  const state = initialState();

  function storageKey(tripId, date) { return `${STORAGE_PREFIX}.${tripId}.${date}`; }
  function readCached(tripId, date) {
    if (!tripId) return null;
    try { return JSON.parse(localStorage.getItem(storageKey(tripId, date)) || 'null'); } catch { return null; }
  }
  function writeCached(snapshot) {
    if (!snapshot?.tripId) return;
    try { localStorage.setItem(storageKey(snapshot.tripId, snapshot.date), JSON.stringify(snapshot)); } catch {}
  }

  function eventEnd(event) {
    return parse(event.endAt) || (parse(event.startAt) ? new Date(parse(event.startAt).getTime() + Number(event.durationMinutes || 90) * 60000) : null);
  }
  function eventIcon(event) {
    return ({ restaurant: '🍽️', attraction: '🏛️', activity: '🎟️', photo_spot: '📸', shopping: '🛍️', accommodation: '🏨', mobility: '🚗', transit: '🚆', nature: '🌿' }[event?.entityType] || '📍');
  }
  function travelMinutesFor(event) {
    const distance = Number(event?.distanceMeters ?? event?.source?.distanceMeters);
    if (!Number.isFinite(distance) || distance < 0) return null;
    return window.LuviaScheduleIntelligence?.travelMinutes?.(distance, distance > 2000 ? 'drive' : 'walk') ?? Math.max(1, Math.ceil(distance / 75));
  }
  function familyBuffer() {
    const prefs = window.LuviaTravelPreferences?.snapshot?.() || window.LuviaProfileService?.snapshot?.() || {};
    const text = JSON.stringify(prefs).toLowerCase();
    return /baby|kind|children|family/.test(text) ? 5 : 0;
  }

  function classifyEvents(events, now) {
    const current = events.find(event => {
      const start = parse(event.startAt), end = eventEnd(event);
      return start && end && start <= now && now < end;
    }) || null;
    const completed = events.filter(event => eventEnd(event) && eventEnd(event) <= now);
    const upcoming = events.filter(event => parse(event.startAt) && parse(event.startAt) > now);
    return { current, completed, upcoming, next: upcoming[0] || null };
  }

  function departureAdvice(next, now) {
    if (!next) return null;
    const start = parse(next.startAt);
    if (!start) return null;
    const travelMinutes = travelMinutesFor(next);
    const baseBuffer = next.reservationStatus && next.reservationStatus !== 'idea' ? 12 : 10;
    const extraFamilyBuffer = familyBuffer();
    const totalBuffer = baseBuffer + extraFamilyBuffer;
    const recommendedAt = travelMinutes == null ? new Date(start.getTime() - totalBuffer * 60000) : new Date(start.getTime() - (travelMinutes + totalBuffer) * 60000);
    const latestAt = travelMinutes == null ? new Date(start.getTime() - 5 * 60000) : new Date(start.getTime() - (travelMinutes + 5) * 60000);
    const minutesUntilDeparture = Math.round((recommendedAt.getTime() - now.getTime()) / 60000);
    let status = 'later';
    if (minutesUntilDeparture < 0) status = 'late';
    else if (minutesUntilDeparture <= 10) status = 'leave_now';
    else if (minutesUntilDeparture <= 30) status = 'leave_soon';
    else if (minutesUntilDeparture <= 60) status = 'prepare';
    return {
      status,
      recommendedAt: recommendedAt.toISOString(),
      latestAt: latestAt.toISOString(),
      minutesUntilDeparture,
      travelMinutes,
      bufferMinutes: totalBuffer,
      confidence: travelMinutes == null ? 'estimated' : 'medium',
      reasons: [
        `${baseBuffer} Minuten Grundpuffer`,
        ...(extraFamilyBuffer ? [`${extraFamilyBuffer} Minuten Familienpuffer`] : []),
        ...(travelMinutes == null ? ['Wegzeit noch nicht verfügbar'] : [`${travelMinutes} Minuten Wegzeit`])
      ]
    };
  }

  function freeWindows(events, now) {
    const result = [];
    if (!events.length) return result;
    const first = parse(events[0].startAt);
    if (first && first > now) {
      const minutes = Math.floor((first - now) / 60000);
      if (minutes >= 30) result.push({ startAt: now.toISOString(), endAt: first.toISOString(), minutes, type: 'before_first' });
    }
    for (let i = 0; i < events.length - 1; i += 1) {
      const from = eventEnd(events[i]), to = parse(events[i + 1].startAt);
      if (!from || !to) continue;
      const transition = travelMinutesFor(events[i + 1]) || 0;
      const minutes = Math.floor((to - from) / 60000) - transition - 10;
      if (minutes >= 20) result.push({ startAt: from.toISOString(), endAt: to.toISOString(), minutes, type: 'between', beforeId: events[i].id, afterId: events[i + 1].id });
    }
    return result;
  }

  function conflicts(events) {
    const result = [];
    for (let i = 0; i < events.length - 1; i += 1) {
      const current = events[i], next = events[i + 1];
      const currentEnd = eventEnd(current), nextStart = parse(next.startAt);
      if (!currentEnd || !nextStart) continue;
      if (currentEnd > nextStart) {
        result.push({ severity: 'hard', type: 'overlap', eventIds: [current.id, next.id], message: `„${current.title}“ überschneidet sich mit „${next.title}“.` });
        continue;
      }
      const available = Math.floor((nextStart - currentEnd) / 60000);
      const required = (travelMinutesFor(next) || 0) + 10 + familyBuffer();
      if (available < required) result.push({ severity: 'hard', type: 'transition', eventIds: [current.id, next.id], message: `Zwischen „${current.title}“ und „${next.title}“ fehlen etwa ${required - available} Minuten.` });
      else if (available - required < 15) result.push({ severity: 'soft', type: 'tight_transition', eventIds: [current.id, next.id], message: `Der Wechsel zu „${next.title}“ ist knapp geplant.` });
    }
    return result;
  }

  function dayLoad(events, conflictList) {
    const totalDuration = events.reduce((sum, event) => sum + Number(event.durationMinutes || 90), 0);
    const transitions = Math.max(0, events.length - 1);
    let score = events.length * 12 + totalDuration / 25 + transitions * 7;
    score += conflictList.filter(item => item.severity === 'hard').length * 25;
    score += conflictList.filter(item => item.severity === 'soft').length * 10;
    score += familyBuffer() ? events.length * 2 : 0;
    score = Math.round(score);
    let level = 'very_relaxed';
    if (score > 100) level = 'critical';
    else if (score >= 86) level = 'tight';
    else if (score >= 71) level = 'full';
    else if (score >= 51) level = 'balanced';
    else if (score >= 31) level = 'relaxed';
    const labels = { very_relaxed: 'sehr entspannt', relaxed: 'entspannt', balanced: 'ausgewogen', full: 'gut gefüllt', tight: 'eng', critical: 'kritisch' };
    return { level, label: labels[level], score, reasons: [`${events.length} Programmpunkte`, `${totalDuration} Minuten geplante Aufenthalte`, `${transitions} Ortswechsel`, ...(conflictList.length ? [`${conflictList.length} Hinweise oder Konflikte`] : [])] };
  }

  function determineStatus(parts, departure) {
    if (!parts.current && !parts.next && !parts.completed.length) return 'empty';
    if (parts.current) return 'current';
    if (!parts.next && parts.completed.length) return 'completed';
    if (departure?.status === 'late') return 'late';
    if (departure?.status === 'leave_now') return 'leave_now';
    if (departure?.status === 'leave_soon') return 'leave_soon';
    return 'upcoming';
  }

  function actionsFor(status, current, next, conflictsList) {
    if (status === 'empty') return [{ id: 'discover', label: 'Vorschläge ansehen', view: 'restaurants', primary: true }, { id: 'plan', label: 'Tagesplanung öffnen', view: 'restaurants' }];
    if (status === 'current') return [{ id: 'open-current', label: 'Ort öffnen', view: current?.entityType === 'restaurant' ? 'restaurants' : 'dashboard', primary: true }, { id: 'visited', label: 'Als besucht markieren' }];
    if (status === 'late' || status === 'leave_now') return [{ id: 'navigate', label: 'Navigation starten', href: next?.source?.mapsUrl || null, primary: true }, { id: 'open-next', label: 'Ort öffnen', view: next?.entityType === 'restaurant' ? 'restaurants' : 'dashboard' }];
    if (conflictsList.some(item => item.severity === 'hard')) return [{ id: 'adjust', label: 'Plan anpassen', view: 'restaurants', primary: true }, { id: 'alternative', label: 'Alternative ansehen', view: 'restaurants' }];
    return [{ id: 'open-next', label: 'Nächsten Ort öffnen', view: next?.entityType === 'restaurant' ? 'restaurants' : 'dashboard', primary: true }, { id: 'plan', label: 'Tagesplanung öffnen', view: 'restaurants' }];
  }

  function build(options = {}) {
    const schedule = window.LuviaScheduleIntelligence?.snapshot?.() || {};
    const date = options.date || dayKey(new Date());
    const now = options.now ? new Date(options.now) : new Date();
    const tripId = String(options.tripId || schedule.tripId || activeTripId());
    const events = [...(schedule.events || [])].filter(event => event.date === date).sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
    const parts = classifyEvents(events, now);
    const conflictList = conflicts(events);
    const departure = departureAdvice(parts.next, now);
    const windows = freeWindows(events, now);
    const status = determineStatus(parts, departure);
    const sourceState = {
      schedule: schedule.lastError ? 'degraded' : 'ready',
      places: window.LuviaPlaceCore ? 'ready' : 'missing',
      presence: window.LuviaPresenceVisitCore?.diagnostics?.()?.active ? 'active' : 'inactive',
      realtime: navigator.onLine ? 'ready' : 'offline',
      offline: !navigator.onLine
    };
    const snapshot = {
      version: VERSION,
      tripId,
      date,
      timezone: timezone(),
      generatedAt: nowIso(),
      status,
      current: parts.current,
      next: parts.next,
      upcoming: parts.upcoming.slice(parts.next ? 1 : 0),
      completed: parts.completed,
      timeline: events.map(event => ({ ...event, icon: eventIcon(event), phase: parts.current?.id === event.id ? 'current' : parts.completed.some(item => item.id === event.id) ? 'completed' : 'upcoming' })),
      departureAdvice: departure,
      freeWindows: windows,
      conflicts: conflictList,
      dayLoad: dayLoad(events, conflictList),
      actions: actionsFor(status, parts.current, parts.next, conflictList),
      sourceState,
      lastError: schedule.lastError || null
    };
    return snapshot;
  }

  function apply(snapshot) { Object.assign(state, snapshot); writeCached(snapshot); emit(); return clone(state); }
  function emit() {
    const snapshot = clone(state);
    listeners.forEach(listener => { try { listener(snapshot); } catch {} });
    window.dispatchEvent(new CustomEvent('luvia:today-intelligence-changed', { detail: snapshot }));
  }
  async function refresh(options = {}) {
    try {
      if (options.refreshSchedule !== false) await window.LuviaScheduleIntelligence?.refresh?.({ tripId: options.tripId || activeTripId(), force: Boolean(options.force) });
      return apply(build(options));
    } catch (error) {
      state.lastError = error?.message || String(error);
      const cached = readCached(options.tripId || activeTripId(), options.date || dayKey(new Date()));
      if (cached) return apply({ ...cached, sourceState: { ...(cached.sourceState || {}), offline: true, schedule: 'cached' }, lastError: state.lastError });
      emit();
      return clone(state);
    }
  }
  function snapshot() { return clone(state); }
  function subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }
  function diagnostics() {
    return {
      version: VERSION,
      status: state.status,
      tripId: state.tripId,
      date: state.date,
      timezone: state.timezone,
      events: state.timeline.length,
      current: state.current?.title || null,
      next: state.next?.title || null,
      upcoming: state.upcoming.length,
      completed: state.completed.length,
      dayLoad: state.dayLoad,
      departureAdvice: state.departureAdvice,
      freeWindows: state.freeWindows,
      conflicts: state.conflicts,
      sourceState: state.sourceState,
      generatedAt: state.generatedAt,
      lastError: state.lastError,
      trace: [
        `Today date: ${state.date}`,
        `Current: ${state.current?.title || 'none'}`,
        `Next: ${state.next?.title || 'none'}`,
        `Day load: ${state.dayLoad?.label || 'unknown'} (${state.dayLoad?.score || 0})`,
        `Departure: ${state.departureAdvice?.recommendedAt || 'not available'}`,
        `Free windows: ${state.freeWindows?.length || 0}`,
        `Conflicts: ${state.conflicts?.length || 0}`
      ]
    };
  }

  window.LuviaTodayIntelligence = Object.freeze({
    version: VERSION,
    refresh,
    build,
    snapshot,
    subscribe,
    diagnostics,
    getStatus: () => state.status,
    getCurrent: () => clone(state.current),
    getNext: () => clone(state.next),
    getUpcoming: () => clone(state.upcoming),
    getFreeWindows: () => clone(state.freeWindows),
    getConflicts: () => clone(state.conflicts),
    getDepartureAdvice: () => clone(state.departureAdvice)
  });

  ['luvia:schedule-intelligence-changed', 'luvia:timeline-event-created', 'luvia:place-visit-changed', 'luvia:trip-changed', 'online', 'offline']
    .forEach(name => window.addEventListener(name, () => apply(build({ refreshSchedule: false }))));
  setInterval(() => apply(build({ refreshSchedule: false })), 60000);
})();
