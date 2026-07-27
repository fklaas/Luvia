(function(){
'use strict';
const VERSION='2.12.2-restaurant-entity-schema-test';
async function run(){
  const client=window.LuviaDatabaseFoundation?.client?.();
  if(!client)return{version:VERSION,ok:false,ready:false,error:'Supabase-Client nicht verfügbar.'};
  const {data:{session}}=await client.auth.getSession();
  if(!session)return{version:VERSION,ok:false,ready:false,error:'Bitte zuerst anmelden.'};
  const {data,error}=await client.rpc('luvia_restaurant_entity_schema_status');
  if(error)return{version:VERSION,ok:false,ready:false,migrationRequired:/does not exist|Could not find/i.test(error.message||''),error:error.message};
  const constraints=data?.constraints||{},rls=data?.rls||{},columns=data?.columns||{};
  return{
    version:VERSION,
    ok:Boolean(data?.ready)&&Object.values(constraints).every(Boolean)&&Object.values(rls).every(Boolean),
    ready:Boolean(data?.ready),
    schemaVersion:data?.version||null,
    tables:data?.tables||{},columns,constraints,rls,
    checkedAt:data?.checked_at||null,
    error:null
  };
}
window.LuviaRestaurantSchemaTest=Object.freeze({version:VERSION,run});
window.LuviaKernelEvents?.emit?.('restaurants.schema-test.ready',{version:VERSION});
})();
