type SupabaseClient={rpc:(name:string,args:Record<string,unknown>)=>Promise<{data:any,error:any}>};
const metrics={stored:0,decisions:0,lists:0,failures:0,lastError:null as any};
export async function recommendationAction(action:string,payload:any,client:SupabaseClient){
 try{
  if(action==='recommendation.health')return{data:{status:'ok',service:'smart-recommendations',version:'3.6.0',metrics:{...metrics}}};
  if(action==='recommendation.store'){const items=Array.isArray(payload?.recommendations)?payload.recommendations:[];const ids=[];for(const item of items){const {data,error}=await client.rpc('luvia_store_recommendation',{p_item:item});if(error)throw error;ids.push(data)}metrics.stored+=ids.length;return{data:{ids,count:ids.length}}}
  if(action==='recommendation.decision'){const {data,error}=await client.rpc('luvia_decide_recommendation',{p_id:payload.recommendationId,p_trip_id:payload.tripId,p_status:payload.status,p_reason:payload.reason||null,p_action:payload.action||null,p_context:payload.context||{}});if(error)throw error;metrics.decisions++;return{data}}
  if(action==='recommendation.list'){const {data,error}=await client.rpc('luvia_list_recommendations',{p_trip_id:payload.tripId,p_module:payload.module||null,p_limit:payload.limit||100});if(error)throw error;metrics.lists++;return{data:{recommendations:data||[]}}}
  throw Object.assign(new Error('Recommendation-Aktion unbekannt.'),{code:'ACTION_NOT_FOUND',status:404});
 }catch(error){metrics.failures++;metrics.lastError={at:new Date().toISOString(),message:error instanceof Error?error.message:String(error)};throw Object.assign(new Error(error instanceof Error?error.message:String(error)),{code:'RECOMMENDATION_FAILED',status:400})}
}
export function recommendationDiagnostics(){return{version:'3.6.0',metrics:{...metrics}}}
