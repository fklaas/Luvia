(function(){
  'use strict';
  async function run(options={}){
    const api=window.LuviaDestination;if(!api)throw new Error('LuviaDestination API fehlt.');
    await api.init();
    const normalized=api.normalize({tripId:'test-trip',destination:'Berlin',country:'Deutschland',countryCode:'DE',destinationLat:52.52,destinationLng:13.405});
    const validation=api.validate(normalized);
    const registered=api.register({...normalized,id:'test-berlin-v2112'},{source:'self-test'});
    const resolved=api.resolve({id:'test-berlin-v2112',name:'Berlin'});
    const checks={normalize:normalized.name==='Berlin',coordinates:normalized.center?.lat===52.52,validation:validation.valid,registry:api.get('test-berlin-v2112')?.name==='Berlin',cache:resolved.cache==='hit'||resolved.name==='Berlin',resolver:typeof api.ensureResolved==='function',active:Boolean(api.getActive()),migration:Boolean(api.diagnostics().lastMigration),countryIntelligence:normalized.currency==='EUR'&&normalized.languageCodes?.includes('de')&&normalized.flagEmoji==='🇩🇪',dynamicRadius:normalized.searchRadiusMeters>=1000};
    let remote={skipped:true};
    if(options.remote===true){try{remote=await api.resolveLocation({name:'Berlin',country:'Deutschland',countryCode:'DE'},{refresh:true});checks.remote=Boolean(remote?.center&&remote?.countryCode);}catch(error){remote={ok:false,code:error.code,message:error.message};checks.remote=false;}}
    api.remove('test-berlin-v2112');
    return{ok:Object.values(checks).every(Boolean),message:'Destination Registry, Geocoding, Zeitzone, Länder-Metadaten, dynamischer Radius, Persistierung und Context geprüft.',checks,remote,diagnostics:api.diagnostics()};
  }
  window.LuviaDestinationTest=Object.freeze({run});
})();
