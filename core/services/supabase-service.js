(() => {
  'use strict';
  let client = null;
  let startPromise = null;
  function create(){
    if(client) return client;
    const factory = window.supabase?.createClient;
    const config = window.ParisSupabaseConfig || window.LUVIA_AUTH_CONFIG;
    if(typeof factory !== 'function') throw new Error('Supabase-Bibliothek wurde nicht geladen.');
    if(!config?.url || !(config.publishableKey || config.supabaseKey)) throw new Error('Supabase-Konfiguration fehlt.');
    client = factory(config.url, config.publishableKey || config.supabaseKey, {
      auth: { persistSession:true, autoRefreshToken:true, detectSessionInUrl:true },
      global: { headers: { 'x-client-info':'luvia-core-health-destination/11.2.0' } }
    });
    window.ParisSupabaseClient = client;
    return client;
  }
  async function start(){
    if(startPromise) return startPromise;
    startPromise = (async()=>{
      const c=create();
      await window.ParisAuth.init(c);
      return c;
    })().catch(error=>{ startPromise=null; throw error; });
    return startPromise;
  }
  async function rpc(name,params={}){const c=await start();const result=await c.rpc(name,params);if(result.error)throw result.error;return result.data}
  function getClient(){return client}
  window.LuviaSupabaseService=Object.freeze({version:'1.1.0',create,start,rpc,getClient});
})();
