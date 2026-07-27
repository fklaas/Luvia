(() => {
  'use strict';

  const listeners = new Map();
  const state = {
    status: 'signed-out',
    error: null,
    userId: null,
    tripId: null,
    client: null
  };

  let contextPromise = null;
  let authWaiters = [];

  function emit(event, detail) {
    (listeners.get(event) || new Set()).forEach(fn => {
      try { fn(detail); } catch (error) { console.warn('ParisSync listener:', error); }
    });
    document.dispatchEvent(new CustomEvent(`paris-sync:${event}`, { detail }));
  }

  function setStatus(status, error = null) {
    state.status = status;
    state.error = error ? String(error.message || error) : null;
    emit('status', { ...state });
  }

  function authState() {
    return window.ParisAuth?.getState?.() || null;
  }

  function appearsAuthenticated() {
    const current = authState();
    return Boolean(current?.authenticated && !current?.anonymous);
  }

  function releaseAuthWaiters() {
    const waiters = authWaiters;
    authWaiters = [];
    waiters.forEach(resolve => resolve());
  }

  function waitForSignIn() {
    if (appearsAuthenticated()) return Promise.resolve();
    setStatus('signed-out');
    return new Promise(resolve => authWaiters.push(resolve));
  }

  async function buildContext() {
    await waitForSignIn();

    if (!window.ParisCloud?.client) {
      throw new Error('Cloud-Grundverbindung fehlt.');
    }

    setStatus('connecting');

    // Nach einem Login oder Reisewechsel muss ParisCloud den aktuellen
    // Benutzer- und Reisekontext zuerst neu auflösen. Erst danach dürfen
    // Module Tabellen abfragen.
    await window.ParisCloud.connect?.({ force: true });

    const client = window.ParisCloud.client;
    const { data, error } = await client.auth.getSession();
    if (error) throw error;

    const session = data?.session || null;
    const userId = session?.user?.id || null;
    const tripId = window.ParisCloud.tripId || null;

    if (!userId || !tripId) {
      // Ein Logout während des Starts ist kein technischer Fehler. Der
      // Aufrufer wartet einfach bis zur nächsten gültigen Anmeldung.
      contextPromise = null;
      return buildContext();
    }

    state.client = client;
    state.userId = userId;
    state.tripId = tripId;
    setStatus('ready');
    return { ...state };
  }

  async function requireReady() {
    // Vor jedem Modulzugriff synchron prüfen. Dadurch lösen Polling-Timer auf
    // dem Login-Screen keinerlei REST-Anfragen mehr aus.
    if (!appearsAuthenticated()) {
      state.userId = null;
      state.tripId = null;
      contextPromise = null;
      await waitForSignIn();
    }

    if (!contextPromise) {
      contextPromise = buildContext().catch(error => {
        contextPromise = null;
        if (!appearsAuthenticated()) return requireReady();
        setStatus('error', error);
        throw error;
      });
    }
    return contextPromise;
  }

  const ready = requireReady();

  window.ParisSync = {
    version: '2.0.1',
    ready,
    state,
    modules: {},
    isAuthenticated: appearsAuthenticated,
    isReady: () => state.status === 'ready' && appearsAuthenticated(),
    on(event, callback) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(callback);
      return () => listeners.get(event)?.delete(callback);
    },
    emit,
    requireReady,
    register(name, api) {
      this.modules[name] = api;
      this[name] = api;
      emit('module-ready', { name });
      return api;
    }
  };

  const client = window.ParisCloud?.client;
  client?.auth?.onAuthStateChange?.((event, session) => {
    if (session?.user && event !== 'SIGNED_OUT') {
      contextPromise = null;
      releaseAuthWaiters();
      document.dispatchEvent(new CustomEvent('paris-sync:auth-ready', {
        detail: { userId: session.user.id, event }
      }));
      return;
    }

    state.userId = null;
    state.tripId = null;
    contextPromise = null;
    setStatus('signed-out');
    emit('signed-out', { event });
  });

  window.ParisAuth?.onChange?.(current => {
    if (current?.authenticated && !current?.anonymous) {
      contextPromise = null;
      releaseAuthWaiters();
    } else {
      state.userId = null;
      state.tripId = null;
      contextPromise = null;
      setStatus('signed-out');
    }
  });
})();
