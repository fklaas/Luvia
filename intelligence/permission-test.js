(function(){
  'use strict';

  const KEY='core_v2_2_2_permission_probe';

  function classify(error){
    const message=String(error?.message||error||'Unbekannter Fehler');
    const lower=message.toLowerCase();
    if(lower.includes('jwt')||lower.includes('not authenticated')||lower.includes('anmeldung'))return {code:'AUTH_REQUIRED',message:'Die Anmeldung ist nicht mehr gültig. Bitte erneut in Luvia anmelden.'};
    if(lower.includes('permission denied'))return {code:'TABLE_GRANT_MISSING',message:'PostgreSQL-Tabellenrecht fehlt. Die Berechtigungs-Migration V2.2.1 muss ausgeführt sein.'};
    if(lower.includes('row-level security')||lower.includes('rls')||lower.includes('policy'))return {code:'RLS_BLOCKED',message:'Row Level Security blockiert den Zugriff. Prüfe Reisemitgliedschaft und RLS-Policy.'};
    if(lower.includes('failed to fetch')||lower.includes('network')||!navigator.onLine)return {code:'NETWORK',message:'Keine stabile Verbindung zu Supabase.'};
    return {code:'UNKNOWN',message};
  }

  async function cleanupExisting(){
    try{
      const existing=await LuviaData.list('trip_preferences',{filters:{preference_key:KEY}});
      for(const item of existing.data||[]){
        if(item?.id)await LuviaData.remove('trip_preferences',item.id,{queueOnFailure:false});
      }
    }catch(_){/* Der Haupttest liefert die eigentliche Diagnose. */}
  }

  async function run(){
    const destination=window.LuviaDestinationContext?.getActive?.()||{};
    const tripId=destination.tripId||null;
    if(!tripId)throw Object.assign(new Error('Keine aktive Reise erkannt.'),{diagnostic:{code:'NO_ACTIVE_TRIP',message:'Öffne zuerst eine Reise in Luvia.'}});
    if(!navigator.onLine)throw Object.assign(new Error('Browser ist offline.'),{diagnostic:{code:'NETWORK',message:'Für die Berechtigungsprüfung wird eine Online-Verbindung benötigt.'}});

    const client=window.LuviaDatabaseFoundation?.client?.()||window.ParisSupabaseClient;
    if(!client)throw Object.assign(new Error('Supabase-Client nicht verfügbar.'),{diagnostic:{code:'NO_CLIENT',message:'Supabase konnte nicht initialisiert werden.'}});

    const auth=await client.auth.getUser();
    const user=auth?.data?.user||null;
    if(auth?.error||!user)throw Object.assign(auth?.error||new Error('Nicht angemeldet.'),{diagnostic:{code:'AUTH_REQUIRED',message:'Bitte zuerst in Luvia anmelden.'}});

    const result={
      version:'2.2.2-diagnostics-cleanup',
      authenticated:true,
      userId:user.id,
      tripId,
      checks:{select:false,insert:false,update:false,delete:false,membership:false},
      checkedAt:new Date().toISOString()
    };

    let id=null;
    await cleanupExisting();
    try{
      const created=await LuviaData.create('trip_preferences',{
        preference_key:KEY,
        preference_value:{probe:'insert',at:new Date().toISOString()},
        source:'system',
        confidence:1
      },{queueOnFailure:false});
      id=created?.data?.id||null;
      if(!id)throw new Error('INSERT lieferte keine Datensatz-ID zurück.');
      result.checks.insert=true;
      result.checks.membership=true;

      const listed=await LuviaData.list('trip_preferences',{filters:{id}});
      result.checks.select=Array.isArray(listed?.data)&&listed.data.some(x=>x.id===id);
      if(!result.checks.select)throw new Error('Der angelegte Datensatz ist unter RLS nicht lesbar.');

      const updated=await LuviaData.update('trip_preferences',id,{
        preference_value:{probe:'update',at:new Date().toISOString()}
      },{queueOnFailure:false});
      result.checks.update=updated?.data?.id===id;
      if(!result.checks.update)throw new Error('UPDATE wurde nicht bestätigt.');

      await LuviaData.remove('trip_preferences',id,{queueOnFailure:false});
      id=null;
      const after=await LuviaData.get('trip_preferences',created.data.id);
      result.checks.delete=!after?.data;
      if(!result.checks.delete)throw new Error('DELETE wurde nicht bestätigt.');

      result.ok=Object.values(result.checks).every(Boolean);
      return result;
    }catch(error){
      const diagnostic=error?.diagnostic||classify(error);
      error.diagnostic=diagnostic;
      error.partialResult=result;
      throw error;
    }finally{
      if(id){
        try{await LuviaData.remove('trip_preferences',id,{queueOnFailure:false});}catch(_){}
      }
      await cleanupExisting();
    }
  }

  window.LuviaPermissionTest={run,classify};
})();
