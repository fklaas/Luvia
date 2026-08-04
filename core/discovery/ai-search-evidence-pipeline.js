(() => {
'use strict';
const VERSION='4.19.1';
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
const idOf=p=>String(p?.providerPlaceId||p?.id||'').replace(/^places\//,'');
function dedupe(items=[]){const map=new Map();for(const p of items){const id=idOf(p);if(!id)continue;const current=map.get(id);if(!current||Number(p.discoveryScore||0)>Number(current.discoveryScore||0))map.set(id,p)}return[...map.values()]}
function evidenceFor(place,contract={}){const evidence=[];if(place.rating!=null)evidence.push({code:'provider_rating',value:place.rating,source:'google_places',confidence:1});if(place.userRatingCount!=null)evidence.push({code:'provider_rating_count',value:place.userRatingCount,source:'google_places',confidence:1});if(place.distanceMeters!=null)evidence.push({code:'distance',value:place.distanceMeters,source:'provider_or_client',confidence:.95});if(place.businessStatus)evidence.push({code:'business_status',value:place.businessStatus,source:'google_places',confidence:1});if(place.editorialSummary)evidence.push({code:'editorial_summary',value:place.editorialSummary,source:'google_places',confidence:.8});return evidence}
function uncertainty(place){const out=[];if(place.distanceMeters==null)out.push('Entfernung noch nicht sicher berechnet');if(!place.openingHours&&!place.currentOpeningHours)out.push('Öffnungszeiten nicht bestätigt');if(!place.editorialSummary)out.push('Atmosphäre nur eingeschränkt belegt');return out}
async function execute({domain,contract,destination,maxResultCount=12,searchOptions={}}={}){
 if(!contract)throw new Error('DISCOVERY_CONTRACT_REQUIRED');
 const response=await window.LuviaDiscoveryContracts.search({type:domain,contract,destination,maxResultCount:Math.max(maxResultCount*2,20),searchOptions});
 const valid=dedupe(response?.data?.places||[]).filter(p=>window.LuviaDiscoveryContracts.matches(p,contract));
 const enriched=valid.map(p=>({...p,evidence:evidenceFor(p,contract),uncertainties:uncertainty(p),evidenceConfidence:Math.min(1,.55+evidenceFor(p,contract).length*.1)}));
 window.LuviaAIEvidence?.put?.(enriched.flatMap(p=>p.evidence.map((e,i)=>({id:`place:${idOf(p)}:${e.code}:${i}`,kind:'place_signal',source:e.source,confidence:e.confidence,payload:{placeId:idOf(p),...e}}))),{domain,contractId:contract.id});
 const ranked=await window.LuviaAI.rankCandidates({domain,contract,candidates:enriched});
 return{ok:true,data:{places:ranked.slice(0,maxResultCount),contract:clone(contract),roles:{best:ranked[0]||null,strongAlternatives:ranked.slice(1,3),boldIdea:ranked[3]||null}},meta:{...response.meta,strictContracts:true,deduplicated:true,evidenceEnriched:true,personalized:true}};
}
window.LuviaAISearchEvidencePipeline=Object.freeze({version:VERSION,execute,dedupe,evidenceFor,uncertainty,diagnostics:()=>({version:VERSION,contractsRequired:true,providerFactsAuthoritative:true})});
})();
