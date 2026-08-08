(function(){
'use strict';
const VERSION='2.0.0';
const ENGINES=Object.freeze([
{id:'opentable',name:'OpenTable',hosts:[/(^|\.)opentable\./i]},
{id:'thefork',name:'TheFork',hosts:[/(^|\.)thefork\./i]},
{id:'resy',name:'Resy',hosts:[/(^|\.)resy\.com$/i]},
{id:'sevenrooms',name:'SevenRooms',hosts:[/(^|\.)sevenrooms\.com$/i]},
{id:'quandoo',name:'Quandoo',hosts:[/(^|\.)quandoo\./i]},
{id:'zenchef',name:'Zenchef',hosts:[/(^|\.)zenchef\./i]},
{id:'tock',name:'Tock',hosts:[/(^|\.)exploretock\.com$/i,/(^|\.)tockhq\.com$/i]},
{id:'covermanager',name:'CoverManager',hosts:[/(^|\.)covermanager\.com$/i]},
{id:'resdiary',name:'ResDiary',hosts:[/(^|\.)resdiary\.com$/i]},
{id:'tablecheck',name:'TableCheck',hosts:[/(^|\.)tablecheck\.com$/i]},
{id:'formitable',name:'Formitable',hosts:[/(^|\.)formitable\.com$/i]},
{id:'aleno',name:'aleno',hosts:[/(^|\.)aleno\.me$/i]},
{id:'simpleerb',name:'simpleERB',hosts:[/(^|\.)simpleerb\.com$/i]}
]);
const clean=v=>String(v??'').trim();
function safeUrl(value,base){try{const u=new URL(clean(value),base||location.href);return /^https?:$/.test(u.protocol)?u:null}catch{return null}}
function detectUrl(value,base){const u=safeUrl(value,base);if(!u)return null;const host=u.hostname.toLowerCase().replace(/^www\./,'');for(const e of ENGINES)if(e.hosts.some(rx=>rx.test(host)))return Object.freeze({id:e.id,name:e.name,url:u.toString(),host});return null;}
function scanDocument(doc=document){const hits=[];const sels=['a[href]','iframe[src]','form[action]','script[src]','[data-booking-url]','[data-reservation-url]','[data-widget-url]'];for(const el of doc.querySelectorAll(sels.join(','))){for(const attr of ['href','src','action','data-booking-url','data-reservation-url','data-widget-url']){const value=el.getAttribute?.(attr);if(!value)continue;const hit=detectUrl(value,doc.baseURI);if(hit)hits.push({...hit,tag:String(el.tagName||'').toLowerCase(),attribute:attr});}}return Object.freeze(hits.filter((v,i,a)=>a.findIndex(x=>x.id===v.id&&x.url===v.url)===i));}
window.LuviaBookingEngineDetection=Object.freeze({version:VERSION,engines:ENGINES,detectUrl,scanDocument});
})();
