(function(){
'use strict';
const VERSION='0.7.0';
const PARTNER_STATUSES=Object.freeze(['active','paused','disabled']);
const LINK_STATUSES=Object.freeze(['active','expired','disabled']);
const ATTRIBUTION_MODELS=Object.freeze(['last_click','first_click','provider_reported','manual']);
const CONVERSION_STATUSES=Object.freeze(['reported','pending','approved','rejected','paid','cancelled']);
const COMMISSION_STATUSES=Object.freeze(['unknown','estimated','pending','approved','paid','rejected']);
const clean=v=>String(v??'').trim();
const bool=v=>v===true||String(v).toLowerCase()==='true';
const finite=v=>Number.isFinite(Number(v))?Number(v):null;
const iso=v=>{if(!v)return null;const d=new Date(v);return Number.isNaN(d.getTime())?null:d.toISOString();};
const obj=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const urlOk=v=>{try{const u=new URL(clean(v));return u.protocol==='https:';}catch{return false;}};
const currency=v=>(clean(v)||'EUR').toUpperCase().slice(0,3);
function normalizePartner(raw={}){
 const status=PARTNER_STATUSES.includes(clean(raw.status).toLowerCase())?clean(raw.status).toLowerCase():'active';
 return Object.freeze({
  id:clean(raw.id)||null,
  key:clean(raw.key||raw.partnerKey||raw.partner_key).toLowerCase()||null,
  name:clean(raw.name)||null,
  status,
  homepageUrl:urlOk(raw.homepageUrl||raw.homepage_url)?clean(raw.homepageUrl||raw.homepage_url):null,
  attributionWindowDays:Math.max(1,Math.min(365,Math.round(finite(raw.attributionWindowDays||raw.attribution_window_days)??30))),
  supportsDeepLinks:bool(raw.supportsDeepLinks??raw.supports_deep_links),
  metadata:Object.freeze(obj(raw.metadata))
 });
}
function normalizeLink(raw={}){
 const status=LINK_STATUSES.includes(clean(raw.status).toLowerCase())?clean(raw.status).toLowerCase():'active';
 const destinationUrl=clean(raw.destinationUrl||raw.destination_url);
 const affiliateUrl=clean(raw.affiliateUrl||raw.affiliate_url);
 return Object.freeze({
  id:clean(raw.id)||null,
  bookingId:clean(raw.bookingId||raw.booking_id)||null,
  partnerId:clean(raw.partnerId||raw.partner_id)||null,
  status,
  destinationUrl:urlOk(destinationUrl)?destinationUrl:null,
  affiliateUrl:urlOk(affiliateUrl)?affiliateUrl:null,
  trackingId:clean(raw.trackingId||raw.tracking_id)||null,
  expiresAt:iso(raw.expiresAt||raw.expires_at),
  metadata:Object.freeze(obj(raw.metadata)),
  valid:Boolean(urlOk(destinationUrl)&&urlOk(affiliateUrl)&&clean(raw.partnerId||raw.partner_id))
 });
}
function normalizeConversion(raw={}){
 const status=CONVERSION_STATUSES.includes(clean(raw.status).toLowerCase())?clean(raw.status).toLowerCase():'reported';
 const commissionStatus=COMMISSION_STATUSES.includes(clean(raw.commissionStatus||raw.commission_status).toLowerCase())?clean(raw.commissionStatus||raw.commission_status).toLowerCase():'unknown';
 const gross=finite(raw.grossAmount||raw.gross_amount);
 const commission=finite(raw.commissionAmount||raw.commission_amount);
 return Object.freeze({
  id:clean(raw.id)||null,
  bookingId:clean(raw.bookingId||raw.booking_id)||null,
  partnerId:clean(raw.partnerId||raw.partner_id)||null,
  attributionId:clean(raw.attributionId||raw.attribution_id)||null,
  status,
  externalReference:clean(raw.externalReference||raw.external_reference)||null,
  grossAmount:gross===null?null:Math.max(0,gross),
  grossCurrency:currency(raw.grossCurrency||raw.gross_currency),
  commissionAmount:commission===null?null:Math.max(0,commission),
  commissionCurrency:currency(raw.commissionCurrency||raw.commission_currency),
  commissionStatus,
  occurredAt:iso(raw.occurredAt||raw.occurred_at),
  metadata:Object.freeze(obj(raw.metadata))
 });
}
function isAttributionEligible(click={},partner={},now=new Date()){
 const clickedAt=iso(click.clickedAt||click.clicked_at);
 const p=normalizePartner(partner);
 if(!clickedAt||p.status!=='active')return false;
 const age=(new Date(now)-new Date(clickedAt))/86400000;
 return age>=0&&age<=p.attributionWindowDays;
}
function selectAttribution(clicks=[],partner={},model='last_click',now=new Date()){
 const eligible=(Array.isArray(clicks)?clicks:[]).filter(c=>isAttributionEligible(c,partner,now)).map(c=>({...c,_t:new Date(c.clickedAt||c.clicked_at).getTime()}));
 if(!eligible.length)return null;
 const m=ATTRIBUTION_MODELS.includes(clean(model).toLowerCase())?clean(model).toLowerCase():'last_click';
 eligible.sort((a,b)=>a._t-b._t);
 const chosen=m==='first_click'?eligible[0]:eligible[eligible.length-1];
 const {_t,...out}=chosen;
 return Object.freeze({...out,model:m});
}
window.LuviaBookingAffiliateFoundation=Object.freeze({version:VERSION,PARTNER_STATUSES,LINK_STATUSES,ATTRIBUTION_MODELS,CONVERSION_STATUSES,COMMISSION_STATUSES,normalizePartner,normalizeLink,normalizeConversion,isAttributionEligible,selectAttribution});
})();
