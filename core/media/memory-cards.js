(() => {
'use strict';
const VERSION='4.36.8',BUILD='13.36.8';
let channel=null,identityChannel=null,writeDepth=0;
const missing=e=>['42P01','PGRST205'].includes(e?.code);
const validColor=v=>/^#[0-9a-f]{6}$/i.test(String(v||'').trim())?String(v).trim().toLowerCase():null;
function activeTrip(){return window.LuviaTripStore?.snapshot?.()?.activeTrip||window.LuviaTripContext?.getActiveTrip?.()||window.LuviaTripContext?.getSnapshot?.()?.activeTrip||{}}
function tripAccent(){const t=activeTrip();return [t.accent,t.accent_color,t.themeColor,t.theme_color,t.color,t.settings?.accent,t.settings?.accent_color,t.settings?.themeColor,t.settings?.theme_color].map(validColor).find(Boolean)||null}
async function ctx(){const media=window.LuviaMediaCore;if(!media)throw new Error('Media Core ist nicht geladen.');return{...(await media.getContext()),media}}
async function list(filters={}){const{client,tripId}=await ctx();let q=client.from('memory_cards').select('*').eq('trip_id',tripId).neq('status','dismissed').order('created_at',{ascending:true});if(filters.clusterId)q=q.eq('cluster_id',filters.clusterId);if(filters.authorId)q=q.eq('author_id',filters.authorId);if(filters.cardType)q=q.eq('card_type',filters.cardType);const r=await q;if(r.error){if(missing(r.error))return[];throw r.error}return r.data||[]}
async function save(input={}){const{client,tripId,userId}=await ctx();const cardType=String(input.cardType||'note').trim();if(!cardType)throw new Error('Memory Card braucht einen Typ.');const payload={trip_id:tripId,author_id:userId,card_type:cardType,source_type:String(input.sourceType||'manual'),content:String(input.content||'').trim(),media_id:input.mediaId||null,cluster_id:input.clusterId||null,journey_id:input.journeyId||null,reaction:String(input.reaction||''),weight:Math.max(1,Math.min(3,Number(input.weight||1))),visibility:input.visibility==='private'?'private':'trip',status:input.status||'active',dedupe_key:input.dedupeKey||null,metadata:input.metadata||{},updated_at:new Date().toISOString()};writeDepth++;try{let r;if(input.id)r=await client.from('memory_cards').update(payload).eq('trip_id',tripId).eq('author_id',userId).eq('id',input.id).select('*').single();else if(payload.dedupe_key)r=await client.from('memory_cards').upsert(payload,{onConflict:'trip_id,dedupe_key'}).select('*').single();else r=await client.from('memory_cards').insert(payload).select('*').single();if(r.error){if(missing(r.error))throw new Error('Bitte zuerst die Migration für Memory Cards ausführen.');throw r.error}window.dispatchEvent(new CustomEvent('luvia:memory-card-updated',{detail:{card:r.data,local:true}}));return r.data}finally{writeDepth=Math.max(0,writeDepth-1)}}
async function setWeight(id,weight){const{client,tripId,userId}=await ctx();const r=await client.from('memory_cards').update({weight:Math.max(1,Math.min(3,Number(weight||1))),updated_at:new Date().toISOString()}).eq('trip_id',tripId).eq('author_id',userId).eq('id',id).select('*').single();if(r.error)throw r.error;return r.data}
async function dismiss(id){const{client,tripId,userId}=await ctx();const r=await client.from('memory_cards').update({status:'dismissed',updated_at:new Date().toISOString()}).eq('trip_id',tripId).eq('author_id',userId).eq('id',id);if(r.error)throw r.error;return true}
async function members(){
  const{client,tripId}=await ctx();
  const r=await client.rpc('luvia_list_trip_members',{p_trip_id:tripId});
  if(r.error)return[];
  const base=(r.data||[]).map(x=>({id:x.user_id||x.userId||x.id,displayName:x.display_name||x.displayName||x.name||'Reisender',avatarUrl:x.avatar_url||x.avatarUrl||null,avatarColor:x.avatar_color||x.avatarColor||null})).filter(x=>x.id);
  if(!base.length)return base;
  let resolved=base;
  try{
    const ids=base.map(x=>x.id),identity=await client.from('memory_member_identity').select('user_id,display_name,avatar_url,avatar_color').in('user_id',ids);
    if(!identity.error){const byId=new Map((identity.data||[]).map(x=>[String(x.user_id),x]));resolved=base.map(x=>{const live=byId.get(String(x.id));return{...x,displayName:live?.display_name||x.displayName,avatarUrl:live?.avatar_url||x.avatarUrl,avatarColor:live?.avatar_color||x.avatarColor||null}})}
  }catch(_){}
  const local=window.LuviaProfileService?.snapshot?.()?.profile||null;
  if(local?.userId)resolved=resolved.map(x=>String(x.id)===String(local.userId)?{...x,displayName:local.displayName||x.displayName,avatarUrl:local.avatarUrl||x.avatarUrl,avatarColor:local.avatarColor||x.avatarColor}:x);
  return resolved;
}

async function subscribe(cb){const{client,tripId}=await ctx();if(channel)await client.removeChannel(channel);channel=client.channel(`luvia-memory-cards-${tripId}-${Math.random().toString(36).slice(2)}`).on('postgres_changes',{event:'*',schema:'public',table:'memory_cards',filter:`trip_id=eq.${tripId}`},p=>{if(!writeDepth)cb?.(p)}).subscribe();return async()=>{if(channel){await client.removeChannel(channel);channel=null}}}
async function subscribeIdentities(cb){const{client}=await ctx();if(identityChannel)await client.removeChannel(identityChannel);identityChannel=client.channel(`luvia-memory-identities-${Math.random().toString(36).slice(2)}`).on('postgres_changes',{event:'*',schema:'public',table:'memory_member_identity'},p=>cb?.(p)).subscribe();return async()=>{if(identityChannel){await client.removeChannel(identityChannel);identityChannel=null}}}
window.LuviaMemoryCards=Object.freeze({version:VERSION,build:BUILD,list,save,setWeight,dismiss,members,subscribe,subscribeIdentities,tripAccent,activeTrip,isWriting:()=>writeDepth>0});
})();
