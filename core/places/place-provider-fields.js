(function(){
'use strict';
const VERSION='4.5.1.4';
const esc=v=>window.LuviaPlaceExperience?.esc?.(v)||String(v??'');
const PRICE_LABELS=Object.freeze({
 PRICE_LEVEL_FREE:'Kostenlos',PRICE_LEVEL_INEXPENSIVE:'Günstig · €',PRICE_LEVEL_MODERATE:'Mittel · €€',PRICE_LEVEL_EXPENSIVE:'Gehoben · €€€',PRICE_LEVEL_VERY_EXPENSIVE:'Sehr gehoben · €€€€',
 FREE:'Kostenlos',INEXPENSIVE:'Günstig · €',MODERATE:'Mittel · €€',EXPENSIVE:'Gehoben · €€€',VERY_EXPENSIVE:'Sehr gehoben · €€€€'
});
const STATUS_LABELS=Object.freeze({OPERATIONAL:'Geöffnet und in Betrieb',CLOSED_TEMPORARILY:'Vorübergehend geschlossen',CLOSED_PERMANENTLY:'Dauerhaft geschlossen'});
const defs=[
 ['primaryTypeDisplayName','Kategorie','🏷️'],['formattedAddress','Adresse','📍'],['phone','Telefon','📞'],['website','Website','🌐'],['mapsUrl','Google Maps','🗺️'],['rating','Bewertung','⭐'],['userRatingCount','Bewertungen','💬'],['priceLevel','Preisniveau','💶'],['businessStatus','Status','ℹ️'],['utcOffsetMinutes','Zeitzone','🕒'],['allowsDogs','Hunde erlaubt','🐕'],['goodForChildren','Für Kinder geeignet','👶'],['goodForGroups','Für Gruppen geeignet','👥'],['restroom','WC vorhanden','🚻'],['outdoorSeating','Außenplätze','🌤️'],['reservable','Reservierbar','🗓️'],['takeout','Mitnahme','🥡'],['delivery','Lieferung','🚲'],['dineIn','Vor Ort','🍽️'],['servesBreakfast','Frühstück','🥐'],['servesLunch','Mittagessen','☀️'],['servesDinner','Abendessen','🌙'],['servesVegetarianFood','Vegetarische Auswahl','🌱'],['servesBeer','Bier','🍺'],['servesWine','Wein','🍷'],['servesCocktails','Cocktails','🍸'],['liveMusic','Live-Musik','🎵'],['curbsidePickup','Abholung am Fahrzeug','🚗']
];
const skip=new Set(['id','name','displayName','photos','location','types','openingHours','regularOpeningHours','currentOpeningHours','editorialSummary','generativeSummary','shortFormattedAddress','addressComponents','reviews','plusCode','viewport','iconMaskBaseUri','iconBackgroundColor','primaryType','nationalPhoneNumber','internationalPhoneNumber','websiteUri','googleMapsUri']);
function formatPriceLevel(v){if(v==null||v==='')return'';const key=String(v).toUpperCase();if(PRICE_LABELS[key])return PRICE_LABELS[key];if(/^[1-4]$/.test(key))return '€'.repeat(Number(key));return String(v).replace(/^PRICE_LEVEL_/,'').replaceAll('_',' ').toLowerCase().replace(/(^| )\w/g,m=>m.toUpperCase())}
function formatBusinessStatus(v){if(v==null||v==='')return'';const key=String(v).toUpperCase();return STATUS_LABELS[key]||String(v).replaceAll('_',' ').toLowerCase().replace(/(^| )\w/g,m=>m.toUpperCase())}
function value(key,v){if(key==='priceLevel')return formatPriceLevel(v);if(key==='businessStatus')return formatBusinessStatus(v);if(v===true)return'Ja';if(v===false)return'Nein';if(v==null||v==='')return'';if(Array.isArray(v))return v.join(', ');if(typeof v==='object')return'';return String(v)}
function normalized(place,key){
 if(key==='phone')return place.phone||place.nationalPhoneNumber||place.internationalPhoneNumber||'';
 if(key==='website')return place.website||place.websiteUri||'';
 if(key==='mapsUrl')return place.mapsUrl||place.mapsUri||place.googleMapsUri||'';
 if(key==='formattedAddress')return place.formattedAddress||place.address||place.shortAddress||'';
 if(key==='userRatingCount')return place.userRatingCount??place.ratingCount??'';
 if(key==='primaryTypeDisplayName')return place.primaryTypeDisplayName||place.primaryTypeLabel||'';
 return place[key];
}
function row(key,label,icon,raw,val){
 if(key==='phone'){const tel=String(raw).replace(/[^+\d]/g,'');return `<div class="luv-place-provider-row"><span>${icon} ${esc(label)}</span><a href="tel:${esc(tel)}">${esc(val)}</a></div>`}
 if(key==='website'||key==='mapsUrl')return `<div class="luv-place-provider-row"><span>${icon} ${esc(label)}</span><a href="${esc(raw)}" target="_blank" rel="noopener">Öffnen ↗</a></div>`;
 return `<div class="luv-place-provider-row"><span>${icon} ${esc(label)}</span><strong>${esc(val)}</strong></div>`;
}
function render(place={}){const rows=[];for(const [key,label,icon] of defs){const raw=normalized(place,key);const val=value(key,raw);if(!val)continue;rows.push(row(key,label,icon,raw,val))}
 for(const [key,raw] of Object.entries(place)){if(skip.has(key)||defs.some(d=>d[0]===key))continue;const val=value(key,raw);if(!val)continue;if(!/accessibility|parking|payment|option|amenit|service/i.test(key))continue;const label=key.replace(/([A-Z])/g,' $1').replace(/^./,x=>x.toUpperCase());rows.push(`<div class="luv-place-provider-row"><span>• ${esc(label)}</span><strong>${esc(val)}</strong></div>`)}
 return rows.length?`<section class="luv-place-provider-details"><span>Details zum Ort</span><div>${rows.join('')}</div></section>`:''}
function diagnostics(){return{version:VERSION,status:'ready',knownFields:defs.map(x=>x[0]),formatters:['priceLevel-de','businessStatus-de','phone-link','website-link'],mode:'all-available-normalized-provider-fields'}}
window.LuviaPlaceProviderFields=Object.freeze({version:VERSION,render,formatPriceLevel,formatBusinessStatus,diagnostics});
})();
