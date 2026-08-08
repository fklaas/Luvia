(() => {
'use strict';
const VERSION='1.0.0';
const CONVERSION_STATES=Object.freeze(['reported','pending','approved','rejected','cancelled']);
const CONVERSION_TYPES=Object.freeze(['reservation','lead','commerce']);
const clean=v=>String(v??'').trim();
const normalizeState=v=>{const x=clean(v).toLowerCase();return CONVERSION_STATES.includes(x)?x:null};
const normalizeType=v=>{const x=clean(v).toLowerCase();return CONVERSION_TYPES.includes(x)?x:null};
function normalizeCorrelation(row={}){return Object.freeze({id:row.id||row.correlation_id||null,token:row.correlation_token||row.token||null,tripId:row.trip_id||row.tripId||null,bookingId:row.booking_id||row.bookingId||null,handoffEventId:row.handoff_event_id||row.handoffEventId||null,provider:clean(row.provider_id||row.provider).toLowerCase()||null,providerPlaceId:row.provider_place_id||row.providerPlaceId||null,venueName:row.venue_name||row.venueName||null,state:row.state||row.correlation_state||null,linkedAt:row.linked_at||row.linkedAt||null,convertedAt:row.converted_at||row.convertedAt||null,expiresAt:row.expires_at||row.expiresAt||null});}
function normalizeConversion(row={}){return Object.freeze({id:row.id||null,correlationId:row.correlation_id||row.correlationId||null,bookingId:row.booking_id||row.bookingId||null,provider:clean(row.provider_id||row.provider).toLowerCase()||null,type:normalizeType(row.conversion_type||row.type),state:normalizeState(row.conversion_state||row.state),source:row.source||null,externalReference:row.external_reference||row.externalReference||null,occurredAt:row.occurred_at||row.occurredAt||null,reservationConfirmed:false});}
function semantics(){return Object.freeze({conversionIsConfirmation:false,handoffIsConfirmation:false,correlationMayExistWithoutBooking:true,providerReferenceMayLinkLater:true});}
window.LuviaBookingCorrelationConversion=Object.freeze({version:VERSION,CONVERSION_STATES,CONVERSION_TYPES,normalizeCorrelation,normalizeConversion,semantics,diagnostics:()=>({version:VERSION,status:'ready',...semantics()})});
})();
