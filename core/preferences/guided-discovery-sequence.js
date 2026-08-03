(() => {
  'use strict';

  const VERSION = '1.2.0';
  const instances = new WeakMap();
  let activeOverlay = null;
  let suspendedSurface = null;

  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const unique = values => [...new Set((Array.isArray(values) ? values : []).filter(Boolean))];

  function accentOf(options = {}) {
    const trip = options.trip || window.LuviaTripContext?.getActiveTrip?.() || window.LuviaTripStore?.getActive?.() || {};
    return options.accent || trip.accent || trip.color || getComputedStyle(document.documentElement).getPropertyValue('--trip-accent').trim() || '#ee6f83';
  }

  function backgroundMarkup() {
    return `<div class="gds-world" aria-hidden="true">
      <span class="gds-aurora gds-aurora-a"></span>
      <span class="gds-aurora gds-aurora-b"></span>
      <span class="gds-star gds-star-a">✦</span><span class="gds-star gds-star-b">✧</span><span class="gds-star gds-star-c">✦</span>
      <span class="gds-soft-cloud gds-soft-cloud-a"><i></i><i></i><i></i></span>
      <span class="gds-soft-cloud gds-soft-cloud-b"><i></i><i></i><i></i></span>
      <div class="gds-flight-track"><svg viewBox="0 0 800 120" preserveAspectRatio="none"><path d="M18 92 C180 4 312 112 452 48 S665 18 782 72" /></svg><span class="gds-plane">✈</span><i class="gds-point gds-point-a"></i><i class="gds-point gds-point-b"></i><i class="gds-point gds-point-c"></i><i class="gds-point gds-point-d"></i></div>
    </div>`;
  }

  function draftKey(domain, options = {}) {
    const userId = window.ParisAuth?.getState?.().user?.id || 'guest';
    const tripId = options.trip?.id || window.LuviaTripStore?.snapshot?.().activeTripId || 'global';
    return `luviaGuidedDiscoveryDraftV3:${userId}:${tripId}:${domain}`;
  }

  function readDraft(domain, options = {}) {
    if (options.resume === false) return null;
    try {
      const value = JSON.parse(sessionStorage.getItem(draftKey(domain, options)) || 'null');
      return value?.schemaVersion === 3 && value?.domain === domain ? value : null;
    } catch { return null; }
  }

  function writeDraft(state) {
    if (state.options.resume === false || state.completed) return;
    try {
      sessionStorage.setItem(state.draftKey, JSON.stringify({schemaVersion:3,domain:state.domain,answers:state.answers,index:state.index,updatedAt:new Date().toISOString()}));
    } catch {}
  }

  function clearDraft(state) {
    try { sessionStorage.removeItem(state.draftKey); } catch {}
  }

  function create(root, options = {}) {
    if (!root) throw new Error('GUIDED_DISCOVERY_ROOT_REQUIRED');
    const schema = window.LuviaPreferenceSchema;
    if (!schema) throw new Error('PREFERENCE_SCHEMA_UNAVAILABLE');

    const domain = options.domain || 'places';
    const preferenceMode = domain === 'onboarding' || domain === 'profile';
    const initialPreferences = schema.normalizePreferences(options.initialPreferences || window.LuviaUserPreferences?.get?.() || window.LuviaProfileService?.snapshot?.().profile || {});
    const initialAnswers = preferenceMode ? schema.answersFromPreferences(initialPreferences) : {};
    const draft = readDraft(domain, options);
    const state = {
      domain,
      answers: clone(options.initialAnswers || draft?.answers || initialAnswers),
      index: Math.max(0, Number(draft?.index || 0)),
      expanded: new Set(),
      transition: false,
      transitionId: 0,
      completed: false,
      saving: false,
      error: null,
      initialPreferences,
      options: {...options},
      draftKey: draftKey(domain, options),
      root,
      cleanup: []
    };
    instances.set(root, state);
    root.classList.add('gds-host');
    root.style.setProperty('--gds-accent', accentOf(options));
    root.style.setProperty('--gds-progress', '0');
    bindAtmosphere(state);
    render(state);
    return Object.freeze({
      next: () => next(state),
      previous: () => previous(state),
      reset: () => reset(state),
      destroy: () => destroy(state),
      snapshot: () => clone({domain: state.domain, answers: state.answers, index: state.index, completed: state.completed})
    });
  }

  function bindAtmosphere(state) {
    const root = state.root;
    let frame = 0;
    let pointer = null;
    const resetParallax = () => {
      pointer = null;
      root.style.setProperty('--gds-parallax-x', '0px');
      root.style.setProperty('--gds-parallax-y', '0px');
    };
    const commitPointer = () => {
      frame = 0;
      if (!pointer) return;
      const rect = root.getBoundingClientRect?.();
      if (!rect?.width || !rect?.height) return;
      const x = Math.max(-1, Math.min(1, ((pointer.x - rect.left) / rect.width - .5) * 2));
      const y = Math.max(-1, Math.min(1, ((pointer.y - rect.top) / rect.height - .5) * 2));
      root.style.setProperty('--gds-parallax-x', `${(x * 5).toFixed(2)}px`);
      root.style.setProperty('--gds-parallax-y', `${(y * 5).toFixed(2)}px`);
    };
    const onPointerMove = event => {
      if (reduceMotion() || event.pointerType === 'touch') return;
      pointer = {x:event.clientX,y:event.clientY};
      if (!frame) frame = requestAnimationFrame(commitPointer);
    };
    let swipe = null;
    const onTouchStart = event => {
      const touch = event.touches?.[0];
      if (!touch || touch.clientX > 42) return;
      swipe = {x: touch.clientX, y: touch.clientY};
    };
    const onTouchEnd = event => {
      const touch = event.changedTouches?.[0];
      if (!touch || !swipe) return;
      const dx = touch.clientX - swipe.x;
      const dy = Math.abs(touch.clientY - swipe.y);
      swipe = null;
      if (dx > 72 && dy < 56) previous(state);
    };
    root.addEventListener('pointermove', onPointerMove, {passive: true});
    root.addEventListener('pointerleave', resetParallax, {passive: true});
    root.addEventListener('touchstart', onTouchStart, {passive: true});
    root.addEventListener('touchend', onTouchEnd, {passive: true});
    state.cleanup.push(() => root.removeEventListener('pointermove', onPointerMove));
    state.cleanup.push(() => root.removeEventListener('pointerleave', resetParallax));
    state.cleanup.push(() => root.removeEventListener('touchstart', onTouchStart));
    state.cleanup.push(() => root.removeEventListener('touchend', onTouchEnd));
    state.cleanup.push(() => frame && cancelAnimationFrame(frame));
  }

  function scenes(state) {
    return window.LuviaPreferenceSchema.scenes(state.domain, state.answers);
  }

  function currentScene(state) {
    return scenes(state)[state.index] || null;
  }

  function isSelected(state, sceneId, value) {
    return unique(state.answers[sceneId]).includes(value);
  }

  function canContinue(state, scene) {
    if (!scene) return true;
    return unique(state.answers[scene.id]).length >= Number(scene.min || 0);
  }

  function sceneProgress(state) {
    const count = Math.max(1, scenes(state).length);
    return Math.min(1, Math.max(0, state.completed ? 1 : state.index / count));
  }

  function selectedSummary(state) {
    const labels = [];
    scenes(state).forEach(scene => {
      unique(state.answers[scene.id]).forEach(id => {
        const option = window.LuviaPreferenceSchema.option(id);
        if (option?.label) labels.push(option.label);
      });
    });
    return unique(labels);
  }

  function preferenceHint(state, scene) {
    if (!['places','move'].includes(state.domain)) return '';
    const prefs = state.initialPreferences || {};
    const labels = values => unique(values).map(value => window.LuviaPreferenceSchema.option(value)?.label).filter(Boolean);
    let selected = [];
    if (state.domain === 'places') {
      if (scene.id === 'intent' || scene.id === 'subintent') selected = [...labels(prefs.travelInterests), ...labels(prefs.dietaryPreferences)].slice(0, 3);
      else if (scene.id === 'context') selected = [...labels(prefs.travelStyles), ...labels(prefs.activityPreferences), ...labels(prefs.entertainmentPreferences)].slice(0, 3);
    } else {
      if (scene.id === 'purpose' || scene.id === 'mode') selected = labels(prefs.mobilityPreferences).slice(0, 3);
      else if (scene.id === 'priorities') selected = [...labels(prefs.accessibilityPreferences?.needs), ...labels(prefs.familyPreferences?.needs)].slice(0, 3);
    }
    if (!selected.length) return '';
    return `<div class="gds-profile-hint"><span>Dein Reiseprofil begleitet diese Auswahl</span><strong>${esc(selected.join(' · '))}</strong><small>Die Antworten hier gelten nur für diesen Moment. Dein globales Profil wird nicht verändert.</small></div>`;
  }

  function selectionStatus(scene, count) {
    if (scene.mode !== 'multi') return '';
    const max = Number(scene.max || 99);
    if (!count && scene.optional) return 'Optional – du kannst Luvia entscheiden lassen.';
    if (!count) return 'Wähle mindestens einen Gedanken.';
    return max < 99 ? `${count} von bis zu ${max} ausgewählt` : `${count} ausgewählt`;
  }

  function render(state) {
    writeDraft(state);
    const scene = currentScene(state);
    if (!scene) return renderSummary(state);
    state.completed = false;
    const progress = sceneProgress(state);
    state.root.style.setProperty('--gds-progress', String(progress));
    const showMore = (scene.more || []).length > 0;
    const expanded = state.expanded.has(scene.id);
    const options = [...(scene.featured || []), ...(expanded ? (scene.more || []) : [])];
    const titleId = `gds-title-${state.domain}-${state.index}`;
    const domainLabel = state.domain === 'move' ? 'Move' : state.domain === 'places' ? 'Places' : state.domain === 'profile' ? 'Dein Reiseprofil' : 'Dein Reiseprofil';
    const browse = state.options.onBrowse && !state.options.hideBrowse ? '<button type="button" class="gds-browse" data-gds-browse>Direkt stöbern</button>' : '<span class="gds-top-spacer"></span>';
    const count = unique(state.answers[scene.id]).length;
    state.root.innerHTML = `<section class="gds-sequence gds-domain-${esc(state.domain)}" data-gds-sequence aria-labelledby="${titleId}">
      ${backgroundMarkup()}
      <div class="gds-topbar">
        <button type="button" class="gds-back" data-gds-back ${state.index === 0 && !state.options.onCancel ? 'disabled' : ''} aria-label="Zurück">←</button>
        <div class="gds-brand"><span>Luvia</span><strong>${esc(domainLabel)}</strong></div>
        ${browse}
      </div>
      <div class="gds-stage" data-gds-stage>
        <header class="gds-scene-copy">
          <span class="gds-eyebrow">${esc(scene.eyebrow || domainLabel)}</span>
          <h1 id="${titleId}">${esc(scene.title || '')}</h1>
          <p>${esc(scene.copy || '')}</p>
          ${preferenceHint(state, scene)}
        </header>
        <div class="gds-cloud-field" role="${scene.mode === 'single' ? 'radiogroup' : 'group'}" aria-label="Antwortmöglichkeiten">
          ${options.map((item, index) => cloudMarkup(state, scene, item, index)).join('')}
          ${showMore && !expanded ? `<button type="button" class="gds-cloud gds-cloud-more" data-gds-more="${esc(scene.id)}" style="--gds-delay:${options.length};--gds-tone:#f6e9cf"><span class="gds-cloud-shape" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="gds-cloud-icon">＋</span><span class="gds-cloud-copy"><strong>Mehr entdecken</strong><small>Weitere Gedanken öffnen</small></span></button>` : ''}
        </div>
        <div class="gds-scene-actions">
          <span class="gds-selection-state" data-gds-selection-state aria-live="polite">${esc(selectionStatus(scene, count))}</span>
          <div class="gds-action-buttons">
            ${scene.optional ? '<button type="button" class="gds-skip" data-gds-skip>Luvia darf entscheiden</button>' : ''}
            ${scene.mode === 'multi' ? `<button type="button" class="gds-continue" data-gds-next ${canContinue(state, scene) ? '' : 'disabled'}>Auswahl übernehmen <span>→</span></button>` : ''}
          </div>
        </div>
      </div>
      ${progressMarkup(state)}
    </section>`;
    bind(state);
    requestAnimationFrame(() => state.root.querySelector('.gds-sequence')?.classList.add('is-entered'));
  }

  function cloudMarkup(state, scene, item, index) {
    const option = item || {};
    const selected = isSelected(state, scene.id, option.id);
    const tone = window.LuviaPreferenceSchema.tones?.[option.tone] || '#f6e9cf';
    return `<button type="button" class="gds-cloud tone-${esc(option.tone || 'cream')} ${selected ? 'is-selected' : ''}" data-gds-choice="${esc(option.id)}" data-gds-scene="${esc(scene.id)}" aria-pressed="${selected ? 'true' : 'false'}" style="--gds-delay:${index};--gds-tone:${esc(tone)}">
      <span class="gds-cloud-shape" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
      <span class="gds-cloud-icon" aria-hidden="true">${esc(option.icon || '✦')}</span>
      <span class="gds-cloud-copy"><strong>${esc(option.label || option.id)}</strong>${option.copy ? `<small>${esc(option.copy)}</small>` : ''}</span>
    </button>`;
  }

  function progressMarkup(state) {
    const all = scenes(state);
    return `<footer class="gds-progress" aria-label="Fortschritt">
      <div class="gds-progress-copy"><span>${Math.min(state.index + 1, all.length)} von ${all.length}</span><strong>${state.domain === 'move' ? 'Eure Route nimmt Form an' : state.domain === 'places' ? 'Eure Idee wird klarer' : 'Luvia lernt euren Reisekompass kennen'}</strong></div>
      <div class="gds-progress-line"><i></i>${all.map((_, index) => `<b class="${index <= state.index ? 'is-reached' : ''}"></b>`).join('')}</div>
    </footer>`;
  }

  function renderSummary(state) {
    state.completed = true;
    state.root.style.setProperty('--gds-progress', '1');
    const schema = window.LuviaPreferenceSchema;
    const preferenceMode = state.domain === 'onboarding' || state.domain === 'profile';
    const preferences = preferenceMode ? schema.preferencesFromAnswers(state.answers, state.initialPreferences) : state.initialPreferences;
    const contract = preferenceMode ? null : schema.buildContract(state.domain, state.answers, {preferences});
    state.result = {domain: state.domain, answers: clone(state.answers), preferences, contract};
    const chips = preferenceMode ? schema.summary(preferences).map(item => item.label) : window.LuviaDiscoveryContracts?.summaryChips?.(contract) || selectedSummary(state);
    const title = preferenceMode ? 'Das ist dein persönlicher Reisekompass.' : state.domain === 'move' ? 'Eure Wege nehmen Form an.' : 'Eure nächste Reiseidee ist bereit.';
    const copy = preferenceMode
      ? 'Diese globalen Vorlieben begleiten Entscheidungen in ganz Luvia. Die spontanen Auswahlen in Places und Move bleiben davon getrennt.'
      : 'Luvia öffnet jetzt nur die Vorschläge, die zu dieser Auswahl passen. Der vollständige Katalog bleibt zunächst bewusst geschlossen.';
    const cta = preferenceMode ? (state.domain === 'profile' ? 'Reiseprofil speichern' : 'Mit diesem Reisekompass weiter') : state.domain === 'move' ? 'Meine Move-Vorschläge zeigen' : 'Meine Vorschläge zeigen';
    state.root.innerHTML = `<section class="gds-sequence gds-domain-${esc(state.domain)} gds-summary" data-gds-sequence>
      ${backgroundMarkup()}
      <div class="gds-topbar"><button type="button" class="gds-back" data-gds-back aria-label="Zurück">←</button><div class="gds-brand"><span>Luvia</span><strong>${state.domain === 'move' ? 'Move' : state.domain === 'places' ? 'Places' : 'Reiseprofil'}</strong></div><span class="gds-top-spacer"></span></div>
      <div class="gds-stage">
        <header class="gds-scene-copy gds-summary-copy"><span class="gds-eyebrow">Eure Auswahl ist bereit</span><h1>${esc(title)}</h1><p>${esc(copy)}</p></header>
        <div class="gds-summary-orbit" aria-label="Ausgewählte Vorlieben">${chips.map((chip, index) => `<span style="--gds-delay:${index}">${esc(chip)}</span>`).join('')}</div>
        ${state.error ? `<div class="gds-save-error" role="alert"><strong>Cloud-Speicherung fehlgeschlagen</strong><span>${esc(state.error)}</span></div>` : ''}
        <div class="gds-summary-actions"><button type="button" class="gds-summary-primary" data-gds-complete ${state.saving ? 'disabled' : ''}>${state.saving ? 'Wird sicher gespeichert …' : esc(cta)} <span>${state.saving ? '☁' : '→'}</span></button><button type="button" class="gds-summary-secondary" data-gds-restart ${state.saving ? 'disabled' : ''}>Auswahl anpassen</button></div>
      </div>
      <footer class="gds-progress gds-progress-done"><div class="gds-progress-copy"><span>Bereit</span><strong>Das Flugzeug ist am Ziel</strong></div><div class="gds-progress-line"><i></i><b class="is-reached"></b><b class="is-reached"></b><b class="is-reached"></b><b class="is-reached"></b></div></footer>
    </section>`;
    bind(state);
    requestAnimationFrame(() => state.root.querySelector('.gds-sequence')?.classList.add('is-entered'));
  }

  function updateMultiSelectionUI(state, scene) {
    const selected = new Set(unique(state.answers[scene.id]));
    state.root.querySelectorAll(`[data-gds-scene="${CSS.escape(scene.id)}"]`).forEach(button => {
      const on = selected.has(button.dataset.gdsChoice);
      button.classList.toggle('is-selected', on);
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    const nextButton = state.root.querySelector('[data-gds-next]');
    if (nextButton) nextButton.disabled = !canContinue(state, scene);
    const status = state.root.querySelector('[data-gds-selection-state]');
    if (status) status.textContent = selectionStatus(scene, selected.size);
    writeDraft(state);
  }

  function choose(state, sceneId, value) {
    if (state.transition) return;
    const scene = currentScene(state);
    if (!scene || scene.id !== sceneId) return;
    const selected = unique(state.answers[scene.id]);
    if (scene.mode === 'multi') {
      const exists = selected.includes(value);
      const neutral = {dietary:'no_diet',familyPreferences:'no_family_needs',accessibilityNeeds:'no_accessibility'}[scene.id];
      let nextValues;
      if (neutral && value === neutral) {
        nextValues = exists ? [] : [neutral];
      } else {
        const withoutNeutral = neutral ? selected.filter(item => item !== neutral) : selected;
        nextValues = exists ? withoutNeutral.filter(item => item !== value) : [...withoutNeutral, value].slice(0, Number(scene.max || 99));
      }
      state.answers[scene.id] = nextValues;
      navigator.vibrate?.(7);
      updateMultiSelectionUI(state, scene);
      return;
    }
    state.answers[scene.id] = [value];
    navigator.vibrate?.(9);
    const chosen = [...state.root.querySelectorAll('[data-gds-choice]')].find(node => node.dataset.gdsChoice === value);
    chosen?.classList.add('is-confirmed');
    advance(state);
  }

  function advance(state) {
    const scene = currentScene(state);
    if (state.transition || !scene || !canContinue(state, scene)) return;
    const id = ++state.transitionId;
    state.transition = true;
    state.root.querySelector('[data-gds-stage]')?.classList.add('is-leaving');
    window.setTimeout(() => {
      if (id !== state.transitionId) return;
      state.transition = false;
      state.index += 1;
      render(state);
    }, reduceMotion() ? 20 : 240);
  }

  function next(state) {
    advance(state);
  }

  function previous(state) {
    state.transitionId += 1;
    state.transition = false;
    if (state.completed) {
      state.completed = false;
      state.index = Math.max(0, scenes(state).length - 1);
      render(state);
      return;
    }
    if (state.index > 0) {
      state.index -= 1;
      render(state);
      return;
    }
    state.options.onCancel?.();
  }

  function reset(state) {
    state.answers = state.domain === 'onboarding' || state.domain === 'profile'
      ? window.LuviaPreferenceSchema.answersFromPreferences(state.initialPreferences)
      : {};
    state.index = 0;
    state.completed = false;
    state.error = null;
    state.transition = false;
    state.transitionId += 1;
    state.expanded.clear();
    clearDraft(state);
    render(state);
  }

  async function complete(state) {
    if (state.saving) return;
    const result = state.result || {};
    state.saving = true;
    state.error = null;
    renderSummary(state);
    try {
      await state.options.onComplete?.(clone(result));
      clearDraft(state);
      state.saving = false;
    } catch (error) {
      state.saving = false;
      state.error = error?.message || 'Die Vorlieben konnten nicht in Supabase gespeichert werden.';
      renderSummary(state);
    }
  }

  function bind(state) {
    state.root.querySelectorAll('[data-gds-choice]').forEach(button => button.addEventListener('click', () => choose(state, button.dataset.gdsScene, button.dataset.gdsChoice)));
    state.root.querySelector('[data-gds-more]')?.addEventListener('click', event => {
      state.expanded.add(event.currentTarget.dataset.gdsMore);
      navigator.vibrate?.(6);
      render(state);
    });
    state.root.querySelector('[data-gds-next]')?.addEventListener('click', () => next(state));
    state.root.querySelector('[data-gds-skip]')?.addEventListener('click', () => {
      const scene = currentScene(state);
      if (scene) state.answers[scene.id] = [];
      next(state);
    });
    state.root.querySelector('[data-gds-back]')?.addEventListener('click', () => previous(state));
    state.root.querySelector('[data-gds-browse]')?.addEventListener('click', () => state.options.onBrowse?.());
    state.root.querySelector('[data-gds-complete]')?.addEventListener('click', () => complete(state));
    state.root.querySelector('[data-gds-restart]')?.addEventListener('click', () => {
      state.completed = false;
      state.index = 0;
      state.error = null;
      render(state);
    });
  }

  function destroy(state) {
    if (!state?.root) return;
    instances.delete(state.root);
    state.cleanup?.forEach?.(fn => { try { fn(); } catch {} });
    state.cleanup = [];
    state.root.classList.remove('gds-host');
    state.root.innerHTML = '';
  }

  function reduceMotion() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || window.LuviaProfileService?.snapshot?.().profile?.reducedMotion === true;
  }

  function mount(root, options = {}) {
    return create(root, {...options, embedded: true});
  }

  function suspendUnderlyingSurface() {
    const profileOverlay = document.querySelector('.pf-overlay');
    if (!profileOverlay) return;
    suspendedSurface = {
      node: profileOverlay,
      inert: Boolean(profileOverlay.inert),
      ariaHidden: profileOverlay.getAttribute('aria-hidden')
    };
    profileOverlay.inert = true;
    profileOverlay.setAttribute('aria-hidden', 'true');
    profileOverlay.classList.add('is-guided-suspended');
  }

  function restoreUnderlyingSurface() {
    if (!suspendedSurface?.node?.isConnected) { suspendedSurface = null; return; }
    const {node,inert,ariaHidden} = suspendedSurface;
    node.inert = inert;
    if (ariaHidden == null) node.removeAttribute('aria-hidden'); else node.setAttribute('aria-hidden', ariaHidden);
    node.classList.remove('is-guided-suspended');
    suspendedSurface = null;
  }

  function open(options = {}) {
    close();
    suspendUnderlyingSurface();
    const overlay = document.createElement('div');
    overlay.className = 'gds-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = '<div class="gds-overlay-host"></div>';
    document.body.appendChild(overlay);
    document.documentElement.classList.add('gds-overlay-open');
    activeOverlay = overlay;
    const closeOverlay = () => close();
    const controller = create(overlay.querySelector('.gds-overlay-host'), {
      ...options,
      onCancel: options.onCancel || closeOverlay,
      onComplete(result) {
        return Promise.resolve(options.onComplete?.(result)).then(value => {
          if (options.keepOpen !== true) close();
          return value;
        });
      }
    });
    return controller;
  }

  function close() {
    if (activeOverlay) activeOverlay.remove();
    activeOverlay = null;
    document.documentElement.classList.remove('gds-overlay-open');
    restoreUnderlyingSurface();
  }

  window.LuviaGuidedDiscovery = Object.freeze({version: VERSION, mount, open, close, buildContract: (...args) => window.LuviaPreferenceSchema?.buildContract?.(...args)});
})();
