(function(){
  'use strict';

  const VERSION = '2.5.2-myluvia-app-deployment';
  const PROD_HOSTS = new Set(['myluvia.app','www.myluvia.app']);
  const STAGING_HOSTS = new Set(['staging.myluvia.app']);

  function trimSlashes(value){ return String(value || '').replace(/^\/+|\/+$/g, ''); }
  function ensureTrailingSlash(value){ return String(value || '').replace(/\/+$/, '') + '/'; }
  function normalizePath(path){
    const value = String(path || '').trim();
    if (!value) return '';
    return value.replace(/^\.\//, '').replace(/^\/+/, '');
  }

  function detect(){
    const loc = window.location;
    const host = (loc.hostname || '').toLowerCase();
    const protocol = loc.protocol || 'https:';
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || protocol === 'file:';
    const isGitHubPages = host.endsWith('.github.io');
    const isStaging = STAGING_HOSTS.has(host) || host.startsWith('staging.');
    const isProduction = PROD_HOSTS.has(host);
    const nativeBridge = Boolean(window.Capacitor?.isNativePlatform?.() || window.webkit?.messageHandlers?.luviaNative || window.LUVIA_NATIVE);
    const displayModeStandalone = window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone === true;

    let basePath = '/';
    if (isGitHubPages) {
      const firstSegment = trimSlashes(loc.pathname).split('/')[0];
      basePath = firstSegment ? `/${firstSegment}/` : '/';
    }
    if (protocol === 'file:') basePath = './';

    const name = nativeBridge ? 'native-ios' : isProduction ? 'production' : isStaging ? 'staging' : isGitHubPages ? 'github-pages' : isLocal ? 'local' : 'custom';
    const origin = protocol === 'file:' ? '' : loc.origin;
    const baseUrl = protocol === 'file:' ? './' : new URL(basePath, origin + '/').href;

    return Object.freeze({
      version: VERSION,
      name,
      hostname: host,
      origin,
      basePath,
      baseUrl: ensureTrailingSlash(baseUrl),
      isLocal,
      isGitHubPages,
      isStaging,
      isProduction,
      isNative: nativeBridge,
      isPwa: Boolean(displayModeStandalone && !nativeBridge),
      isBrowser: !nativeBridge,
      secureContext: window.isSecureContext,
      online: navigator.onLine
    });
  }

  let current = detect();

  function refresh(){ current = detect(); return current; }
  function get(){ return current; }

  function resolveUrl(path = '', options = {}){
    const clean = normalizePath(path);
    if (/^(https?:|mailto:|tel:|data:|blob:|#)/i.test(String(path || ''))) return String(path);
    const base = options.originOnly ? ensureTrailingSlash(current.origin || current.baseUrl) : current.baseUrl;
    return new URL(clean, base).href;
  }

  function relativeUrl(path = ''){
    const absolute = resolveUrl(path);
    if (!current.origin || !absolute.startsWith(current.origin)) return absolute;
    return absolute.slice(current.origin.length) || '/';
  }

  function assetUrl(path){ return resolveUrl(path); }
  function appUrl(path){ return resolveUrl(path); }
  function authRedirectUrl(path = ''){
    const target = path || 'index.html';
    return resolveUrl(target);
  }

  function universalLink(path = ''){
    const clean = normalizePath(path);
    return new URL(clean, 'https://myluvia.app/').href;
  }

  function snapshot(){
    return {...current,
      appIndex: appUrl('index.html'),
      diagnostics: appUrl('intelligence/test.html'),
      futureConsole: appUrl('intelligence/console.html'),
      authRedirect: authRedirectUrl('index.html'),
      universalLinkBase: 'https://myluvia.app/',
      nativeScheme: 'myluvia://',
      canonicalOrigin: 'https://myluvia.app',
      canonicalUrl: universalLink('')
    };
  }

  window.LuviaEnvironment = Object.freeze({
    version: VERSION,
    current: get,
    refresh,
    resolveUrl,
    relativeUrl,
    assetUrl,
    appUrl,
    authRedirectUrl,
    universalLink,
    snapshot,
    isDevelopment: () => !current.isProduction,
    isProduction: () => current.isProduction,
    isPwa: () => current.isPwa,
    isNative: () => current.isNative
  });

  window.addEventListener('online', refresh);
  window.addEventListener('offline', refresh);
  window.dispatchEvent(new CustomEvent('luvia:environment-ready', {detail: snapshot()}));
})();
