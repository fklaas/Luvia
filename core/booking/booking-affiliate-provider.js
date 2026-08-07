(function(){
'use strict';
const VERSION='0.7.0';
function foundation(){return window.LuviaBookingAffiliateFoundation;}
function registry(){return window.LuviaBookingProviderRegistry;}
function resolveLink(booking,context={}){
 const raw=context.affiliateLink||booking?.affiliateLink||booking?.request?.affiliateLink||booking?.request?.affiliate_link||null;
 if(!raw)return null;
 const normalized=foundation()?.normalizeLink(raw);
 return normalized?.valid&&normalized.status==='active'?normalized:null;
}
const provider=Object.freeze({
 id:'affiliate',version:VERSION,channel:'affiliate',priority:70,network:false,
 supports(booking,context={}){const link=resolveLink(booking,context);return {supported:Boolean(link),score:link?70:0,reason:link?'Verifizierter Affiliate-Link für dieses Booking vorhanden':'Kein aktiver Affiliate-Link vorhanden'};},
 async dispatch(booking,context={}){
  const link=resolveLink(booking,context);if(!link)throw new Error('Kein gültiger Affiliate-Link verfügbar.');
  return Object.freeze({kind:'affiliate_redirect',bookingId:booking?.id||link.bookingId,partnerId:link.partnerId,linkId:link.id,trackingId:link.trackingId,url:link.affiliateUrl,destinationUrl:link.destinationUrl,requiresUserNavigation:true,merchantOfRecord:false});
 }
});
function register(){const r=registry();if(!r)return null;return r.register(provider,{replace:true});}
if(registry()&&foundation())register();
window.LuviaBookingAffiliateProvider=Object.freeze({version:VERSION,provider,register,resolveLink});
})();
