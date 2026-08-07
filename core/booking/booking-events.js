(function(){
'use strict';
const VERSION='0.3.0';
const NAMES=Object.freeze({
 CREATED:'booking.created', READY:'booking.ready', REQUESTED:'booking.requested', AWAITING_REPLY:'booking.awaiting_reply',
 NEEDS_ACTION:'booking.needs_action', CONFIRMED:'booking.confirmed', DECLINED:'booking.declined', CANCELLED:'booking.cancelled', FAILED:'booking.failed',
 MESSAGE_QUEUED:'booking.message.queued', MESSAGE_RECEIVED:'booking.message.received', MESSAGE_SENT:'booking.message.sent', MESSAGE_FAILED:'booking.message.failed',
 PROVIDER_SELECTED:'booking.provider.selected'
});
const statusEvent=s=>NAMES[String(s||'').toUpperCase()]||`booking.${String(s||'changed').toLowerCase()}`;
async function emit(name,payload={},meta={}){
  if(window.LuviaKernelEvents?.emit)return window.LuviaKernelEvents.emit(name,payload,{domain:'booking',version:VERSION,...meta});
  if(typeof window.dispatchEvent==='function'&&typeof CustomEvent!=='undefined')window.dispatchEvent(new CustomEvent(`luvia:${name}`,{detail:{payload,meta}}));
  return {name,payload,meta};
}
window.LuviaBookingEvents=Object.freeze({version:VERSION,names:NAMES,statusEvent,emit});
})();
