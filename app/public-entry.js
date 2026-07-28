(() => {
  'use strict';

  const VERSION = '13.3.0.2';
  const state = { slide: 'home', idea: null, direction: 1 };
  const slides = ['home', 'idea', 'auth', 'invite'];
  const ideas = [
    ['place', 'Ein bestimmter Ort', '📍'],
    ['weekend', 'Ein freies Wochenende', '✨'],
    ['sun', 'Sonne und Meer', '☀️'],
    ['family', 'Zeit mit der Familie', '♡'],
    ['open', 'Noch ganz offen', '⋯']
  ];

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  function brand() {
    return `<a class="lv-canvas-brand" href="/" aria-label="Luvia Startseite">
      <img src="luvia-logo.svg" alt="">
      <span><strong>Luvia</strong></span>
    </a>`;
  }

  function ambient() {
    return `<div class="lv-ambient" aria-hidden="true">
      <span class="lv-orb lv-orb-a"></span><span class="lv-orb lv-orb-b"></span><span class="lv-orb lv-orb-c"></span>
      <span class="lv-spark lv-spark-a">✦</span><span class="lv-spark lv-spark-b">✧</span><span class="lv-spark lv-spark-c">✦</span>
    </div>`;
  }

  function homeSlide() {
    return `<section class="lv-canvas-slide lv-home-slide" data-slide="home" aria-labelledby="entry-title">
      ${ambient()}
      <header class="lv-canvas-header">${brand()}<button class="lv-top-login" data-go="auth" data-auth-mode="login">Anmelden</button></header>
      <div class="lv-home-stage">
        <div class="lv-memory-cloud cloud-paris"><span class="cloud-icon">⌁</span><strong>Vielleicht Paris?</strong><small>ein erster Gedanke</small></div>
        <div class="lv-memory-cloud cloud-sea"><span class="cloud-icon">☀</span><strong>Ein Wochenende am Meer</strong></div>
        <div class="lv-memory-cloud cloud-us"><span class="cloud-icon">♡</span><strong>Nur wir</strong><small>und ganz viel Zeit</small></div>
        <div class="lv-memory-cloud cloud-moments"><span class="cloud-icon">✦</span><strong>Momente, die bleiben</strong></div>
        <div class="lv-home-copy">
          <span class="lv-kicker">Eure Reise beginnt hier</span>
          <h1 id="entry-title">Aus einer Idee wird<br><em>eure Reise.</em></h1>
          <p>Gemeinsam planen, unterwegs alles im Blick behalten und die schönsten Momente bewahren.</p>
          <div class="lv-home-actions">
            <button class="lv-primary-action" data-go="idea"><span>Reise beginnen</span><b aria-hidden="true">→</b></button>
            <button class="lv-quiet-action" data-go="invite">Ich wurde eingeladen</button>
          </div>
        </div>
        <div class="lv-story-ribbon" aria-label="Luvia begleitet den gesamten Reiseweg">
          <span><b>01</b> Idee</span><i></i><span><b>02</b> Planen</span><i></i><span><b>03</b> Erleben</span><i></i><span><b>04</b> Erinnern</span>
        </div>
      </div>
      <footer class="lv-canvas-footer"><span>myluvia.app</span><span>Für Reisen, die sich nach euch anfühlen.</span></footer>
    </section>`;
  }

  function ideaSlide() {
    return `<section class="lv-canvas-slide lv-flow-slide" data-slide="idea" aria-labelledby="idea-title">
      ${ambient()}
      <header class="lv-canvas-header">${brand()}<button class="lv-icon-button" data-go="home" aria-label="Zurück zur Startseite">×</button></header>
      <div class="lv-flow-layout">
        <aside class="lv-flow-aside">
          <span class="lv-step-mark">01</span>
          <p>Noch muss nichts feststehen.</p>
          <div class="lv-route-sketch" aria-hidden="true"><span></span><i></i><span></span></div>
        </aside>
        <div class="lv-flow-main">
          <span class="lv-kicker">Der erste Gedanke</span>
          <h2 id="idea-title">Woran denkst du<br>gerade?</h2>
          <p class="lv-flow-intro">Wähle einfach das Gefühl, das deiner Reiseidee gerade am nächsten kommt.</p>
          <div class="lv-idea-clouds">
            ${ideas.map(([value, label, icon], index) => `<button class="lv-idea-cloud cloud-${index + 1}" data-idea="${value}" data-label="${esc(label)}"><span>${icon}</span><strong>${esc(label)}</strong></button>`).join('')}
          </div>
          <form class="lv-free-thought" data-free-idea>
            <label for="lvIdeaInput">Oder schreib deinen Gedanken auf</label>
            <div><input id="lvIdeaInput" name="idea" maxlength="120" autocomplete="off" placeholder="Zum Beispiel: Im Herbst nach Amsterdam …"><button aria-label="Gedanken übernehmen">→</button></div>
          </form>
        </div>
      </div>
      <button class="lv-back-link" data-go="home">← Zurück</button>
    </section>`;
  }

  function authSlide() {
    const register = state.idea !== null;
    return `<section class="lv-canvas-slide lv-auth-slide" data-slide="auth" aria-labelledby="auth-title">
      ${ambient()}
      <header class="lv-canvas-header">${brand()}<button class="lv-icon-button" data-go="home" aria-label="Zurück zur Startseite">×</button></header>
      <div class="lv-auth-layout">
        <div class="lv-auth-story">
          <span class="lv-step-mark">${register ? '02' : 'Willkommen'}</span>
          <span class="lv-kicker">${register ? 'Deine Idee festhalten' : 'Schön, dass du wieder da bist'}</span>
          <h2 id="auth-title">${register ? 'Lass uns daraus<br><em>eine Reise machen.</em>' : 'Eure Reise<br><em>wartet schon.</em>'}</h2>
          <p>${register ? 'Erstelle dein Konto. Dein erster Gedanke bleibt während dieses Einstiegs bei dir und wird im nächsten Schritt zu einer echten Luvia-Reise.' : 'Melde dich an und setze genau dort weiter, wo eure Geschichte zuletzt stehen geblieben ist.'}</p>
          ${register ? `<div class="lv-idea-keepsake"><span>✦</span><div><small>Dein erster Gedanke</small><strong>${esc(state.idea.label)}</strong></div></div>` : `<button class="lv-switch-mode" data-go="idea">Noch keine Reise? Jetzt beginnen →</button>`}
        </div>
        <div class="lv-auth-card"><div class="lv-auth-host" data-entry-auth></div></div>
      </div>
      <button class="lv-back-link" data-go="${register ? 'idea' : 'home'}">← Zurück</button>
    </section>`;
  }

  function inviteSlide() {
    return `<section class="lv-canvas-slide lv-invite-slide" data-slide="invite" aria-labelledby="invite-title">
      ${ambient()}
      <header class="lv-canvas-header">${brand()}<button class="lv-icon-button" data-go="home" aria-label="Zurück zur Startseite">×</button></header>
      <div class="lv-invite-layout">
        <div class="lv-invite-visual" aria-hidden="true"><div class="lv-ticket"><span>LU VIA</span><strong>YOU'RE INVITED</strong><small>Gemeinsam beginnt es schöner.</small><i></i></div></div>
        <div class="lv-invite-copy">
          <span class="lv-kicker">Du wurdest eingeladen</span>
          <h2 id="invite-title">Eine Reise<br>wartet auf dich.</h2>
          <p>Gib den Einladungscode ein. Luvia bringt dich anschließend direkt zu eurer gemeinsamen Reise.</p>
          <form class="lv-invite-form" data-invite-form>
            <label for="lvInviteCode">Einladungscode</label>
            <div><input id="lvInviteCode" name="code" maxlength="12" autocomplete="one-time-code" inputmode="text" placeholder="LUVIA-2026"><button>Weiter →</button></div>
            <small data-invite-message></small>
          </form>
          <button class="lv-switch-mode" data-go="auth" data-auth-mode="login">Stattdessen anmelden</button>
        </div>
      </div>
      <button class="lv-back-link" data-go="home">← Zurück</button>
    </section>`;
  }

  function page() {
    return `<main class="lv-entry-canvas" data-entry-root>
      <div class="lv-canvas-track" data-canvas-track>${homeSlide()}${ideaSlide()}${authSlide()}${inviteSlide()}</div>
      <div class="lv-slide-progress" aria-hidden="true"><span></span><span></span><span></span></div>
    </main>`;
  }

  function currentIndex() { return Math.max(0, slides.indexOf(state.slide)); }

  function refreshAuth(root) {
    const host = root.querySelector('[data-slide="auth"] [data-entry-auth]');
    if (!host) return;
    host.innerHTML = '';
    window.ParisAuthUI?.renderAuthForm?.(host, state.idea ? 'register' : 'login');
  }

  function update(root, nextSlide, options = {}) {
    const previous = currentIndex();
    const next = Math.max(0, slides.indexOf(nextSlide));
    state.direction = next >= previous ? 1 : -1;
    state.slide = nextSlide;
    if (nextSlide === 'auth' && options.mode === 'login') state.idea = null;

    root.querySelectorAll('[data-slide]').forEach((slide, index) => {
      slide.classList.toggle('is-active', index === next);
      slide.setAttribute('aria-hidden', index === next ? 'false' : 'true');
    });
    root.dataset.activeSlide = nextSlide;
    root.dataset.direction = state.direction > 0 ? 'forward' : 'back';
    root.querySelectorAll('.lv-slide-progress span').forEach((dot, index) => dot.classList.toggle('is-on', index <= Math.min(next, 2)));
    if (nextSlide === 'auth') requestAnimationFrame(() => refreshAuth(root));
    requestAnimationFrame(() => root.querySelector(`[data-slide="${nextSlide}"] h1, [data-slide="${nextSlide}"] h2, [data-slide="${nextSlide}"] input, [data-slide="${nextSlide}"] button`)?.focus?.({ preventScroll: true }));
  }

  function selectIdea(root, value, label) {
    state.idea = { value, label, createdAt: new Date().toISOString() };
    emit();
    update(root, 'auth');
  }

  function handleInvite(form) {
    const message = form.querySelector('[data-invite-message]');
    const code = String(new FormData(form).get('code') || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
    if (!code) {
      if (message) message.textContent = 'Bitte gib deinen Einladungscode ein.';
      form.querySelector('input')?.focus();
      return;
    }
    const url = new URL(location.href);
    url.searchParams.set('join', code);
    location.assign(url.toString());
  }

  function render(root) {
    root.innerHTML = page();
    root.dataset.entryMounted = 'true';
    document.documentElement.classList.add('lv-entry-active');
    document.body.classList.add('lv-entry-active');
    update(root, 'home');

    if (root.dataset.entryBound === 'true') return;
    root.dataset.entryBound = 'true';
    root.addEventListener('click', event => {
      const target = event.target.closest('button,a');
      if (!target) return;
      const go = target.dataset.go;
      if (go) {
        event.preventDefault();
        update(root, go, { mode: target.dataset.authMode });
        return;
      }
      if (target.matches('[data-idea]')) {
        event.preventDefault();
        selectIdea(root, target.dataset.idea, target.dataset.label);
      }
    });
    root.addEventListener('submit', event => {
      const free = event.target.closest('[data-free-idea]');
      if (free) {
        event.preventDefault();
        const value = String(new FormData(free).get('idea') || '').trim();
        if (value) selectIdea(root, 'custom', value);
        else free.querySelector('input')?.focus();
        return;
      }
      const invite = event.target.closest('[data-invite-form]');
      if (invite) {
        event.preventDefault();
        handleInvite(invite);
      }
    });
    window.addEventListener('keydown', event => {
      if (event.key === 'Escape' && state.slide !== 'home') update(root, state.slide === 'auth' && state.idea ? 'idea' : 'home');
    });
  }

  function openIdea(root) { update(root, 'idea'); }
  function openAuth(root, mode = 'login') { update(root, 'auth', { mode }); }
  function emit() { window.dispatchEvent(new CustomEvent('luvia:guided-entry-idea', { detail: snapshot() })); }
  function snapshot() { return Object.freeze({ version: VERSION, slide: state.slide, idea: state.idea ? { ...state.idea } : null, persistence: 'memory-until-auth' }); }

  window.LuviaGuidedJourneyEntry = Object.freeze({ version: VERSION, render, openIdea, openAuth, snapshot, emit });
})();
