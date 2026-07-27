(function(){
  'use strict';
  const KEY='core_v2_2_test';
  async function run(){
    const d=window.LuviaDestinationContext?.getActive?.()||{};
    if(!d.tripId)throw new Error('Keine aktive Reise erkannt.');
    const created=await LuviaData.upsert('trip_preferences',{preference_key:KEY,preference_value:{status:'created',at:new Date().toISOString()},source:'system',confidence:1});
    const first=created.data;
    const id=first?.id||(await LuviaData.list('trip_preferences',{filters:{preference_key:KEY}})).data[0]?.id;
    if(!id)throw new Error('Testdatensatz konnte nicht gelesen werden.');
    const updated=await LuviaData.update('trip_preferences',id,{preference_value:{status:'updated',at:new Date().toISOString()}});
    const read=await LuviaData.get('trip_preferences',id);
    await LuviaData.remove('trip_preferences',id);
    const after=await LuviaData.get('trip_preferences',id);
    return {ok:!after.data,created:first,updated:updated.data,read:read.data,deleted:!after.data,tripId:d.tripId};
  }
  window.LuviaDataLayerTest={run};
})();
