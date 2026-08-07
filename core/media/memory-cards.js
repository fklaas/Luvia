(() => {
'use strict';
const VERSION='4.37.6',BUILD='13.37.6';
let channel=null,identityChannel=null,voteChannel=null,writeDepth=0;
const missing=e=>['42P01','PGRST205'].includes(e?.code);
const validColor=v=>/^#[0-9a-f]{6}$/i.test(String(v||'').trim())?String(v).trim().toLowerCase():null;
function activeTrip(){return window.LuviaTripStore?.snapshot?.()?.activeTrip||window.LuviaTripContext?.getActiveTrip?.()||window.LuviaTripContext?.getSnapshot?.()?.activeTrip||{}}
function tripAccent(){const themed=validColor(getComputedStyle(document.documentElement).getPropertyValue('--trip-accent'));if(themed)return themed;const t=activeTrip();return [t.accent,t.accent_color,t.themeColor,t.theme_color,t.color,t.settings?.accent,t.settings?.accent_color,t.settings?.themeColor,t.settings?.theme_color].map(validColor).find(Boolean)||null}
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


async function setAlbumReview(cardId,decision){
  const allowed=['included','excluded','undecided'];if(!allowed.includes(decision))throw new Error('INVALID_ALBUM_REVIEW_DECISION');
  const{client,tripId,userId}=await ctx();
  const payload={trip_id:tripId,card_id:cardId,user_id:userId,decision,updated_at:new Date().toISOString()};
  const r=await client.from('memory_card_album_reviews').upsert(payload,{onConflict:'card_id,user_id'}).select('*').single();
  if(r.error){if(missing(r.error))throw new Error('Bitte die 13.36.10 Migration für Memory Album Review ausführen.');throw r.error}
  window.dispatchEvent(new CustomEvent('luvia:memory-album-review-updated',{detail:{cardId,decision,tripId,local:true}}));return r.data;
}
async function albumReviews(cardIds=[]){
  const ids=[...new Set(cardIds.map(String).filter(Boolean))];if(!ids.length)return{};
  const{client,userId}=await ctx();const r=await client.from('memory_card_album_reviews').select('card_id,decision,updated_at').eq('user_id',userId).in('card_id',ids);
  if(r.error){if(missing(r.error))return{};throw r.error}return Object.fromEntries((r.data||[]).map(x=>[String(x.card_id),x.decision]));
}

const curationClass=card=>{const t=String(card?.card_type||'');if(t==='photo')return'hero';if(['quote','place','food','inside_joke','note'].includes(t))return'story';return'signal'};
async function syncPhotoCandidates(clusterId,mediaIds=[]){
  const ids=[...new Set(mediaIds.map(String).filter(Boolean))].slice(0,3),context=await ctx();
  const existing=await list({clusterId}),mine=existing.filter(c=>String(c.author_id)===String(context.userId)&&c.card_type==='photo');
  for(const card of mine){if(card.media_id&&!ids.includes(String(card.media_id)))await dismiss(card.id)}
  const saved=[];for(const mediaId of ids){const same=mine.find(c=>String(c.media_id)===String(mediaId));saved.push(await save({id:same?.id||null,cardType:'photo',sourceType:'cluster-discovery',clusterId,mediaId,weight:2,dedupeKey:`cluster:${clusterId}:author:${context.userId}:photo:${mediaId}`,metadata:{...(same?.metadata||{}),choice:'personal-favorite',curation_class:'hero',selected_for_stack:true}}))}return saved;
}
async function stackCuration(clusterIds=[]){
  const ids=[...new Set(clusterIds.map(String).filter(Boolean))];if(!ids.length)return{states:{},proposals:{}};const{client,tripId}=await ctx();
  const [states,proposals]=await Promise.all([client.from('memory_stack_curation').select('*').eq('trip_id',tripId).in('cluster_id',ids),client.from('memory_stack_title_proposals').select('*').eq('trip_id',tripId).in('cluster_id',ids).order('created_at',{ascending:true})]);
  if(states.error&&!missing(states.error))throw states.error;if(proposals.error&&!missing(proposals.error))throw proposals.error;
  const proposalMap={};for(const row of proposals.data||[])(proposalMap[String(row.cluster_id)]??=[]).push(row);return{states:Object.fromEntries((states.data||[]).map(x=>[String(x.cluster_id),x])),proposals:proposalMap};
}
async function saveTitleProposal(clusterId,title){const clean=String(title||'').trim().slice(0,90);if(!clean)throw new Error('Titel darf nicht leer sein.');const{client,tripId,userId}=await ctx();const r=await client.from('memory_stack_title_proposals').upsert({trip_id:tripId,cluster_id:clusterId,user_id:userId,title:clean,updated_at:new Date().toISOString()},{onConflict:'trip_id,cluster_id,user_id'}).select('*').single();if(r.error){if(missing(r.error))throw new Error('Bitte zuerst die Memory Curation Foundation Migration ausführen.');throw r.error}window.dispatchEvent(new CustomEvent('luvia:memory-curation-updated',{detail:{clusterId,local:true}}));return r.data}
async function dissolveStack(clusterId){const{client,tripId}=await ctx();const r=await client.rpc('luvia_memory_dissolve_stack',{p_trip_id:tripId,p_cluster_id:clusterId});if(r.error)throw r.error;window.dispatchEvent(new CustomEvent('luvia:memory-curation-updated',{detail:{clusterId,dissolved:true,local:true}}));return true}
async function albumReviewSummary(cardIds=[]){const ids=[...new Set(cardIds.map(String).filter(Boolean))];if(!ids.length)return{byCard:{},reviewers:0};const{client,tripId}=await ctx();const r=await client.from('memory_card_album_reviews').select('card_id,user_id,decision').eq('trip_id',tripId).in('card_id',ids);if(r.error){if(missing(r.error))return{byCard:{},reviewers:0};throw r.error}const byCard={},users=new Set();for(const row of r.data||[]){users.add(String(row.user_id));const k=String(row.card_id);const b=byCard[k]??={included:0,excluded:0,undecided:0,total:0};b[row.decision]=(b[row.decision]||0)+1;b.total++}return{byCard,reviewers:users.size}}


async function albumVotes(clusterId,cardIds=[]){const ids=[...new Set(cardIds.map(String).filter(Boolean))];if(!ids.length)return{};const{client,tripId,userId}=await ctx();const r=await client.from('memory_card_album_votes').select('card_id,points').eq('trip_id',tripId).eq('cluster_id',clusterId).eq('user_id',userId).in('card_id',ids);if(r.error){if(missing(r.error))return{};throw r.error}return Object.fromEntries((r.data||[]).map(x=>[String(x.card_id),Number(x.points||0)]))}
async function saveAlbumVotes(clusterId,votes={},budget=0){const{client,tripId,userId}=await ctx();const rows=Object.entries(votes).map(([cardId,points])=>({trip_id:tripId,cluster_id:clusterId,card_id:cardId,user_id:userId,points:Math.max(0,Math.min(3,Number(points||0))),updated_at:new Date().toISOString()}));const total=rows.reduce((n,x)=>n+x.points,0);if(budget&&total>budget)throw new Error('Dein Punktebudget ist überschritten.');if(!rows.length)return[];const r=await client.from('memory_card_album_votes').upsert(rows,{onConflict:'card_id,user_id'}).select('*');if(r.error){if(missing(r.error))throw new Error('Bitte zuerst die 13.37.1 Migration ausführen.');throw r.error}window.dispatchEvent(new CustomEvent('luvia:memory-album-votes-updated',{detail:{clusterId,local:true}}));return r.data||[]}
async function albumVoteSummary(clusterIds=[]){const ids=[...new Set(clusterIds.map(String).filter(Boolean))];if(!ids.length)return{byCluster:{}};const{client,tripId}=await ctx();const r=await client.from('memory_card_album_votes').select('cluster_id,card_id,user_id,points,updated_at').eq('trip_id',tripId).in('cluster_id',ids);if(r.error){if(missing(r.error))return{byCluster:{}};throw r.error}const byCluster={};for(const row of r.data||[]){const ck=String(row.cluster_id),card=String(row.card_id),uid=String(row.user_id),points=Number(row.points||0),c=byCluster[ck]??={byCard:{},byUser:{},rows:0};const bc=c.byCard[card]??={points:0,voters:0};bc.points+=points;if(points>0)bc.voters++;const bu=c.byUser[uid]??={cards:{},total:0,updatedAt:null};bu.cards[card]=points;bu.total+=points;bu.updatedAt=row.updated_at||bu.updatedAt;c.rows++}return{byCluster}}
async function updateStory(id,content){const text=String(content||'').replace(/\s+/g,' ').trim().slice(0,420);if(text.length<40)throw new Error('Die Geschichte ist noch zu kurz.');const{client,tripId,userId}=await ctx();const current=await client.from('memory_cards').select('metadata').eq('trip_id',tripId).eq('author_id',userId).eq('id',id).single();if(current.error)throw current.error;const metadata={...(current.data?.metadata||{}),curation_class:'story',story_enriched:true,story_context:true,story_updated_at:new Date().toISOString()};const r=await client.from('memory_cards').update({content:text,metadata,updated_at:new Date().toISOString()}).eq('trip_id',tripId).eq('author_id',userId).eq('id',id).select('*').single();if(r.error)throw r.error;window.dispatchEvent(new CustomEvent('luvia:memory-card-updated',{detail:{card:r.data,local:true}}));return r.data}

async function subscribe(cb){const{client,tripId}=await ctx();if(channel)await client.removeChannel(channel);channel=client.channel(`luvia-memory-cards-${tripId}-${Math.random().toString(36).slice(2)}`).on('postgres_changes',{event:'*',schema:'public',table:'memory_cards',filter:`trip_id=eq.${tripId}`},p=>{if(!writeDepth)cb?.(p)}).subscribe();return async()=>{if(channel){await client.removeChannel(channel);channel=null}}}
async function subscribeIdentities(cb){const{client}=await ctx();if(identityChannel)await client.removeChannel(identityChannel);identityChannel=client.channel(`luvia-memory-identities-${Math.random().toString(36).slice(2)}`).on('postgres_changes',{event:'*',schema:'public',table:'memory_member_identity'},p=>cb?.(p)).subscribe();return async()=>{if(identityChannel){await client.removeChannel(identityChannel);identityChannel=null}}}
async function subscribeVotes(cb){const{client,tripId}=await ctx();if(voteChannel)await client.removeChannel(voteChannel);voteChannel=client.channel(`luvia-memory-votes-${tripId}-${Math.random().toString(36).slice(2)}`).on('postgres_changes',{event:'*',schema:'public',table:'memory_card_album_votes',filter:`trip_id=eq.${tripId}`},p=>cb?.(p)).subscribe();return async()=>{if(voteChannel){await client.removeChannel(voteChannel);voteChannel=null}}}
window.LuviaMemoryCards=Object.freeze({version:VERSION,build:BUILD,list,save,setWeight,dismiss,members,setAlbumReview,albumReviews,albumReviewSummary,albumVotes,saveAlbumVotes,albumVoteSummary,updateStory,syncPhotoCandidates,curationClass,stackCuration,saveTitleProposal,dissolveStack,subscribe,subscribeIdentities,subscribeVotes,tripAccent,activeTrip,isWriting:()=>writeDepth>0});
})();
