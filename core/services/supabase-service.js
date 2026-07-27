(() => {
  'use strict';
  let client=null,startPromise=null,created=0;
  function config(){return window.ParisSupabaseConfig||window.LUVIA_AUTH_CONFIG||{};}
  function create(){
    if(client)return client;
    if(window.ParisSupabaseClient){client=window.ParisSupabaseClient;return client;}
    const factory=window.supabase?.createClient,c=config();
    if(typeof factory!=='function')throw new Error('Supabase-Bibliothek wurde nicht geladen.');
    const key=c.publishableKey||c.supabaseKey||c.anonKey;
    if(!c.url||!key)throw new Error('Supabase-Konfiguration fehlt.');
    client=factory(c.url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'},global:{headers:{'x-client-info':'luvia/12.0.0'}}});
    created+=1;window.ParisSupabaseClient=client;
    window.dispatchEvent(new CustomEvent('luvia:supabase-client-ready',{detail:{instances:created}}));
    return client;
  }
  async function start(){if(startPromise)return startPromise;startPromise=(async()=>{const c=create();await window.ParisAuth.init(c);return c})().catch(e=>{startPromise=null;throw e});return startPromise;}
  async function rpc(name,params={}){const c=await start(),r=await c.rpc(name,params);if(r.error)throw r.error;return r.data;}
  function getClient(){return client||window.ParisSupabaseClient||null;}
  function diagnostics(){return Object.freeze({ready:Boolean(getClient()),instances:created || (window.ParisSupabaseClient?1:0),version:'2.0.0'});}
  window.LuviaSupabaseService=Object.freeze({version:'2.0.0',create,start,rpc,getClient,diagnostics});
})();
