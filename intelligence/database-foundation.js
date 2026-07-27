(function(){
  'use strict';
  const VERSION='2.12.2-database-foundation';
  const REQUIRED=['destinations','trip_preferences','places','trip_places','restaurants','generated_content','media','recommendations','user_activity_events','automation_jobs'];
  function config(){const c=window.ParisSupabaseConfig||window.LUVIA_AUTH_CONFIG||{};return {url:c.url||c.supabaseUrl||'',key:c.publishableKey||c.anonKey||''};}
  function client(){
    if(window.ParisSupabaseClient)return window.ParisSupabaseClient;
    const c=config();
    if(!c.url||!c.key||!window.supabase)return null;
    window.ParisSupabaseClient=window.supabase.createClient(c.url,c.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return window.ParisSupabaseClient;
  }
  async function check(){
    const c=client();
    if(!c)return {version:VERSION,connected:false,authenticated:false,installed:false,error:'Supabase-Client nicht verfügbar.'};
    const {data:{session}}=await c.auth.getSession();
    if(!session)return {version:VERSION,connected:true,authenticated:false,installed:false,error:'Bitte zuerst in Luvia anmelden.'};
    const {data,error}=await c.rpc('luvia_core_v2_database_status');
    if(error){
      const missing=/function .* does not exist|Could not find the function/i.test(error.message||'');
      return {version:VERSION,connected:true,authenticated:true,installed:false,migrationRequired:missing,error:error.message};
    }
    const tables=data?.tables||{};
    const restaurantSchema=await c.rpc('luvia_restaurant_entity_schema_status').then(({data,error})=>error?{ready:false,migrationRequired:/does not exist|Could not find/i.test(error.message||''),error:error.message}:data).catch(error=>({ready:false,error:String(error)}));
    return {version:VERSION,connected:true,authenticated:true,installed:Boolean(data?.ready)&&REQUIRED.every(k=>tables[k]),tables,moduleCount:data?.module_count||0,restaurantSchema,checkedAt:data?.checked_at,error:null};
  }
  window.LuviaDatabaseFoundation={version:VERSION,requiredTables:REQUIRED,client,check};
})();
