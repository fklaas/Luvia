(() => {
  'use strict';
  const redirectUrl = window.LuviaEnvironment?.authRedirectUrl?.('index.html') || `${location.origin}${location.pathname}`;
  window.ParisSupabaseConfig = Object.freeze({
    url: 'https://yiadkcxgyzdgyadnhyqe.supabase.co',
    publishableKey: 'sb_publishable_RMrTCl-8az9LV2y8OAGPEw_dy3ioVOs',
    redirectUrl
  });
  window.LUVIA_AUTH_CONFIG = Object.freeze({
    supabaseUrl: window.ParisSupabaseConfig.url,
    publishableKey: window.ParisSupabaseConfig.publishableKey,
    redirectUrl
  });
})();
