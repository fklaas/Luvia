(() => {
  'use strict';

  const VERSION = '13.3.0.3';
  const state = {
    screen: 'home',
    idea: null,
    registration: { displayName: '', email: '', password: '' }
  };

  const ideas = [
    ['place', 'Ein bestimmter Ort', '📍', 'rose'],
    ['weekend', 'Ein freies Wochenende', '🗓️', 'violet'],
    ['sun', 'Sonne und Meer', '☀️', 'peach'],
    ['family', 'Eine Familienreise', '♡', 'mint'],
    ['open', 'Noch ganz offen', '•••', 'blue']
  ];

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  function brand() {
    return `<a class="lv-brand" href="/" data-go="home" aria-label="Luvia Startseite">
      <img src="luvia-logo.svg" alt=""><strong>Luvia</strong>
    </a>`;
  }

  function travelBackdrop(variant = 'home') {
    return `<div class="lv-travel-backdrop lv-travel-${variant}" aria-hidden="true">
      <span class="lv-sun"></span>
      <span class="lv-hill lv-hill-one"></span><span class="lv-hill lv-hill-two"></span>
      <span class="lv-route"><i></i><b>✈</b></span>
      <span class="lv-balloon lv-balloon-one">◉</span><span class="lv-balloon lv-balloon-two">◉</span>
      <span class="lv-star lv-star-one">✦</span><span class="lv-star lv-star-two">✧</span>
    </div>`;
  }

  function header(back = null) {
    return `<header class="lv-entry-header">${brand()}${back
      ? `<button class="lv-round-back" data-go="${back}" aria-label="Zurück">←</button>`
      : `<button class="lv-login-link" data-go="login">Anmelden</button>`}</header>`;
  }

  function homeScreen() {
    return `<section class="lv-screen lv-screen-home" data-screen="home" aria-labelledby="lv-home-title">
      ${travelBackdrop('home')}${header()}
      <div class="lv-home-content">
        <div class="lv-home-clouds" aria-hidden="true">
          <span class="lv-soft-cloud lv-cloud-heart"><b>♡</b></span>
          <span class="lv-soft-cloud lv-cloud-pin"><b>⌖</b></span>
          <span class="lv-soft-cloud lv-cloud-palm"><b>♧</b></span>
        </div>
        <div class="lv-home-copy">
          <span class="lv-eyebrow">Eure Reise beginnt hier</span>
          <h1 id="lv-home-title">Aus einer Idee<br>wird <em>eure Reise.</em></h1>
          <p>Gemeinsam planen, unterwegs alles im Blick behalten und Erinnerungen bewahren, die bleiben.</p>
          <button class="lv-primary" data-go="idea"><span>Reise beginnen</span><b>→</b></button>
          <button class="lv-secondary" data-go="invite">Ich wurde eingeladen</button>
        </div>
        <div class="lv-home-values" aria-label="Was Luvia verbindet">
          <span>Gemeinsam planen</span><span>Unterwegs begleiten</span><span>Momente festhalten</span>
        </div>
      </div>
    </section>`;
  }

  function ideaScreen() {
    return `<section class="lv-screen lv-screen-idea" data-screen="idea" aria-labelledby="lv-idea-title">
      ${travelBackdrop('idea')}${header('home')}
      <div class="lv-idea-content">
        <span class="lv-eyebrow">Der erste Gedanke</span>
        <h2 id="lv-idea-title">Woran denkst du gerade?</h2>
        <p>Wähle einfach das Gefühl, das deiner Reiseidee gerade am nächsten kommt.</p>
        <div class="lv-thought-clouds">
          ${ideas.map(([value, label, icon, tone], index) => `<button class="lv-thought-cloud tone-${tone} cloud-${index + 1}" data-idea="${value}" data-label="${esc(label)}"><span>${icon}</span><strong>${esc(label)}</strong></button>`).join('')}
        </div>
        <form class="lv-free-idea" data-free-idea>
          <label for="lvIdeaInput">Oder schreib deinen Gedanken auf</label>
          <div><input id="lvIdeaInput" name="idea" maxlength="120" autocomplete="off" placeholder="Zum Beispiel: Im Herbst nach Amsterdam"><button aria-label="Weiter">→</button></div>
        </form>
      </div>
    </section>`;
  }

  function nameScreen() {
    return stepScreen({
      key: 'name', back: 'idea', step: '01 von 03', title: 'Wie dürfen wir dich nennen?',
      text: 'Dein Name macht eure gemeinsame Reise persönlicher.',
      field: `<label for="lvName">Dein Name</label><input id="lvName" name="displayName" autocomplete="name" maxlength="80" value="${esc(state.registration.displayName)}" placeholder="Zum Beispiel Fabian" required>`,
      next: 'email', variant: 'name'
    });
  }

  function emailScreen() {
    return stepScreen({
      key: 'email', back: 'name', step: '02 von 03', title: 'Deine E-Mail',
      text: 'Damit wir deine Reise sicher speichern und auf all deinen Geräten öffnen können.',
      field: `<label for="lvEmail">E-Mail-Adresse</label><input id="lvEmail" name="email" type="email" inputmode="email" autocomplete="email" value="${esc(state.registration.email)}" placeholder="name@beispiel.de" required>`,
      next: 'password', variant: 'email'
    });
  }

  function passwordScreen() {
    return stepScreen({
      key: 'password', back: 'email', step: '03 von 03', title: 'Erstelle ein Passwort',
      text: 'Mindestens acht Zeichen. Danach ist deine erste Reiseidee sicher bei Luvia aufgehoben.',
      field: `<label for="lvPassword">Passwort</label><input id="lvPassword" name="password" type="password" autocomplete="new-password" placeholder="Mindestens 8 Zeichen" required><label for="lvPasswordRepeat">Passwort wiederholen</label><input id="lvPasswordRepeat" name="repeat" type="password" autocomplete="new-password" placeholder="Noch einmal eingeben" required>`,
      submit: true, variant: 'password'
    });
  }

  function stepScreen({ key, back, step, title, text, field, next, submit = false, variant }) {
    return `<section class="lv-screen lv-screen-step lv-step-${variant}" data-screen="${key}" aria-labelledby="lv-${key}-title">
      ${travelBackdrop(variant)}${header(back)}
      <div class="lv-step-center">
        <div class="lv-step-card">
          <div class="lv-step-progress"><span>${step}</span><i></i></div>
          <h2 id="lv-${key}-title">${title}</h2>
          <p>${text}</p>
          <form class="lv-step-form" data-step-form="${key}" ${submit ? 'data-register-form' : ''}>
            <div class="lv-field-stack">${field}</div>
            <button class="lv-primary lv-step-next" type="submit"><span>${submit ? 'Konto erstellen' : 'Weiter'}</span><b>→</b></button>
            <div class="lv-form-message" data-form-message role="status"></div>
          </form>
          ${key === 'name' ? `<p class="lv-account-hint">Bereits ein Konto? <button data-go="login">Anmelden</button></p>` : ''}
        </div>
      </div>
    </section>`;
  }

  function loginScreen() {
    return `<section class="lv-screen lv-screen-login" data-screen="login" aria-labelledby="lv-login-title">
      ${travelBackdrop('login')}${header('home')}
      <div class="lv-step-center"><div class="lv-step-card lv-login-card">
        <span class="lv-eyebrow">Willkommen zurück</span>
        <h2 id="lv-login-title">Eure Reise wartet schon.</h2>
        <p>Melde dich an und macht dort weiter, wo ihr aufgehört habt.</p>
        <div class="lv-login-host" data-login-host></div>
      </div></div>
    </section>`;
  }

  function inviteScreen() {
    return `<section class="lv-screen lv-screen-invite" data-screen="invite" aria-labelledby="lv-invite-title">
      ${travelBackdrop('invite')}${header('home')}
      <div class="lv-step-center"><div class="lv-step-card">
        <span class="lv-eyebrow">Gemeinsam reisen</span>
        <h2 id="lv-invite-title">Eine Reise wartet auf dich.</h2>
        <p>Gib deinen Einladungscode ein und öffne eure gemeinsame Reise.</p>
        <form class="lv-step-form" data-invite-form>
          <div class="lv-field-stack"><label for="lvInviteCode">Einladungscode</label><input id="lvInviteCode" name="code" maxlength="12" autocomplete="one-time-code" placeholder="LUVIA-2026" required></div>
          <button class="lv-primary lv-step-next"><span>Reise öffnen</span><b>→</b></button>
          <div class="lv-form-message" data-invite-message role="status"></div>
        </form>
      </div></div>
    </section>`;
  }

  function markup() {
    return `<main class="lv-entry" data-entry-root>${homeScreen()}${ideaScreen()}${nameScreen()}${emailScreen()}${passwordScreen()}${loginScreen()}${inviteScreen()}</main>`;
  }

  function emit() {
    document.dispatchEvent(new CustomEvent('luvia:guided-entry-state', { detail: { version: VERSION, ...state } }));
  }

  function show(root, next) {
    state.screen = next;
    root.querySelectorAll('[data-screen]').forEach(screen => {
      const active = screen.dataset.screen === next;
      screen.classList.toggle('is-active', active);
      screen.setAttribute('aria-hidden', active ? 'false' : 'true');
    });
    if (next === 'login') {
      const host = root.querySelector('[data-login-host]');
      if (host) {
        host.innerHTML = '';
        window.ParisAuthUI?.renderAuthForm?.(host, 'login');
      }
    }
    requestAnimationFrame(() => root.querySelector(`[data-screen="${next}"] input, [data-screen="${next}"] button`)?.focus?.({ preventScroll: true }));
    emit();
  }

  function chooseIdea(root, value, label) {
    state.idea = { value, label, createdAt: new Date().toISOString() };
    show(root, 'name');
  }

  function bind(root) {
    root.addEventListener('click', event => {
      const go = event.target.closest('[data-go]');
      if (go) { event.preventDefault(); show(root, go.dataset.go); return; }
      const idea = event.target.closest('[data-idea]');
      if (idea) chooseIdea(root, idea.dataset.idea, idea.dataset.label);
    });

    root.querySelector('[data-free-idea]')?.addEventListener('submit', event => {
      event.preventDefault();
      const value = String(new FormData(event.currentTarget).get('idea') || '').trim();
      if (!value) { event.currentTarget.querySelector('input')?.focus(); return; }
      chooseIdea(root, 'custom', value);
    });

    root.querySelector('[data-step-form="name"]')?.addEventListener('submit', event => {
      event.preventDefault();
      const value = String(new FormData(event.currentTarget).get('displayName') || '').trim();
      if (value.length < 2) return setMessage(event.currentTarget, 'Bitte gib deinen Namen ein.');
      state.registration.displayName = value; show(root, 'email');
    });

    root.querySelector('[data-step-form="email"]')?.addEventListener('submit', event => {
      event.preventDefault();
      const value = String(new FormData(event.currentTarget).get('email') || '').trim();
      if (!/^\S+@\S+\.\S+$/.test(value)) return setMessage(event.currentTarget, 'Bitte gib eine gültige E-Mail-Adresse ein.');
      state.registration.email = value; show(root, 'password');
    });

    root.querySelector('[data-register-form]')?.addEventListener('submit', async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const fd = new FormData(form);
      const password = String(fd.get('password') || '');
      const repeat = String(fd.get('repeat') || '');
      if (password.length < 8) return setMessage(form, 'Das Passwort muss mindestens 8 Zeichen haben.');
      if (password !== repeat) return setMessage(form, 'Die Passwörter stimmen nicht überein.');
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      setMessage(form, 'Dein Konto wird erstellt …', 'working');
      try {
        state.registration.password = password;
        const displayName = state.registration.displayName;
        await window.ParisAuth.signUp({
          email: state.registration.email,
          password,
          displayName,
          firstName: displayName,
          lastName: ''
        });
        setMessage(form, 'Fast geschafft: Bitte bestätige jetzt die E-Mail von Luvia.', 'success');
      } catch (error) {
        setMessage(form, error?.message || 'Das Konto konnte nicht erstellt werden.', 'error');
        button.disabled = false;
      }
    });

    root.querySelector('[data-invite-form]')?.addEventListener('submit', event => {
      event.preventDefault();
      const code = String(new FormData(event.currentTarget).get('code') || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
      if (!code) return setMessage(event.currentTarget, 'Bitte gib deinen Einladungscode ein.');
      const url = new URL(location.href); url.searchParams.set('join', code); location.assign(url.toString());
    });
  }

  function setMessage(form, text, type = 'error') {
    const box = form.querySelector('[data-form-message], [data-invite-message]');
    if (!box) return;
    box.textContent = text; box.dataset.type = type;
  }

  function render(container) {
    container.innerHTML = markup();
    const root = container.querySelector('[data-entry-root]');
    document.documentElement.classList.add('lv-public-entry-active');
    document.body.classList.add('lv-public-entry-active');
    bind(root); show(root, 'home');
  }

  window.LuviaGuidedJourneyEntry = Object.freeze({ version: VERSION, render, getState: () => ({ ...state }) });
})();
