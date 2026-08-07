(function(){
'use strict';
const VERSION='0.3.0';
function create(options={}){
 const config={mode:options.mode||'test',testRecipient:options.testRecipient||'',sender:options.sender||'Luvia Booking Test <booking-test@luvia.invalid>'};
 return Object.freeze({
  id:'mock-email',version:VERSION,channel:'email',priority:100,network:false,
  supports(booking,context={}){const intended=booking?.contact?.email||context.intendedRecipient;return {supported:Boolean(intended),score:100,reason:'Mock email transport for isolated communication tests'};},
  async dispatch(booking,context={}){
   const CC=window.LuviaBookingCommunicationContract;if(!CC)throw new Error('Communication Contract fehlt.');
   const intended=booking?.contact?.email||context.intendedRecipient;
   const route=CC.routeRecipient({mode:context.mode||config.mode,intendedRecipient:intended,testRecipient:context.testRecipient||config.testRecipient});
   const composed=context.composed||CC.compose(booking,context);
   const token=`mock_${Date.now()}_${Math.random().toString(36).slice(2,10)}`;
   return {status:'requested',provider:'mock-email',channel:'email',providerReference:token,message:{direction:'outbound',channel:'email',transportProvider:'mock-email',sender:context.sender||config.sender,recipient:route.actualRecipient,intendedRecipient:route.intendedRecipient,actualRecipient:route.actualRecipient,subject:composed.subject,bodyText:composed.bodyText,templateKey:composed.templateKey,providerMessageId:token,deliveryStatus:'sent',idempotencyKey:context.idempotencyKey||null,metadata:{mode:route.mode,redirected:route.redirected,mock:true},rawPayload:{mock:true}}};
  }
 });
}
function register(options={}){const p=create(options);window.LuviaBookingProviderRegistry?.register(p,{replace:true});return p;}
window.LuviaBookingMockEmailProvider=Object.freeze({version:VERSION,create,register});
})();
