(function(){
'use strict';
const VERSION='4.6.3';
const FACT_SLOTS=Object.freeze(['rating','distance','bestTimeToVisit','priceLevel','openingState']);
const DETAIL_ORDER=Object.freeze(['gallery','header','actions','facts','providerDetails','recommendation','considerations','placeFields','alternatives','openingHours','contact']);
const HIDDEN=Object.freeze(['participantMatches','nextSteps','departurePlanning','dayPlanning']);
const TOKENS=Object.freeze(['--place-surface','--place-surface-raised','--place-surface-muted','--place-border','--place-radius-card','--place-radius-overlay','--place-card-padding','--place-control-height','--place-gap-sm','--place-gap-md','--place-gap-lg','--place-shadow-card','--place-shadow-overlay','--place-accent','--place-accent-soft']);
function forType(type){const c=window.LuviaPlaceTypeContracts?.get?.(type)||{};return Object.freeze({version:VERSION,type,card:{factSlots:[...(c.ui?.card?.factSlots||FACT_SLOTS)]},detail:{providerFields:'allAvailable',sectionOrder:[...(c.ui?.detail?.sectionOrder||DETAIL_ORDER)],hiddenSections:[...(c.ui?.detail?.hiddenSections||HIDDEN)],requiredSections:[...(c.ui?.detail?.requiredSections||['alternatives'])],actions:{favorite:'Favorit',timeline:'Zur Timeline',accent:'trip'},planning:{mode:'contract-dialog',timelineFields:window.LuviaPlaceTypeContracts?.timelineFields?.(type)||[]}}})}
function diagnostics(){return{version:VERSION,status:'ready',factSlots:FACT_SLOTS,detailOrder:DETAIL_ORDER,hiddenSections:HIDDEN,tokens:TOKENS}}
window.LuviaPlaceUIContract=Object.freeze({version:VERSION,factSlots:FACT_SLOTS,detailOrder:DETAIL_ORDER,hiddenSections:HIDDEN,tokens:TOKENS,forType,diagnostics});
})();
